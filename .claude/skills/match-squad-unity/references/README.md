# Match Squad Unity - Reference Documentation

This folder contains detailed reference guides for Match Squad development.

## 📚 Available Guides

### 🎮 Input & Gamefeel
- **[input-gamefeel-guide.md](./input-gamefeel-guide.md)** - Comprehensive guide về input system và gamefeel improvements
  - 5 Gamefeel Pillars (Instant Response, Visual Clarity, Tactile Feedback, Audio Layering, Motion Design)
  - Advanced techniques (Predictive Highlighting, Gesture Detection, Elastic Drag, Magnetic Snapping)
  - Performance optimization cho input system
  - Polish checklist và testing scenarios
  
- **[input-quick-wins.md](./input-quick-wins.md)** - Practical implementation guide
  - 5-minute wins (touch scale, audio variation, return animation)
  - 10-minute wins (target highlighting, drag wobble)
  - 15-minute wins (haptic hierarchy, invalid swap feedback)
  - 20-minute advanced (magnetic snapping)
  - Code snippets ready to copy-paste

### 🎬 Animation System
- **[animation-queue-system.md](./animation-queue-system.md)** - Deep dive vào animation queue system
  - Map.ProcessAnimationQueue() flow
  - TraitSpawningEffectHelper 12-step sequence
  - DOTween best practices
  - Deadlock prevention

### 🐛 Debugging
- **[debugging-scenarios.md](./debugging-scenarios.md)** - Quick diagnostic guide
  - Tiles not responding
  - Group detection failing
  - Win condition not triggering
  - Performance issues
  - Memory leaks

### 💻 Code Patterns
- **[code-patterns.md](./code-patterns.md)** - Copy-paste examples
  - Level loading pattern
  - Tile swapping pattern
  - Group detection pattern
  - Animation queue pattern
  - Event handling

### 💾 Save System
- **[save-system-guide.md](./save-system-guide.md)** - Complete persistence guide
  - ISaveObject implementation
  - Auto-save configuration
  - Time tracking with DateTime
  - Collections and complex data
  - Migration patterns
  - Performance best practices

- **[save-system-cheatsheet.md](./save-system-cheatsheet.md)** - Quick reference
  - 30-second quick start
  - Common operations
  - Data type patterns
  - Do's and Don'ts
  - Debug commands

### ✨ Visual Effects
- **[uieffect-shiny-guide.md](./uieffect-shiny-guide.md)** - UIEffect Shiny implementation guide
  - Setup và configuration
  - Code patterns (basic, replica, tweener)
  - Common use cases (highlighting, rewards, attention)
  - Integration với Match Squad systems
  - Performance best practices
  - Troubleshooting common issues

### ✅ Quality Assurance
- **[code-review-checklist.md](./code-review-checklist.md)** - Pre-commit validation
  - Object pooling verification
  - Animation cleanup checks
  - Event subscription management
  - Cache invalidation
  - Performance validation

### 🎯 New Features
- **[new-mechanics-guide.md](./new-mechanics-guide.md)** - Implement new tile mechanics
  - Hidden tiles
  - Frost effect
  - Key-Lock system
  - Jammer detection
  - Nail tiles

- **[event-system-guide.md](./event-system-guide.md)** - Game event system
  - Match Race
  - Time Attack
  - Special Challenges
  - Event lifecycle
  - Reward systems

- **[game-flow-validation.md](./game-flow-validation.md)** - Level design validation
  - Impossible level detection
  - Deadlock scenarios
  - Unwinnable state prevention
  - Auto-validation tools

## 🚀 Quick Start

### For Input Improvements
1. Read [input-quick-wins.md](./input-quick-wins.md)
2. Start với "5-Minute Wins"
3. Test on actual device
4. Iterate and tune

### For New Feature Development
1. Check [new-mechanics-guide.md](./new-mechanics-guide.md) or [event-system-guide.md](./event-system-guide.md)
2. Copy relevant template from `../assets/templates/`
3. Follow implementation steps
4. Use [code-review-checklist.md](./code-review-checklist.md) before commit

### For Debugging Issues
1. Check [debugging-scenarios.md](./debugging-scenarios.md)
2. Use diagnostic commands
3. Reference [code-patterns.md](./code-patterns.md) for correct patterns

## 📋 Typical Workflows

### Workflow 1: Improve Gamefeel
```
1. Read: input-gamefeel-guide.md (understand principles)
2. Implement: Follow input-quick-wins.md (practical steps)
3. Test: Use polish checklist
4. Tune: Adjust parameters in Inspector
5. Validate: Check code-review-checklist.md
```

### Workflow 2: Add New Tile Mechanic
```
1. Read: new-mechanics-guide.md (understand patterns)
2. Copy: CustomTileTemplate.cs or NewMechanicTemplate.cs
3. Implement: Follow state management pattern
4. Test: Create test level in Level Editor
5. Debug: Use debugging-scenarios.md if issues
6. Review: Check code-review-checklist.md
```

