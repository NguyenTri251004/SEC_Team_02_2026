---
name: video-to-gdd
description: Analyze gameplay videos and generate comprehensive Game Design Documents (GDD) for Unity game development. Use when need to create GDD from gameplay videos, extract game mechanics from video content, analyze game design from recordings, convert video demonstrations into technical specifications, or plan Unity implementation from gameplay footage. Extracts mechanics, visual style, UI/UX patterns, gameplay loops, audio design, and technical requirements. Outputs structured GDD with Unity-specific implementation guidance, asset requirements, and development roadmap.
license: MIT
version: 1.0.0
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
---

# Video to GDD

Analyze gameplay videos to generate comprehensive Game Design Documents for Unity development.

## Prerequisites

**Required:**
- Google Gemini API key (get from https://aistudio.google.com/apikey)
- Python 3.8+
- Gameplay video file (MP4, MOV, WebM, etc.)

**Install dependencies:**
```bash
pip install google-genai python-dotenv
```

**Set API key:**
```bash
export GEMINI_API_KEY="your-key"
# Or add to .env file
```

## Quick Start

### 1. Analyze Gameplay Video

Extract game design elements from video:

```bash
python scripts/analyze_gameplay_video.py path/to/gameplay.mp4
```

**Options:**
- `-o OUTPUT`: Specify output JSON path (default: `video_analysis.json`)
- `-m MODEL`: Choose Gemini model (default: `gemini-2.5-flash`)
  - `gemini-2.5-flash`: Fast, balanced (recommended)
  - `gemini-2.5-pro`: Higher quality, slower
  - `gemini-3-pro-preview`: Latest model

**Output:** JSON file with extracted game design data

### 2. Generate GDD Document

Convert analysis into structured GDD:

```bash
python scripts/generate_gdd.py video_analysis.json -o GDD.md
```

**Options:**
- `-v VIDEO_NAME`: Original video filename for reference
- `-o OUTPUT`: GDD output path (default: `GDD.md`)

**Output:** Markdown GDD with:
- Game overview and concept
- Core mechanics breakdown
- Visual and audio design specs
- UI/UX patterns
- Unity technical requirements
- Implementation roadmap
- Asset lists

## What Gets Extracted

### Game Analysis
- **Genre & Theme**: Game type, setting, target audience
- **Core Loop**: What players do repeatedly
- **Mechanics**: Movement, combat, puzzles, interactions
- **Progression**: How players advance and unlock content

### Visual Design
- **Art Style**: 2D/3D, realistic/stylized, pixel art
- **Camera**: Perspective, movement, controls
- **UI/UX**: HUD layout, menus, feedback systems
- **Effects**: Particles, animations, visual polish

### Technical Specs
- **Unity Packages**: Required packages and assets
- **Components**: Physics, colliders, scripts needed
- **Performance**: Target FPS, optimization needs
- **Architecture**: Recommended code patterns

### Key Moments
- Timestamped gameplay highlights
- Tutorial segments
- Special mechanics demonstrations
- Boss fights or unique challenges

## Workflow

**Complete workflow:**
```bash
# 1. Analyze video
python scripts/analyze_gameplay_video.py gameplay.mp4 -o analysis.json

# 2. Generate GDD
python scripts/generate_gdd.py analysis.json -o docs/GDD.md -v gameplay.mp4

# 3. Review and refine the GDD
# 4. Begin Unity implementation
```

## References

Load for detailed guidance:

| Topic | File | When to Use |
|-------|------|-------------|
| GDD Structure | `references/gdd-structure.md` | Creating or refining GDD sections, understanding what to include |
| Unity Implementation | `references/unity-implementation.md` | Converting GDD to Unity code, technical architecture, best practices |

## Tips

**Video Quality:**
- Clear gameplay demonstration (not trailer/cutscene)
- Show core mechanics multiple times
- Include UI and menus
- 2-10 minutes optimal (longer = more tokens)
- Good quality and resolution

**Longer Videos:**
- Videos >15 min may get truncated
- Consider clipping key segments
- Use lower FPS sampling for static content
- Or split into multiple analyses

**Better Results:**
- Record gameplay with UI visible
- Show full game loop (start to end)
- Include tutorial/onboarding
- Demonstrate all major mechanics
- Show multiple levels/scenarios

**Cost Optimization:**
- Use `gemini-2.5-flash` (faster, cheaper)
- Clip video to essential moments
- Process specific segments with timestamps

## Examples

**Analyze puzzle game:**
```bash
python scripts/analyze_gameplay_video.py match3_gameplay.mp4
python scripts/generate_gdd.py video_analysis.json -o Match3_GDD.md
```

**Analyze platformer with custom model:**
```bash
python scripts/analyze_gameplay_video.py platformer.mp4 -m gemini-2.5-pro -o platformer_analysis.json
python scripts/generate_gdd.py platformer_analysis.json -o docs/Platformer_GDD.md -v platformer.mp4
```

**YouTube video (future):**
Currently supports local files only. Download YouTube videos first using youtube-dl or similar tools.

## Limitations

- Requires Gemini API key (free tier available)
- Video must be <6 hours (2 hours recommended)
- Analysis quality depends on video clarity
- JSON structure may vary based on game complexity
- Generated GDD needs manual review and refinement

## Next Steps After GDD

1. **Review GDD**: Validate extracted information, add missing details
2. **Asset Planning**: List required art, audio, and assets
3. **Technical Design**: Detail complex systems and algorithms
4. **Unity Setup**: Create project, import packages
5. **Implementation**: Follow roadmap in GDD
6. **Iteration**: Update GDD as design evolves
