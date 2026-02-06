# Win Streak System

## Overview

The Win Streak Gift system rewards players who win consecutively with bonus time. After winning 7+ levels in a row, players receive +20s on each subsequent level.

## System Requirements

### Activation Condition
- Player must win **7 or more consecutive levels**
- Gift applies from **level N+1** (not the level where streak was achieved)

### Reset Condition
- **Any level loss** resets the streak to 0
- Gift bonus stops immediately after reset

### Unlock Level
- Win Streak Gift feature unlocks at **Level 20**
- Before Level 20, streak is still tracked but gift is not applied

## WinStreakGift.cs

```csharp
using UnityEngine;
using System;

public class WinStreakGift : MonoBehaviour
{
    public static WinStreakGift Instance { get; private set; }

    [Header("Settings")]
    [SerializeField] private int streakThreshold = 7;
    [SerializeField] private int unlockLevel = 20;
    [SerializeField] private float bonusTimeAmount = 20f;

    // Events
    public event Action<int> OnStreakUpdated;          // Current streak count
    public event Action OnGiftActivated;               // When streak hits threshold
    public event Action OnGiftDeactivated;             // When streak resets
    public event Action<float> OnBonusTimeApplied;     // When bonus is applied

    // Properties
    public int CurrentStreak => WinStreakSave.Instance.CurrentStreak;
    public bool IsGiftActive => CurrentStreak >= streakThreshold;
    public bool IsUnlocked => LevelSave.Instance.DisplayLevelNumber >= unlockLevel;
    public float BonusTimeAmount => bonusTimeAmount;
    public int StreakThreshold => streakThreshold;

    private void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
        }
        else
        {
            Destroy(gameObject);
        }
    }

    private void OnEnable()
    {
        // Subscribe to win/lose events
        WinConditionChecker.OnLevelWon += HandleLevelWon;
        WinConditionChecker.OnLevelLost += HandleLevelLost;
        WinStreakSave.Instance.OnStreakChanged += HandleStreakChanged;
    }

    private void OnDisable()
    {
        WinConditionChecker.OnLevelWon -= HandleLevelWon;
        WinConditionChecker.OnLevelLost -= HandleLevelLost;
        if (WinStreakSave.Instance != null)
        {
            WinStreakSave.Instance.OnStreakChanged -= HandleStreakChanged;
        }
    }

    private void HandleLevelWon()
    {
        int previousStreak = CurrentStreak;
        WinStreakSave.Instance.OnLevelWin();

        // Check if we just activated the gift
        if (previousStreak < streakThreshold && CurrentStreak >= streakThreshold)
        {
            OnGiftActivated?.Invoke();
            ShowGiftActivationUI();
        }

        OnStreakUpdated?.Invoke(CurrentStreak);
    }

    private void HandleLevelLost()
    {
        bool wasActive = IsGiftActive;
        WinStreakSave.Instance.OnLevelLose();

        if (wasActive)
        {
            OnGiftDeactivated?.Invoke();
            ShowGiftDeactivationUI();
        }

        OnStreakUpdated?.Invoke(0);
    }

    private void HandleStreakChanged(int newStreak)
    {
        Debug.Log($"[WinStreakGift] Streak changed to {newStreak}");
    }

    /// <summary>
    /// Check if bonus should be applied to current level
    /// </summary>
    public bool ShouldApplyBonus()
    {
        // Must be unlocked
        if (!IsUnlocked)
        {
            Debug.Log("[WinStreakGift] Not unlocked yet (Level < 20)");
            return false;
        }

        // Must have active gift
        if (!IsGiftActive)
        {
            Debug.Log("[WinStreakGift] Gift not active (Streak < 7)");
            return false;
        }

        // Must not be the level where streak was just achieved
        if (!WinStreakSave.Instance.ShouldApplyGiftToCurrentLevel())
        {
            Debug.Log("[WinStreakGift] Gift pending (will apply from next level)");
            return false;
        }

        return true;
    }

    /// <summary>
    /// Apply bonus time to timer
    /// </summary>
    public float ApplyBonus()
    {
        if (!ShouldApplyBonus())
        {
            return 0f;
        }

        Debug.Log($"[WinStreakGift] Applying +{bonusTimeAmount}s bonus");
        OnBonusTimeApplied?.Invoke(bonusTimeAmount);
        return bonusTimeAmount;
    }

    private void ShowGiftActivationUI()
    {
        // Show celebration UI
        Debug.Log("[WinStreakGift] Gift activated! Show celebration UI.");
        // TODO: Implement celebration popup
        // UIManager.Instance.ShowPopup("WinStreakGiftActivated", new { streak = streakThreshold });
    }

    private void ShowGiftDeactivationUI()
    {
        // Show loss notification
        Debug.Log("[WinStreakGift] Gift deactivated due to loss.");
        // TODO: Implement deactivation notification
        // UIManager.Instance.ShowNotification("Win Streak ended!");
    }

    // Debug methods
    public void DebugActivateGift()
    {
        WinStreakSave.Instance.DebugSetStreak(streakThreshold);
    }

    public void DebugDeactivateGift()
    {
        WinStreakSave.Instance.DebugResetStreak();
    }
}
```

## UI Integration

### Win Streak Display in UIPreBooster

