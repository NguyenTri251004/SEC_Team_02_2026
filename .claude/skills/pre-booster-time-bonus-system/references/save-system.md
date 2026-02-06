# Save System for Pre-Boosters

## Overview

This document covers the save data structures for Pre-Boosters and Win Streak tracking.

## PreBoosterSave.cs

```csharp
using UnityEngine;
using Playard.SDK.Core.Modules.Save;

[System.Serializable]
public class PreBoosterSaveData : ISaveObject
{
    public int hintPlusCount;
    public int extraTimeCount;
}

public class PreBoosterSave : MonoBehaviour
{
    public static PreBoosterSave Instance { get; private set; }

    private const string SAVE_KEY = "PreBoosterSave";
    private PreBoosterSaveData saveData;

    // Properties for external access
    public int HintPlusCount => saveData?.hintPlusCount ?? 0;
    public int ExtraTimeCount => saveData?.extraTimeCount ?? 0;
    public bool HintPlusOwned => HintPlusCount > 0;
    public bool ExtraTimeOwned => ExtraTimeCount > 0;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            LoadData();
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void LoadData()
    {
        saveData = SaveController.Load<PreBoosterSaveData>(SAVE_KEY);
        if (saveData == null)
        {
            saveData = new PreBoosterSaveData
            {
                hintPlusCount = 0,
                extraTimeCount = 0
            };
            SaveData();
        }
    }

    private void SaveData()
    {
        SaveController.Save(SAVE_KEY, saveData);
    }

    // Add boosters (from purchase, rewards, etc.)
    public void AddHintPlus(int count = 1)
    {
        saveData.hintPlusCount += count;
        SaveData();
        Debug.Log($"[PreBoosterSave] Added {count} Hint Plus. Total: {saveData.hintPlusCount}");
    }

    public void AddExtraTime(int count = 1)
    {
        saveData.extraTimeCount += count;
        SaveData();
        Debug.Log($"[PreBoosterSave] Added {count} Extra Time. Total: {saveData.extraTimeCount}");
    }

    // Consume boosters (when used)
    public bool ConsumeHintPlus()
    {
        if (saveData.hintPlusCount <= 0)
        {
            Debug.LogWarning("[PreBoosterSave] No Hint Plus to consume!");
            return false;
        }

        saveData.hintPlusCount--;
        SaveData();
        Debug.Log($"[PreBoosterSave] Consumed 1 Hint Plus. Remaining: {saveData.hintPlusCount}");
        return true;
    }

    public bool ConsumeExtraTime()
    {
        if (saveData.extraTimeCount <= 0)
        {
            Debug.LogWarning("[PreBoosterSave] No Extra Time to consume!");
            return false;
        }

        saveData.extraTimeCount--;
        SaveData();
        Debug.Log($"[PreBoosterSave] Consumed 1 Extra Time. Remaining: {saveData.extraTimeCount}");
        return true;
    }

    // Debug methods
    public void DebugAddBoosters(int hintPlus, int extraTime)
    {
        AddHintPlus(hintPlus);
        AddExtraTime(extraTime);
    }

    public void DebugResetBoosters()
    {
        saveData.hintPlusCount = 0;
        saveData.extraTimeCount = 0;
        SaveData();
        Debug.Log("[PreBoosterSave] Reset all boosters to 0");
    }
}
```

## WinStreakSave.cs

