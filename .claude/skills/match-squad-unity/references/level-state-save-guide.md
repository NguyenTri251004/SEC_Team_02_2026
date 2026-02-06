# Level State Save System Guide

Complete reference for Match Squad's temporary level state persistence system - saving and restoring in-progress gameplay.

## System Overview

The Level State Save system provides **temporary persistence** for in-progress levels, allowing players to exit mid-level and resume exactly where they left off. This is distinct from the permanent progression save (LevelSave).

### Two Save Systems

| Feature | LevelStateSave | LevelSave |
|---------|---------------|-----------|
| **Purpose** | Temporary in-progress state | Permanent progression |
| **Lifetime** | Cleared on level complete/quit | Persists forever |
| **Data** | Tiles, traits, timer, animations | Level number, tutorials |
| **Scope** | Current level only | All levels |
| **Clear Timing** | On win/lose/quit | Never (only increments) |

## Core Architecture

```
MIMLevelController (Orchestrator)
    ↓
LevelStateSave (Data Structure)
    ├── Level identification (levelIndex, displayLevelNumber, gameModeInt)
    ├── Grid state (width, height, tileStates)
    ├── Trait progress (completedTraits, spawnedTraits)
    ├── Animation queue (pendingAnimationGroups)
    ├── Timer state (remainingTime, isPaused)
    └── Win flag (hasWon)
    ↓
SaveController (Persistence Layer)
```

### Key Components

**LevelStateSave.cs** - Serializable data structure
- Stores complete level state snapshot
- Validates state on load
- Handles multiple game modes

**MIMLevelController.cs** - State management
- `SaveLevelState()` - Captures current state
- `LoadLevelFromSave()` - Restores saved state
- `ClearSavedLevelState()` - Removes temporary save
- `PreloadLevel()` - Detects stale win states

## Critical Patterns

### PATTERN 1: Save Order on Win (CRITICAL)

**The Problem:** Winning increments level number. If we clear level state BEFORE saving progression, old level data gets saved to the NEW level number.

**The Solution:** Three-step atomic operation in exact order:

```csharp
// ✅ CORRECT ORDER (in MIMGameController.WinGame)
public static void WinGame(bool hasWinBonusAnimations = false)
{
    if (!isGameActive) return;
    isGameActive = false;

    // STEP 1: Stop periodic auto-save (prevent race conditions)
    MIMLevelController.Instance.StopPeriodicAutoSave();

    // STEP 2: Increment level number FIRST (15 → 16)
    _mimGameController._mimLevelController.AdjustLevelNumber();

    // STEP 3: Force save progression IMMEDIATELY (saves level 16)
    SaveController.Save(forceSave: true, useThreads: false);
    Debug.Log($"[GameController] Level progression saved: {CurrentLevelNumber}");

    // STEP 4: NOW safe to clear level state (won't affect level 16)
    MIMLevelController.Instance.ClearSavedLevelState();
    Debug.Log("[GameController] Cleared level state on win - safe to exit");

    // Continue with win UI...
}
```

**❌ WRONG ORDER (causes level reset bug):**
```csharp
// DON'T DO THIS
ClearSavedLevelState();      // Clears level 15 data
AdjustLevelNumber();         // Now at level 16
SaveController.Save();       // Saves empty state to level 16!
// User's level progression resets to 1!
```

### PATTERN 2: Stale Win State Detection

**The Problem:** User completes level (5/5 traits), exits before win screen, returns to game → loads completed level but doesn't trigger win.

**The Solution:** Check for stale win states in TWO places:

#### Detection Point 1: PreloadLevel (Before Level Load)

```csharp
// In MIMLevelController.PreloadLevel()
if (levelStateSave != null && levelStateSave.HasValidState())
{
    // Calculate total completed traits (completed + spawned)
    int totalCompletedTraits = levelStateSave.completedTraits?.Count ?? 0;
    if (levelStateSave.spawnedTraits != null)
    {
        foreach (var trait in levelStateSave.spawnedTraits)
        {
            if (levelStateSave.completedTraits == null || 
                !levelStateSave.completedTraits.Contains(trait))
            {
                totalCompletedTraits++;
            }
        }
    }

    // Check if level was already won
    if (levelStateSave.hasWon || 
        (totalCompletedTraits >= requiredTraits && requiredTraits > 0))
    {
        Debug.Log("[LevelController] Detected stale win state - auto-advancing");
        HandleStaleWinState(gameMode);
        return; // Skip loading this level
    }
}
```

