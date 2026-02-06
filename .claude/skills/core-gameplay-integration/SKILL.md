# Skill: Core Gameplay Integration & Swap Guide

## Description
Complete guide for integrating, swapping, or removing Core Gameplay in PlayardSDK-based projects. Covers GameAdapter, BoosterAdapter, EventBus, and step-by-step procedures for adding new game cores.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                      │
│  (Game-Agnostic - Never changes when swapping games)         │
│                                                              │
│  ┌─────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │MIMGameController│  │  PUController  │  │ GameEventBus  │  │
│  │ (Orchestrator)  │  │ (Booster Inv.) │  │ (Event Hub)   │  │
│  └───────┬─────────┘  └───────┬────────┘  └───────────────┘  │
│          │                    │                              │
│          ▼                    ▼                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              ADAPTER LAYER (Contracts)                 │  │
│  │  GameAdapterBase          BoosterAdapterBase           │  │
│  │  - LoadLevel()            - UseBooster1/2/3()          │  │
│  │  - StartGame()            - GetBoosterDisplayName()    │  │
│  │  - OnGameOutcome          - ClearAllBoosterEffects()   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
┌───────────────────────┐       ┌───────────────────────────┐
│    SORTJAM CORE       │       │    MATCHBUDDIES CORE      │
│                       │       │                           │
│ SortJamAdapter        │       │ MatchBuddiesAdapter       │
│ SortJamBoosterAdapter │       │ MatchBuddiesBoosterAdapter│
│ SorticaGameManager    │       │ MatchBuddiesController    │
│ IBoosterService       │       │ Static Booster Classes    │
└───────────────────────┘       └───────────────────────────┘
```

---

## 2. Key Components

### 2.1 GameAdapterBase (Game → Infrastructure)
**Path:** `Assets/PlayardSDK/Core/GameAdapter/GameAdapterBase.cs`

```csharp
public abstract class GameAdapterBase : MonoBehaviour
{
    // Events (Game → Infrastructure)
    public event Action<GameOutcomeData> OnGameOutcome;
    public event Action OnGameStarted;
    public event Action OnLevelLoaded;
    public event Action OnLevelChanged;

    // Methods (Infrastructure → Game)
    public abstract string GameModeId { get; }
    public abstract void LoadLevel(int levelIndex, Action onComplete);
    public abstract void StartGame();
    public abstract void PauseGame();
    public abstract void ResumeGame();
    public abstract void ReplayLevel();
    public abstract bool CanRevive { get; }
    public abstract void Revive();
}
```

### 2.2 BoosterAdapterBase (Booster Logic)
**Path:** `Assets/PlayardSDK/Core/Boosters/BoosterAdapterBase.cs`

```csharp
public abstract class BoosterAdapterBase : MonoBehaviour
{
    public abstract string GameModeId { get; }

    // Capability Checks
    public abstract bool CanUseBooster1();
    public abstract bool CanUseBooster2();
    public abstract bool CanUseBooster3();

    // Usage
    public abstract bool UseBooster1();
    public abstract bool UseBooster2();
    public abstract bool UseBooster3();

    // Display Metadata (Game-specific names)
    public abstract string GetBoosterDisplayName(int slot);
    public abstract string GetBoosterDescription(int slot);

    // Cleanup
    public virtual void ClearAllBoosterEffects() { }
}
```

### 2.3 GameEventBus (Event Broadcasting)
**Path:** `Assets/PlayardSDK/Core/Events/GameEventBus.cs`

```csharp
public static class GameEventBus
{
    public static event Action<GameResultData> OnGameFinished_Core;
    public static event Action<GameResultData> OnGameFinished_UI;
    public static event Action<GameResultData> OnGameFinished_Analytics;

    public static void TriggerGameFinished(GameResultData data) { ... }
}
```

### 2.4 PUType (Generic Booster Slots)
**Path:** `Assets/MIMFiles/Game/Scripts/PowerUp/PUType.cs`

```csharp
public enum PUType
{
    None = 0,
    Booster1 = 1,  // Generic slot 1
    Booster2 = 2,  // Generic slot 2
    Booster3 = 3,  // Generic slot 3
}
```

---

## 3. Adding New Core Gameplay (Step-by-Step)

### Phase 1: Create Game Adapter

**File:** `Assets/{GameName}/Scripts/Adapter/{GameName}Adapter.cs`

```csharp
using MIM.Core.GameAdapter;
using UnityEngine;

namespace MIMUltility.{GameName}
{
    public class {GameName}Adapter : GameAdapterBase
    {
        public override string GameModeId => "{GameName}";