```csharp
using UnityEngine;
using Playard.SDK.Core.Modules.Save;

[System.Serializable]
public class WinStreakSaveData : ISaveObject
{
    public int currentStreak;
    public int highestStreak;
    public bool giftPendingNextLevel; // True when streak just hit 7+
}

public class WinStreakSave : MonoBehaviour
{
    public static WinStreakSave Instance { get; private set; }

    private const string SAVE_KEY = "WinStreakSave";
    private const int GIFT_THRESHOLD = 7;

    private WinStreakSaveData saveData;

    // Properties
    public int CurrentStreak => saveData?.currentStreak ?? 0;
    public int HighestStreak => saveData?.highestStreak ?? 0;
    public bool IsGiftActive => CurrentStreak >= GIFT_THRESHOLD;
    public bool IsGiftPendingNextLevel => saveData?.giftPendingNextLevel ?? false;

    // Events
    public event System.Action<int> OnStreakChanged;
    public event System.Action OnStreakReset;
    public event System.Action OnGiftActivated;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
            LoadData();
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void LoadData()
    {
        saveData = SaveController.Load<WinStreakSaveData>(SAVE_KEY);
        if (saveData == null)
        {
            saveData = new WinStreakSaveData
            {
                currentStreak = 0,
                highestStreak = 0,
                giftPendingNextLevel = false
            };
            SaveData();
        }
    }

    private void SaveData()
    {
        SaveController.Save(SAVE_KEY, saveData);
    }

    /// <summary>
    /// Called when player wins a level.
    /// </summary>
    public void OnLevelWin()
    {
        int previousStreak = saveData.currentStreak;
        saveData.currentStreak++;

        // Update highest streak
        if (saveData.currentStreak > saveData.highestStreak)
        {
            saveData.highestStreak = saveData.currentStreak;
        }

        // Check if just reached threshold
        if (previousStreak < GIFT_THRESHOLD && saveData.currentStreak >= GIFT_THRESHOLD)
        {
            saveData.giftPendingNextLevel = true;
            OnGiftActivated?.Invoke();
            Debug.Log($"[WinStreakSave] Win Streak Gift ACTIVATED! Streak: {saveData.currentStreak}");
        }

        SaveData();
        OnStreakChanged?.Invoke(saveData.currentStreak);
        Debug.Log($"[WinStreakSave] Win! Streak: {saveData.currentStreak}");
    }

    /// <summary>
    /// Called when player loses a level.
    /// </summary>
    public void OnLevelLose()
    {
        if (saveData.currentStreak > 0)
        {
            Debug.Log($"[WinStreakSave] Loss! Streak reset from {saveData.currentStreak} to 0");
            saveData.currentStreak = 0;
            saveData.giftPendingNextLevel = false;
            SaveData();
            OnStreakReset?.Invoke();
            OnStreakChanged?.Invoke(0);
        }
    }

    /// <summary>
    /// Called when starting a new level to check if gift should apply.
    /// </summary>
    /// <returns>True if +20s bonus should be applied</returns>
    public bool ShouldApplyGiftToCurrentLevel()
    {
        // Gift only applies from the NEXT level after reaching threshold
        // So we check giftPendingNextLevel which was set when we first hit 7
        // But we need to track if this is the "next" level

        // If gift is active (streak >= 7) and we're past the activation level
        return IsGiftActive && !saveData.giftPendingNextLevel;
    }

    /// <summary>
    /// Called after level loads to clear the pending flag.
    /// This ensures the gift starts from the NEXT level.
    /// </summary>
    public void MarkLevelStarted()
    {
        if (saveData.giftPendingNextLevel)
        {
            saveData.giftPendingNextLevel = false;
            SaveData();
            Debug.Log("[WinStreakSave] Gift pending flag cleared. Bonus will apply from this level onward.");
        }
    }

    // Debug methods
    public void DebugSetStreak(int streak)
    {
        saveData.currentStreak = streak;
        saveData.giftPendingNextLevel = streak >= GIFT_THRESHOLD;
        if (streak > saveData.highestStreak)
        {
            saveData.highestStreak = streak;
        }
        SaveData();
        OnStreakChanged?.Invoke(streak);
        Debug.Log($"[WinStreakSave] Debug set streak to {streak}");
    }

    public void DebugResetStreak()
    {
        saveData.currentStreak = 0;
        saveData.giftPendingNextLevel = false;
        SaveData();
        OnStreakReset?.Invoke();
        OnStreakChanged?.Invoke(0);
        Debug.Log("[WinStreakSave] Debug reset streak to 0");
    }
}
```

## Integration with Game Flow

### WinConditionChecker.cs Integration

```csharp
// Add to existing WinConditionChecker.cs

private void HandleLevelComplete(bool isWin)
{
    if (isWin)
    {
        WinStreakSave.Instance.OnLevelWin();
    }
    else
    {
        WinStreakSave.Instance.OnLevelLose();
    }
}

// Call this in the existing win/lose handlers:
// - OnWinConditionMet() → HandleLevelComplete(true)
// - OnLevelFailed() → HandleLevelComplete(false)
```

### LevelController.cs Integration

```csharp
// Add at the beginning of LoadLevel():
public void LoadLevel(Action onComplete)
{
    // Mark level started for win streak tracking
    WinStreakSave.Instance.MarkLevelStarted();

    // ... rest of existing code
}
```

## Save Data Migration

If updating from older save system:

```csharp
public class SaveMigration
{
    public static void MigrateToPreBoosterSystem()
    {
        // Check if old save exists
        var oldSave = SaveController.Load<OldSaveData>("OldSaveKey");
        if (oldSave != null)
        {
            // Migrate relevant data
            var preboosterSave = new PreBoosterSaveData
            {
                hintPlusCount = oldSave.freeHints ?? 0,
                extraTimeCount = 0
            };
            SaveController.Save("PreBoosterSave", preboosterSave);

            Debug.Log("[Migration] Pre-Booster save migrated successfully");
        }
    }
}
```

## Debug Commands

```csharp
// Add to a debug manager or use in console

// Add boosters
PreBoosterSave.Instance.DebugAddBoosters(5, 5);

// Set win streak
WinStreakSave.Instance.DebugSetStreak(7);

// Reset all
PreBoosterSave.Instance.DebugResetBoosters();
WinStreakSave.Instance.DebugResetStreak();

// Check states
Debug.Log($"Hint Plus: {PreBoosterSave.Instance.HintPlusCount}");
Debug.Log($"Extra Time: {PreBoosterSave.Instance.ExtraTimeCount}");
Debug.Log($"Win Streak: {WinStreakSave.Instance.CurrentStreak}");
Debug.Log($"Gift Active: {WinStreakSave.Instance.IsGiftActive}");
```