#### Detection Point 2: ScreenHome (UI Entry Point)

```csharp
// In ScreenHome.OnEnable()
private void OnEnable()
{
    // Check for stale win state before displaying home screen
    CheckAndHandleStaleWinState(MIMGameController.Instance.gameMode);
    
    // Update UI...
}

private void CheckAndHandleStaleWinState(MIMGameController.GameMode gameMode)
{
    var levelStateSave = MIMLevelController.Instance.levelStateSave;
    if (levelStateSave == null || !levelStateSave.HasValidState())
        return;

    // Load level data to check completion
    LevelData levelData = gameMode == MIMGameController.GameMode.Challenge
        ? MIMLevelController.Instance.levelDatabaseChallenge.GetLevel(levelStateSave.levelIndex)
        : MIMLevelController.Instance.levelDatabase.GetLevel(levelStateSave.levelIndex);

    if (levelData == null) return;

    int requiredTraits = levelData.Traits.Length;
    int totalCompletedTraits = CalculateTotalCompletedTraits(levelStateSave);

    // Auto-advance if level was won
    if (levelStateSave.hasWon || 
        (totalCompletedTraits >= requiredTraits && requiredTraits > 0))
    {
        // Increment level, save progression, clear state
        MIMLevelController.Instance.AdjustLevelNumber();
        SaveController.Save(forceSave: true, useThreads: false);
        MIMLevelController.Instance.ClearSavedLevelState();
        
        Debug.Log($"[ScreenHome] Auto-advanced from stale win: {MIMGameController.CurrentLevelNumber}");
    }
}
```

### PATTERN 3: Restore Animations Without Score Increment

**The Problem:** When restoring, match animations should replay for visual feedback, but shouldn't increment the trait counter (already counted before exit).

**The Solution:** Use `isRestoringFromSaveState` flag to skip counter updates:

```csharp
// In MIMLevelController.LoadLevelFromSave()
public void LoadLevelFromSave(Action onComplete)
{
    isRestoringFromSaveState = true; // Set flag BEFORE restore
    
    // Restore grid state
    RestoreGridState(levelStateSave);
    
    // Play match animations (visual only)
    // Counter increments are skipped due to flag
    Map.Instance.UpdateGroupsAndWinCondition();
    
    // Wait for animations to complete
    StartCoroutine(WaitForRestoreAnimationsComplete(onComplete));
}

// In TileGroupHelper.HighlightGroups()
private void IncrementCountTraits()
{
    // Skip counter increment during restore
    if (!MIMLevelController.IsRestoringFromSaveState)
    {
        UIController.Instance.IncrementCountTraits();
    }
}

// In Map.TraitSpawningWithCallback()
private void IncrementTraitCounter()
{
    if (!MIMLevelController.IsRestoringFromSaveState)
    {
        UIController.Instance.IncrementCountTraits();
    }
}
```

**Files That Check `isRestoringFromSaveState`:**
- `TileGroupHelper.cs` - Horizontal/vertical match counters
- `ParallelGroupProcessingHelper.cs` - Parallel group counters
- `Map.cs` - Trait spawning counters

### PATTERN 4: Periodic Auto-Save During Gameplay

**The Problem:** User exits mid-level unexpectedly (app crash, force quit, low battery). Progress lost.

**The Solution:** Periodic auto-save coroutine that runs during active gameplay:

```csharp
// In MIMLevelController
private Coroutine periodicAutoSaveCoroutine;
private const float AUTO_SAVE_INTERVAL = 5f; // Save every 5 seconds

public void StartPeriodicAutoSave()
{
    StopPeriodicAutoSave(); // Clear existing
    periodicAutoSaveCoroutine = StartCoroutine(PeriodicAutoSaveCoroutine());
}

public void StopPeriodicAutoSave()
{
    if (periodicAutoSaveCoroutine != null)
    {
        StopCoroutine(periodicAutoSaveCoroutine);
        periodicAutoSaveCoroutine = null;
    }
}

private IEnumerator PeriodicAutoSaveCoroutine()
{
    while (true)
    {
        yield return new WaitForSeconds(AUTO_SAVE_INTERVAL);
        
        // Only save if level is active and not animating
        if (Map.Instance != null && !Map.Instance.isProcessingAnimations)
        {
            SaveLevelState();
            Debug.Log("[LevelController] Periodic auto-save completed");
        }
    }
}
```

