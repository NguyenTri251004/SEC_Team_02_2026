---
name: addressable-remote
description: Unity Addressables remote level loading for Match Squad with progressive atlas consolidation. Handles 100 built-in levels, remote downloads (101+), dual CDN (R2/CCD), and comprehensive edge case handling.
license: MIT
version: 2.0.0
---

# Addressables Remote Level System Skill

Specialized guidance for **Match Squad's Addressables migration** from Resources.Load to remote downloadable levels with optimized atlas bundling.

## When to Use

Activate when working on:
- Level loading migration (`LevelDatabase.cs` Resources→Addressables)
- Remote level manager (`RemoteLevelAssetManager.cs`)
- Atlas organization and sprite bundling
- Editor automation scripts (`MarkBuiltInLevels.cs`, `MergeRemoteAtlases.cs`, etc.)
- CDN deployment (Cloudflare R2, Unity CCD)
- Download edge cases (network loss, app quit, storage full)
- Preload system implementation

## System Architecture

### Current State (Before Migration)
- **Level Loading**: `Resources.Load<LevelData>()` (line 222 in LevelDatabase.cs)
- **Built-in Count**: 534 levels (incorrect, should be 100)
- **Atlases**: 200 individual sprite atlases (Level_001_Atlas through Level_200_Atlas)
- **RemoteLevelAssetManager**: 50% implemented but not integrated

### Target State (After Migration)
- **Built-in Levels (1-100)**: Addressables LocalBuildPath → APK (~150MB)
- **Remote Levels (101-200)**: Addressables RemoteBuildPath → R2/CCD
- **Atlas Strategy**:
  - Levels 1-100: Keep 100 individual atlases (simple, low risk)
  - Levels 101-200: Merge into 10 combined atlases (optimize download)
- **Bundle Organization**: 10 levels per remote bundle (~12-15MB each)

## ⚠️ CRITICAL ARCHITECTURE DECISIONS

### 1. Atlas Consolidation Strategy: "Progressive Consolidation"
**Why not merge all atlases?**
- ✅ Built-in (1-100): Already in APK, no download benefit from merging
- ✅ Remote (101-200): Merge to reduce HTTP requests and optimize bandwidth
- ✅ Risk mitigation: Keep working built-in system, only refactor remote

### 2. Bundle Organization
**10 levels per bundle** (not 20):
- Matches RemoteLevelAssetManager.levelsPerBundle = 10
- Mobile-friendly download size (~12-15MB)
- User downloads bundle when reaching level X-1 (e.g., download 101-110 at level 99)

### 3. Dual CDN Architecture
**Primary: Cloudflare R2**
- Free bandwidth (no egress costs)
- S3-compatible API
- Fast global distribution

**Fallback: Unity CCD**
- 99.9% uptime guarantee
- Integrated with Addressables
- Automatic failover

## Quick Reference

### Addressables Keys Format
```
Pattern: Level_{number:D3}
Examples:
  - Level_001 (level 1)
  - Level_100 (level 100)
  - Level_105 (level 105)
```

### Bundle Naming Convention
```
Built-in: builtin_levels.bundle (~150MB, in APK)
Remote:
  - levels_101_110.bundle + atlas_101_110.bundle
  - levels_111_120.bundle + atlas_111_120.bundle
  - ... (10 groups total)
```

### Loading Pattern (After Migration)
```csharp
// LevelDatabase.cs - NEW IMPLEMENTATION
public LevelData GetLevelFromLevelLinks(int levelIndex)
{
    int levelNumber = levelIndex + 1;
    string address = $"Levels/Level_{levelNumber:D3}";

    var handle = Addressables.LoadAssetAsync<LevelData>(address);

    // Built-in levels (1-100): Load instantly from APK
    // Remote levels (101+): Auto-download if needed, then load
    return handle.WaitForCompletion();
}
```

## Implementation Phases

Refer to the plan file for detailed steps. Summary:

### Phase 1: Setup Addressables Groups (30 min)
- Create "Built-in Levels (1-100)" group
- Create 10 remote groups (101-110, 111-120, ..., 191-200)

### Phase 2: Mark Built-in Assets (1 hr)
- Script: `MarkBuiltInLevels.cs`
- Marks 100 LevelData + 100 atlases as built-in Addressables

### Phase 3: Create Merged Atlases (2-3 hr)
- Script: `MergeRemoteAtlases.cs`
- Creates 10 combined atlases from source sprites
- **CRITICAL**: Use source sprites, not existing packed atlases

### Phase 4: Remap LevelData References (1 hr)
- Script: `RemapLevelDataReferences.cs`
- Updates LevelData 101-200 to reference merged atlases
- **HIGH RISK**: Backup before running