```csharp
// In UIPreBooster.cs - SetupWinStreakSection method

private void SetupWinStreakSection()
{
    var gift = WinStreakGift.Instance;
    bool isUnlocked = gift.IsUnlocked;
    bool isActive = gift.IsGiftActive && gift.ShouldApplyBonus();

    // Icon state
    hourglassIcon.color = isUnlocked ? unlockedColor : lockedColor;

    // Bonus text state
    if (isActive)
    {
        bonusTimeText.text = $"+{gift.BonusTimeAmount}s";
        bonusTimeText.color = activeColor;

        // Add glow animation
        StartGlowAnimation(hourglassIcon.transform);
    }
    else
    {
        bonusTimeText.text = "+20s";
        bonusTimeText.color = isUnlocked ? unlockedColor : lockedColor;
    }

    // Lock badge
    if (!isUnlocked)
    {
        lockBadge.SetActive(true);
        lockText.text = $"Unlocks at Level {gift.unlockLevel}";
    }
    else if (!gift.IsGiftActive)
    {
        lockBadge.SetActive(true);
        lockText.text = $"Win {gift.StreakThreshold - gift.CurrentStreak} more";
    }
    else if (!gift.ShouldApplyBonus())
    {
        lockBadge.SetActive(true);
        lockText.text = "Activates next level";
    }
    else
    {
        lockBadge.SetActive(false);
    }
}
```

### Streak Counter in Game UI

```csharp
// Optional: Show current streak during gameplay

public class UIStreakCounter : MonoBehaviour
{
    [SerializeField] private TextMeshProUGUI streakText;
    [SerializeField] private GameObject streakContainer;
    [SerializeField] private Image flameIcon;

    private void OnEnable()
    {
        WinStreakGift.Instance.OnStreakUpdated += UpdateDisplay;
        UpdateDisplay(WinStreakGift.Instance.CurrentStreak);
    }

    private void OnDisable()
    {
        if (WinStreakGift.Instance != null)
        {
            WinStreakGift.Instance.OnStreakUpdated -= UpdateDisplay;
        }
    }

    private void UpdateDisplay(int streak)
    {
        if (streak < 3)
        {
            streakContainer.SetActive(false);
            return;
        }

        streakContainer.SetActive(true);
        streakText.text = $"x{streak}";

        // Change flame color based on streak
        if (streak >= 7)
        {
            flameIcon.color = Color.red; // Hot streak
        }
        else if (streak >= 5)
        {
            flameIcon.color = new Color(1f, 0.5f, 0f); // Orange
        }
        else
        {
            flameIcon.color = Color.yellow; // Normal
        }
    }
}
```

## State Machine

```
┌──────────────────────────────────────────────────────────────────┐
│                     WIN STREAK STATE MACHINE                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐         Win          ┌─────────────┐           │
│  │   INACTIVE  │ ─────────────────────► │   BUILDING  │           │
│  │ (Streak: 0) │                       │ (Streak: 1-6)│           │
│  └─────────────┘                       └─────────────┘           │
│         ▲                                     │                  │
│         │           Loss                     Win                 │
│         │◄──────────────────────────────┐    │                  │
│         │                               │    ▼                  │
│         │                        ┌─────────────┐                │
│         │◄───────────────────────│   PENDING   │                │
│         │        Loss            │ (Streak = 7) │                │
│         │                        │ Gift next lvl│                │
│         │                        └─────────────┘                │
│         │                               │                        │
│         │                              Win                       │
│         │                               │                        │
│         │                               ▼                        │
│         │                        ┌─────────────┐                │
│         └────────────────────────│    ACTIVE   │                │
│                   Loss           │ (Streak: 7+) │                │
│                                  │ +20s applied │                │
│                                  └─────────────┘                │
│                                         │                        │
│                                        Win                       │
│                                         │                        │
│                                         └───────┐               │
│                                                 │               │
│                                                 ▼               │
│                                          (Loop back to ACTIVE)  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Timeline Examples

### Example 1: Normal Activation

```
Level 10: Win → Streak: 1
Level 11: Win → Streak: 2
Level 12: Win → Streak: 3
Level 13: Win → Streak: 4
Level 14: Win → Streak: 5
Level 15: Win → Streak: 6
Level 16: Win → Streak: 7 → GIFT PENDING (activates next level)
Level 17: Win → Streak: 8 → +20s APPLIED
Level 18: Win → Streak: 9 → +20s APPLIED
Level 19: Lose → Streak: 0 → GIFT DEACTIVATED
Level 20: Win → Streak: 1 (starting over)
```

### Example 2: Early Loss

```
Level 10: Win → Streak: 1
Level 11: Win → Streak: 2
Level 12: Lose → Streak: 0 (reset)
Level 13: Win → Streak: 1 (starting over)
```

### Example 3: Before Unlock Level

```
Level 15: Win → Streak: 1
Level 16: Win → Streak: 2
Level 17: Win → Streak: 3
Level 18: Win → Streak: 4
Level 19: Win → Streak: 5
Level 20: Win → Streak: 6 (NOW UNLOCKED at Level 20)
Level 21: Win → Streak: 7 → GIFT PENDING
Level 22: Win → Streak: 8 → +20s APPLIED (first time gift applies)
```

## Testing Checklist

- [ ] Streak increments on win
- [ ] Streak resets to 0 on loss
- [ ] Gift activates at streak = 7
- [ ] Gift bonus only applies from N+1 level
- [ ] Gift deactivates on loss
- [ ] Feature locked before Level 20
- [ ] UI shows correct lock/unlock state
- [ ] Bonus time stacks with Extra Time booster
- [ ] Streak persists across app restart
- [ ] Events fire correctly for UI updates
