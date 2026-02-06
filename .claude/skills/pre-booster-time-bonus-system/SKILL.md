---
name: pre-booster-time-bonus-system
description: Complete Pre-Booster & Time Bonus System documentation for Mind Match. Covers Pre-Boosters (Hint Plus, Extra Time), Win Streak Gift system, UI flow, and time stacking mechanics.
license: MIT
version: 1.0.0
---

# Pre-Booster & Time Bonus System

This skill provides comprehensive guidance for implementing the **Pre-Booster & Time Bonus System** in Mind Match (Match Squad). The system includes pre-game boosters, win streak rewards, and a new UI flow for booster selection before entering levels.

## When to Use

Activate when working on:
- Pre-Booster UI implementation (`UIPreBooster.cs`)
- Hint Plus auto-activation system
- Extra Time booster mechanics
- Win Streak Gift bonus time feature
- Time stacking logic between boosters
- Save system for booster states and win streaks
- Unlock progression (Level 9, 13, 20)

## System Overview

### Pre-Boosters

| Booster | Effect | Unlock Level | Trigger |
|---------|--------|--------------|---------|
| **Hint Plus** | Highlights 4 elements sharing 1 topic | Level 9 | Auto after map spawn |
| **Extra Time** | +20s added to level timer | Level 13 | Auto before countdown |

### Win Streak Gift

| Condition | Effect | Unlock Level |
|-----------|--------|--------------|
| Win 7+ levels consecutively | +20s bonus time | Level 20 |

### Time Stacking

Extra Time (+20s) and Win Streak Gift (+20s) **CAN STACK** for total +40s bonus.

## Game Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      NEW PRE-BOOSTER FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Home/LevelMap] ──► [UIPreBooster Panel] ──► [Game Level]     │
│       │                     │                      │            │
│  Play Button          Select Boosters        Execute Boosters   │
│                             │                      │            │
│                    ┌────────┴────────┐            │            │
│                    │                 │            │            │
│              [Hint Plus]     [Extra Time]        │            │
│              (if owned)      (if owned)          │            │
│                    │                 │            │            │
│                    └────────┬────────┘            │            │
│                             │                      │            │
│                    [Play Button] ─────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## UI Components

### UIPreBooster Panel Layout

```
┌──────────────────────────────────────────┐
│ [X Close]                    LEVEL {N}   │  ← Header (red banner)
├──────────────────────────────────────────┤
│                                          │
│   ⏳ Win Streak Gift                     │
│   +20s   [Unlocks at Level 20] 🔒       │  ← Win Streak Section
│                                          │
├──────────────────────────────────────────┤
│                                          │
│   Select Boosters:                       │
│                                          │
│   ┌─────────┐    ┌─────────┐            │
│   │   💡    │    │ Level   │            │
│   │  Hint   │    │   13    │            │
│   │  Plus   │    │   🔒    │            │
│   │   ✓     │    │         │            │
│   └─────────┘    └─────────┘            │
│   (unlocked)     (locked)                │  ← Booster Slots
│                                          │
├──────────────────────────────────────────┤
│         💀 Hard 💀                       │  ← Difficulty Badge
│   ┌──────────────────────────┐          │
│   │        PLAY              │          │  ← Play Button (green)
│   └──────────────────────────┘          │
│                                          │
└──────────────────────────────────────────┘
```

### Component States

**Booster Slot States:**
- `Locked`: Gray background, lock icon, "Level X" text
- `Unlocked (Not Owned)`: Normal color, tap to purchase/acquire
- `Unlocked (Owned)`: Normal color, selectable
- `Selected`: Highlight border, checkmark icon

**Win Streak Section States:**
- `Locked`: Gray hourglass, "Unlocks at Level X" badge
- `Inactive`: Normal color, shows "+20s" but streak < 7
- `Active`: Glowing effect, shows "+20s" actively applied

## Implementation References

### Core Files to Create/Modify

| File | Purpose |
|------|---------|
| `UIPreBooster.cs` | Main UI controller for pre-booster panel |
| `PreBoosterSave.cs` | Save data for booster states |
| `WinStreakSave.cs` | Win streak tracking persistence |
| `PreBoosterManager.cs` | Central booster logic manager |
| `HintPlusBooster.cs` | Hint Plus execution logic |
| `ExtraTimeBooster.cs` | Extra Time execution logic |
| `WinStreakGift.cs` | Win streak gift logic |

