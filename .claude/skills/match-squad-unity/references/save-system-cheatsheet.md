# Save System Cheat Sheet

Quick reference for common Save System tasks. For detailed guide, see [save-system-guide.md](./save-system-guide.md).

## 🚀 Quick Start (30 seconds)

### 1. Create Save Object

```csharp
using MIMUltility;

[System.Serializable]
public class MySave : ISaveObject
{
    public int score = 0;
    public bool isUnlocked = false;
    
    public void Flush() { }
}
```

### 2. Use in Code

```csharp
// Get save object
var save = SaveController.GetSaveObject<MySave>();

// Update data
save.score += 100;

// Mark for saving
SaveController.MarkAsSaveIsRequired();
```

## 📋 Common Operations

### Get Save Object

```csharp
// By type (most common)
var save = SaveController.GetSaveObject<LevelSave>();

// By unique name (multiple instances)
var save1 = SaveController.GetSaveObject<PlayerSave>("Player1");
var save2 = SaveController.GetSaveObject<PlayerSave>("Player2");
```

### Update and Save

```csharp
// Update data
save.level = 10;
save.score += 500;

// Mark as dirty (required!)
SaveController.MarkAsSaveIsRequired();

// Auto-save will handle persistence
// Or force immediate save:
SaveController.Save(forceSave: true);
```

### Check Save Status

```csharp
// Is save loaded?
if (SaveController.IsSaveLoaded)
{
    var save = SaveController.GetSaveObject<MySave>();
}
else
{
    SaveController.OnSaveLoaded += InitializeSave;
}

// Get game time
float totalTime = SaveController.GameTime;
DateTime lastExit = SaveController.LastExitTime;
```

## 📊 Data Types

### Simple Types

```csharp
public int level = 1;
public float progress = 0f;
public bool isUnlocked = false;
public string playerName = "";
```

### Collections

```csharp
public List<string> items = new List<string>();
public Dictionary<string, int> counts = new Dictionary<string, int>();
```

### DateTime (Use Binary!)

```csharp
// ❌ WRONG - Won't serialize
public DateTime lastPlayTime;

// ✅ CORRECT - Use binary
public long lastPlayTimeBinary;

public DateTime LastPlayTime
{
    get => lastPlayTimeBinary != 0 
        ? DateTime.FromBinary(lastPlayTimeBinary) 
        : DateTime.MinValue;
    set => lastPlayTimeBinary = value.ToBinary();
}

// Usage
save.LastPlayTime = DateTime.Now;
```

### Nested Objects

```csharp
[System.Serializable]
public class ItemData
{
    public string id;
    public int quantity;
    public long acquiredTimeBinary;
}

public List<ItemData> items = new List<ItemData>();
```

## ⚙️ Helper Methods Pattern

```csharp
[System.Serializable]
public class MySave : ISaveObject
{
    public int coins = 0;
    public List<string> items = new List<string>();
    
    public void Flush() { }
    
    // Helper: Add coins
    public void AddCoins(int amount)
    {
        coins += amount;
        SaveController.MarkAsSaveIsRequired();
    }
    
    // Helper: Add item
    public void AddItem(string itemId)
    {
        if (!items.Contains(itemId))
        {
            items.Add(itemId);
            SaveController.MarkAsSaveIsRequired();
        }
    }
    
    // Helper: Check ownership
    public bool HasItem(string itemId)
    {
        return items.Contains(itemId);
    }
}
```

## ⏰ Time-Based Patterns

### Daily Limits

```csharp
public long lastClaimTimeBinary;

public bool CanClaimToday()
{
    if (lastClaimTimeBinary == 0)
        return true;
        
    DateTime lastClaim = DateTime.FromBinary(lastClaimTimeBinary);
    return lastClaim.Date < DateTime.Now.Date;
}

public void Claim()
{
    lastClaimTimeBinary = DateTime.Now.ToBinary();
    SaveController.MarkAsSaveIsRequired();
}
```

