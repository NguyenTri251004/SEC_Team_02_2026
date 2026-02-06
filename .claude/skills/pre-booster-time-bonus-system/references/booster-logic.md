# Booster Logic Implementation

## Overview

This document covers the execution logic for each pre-booster type.

## PreBoosterManager.cs

Central manager that coordinates booster execution.

```csharp
using UnityEngine;
using System;
using System.Collections;

public class PreBoosterManager : MonoBehaviour
{
    public static PreBoosterManager Instance { get; private set; }

    [Header("Settings")]
    [SerializeField] private float extraTimeBonusAmount = 20f;
    [SerializeField] private float winStreakGiftBonusAmount = 20f;

    [Header("References")]
    [SerializeField] private HintPlusBooster hintPlusBooster;
    [SerializeField] private ExtraTimeBooster extraTimeBooster;

    // Selected boosters for current level
    private bool useHintPlus;
    private bool useExtraTime;

    // State tracking
    private bool isExecutingBoosters;

    // Events
    public event Action OnBoostersExecutionStarted;
    public event Action OnBoostersExecutionCompleted;

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

    /// <summary>
    /// Called by UIPreBooster when player confirms selection
    /// </summary>
    public void SetSelectedBoosters(bool hintPlus, bool extraTime)
    {
        useHintPlus = hintPlus;
        useExtraTime = extraTime;
        Debug.Log($"[PreBoosterManager] Selected: HintPlus={hintPlus}, ExtraTime={extraTime}");
    }

    /// <summary>
    /// Calculate total bonus time from all sources
    /// </summary>
    public float CalculateTotalBonusTime()
    {
        float total = 0f;

        // Extra Time booster
        if (useExtraTime)
        {
            total += extraTimeBonusAmount;
        }

        // Win Streak Gift (if active and unlocked)
        int currentLevel = LevelSave.Instance.DisplayLevelNumber;
        if (currentLevel >= 20 && WinStreakSave.Instance.ShouldApplyGiftToCurrentLevel())
        {
            total += winStreakGiftBonusAmount;
        }

        return total;
    }

    /// <summary>
    /// Execute all pre-boosters after map spawn
    /// Called from LevelController after tiles are spawned
    /// </summary>
    public void ExecutePreBoosters(Action onComplete)
    {
        if (isExecutingBoosters)
        {
            Debug.LogWarning("[PreBoosterManager] Already executing boosters!");
            onComplete?.Invoke();
            return;
        }

        StartCoroutine(ExecuteBoostersSequence(onComplete));
    }

    private IEnumerator ExecuteBoostersSequence(Action onComplete)
    {
        isExecutingBoosters = true;
        OnBoostersExecutionStarted?.Invoke();

        Debug.Log("[PreBoosterManager] Starting booster execution sequence...");

        // Step 1: Apply Extra Time (instant, before countdown)
        ApplyExtraTime();

        // Step 2: Apply Win Streak Gift bonus time
        ApplyWinStreakGift();

        // Step 3: Execute Hint Plus (with animation)
        if (useHintPlus)
        {
            yield return StartCoroutine(hintPlusBooster.Execute());
        }

        // Reset selection for next level
        useHintPlus = false;
        useExtraTime = false;

        isExecutingBoosters = false;
        OnBoostersExecutionCompleted?.Invoke();

        Debug.Log("[PreBoosterManager] Booster execution complete.");
        onComplete?.Invoke();
    }

    private void ApplyExtraTime()
    {
        if (!useExtraTime) return;

        float bonusTime = extraTimeBonusAmount;
        extraTimeBooster.Apply(bonusTime);
        Debug.Log($"[PreBoosterManager] Applied Extra Time: +{bonusTime}s");
    }

    private void ApplyWinStreakGift()
    {
        int currentLevel = LevelSave.Instance.DisplayLevelNumber;

        // Check unlock level
        if (currentLevel < 20)
        {
            Debug.Log("[PreBoosterManager] Win Streak Gift not unlocked yet");
            return;
        }

        // Check if gift should apply
        if (!WinStreakSave.Instance.ShouldApplyGiftToCurrentLevel())
        {
            Debug.Log("[PreBoosterManager] Win Streak Gift not active or pending");
            return;
        }

        float bonusTime = winStreakGiftBonusAmount;
        extraTimeBooster.Apply(bonusTime);
        Debug.Log($"[PreBoosterManager] Applied Win Streak Gift: +{bonusTime}s");
    }
}
```

## HintPlusBooster.cs

Handles the Hint Plus auto-highlight effect.