### Integration Points

```csharp
// In UIHome.cs or UILevelMap.cs - Replace direct level loading
public void OnPlayButtonClicked()
{
    // OLD: LevelController.Instance.LoadLevel();
    // NEW: Show pre-booster UI first
    UIPreBooster.Instance.Show(currentLevel, () => {
        LevelController.Instance.LoadLevel();
    });
}

// In LevelController.cs - After map spawn
public void LoadLevel(Action onComplete)
{
    // ... existing map creation code ...

    // NEW: Execute pre-boosters after map spawn
    PreBoosterManager.Instance.ExecutePreBoosters(() => {
        // Enable player input
        isGeneratingMap = false;
        onComplete?.Invoke();
    });
}
```

## Detailed References

Load for implementation specifics:

| Topic | File | Description |
|-------|------|-------------|
| UI Implementation | `references/ui-implementation.md` | Complete UIPreBooster.cs implementation with prefab setup |
| Save System | `references/save-system.md` | PreBoosterSave, WinStreakSave data structures |
| Booster Logic | `references/booster-logic.md` | HintPlusBooster, ExtraTimeBooster execution flow |
| Win Streak | `references/win-streak-system.md` | Win streak tracking, reset conditions, gift application |

## Critical Rules

### Hint Plus Rules
- Activates **ONCE per level** only
- Triggers **after map spawn**, **before player input**
- **NOT affected** by win/lose outcome
- Highlights **4 elements** sharing **1 topic**

### Extra Time Rules
- Activates **every level** if player owns booster
- Adds time **before countdown starts**
- **NOT affected** by win/lose outcome

### Win Streak Gift Rules
- Requires **7+ consecutive wins** to activate
- Bonus applies from **level N+1** (not current level)
- **Resets on ANY loss**
- **Stacks with Extra Time** for +40s total

### Unlock Progression
| Feature | Unlock Level |
|---------|--------------|
| Hint Plus (Pre-Booster 1) | Level 9 |
| Extra Time (Pre-Booster 2) | Level 13 |
| Win Streak Gift | Level 20 |

## Quick Diagnostic Commands

```csharp
// Check pre-booster states
Debug.Log($"Hint Plus owned: {PreBoosterSave.Instance.HintPlusOwned}");
Debug.Log($"Extra Time owned: {PreBoosterSave.Instance.ExtraTimeOwned}");

// Check win streak
Debug.Log($"Current streak: {WinStreakSave.Instance.CurrentStreak}");
Debug.Log($"Gift active: {WinStreakSave.Instance.IsGiftActive}");

// Check total bonus time
var bonusTime = PreBoosterManager.Instance.CalculateTotalBonusTime();
Debug.Log($"Total bonus time: {bonusTime}s");

// Check unlock status
var level = LevelSave.Instance.DisplayLevelNumber;
Debug.Log($"Hint Plus unlocked: {level >= 9}");
Debug.Log($"Extra Time unlocked: {level >= 13}");
Debug.Log($"Win Streak Gift unlocked: {level >= 20}");
```

## Common Pitfalls

1. **Don't activate Hint Plus multiple times** - Track activation state per level
2. **Don't apply Win Streak Gift to current level** - Only applies from next level
3. **Don't forget to reset streak on loss** - Must reset immediately on level fail
4. **Don't block input during booster execution** - Use proper async/callback pattern
5. **Time stacking calculation** - Ensure both bonuses are calculated correctly

## Event Flow Timeline

```
Level Selection → UIPreBooster.Show()
       │
       ▼
[User selects boosters] → [Press Play]
       │
       ▼
LevelController.LoadLevel()
       │
       ▼
Map.CreateTileGrid() → Tiles spawn with animation
       │
       ▼
PreBoosterManager.ExecutePreBoosters()
       │
       ├─► ExtraTimeBooster.Apply() → Add bonus time to timer
       │
       └─► HintPlusBooster.Execute() → Highlight 4 matching elements
              │
              ▼
       [Animation complete]
              │
              ▼
Enable Player Input → Game starts
```
