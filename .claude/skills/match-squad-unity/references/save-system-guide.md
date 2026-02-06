# Save System Guide - Complete Reference

Comprehensive guide for implementing persistent data in Match Squad using the MIMCore Save System.

## System Overview

The Save System provides automatic persistence with JSON serialization, multi-platform support, and thread-safe saving. It's built on a container-based architecture where all save data implements `ISaveObject`.

### Core Components

```
SaveController (Static API)
    ↓ manages
GlobalSave (Container)
    ↓ contains
SavedDataContainer[] (Wrappers)
    ↓ wraps
ISaveObject (Your Data)
```

**Key Features:**
- ✅ Automatic serialization using Newtonsoft.Json
- ✅ Thread-safe background saving
- ✅ Auto-save with configurable intervals
- ✅ Multi-platform support (Desktop, Mobile, WebGL)
- ✅ Dictionary and complex type support
- ✅ Game time and session tracking
- ✅ Editor tools for save inspection and presets

## Quick Start

### 1. Create a Save Object

```csharp
using System;
using System.Collections.Generic;

namespace MIMUltility.YourFeature
{
    [System.Serializable]
    public class YourFeatureSave : ISaveObject
    {
        // Simple fields
        public int level = 1;
        public float progress = 0f;
        public bool isUnlocked = false;
        
        // Complex types (supported with Newtonsoft.Json)
        public List<string> unlockedItems = new List<string>();
        public Dictionary<string, int> itemCounts = new Dictionary<string, int>();
        
        // DateTime (use ToBinary/FromBinary for serialization)
        public long lastPlayTimeBinary;
        
        // Properties (auto-serialized)
        public DateTime LastPlayTime
        {
            get => lastPlayTimeBinary != 0 ? DateTime.FromBinary(lastPlayTimeBinary) : DateTime.MinValue;
            set => lastPlayTimeBinary = value.ToBinary();
        }
        
        // Required: Flush method
        public void Flush()
        {
            // Called before save is written to disk
            // Usually empty, but can be used for pre-save validation or cleanup
        }
        
        // Optional: Add helper methods for your feature
        public void IncrementLevel()
        {
            level++;
            SaveController.MarkAsSaveIsRequired();
        }
        
        public void UnlockItem(string itemId)
        {
            if (!unlockedItems.Contains(itemId))
            {
                unlockedItems.Add(itemId);
                SaveController.MarkAsSaveIsRequired();
            }
        }
    }
}
```

### 2. Access Save Data in Code

```csharp
using MIMUltility;

public class YourFeatureManager : MonoBehaviour
{
    private YourFeatureSave save;
    
    private void Start()
    {
        // Wait for save to load
        if (SaveController.IsSaveLoaded)
        {
            InitializeSave();
        }
        else
        {
            SaveController.OnSaveLoaded += InitializeSave;
        }
    }
    
    private void InitializeSave()
    {
        // Get or create save object
        save = SaveController.GetSaveObject<YourFeatureSave>();
        
        // Use the data
        Debug.Log($"Current level: {save.level}");
        Debug.Log($"Progress: {save.progress}%");
    }
    
    public void UpdateProgress(float newProgress)
    {
        save.progress = newProgress;
        
        // Mark that save is required
        SaveController.MarkAsSaveIsRequired();
        
        // Optional: Force immediate save
        // SaveController.Save(forceSave: true);
    }
    
    private void OnDestroy()
    {
        SaveController.OnSaveLoaded -= InitializeSave;
    }
}
```

## Core API Reference

### SaveController Static Methods

#### Initialization

```csharp
// Called by SaveInitModule - usually don't call manually
SaveController.Init(
    autoSaveDelay: 30f,      // Auto-save every 30 seconds (0 = disabled)
    clearSave: false,        // true = delete existing save
    overrideTime: -1f        // Override game time (-1 = use Time.time)
);
```

#### Getting Save Objects

