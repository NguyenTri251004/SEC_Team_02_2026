# Event System Implementation Guide

Complete guide for implementing game events like Match Race, Time Attack, and Special Challenges with lifecycle management and reward systems.

## Event System Architecture

### Event Lifecycle
```
Event Creation → Registration → Activation → In Progress → Completion → Reward Distribution → Cleanup
```

### Core Event Components
- **EventData**: Configuration (duration, goals, rewards)
- **EventController**: Lifecycle management
- **EventTracker**: Progress tracking
- **EventUI**: Visual feedback
- **RewardSystem**: Prize distribution

## Match Race Event

Players compete to complete levels faster than opponents. Tracks matches per second, combos, and completion time.

### PATTERN: Match Race Event Implementation
```csharp
public class MatchRaceEvent : GameEvent
{
    [Header("Race Configuration")]
    [SerializeField] private float raceDuration = 120f; // 2 minutes
    [SerializeField] private int targetMatches = 50;
    [SerializeField] private float comboMultiplier = 1.5f;

    [Header("Race State")]
    private int currentMatches = 0;
    private int comboCount = 0;
    private float lastMatchTime = 0f;
    private float comboWindow = 2f; // Seconds to maintain combo

    private Coroutine raceCoroutine;

    public override void StartEvent()
    {
        base.StartEvent();

        // Initialize race state
        currentMatches = 0;
        comboCount = 0;
        lastMatchTime = Time.time;

        // Subscribe to game events
        Map.OnGroupsMatched += HandleGroupMatched;

        // Start race timer
        raceCoroutine = StartCoroutine(RaceTimerCoroutine());

        // UI feedback
        EventUI.Instance.ShowRaceStart(raceDuration, targetMatches);
        AudioController.PlaySound(AudioController.AudioClips.raceStart);
    }

    private void HandleGroupMatched(List<TileGroup> groups)
    {
        int matchCount = groups.Sum(g => g.tiles.Count);

        // Check combo timing
        float timeSinceLastMatch = Time.time - lastMatchTime;
        if (timeSinceLastMatch <= comboWindow)
        {
            comboCount++;
            matchCount = Mathf.RoundToInt(matchCount * (1 + comboCount * comboMultiplier));

            // Visual combo feedback
            EventUI.Instance.ShowCombo(comboCount);
        }
        else
        {
            comboCount = 0;
        }

        lastMatchTime = Time.time;
        currentMatches += matchCount;

        // Update UI
        EventUI.Instance.UpdateRaceProgress(currentMatches, targetMatches);

        // Check completion
        if (currentMatches >= targetMatches)
        {
            CompleteEvent(EventResult.Success);
        }
    }

    private IEnumerator RaceTimerCoroutine()
    {
        float elapsed = 0f;

        while (elapsed < raceDuration)
        {
            elapsed += Time.deltaTime;

            // Update timer UI
            float remaining = raceDuration - elapsed;
            EventUI.Instance.UpdateTimer(remaining);

            yield return null;
        }

        // Time's up
        if (currentMatches >= targetMatches)
        {
            CompleteEvent(EventResult.Success);
        }
        else
        {
            CompleteEvent(EventResult.TimeOut);
        }
    }

    public override void CompleteEvent(EventResult result)
    {
        base.CompleteEvent(result);

        // Unsubscribe
        Map.OnGroupsMatched -= HandleGroupMatched;

        // Stop timer
        if (raceCoroutine != null)
        {
            StopCoroutine(raceCoroutine);
        }

        // Calculate rewards
        CalculateRewards(result);

        // UI feedback
        EventUI.Instance.ShowRaceComplete(result, currentMatches, targetMatches);
    }

    private void CalculateRewards(EventResult result)
    {
        if (result == EventResult.Success)
        {
            int baseReward = 100;
            int comboBonus = comboCount * 10;
            int totalReward = baseReward + comboBonus;

            RewardSystem.Instance.GiveReward(RewardType.Coins, totalReward);
        }
    }
}
```

## Time Attack Event

Complete as many levels as possible within time limit.

### PATTERN: Time Attack Event
```csharp
public class TimeAttackEvent : GameEvent
{
    [Header("Time Attack Configuration")]
    [SerializeField] private float eventDuration = 300f; // 5 minutes
    [SerializeField] private int rewardPerLevel = 50;

    private int levelsCompleted = 0;
    private Coroutine timerCoroutine;

    public override void StartEvent()
    {
        base.StartEvent();

        levelsCompleted = 0;

        // Subscribe to level completion
        LevelController.OnLevelCompleted += HandleLevelCompleted;

        // Start timer
        timerCoroutine = StartCoroutine(EventTimerCoroutine());

        // UI
        EventUI.Instance.ShowTimeAttackStart(eventDuration);
    }

    private void HandleLevelCompleted()
    {
        levelsCompleted++;

        // Update UI
        EventUI.Instance.UpdateLevelsCompleted(levelsCompleted);

        // Immediate reward per level
        RewardSystem.Instance.GiveReward(RewardType.Coins, rewardPerLevel);
    }

    private IEnumerator EventTimerCoroutine()
    {
        float elapsed = 0f;

        while (elapsed < eventDuration)
        {
            elapsed += Time.deltaTime;

            float remaining = eventDuration - elapsed;
            EventUI.Instance.UpdateTimer(remaining);

            yield return null;
        }

        // Time's up
        CompleteEvent(EventResult.Success);
    }

    public override void CompleteEvent(EventResult result)
    {
        base.CompleteEvent(result);

        // Unsubscribe
        LevelController.OnLevelCompleted -= HandleLevelCompleted;

        // Stop timer
        if (timerCoroutine != null)
        {
            StopCoroutine(timerCoroutine);
        }

        // Final bonus reward
        int bonusReward = levelsCompleted * 20;
        RewardSystem.Instance.GiveReward(RewardType.Coins, bonusReward);

        // UI
        EventUI.Instance.ShowTimeAttackComplete(levelsCompleted, bonusReward);
    }
}
```