```csharp
using UnityEngine;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using DG.Tweening;

public class HintPlusBooster : MonoBehaviour
{
    [Header("Animation Settings")]
    [SerializeField] private float highlightDuration = 1.5f;
    [SerializeField] private float pulseScale = 1.15f;
    [SerializeField] private float pulseDuration = 0.3f;
    [SerializeField] private int pulseCount = 3;
    [SerializeField] private Color highlightColor = new Color(1f, 0.9f, 0.3f, 1f);

    [Header("Audio")]
    [SerializeField] private AudioClip hintSound;

    private bool hasExecutedThisLevel;

    private void OnEnable()
    {
        // Reset state when level loads
        LevelController.OnLevelLoaded += ResetState;
    }

    private void OnDisable()
    {
        LevelController.OnLevelLoaded -= ResetState;
    }

    private void ResetState()
    {
        hasExecutedThisLevel = false;
    }

    /// <summary>
    /// Execute Hint Plus effect
    /// </summary>
    public IEnumerator Execute()
    {
        // Guard: Only execute once per level
        if (hasExecutedThisLevel)
        {
            Debug.LogWarning("[HintPlusBooster] Already executed this level!");
            yield break;
        }

        hasExecutedThisLevel = true;
        Debug.Log("[HintPlusBooster] Executing Hint Plus...");

        // Find 4 tiles that share a common trait
        var matchingTiles = FindMatchingTiles(4);

        if (matchingTiles == null || matchingTiles.Count < 4)
        {
            Debug.LogWarning("[HintPlusBooster] Could not find 4 matching tiles!");
            yield break;
        }

        // Play hint sound
        if (hintSound != null)
        {
            AudioController.PlaySound(hintSound);
        }

        // Highlight the tiles
        yield return StartCoroutine(HighlightTiles(matchingTiles));

        Debug.Log("[HintPlusBooster] Hint Plus complete.");
    }

    /// <summary>
    /// Find tiles that share a common trait
    /// </summary>
    private List<NormalTile> FindMatchingTiles(int count)
    {
        var map = Map.Instance;
        if (map == null) return null;

        // Get all normal tiles
        var allTiles = new List<NormalTile>();
        for (int x = 0; x < map.Width; x++)
        {
            for (int y = 0; y < map.Height; y++)
            {
                var tileSlot = map.GetTileSlot(x, y);
                if (tileSlot?.CurrentTile is NormalTile normalTile && !normalTile.IsLocked())
                {
                    allTiles.Add(normalTile);
                }
            }
        }

        // Group tiles by trait
        var traitGroups = new Dictionary<int, List<NormalTile>>();

        foreach (var tile in allTiles)
        {
            foreach (var traitId in tile.GetTraits())
            {
                if (!traitGroups.ContainsKey(traitId))
                {
                    traitGroups[traitId] = new List<NormalTile>();
                }
                traitGroups[traitId].Add(tile);
            }
        }

        // Find a trait with at least 'count' tiles
        // Prefer traits that are NOT yet completed
        var completedTraits = map.GroupDetector.CompleteTraits;

        foreach (var kvp in traitGroups.OrderByDescending(g => g.Value.Count))
        {
            // Skip completed traits
            if (completedTraits.Contains(kvp.Key))
                continue;

            if (kvp.Value.Count >= count)
            {
                // Return first 'count' tiles
                return kvp.Value.Take(count).ToList();
            }
        }

        // Fallback: return any group with enough tiles
        foreach (var kvp in traitGroups.OrderByDescending(g => g.Value.Count))
        {
            if (kvp.Value.Count >= count)
            {
                return kvp.Value.Take(count).ToList();
            }
        }

        return null;
    }

    /// <summary>
    /// Animate tile highlight
    /// </summary>
    private IEnumerator HighlightTiles(List<NormalTile> tiles)
    {
        // Store original colors
        var originalColors = new Dictionary<NormalTile, Color>();
        foreach (var tile in tiles)
        {
            originalColors[tile] = tile.GetComponent<Image>().color;
        }

        // Pulse animation sequence
        for (int i = 0; i < pulseCount; i++)
        {
            // Scale up and change color
            foreach (var tile in tiles)
            {
                tile.transform.DOScale(pulseScale, pulseDuration * 0.5f)
                    .SetEase(Ease.OutQuad)
                    .SetUpdate(true);

                tile.GetComponent<Image>().DOColor(highlightColor, pulseDuration * 0.5f)
                    .SetUpdate(true);
            }

            yield return new WaitForSecondsRealtime(pulseDuration * 0.5f);

            // Scale back and restore color
            foreach (var tile in tiles)
            {
                tile.transform.DOScale(1f, pulseDuration * 0.5f)
                    .SetEase(Ease.InQuad)
                    .SetUpdate(true);

                tile.GetComponent<Image>().DOColor(originalColors[tile], pulseDuration * 0.5f)
                    .SetUpdate(true);
            }

            yield return new WaitForSecondsRealtime(pulseDuration * 0.5f);
        }

        // Ensure original state is restored
        foreach (var tile in tiles)
        {
            tile.transform.localScale = Vector3.one;
            tile.GetComponent<Image>().color = originalColors[tile];
        }
    }
}
```

## ExtraTimeBooster.cs

Handles adding bonus time to the level timer.