```csharp
// Method 1: By Type (Recommended)
var levelSave = SaveController.GetSaveObject<LevelSave>();

// Method 2: By Type Hash (Advanced)
var levelSave = SaveController.GetSaveObject<LevelSave>(typeof(LevelSave).GetHashCode());

// Method 3: By Unique Name (Advanced - for multiple instances)
var levelSave = SaveController.GetSaveObject<LevelSave>("Level_1");
```

#### Saving

```csharp
// Mark data as dirty (will be saved on next auto-save or app pause)
SaveController.MarkAsSaveIsRequired();

// Force immediate save (blocks until complete)
SaveController.Save(forceSave: true, useThreads: false);

// Force immediate save (background thread - recommended)
SaveController.Save(forceSave: true, useThreads: true);
```

#### Utility Methods

```csharp
// Check if save system is ready
if (SaveController.IsSaveLoaded)
{
    // Safe to access save objects
}

// Get total game time (cumulative across sessions)
float totalGameTime = SaveController.GameTime;

// Get last exit time
DateTime lastExit = SaveController.LastExitTime;

// Subscribe to save loaded event
SaveController.OnSaveLoaded += OnSaveSystemReady;

// Delete all save data (careful!)
SaveController.DeleteSaveFile();
```

## Common Patterns

### PATTERN: Simple Value Storage

For storing simple values like settings or counters:

```csharp
[System.Serializable]
public class SettingsSave : ISaveObject
{
    public bool musicEnabled = true;
    public bool sfxEnabled = true;
    public float musicVolume = 1f;
    public float sfxVolume = 1f;
    
    public void Flush() { }
}

// Usage
public class AudioManager : MonoBehaviour
{
    private SettingsSave settings;
    
    private void Start()
    {
        settings = SaveController.GetSaveObject<SettingsSave>();
        ApplySettings();
    }
    
    public void SetMusicVolume(float volume)
    {
        settings.musicVolume = volume;
        SaveController.MarkAsSaveIsRequired();
        ApplySettings();
    }
    
    private void ApplySettings()
    {
        AudioListener.volume = settings.musicVolume;
        // ... apply other settings
    }
}
```

### PATTERN: Complex Data Storage with Collections

For features with lists, dictionaries, and complex relationships:

```csharp
[System.Serializable]
public class InventorySave : ISaveObject
{
    // Simple collections
    public List<string> ownedItems = new List<string>();
    public Dictionary<string, int> itemCounts = new Dictionary<string, int>();
    
    // Nested data structures
    [System.Serializable]
    public class ItemData
    {
        public string itemId;
        public int quantity;
        public long acquiredTimeBinary;
        public bool isNew;
    }
    
    public List<ItemData> detailedItems = new List<ItemData>();
    
    public void Flush()
    {
        // Optional: Cleanup before save
        detailedItems.RemoveAll(item => item.quantity <= 0);
    }
    
    // Helper methods
    public void AddItem(string itemId, int quantity = 1)
    {
        if (!ownedItems.Contains(itemId))
            ownedItems.Add(itemId);
            
        if (itemCounts.ContainsKey(itemId))
            itemCounts[itemId] += quantity;
        else
            itemCounts[itemId] = quantity;
            
        detailedItems.Add(new ItemData
        {
            itemId = itemId,
            quantity = quantity,
            acquiredTimeBinary = DateTime.Now.ToBinary(),
            isNew = true
        });
        
        SaveController.MarkAsSaveIsRequired();
    }
    
    public bool HasItem(string itemId)
    {
        return ownedItems.Contains(itemId);
    }
    
    public int GetItemCount(string itemId)
    {
        return itemCounts.ContainsKey(itemId) ? itemCounts[itemId] : 0;
    }
}
```

### PATTERN: Time-Based Save Data

For features that track time, sessions, and daily limits:

