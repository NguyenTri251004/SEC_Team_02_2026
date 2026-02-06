# Addressables Remote Level System - Quick Reference

## 🎯 Quick Summary

**Goal**: Migrate from Resources.Load to Addressables
- **100 levels in APK** (built-in, ~150MB)
- **Levels 101+ remote** (download from R2/CCD)
- **Atlas strategy**: Keep 100 individual atlases for built-in, merge remote into 10 atlases

---

## 🚀 Implementation Scripts (Tools > Addressables > ...)

### 1. Mark Built-in Levels (1-100)
```bash
Tools > Addressables > 1. Mark Built-in Levels (1-100)
```
**Output**: 200 assets (100 LevelData + 100 atlases) in "Built-in Levels" group

### 2. Create Merged Remote Atlases (101-200)
```bash
Tools > Addressables > 2. Create Merged Remote Atlases (101-200)
```
**Output**: 10 merged atlases at `/Assets/AddressableAssets/Atlases/Remote/`

### 3. Remap Level 101-200 Sprite References
```bash
Tools > Addressables > 3. Remap Level 101-200 Sprite References
```
**⚠️ CRITICAL**: Backup project first! Updates LevelData to reference merged atlases.

### 4. Mark Remote Levels (101-200)
```bash
Tools > Addressables > 4. Mark Remote Levels (101-200)
```
**Output**: 10 remote groups with LevelData + merged atlases

---

## 📋 Key Code Patterns

### Load Level (Runtime - After Migration)
```csharp
// Built-in level (1-100) - instant load from APK
LevelData level = LevelDatabase.Instance.GetLevelFromLevelLinks(0); // Level 1

// Remote level (101+) - auto-download if needed
LevelData level105 = LevelDatabase.Instance.GetLevelFromLevelLinks(104); // Level 105
```

### Addressables Keys Format
```
Pattern: Level_{number:D3}

Examples:
- Level 1:   "Level_001"
- Level 100: "Level_100"
- Level 105: "Level_105"
```

### Bundle Naming
```
Built-in:
- builtin_levels.bundle (~150MB in APK)

Remote (10 bundles):
- levels_101_110.bundle (50KB) + atlas_101_110.bundle (12MB)
- levels_111_120.bundle (50KB) + atlas_111_120.bundle (12MB)
- ... (8 more)
```

---

## 🔧 Configuration Changes

### RemoteLevelAssetManager.cs (line 52)
```csharp
// BEFORE
[SerializeField] private int builtInLevelsCount = 534;

// AFTER
[SerializeField] private int builtInLevelsCount = 100;
```

### LevelDatabase.cs (line 222)
```csharp
// BEFORE
LevelData levelData = Resources.Load<LevelData>(levelLink);

// AFTER
string address = $"Levels/Level_{levelNumber:D3}";
var handle = Addressables.LoadAssetAsync<LevelData>(address);
return handle.WaitForCompletion();
```

---

## 🏗️ Build & Deploy

### Build Addressables
```
Window > Asset Management > Addressables > Groups
→ Build > New Build > Default Build Script
→ Output: Library/com.unity.addressables/aa/Android/Android/
```

### Upload to R2
```bash
cd Library/com.unity.addressables/aa/Android/Android/

aws s3 sync . s3://match-squad-levels/Android/ \
    --endpoint-url https://[account-id].r2.cloudflarestorage.com \
    --profile r2 \
    --exclude "builtin_levels*"
```

### Update R2 URL
```csharp
// RemoteLevelAssetManager.cs line 59
[SerializeField] private string r2BaseUrl = "https://pub-xxxxx.r2.dev/Android/";
```

---

## ⚠️ Common Issues & Fixes

### Issue: "Asset not found with address 'Level_XXX'"
**Fix**:
1. Verify levelsLinks array populated
2. Run "Mark Built-in Levels" or "Mark Remote Levels"
3. Rebuild Addressables

### Issue: Sprites not showing after remap
**Fix**:
1. Re-run "Remap Level 101-200 Sprite References"
2. Verify merged atlases exist in `/Assets/AddressableAssets/Atlases/Remote/`

### Issue: Download fails
**Fix**:
1. Check R2 URL correct
2. Enable CORS on R2 bucket:
   ```json
   {
     "AllowedOrigins": ["*"],
     "AllowedMethods": ["GET"]
   }
   ```

### Issue: APK > 150MB
**Fix**:
1. Run Addressables > Analyze
2. Check only levels 1-100 in built-in group
3. Verify remote atlases not in built-in

---

## 📊 Performance

| Metric | Value |
|--------|-------|
| APK size | ~150MB |
| Remote bundle size | ~12-15MB each |
| Built-in level load | <1ms |
| Remote first download | 5-30s |
| Cached remote load | <1ms |

---

## 🛡️ Edge Case Handling

| Scenario | Handled? |
|----------|----------|
| Network loss mid-download | ✅ Resume support |
| App quit mid-download | ✅ Persist & resume |
| Corrupt download | ✅ MD5 checksum |
| Storage full | ✅ Pre-check space |
| Multiple downloads | ✅ Deduplication |

See plan file for implementation details.

---

## 📁 Critical Files

| File | Purpose |
|------|---------|
| `RemoteLevelAssetManager.cs` | Download manager (update line 52) |
| `LevelDatabase.cs` | Level loading (update line 222) |
| `MarkBuiltInLevels.cs` | Script 1: Mark built-in assets |
| `MergeRemoteAtlases.cs` | Script 2: Create merged atlases |
| `RemapLevelDataReferences.cs` | Script 3: Remap sprite refs |
| `MarkRemoteLevels.cs` | Script 4: Mark remote assets |
| `LevelPreloadManager.cs` | NEW: Auto-preload next bundle |

---

## ⏱️ Timeline

| Phase | Time |
|-------|------|
| Setup groups | 30 min |
| Mark built-in | 1 hr |
| Merge atlases | 2-3 hr |
| Remap references | 1 hr |
| Mark remote | 30 min |
| Update code | 30 min |
| Preload system | 1 hr |
| Build & deploy | 2-3 hr |
| Testing | 2 hr |
| **TOTAL** | **11-14 hr** |

---

## 🔗 See Also

- **SKILL.md** - Full architecture and guidance
- **IMPLEMENTATION_GUIDE.md** - Detailed code examples
- **Plan file** - `/Users/phucbinhpham/.claude/plans/snoopy-mapping-scott.md`