### Countdown Timer

```csharp
public long endTimeBinary;

public bool IsActive()
{
    if (endTimeBinary == 0)
        return false;
        
    return DateTime.Now < DateTime.FromBinary(endTimeBinary);
}

public float GetRemainingSeconds()
{
    if (endTimeBinary == 0)
        return 0f;
        
    TimeSpan remaining = DateTime.FromBinary(endTimeBinary) - DateTime.Now;
    return (float)remaining.TotalSeconds;
}

public void StartTimer(float durationSeconds)
{
    endTimeBinary = DateTime.Now.AddSeconds(durationSeconds).ToBinary();
    SaveController.MarkAsSaveIsRequired();
}
```

## 🎯 Manager Pattern

```csharp
public class MyFeatureManager : MonoBehaviour
{
    private MyFeatureSave save;
    
    private void Start()
    {
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
        save = SaveController.GetSaveObject<MyFeatureSave>();
        // Use loaded data
    }
    
    private void OnDestroy()
    {
        SaveController.OnSaveLoaded -= InitializeSave;
    }
}
```

## ✅ Do's and Don'ts

### ✅ DO

```csharp
// ✅ Mark save as required
save.score = 100;
SaveController.MarkAsSaveIsRequired();

// ✅ Use [System.Serializable]
[System.Serializable]
public class MySave : ISaveObject { }

// ✅ Use DateTime.ToBinary()
save.lastPlayTimeBinary = DateTime.Now.ToBinary();

// ✅ Wait for save to load
if (SaveController.IsSaveLoaded)
{
    var save = SaveController.GetSaveObject<MySave>();
}

// ✅ Implement Flush()
public void Flush()
{
    items.RemoveAll(i => i == null);
}
```

### ❌ DON'T

```csharp
// ❌ Forget to mark save
save.score = 100;
// Missing: SaveController.MarkAsSaveIsRequired();

// ❌ Store DateTime directly
public DateTime lastPlayTime; // Won't work!

// ❌ Access before loaded
var save = SaveController.GetSaveObject<MySave>(); // May be null!

// ❌ Store Unity objects
public GameObject prefab; // Won't serialize!

// ❌ Save in Update loop
void Update()
{
    SaveController.Save(); // VERY BAD!
}
```

## 🐛 Debugging

### Print Save Status

```csharp
Debug.Log($"Save Loaded: {SaveController.IsSaveLoaded}");
Debug.Log($"Game Time: {SaveController.GameTime}");
Debug.Log($"Last Exit: {SaveController.LastExitTime}");
```

### Force Save

```csharp
// Force immediate save (for testing)
SaveController.Save(forceSave: true, useThreads: false);
```

### Clear Save

```csharp
// Delete all save data
SaveController.DeleteSaveFile();

// Or in SaveInitModule component:
// cleanSaveStart = true;
```

### Inspect Save Data

```csharp
// Print all save objects (Editor only)
SaveController.Info();

// Access specific data
var save = SaveController.GetSaveObject<MySave>();
Debug.Log($"Score: {save.score}");
```

## 📝 Common Patterns

### Simple Settings

```csharp
[System.Serializable]
public class SettingsSave : ISaveObject
{
    public bool musicOn = true;
    public bool sfxOn = true;
    public float volume = 1f;
    
    public void Flush() { }
}
```

### Progression System

```csharp
[System.Serializable]
public class ProgressSave : ISaveObject
{
    public int level = 1;
    public int experience = 0;
    public List<string> unlockedLevels = new List<string>();
    
    public void Flush() { }
    
    public void CompleteLevel(string levelId)
    {
        if (!unlockedLevels.Contains(levelId))
        {
            unlockedLevels.Add(levelId);
            level++;
            SaveController.MarkAsSaveIsRequired();
        }
    }
}
```

### Currency System