```csharp
[System.Serializable]
public class DailyRewardSave : ISaveObject
{
    // Store time as long (binary) for reliable serialization
    public long lastClaimTimeBinary;
    public int currentStreak = 0;
    public int totalRewardsClaimed = 0;
    
    // Properties for easy access
    public DateTime LastClaimTime
    {
        get => lastClaimTimeBinary != 0 ? DateTime.FromBinary(lastClaimTimeBinary) : DateTime.MinValue;
        set => lastClaimTimeBinary = value.ToBinary();
    }
    
    public void Flush() { }
    
    // Helper methods
    public bool CanClaimToday()
    {
        if (lastClaimTimeBinary == 0)
            return true;
            
        DateTime lastClaim = DateTime.FromBinary(lastClaimTimeBinary);
        DateTime today = DateTime.Now.Date;
        
        return lastClaim.Date < today;
    }
    
    public void ClaimReward()
    {
        DateTime now = DateTime.Now;
        DateTime lastClaim = LastClaimTime;
        
        // Check if streak should continue
        if ((now.Date - lastClaim.Date).Days == 1)
        {
            currentStreak++;
        }
        else if ((now.Date - lastClaim.Date).Days > 1)
        {
            currentStreak = 1; // Reset streak
        }
        
        LastClaimTime = now;
        totalRewardsClaimed++;
        
        SaveController.MarkAsSaveIsRequired();
    }
    
    public TimeSpan GetTimeUntilNextReward()
    {
        if (lastClaimTimeBinary == 0)
            return TimeSpan.Zero;
            
        DateTime nextRewardTime = LastClaimTime.Date.AddDays(1);
        return nextRewardTime - DateTime.Now;
    }
}
```

### PATTERN: Event-Based Save with State Machine

For features with multiple states and event tracking:

```csharp
public enum MatchRaceState
{
    NotStarted,
    InProgress,
    Completed,
    Expired
}

[System.Serializable]
public class MatchRaceSave : ISaveObject
{
    // State tracking
    public MatchRaceState currentRaceState = MatchRaceState.NotStarted;
    public long raceStartTimeBinary;
    public long raceEndTimeBinary;
    
    // Player progress
    public int playerLevelsCompleted = 0;
    public bool playerHasFinished = false;
    
    // Bot data (parallel arrays for simple serialization)
    public List<string> botIds = new List<string>();
    public List<string> botNames = new List<string>();
    public List<int> botLevelsCompleted = new List<int>();
    public List<bool> botHasFinished = new List<bool>();
    
    // Statistics
    public int totalRacesParticipated = 0;
    public int totalRacesWon = 0;
    
    public void Flush()
    {
        // Validate state before save
        if (currentRaceState == MatchRaceState.InProgress && !IsRaceStillValid())
        {
            currentRaceState = MatchRaceState.Expired;
        }
    }
    
    public bool IsRaceStillValid()
    {
        if (raceEndTimeBinary == 0)
            return false;
            
        DateTime endTime = DateTime.FromBinary(raceEndTimeBinary);
        return DateTime.Now < endTime;
    }
    
    public void StartNewRace(float durationSeconds)
    {
        currentRaceState = MatchRaceState.InProgress;
        playerLevelsCompleted = 0;
        playerHasFinished = false;
        
        DateTime now = DateTime.Now;
        raceStartTimeBinary = now.ToBinary();
        raceEndTimeBinary = now.AddSeconds(durationSeconds).ToBinary();
        
        totalRacesParticipated++;
        
        SaveController.MarkAsSaveIsRequired();
    }
    
    public void UpdateProgress(int levelsCompleted, bool hasFinished)
    {
        playerLevelsCompleted = levelsCompleted;
        playerHasFinished = hasFinished;
        
        SaveController.MarkAsSaveIsRequired();
    }
    
    public void CompleteRace(bool wonRace)
    {
        currentRaceState = MatchRaceState.Completed;
        
        if (wonRace)
            totalRacesWon++;
            
        SaveController.MarkAsSaveIsRequired();
    }
}
```

### PATTERN: Migration and Versioning

For handling save data version changes:

