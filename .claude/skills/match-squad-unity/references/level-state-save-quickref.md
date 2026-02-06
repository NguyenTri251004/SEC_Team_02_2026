# Level State Save - Quick Reference Card

One-page reference for the most common operations and critical patterns.

## Critical Rules (NEVER FORGET!)

```
⚠️ RULE 1: Save Order on Win
   Increment → Save Progression → Clear State

⚠️ RULE 2: Set hasWon Flag
   Always calculate win state when saving

⚠️ RULE 3: Check Stale Wins
   In BOTH PreloadLevel AND ScreenHome

⚠️ RULE 4: Skip Counters on Restore
   Check isRestoringFromSaveState before incrementing
```

## Win Order (MUST FOLLOW)

```csharp
// ✅ CORRECT ORDER
StopPeriodicAutoSave();
AdjustLevelNumber();
SaveController.Save(forceSave: true, useThreads: false);
ClearSavedLevelState();

// ❌ WRONG ORDER (causes level reset bug)
ClearSavedLevelState();  // DON'T clear first!
AdjustLevelNumber();
SaveController.Save();
```

## Save Operations

```csharp
// Save current level state
MIMLevelController.Instance.SaveLevelState();

// Start auto-save (every 5 seconds)
StartPeriodicAutoSave();

// Stop auto-save
StopPeriodicAutoSave();

// Clear saved state
ClearSavedLevelState();
```

## Restore Operations

```csharp
// Load from saved state
LoadLevelFromSave(onComplete: () => {
    Debug.Log("Restore complete");
});

// Check if valid save exists
if (levelStateSave != null && levelStateSave.HasValidState())
{
    // Valid save, can restore
}

// Check if save matches current level
if (levelStateSave.IsValidFor(currentLevel, currentMode))
{
    // Safe to restore
}
```

## Stale Win Detection

```csharp
// In PreloadLevel or ScreenHome
int totalCompleted = completedTraits.Count;
if (spawnedTraits != null)
{
    foreach (var trait in spawnedTraits)
    {
        if (!completedTraits.Contains(trait))
            totalCompleted++;
    }
}

if (levelStateSave.hasWon || totalCompleted >= requiredTraits)
{
    HandleStaleWinState(gameMode);
}
```

## Counter Skip Pattern

```csharp
// In ALL counter increment locations
if (!MIMLevelController.IsRestoringFromSaveState)
{
    UIController.Instance.IncrementCountTraits();
}

// Files that need this check:
// - TileGroupHelper.cs
// - ParallelGroupProcessingHelper.cs
// - Map.cs
```

## Calculate Win State

```csharp
// When saving, always include pending animations
int totalCompleted = Map.Instance.GroupDetector.CompleteTraits.Count +
                    Map.Instance.GroupDetector.SpawnedTraits.Count +
                    Map.Instance.allPendingGroups.Count; // Don't forget!

int requiredTraits = loadedLevelData.Traits.Length;
levelStateSave.hasWon = (totalCompleted >= requiredTraits);
```

## Debug Commands

```csharp
// Check current save state
var save = MIMLevelController.Instance.levelStateSave;
Debug.Log($"Valid: {save?.HasValidState()}");
Debug.Log($"Level: {save?.displayLevelNumber}");
Debug.Log($"Completed: {save?.completedTraits?.Count ?? 0}");
Debug.Log($"HasWon: {save?.hasWon}");

// Force save now
MIMLevelController.Instance.SaveLevelState();
SaveController.Save(forceSave: true, useThreads: false);

// Clear save
MIMLevelController.Instance.ClearSavedLevelState();
SaveController.Save(forceSave: true, useThreads: false);
```

## Common Bugs & Quick Fixes

| Bug | Quick Fix |
|-----|-----------|
| Level reset to 1 | Check win order: increment → save → clear |
| ANR after win exit | Set `hasWon` flag including pending animations |
| Duplicate counter | Add `isRestoringFromSaveState` check |
| Stale win not detected | Check in BOTH PreloadLevel AND ScreenHome |
| Animation too slow | Reduce durations in TraitSpawningEffectHelper |

## LevelStateSave Key Fields

```csharp
levelStateSave.levelIndex              // Level database index
levelStateSave.displayLevelNumber      // UI level number
levelStateSave.gameModeInt             // 0=Normal, 1=Challenge
levelStateSave.completedTraits         // Already processed traits
levelStateSave.spawnedTraits           // Traits from merges
levelStateSave.remainingTime           // Timer seconds left
levelStateSave.hasWon                  // Win flag (CRITICAL!)
levelStateSave.tileStates              // All tile data
levelStateSave.pendingAnimationGroups  // Queued animations
```

## Validation Methods

```csharp
// Has valid data?
levelStateSave.HasValidState()

// Matches current level/mode?
levelStateSave.IsValidFor(currentLevel, currentMode)

// Get total completed traits
levelStateSave.GetTotalCompletedTraits()

// Is level completed?
levelStateSave.IsCompleted(requiredTraits)

// Get completion percentage
levelStateSave.GetCompletionPercentage(requiredTraits)
```

## Testing Checklist

- [ ] Mid-level exit and resume
- [ ] Win and early exit (before win screen)
- [ ] Timer level save/restore
- [ ] Stale win on home screen
- [ ] Stale win on direct gameplay entry
- [ ] No duplicate counters
- [ ] Proper save order on win
- [ ] Animation replay on restore
- [ ] Periodic auto-save working
- [ ] Auto-save stops on win/lose

## File Locations

| File | Purpose |
|------|---------|
| `MIMLevelController.cs` | Save/load/clear operations |
| `MIMGameController.cs` | Win/lose flow with save order |
| `LevelStateSave.cs` | Data structure |
| `TileGroupHelper.cs` | Counter skip for matches |
| `ParallelGroupProcessingHelper.cs` | Counter skip for parallel groups |
| `Map.cs` | Counter skip for trait spawning |
| `ScreenHome.cs` | Stale win detection on home |

## When to Call What

| Event | Action |
|-------|--------|
| Level starts | `StartPeriodicAutoSave()` |
| Player swaps tiles | Auto-save handles it |
| Player wins | Stop auto-save → increment → save → clear |
| Player loses | Stop auto-save → clear save |
| Player quits | Auto-save preserved for restore |
| Game restarts | Check stale win → restore or advance |

## Performance

- **Auto-save interval:** 5 seconds
- **Save size:** 2-12 KB (grid dependent)
- **Save timing:** Only when not animating

## Full Documentation

📖 **Complete Guide:** `.claude/skills/match-squad-unity/references/level-state-save-guide.md`  
📝 **Template:** `.claude/skills/match-squad-unity/assets/templates/LevelStateSaveTemplate.cs`  
📋 **Implementation Notes:** `.claude/skills/match-squad-unity/IMPLEMENTATION_NOTES.md`  
🇻🇳 **Tóm Tắt Tiếng Việt:** `.claude/skills/match-squad-unity/TOM_TAT_TIENG_VIET.md`

---

**Print this page and keep it next to your keyboard! 🖨️**

