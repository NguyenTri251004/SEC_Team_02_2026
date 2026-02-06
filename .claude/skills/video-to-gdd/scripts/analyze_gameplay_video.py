#!/usr/bin/env python3
"""
Analyze gameplay videos to extract game design elements for GDD generation.
Uses Google Gemini API for video understanding.
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
env_paths = [
    Path.cwd() / ".env",
    Path.cwd() / ".claude" / ".env",
    Path.cwd() / ".claude" / "skills" / ".env",
    Path.cwd() / ".claude" / "skills" / "video-to-gdd" / ".env",
]
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path)
        break


def get_api_key() -> str:
    """Get Gemini API key from environment"""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    return api_key


def upload_video(client, video_path: str):
    """Upload video to Gemini and wait for processing"""
    print(f"Uploading video: {video_path}")
    myfile = client.files.upload(file=video_path)

    print("Processing video...")
    elapsed = 0
    max_wait = 600  # 10 minutes max

    while myfile.state.name == "PROCESSING" and elapsed < max_wait:
        time.sleep(5)
        myfile = client.files.get(name=myfile.name)
        elapsed += 5
        if elapsed % 30 == 0:
            print(f"Still processing... ({elapsed}s)")

    if myfile.state.name == "FAILED":
        raise ValueError(f"Video processing failed: {myfile.state.name}")

    if myfile.state.name == "PROCESSING":
        raise TimeoutError(f"Processing timeout after {max_wait}s")

    print("Video processed successfully!")
    return myfile


def analyze_video(client, video_file, model: str = "gemini-2.5-flash") -> Dict[str, Any]:
    """Analyze gameplay video and extract game design elements"""

    prompt = """Analyze this gameplay video in detail and extract the following information for creating a comprehensive Game Design Document (GDD) for Unity development:

1. GAME OVERVIEW
   - Genre and sub-genre
   - Core concept and theme
   - Target audience
   - Platform considerations

2. CORE GAMEPLAY MECHANICS
   - Primary gameplay loop (what players do repeatedly)
   - Movement mechanics (if applicable)
   - Interaction mechanics
   - Combat/action mechanics (if applicable)
   - Puzzle mechanics (if applicable)
   - Progression systems

3. VISUAL STYLE & ART DIRECTION
   - Art style (2D/3D, realistic/stylized, pixel art, etc.)
   - Color palette and mood
   - Camera perspective (top-down, side-scrolling, isometric, first-person, third-person, etc.)
   - Visual effects and animations
   - UI visual style

4. UI/UX PATTERNS
   - HUD elements and their positions
   - Menu systems
   - Control scheme and input methods
   - Feedback mechanisms (visual, audio, haptic)
   - Tutorial/onboarding approach

5. LEVEL DESIGN
   - Level structure (linear, open-world, rooms, etc.)
   - Environmental elements
   - Obstacles and challenges
   - Pacing and difficulty

6. AUDIO DESIGN
   - Music style and mood
   - Sound effects categories
   - Audio feedback for actions

7. TECHNICAL REQUIREMENTS FOR UNITY
   - Recommended Unity packages/assets
   - Physics requirements (2D/3D)
   - Required components (Rigidbody, Collider types, etc.)
   - Scripting considerations
   - Performance considerations

8. GAME SYSTEMS
   - Scoring/points system
   - Lives/health system
   - Power-ups or special abilities
   - Save/progress system
   - Monetization (if applicable)

9. KEY SCENES & MOMENTS (with timestamps)
   - Important gameplay moments
   - Tutorial segments
   - Special mechanics demonstrations
   - Boss fights or special challenges

Provide detailed analysis with specific observations from the video. Include timestamps (MM:SS) for key moments.
Format the response as structured JSON."""

    print("Analyzing gameplay video...")
    response = client.models.generate_content(
        model=model,
        contents=[prompt, video_file],
        config={
            "response_mime_type": "application/json",
        }
    )

    return json.loads(response.text)


def main():
    parser = argparse.ArgumentParser(
        description="Analyze gameplay video for GDD generation"
    )
    parser.add_argument("video", help="Path to gameplay video file")
    parser.add_argument(
        "-o", "--output",
        help="Output JSON file path (default: video_analysis.json)",
        default="video_analysis.json"
    )
    parser.add_argument(
        "-m", "--model",
        help="Gemini model to use (default: gemini-2.5-flash)",
        default="gemini-2.5-flash"
    )

    args = parser.parse_args()

    if not Path(args.video).exists():
        print(f"Error: Video file not found: {args.video}")
        sys.exit(1)

    try:
        # Import Gemini API
        try:
            from google import genai
        except ImportError:
            print("Error: google-genai package not installed")
            print("Install with: pip install google-genai")
            sys.exit(1)

        # Initialize client
        api_key = get_api_key()
        client = genai.Client(api_key=api_key)

        # Upload and process video
        video_file = upload_video(client, args.video)

        # Analyze video
        analysis = analyze_video(client, video_file, args.model)

        # Save results
        output_path = Path(args.output)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(analysis, f, indent=2, ensure_ascii=False)

        print(f"\nAnalysis complete! Results saved to: {output_path}")

        # Clean up uploaded file
        print("Cleaning up...")
        client.files.delete(name=video_file.name)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