```csharp
[System.Serializable]
public class VersionedSave : ISaveObject
{
    // Version tracking
    public int saveVersion = 1;
    private const int CURRENT_VERSION = 2;
    
    // Old fields (deprecated in v2)
    public int oldField = 0;
    
    // New fields (added in v2)
    public string newField = "";
    public List<int> newList = new List<int>();
    
    public void Flush()
    {
        // Perform migration if needed
        if (saveVersion < CURRENT_VERSION)
        {
            MigrateToCurrentVersion();
        }
    }
    
    private void MigrateToCurrentVersion()
    {
        switch (saveVersion)
        {
            case 1:
                // Migrate from v1 to v2
                newField = oldField.ToString();
                newList = new List<int> { oldField };
                saveVersion = 2;
                Debug.Log("[Save Migration] Migrated from v1 to v2");
                break;
        }
        
        SaveController.MarkAsSaveIsRequired();
    }
}
```

### PATTERN: Feature Unlock System

For progressive feature unlocking based on progression:

```csharp
[System.Serializable]
public class FeatureUnlockSave : ISaveObject
{
    [System.Serializable]
    public class FeatureUnlock
    {
        public string featureId;
        public bool isUnlocked;
        public int unlockLevel;
        public long unlockedAtTimeBinary;
        public bool hasSeenIntroduction;
    }
    
    public List<FeatureUnlock> features = new List<FeatureUnlock>();
    
    public void Flush() { }
    
    public void InitializeFeatures()
    {
        // Add features if not already present
        AddFeatureIfMissing("daily_reward", unlockLevel: 1);
        AddFeatureIfMissing("power_ups", unlockLevel: 3);
        AddFeatureIfMissing("match_race", unlockLevel: 5);
        AddFeatureIfMissing("challenge_mode", unlockLevel: 10);
    }
    
    private void AddFeatureIfMissing(string featureId, int unlockLevel)
    {
        if (features.Find(f => f.featureId == featureId) == null)
        {
            features.Add(new FeatureUnlock
            {
                featureId = featureId,
                isUnlocked = false,
                unlockLevel = unlockLevel,
                hasSeenIntroduction = false
            });
        }
    }
    
    public bool IsFeatureUnlocked(string featureId)
    {
        var feature = features.Find(f => f.featureId == featureId);
        return feature != null && feature.isUnlocked;
    }
    
    public void UnlockFeature(string featureId)
    {
        var feature = features.Find(f => f.featureId == featureId);
        if (feature != null && !feature.isUnlocked)
        {
            feature.isUnlocked = true;
            feature.unlockedAtTimeBinary = DateTime.Now.ToBinary();
            SaveController.MarkAsSaveIsRequired();
        }
    }
    
    public bool HasSeenIntroduction(string featureId)
    {
        var feature = features.Find(f => f.featureId == featureId);
        return feature != null && feature.hasSeenIntroduction;
    }
    
    public void MarkIntroductionSeen(string featureId)
    {
        var feature = features.Find(f => f.featureId == featureId);
        if (feature != null)
        {
            feature.hasSeenIntroduction = true;
            SaveController.MarkAsSaveIsRequired();
        }
    }
    
    public List<FeatureUnlock> GetFeaturesToUnlock(int currentLevel)
    {
        return features.FindAll(f => !f.isUnlocked && f.unlockLevel <= currentLevel);
    }
}
```

## ⚠️ Critical Best Practices

### ✅ DO:

```csharp
// ✅ Mark save as required after data changes
playerSave.score += 100;
SaveController.MarkAsSaveIsRequired();

// ✅ Use DateTime.ToBinary() for time storage
save.lastPlayTimeBinary = DateTime.Now.ToBinary();

// ✅ Wait for save to load before accessing data
if (SaveController.IsSaveLoaded)
{
    var save = SaveController.GetSaveObject<YourSave>();
}

// ✅ Use [System.Serializable] attribute on save classes
[System.Serializable]
public class YourSave : ISaveObject { }

// ✅ Use properties for computed values
public DateTime LastPlayTime
{
    get => DateTime.FromBinary(lastPlayTimeBinary);
    set => lastPlayTimeBinary = value.ToBinary();
}

// ✅ Implement Flush() for pre-save cleanup
public void Flush()
{
    // Remove invalid entries
    items.RemoveAll(item => item == null);
}

// ✅ Use GetSaveObject<T>() by type (most common)
var save = SaveController.GetSaveObject<LevelSave>();
```

