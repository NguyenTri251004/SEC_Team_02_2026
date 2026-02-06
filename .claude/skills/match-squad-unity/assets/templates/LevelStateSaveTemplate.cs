using System;
using System.Collections.Generic;
using UnityEngine;
using MIMUltility;

namespace MIMFiles.Game.Scripts.Level
{
    /// <summary>
    /// Template for Level State Save - Temporary persistence for in-progress levels.
    /// 
    /// USAGE PATTERN:
    /// 1. Save during gameplay (periodic auto-save)
    /// 2. Restore on re-entry if valid
    /// 3. Clear on win/lose/quit
    /// 
    /// CRITICAL RULES:
    /// - Always set hasWon flag when calculating win state
    /// - Clear AFTER saving level progression (not before)
    /// - Check for stale win states on PreloadLevel
    /// - Use isRestoringFromSaveState flag to skip counter increments
    /// </summary>
    [System.Serializable]
    public class LevelStateSave : ISaveObject
    {
        // ========================================
        // LEVEL IDENTIFICATION
        // ========================================
        
        /// <summary>Level index in database</summary>
        public int levelIndex = -1;
        
        /// <summary>Display level number (UI)</summary>
        public int displayLevelNumber = -1;
        
        /// <summary>Game mode (0=Normal, 1=Challenge, etc.)</summary>
        public int gameModeInt = 0;
        
        // ========================================
        // GRID CONFIGURATION
        // ========================================
        
        public int gridWidth = 0;
        public int gridHeight = 0;
        
        // ========================================
        // TILE STATES
        // ========================================
        
        [System.Serializable]
        public class TileState
        {
            // Position
            public int x;
            public int y;
            
            // Type
            public int elementTypeIndex;
            
            // Traits
            public List<int> characterTraits = new List<int>();
            
            // Special effects
            public bool isLocked;
            public bool hasNail;
            public bool isHidden;
            public bool isFrozen;  // Example: Add your custom tile states here
            
            // Add more tile-specific state as needed:
            // public int frozenLayer;
            // public string keyId;
            // public bool hasChain;
        }
        
        public List<TileState> tileStates = new List<TileState>();
        
        // ========================================
        // PROGRESS TRACKING
        // ========================================
        
        /// <summary>Completed traits (already processed)</summary>
        public HashSet<int> completedTraits = new HashSet<int>();
        
        /// <summary>Spawned traits (from merge mechanic)</summary>
        public HashSet<int> spawnedTraits = new HashSet<int>();
        
        // ========================================
        // ANIMATION QUEUE
        // ========================================
        
        [System.Serializable]
        public class PendingGroupData
        {
            public List<Vector2Int> tilePositions = new List<Vector2Int>();
            public List<int> sharedTraits = new List<int>();
            public bool isTraitSpawning;
            
            // Add more group-specific data as needed:
            // public float animationDelay;
            // public bool isBonus;
        }
        
        public List<PendingGroupData> pendingAnimationGroups = new List<PendingGroupData>();
        
        // ========================================
        // TIMER STATE
        // ========================================
        
        public float remainingTime = 0f;
        public bool isTimerPaused = false;
        
        // ========================================
        // WIN CONDITION (CRITICAL)
        // ========================================
        
        /// <summary>
        /// CRITICAL: Set to true if level is completed (all traits matched).
        /// Used for stale win detection to prevent loading already-won levels.
        /// </summary>
        public bool hasWon = false;
        
        // ========================================
        // CUSTOM FEATURE STATE (EXAMPLES)
        // ========================================
        
        // Example: Power-up usage during level
        // public Dictionary<string, int> powerUpUsageCount = new Dictionary<string, int>();
        
        // Example: Special events during level
        // public bool hasTriggeredSpecialEvent = false;
        // public int specialEventProgress = 0;
        
        // Example: Combo tracking
        // public int currentCombo = 0;
        // public int maxComboThisLevel = 0;
        
        // ========================================
        // VALIDATION METHODS
        // ========================================
        
        /// <summary>
        /// Checks if save state contains valid data.
        /// Called before attempting restore.
        /// </summary>
        public bool HasValidState()
        {
            return levelIndex >= 0 && 
                   displayLevelNumber > 0 && 
                   gridWidth > 0 && 
                   gridHeight > 0 && 
                   tileStates.Count > 0;
        }
        
        /// <summary>
        /// Validates if this save matches current level and mode.
        /// Prevents loading wrong level's save.
        /// </summary>
        public bool IsValidFor(int currentLevel, int currentMode)
        {
            return displayLevelNumber == currentLevel && 
                   gameModeInt == currentMode;
        }
        
        // ========================================
        // REQUIRED INTERFACE
        // ========================================
        
