---
name: match-squad-unity
description: Match Squad Unity development skill. Enforces architectural patterns, animation queue management, DOTween best practices, object pooling, and prevents common pitfalls in this tile-matching puzzle game.
license: MIT
version: 1.0.0
---

# Match Squad Unity Development Skill

This skill provides specialized guidance for developing **Match Squad** (Linked Master), a Unity-based tile-matching puzzle game with complex animation systems, state management, and mobile performance requirements.

## When to Use

Activate when working on:
- Unity C# scripts in `Assets/ProjectFiles/Game/Scripts/`
- Core gameplay systems (LevelController, Map, GroupDetector, Tile)
- UI systems, power-ups, level editor, save system
- DOTween animations (critical system)
- Performance optimization and mobile debugging

## System Overview

**Core Gameplay**: LevelController → Map → GroupDetector → WinConditionChecker → TraitSpawningEffectHelper
**UI**: UIGame, UIHome, UIComplete, UIStore + gradient systems
**Power-Ups**: PowerUpHelper with timer pause, hints, tile highlighting
**Level Editor**: Visual grid editor with trait management tools
**Save System**: PlayardSDK-based persistence with automatic serialization

## Third-Party Packages

**DOTween (DG.Tweening)** ⚠️ CRITICAL SYSTEM:
- Production-critical animation library
- Must kill sequences properly in OnDestroy
- Use SetUpdate(true) for UI animations independent of timeScale
- Batch sequences with DOTween.Sequence() for performance
- See `references/animation-queue-system.md` for deep dive

**Other Packages** (brief overview):
- **PYDPool**: Object pooling system (mandatory for 60fps)
- **PlayardSDK**: Base framework with modules
- **Coffee.UIEffect**: UI effects including Shiny transition filter
- **AppLovin MAX**: Primary ad mediation
- **Firebase + Adjust**: Analytics and attribution
- **Unity IAP**: In-app purchases
- **Nice Vibrations (Feel)**: Advanced haptics

## ⚠️ CRITICAL WARNINGS

**1. NEVER instantiate/destroy tiles directly**
→ Use PYDPool.Spawn() and PYDPool.ReturnToPool() (mandatory for 60fps)

**2. ALWAYS kill DOTween animations**
→ Call TileAnimationController.KillAllAnimations() in OnDestroy

**3. ALWAYS check IsGeneratingMap**
→ Block input during map generation to prevent race conditions

**4. ALWAYS call InvalidateCache()**
→ After map structure changes (tile swaps, removals)

**5. ALWAYS unsubscribe from events**
→ Prevent memory leaks in OnDestroy

**6. DOTween sequences must use SetUpdate(true)**
→ For UI animations independent of timeScale

## Navigation to Detailed References

### Core System References

📘 **Animation Queue System** (`references/animation-queue-system.md`)
Deep dive into DOTween patterns, Map.ProcessAnimationQueue(), TraitSpawningEffectHelper, deadlock prevention

🔍 **Debugging Scenarios** (`references/debugging-scenarios.md`)
Rapid diagnosis: tiles not responding, group detection failing, win condition issues, DOTween stuck

💻 **Code Patterns** (`references/code-patterns.md`)
Copy-paste examples: level loading, tile swapping, group detection, event handling, DOTween sequences

✅ **Code Review Checklist** (`references/code-review-checklist.md`)
Mandatory pre-commit validation: pooling, animations, events, cache, performance

💾 **Save System Guide** (`references/save-system-guide.md`)
Complete persistence system: ISaveObject implementation, auto-save, time tracking, collections, migration patterns

📄 **Save System Cheat Sheet** (`references/save-system-cheatsheet.md`)
Quick reference: 30-second start, common operations, data patterns, debug commands

🎮 **Level State Save Guide** (`references/level-state-save-guide.md`)
Temporary level persistence: mid-level save/restore, stale win detection, animation replay, critical save order patterns

🎯 **Level State Save Quick Ref** (`references/level-state-save-quickref.md`)
One-page reference card: critical rules, win order, common operations, debug commands (print and keep handy!)

### Feature Development References

🎮 **New Mechanics Guide** (`references/new-mechanics-guide.md`)
Implement tile mechanics: Hidden, Frost, Key-Lock, Jammer, Nail. Includes state management and visual feedback patterns

🏁 **Event System Guide** (`references/event-system-guide.md`)
Implement game events: Match Race, Time Attack, Special Challenges. Event lifecycle and reward systems

⚖️ **Game Flow Validation** (`references/game-flow-validation.md`)
Validate level design: Detect impossible levels, deadlock scenarios, unwinnable states. Auto-validation tools

✨ **UIEffect Shiny Guide** (`references/uieffect-shiny-guide.md`)
Implement shiny/shimmer effects for UI elements: Setup, code patterns, common use cases, integration with Match Squad systems

## Quick Diagnostic Commands

```csharp
// Input blocked?
Debug.Log($"Input blocked: {LevelController.IsGeneratingMap}");

// Animations stuck?
Debug.Log($"Animations running: {TileGroupHelper.IsAnimationRunning}");
Debug.Log($"Active count: {TileGroupHelper.ActiveAnimationCount}");

// Cache stale?
Map.Instance.GroupDetector.InvalidateCache();

// Check win condition
var requiredTraits = LevelController.Instance.LevelData.Traits.Length;
var completedTraits = Map.Instance.GroupDetector.CompleteTraits.Count;
Debug.Log($"Win Check: {completedTraits}/{requiredTraits}");
```

## Templates

Boilerplate templates available in `assets/templates/`:
- `LevelLoadingTemplate.cs` - Standard level loading pattern
- `CustomTileTemplate.cs` - New tile type with pooling
- `PowerUpTemplate.cs` - Power-up implementation
- `DOTweenSequenceExamples.cs` - Common DOTween patterns
- `NewMechanicTemplate.cs` - New tile mechanic implementation (Hidden, Frost, Key-Lock)
- `EventSystemTemplate.cs` - Game event system (Match Race, challenges)
- `SaveObjectTemplate.cs` - ISaveObject implementation with best practices
- `LevelStateSaveTemplate.cs` - Level state save/restore with stale win detection
- `UIEffectShinyTemplate.cs` - UIEffect Shiny implementation with common patterns

## Performance Tips

1. **Object Pooling**: Reuse frequently spawned objects
2. **Batching**: Combine materials, use sprite atlases
3. **LOD**: Level of detail for distant objects
4. **Culling**: Frustum culling, occlusion culling
5. **Physics**: Simplified collision meshes, layer filtering
6. **GC**: Avoid allocations in Update(), cache references
7. **Async**: Use async/await, Job System for heavy tasks

## External Resources

- Official Docs: https://docs.unity3d.com/Manual/
- Scripting API: https://docs.unity3d.com/ScriptReference/
- Learn Unity: https://learn.unity.com/
- Asset Store: https://assetstore.unity.com/
- Unity Forum: https://forum.unity.com/