### Phase 5: Mark Remote Assets (30 min)
- Script: `MarkRemoteLevels.cs`
- Adds LevelData + merged atlases to remote groups

### Phase 6: Update Code (30 min)
- `RemoteLevelAssetManager.cs`: builtInLevelsCount = 100 (line 52)
- `LevelDatabase.cs`: Resources.Load → Addressables.LoadAssetAsync

### Phase 7: Preload System (1 hr)
- `LevelPreloadManager.cs`: Auto-download next bundle at level X-1

### Phase 8: Build & Deploy (2-3 hr)
- Build Addressables bundles
- Upload to Cloudflare R2
- Configure R2 URL in RemoteLevelAssetManager

### Phase 9: Testing
- Built-in levels load instantly
- Remote download flow works
- Offline mode (cached levels)
- CDN fallback (R2 → CCD)

**Total Time**: 11-14 hours first-time setup

## Edge Cases Handled

| Scenario | Solution |
|----------|----------|
| Network lost during download | Resume from byte position using Range header |
| App quit mid-download | Persist partial progress, resume on restart |
| Downloaded file corrupt | MD5 checksum verification |
| Storage full | Check available space before download |
| App backgrounded | Pause/resume downloads on lifecycle events |
| Multiple simultaneous downloads | activeDownloads HashSet prevents duplicates |
| CDN URL migration | Content version control clears old cache |

See plan file section "Edge Cases & Error Handling" for implementation details.

## File Structure

```
Assets/
├── MIMFiles/Game/Scripts/Level/
│   ├── RemoteLevelAssetManager.cs    ✅ Core download manager
│   ├── LevelDatabase.cs               🔄 Needs migration
│   └── LevelPreloadManager.cs         ✨ NEW - Auto-preload
│
├── Editor/AddressableSetup/          ✨ NEW - Automation scripts
│   ├── MarkBuiltInLevels.cs
│   ├── MergeRemoteAtlases.cs
│   ├── RemapLevelDataReferences.cs
│   └── MarkRemoteLevels.cs
│
├── Atlases/
│   └── LevelAtlases/
│       ├── Level_001_Atlas.spriteatlasv2   (keep for built-in)
│       └── ... (100 built-in atlases)
│
├── AddressableAssets/                ✨ NEW
│   └── Atlases/Remote/
│       ├── Atlas_101_110.spriteatlasv2
│       ├── Atlas_111_120.spriteatlasv2
│       └── ... (10 merged atlases)
│
└── AddressableAssetsData/
    └── AssetGroups/
        ├── Built-in_Levels_1_100.asset
        ├── Remote_Levels_101_110.asset
        └── ... (10 remote groups)
```

## Troubleshooting

### "Asset not found" when loading level
**Cause**: Address format mismatch
**Fix**: Verify address is `Levels/Level_XXX` format

### Atlas sprites not showing
**Cause**: LevelData still references old atlas
**Fix**: Re-run RemapLevelDataReferences.cs script (Phase 4)

### Download fails with R2 error
**Causes**:
1. R2 URL incorrect
2. CORS not configured

**Fix**:
```json
// R2 Bucket CORS settings
{
  "AllowedOrigins": ["*"],
  "AllowedMethods": ["GET"],
  "AllowedHeaders": ["*"]
}
```

### APK size > 150MB
**Cause**: Duplicate assets or wrong groups
**Fix**:
1. Run Addressables Analyze tool
2. Verify only levels 1-100 in built-in group

## Performance Notes

### Bundle Sizes
- **Built-in bundle**: ~150MB (100 levels + 100 atlases)
- **Each remote bundle**: ~12-15MB (10 levels + 1 merged atlas)
- **Total remote**: ~120-150MB for levels 101-200

### Loading Performance
- **Built-in levels**: <1ms (from APK)
- **Cached remote**: <1ms (from disk cache)
- **First download**: ~5-30s depending on network

### Memory Management
- Addressables auto-manages memory via reference counting
- No manual unloading needed
- For aggressive cleanup: `Addressables.Release(handle)`

## References

- **Plan File**: `/Users/phucbinhpham/.claude/plans/snoopy-mapping-scott.md`
- **Implementation Guide**: `.claude/skills/addressable-remote/IMPLEMENTATION_GUIDE.md`
- **Quick Reference**: `.claude/skills/addressable-remote/QUICK_REFERENCE.md`

## Next Steps

1. Read the plan file for complete implementation details
2. Backup project before Phase 3 (atlas remapping)
3. Run automation scripts in sequence
4. Test thoroughly after each phase
5. Deploy to R2 and soft launch to 1% users

## External Resources

- Unity Addressables: https://docs.unity3d.com/Packages/com.unity.addressables@latest
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Unity CCD: https://unity.com/products/cloud-content-delivery
