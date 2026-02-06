#!/usr/bin/env python3
"""
Generate Game Design Document from video analysis JSON.
Creates a comprehensive GDD in markdown format for Unity development.
"""

import json
import argparse
from pathlib import Path
from datetime import datetime
from typing import Dict, Any


def format_section(title: str, content: Any, level: int = 2) -> str:
    """Format a section of the GDD"""
    header = "#" * level
    output = f"\n{header} {title}\n\n"

    if isinstance(content, dict):
        for key, value in content.items():
            if isinstance(value, (dict, list)):
                output += format_section(key.replace("_", " ").title(), value, level + 1)
            else:
                output += f"**{key.replace('_', ' ').title()}:** {value}\n\n"
    elif isinstance(content, list):
        for item in content:
            if isinstance(item, dict):
                for k, v in item.items():
                    output += f"- **{k.replace('_', ' ').title()}:** {v}\n"
            else:
                output += f"- {item}\n"
        output += "\n"
    else:
        output += f"{content}\n\n"

    return output


def generate_gdd_markdown(analysis: Dict[str, Any], video_file: str) -> str:
    """Generate GDD markdown from analysis data"""

    gdd = f"""# Game Design Document (GDD)

**Generated from video analysis:** `{video_file}`
**Generated on:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
**For:** Unity Game Development

---

## Table of Contents

1. [Game Overview](#game-overview)
2. [Core Gameplay Mechanics](#core-gameplay-mechanics)
3. [Visual Style & Art Direction](#visual-style--art-direction)
4. [UI/UX Design](#uiux-design)
5. [Level Design](#level-design)
6. [Audio Design](#audio-design)
7. [Technical Requirements](#technical-requirements)
8. [Game Systems](#game-systems)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Key References](#key-references)

---
"""

    # Add each section from analysis
    section_mapping = {
        "game_overview": "Game Overview",
        "GAME OVERVIEW": "Game Overview",
        "GAME_OVERVIEW": "Game Overview",
        "core_gameplay_mechanics": "Core Gameplay Mechanics",
        "CORE GAMEPLAY MECHANICS": "Core Gameplay Mechanics",
        "CORE_GAMEPLAY_MECHANICS": "Core Gameplay Mechanics",
        "visual_style": "Visual Style & Art Direction",
        "VISUAL STYLE & ART DIRECTION": "Visual Style & Art Direction",
        "VISUAL_STYLE_ART_DIRECTION": "Visual Style & Art Direction",
        "ui_ux_patterns": "UI/UX Design",
        "UI/UX PATTERNS": "UI/UX Design",
        "UI_UX_PATTERNS": "UI/UX Design",
        "level_design": "Level Design",
        "LEVEL DESIGN": "Level Design",
        "LEVEL_DESIGN": "Level Design",
        "audio_design": "Audio Design",
        "AUDIO DESIGN": "Audio Design",
        "AUDIO_DESIGN": "Audio Design",
        "technical_requirements": "Technical Requirements (Unity)",
        "TECHNICAL REQUIREMENTS FOR UNITY": "Technical Requirements (Unity)",
        "TECHNICAL_REQUIREMENTS_FOR_UNITY": "Technical Requirements (Unity)",
        "game_systems": "Game Systems",
        "GAME SYSTEMS": "Game Systems",
        "GAME_SYSTEMS": "Game Systems",
        "key_scenes": "Key Scenes & Moments",
        "KEY SCENES & MOMENTS": "Key Scenes & Moments",
        "KEY_SCENES_MOMENTS": "Key Scenes & Moments",
    }

    for key, title in section_mapping.items():
        if key in analysis:
            gdd += format_section(title, analysis[key])

    # Add implementation roadmap
    gdd += """
## Implementation Roadmap

### Phase 1: Core Setup
- [ ] Create Unity project with appropriate settings
- [ ] Import required packages and assets
- [ ] Set up project structure and folders
- [ ] Configure build settings for target platform

### Phase 2: Core Mechanics
- [ ] Implement player controller/input system
- [ ] Create core gameplay loop
- [ ] Implement physics and collision detection
- [ ] Add basic animations

### Phase 3: Visual & Audio
- [ ] Create art assets or integrate asset packs
- [ ] Implement UI elements and HUD
- [ ] Add visual effects and particles
- [ ] Integrate audio (music and SFX)

### Phase 4: Game Systems
- [ ] Implement scoring/progression system
- [ ] Add power-ups and special abilities
- [ ] Create save/load system
- [ ] Implement game states (menu, gameplay, pause, game over)

### Phase 5: Level Design
- [ ] Design and build levels
- [ ] Balance difficulty and pacing
- [ ] Add tutorial/onboarding
- [ ] Implement level progression

### Phase 6: Polish & Optimization
- [ ] Optimize performance
- [ ] Add juice (screen shake, particles, feedback)
- [ ] Bug fixing and testing
- [ ] Final balancing

---

## Key References

- **Unity Documentation:** https://docs.unity3d.com/
- **Asset Store:** https://assetstore.unity.com/
- **Unity Learn:** https://learn.unity.com/

---

## Notes

This GDD was automatically generated from video analysis. Review and refine sections as needed for your specific implementation.

"""

    return gdd


def main():
    parser = argparse.ArgumentParser(
        description="Generate GDD from video analysis JSON"
    )
    parser.add_argument("json", help="Path to video analysis JSON file")
    parser.add_argument(
        "-o", "--output",
        help="Output GDD file path (default: GDD.md)",
        default="GDD.md"
    )
    parser.add_argument(
        "-v", "--video-name",
        help="Original video file name for reference",
        default="gameplay_video"
    )

    args = parser.parse_args()

    json_path = Path(args.json)
    if not json_path.exists():
        print(f"Error: JSON file not found: {args.json}")
        return 1

    try:
        # Load analysis data
        with open(json_path, "r", encoding="utf-8") as f:
            analysis = json.load(f)

        # Generate GDD
        gdd_content = generate_gdd_markdown(analysis, args.video_name)

        # Save GDD
        output_path = Path(args.output)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(gdd_content)

        print(f"GDD generated successfully: {output_path}")
        print(f"\nNext steps:")
        print(f"1. Review the GDD and refine sections as needed")
        print(f"2. Add detailed specifications for complex mechanics")
        print(f"3. Create asset lists and technical specifications")
        print(f"4. Begin Unity implementation following the roadmap")

    except Exception as e:
        print(f"Error: {e}")
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