### ❌ DON'T:

```csharp
// ❌ Don't forget to mark save as required
playerSave.score += 100;
// Missing: SaveController.MarkAsSaveIsRequired();

// ❌ Don't store DateTime directly
public DateTime lastPlayTime; // Won't serialize correctly
// Use: public long lastPlayTimeBinary;

// ❌ Don't access save objects before system is loaded
var save = SaveController.GetSaveObject<YourSave>(); // May return null!
// Check: if (SaveController.IsSaveLoaded)

// ❌ Don't use non-serializable types
public UnityEngine.GameObject prefab; // Won't serialize!
// Use: public string prefabPath; (reference by path)

// ❌ Don't store references to Unity objects
public Transform target; // Won't serialize!
// Use: public Vector3 targetPosition; (store data, not reference)

// ❌ Don't call Save() in Update() or tight loops
void Update()
{
    SaveController.Save(); // VERY BAD! Causes lag
}
// Use: SaveController.MarkAsSaveIsRequired(); (auto-saves periodically)

// ❌ Don't create multiple instances with same type
var save1 = SaveController.GetSaveObject<LevelSave>();
var save2 = SaveController.GetSaveObject<LevelSave>(); // Same instance!
// If you need multiple instances, use unique names
```

## Advanced Features

### Thread-Safe Background Saving

The system automatically saves on background threads when possible:

```csharp
// Force save with threading (non-blocking - recommended)
SaveController.Save(forceSave: true, useThreads: true);

// Force save without threading (blocking - for critical moments)
SaveController.Save(forceSave: true, useThreads: false);
```

**Automatic Background Saving:**
- Desktop/Mobile: Uses background threads automatically
- WebGL: Uses main thread (browser limitations)
- Editor: Forces immediate save on domain reload

### Save Presets (Editor Only)

Create preset save states for testing:

```csharp
// In Editor only - accessed via Tools menu
// Tools → Save System → Manage Presets

// Create preset from current save
SaveController.PresetsSave("test_save_level_10");

// Load preset for testing
// Use SavePresetsWindow to manage presets visually
```

### Custom Save Locations (Advanced)

For multiple save slots or cloud saves:

```csharp
// Save to custom file
SaveController.SaveCustom(customGlobalSave);

// Get save data without loading into active session
GlobalSave tempSave = SaveController.GetGlobalSave();

// Delete specific save file
SaveController.DeleteSaveFile();
```

### Platform-Specific Saving

The system automatically uses the correct wrapper:

```csharp
// Editor/Desktop: DefaultSaveWrapper (PlayerPrefs + File)
// WebGL: WebGLSaveWrapper (Browser localStorage via jslib)
// Platform is detected automatically via BaseSaveWrapper.ActiveWrapper
```

**WebGL Configuration:**
```csharp
// In SaveInitModule component
webGLPrefix = "myGame"; // Prefix for localStorage keys

// Results in keys like: myGame_save
```

## Debugging Save System

### Check Save Status

```csharp
// Is save system initialized?
if (!SaveController.IsSaveLoaded)
{
    Debug.LogWarning("Save system not ready!");
    return;
}

// Get game time statistics
float totalTime = SaveController.GameTime;
DateTime lastExit = SaveController.LastExitTime;

Debug.Log($"Total play time: {totalTime} seconds");
Debug.Log($"Last exit: {lastExit}");
```

### Inspect Save Data

```csharp
// Print all save objects (Editor only)
SaveController.Info();

// Access specific save data
var levelSave = SaveController.GetSaveObject<LevelSave>();
Debug.Log($"Level: {levelSave.DisplayLevelNumber}");
Debug.Log($"Progress: {levelSave.RealLevelNumber}");
```

### Force Save for Testing

```csharp
// Force immediate save (useful before testing crashes)
SaveController.Save(forceSave: true, useThreads: false);

// Clear save data (for fresh testing)
SaveController.DeleteSaveFile();
// Or in SaveInitModule: cleanSaveStart = true;
```

