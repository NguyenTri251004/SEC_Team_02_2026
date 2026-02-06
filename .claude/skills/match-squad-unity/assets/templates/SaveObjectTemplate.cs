using System;
using System.Collections.Generic;

namespace MIMUltility.YourFeature
{
    /// <summary>
    /// Save data for [Your Feature Name]
    /// Stores persistent data like [describe what this saves]
    /// </summary>
    [System.Serializable]
    public class YourFeatureSave : ISaveObject
    {
        // ============================================
        // SIMPLE FIELDS
        // ============================================
        
        /// <summary>Current level or progress indicator</summary>
        public int level = 1;
        
        /// <summary>Completion progress (0.0 to 1.0)</summary>
        public float progress = 0f;
        
        /// <summary>Feature unlock status</summary>
        public bool isUnlocked = false;
        
        /// <summary>Total score or currency</summary>
        public int totalScore = 0;
        
        // ============================================
        // COLLECTIONS
        // ============================================
        
        /// <summary>List of unlocked items</summary>
        public List<string> unlockedItems = new List<string>();
        
        /// <summary>Dictionary mapping items to their quantities</summary>
        public Dictionary<string, int> itemQuantities = new Dictionary<string, int>();
        
        // ============================================
        // TIME TRACKING (Use Binary for DateTime)
        // ============================================
        
        /// <summary>Last time this feature was used (stored as binary)</summary>
        public long lastUsedTimeBinary;
        
        /// <summary>Property wrapper for LastUsedTime with automatic conversion</summary>
        public DateTime LastUsedTime
        {
            get => lastUsedTimeBinary != 0 ? DateTime.FromBinary(lastUsedTimeBinary) : DateTime.MinValue;
            set => lastUsedTimeBinary = value.ToBinary();
        }
        
        // ============================================
        // NESTED DATA STRUCTURES
        // ============================================
        
        /// <summary>
        /// Complex nested data structure example
        /// Use [System.Serializable] for nested classes
        /// </summary>
        [System.Serializable]
        public class ItemData
        {
            public string itemId;
            public int quantity;
            public long acquiredTimeBinary;
            public bool isNew;
            
            // Properties for nested classes also work
            public DateTime AcquiredTime
            {
                get => acquiredTimeBinary != 0 ? DateTime.FromBinary(acquiredTimeBinary) : DateTime.MinValue;
                set => acquiredTimeBinary = value.ToBinary();
            }
        }
        
        /// <summary>Detailed item tracking</summary>
        public List<ItemData> detailedItems = new List<ItemData>();
        
        // ============================================
        // STATISTICS TRACKING
        // ============================================
        
        /// <summary>Total times this feature was used</summary>
        public int totalUsageCount = 0;
        
        /// <summary>Track if user has seen introduction/tutorial</summary>
        public bool hasSeenIntroduction = false;
        
        // ============================================
        // REQUIRED: FLUSH METHOD
        // ============================================
        
        /// <summary>
        /// Called before save is written to disk
        /// Use this for cleanup, validation, or data compaction
        /// </summary>
        public void Flush()
        {
            // Example: Remove items with zero quantity
            detailedItems.RemoveAll(item => item.quantity <= 0);
            
            // Example: Validate data integrity
            level = Mathf.Max(1, level);
            progress = Mathf.Clamp01(progress);
            
            // Example: Clean up old data
            // RemoveExpiredData();
        }
        
        // ============================================
        // HELPER METHODS (OPTIONAL BUT RECOMMENDED)
        // ============================================
        
        /// <summary>
        /// Increment level and mark save as required
        /// </summary>
        public void IncrementLevel()
        {
            level++;
            SaveController.MarkAsSaveIsRequired();
        }
        
        /// <summary>
        /// Unlock an item if not already unlocked
        /// </summary>
        public void UnlockItem(string itemId)
        {
            if (!unlockedItems.Contains(itemId))
            {
                unlockedItems.Add(itemId);
                SaveController.MarkAsSaveIsRequired();
            }
        }
        
        /// <summary>
        /// Add item with quantity tracking
        /// </summary>
        public void AddItem(string itemId, int quantity = 1)
        {
            // Update simple tracking
            if (!unlockedItems.Contains(itemId))
            {
                unlockedItems.Add(itemId);
            }
            
            // Update quantity dictionary
            if (itemQuantities.ContainsKey(itemId))
            {
                itemQuantities[itemId] += quantity;
            }
            else
            {
                itemQuantities[itemId] = quantity;
            }
            
            // Update detailed tracking
            detailedItems.Add(new ItemData
            {
                itemId = itemId,
                quantity = quantity,
                acquiredTimeBinary = DateTime.Now.ToBinary(),
                isNew = true
            });
            
            SaveController.MarkAsSaveIsRequired();
        }
        
        /// <summary>
        /// Check if item is unlocked
        /// </summary>
        public bool HasItem(string itemId)
        {
            return unlockedItems.Contains(itemId);
        }
        
