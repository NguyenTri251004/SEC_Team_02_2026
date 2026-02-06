# Hat Race - Quick Reference

## Event States

```csharp
NotStarted → PendingJoin → Joined → InProgress → Finished → RewardClaimed
                ↑             ↑         ↑
            Click Continue  Win Level  Play levels
```

## Key Values

| Property | Value |
|----------|-------|
| Duration | 3 days |
| Max Users | 50 (49 bots + 1 player) |
| Multiplier Tiers | x1, x2, x4, x6, x10 |
| Timer Type | System time (UTC) |

## Multiplier Logic

```csharp
// After winning:
consecutiveWins++;
int[] tiers = { 1, 2, 4, 6, 10 };
int multiplier = tiers[Mathf.Min(consecutiveWins, 4)];
int score = baseLevelScore * multiplier;

// After losing:
consecutiveWins = 0; // Back to x1
```

## Time Calculations

```csharp
// Get event ID
string eventId = HatRaceTimeHelper.GetCurrentEventId();

// Get remaining time
int seconds = HatRaceTimeHelper.GetRemainingSeconds();
string display = HatRaceTimeHelper.FormatRemainingTime(); // "1d 22h"

// Check if event ended
bool ended = seconds <= 0;
```

## Save Keys

```csharp
const string SAVE_KEY = "HatRaceSave";

// Important fields:
_save.CurrentEventId
_save.IsJoined
_save.CurrentScore
_save.ConsecutiveWins
_save.CachedLeaderboard
```

## Integration Points

```csharp
// On level complete
if (success) {
    HatRaceController.Instance.OnLevelWin(levelData, levelNumber);
} else {
    HatRaceController.Instance.OnLevelFail();
}

// On app start/resume
HatRaceController.Instance.CheckEventLifecycle();
```

## UI Quick Access

```csharp
// Show join popup
PopupController.ShowPopup<PopupHatRaceJoin>();

// Show main screen
ScreenController.ShowScreen<ScreenHatRace>();

// Show result popup
PopupController.ShowPopup<PopupHatRaceResult>();
```

## Common Debug Commands

```csharp
// Check current state
Debug.Log($"Event: {HatRaceController.Instance.CurrentEventId}");
Debug.Log($"Joined: {HatRaceController.Instance.IsJoined}");
Debug.Log($"Score: {HatRaceController.Instance.CurrentScore}");
Debug.Log($"Multiplier: x{HatRaceController.Instance.GetCurrentMultiplier()}");

// Force reset (testing only)
HatRaceController.Instance.ForceResetEvent();
```

## Checklist: Adding Hat Race to New Build

- [ ] Add HatRaceController prefab to persistent scene
- [ ] Add HatRaceHomeButton to ScreenHome
- [ ] Create PopupHatRaceJoin prefab
- [ ] Create PopupHatRaceResult prefab
- [ ] Create ScreenHatRace prefab
- [ ] Hook OnLevelWin/OnLevelFail in MIMGameController
- [ ] Test event cycle (use device time manipulation)