### Workflow 3: Fix Performance Issue
```
1. Profile: Use Unity Profiler
2. Diagnose: Check debugging-scenarios.md
3. Reference: animation-queue-system.md for animation issues
4. Fix: Use code-patterns.md for correct implementation
5. Validate: Test on actual device
```

### Workflow 4: Implement Game Event
```
1. Read: event-system-guide.md
2. Copy: EventSystemTemplate.cs
3. Implement: Follow event lifecycle pattern
4. Test: Trigger events in test levels
5. Polish: Use input-gamefeel-guide.md for feedback
6. Review: code-review-checklist.md
```

### Workflow 5: Add Persistent Data (Save System)
```
1. Read: save-system-guide.md
2. Copy: SaveObjectTemplate.cs
3. Implement: Create ISaveObject class
4. Test: Verify data persists across sessions
5. Validate: Check auto-save and manual save
6. Review: code-review-checklist.md
```

## 🎯 Priority Recommendations

### If you have 30 minutes
→ Implement input-quick-wins.md Day 1 tasks
- Audio pitch variation
- Target slot highlighting  
- Haptic hierarchy

### If you have 1 hour
→ Complete all input-quick-wins.md
- Day 1 + Day 2 + Day 3
- Significant gamefeel improvement

### If you have 2 hours
→ Read input-gamefeel-guide.md + implement advanced techniques
- Magnetic snapping
- Predictive highlighting
- Gesture detection

### If you have 1 day
→ Implement new mechanic or event system
- Choose from new-mechanics-guide.md or event-system-guide.md
- Full implementation with polish
- Test thoroughly

## 📖 Learning Path

### Beginner (New to project)
1. SKILL.md (overview)
2. code-patterns.md (common patterns)
3. debugging-scenarios.md (troubleshooting)

### Intermediate (Comfortable with codebase)
1. animation-queue-system.md (deep dive)
2. input-gamefeel-guide.md (polish techniques)
3. new-mechanics-guide.md (feature development)

### Advanced (Ready for complex features)
1. event-system-guide.md (meta systems)
2. game-flow-validation.md (quality assurance)
3. All advanced techniques in input-gamefeel-guide.md

## 🛠️ Tools & Templates

### Templates Location
`../assets/templates/`
- LevelLoadingTemplate.cs
- CustomTileTemplate.cs
- PowerUpTemplate.cs
- DOTweenSequenceExamples.cs
- NewMechanicTemplate.cs
- EventSystemTemplate.cs
- InputEnhancementTemplate.cs
- SaveObjectTemplate.cs
- UIEffectShinyTemplate.cs ← **NEW!**

### How to Use Templates
1. Copy template file
2. Rename class
3. Fill in TODO sections
4. Test implementation
5. Customize for your needs

## 📊 Documentation Standards

### When to Update These Guides

**Update immediately when:**
- Adding new core system
- Changing critical patterns
- Finding new debugging technique
- Discovering performance optimization
- Implementing reusable feature

**Update within 1 week when:**
- Refactoring existing system
- Improving code patterns
- Adding quality-of-life features

**Document format:**
- Clear section headers
- Code examples with comments
- Before/after comparisons
- Warning callouts for critical points
- Checklist for validation

## 🔗 External Links

### Unity Resources
- [Unity Manual](https://docs.unity3d.com/Manual/)
- [Unity Scripting API](https://docs.unity3d.com/ScriptReference/)
- [Unity Learn](https://learn.unity.com/)

### Third-Party Documentation
- [DOTween](http://dotween.demigiant.com/documentation.php)
- [Odin Inspector](https://odininspector.com/documentation)
- [PlayardSDK](../../../PlayardSDK/README.md)

### Gamefeel Resources
- [Game Feel by Steve Swink](https://www.amazon.com/Game-Feel-Designers-Sensation-Kaufmann/dp/0123743281)
- [Juice It Or Lose It - Talk](https://www.youtube.com/watch?v=Fy0aCDmgnxg)
- [The Art of Screenshake](https://www.youtube.com/watch?v=AJdEqssNZ-U)

## 🤝 Contributing

### Adding New Guide
1. Create markdown file in this folder
2. Follow documentation standards (see above)
3. Add entry to this README
4. Update SKILL.md with reference
5. Add template if applicable

### Improving Existing Guide
1. Make changes in markdown file
2. Update "Last Updated" date
3. Add note in changelog section
4. Notify team if breaking changes

## 📞 Need Help?

1. **Check SKILL.md** - Quick overview and diagnostic commands
2. **Search this folder** - Comprehensive guides for most scenarios  
3. **Check templates** - Working code examples
4. **Review existing code** - Often the best documentation
5. **Ask team** - When all else fails

---

**Last Updated**: December 8, 2025
**Maintained by**: Claude AI + Development Team
**Version**: 1.2.0 (Added Save System documentation)