        // Reference to your game manager
        private {GameName}Manager GameManager => {GameName}Manager.Instance;

        private void Start()
        {
            // Subscribe to your game's events
            GameManager.OnWin += HandleWin;
            GameManager.OnLose += HandleLose;
        }

        private void OnDestroy()
        {
            if (GameManager != null)
            {
                GameManager.OnWin -= HandleWin;
                GameManager.OnLose -= HandleLose;
            }
        }

        private void HandleWin()
        {
            var data = new GameOutcomeData
            {
                GameModeId = GameModeId,
                Result = GameResultType.Win,
                LevelIndex = GameManager.CurrentLevel
            };
            TriggerGameOutcome(data);
        }

        private void HandleLose(LoseReason reason)
        {
            var data = new GameOutcomeData
            {
                GameModeId = GameModeId,
                Result = GameResultType.Lose,
                LoseReason = ConvertLoseReason(reason)
            };
            TriggerGameOutcome(data);
        }

        public override void LoadLevel(int levelIndex, Action onComplete)
        {
            GameManager.LoadLevel(levelIndex);
            onComplete?.Invoke();
            TriggerLevelLoaded();
        }

        public override void StartGame() => GameManager.StartGame();
        public override void PauseGame() => GameManager.Pause();
        public override void ResumeGame() => GameManager.Resume();
        public override void ReplayLevel() => GameManager.Replay();
        public override bool CanRevive => false;
        public override void Revive() { }
    }
}
```

### Phase 2: Create Booster Adapter

**File:** `Assets/{GameName}/Scripts/Adapter/{GameName}BoosterAdapter.cs`

```csharp
using MIM.Core.Boosters;
using UnityEngine;

namespace MIMUltility.{GameName}
{
    public class {GameName}BoosterAdapter : BoosterAdapterBase
    {
        public override string GameModeId => "{GameName}";

        private bool IsGameActive => {GameName}Manager.Instance?.IsActive ?? false;

        #region Capability Checks

        public override bool CanUseBooster1() => IsGameActive;
        public override bool CanUseBooster2() => IsGameActive;
        public override bool CanUseBooster3() => IsGameActive;

        #endregion

        #region Display Metadata

        public override string GetBoosterDisplayName(int slot) => slot switch
        {
            1 => "Booster 1 Name",
            2 => "Booster 2 Name",
            3 => "Booster 3 Name",
            _ => $"Booster{slot}"
        };

        public override string GetBoosterDescription(int slot) => slot switch
        {
            1 => "Description for booster 1",
            2 => "Description for booster 2",
            3 => "Description for booster 3",
            _ => ""
        };

        #endregion

        #region Booster Usage

        public override bool UseBooster1()
        {
            if (!CanUseBooster1()) return false;

            // Your game-specific booster logic
            {GameName}Manager.Instance.UseBooster1();
            TriggerBoosterUsed(BoosterTypes.Booster1);
            return true;
        }

        public override bool UseBooster2()
        {
            if (!CanUseBooster2()) return false;

            {GameName}Manager.Instance.UseBooster2();
            TriggerBoosterUsed(BoosterTypes.Booster2);
            return true;
        }

        public override bool UseBooster3()
        {
            if (!CanUseBooster3()) return false;

            {GameName}Manager.Instance.UseBooster3();
            TriggerBoosterUsed(BoosterTypes.Booster3);
            return true;
        }

        #endregion

        #region State Management

        public override void ClearAllBoosterEffects()
        {
            // Clear any active booster effects
        }

        #endregion
    }
}
```

### Phase 3: Register in MIMGameController

**File:** `Assets/MIMFiles/Game/Scripts/Controllor/MIMGameController.cs`

Add to `Initialize()`:
```csharp
// --- ADAPTER SETUP ---
if (activeGameAdapter == null)
{
    activeGameAdapter = GetComponent<{GameName}Adapter>();
    if (activeGameAdapter == null)
        activeGameAdapter = gameObject.AddComponent<{GameName}Adapter>();
}
```

Add to `SetupBoosterAdapter()`:
```csharp
else if (activeGameAdapter is {GameName}Adapter)
{
    boosterAdapter = GetComponent<{GameName}BoosterAdapter>();
    if (boosterAdapter == null)
        boosterAdapter = gameObject.AddComponent<{GameName}BoosterAdapter>();
}
```

### Phase 4: Create Event Connectors (Optional)

If your game needs to integrate with event modules (HatRace, etc.):

**File:** `Assets/{GameName}/Scripts/Connectors/{GameName}Connector.cs`

```csharp
using MIM.Core.Events;
using MIM.Core.Modules;