```csharp
[System.Serializable]
public class CurrencySave : ISaveObject
{
    public int coins = 0;
    public int gems = 0;
    
    public void Flush() { }
    
    public void AddCoins(int amount)
    {
        coins = Mathf.Max(0, coins + amount);
        SaveController.MarkAsSaveIsRequired();
    }
    
    public bool SpendCoins(int amount)
    {
        if (coins >= amount)
        {
            coins -= amount;
            SaveController.MarkAsSaveIsRequired();
            return true;
        }
        return false;
    }
}
```

### Feature Unlock

```csharp
[System.Serializable]
public class UnlockSave : ISaveObject
{
    public Dictionary<string, bool> features = new Dictionary<string, bool>();
    public Dictionary<string, bool> tutorials = new Dictionary<string, bool>();
    
    public void Flush() { }
    
    public void UnlockFeature(string featureId)
    {
        features[featureId] = true;
        SaveController.MarkAsSaveIsRequired();
    }
    
    public bool IsUnlocked(string featureId)
    {
        return features.ContainsKey(featureId) && features[featureId];
    }
    
    public void MarkTutorialSeen(string tutorialId)
    {
        tutorials[tutorialId] = true;
        SaveController.MarkAsSaveIsRequired();
    }
}
```

## 🔧 Configuration

### Auto-Save Setup

In `SaveInitModule` component:

```csharp
autoSaveDelay = 30f; // Save every 30 seconds
cleanSaveStart = false; // true = clear save on start
```

**Recommended intervals:**
- Mobile: 30-60 seconds
- Desktop: 15-30 seconds
- WebGL: 30-60 seconds

### Manual Save Timing

```csharp
// Good: Save at natural breakpoints
void OnLevelComplete()
{
    UpdateProgress();
    SaveController.Save(forceSave: true);
}

// Good: Save before critical actions
void OnPurchase()
{
    ProcessPurchase();
    SaveController.Save(forceSave: true);
}

// Good: Save on app pause (automatic)
// Handled by SaveController.UnityCallbackReciever
```

## 📚 Full Documentation

For detailed information, see:
- **[save-system-guide.md](./save-system-guide.md)** - Complete guide with all patterns
- **[SaveObjectTemplate.cs](../assets/templates/SaveObjectTemplate.cs)** - Full template with comments

## 🎯 Quick Checklist

When implementing save data:

- [ ] Class has `[System.Serializable]` attribute
- [ ] Class implements `ISaveObject`
- [ ] `Flush()` method implemented
- [ ] DateTime stored as `long` with `ToBinary()`
- [ ] `MarkAsSaveIsRequired()` called after changes
- [ ] Wait for `SaveController.IsSaveLoaded` before access
- [ ] No Unity object references (GameObject, Transform, etc.)
- [ ] Tested with clean save (`cleanSaveStart = true`)
- [ ] Verified persistence across sessions

## 🚨 Common Errors

### "Save controller has not been initialized"

**Problem:** Accessing save before system is loaded

**Solution:**
```csharp
if (SaveController.IsSaveLoaded)
{
    var save = SaveController.GetSaveObject<MySave>();
}
else
{
    SaveController.OnSaveLoaded += InitializeSave;
}
```

### Data not persisting

**Problem:** Forgot to mark save as required

**Solution:**
```csharp
save.score = 100;
SaveController.MarkAsSaveIsRequired(); // ← Don't forget!
```

### DateTime not saving

**Problem:** Using DateTime directly instead of binary

**Solution:**
```csharp
// Store as long
public long timeBinary;

// Access via property
public DateTime Time
{
    get => DateTime.FromBinary(timeBinary);
    set => timeBinary = value.ToBinary();
}
```

### Dictionary/List not serializing

**Problem:** System uses Newtonsoft.Json, should work automatically

**Solution:** Ensure `[System.Serializable]` on class and check SavedDataContainer settings

---

**Quick Access:** For copy-paste templates, see [SaveObjectTemplate.cs](../assets/templates/SaveObjectTemplate.cs)