**Start/Stop Points:**
```csharp
// Start auto-save when level begins
public void LoadLevel(Action onComplete)
{
    // ... load level ...
    
    // Start periodic saving
    StartPeriodicAutoSave();
    
    onComplete?.Invoke();
}

// Stop auto-save on win/lose
public static void WinGame()
{
    MIMLevelController.Instance.StopPeriodicAutoSave();
    // ... rest of win logic ...
}

public static void LoseGame()
{
    MIMLevelController.Instance.StopPeriodicAutoSave();
    // ... rest of lose logic ...
}
```

## LevelStateSave Data Structure

### Complete Field Reference

```csharp
[System.Serializable]
public class LevelStateSave : ISaveObject
{
    // === Level Identification ===
    public int levelIndex = -1;              // Index in level database
    public int displayLevelNumber = -1;      // UI display number
    public int gameModeInt = 0;              // 0=Normal, 1=Challenge
    
    // === Grid Configuration ===
    public int gridWidth = 0;
    public int gridHeight = 0;
    
    // === Tile States ===
    [System.Serializable]
    public class TileState
    {
        public int x, y;                     // Grid position
        public int elementTypeIndex;         // Element type
        public List<int> characterTraits;    // Active traits
        public bool isLocked;                // Lock state
        public bool hasNail;                 // Special effects
        public bool isHidden;
    }
    public List<TileState> tileStates = new List<TileState>();
    
    // === Progress Tracking ===
    public HashSet<int> completedTraits = new HashSet<int>();
    public HashSet<int> spawnedTraits = new HashSet<int>();
    
    // === Animation Queue ===
    [System.Serializable]
    public class PendingGroupData
    {
        public List<Vector2Int> tilePositions;
        public List<int> sharedTraits;
        public bool isTraitSpawning;
    }
    public List<PendingGroupData> pendingAnimationGroups = new List<PendingGroupData>();
    
    // === Timer State ===
    public float remainingTime = 0f;
    public bool isTimerPaused = false;
    
    // === Win Condition ===
    public bool hasWon = false;              // Critical for stale win detection
    
    // === Validation ===
    public bool HasValidState()
    {
        return levelIndex >= 0 && 
               displayLevelNumber > 0 && 
               gridWidth > 0 && 
               gridHeight > 0 && 
               tileStates.Count > 0;
    }
    
    public bool IsValidFor(int currentLevel, int currentMode)
    {
        return displayLevelNumber == currentLevel && 
               gameModeInt == currentMode;
    }
    
    public void Flush() { }
}
```

### hasWon Flag Usage

**Critical Field:** `hasWon` must be set to `true` when calculating save state if level is completed:

```csharp
// In MIMLevelController.SaveLevelState()
public void SaveLevelState()
{
    // Calculate total completed traits (including pending animations)
    int totalCompletedTraits = Map.Instance.GroupDetector.CompleteTraits.Count;
    totalCompletedTraits += Map.Instance.GroupDetector.SpawnedTraits.Count;
    totalCompletedTraits += Map.Instance.allPendingGroups.Count; // Include pending!
    
    int requiredTraits = loadedLevelData.Traits.Length;
    
    // Set hasWon flag if level is complete
    levelStateSave.hasWon = (totalCompletedTraits >= requiredTraits);
    
    if (levelStateSave.hasWon)
    {
        Debug.Log($"[LevelController] Saving completed level state ({totalCompletedTraits}/{requiredTraits})");
    }
    
    // Save to disk
    SaveController.MarkAsSaveIsRequired();
}
```

## API Reference

### MIMLevelController Methods

#### Save Operations