public class {GameName}Connector : BaseGameModule
{
    protected override void OnGameFinished(GameResultData data)
    {
        if (data.GameModeId != "{GameName}") return;

        if (data.Result == GameResultType.Win)
        {
            // Handle win logic for modules
        }
    }
}
```

---

## 4. Removing Core Gameplay

### To Remove a Game Core:

1. **Delete Adapter Files:**
   - `Assets/{GameName}/Scripts/Adapter/{GameName}Adapter.cs`
   - `Assets/{GameName}/Scripts/Adapter/{GameName}BoosterAdapter.cs`

2. **Remove from MIMGameController:**
   - Remove `if (activeGameAdapter is {GameName}Adapter)` block
   - Remove corresponding booster adapter setup

3. **Scene Cleanup:**
   - Remove any GameObjects with game-specific components

**No errors will occur** - Infrastructure only references abstract adapters.

---

## 5. Booster Slot Mapping Reference

| PUType | Slot | SortJam | MatchBuddies | Your Game |
|--------|------|---------|--------------|-----------|
| Booster1 | 1 | Hint | Find Pair | ? |
| Booster2 | 2 | Shuffle | Hint Topic | ? |
| Booster3 | 3 | Magnet | Frozen Clock | ? |

**Important:** PUType uses generic names. Display names come from `GetBoosterDisplayName()`.

---

## 6. File Structure Template

```
Assets/
├── PlayardSDK/Core/
│   ├── GameAdapter/
│   │   └── GameAdapterBase.cs
│   ├── Boosters/
│   │   └── BoosterAdapterBase.cs
│   └── Events/
│       └── GameEventBus.cs
│
├── {GameName}/Scripts/
│   ├── Adapter/
│   │   ├── {GameName}Adapter.cs
│   │   └── {GameName}BoosterAdapter.cs
│   ├── Services/
│   │   └── {GameName}Manager.cs
│   └── Connectors/
│       └── {GameName}Connector.cs
│
└── MIMFiles/Game/Scripts/
    ├── Controllor/MIMGameController.cs
    └── PowerUp/
        ├── PUType.cs
        └── PUController.cs
```

---

## 7. Checklist for New Game Integration

### Pre-Implementation
- [ ] Understand game's win/lose conditions
- [ ] Identify booster types needed (max 3)
- [ ] Map boosters to PUType slots

### Implementation
- [ ] Create `{GameName}Adapter : GameAdapterBase`
- [ ] Create `{GameName}BoosterAdapter : BoosterAdapterBase`
- [ ] Implement all abstract methods
- [ ] Add display names for boosters

### Integration
- [ ] Register adapters in `MIMGameController.Initialize()`
- [ ] Register booster adapter in `SetupBoosterAdapter()`
- [ ] Test adapter discovery (check console logs)

### Verification
- [ ] Game starts correctly
- [ ] Win/Lose triggers correct events
- [ ] Boosters work and display correct names
- [ ] Event modules receive events
- [ ] No compile errors

---

## 8. Best Practices

1. **Never modify Infrastructure for game-specific logic**
   - All game logic goes in Adapters
   - Infrastructure only knows about abstract contracts

2. **Use Adapters as Translation Layer**
   - Adapter translates game events → Infrastructure events
   - Adapter translates Infrastructure calls → game methods

3. **Keep Booster Logic in Adapter**
   - Don't put booster logic in PUController
   - PUController only delegates to adapter

4. **Generic Naming in Infrastructure**
   - PUType: Booster1, Booster2, Booster3
   - Display names from adapter

5. **Event Flow**
   ```
   Game Logic → Game Adapter → MIMGameController → GameEventBus → Modules
   ```

6. **Booster Flow**
   ```
   UIBoosterButton → PUController → BoosterAdapter → Game Logic
   ```

---

## 9. Troubleshooting

### Adapter Not Found
```
[MIMGameController] No booster adapter found for active game adapter.
```
**Fix:** Add adapter type check in `SetupBoosterAdapter()`.

### Boosters Not Working
```
[PUController] No booster adapter set. Cannot execute booster.
```
**Fix:** Ensure `SetupBoosterAdapter()` is called after game adapter setup.

### Events Not Received
**Check:**
- Is `GameEventBus.TriggerGameFinished()` being called?
- Is the connector subscribed to correct phase?
- Is `GameModeId` filter correct?

---

## 10. Quick Reference Commands

```bash
# Find all adapters
grep -r "GameAdapterBase\|BoosterAdapterBase" --include="*.cs"

# Find adapter registrations
grep -r "activeGameAdapter is\|SetupBoosterAdapter" --include="*.cs"

# Find PUType usages
grep -r "PUType\." --include="*.cs"
```
