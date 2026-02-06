---
name: hat-race-system
description: Complete Hat Race event system documentation for Mind Match. Covers the entire flow from unlock to completion, Bot AI leaderboard, Score Multiplier system, UI screens, save system, and automatic event cycling.
license: MIT
version: 1.0.0
---

# Hat Race Event System

This skill provides comprehensive documentation for implementing the **Hat Race** event system - a competitive leaderboard-based event where players earn points by winning levels and compete against AI bots for rewards.

## When to Use

Activate when working on:
- Hat Race event implementation
- Score Multiplier mechanics (x1 → x2 → x4 → x6 → x10)
- Bot AI leaderboard generation
- Time-based event cycling (3-day duration)
- Hat Race UI screens (Join, Demo, Result)
- Reward distribution based on ranking

## Table of Contents

1. [Event Overview](#event-overview)
2. [Event Lifecycle](#event-lifecycle)
3. [Score System](#score-system)
4. [Bot AI Leaderboard](#bot-ai-leaderboard)
5. [UI Components](#ui-components)
6. [Save System](#save-system)
7. [Implementation Guide](#implementation-guide)
8. [Code Patterns](#code-patterns)
9. [Testing Checklist](#testing-checklist)

---

## Event Overview

### What is Hat Race?

Hat Race is a time-limited competitive event where:
- **Duration**: 3 days (72 hours) based on system time
- **Goal**: Earn points by winning levels to climb the leaderboard
- **Competition**: Compete against 49 AI bots (50 total users displayed)
- **Rewards**: Top-ranked players earn rewards when event ends

### Key Differences from Other Events

| Feature | Hat Race | Match Race / Rise Up |
|---------|----------|---------------------|
| **Timer Type** | System time (fixed schedule) | Personal timer (starts on join) |
| **Duration** | Fixed 3-day cycles | Usually 24-48 hours from join |
| **Reset** | Automatic at fixed time | Per-user basis |
| **Example** | 15:00 Dec 2 → 15:00 Dec 5 | 24h from when user joins |

Similar timing system to: **Daily Reward**, **Weekly Leaderboard**

---

## Event Lifecycle

### Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                     HAT RACE EVENT LIFECYCLE                      │
└──────────────────────────────────────────────────────────────────┘

[Event Start] ─────────────────────────────────────────────────────►
     │
     ▼
┌─────────────────┐
│ Show Join Popup │  "Win a level to enter! Compete for rewards!"
│ (HatRace_Join)  │
└────────┬────────┘
         │ User clicks "Continue"
         ▼
┌─────────────────┐
│ Waiting to Join │  User must win 1 level to officially join
│ (hasPendingJoin │
│  = true)        │
└────────┬────────┘
         │ User wins a level
         ▼
┌─────────────────┐
│ Joined Hat Race │  isJoined = true
│ Start earning   │  First level win gives initial score
│ points!         │
└────────┬────────┘
         │ Continue winning levels
         ▼
┌─────────────────┐
│ Accumulate      │  Each win: score = levelScore × multiplier
│ Score           │  Multiplier increases on consecutive wins
└────────┬────────┘
         │ Event timer expires (3 days)
         ▼
┌─────────────────┐
│ Show Result     │  Display final rank and rewards
│ (HatRace_Result)│
└────────┬────────┘
         │ User claims/dismisses
         ▼
┌─────────────────┐
│ Reset Event     │  New 3-day cycle begins
│ Clear scores    │
│ Regenerate bots │
└─────────────────┘
```

### State Machine

```csharp
public enum HatRaceState
{
    NotStarted,      // Event not active or user hasn't seen join popup
    PendingJoin,     // User clicked Continue, waiting to win a level
    Joined,          // User has joined (won first level)
    InProgress,      // Actively competing
    Finished,        // Event ended, pending reward claim
    RewardClaimed    // Reward claimed/dismissed, waiting for next cycle
}
```

### Time Calculation

**System Time Based** (like Daily Reward / Weekly Leaderboard):

```csharp
public static class HatRaceTimeHelper
{
    // Event cycle: 3 days
    public const int EVENT_DURATION_DAYS = 3;
    
    /// <summary>
    /// Get the current event period ID (format: "YYYY-MM-DD-N")
    /// where N is the period number within that week
    /// </summary>
    public static string GetCurrentEventId()
    {
        DateTime now = DateTime.UtcNow;
        
        // Calculate event period based on a fixed anchor point
        // Example: Events start every 3 days from Jan 1, 2024 00:00 UTC
        DateTime anchor = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        TimeSpan elapsed = now - anchor;
        int periodNumber = (int)(elapsed.TotalDays / EVENT_DURATION_DAYS);
        
        return $"{anchor.Year}-{periodNumber:D4}";
    }
    
    /// <summary>
    /// Get timestamp when current event started
    /// </summary>
    public static long GetEventStartTimestamp()
    {
        DateTime anchor = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        DateTime now = DateTime.UtcNow;
        TimeSpan elapsed = now - anchor;
        int periodNumber = (int)(elapsed.TotalDays / EVENT_DURATION_DAYS);
        
        DateTime eventStart = anchor.AddDays(periodNumber * EVENT_DURATION_DAYS);
        return new DateTimeOffset(eventStart).ToUnixTimeSeconds();
    }
    
    /// <summary>
    /// Get timestamp when current event ends
    /// </summary>
    public static long GetEventEndTimestamp()
    {
        return GetEventStartTimestamp() + (EVENT_DURATION_DAYS * 24 * 3600);
    }
    
    /// <summary>
    /// Get remaining time in seconds
    /// </summary>
    public static int GetRemainingSeconds()
    {
        long endTime = GetEventEndTimestamp();
        long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        return Mathf.Max(0, (int)(endTime - now));
    }
    
    /// <summary>
    /// Format remaining time for UI display (e.g., "1d 22h", "5h 30m")
    /// </summary>
    public static string FormatRemainingTime()
    {
        int seconds = GetRemainingSeconds();
        
        if (seconds <= 0) return "Finished!";
        
        int days = seconds / 86400;
        int hours = (seconds % 86400) / 3600;
        int minutes = (seconds % 3600) / 60;
        
        if (days > 0)
            return $"{days}d {hours}h";
        else if (hours > 0)
            return $"{hours}h {minutes}m";
        else
            return $"{minutes}m";
    }
}
```

---

## Score System

### Score Multiplier Mechanism

Players earn a **base score** for each level win, multiplied by their current **Score Multiplier**.

```
Final Score = Base Level Score × Score Multiplier
```

### Multiplier Progression

| Consecutive Wins | Multiplier |
|------------------|------------|
| 0 (start)        | x1         |
| 1                | x2         |
| 2                | x4         |
| 3                | x6         |
| 4+               | x10        |

### Multiplier Rules

1. **Win a level** → Multiplier increases to next tier (max x10)
2. **Fail a level** → Multiplier resets to x1
3. **Multiplier is persistent** within the event period
4. **Multiplier resets** when new event cycle starts

### Score Calculation Implementation

```csharp
public class HatRaceScoreHelper
{
    private static readonly int[] MultiplierTiers = { 1, 2, 4, 6, 10 };
    
    /// <summary>
    /// Get multiplier value for given consecutive wins
    /// </summary>
    public static int GetMultiplier(int consecutiveWins)
    {
        int tierIndex = Mathf.Clamp(consecutiveWins, 0, MultiplierTiers.Length - 1);
        return MultiplierTiers[tierIndex];
    }
    
    /// <summary>
    /// Get multiplier tier index (0-4) for UI display
    /// </summary>
    public static int GetMultiplierTierIndex(int consecutiveWins)
    {
        return Mathf.Clamp(consecutiveWins, 0, MultiplierTiers.Length - 1);
    }
    
    /// <summary>
    /// Calculate score for a level win
    /// </summary>
    /// <param name="baseLevelScore">Base score based on level difficulty</param>
    /// <param name="consecutiveWins">Number of consecutive wins before this one</param>
    public static int CalculateLevelScore(int baseLevelScore, int consecutiveWins)
    {
        int multiplier = GetMultiplier(consecutiveWins);
        return baseLevelScore * multiplier;
    }
}
```

### Base Score by Level Difficulty

The base score should be determined by level difficulty. Reference the existing scoring system:

```csharp
/// <summary>
/// Calculate base score for a level based on its difficulty
/// Can be based on: level number, trait count, time limit, etc.
/// </summary>
public static int CalculateBaseLevelScore(LevelData levelData, int levelNumber)
{
    int baseScore = 10; // Minimum score
    
    // Add points based on level number (higher levels = more points)
    baseScore += levelNumber / 10; // +1 point per 10 levels
    
    // Add points based on trait count (more traits = harder)
    baseScore += levelData.Traits.Length * 2;
    
    // Add points if level has time limit (time pressure = harder)
    if (levelData.LevelDuration > 0)
    {
        baseScore += 5;
    }
    
    return baseScore;
}
```

---

## Bot AI Leaderboard

### Overview

- Display **top 50 users** in the leaderboard
- **All users are AI bots** (no real players)
- Similar pattern to `WeeklyLeaderboardBotGenerator`

### Bot Generation Strategy

```csharp
public static class HatRaceBotGenerator
{
    /// <summary>
    /// Generate bots for Hat Race event
    /// Uses event ID as seed for consistent generation
    /// </summary>
    public static List<HatRaceUserData> GenerateBotsForEvent(
        string eventId,
        int botCount = 49, // 49 bots + 1 player = 50 total
        int userScore = 0)
    {
        // Use event ID as seed for consistent bot generation
        int seed = eventId.GetHashCode();
        System.Random random = new System.Random(seed);
        
        List<HatRaceUserData> bots = new List<HatRaceUserData>();
        
        // Score distribution configuration
        float percentageBotsHigherThanUser = CalculateHigherPercentage(userScore);
        int botsHigherThanUser = Mathf.RoundToInt(botCount * percentageBotsHigherThanUser / 100f);
        
        for (int i = 0; i < botCount; i++)
        {
            string botName = GenerateBotName(random);
            int botScore = GenerateBotScore(random, userScore, i < botsHigherThanUser);
            int avatarId = random.Next(0, 30); // Assuming 30 avatars
            
            bots.Add(new HatRaceUserData(
                botId: $"hatrace_bot_{eventId}_{i:D4}",
                userName: botName,
                score: botScore,
                avatarId: avatarId,
                isBot: true
            ));
        }
        
        // Sort by score descending and assign ranks
        bots = bots.OrderByDescending(b => b.Score).ToList();
        for (int i = 0; i < bots.Count; i++)
        {
            bots[i].RankPosition = i + 1;
        }
        
        return bots;
    }
    
    /// <summary>
    /// Calculate percentage of bots that should have higher score than user
    /// Based on user's current score tier
    /// </summary>
    private static float CalculateHigherPercentage(int userScore)
    {
        if (userScore <= 0) return 100f; // All bots higher if user hasn't scored
        if (userScore < 50) return 80f;  // 80% higher for low scores
        if (userScore < 100) return 60f;
        if (userScore < 200) return 40f;
        if (userScore < 500) return 20f;
        return 10f; // Only 10% higher for high scorers
    }
}
```

### Bot Score Generation (User-Relative)

```csharp
private static int GenerateBotScore(System.Random random, int userScore, bool shouldBeHigher)
{
    if (userScore <= 0)
    {
        // User hasn't scored - generate low placeholder scores
        return random.Next(10, 50);
    }
    
    if (shouldBeHigher)
    {
        // Bot should have higher score than user
        int minScore = userScore + 1;
        int maxScore = Mathf.RoundToInt(userScore * 1.5f);
        return random.Next(minScore, maxScore + 1);
    }
    else
    {
        // Bot should have lower score than user
        int minScore = Mathf.Max(1, Mathf.RoundToInt(userScore * 0.3f));
        int maxScore = userScore - 1;
        return random.Next(minScore, Mathf.Max(minScore + 1, maxScore));
    }
}
```

### Updating Bots When User Score Changes

When user's score changes, regenerate bots to maintain competitive balance:

```csharp
/// <summary>
/// Regenerate bots when user score changes significantly
/// Call this after user completes a level
/// </summary>
public void OnUserScoreChanged(int newScore)
{
    // Only regenerate if score changed significantly (e.g., +10%)
    int oldScore = _save.LastBotGenerationScore;
    float changePercentage = oldScore > 0 
        ? Mathf.Abs(newScore - oldScore) / (float)oldScore 
        : 1f;
    
    if (changePercentage > 0.1f || _save.LastBotGenerationScore == 0)
    {
        RegenerateBotsForUserScore(newScore);
        _save.LastBotGenerationScore = newScore;
        SaveController.MarkAsSaveIsRequired();
    }
}
```

---

## UI Components

### Screen Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                        UI HIERARCHY                             │
└────────────────────────────────────────────────────────────────┘

ScreenHatRace (Main screen - HatRace_Demo.png)
├── Header
│   ├── InfoButton (top-left)
│   ├── Title "HAT RACE"
│   └── CloseButton (top-right)
│
├── Banner Section
│   ├── Character Illustration (4 wizards)
│   └── Timer Display "1d 22m"
│
├── Score Multiplier Bar
│   ├── Description "Win levels without failing..."
│   └── MultiplierButtons [x1] [x2] [x4] [x6] [x10]
│
├── Leaderboard ScrollView
│   ├── LeaderboardCard (Rank 1-3 with special styling)
│   ├── LeaderboardCard (Rank 4-50)
│   └── CurrentUserCard (highlighted, pinned at bottom)
│
└── Footer (optional action buttons)

PopupHatRaceJoin (HatRace_Join.png)
├── Header "HAT RACE"
├── Timer Display "1d 22h"
├── Hat Illustration
├── Description "Win a level to enter! Compete for rewards!"
└── ContinueButton

PopupHatRaceResult (HatRace_Result.png)
├── Header "HAT RACE"
├── Timer Display "Finished!"
├── Rank/Reward Section
│   ├── PlayerRank "#50"
│   └── PlayerReward (based on rank)
├── Top 3 Display (podium style)
├── CurrentUserCard
└── ContinueButton
```

### Leaderboard Card Design

```csharp
[Serializable]
public class HatRaceCardData
{
    public int rankPosition;     // 1-50
    public string userName;
    public int score;
    public int avatarId;
    public Sprite hatIcon;       // Hat icon for rank display
    public bool isCurrentUser;
    
    // Styling based on rank
    public Color BackgroundColor => GetBackgroundColor();
    public bool HasSpecialFrame => rankPosition <= 3;
    
    private Color GetBackgroundColor()
    {
        if (isCurrentUser) return new Color(0.6f, 0.9f, 0.6f); // Green
        
        switch (rankPosition)
        {
            case 1: return new Color(1f, 0.85f, 0.4f);    // Gold
            case 2: return new Color(0.85f, 0.85f, 0.9f); // Silver
            case 3: return new Color(0.9f, 0.7f, 0.5f);   // Bronze
            default: return new Color(0.95f, 0.92f, 0.85f); // Beige
        }
    }
}
```

### UI Flow Implementation

```csharp
public class ScreenHatRace : MonoBehaviour
{
    [Header("References")]
    [SerializeField] private ScrollRect leaderboardScrollView;
    [SerializeField] private HatRaceCard cardPrefab;
    [SerializeField] private Transform cardContainer;
    [SerializeField] private HatRaceCard currentUserCard;
    [SerializeField] private TMP_Text timerText;
    [SerializeField] private GameObject[] multiplierButtons; // 5 buttons
    
    [Header("Multiplier Visuals")]
    [SerializeField] private Color multiplierActiveColor = Color.green;
    [SerializeField] private Color multiplierInactiveColor = Color.gray;
    
    private List<HatRaceCard> _spawnedCards = new List<HatRaceCard>();
    
    public void Open()
    {
        RefreshLeaderboard();
        UpdateMultiplierDisplay();
        StartCoroutine(UpdateTimerCoroutine());
    }
    
    private void RefreshLeaderboard()
    {
        // Clear existing cards
        foreach (var card in _spawnedCards)
        {
            PYDPool.ReturnToPool(card.gameObject);
        }
        _spawnedCards.Clear();
        
        // Get leaderboard data
        var controller = HatRaceController.Instance;
        var leaderboard = controller.GetLeaderboard();
        
        // Limit to top 50
        int displayCount = Mathf.Min(50, leaderboard.Count);
        
        for (int i = 0; i < displayCount; i++)
        {
            var userData = leaderboard[i];
            var card = PYDPool.Spawn<HatRaceCard>(cardPrefab.gameObject, cardContainer);
            card.Setup(userData);
            _spawnedCards.Add(card);
        }
        
        // Setup current user card (pinned at bottom)
        var currentUser = controller.GetCurrentUserData();
        currentUserCard.Setup(currentUser);
    }
    
    private void UpdateMultiplierDisplay()
    {
        int currentTier = HatRaceController.Instance.GetCurrentMultiplierTier();
        
        for (int i = 0; i < multiplierButtons.Length; i++)
        {
            bool isActive = i <= currentTier;
            var image = multiplierButtons[i].GetComponent<Image>();
            image.color = isActive ? multiplierActiveColor : multiplierInactiveColor;
        }
    }
    
    private IEnumerator UpdateTimerCoroutine()
    {
        while (gameObject.activeInHierarchy)
        {
            timerText.text = HatRaceTimeHelper.FormatRemainingTime();
            yield return new WaitForSeconds(1f);
        }
    }
}
```

---

## Save System

### Save Data Structure

```csharp
[Serializable]
public class HatRaceSave : ISaveObject
{
    public const string SAVE_KEY = "HatRaceSave";
    
    // Event identification
    public string CurrentEventId;           // e.g., "2024-0045"
    public long EventStartTimestamp;        // When current event started
    
    // User state
    public bool HasSeenJoinPopup;           // Has user seen the join popup?
    public bool HasClickedContinue;         // Has user clicked Continue on join popup?
    public bool IsJoined;                   // Has user officially joined (won first level)?
    
    // Score data
    public int CurrentScore;                // Total accumulated score
    public int ConsecutiveWins;             // For multiplier calculation
    public int LastBotGenerationScore;      // Score when bots were last regenerated
    
    // Leaderboard cache
    public List<HatRaceUserData> CachedLeaderboard;
    public long CacheTimestamp;
    
    // Last event results (for reward popup)
    public string LastEventId;
    public int LastEventRank;
    public int LastEventScore;
    public bool LastEventRewardClaimed;
    
    /// <summary>
    /// Reset for new event cycle
    /// </summary>
    public void ResetForNewEvent(string newEventId, long startTimestamp)
    {
        // Save last event data before reset (for reward popup)
        if (!string.IsNullOrEmpty(CurrentEventId) && IsJoined)
        {
            LastEventId = CurrentEventId;
            LastEventRank = GetCurrentUserRank();
            LastEventScore = CurrentScore;
            LastEventRewardClaimed = false;
        }
        
        // Reset for new event
        CurrentEventId = newEventId;
        EventStartTimestamp = startTimestamp;
        HasSeenJoinPopup = false;
        HasClickedContinue = false;
        IsJoined = false;
        CurrentScore = 0;
        ConsecutiveWins = 0;
        LastBotGenerationScore = 0;
        CachedLeaderboard = null;
        CacheTimestamp = 0;
    }
    
    private int GetCurrentUserRank()
    {
        if (CachedLeaderboard == null) return -1;
        
        // Find user in leaderboard
        // ... implementation
        return -1;
    }
}
```

### Save Initialization

```csharp
private void Initialize()
{
    _save = SaveController.GetSaveObject<HatRaceSave>(HatRaceSave.SAVE_KEY);
    
    // Check if we need to start new event cycle
    string currentEventId = HatRaceTimeHelper.GetCurrentEventId();
    
    if (_save.CurrentEventId != currentEventId)
    {
        // New event cycle - check for pending reward first
        CheckAndShowPendingReward();
        
        // Reset for new event
        _save.ResetForNewEvent(
            currentEventId,
            HatRaceTimeHelper.GetEventStartTimestamp()
        );
        SaveController.MarkAsSaveIsRequired();
    }
    
    // Generate bots if needed
    EnsureBotsGenerated();
    
    _isInitialized = true;
}
```

---

## Implementation Guide

### Step 1: Create Core Classes

1. **HatRaceSave.cs** - Save data structure
2. **HatRaceTimeHelper.cs** - Time calculations
3. **HatRaceScoreHelper.cs** - Score/multiplier calculations
4. **HatRaceBotGenerator.cs** - Bot generation
5. **HatRaceUserData.cs** - User data structure
6. **HatRaceController.cs** - Main controller

### Step 2: Create UI Components

1. **ScreenHatRace.cs** - Main leaderboard screen
2. **PopupHatRaceJoin.cs** - Join popup
3. **PopupHatRaceResult.cs** - Result popup
4. **HatRaceCard.cs** - Leaderboard card

### Step 3: Integrate with Game Flow

```csharp
// In MIMGameController or LevelController
public void OnLevelComplete(bool success)
{
    // ... existing level complete logic ...
    
    // Hat Race integration
    if (HatRaceController.Instance != null && HatRaceController.Instance.IsEventActive)
    {
        if (success)
        {
            HatRaceController.Instance.OnLevelWin(levelData, levelNumber);
        }
        else
        {
            HatRaceController.Instance.OnLevelFail();
        }
    }
}
```

### Step 4: Home Screen Button

```csharp
// Add Hat Race button to home screen
public class HatRaceHomeButton : MonoBehaviour
{
    [SerializeField] private GameObject notificationBadge;
    [SerializeField] private TMP_Text timerText;
    
    private void OnEnable()
    {
        UpdateDisplay();
    }
    
    private void UpdateDisplay()
    {
        var controller = HatRaceController.Instance;
        
        if (controller == null || !controller.IsEventActive)
        {
            gameObject.SetActive(false);
            return;
        }
        
        // Show notification if user hasn't joined yet
        notificationBadge.SetActive(!controller.IsJoined);
        
        // Update timer
        timerText.text = HatRaceTimeHelper.FormatRemainingTime();
    }
    
    public void OnClick()
    {
        if (!HatRaceController.Instance.HasClickedContinue)
        {
            // Show join popup first
            PopupController.ShowPopup<PopupHatRaceJoin>();
        }
        else
        {
            // Go directly to leaderboard
            ScreenController.ShowScreen<ScreenHatRace>();
        }
    }
}
```

---

## Code Patterns

### Pattern: Event Lifecycle Check

```csharp
/// <summary>
/// Call this on app start and when returning from background
/// Checks if event state needs updating
/// </summary>
public void CheckEventLifecycle()
{
    string currentEventId = HatRaceTimeHelper.GetCurrentEventId();
    
    // Check if event cycle changed
    if (_save.CurrentEventId != currentEventId)
    {
        // Check for pending reward from previous event
        if (ShouldShowResultPopup())
        {
            ShowResultPopup();
            return;
        }
        
        // Reset for new event
        _save.ResetForNewEvent(currentEventId, HatRaceTimeHelper.GetEventStartTimestamp());
        SaveController.MarkAsSaveIsRequired();
        
        OnEventReset?.Invoke();
    }
    
    // Check if current event has ended
    if (HatRaceTimeHelper.GetRemainingSeconds() <= 0)
    {
        OnEventEnded?.Invoke();
    }
}
```

### Pattern: Score Submission

```csharp
/// <summary>
/// Called when user wins a level
/// </summary>
public void OnLevelWin(LevelData levelData, int levelNumber)
{
    if (!IsEventActive) return;
    
    // Check if this is first win (join event)
    if (!_save.IsJoined)
    {
        JoinEvent();
    }
    
    // Increment consecutive wins BEFORE calculating score
    _save.ConsecutiveWins++;
    
    // Calculate score
    int baseScore = HatRaceScoreHelper.CalculateBaseLevelScore(levelData, levelNumber);
    int multiplier = HatRaceScoreHelper.GetMultiplier(_save.ConsecutiveWins - 1); // -1 because we already incremented
    int earnedScore = baseScore * multiplier;
    
    // Add to total
    _save.CurrentScore += earnedScore;
    
    // Update leaderboard
    UpdateLeaderboardWithNewScore();
    
    SaveController.MarkAsSaveIsRequired();
    
    OnScoreUpdated?.Invoke(_save.CurrentScore, earnedScore, multiplier);
}

/// <summary>
/// Called when user fails a level
/// </summary>
public void OnLevelFail()
{
    if (!IsEventActive) return;
    
    // Reset multiplier
    _save.ConsecutiveWins = 0;
    
    SaveController.MarkAsSaveIsRequired();
    
    OnMultiplierReset?.Invoke();
}
```

### Pattern: Reward Distribution

```csharp
/// <summary>
/// Get reward for given rank
/// Configure in ScriptableObject for easy tuning
/// </summary>
public HatRaceReward GetRewardForRank(int rank)
{
    // Only top 3 get rewards (based on design)
    switch (rank)
    {
        case 1:
            return new HatRaceReward
            {
                coins = 500,
                powerUps = new[] { (PowerUpType.Hint, 5) }
            };
        case 2:
            return new HatRaceReward
            {
                coins = 300,
                powerUps = new[] { (PowerUpType.Hint, 3) }
            };
        case 3:
            return new HatRaceReward
            {
                coins = 100,
                powerUps = new[] { (PowerUpType.Hint, 1) }
            };
        default:
            return null; // No reward for rank > 3
    }
}
```

---

## Testing Checklist

### Event Lifecycle Tests

- [ ] Event starts automatically based on system time
- [ ] Event ID changes correctly every 3 days
- [ ] Timer displays correctly (Xd Xh format)
- [ ] Timer counts down in real-time
- [ ] Event resets when timer reaches 0

### Join Flow Tests

- [ ] Join popup appears on first interaction
- [ ] "Continue" button sets pending join state
- [ ] User officially joins after first level win
- [ ] Join state persists across app restarts

### Score System Tests

- [ ] Base score calculated correctly for different levels
- [ ] Multiplier increases on consecutive wins (1→2→4→6→10)
- [ ] Multiplier resets on level fail
- [ ] Multiplier caps at x10
- [ ] Total score accumulates correctly
- [ ] Score persists across app restarts

### Leaderboard Tests

- [ ] 50 users displayed (49 bots + 1 player)
- [ ] Bots regenerated when user score changes significantly
- [ ] Player rank updates correctly as score changes
- [ ] Current user card pinned at bottom
- [ ] Scroll view works smoothly

### Result Popup Tests

- [ ] Result popup shows when event ends
- [ ] Correct rank displayed
- [ ] Correct reward displayed (or "No reward" for rank > 3)
- [ ] Reward claimed correctly
- [ ] Result popup doesn't show again after claiming

### Edge Cases

- [ ] App backgrounded during event
- [ ] Time zone changes
- [ ] Clock manipulation detection
- [ ] First-time user experience
- [ ] User with very high score
- [ ] User with zero score

---

## References

- `WeeklyLeaderboardController.cs` - Similar time-based event pattern
- `WeeklyLeaderboardBotGenerator.cs` - Bot generation reference
- `LeaderboardController.cs` - Leaderboard UI patterns
- `ScreenLeaderBoard.cs` - Scroll view implementation
- Event System Guide: `.claude/skills/match-squad-unity/references/event-system-guide.md`