```csharp
/// <summary>
/// Saves current level state to disk. Called periodically during gameplay.
/// </summary>
public void SaveLevelState()
{
    if (Map.Instance == null || loadedLevelData == null)
        return;
    
    // Capture all state
    levelStateSave = new LevelStateSave();
    levelStateSave.levelIndex = currentLevelIndex;
    levelStateSave.displayLevelNumber = levelSave.DisplayLevelNumber;
    levelStateSave.gameModeInt = (int)MIMGameController.Instance.gameMode;
    
    // Grid state
    levelStateSave.gridWidth = Map.Instance.Width;
    levelStateSave.gridHeight = Map.Instance.Height;
    
    // Tile states
    foreach (var tile in Map.Instance.TilesInMap)
    {
        levelStateSave.tileStates.Add(CreateTileState(tile));
    }
    
    // Progress
    levelStateSave.completedTraits = new HashSet<int>(
        Map.Instance.GroupDetector.CompleteTraits);
    levelStateSave.spawnedTraits = new HashSet<int>(
        Map.Instance.GroupDetector.SpawnedTraits);
    
    // Timer
    if (levelTimer != null)
    {
        levelStateSave.remainingTime = levelTimer.RemainingTime;
        levelStateSave.isTimerPaused = levelTimer.IsPaused;
    }
    
    // Win check (critical for stale win detection)
    int totalCompleted = levelStateSave.completedTraits.Count + 
                        levelStateSave.spawnedTraits.Count +
                        Map.Instance.allPendingGroups.Count;
    levelStateSave.hasWon = (totalCompleted >= loadedLevelData.Traits.Length);
    
    SaveController.MarkAsSaveIsRequired();
}
```

#### Restore Operations

```csharp
/// <summary>
/// Loads level from saved state. Replays animations without incrementing counters.
/// </summary>
public void LoadLevelFromSave(Action onComplete)
{
    isRestoringFromSaveState = true; // Enable restore mode
    
    // Load level data
    loadedLevelData = GetLevelDataForRestore(levelStateSave);
    
    // Create map structure
    CreateMapFromSave(levelStateSave);
    
    // Restore grid state (tiles, traits, locks)
    RestoreGridState(levelStateSave);
    
    // Restore timer
    if (levelStateSave.remainingTime > 0f)
    {
        RestoreTimer(levelStateSave.remainingTime, levelStateSave.isTimerPaused);
    }
    
    // CRITICAL: Don't restore completedTraits yet
    // Let animations play first, then restore in callback
    
    // Trigger animations (visual feedback only)
    Map.Instance.UpdateGroupsAndWinCondition();
    
    // Wait for animations, then finalize
    StartCoroutine(WaitForRestoreAnimationsComplete(onComplete));
}

/// <summary>
/// Called after restore animations complete. Finalizes state and checks win.
/// </summary>
private IEnumerator WaitForRestoreAnimationsComplete(Action onComplete)
{
    // Wait for all animations to finish
    yield return new WaitUntil(() => !TileGroupHelper.IsAnimationRunning);
    
    // NOW restore completed traits (prevents re-detection)
    if (levelStateSave.completedTraits != null)
    {
        foreach (var trait in levelStateSave.completedTraits)
        {
            Map.Instance.GroupDetector.AddSpawnedTrait(trait);
        }
    }
    
    isRestoringFromSaveState = false; // Disable restore mode
    
    // Check if level was already won
    CheckAndTriggerWinAfterRestore();
    
    onComplete?.Invoke();
}

/// <summary>
/// Checks if restored level is complete. Triggers win if needed.
/// </summary>
private void CheckAndTriggerWinAfterRestore()
{
    int requiredTraits = loadedLevelData.Traits.Length;
    int completedCount = Map.Instance.GroupDetector.CompleteTraits.Count;
    int spawnedCount = Map.Instance.GroupDetector.SpawnedTraits.Count;
    int totalCompleted = completedCount + spawnedCount;
    
    if (totalCompleted >= requiredTraits)
    {
        Debug.Log($"[LevelController] Level was completed before exit ({totalCompleted}/{requiredTraits}) - triggering win");
        
        // CRITICAL: Set isGameActive to true before calling WinGame
        // (WinGame has an isGameActive check that would fail otherwise)
        MIMGameController.SetGameActive(true);
        
        MIMGameController.WinGame(hasWinBonusAnimations: false);
    }
}
```