### Common Issues & Solutions

**Issue: Save data not persisting**
```csharp
// Solution: Call MarkAsSaveIsRequired after changes
save.score = 100;
SaveController.MarkAsSaveIsRequired(); // ← DON'T FORGET!
```

**Issue: DateTime not saving correctly**
```csharp
// ❌ Wrong
public DateTime lastPlayTime;

// ✅ Correct
public long lastPlayTimeBinary;
public DateTime LastPlayTime
{
    get => DateTime.FromBinary(lastPlayTimeBinary);
    set => lastPlayTimeBinary = value.ToBinary();
}
```

**Issue: Dictionary/List not serializing**
```csharp
// Make sure using Newtonsoft.Json serialization
// System uses it automatically, but check SavedDataContainer.cs
// Supported: Dictionary, List, custom classes with [Serializable]
```

**Issue: Save object returns null/default values**
```csharp
// Check if save system is loaded
if (!SaveController.IsSaveLoaded)
{
    SaveController.OnSaveLoaded += InitializeSave;
    return;
}

// Always initialize with GetSaveObject
save = SaveController.GetSaveObject<YourSave>();
```

## Integration with Match Squad Features

### Example: Level Progression Save

```csharp
// From LevelSave.cs (existing in project)
[System.Serializable]
public class LevelSave : ISaveObject
{
    public int RealLevelNumber = 0;
    public int DisplayLevelNumber = 0;
    public bool ReplayingLevelAgain = false;
    
    public Dictionary<LevelData, bool> LevelHasShownTutorial = new();
    public List<int> RecentlyPlayedLevels = new List<int>();
    
    public bool HasShownDailyRewardIntroduction = false;
    public bool HasShownMatchRaceIntroduction = false;
    public bool HasShownChallengeModeIntroduction = false;
    
    public void Flush() { }
    
    public void SetIsShownTutorial(LevelData levelData, bool val)
    {
        LevelHasShownTutorial[levelData] = val;
    }
}

// Usage in LevelController
public class MIMLevelController : MonoBehaviour
{
    private LevelSave levelSave;
    
    private void Initialize()
    {
        levelSave = SaveController.GetSaveObject<LevelSave>();
        
        // Use save data
        currentLevel = levelSave.DisplayLevelNumber;
    }
    
    private void CompleteLevel()
    {
        levelSave.DisplayLevelNumber++;
        levelSave.RealLevelNumber++;
        
        SaveController.MarkAsSaveIsRequired();
    }
}
```

### Example: Power-Up Save

```csharp
// From PUSave.cs (existing in project)
public class PUSave : ISaveObject
{
    public int Amount = -1;
    public bool IsUnlocked = false;
    
    public void Flush() { }
}

// Usage in PowerUpManager
public class PowerUpManager : MonoBehaviour
{
    private Dictionary<string, PUSave> powerUpSaves = new Dictionary<string, PUSave>();
    
    private void InitializePowerUps()
    {
        // Each power-up has its own save instance
        powerUpSaves["hint"] = SaveController.GetSaveObject<PUSave>("PowerUp_Hint");
        powerUpSaves["shuffle"] = SaveController.GetSaveObject<PUSave>("PowerUp_Shuffle");
        powerUpSaves["timer"] = SaveController.GetSaveObject<PUSave>("PowerUp_Timer");
    }
    
    public void UsePowerUp(string powerUpId)
    {
        if (powerUpSaves.TryGetValue(powerUpId, out var save))
        {
            if (save.Amount > 0)
            {
                save.Amount--;
                SaveController.MarkAsSaveIsRequired();
            }
        }
    }
    
    public void AddPowerUp(string powerUpId, int amount)
    {
        if (powerUpSaves.TryGetValue(powerUpId, out var save))
        {
            save.Amount += amount;
            SaveController.MarkAsSaveIsRequired();
        }
    }
}
```

## Editor Tools

### Save Object Registry