        /// <summary>
        /// Called before save is written to disk.
        /// Use for validation or cleanup.
        /// </summary>
        public void Flush()
        {
            // Example: Validate data integrity
            if (completedTraits == null)
                completedTraits = new HashSet<int>();
            
            if (spawnedTraits == null)
                spawnedTraits = new HashSet<int>();
            
            // Example: Remove invalid tile states
            tileStates.RemoveAll(t => t == null);
            
            // Add your custom validation here
        }
        
        // ========================================
        // HELPER METHODS (OPTIONAL)
        // ========================================
        
        /// <summary>
        /// Calculates total completed traits (completed + spawned).
        /// Used for win condition checks.
        /// </summary>
        public int GetTotalCompletedTraits()
        {
            int total = completedTraits?.Count ?? 0;
            
            if (spawnedTraits != null)
            {
                foreach (var trait in spawnedTraits)
                {
                    if (completedTraits == null || !completedTraits.Contains(trait))
                    {
                        total++;
                    }
                }
            }
            
            return total;
        }
        
        /// <summary>
        /// Checks if level was already won.
        /// Used for stale win detection.
        /// </summary>
        public bool IsCompleted(int requiredTraits)
        {
            if (hasWon)
                return true;
            
            int totalCompleted = GetTotalCompletedTraits();
            return totalCompleted >= requiredTraits && requiredTraits > 0;
        }
        
        /// <summary>
        /// Gets completion percentage for progress display.
        /// </summary>
        public float GetCompletionPercentage(int requiredTraits)
        {
            if (requiredTraits <= 0)
                return 0f;
            
            int totalCompleted = GetTotalCompletedTraits();
            return Mathf.Clamp01((float)totalCompleted / requiredTraits);
        }
    }
}

// ========================================
// USAGE EXAMPLES
// ========================================

/*

// EXAMPLE 1: Save current level state
public void SaveLevelState()
{
    if (Map.Instance == null || loadedLevelData == null)
        return;
    
    levelStateSave = new LevelStateSave();
    
    // Identification
    levelStateSave.levelIndex = currentLevelIndex;
    levelStateSave.displayLevelNumber = levelSave.DisplayLevelNumber;
    levelStateSave.gameModeInt = (int)MIMGameController.Instance.gameMode;
    
    // Grid
    levelStateSave.gridWidth = Map.Instance.Width;
    levelStateSave.gridHeight = Map.Instance.Height;
    
    // Tiles
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
    
    // CRITICAL: Calculate win state
    int totalCompleted = levelStateSave.GetTotalCompletedTraits() + 
                        Map.Instance.allPendingGroups.Count;
    int requiredTraits = loadedLevelData.Traits.Length;
    levelStateSave.hasWon = (totalCompleted >= requiredTraits);
    
    SaveController.MarkAsSaveIsRequired();
    Debug.Log($"[LevelController] State saved: {totalCompleted}/{requiredTraits} traits");
}

// EXAMPLE 2: Load from save with animation replay
public void LoadLevelFromSave(Action onComplete)
{
    isRestoringFromSaveState = true; // Skip counter increments
    
    // Load level data
    loadedLevelData = GetLevelDataForRestore(levelStateSave);
    
    // Create map
    CreateMapFromSave(levelStateSave);
    
    // Restore tiles
    RestoreGridState(levelStateSave);
    
    // Restore timer
    if (levelStateSave.remainingTime > 0f)
    {
        RestoreTimer(levelStateSave.remainingTime, levelStateSave.isTimerPaused);
    }
    
    // Trigger animations (visual only, no counter increment)
    Map.Instance.UpdateGroupsAndWinCondition();
    
    // Wait for animations, then finalize
    StartCoroutine(WaitForRestoreAnimationsComplete(onComplete));
}

// EXAMPLE 3: Clear save (AFTER saving progression!)
public void OnWin()
{
    // CRITICAL ORDER:
    // 1. Increment level FIRST
    AdjustLevelNumber();
    
    // 2. Save progression IMMEDIATELY
    SaveController.Save(forceSave: true, useThreads: false);
    
    // 3. Clear level state LAST
    ClearSavedLevelState();
}

// EXAMPLE 4: Detect stale win state
public void PreloadLevel()
{
    if (levelStateSave != null && levelStateSave.HasValidState())
    {
        // Check if level was already won
        int requiredTraits = loadedLevelData.Traits.Length;
        
        if (levelStateSave.IsCompleted(requiredTraits))
        {
            Debug.Log("[LevelController] Detected stale win - auto-advancing");
            HandleStaleWinState(gameMode);
            return; // Skip loading this level
        }
    }
}

// EXAMPLE 5: Skip counter increment during restore
private void IncrementTraitCounter()
{
    // Check if we're restoring from save
    if (!MIMLevelController.IsRestoringFromSaveState)
    {
        UIController.Instance.IncrementCountTraits();
    }
}

*/