## Special Challenge Event

Custom challenges with specific goals (e.g., "Match 100 red tiles", "Complete without power-ups").

### PATTERN: Special Challenge Event
```csharp
public class SpecialChallengeEvent : GameEvent
{
    [Header("Challenge Configuration")]
    [SerializeField] private ChallengeType challengeType;
    [SerializeField] private int targetValue;
    [SerializeField] private List<Reward> rewards;

    private int currentProgress = 0;

    public override void StartEvent()
    {
        base.StartEvent();

        currentProgress = 0;

        // Subscribe based on challenge type
        SubscribeToChallengeEvents();

        // UI
        EventUI.Instance.ShowChallengeStart(challengeType, targetValue);
    }

    private void SubscribeToChallengeEvents()
    {
        switch (challengeType)
        {
            case ChallengeType.MatchSpecificTrait:
                Map.OnGroupsMatched += HandleTraitMatched;
                break;

            case ChallengeType.CompleteWithoutPowerUps:
                PowerUpManager.OnPowerUpUsed += HandlePowerUpUsed;
                LevelController.OnLevelCompleted += HandleLevelCompleted;
                break;

            case ChallengeType.AchieveComboStreak:
                Map.OnGroupsMatched += HandleComboProgress;
                break;
        }
    }

    private void HandleTraitMatched(List<TileGroup> groups)
    {
        // Count specific trait matches
        foreach (var group in groups)
        {
            if (group.sharedTraits.Contains(targetTraitId))
            {
                currentProgress += group.tiles.Count;
            }
        }

        UpdateProgress();
    }

    private void HandlePowerUpUsed(PowerUpType type)
    {
        // Challenge failed if power-up used
        CompleteEvent(EventResult.Failed);
    }

    private void HandleComboProgress(List<TileGroup> groups)
    {
        // Track combo streak
        // Implementation depends on combo tracking system
    }

    private void UpdateProgress()
    {
        EventUI.Instance.UpdateChallengeProgress(currentProgress, targetValue);

        if (currentProgress >= targetValue)
        {
            CompleteEvent(EventResult.Success);
        }
    }

    public override void CompleteEvent(EventResult result)
    {
        base.CompleteEvent(result);

        // Unsubscribe
        UnsubscribeFromChallengeEvents();

        // Distribute rewards
        if (result == EventResult.Success)
        {
            foreach (var reward in rewards)
            {
                RewardSystem.Instance.GiveReward(reward.type, reward.amount);
            }
        }

        // UI
        EventUI.Instance.ShowChallengeComplete(result, rewards);
    }

    private void UnsubscribeFromChallengeEvents()
    {
        Map.OnGroupsMatched -= HandleTraitMatched;
        Map.OnGroupsMatched -= HandleComboProgress;
        PowerUpManager.OnPowerUpUsed -= HandlePowerUpUsed;
        LevelController.OnLevelCompleted -= HandleLevelCompleted;
    }
}
```

## Event Base Class

### PATTERN: Base Event Class
```csharp
public abstract class GameEvent : MonoBehaviour
{
    [Header("Event Configuration")]
    [SerializeField] protected string eventId;
    [SerializeField] protected string eventName;
    [SerializeField] protected Sprite eventIcon;

    protected bool isActive = false;
    protected EventResult result;

    public virtual void StartEvent()
    {
        isActive = true;
        OnEventStarted?.Invoke(this);
    }

    public virtual void CompleteEvent(EventResult eventResult)
    {
        if (!isActive) return;

        isActive = false;
        result = eventResult;

        OnEventCompleted?.Invoke(this, result);
    }

    public virtual void CancelEvent()
    {
        if (!isActive) return;

        isActive = false;
        OnEventCancelled?.Invoke(this);
    }

    // Events
    public static event Action<GameEvent> OnEventStarted;
    public static event Action<GameEvent, EventResult> OnEventCompleted;
    public static event Action<GameEvent> OnEventCancelled;

    // Properties
    public bool IsActive => isActive;
    public string EventId => eventId;
    public string EventName => eventName;
}

public enum EventResult
{
    Success,
    Failed,
    TimeOut,
    Cancelled
}

public enum ChallengeType
{
    MatchSpecificTrait,
    CompleteWithoutPowerUps,
    AchieveComboStreak,
    CompleteUnderTime,
    ReachScore
}
```

## WARNING: Event System Best Practices

1. **Always Unsubscribe**: Events must unsubscribe from all listeners in CompleteEvent/CancelEvent
2. **Save Event State**: Persist event progress for app backgrounding
3. **Handle Edge Cases**: Player quits mid-event, app crash, network loss
4. **UI Feedback**: Clear visual indication of event status and progress
5. **Performance**: Events should not impact game performance (60fps maintained)