```csharp
using UnityEngine;

public class ExtraTimeBooster : MonoBehaviour
{
    [Header("Visual Feedback")]
    [SerializeField] private GameObject bonusTimePopup;
    [SerializeField] private float popupDuration = 1f;

    [Header("Audio")]
    [SerializeField] private AudioClip bonusTimeSound;

    /// <summary>
    /// Apply bonus time to the level timer
    /// </summary>
    public void Apply(float bonusSeconds)
    {
        if (bonusSeconds <= 0) return;

        // Get timer reference from LevelController or UIGame
        var levelTimer = LevelController.Instance.LevelTimer;
        if (levelTimer == null)
        {
            Debug.LogWarning("[ExtraTimeBooster] No level timer found!");
            return;
        }

        // Add bonus time
        levelTimer.AddBonusTime(bonusSeconds);

        // Play sound
        if (bonusTimeSound != null)
        {
            AudioController.PlaySound(bonusTimeSound);
        }

        // Show popup
        ShowBonusPopup(bonusSeconds);

        Debug.Log($"[ExtraTimeBooster] Applied +{bonusSeconds}s to timer");
    }

    private void ShowBonusPopup(float seconds)
    {
        if (bonusTimePopup == null) return;

        // Instantiate or enable popup
        var popup = PYDPool.Spawn(bonusTimePopup, Vector3.zero, Quaternion.identity);

        // Set text (assuming popup has TextMeshProUGUI component)
        var text = popup.GetComponentInChildren<TMPro.TextMeshProUGUI>();
        if (text != null)
        {
            text.text = $"+{seconds}s";
        }

        // Animate and despawn
        popup.transform.DOScale(1.2f, 0.2f)
            .SetEase(DG.Tweening.Ease.OutBack)
            .SetUpdate(true)
            .OnComplete(() => {
                popup.transform.DOScale(0f, 0.15f)
                    .SetDelay(popupDuration)
                    .SetUpdate(true)
                    .OnComplete(() => PYDPool.ReturnToPool(popup));
            });
    }
}
```

## LevelTimer Extension

Add this method to your existing LevelTimer class:

```csharp
// Add to LevelTimer.cs or create if doesn't exist

public class LevelTimer : MonoBehaviour
{
    private float remainingTime;
    private float totalTime;

    // ... existing code ...

    /// <summary>
    /// Add bonus time to the timer (from pre-boosters)
    /// Should be called BEFORE countdown starts
    /// </summary>
    public void AddBonusTime(float seconds)
    {
        remainingTime += seconds;
        totalTime += seconds;

        // Update UI
        UpdateTimerDisplay();

        Debug.Log($"[LevelTimer] Added {seconds}s. Total: {remainingTime}/{totalTime}");
    }

    /// <summary>
    /// Initialize timer with level duration + any pre-applied bonuses
    /// </summary>
    public void Initialize(float baseDuration)
    {
        // Calculate total bonus from PreBoosterManager
        float bonusTime = PreBoosterManager.Instance.CalculateTotalBonusTime();

        totalTime = baseDuration + bonusTime;
        remainingTime = totalTime;

        UpdateTimerDisplay();

        Debug.Log($"[LevelTimer] Initialized: Base={baseDuration}s, Bonus={bonusTime}s, Total={totalTime}s");
    }
}
```

## Execution Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRE-BOOSTER EXECUTION FLOW                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  LevelController.LoadLevel()                                    │
│        │                                                        │
│        ▼                                                        │
│  CreateMap() ──► Tiles Spawn with Animation                     │
│        │                                                        │
│        ▼                                                        │
│  PreBoosterManager.ExecutePreBoosters()                         │
│        │                                                        │
│        ├─► ApplyExtraTime() ──► LevelTimer.AddBonusTime(+20s)  │
│        │         │                                              │
│        │         └─► Show "+20s" Popup                          │
│        │                                                        │
│        ├─► ApplyWinStreakGift() ──► LevelTimer.AddBonusTime()  │
│        │         │              (if streak >= 7 & unlocked)     │
│        │         └─► Show "+20s" Popup (if applicable)          │
│        │                                                        │
│        └─► HintPlusBooster.Execute()                            │
│                  │                                              │
│                  ├─► FindMatchingTiles(4)                       │
│                  │                                              │
│                  └─► HighlightTiles() ──► Pulse Animation x3    │
│                                                                 │
│        ▼                                                        │
│  onComplete() ──► Enable Player Input                           │
│        │                                                        │
│        ▼                                                        │
│  Start Countdown ──► Game Begins                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Important Notes

### Hint Plus
1. **One-time execution**: Track `hasExecutedThisLevel` flag
2. **Prefer incomplete traits**: Don't hint at already-completed groups
3. **Animation timing**: Total animation = pulseCount * pulseDuration
4. **Restore state**: Always restore tile colors/scale after animation

### Extra Time
1. **Apply before countdown**: Time should be added before timer starts
2. **Stacking**: Extra Time and Win Streak Gift stack (+40s total)
3. **Visual feedback**: Show popup to indicate bonus time

### Integration Points
1. **LevelController**: Call `PreBoosterManager.ExecutePreBoosters()` after map creation
2. **UIPreBooster**: Call `PreBoosterManager.SetSelectedBoosters()` before level load
3. **LevelTimer**: Use `CalculateTotalBonusTime()` when initializing timer