#### Clear Operations

```csharp
/// <summary>
/// Clears saved level state. Called on win/lose/quit.
/// WARNING: Call this AFTER saving level progression to avoid data loss.
/// </summary>
public void ClearSavedLevelState()
{
    if (levelStateSave != null)
    {
        Debug.Log($"[LevelController] Clearing level state save for level {levelStateSave.displayLevelNumber}");
        
        levelStateSave = new LevelStateSave(); // Reset to empty
        SaveController.MarkAsSaveIsRequired();
        
        Debug.Log("[LevelController] Level state cleared and saved");
    }
}
```

#### Stale Win Handling

```csharp
/// <summary>
/// Handles stale win state by advancing level and clearing save.
/// Called when detecting a completed level on game startup.
/// </summary>
private void HandleStaleWinState(MIMGameController.GameMode gameMode)
{
    Debug.Log($"[LevelController] HandleStaleWinState: Processing stale win for mode {gameMode}");
    
    // 1. Increment level number
    AdjustLevelNumber();
    
    // 2. Force save progression immediately
    SaveController.Save(forceSave: true, useThreads: false);
    
    // 3. Clear the stale level state
    ClearSavedLevelState();
    
    Debug.Log($"[LevelController] Stale win handled - advanced to level {(gameMode == MIMGameController.GameMode.Normal ? levelSave.DisplayLevelNumber : levelSaveChallenge.DisplayLevelNumber)}");
}
```

## Testing Scenarios

### Scenario 1: Mid-Level Exit and Resume