**Location:** `Assets/MIMCore/Scripts/Services/Save/Editor/SaveObjectRegistry.cs`

Tracks all ISaveObject types in the project for debugging and validation.

**Access:** Window → Save System → Registry (auto-generated)

### Save Presets Window

**Location:** `Assets/MIMCore/Scripts/Services/Save/Scripts/Save Presets/SavePresetsWindow.cs`

Create and manage preset save states for testing.

**Access:** Tools → Save System → Manage Presets

### Save Actions Menu

**Location:** `Assets/MIMCore/Scripts/Services/Save/Scripts/Editor/SaveActionsMenu.cs`

Quick actions for save management.

**Access:** Tools → Save System → [Action]

Available actions:
- Clear Save Data
- Force Save Now
- Print Save Info
- Open Save File Location

## Performance Considerations

### Auto-Save Configuration

```csharp
// In SaveInitModule component
autoSaveDelay = 30f; // Save every 30 seconds (recommended: 30-60)

// Disable auto-save (manual save only)
autoSaveDelay = 0f;
```

**Recommendations:**
- **Mobile:** 30-60 seconds (balance between safety and battery)
- **Desktop:** 15-30 seconds (faster saves acceptable)
- **WebGL:** 30-60 seconds (localStorage writes can be expensive)

### Manual Save Timing

```csharp
// ✅ GOOD: Save at natural breakpoints
void OnLevelComplete()
{
    UpdateLevelProgress();
    SaveController.MarkAsSaveIsRequired();
    SaveController.Save(forceSave: true); // Good time for immediate save
}

// ❌ BAD: Excessive saving
void Update()
{
    if (scoreChanged)
    {
        SaveController.Save(); // TOO FREQUENT!
    }
}

// ✅ GOOD: Batch updates, save once
void UpdateMultipleStats()
{
    save.score += 100;
    save.level++;
    save.experience += 50;
    SaveController.MarkAsSaveIsRequired(); // Marked once, saved on next auto-save
}
```

### Memory Management

```csharp
// Flush() is called before save - use it for cleanup
public void Flush()
{
    // Remove temporary data
    tempData.Clear();
    
    // Compact lists
    recentItems.RemoveAll(item => IsExpired(item));
    
    // Validate data integrity
    score = Mathf.Max(0, score);
}
```

## Testing Checklist

When implementing a new save feature:

- [ ] Save object inherits from ISaveObject
- [ ] Save object has [System.Serializable] attribute
- [ ] All fields use serializable types (no Unity objects)
- [ ] DateTime stored as long using ToBinary()
- [ ] Flush() method implemented (even if empty)
- [ ] MarkAsSaveIsRequired() called after data changes
- [ ] Wait for SaveController.IsSaveLoaded before accessing data
- [ ] Tested with SaveInitModule cleanSaveStart = true
- [ ] Tested auto-save functionality
- [ ] Tested app pause/resume (mobile)
- [ ] Tested browser refresh (WebGL)
- [ ] Verified data persists across sessions

## External Resources

- **Newtonsoft.Json Docs:** https://www.newtonsoft.com/json/help/html/Introduction.htm
- **Unity Serialization:** https://docs.unity3d.com/Manual/script-Serialization.html
- **PlayerPrefs:** https://docs.unity3d.com/ScriptReference/PlayerPrefs.html
- **WebGL localStorage:** https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage

## Quick Reference Card

```csharp
// Create save object
[System.Serializable]
public class MySave : ISaveObject
{
    public int value;
    public void Flush() { }
}

// Get save object
var save = SaveController.GetSaveObject<MySave>();

// Update and mark dirty
save.value = 100;
SaveController.MarkAsSaveIsRequired();

// Force save
SaveController.Save(forceSave: true);

// Check if loaded
if (SaveController.IsSaveLoaded) { }

// Wait for load
SaveController.OnSaveLoaded += OnSaveReady;

// Store DateTime
public long timeBinary;
public DateTime Time
{
    get => DateTime.FromBinary(timeBinary);
    set => timeBinary = value.ToBinary();
}
```