        /// <summary>
        /// Get quantity of specific item
        /// </summary>
        public int GetItemQuantity(string itemId)
        {
            return itemQuantities.ContainsKey(itemId) ? itemQuantities[itemId] : 0;
        }
        
        /// <summary>
        /// Check if can perform daily action
        /// </summary>
        public bool CanPerformDailyAction()
        {
            if (lastUsedTimeBinary == 0)
                return true;
                
            DateTime lastUsed = DateTime.FromBinary(lastUsedTimeBinary);
            DateTime today = DateTime.Now.Date;
            
            return lastUsed.Date < today;
        }
        
        /// <summary>
        /// Record usage and update timestamp
        /// </summary>
        public void RecordUsage()
        {
            totalUsageCount++;
            LastUsedTime = DateTime.Now;
            SaveController.MarkAsSaveIsRequired();
        }
        
        /// <summary>
        /// Get time remaining until next daily reset
        /// </summary>
        public TimeSpan GetTimeUntilDailyReset()
        {
            if (lastUsedTimeBinary == 0)
                return TimeSpan.Zero;
                
            DateTime nextResetTime = LastUsedTime.Date.AddDays(1);
            return nextResetTime - DateTime.Now;
        }
    }
}

// ============================================
// USAGE EXAMPLE IN YOUR MANAGER CLASS
// ============================================

/*
using MIMUltility;
using UnityEngine;

namespace YourFeature
{
    public class YourFeatureManager : MonoBehaviour
    {
        // Reference to save data
        private YourFeatureSave save;
        
        // ============================================
        // INITIALIZATION
        // ============================================
        
        private void Start()
        {
            // Wait for save system to load
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
            
            // Use the loaded data
            Debug.Log($"Feature Level: {save.level}");
            Debug.Log($"Progress: {save.progress * 100}%");
            Debug.Log($"Is Unlocked: {save.isUnlocked}");
            
            // Check if daily action is available
            if (save.CanPerformDailyAction())
            {
                Debug.Log("Daily action available!");
            }
        }
        
        // ============================================
        // USING SAVE DATA
        // ============================================
        
        public void UpdateProgress(float newProgress)
        {
            save.progress = newProgress;
            
            // Always mark save as required after changes
            SaveController.MarkAsSaveIsRequired();
            
            // Auto-save will handle persistence
            // Or force immediate save if critical:
            // SaveController.Save(forceSave: true);
        }
        
        public void CompleteLevel()
        {
            // Use helper method (includes MarkAsSaveIsRequired)
            save.IncrementLevel();
            
            // Or do it manually
            save.totalScore += 1000;
            SaveController.MarkAsSaveIsRequired();
        }
        
        public void UnlockNewItem(string itemId)
        {
            // Use helper method
            save.UnlockItem(itemId);
            
            // Or add with quantity
            save.AddItem(itemId, quantity: 5);
        }
        
        public void PerformDailyAction()
        {
            if (!save.CanPerformDailyAction())
            {
                Debug.LogWarning("Daily action already performed today!");
                return;
            }
            
            // Do your daily action
            // ...
            
            // Record usage
            save.RecordUsage();
        }
        
        // ============================================
        // CLEANUP
        // ============================================
        
        private void OnDestroy()
        {
            // Unsubscribe from events
            SaveController.OnSaveLoaded -= InitializeSave;
        }
    }
}
*/

// ============================================
// MULTIPLE INSTANCES (ADVANCED)
// ============================================

/*
// If you need multiple save instances of the same type:

// Use unique names for each instance
var player1Save = SaveController.GetSaveObject<YourFeatureSave>("Player1");
var player2Save = SaveController.GetSaveObject<YourFeatureSave>("Player2");

// Each instance is saved and loaded independently
player1Save.level = 5;
player2Save.level = 10;

SaveController.MarkAsSaveIsRequired();
*/

// ============================================
// VERSION MIGRATION (ADVANCED)
// ============================================

/*
[System.Serializable]
public class VersionedSave : ISaveObject
{
    public int saveVersion = 1;
    private const int CURRENT_VERSION = 2;
    
    // Old fields (deprecated)
    public int oldField = 0;
    
    // New fields
    public string newField = "";
    
    public void Flush()
    {
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
                saveVersion = 2;
                Debug.Log("Migrated save from v1 to v2");
                break;
        }
        
        SaveController.MarkAsSaveIsRequired();
    }
}
*/

// ============================================
// CHECKLIST BEFORE USING
// ============================================

/*
□ Replace "YourFeature" with your actual feature name
□ Replace "YourFeatureSave" with your actual save class name
□ Add/remove fields based on your needs
□ Update helper methods to match your feature logic
□ Test with SaveInitModule cleanSaveStart = true
□ Verify data persists across sessions
□ Check that MarkAsSaveIsRequired is called after changes
□ Implement proper Flush() cleanup if needed
*/