**Setup:**
1. Start level with 5 traits required
2. Complete 3/5 traits
3. Force close app (don't use quit button)

**Expected:**
- [x] Level state auto-saved before exit
- [x] On re-entry, level loads with 3/5 progress
- [x] Match animations replay for visual feedback
- [x] Trait counter shows correct 3/5 (no duplicate increment)
- [x] Remaining 2 traits can be completed normally
- [x] Win triggers correctly at 5/5

**Test Code:**
```csharp
[Test]
public void TestMidLevelRestore()
{
    // Play level to 3/5 completion
    PlayToCompletion(3, 5);
    
    // Save state
    MIMLevelController.Instance.SaveLevelState();
    
    // Simulate app restart
    RestartGame();
    
    // Verify restore
    Assert.AreEqual(3, GetCompletedTraitCount());
    Assert.IsFalse(MIMLevelController.Instance.levelStateSave.hasWon);
}
```

### Scenario 2: Win and Early Exit

**Setup:**
1. Start level 15
2. Complete final match (5/5 traits)
3. Exit app BEFORE win screen appears

**Expected:**
- [x] Level state saved with `hasWon = true`
- [x] On re-entry to home screen, auto-advance to level 16
- [x] Level state cleared
- [x] No ARN or stuck state
- [x] User's level 16 progression is saved

**Test Code:**
```csharp
[Test]
public void TestWinEarlyExit()
{
    // Complete level 15
    PlayToCompletion(5, 5);
    
    // Save state (hasWon should be true)
    MIMLevelController.Instance.SaveLevelState();
    Assert.IsTrue(MIMLevelController.Instance.levelStateSave.hasWon);
    
    // Exit before win screen
    ForceQuitApp();
    
    // Re-enter game
    StartGame();
    
    // Verify auto-advance to level 16
    Assert.AreEqual(16, MIMGameController.CurrentLevelNumber);
    Assert.IsFalse(MIMLevelController.Instance.levelStateSave.HasValidState());
}
```

### Scenario 3: Timer Level Restore

**Setup:**
1. Start timed level with 60 seconds
2. Play for 30 seconds (30s remaining)
3. Exit app

**Expected:**
- [x] Timer state saved (30s remaining)
- [x] On restore, timer resumes from 30s
- [x] Timer pause state restored correctly
- [x] Level can be completed or timed out normally

**Test Code:**
```csharp
[Test]
public void TestTimerRestore()
{
    // Start timer level
    LoadTimerLevel(durationSeconds: 60f);
    
    // Wait 30 seconds
    yield return new WaitForSeconds(30f);
    
    // Save and exit
    MIMLevelController.Instance.SaveLevelState();
    float savedTime = MIMLevelController.Instance.levelStateSave.remainingTime;
    
    Assert.IsTrue(savedTime < 35f && savedTime > 25f); // ~30s
    
    // Restore
    RestartGame();
    LoadSavedLevel();
    
    // Verify timer
    Assert.AreEqual(savedTime, levelTimer.RemainingTime, 1f);
}
```

### Scenario 4: Stale Win on Direct Gameplay Entry

**Setup:**
1. Complete level 10 (5/5 traits)
2. Exit before win screen
3. Re-enter game directly into gameplay (skip home screen)

**Expected:**
- [x] PreloadLevel detects stale win state
- [x] Auto-advance to level 11
- [x] Level state cleared
- [x] Level 11 loads fresh (not level 10)

**Test Code:**
```csharp
[Test]
public void TestStaleWinDirectEntry()
{
    // Complete level 10
    LoadLevel(10);
    PlayToCompletion(5, 5);
    MIMLevelController.Instance.SaveLevelState();
    
    // Exit early
    ForceQuitApp();
    
    // Re-enter directly to gameplay
    StartGame();
    EnterGameplayDirectly(); // Skip home screen
    
    // Verify auto-advance
    Assert.AreEqual(11, MIMGameController.CurrentLevelNumber);
    Assert.AreEqual(11, MIMLevelController.Instance.levelStateSave.displayLevelNumber);
}
```

## Common Issues & Solutions

### Issue 1: Level Progression Resets to 1

**Symptoms:**
- User wins level 15
- Exits before win screen
- Returns to level 1

**Root Cause:**
```csharp
// ❌ WRONG ORDER
ClearSavedLevelState();      // Clears old level
AdjustLevelNumber();         // Increments level
SaveController.Save();       // Saves empty state!
```

**Solution:**
```csharp
// ✅ CORRECT ORDER (from Pattern 1)
AdjustLevelNumber();         // Increment FIRST
SaveController.Save(forceSave: true, useThreads: false);  // Save progression
ClearSavedLevelState();      // Clear LAST
```

### Issue 2: ANR After Win Exit

**Symptoms:**
- Complete final trait (5/5)
- Exit during match animation
- Game freezes on re-entry

**Root Cause:**
- `hasWon` flag not set during save
- Restore doesn't detect completed state
- Win condition never triggers

**Solution:**
```csharp
// Always calculate win state when saving
int totalCompleted = completedTraits.Count + 
                    spawnedTraits.Count +
                    pendingAnimationGroups.Count; // Include pending!
                    
levelStateSave.hasWon = (totalCompleted >= requiredTraits);
```

### Issue 3: Duplicate Trait Counter

**Symptoms:**
- Exit at 3/5 progress
- Restore shows 6/5 progress

**Root Cause:**
- Counter incremented during restore animations
- No check for `isRestoringFromSaveState`

**Solution:**
```csharp
// In TileGroupHelper, Map, ParallelGroupProcessingHelper
if (!MIMLevelController.IsRestoringFromSaveState)
{
    UIController.Instance.IncrementCountTraits();
}
```

### Issue 4: Stale Win Not Detected

**Symptoms:**
- Won level loads on re-entry
- User plays already-completed level

**Root Cause:**
- Missing stale win checks in PreloadLevel or ScreenHome
- Incorrect trait calculation (missing spawned traits)

**Solution:**
```csharp
// Calculate TOTAL completed (completed + spawned)
int totalCompletedTraits = levelStateSave.completedTraits?.Count ?? 0;
if (levelStateSave.spawnedTraits != null)
{
    foreach (var trait in levelStateSave.spawnedTraits)
    {
        if (!levelStateSave.completedTraits.Contains(trait))
        {
            totalCompletedTraits++;
        }
    }
}

// Check win condition
if (levelStateSave.hasWon || totalCompletedTraits >= requiredTraits)
{
    HandleStaleWinState(gameMode);
}
```

## Debug Commands

### Check Save State

```csharp
// Print current save state
var save = MIMLevelController.Instance.levelStateSave;
if (save != null && save.HasValidState())
{
    Debug.Log($"Level: {save.displayLevelNumber}");
    Debug.Log($"Mode: {save.gameModeInt}");
    Debug.Log($"Grid: {save.gridWidth}x{save.gridHeight}");
    Debug.Log($"Tiles: {save.tileStates.Count}");
    Debug.Log($"Completed: {save.completedTraits?.Count ?? 0}");
    Debug.Log($"Spawned: {save.spawnedTraits?.Count ?? 0}");
    Debug.Log($"HasWon: {save.hasWon}");
    Debug.Log($"Timer: {save.remainingTime}s");
}
```

### Force Save

```csharp
// Force immediate save (testing)
MIMLevelController.Instance.SaveLevelState();
SaveController.Save(forceSave: true, useThreads: false);
Debug.Log("[Debug] Level state force-saved");
```

### Clear Save

```csharp
// Clear level state (testing)
MIMLevelController.Instance.ClearSavedLevelState();
SaveController.Save(forceSave: true, useThreads: false);
Debug.Log("[Debug] Level state cleared");
```

### Simulate Win Exit

```csharp
// Simulate winning and exiting early
[MenuItem("Debug/Simulate Win Exit")]
public static void SimulateWinExit()
{
    // Complete all traits
    var requiredTraits = MIMLevelController.Instance.loadedLevelData.Traits.Length;
    for (int i = 0; i < requiredTraits; i++)
    {
        Map.Instance.GroupDetector.AddSpawnedTrait(i);
    }
    
    // Save with hasWon flag
    MIMLevelController.Instance.SaveLevelState();
    
    // Quit without win screen
    Application.Quit();
}
```

## Performance Considerations

### Auto-Save Frequency

```csharp
// Current: 5 seconds (aggressive for safety)
private const float AUTO_SAVE_INTERVAL = 5f;

// Recommendations by platform:
// - Mobile: 5-10 seconds (balance safety vs battery)
// - Desktop: 3-5 seconds (faster is fine)
// - WebGL: 10-15 seconds (localStorage writes expensive)
```

### Save During Animations

```csharp
// Skip save if animations are running
if (Map.Instance != null && !Map.Instance.isProcessingAnimations)
{
    SaveLevelState();
}
```

**Why:** Saving during animations can capture inconsistent state (mid-transition tiles, incomplete groups).

### Memory Footprint

Typical save sizes:
- **Small grid (5x6):** ~2-3 KB
- **Medium grid (7x8):** ~5-7 KB
- **Large grid (9x10):** ~10-12 KB

**Optimization:** Consider compressing tile states if memory becomes an issue.

## Integration Checklist

When implementing level state save in new features:

- [ ] Call `SaveLevelState()` after significant gameplay events
- [ ] Check `isRestoringFromSaveState` before incrementing counters
- [ ] Include new state in `LevelStateSave` structure
- [ ] Restore new state in `LoadLevelFromSave()`
- [ ] Clear new state in `ClearSavedLevelState()`
- [ ] Test mid-level exit and restore
- [ ] Test win early exit scenario
- [ ] Test stale win detection
- [ ] Verify no duplicate counter increments
- [ ] Ensure proper save order on win

## Related Systems

- **[save-system-guide.md](./save-system-guide.md)** - Core persistence system
- **[save-system-cheatsheet.md](./save-system-cheatsheet.md)** - Quick reference
- **LevelSave** - Permanent progression (level number, tutorials)
- **MIMGameController** - Game state management
- **Map** - Grid state and group detection

## Quick Reference Card

```csharp
// Save current level state
MIMLevelController.Instance.SaveLevelState();

// Load from save
MIMLevelController.Instance.LoadLevelFromSave(onComplete: () => {
    Debug.Log("Restore complete");
});

// Clear save
MIMLevelController.Instance.ClearSavedLevelState();

// Check if restoring
if (MIMLevelController.IsRestoringFromSaveState)
{
    // Skip counter increments
}

// Win order (CRITICAL)
AdjustLevelNumber();
SaveController.Save(forceSave: true, useThreads: false);
ClearSavedLevelState();

// Check for stale win
if (levelStateSave.hasWon || totalCompletedTraits >= requiredTraits)
{
    HandleStaleWinState(gameMode);
}
```

---

**Last Updated:** December 2025  
**Version:** 1.0.0  
**Status:** Production-Ready

