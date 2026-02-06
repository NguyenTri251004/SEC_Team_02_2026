using UnityEngine;
using System;
using System.Collections;
using System.Collections.Generic;

/// <summary>
/// Template for implementing game events like Match Race, Time Attack, and Special Challenges.
/// Includes lifecycle management, progress tracking, and reward distribution.
/// </summary>
public class EventSystemTemplate : MonoBehaviour
{
    #region Event Configuration

    [Header("Event Type")]
    [SerializeField] private EventType eventType;

    [Header("Event Settings")]
    [SerializeField] private string eventId;
    [SerializeField] private string eventName;
    [SerializeField] private Sprite eventIcon;
    [SerializeField] private float eventDuration = 120f;

    [Header("Goals")]
    [SerializeField] private int targetValue;
    [SerializeField] private int targetTraitId = -1; // For trait-specific events

    [Header("Rewards")]
    [SerializeField] private List<EventReward> rewards;

    [Header("UI References")]
    [SerializeField] private EventUIController eventUI;

    #endregion

    #region Event State

    private bool isActive = false;
    private EventResult currentResult = EventResult.InProgress;
    private int currentProgress = 0;
    private float elapsedTime = 0f;

    // Match Race specific
    private int comboCount = 0;
    private float lastMatchTime = 0f;
    private float comboWindow = 2f;

    // Time Attack specific
    private int levelsCompleted = 0;

    private Coroutine eventCoroutine;

    #endregion

    #region Event Lifecycle

    /// <summary>
    /// Starts the event with proper initialization.
    /// </summary>
    public void StartEvent()
    {
        if (isActive)
        {
            Debug.LogWarning($"Event {eventId} is already active");
            return;
        }

        isActive = true;
        currentResult = EventResult.InProgress;
        InitializeEventState();
        SubscribeToEvents();

        // Start event coroutine
        eventCoroutine = StartCoroutine(EventTimerCoroutine());

        // UI feedback
        ShowEventStartUI();

        // Audio/haptic feedback
        AudioController.PlaySound(AudioController.AudioClips.eventStart);
        HapticManager.Instance?.PlayEventStart();

        // Fire event started callback
        OnEventStarted?.Invoke(this);
    }

    /// <summary>
    /// Completes the event with given result.
    /// </summary>
    public void CompleteEvent(EventResult result)
    {
        if (!isActive)
        {
            return;
        }

        isActive = false;
        currentResult = result;

        // Unsubscribe from events
        UnsubscribeFromEvents();

        // Stop timer coroutine
        if (eventCoroutine != null)
        {
            StopCoroutine(eventCoroutine);
            eventCoroutine = null;
        }

        // Distribute rewards
        if (result == EventResult.Success)
        {
            DistributeRewards();
        }

        // UI feedback
        ShowEventCompleteUI(result);

        // Audio/haptic feedback
        if (result == EventResult.Success)
        {
            AudioController.PlaySound(AudioController.AudioClips.eventSuccess);
            HapticManager.Instance?.PlayEventSuccess();
        }
        else
        {
            AudioController.PlaySound(AudioController.AudioClips.eventFailed);
        }

        // Fire event completed callback
        OnEventCompleted?.Invoke(this, result);
    }

    /// <summary>
    /// Cancels the event mid-progress.
    /// </summary>
    public void CancelEvent()
    {
        if (!isActive)
        {
            return;
        }

        CompleteEvent(EventResult.Cancelled);
        OnEventCancelled?.Invoke(this);
    }

    #endregion

    #region Event-Specific Initialization

    private void InitializeEventState()
    {
        currentProgress = 0;
        elapsedTime = 0f;

        switch (eventType)
        {
            case EventType.MatchRace:
                comboCount = 0;
                lastMatchTime = Time.time;
                break;

            case EventType.TimeAttack:
                levelsCompleted = 0;
                break;

            case EventType.SpecialChallenge:
                // Challenge-specific initialization
                break;
        }
    }

    #endregion

    #region Event Subscriptions

    private void SubscribeToEvents()
    {
        switch (eventType)
        {
            case EventType.MatchRace:
                Map.OnGroupsMatched += HandleGroupsMatched;
                break;

            case EventType.TimeAttack:
                LevelController.OnLevelCompleted += HandleLevelCompleted;
                break;

            case EventType.SpecialChallenge:
                SubscribeToChallengeEvents();
                break;
        }
    }

    private void UnsubscribeFromEvents()
    {
        switch (eventType)
        {
            case EventType.MatchRace:
                Map.OnGroupsMatched -= HandleGroupsMatched;
                break;

            case EventType.TimeAttack:
                LevelController.OnLevelCompleted -= HandleLevelCompleted;
                break;

            case EventType.SpecialChallenge:
                UnsubscribeFromChallengeEvents();
                break;
        }
    }

    private void SubscribeToChallengeEvents()
    {
        // Subscribe based on challenge type
        Map.OnGroupsMatched += HandleChallengeProgress;
        PowerUpManager.OnPowerUpUsed += HandlePowerUpUsed;
    }

    private void UnsubscribeFromChallengeEvents()
    {
        Map.OnGroupsMatched -= HandleChallengeProgress;
        PowerUpManager.OnPowerUpUsed -= HandlePowerUpUsed;
    }

    #endregion

    #region Event Handlers

    private void HandleGroupsMatched(List<TileGroup> groups)
    {
        if (!isActive) return;

        switch (eventType)
        {
            case EventType.MatchRace:
                HandleMatchRaceProgress(groups);
                break;

            case EventType.SpecialChallenge:
                HandleChallengeProgress(groups);
                break;
        }
    }

    private void HandleMatchRaceProgress(List<TileGroup> groups)
    {
        int matchCount = 0;
        foreach (var group in groups)
        {
            matchCount += group.tiles.Count;
        }

        // Check combo timing
        float timeSinceLastMatch = Time.time - lastMatchTime;
        if (timeSinceLastMatch <= comboWindow)
        {
            comboCount++;
            float comboMultiplier = 1 + (comboCount * 0.5f);
            matchCount = Mathf.RoundToInt(matchCount * comboMultiplier);

            // Show combo UI
            eventUI?.ShowCombo(comboCount, comboMultiplier);
        }
        else
        {
            comboCount = 0;
        }

        lastMatchTime = Time.time;
        currentProgress += matchCount;

        // Update UI
        UpdateProgressUI();

        // Check completion
        if (currentProgress >= targetValue)
        {
            CompleteEvent(EventResult.Success);
        }
    }

    private void HandleLevelCompleted()
    {
        if (!isActive || eventType != EventType.TimeAttack) return;

        levelsCompleted++;
        currentProgress = levelsCompleted;

        // Update UI
        UpdateProgressUI();

        // Immediate reward per level
        GiveImmediateReward();
    }

    private void HandleChallengeProgress(List<TileGroup> groups)
    {
        if (!isActive || eventType != EventType.SpecialChallenge) return;

        // Count progress based on challenge type
        foreach (var group in groups)
        {
            // Check if group matches challenge requirements
            if (targetTraitId >= 0 && group.sharedTraits.Contains(targetTraitId))
            {
                currentProgress += group.tiles.Count;
            }
        }

        // Update UI
        UpdateProgressUI();

        // Check completion
        if (currentProgress >= targetValue)
        {
            CompleteEvent(EventResult.Success);
        }
    }

    private void HandlePowerUpUsed(PowerUpType type)
    {
        if (!isActive || eventType != EventType.SpecialChallenge) return;

        // Some challenges may fail if power-ups are used
        // Check challenge restrictions
        CompleteEvent(EventResult.Failed);
    }

    #endregion

    #region Timer Management

    private IEnumerator EventTimerCoroutine()
    {
        elapsedTime = 0f;

        while (elapsedTime < eventDuration && isActive)
        {
            elapsedTime += Time.deltaTime;

            // Update timer UI
            float remaining = eventDuration - elapsedTime;
            eventUI?.UpdateTimer(remaining);

            yield return null;
        }

        // Time's up
        if (isActive)
        {
            // Check if goal was reached
            if (currentProgress >= targetValue)
            {
                CompleteEvent(EventResult.Success);
            }
            else
            {
                CompleteEvent(EventResult.TimeOut);
            }
        }
    }

    #endregion

    #region UI Management

    private void ShowEventStartUI()
    {
        if (eventUI == null) return;

        eventUI.ShowEventStart(eventName, eventIcon, eventDuration, targetValue);
    }

    private void UpdateProgressUI()
    {
        if (eventUI == null) return;

        eventUI.UpdateProgress(currentProgress, targetValue);

        // Update specific UI based on event type
        switch (eventType)
        {
            case EventType.TimeAttack:
                eventUI.UpdateLevelsComplumumented(levelsCompleted);
                break;
        }
    }

    private void ShowEventCompleteUI(EventResult result)
    {
        if (eventUI == null) return;

        eventUI.ShowEventComplete(result, currentProgress, targetValue, rewards);
    }

    #endregion

    #region Reward Distribution

    private void DistributeRewards()
    {
        if (rewards == null) return;

        foreach (var reward in rewards)
        {
            RewardSystem.Instance?.GiveReward(reward.type, reward.amount);
        }
    }

    private void GiveImmediateReward()
    {
        // Give immediate reward for intermediate progress
        RewardSystem.Instance?.GiveReward(RewardType.Coins, 50);
    }

    #endregion

    #region Cleanup

    private void OnDestroy()
    {
        // Cancel event if still active
        if (isActive)
        {
            CancelEvent();
        }

        // Unsubscribe from all events
        UnsubscribeFromEvents();
    }

    #endregion

    #region Events

    public static event Action<EventSystemTemplate> OnEventStarted;
    public static event Action<EventSystemTemplate, EventResult> OnEventCompleted;
    public static event Action<EventSystemTemplate> OnEventCancelled;

    #endregion

    #region Properties

    public bool IsActive => isActive;
    public string EventId => eventId;
    public string EventName => eventName;
    public EventType EventType => eventType;
    public int CurrentProgress => currentProgress;
    public float ElapsedTime => elapsedTime;
    public EventResult CurrentResult => currentResult;

    #endregion
}

#region Supporting Classes

[Serializable]
public class EventReward
{
    public RewardType type;
    public int amount;
}

public enum EventType
{
    MatchRace,
    TimeAttack,
    SpecialChallenge,
    DailyChallenge,
    WeeklyChallenge
}

public enum EventResult
{
    InProgress,
    Success,
    Failed,
    TimeOut,
    Cancelled
}

public enum RewardType
{
    Coins,
    PowerUps,
    Lives,
    SpecialItems
}

#endregion
