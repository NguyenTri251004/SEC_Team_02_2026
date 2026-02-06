# Addressables Remote Level System - Implementation Status

## Current Status: **PLANNED** ⏳

Migration from Resources.Load to Addressables with remote level downloading is **planned and designed**, but **not yet implemented**.

---

## Implementation Plan Summary

**Goal**: Migrate 500 levels from Resources.Load to Addressables
- **100 levels** built-in to APK (~150MB)
- **Levels 101-200** remote downloadable from R2/CCD
- **Levels 201-500** future expansion (currently use Remix system)

**Timeline**: 11-14 hours first-time setup
**Risk Level**: Medium (sprite remapping is critical)

---

## Current Architecture (AS-IS)

### Level Loading
- **Method**: `Resources.Load<LevelData>()` in LevelDatabase.cs line 222
- **Storage**: All 500 levels in `/Assets/Resources/Levels/`
- **APK impact**: All levels bundled in APK (large size)

### Sprite Atlases
- **Count**: 200 individual atlases (Level_001_Atlas through Level_200_Atlas)
- **Format**: `.spriteatlasv2` files
- **Location**: `/Assets/Atlases/LevelAtlases/`
- **Status**: ✅ Working - LevelData references sprites from these atlases

### Remote System
- **RemoteLevelAssetManager.cs**: ⚠️ 50% implemented
  - Dual CDN support (R2 + CCD) coded
  - Download retry + caching implemented
  - **BUT**: `builtInLevelsCount = 534` (incorrect, should be 100)
  - **NOT integrated** with LevelDatabase yet

---

## Target Architecture (TO-BE)

### Level Loading
- **Method**: `Addressables.LoadAssetAsync<LevelData>()`
- **Built-in (1-100)**: LocalBuildPath → APK
- **Remote (101+)**: RemoteBuildPath → R2/CCD
- **Keys**: `Level_001`, `Level_002`, ..., `Level_500`

### Sprite Atlas Strategy: **Progressive Consolidation**
- **Built-in (1-100)**: Keep 100 individual atlases (low risk)
- **Remote (101-200)**: **Merge into 10 combined atlases**
  - Atlas_101_110.spriteatlasv2 (sprites for levels 101-110)
  - Atlas_111_120.spriteatlasv2 (sprites for levels 111-120)
  - ... 8 more merged atlases
- **Benefit**: 1 HTTP request per 10 levels instead of 10 requests

### Bundle Organization
- **Built-in bundle**: `builtin_levels.bundle` (~150MB in APK)
- **Remote bundles**: 10 groups, each containing:
  - `levels_101_110.bundle` (~50KB LevelData)
  - `atlas_101_110.bundle` (~12-15MB sprites)
  - Addressables auto-downloads dependencies

---

## Implementation Phases

| Phase | Status | Time | Description |
|-------|--------|------|-------------|
| 1. Setup Groups | ⏳ Not Started | 30 min | Create Addressable groups (built-in + 10 remote) |
| 2. Mark Built-in | ⏳ Not Started | 1 hr | Script: MarkBuiltInLevels.cs |
| 3. Merge Atlases | ⏳ Not Started | 2-3 hr | Script: MergeRemoteAtlases.cs |
| 4. Remap References | ⏳ Not Started | 1 hr | Script: RemapLevelDataReferences.cs |
| 5. Mark Remote | ⏳ Not Started | 30 min | Script: MarkRemoteLevels.cs |
| 6. Update Code | ⏳ Not Started | 30 min | RemoteLevelAssetManager + LevelDatabase |
| 7. Preload System | ⏳ Not Started | 1 hr | LevelPreloadManager.cs |
| 8. Build & Deploy | ⏳ Not Started | 2-3 hr | Build bundles, upload to R2 |
| 9. Testing | ⏳ Not Started | 2 hr | Full integration testing |

**Total Estimated Time**: 11-14 hours

---

## Edge Cases Designed

The plan includes comprehensive edge case handling:

| Case | Solution Designed | Implemented? |
|------|-------------------|--------------|
| Network loss mid-download | Resume from byte offset (Range header) | ❌ |
| App quit mid-download | Persist partial progress | ❌ |
| Corrupt download | MD5 checksum verification | ❌ |
| Storage full | Pre-check available space | ❌ |
| App backgrounded | Pause/resume downloads | ❌ |
| Multiple downloads | activeDownloads deduplication | ✅ Already in RemoteLevelAssetManager |
| CDN migration | Content version control | ❌ |

---

## Critical Files to Create/Modify

### Files to Create (NEW)
- [ ] `/Assets/Editor/AddressableSetup/MarkBuiltInLevels.cs`
- [ ] `/Assets/Editor/AddressableSetup/MergeRemoteAtlases.cs`
- [ ] `/Assets/Editor/AddressableSetup/RemapLevelDataReferences.cs`
- [ ] `/Assets/Editor/AddressableSetup/MarkRemoteLevels.cs`
- [ ] `/Assets/MIMFiles/Game/Scripts/Level/LevelPreloadManager.cs`
- [ ] `/Assets/AddressableAssets/Atlases/Remote/` (directory + 10 merged atlases)

### Files to Modify (EXISTING)
- [ ] `RemoteLevelAssetManager.cs` - Update line 52: `builtInLevelsCount = 100`
- [ ] `LevelDatabase.cs` - Replace line 222: `Resources.Load` → `Addressables.LoadAssetAsync`

---

## Risk Assessment

### 🔴 HIGH RISK: Sprite Reference Remapping (Phase 4)
**Problem**: If remapping script has bugs, sprites will disappear or show wrong
**Mitigation**:
- ✅ Backup project before Phase 4
- ✅ Test on 1 level first before batch processing
- ✅ Verify atlas packing in Unity inspector

### 🟡 MEDIUM RISK: Addressables Build Failures
**Problem**: Complex dependencies can cause build errors
**Mitigation**:
- ✅ Use Addressables Analyze tool before build
- ✅ Fix duplicate asset warnings
- ✅ Test incremental builds

### 🟢 LOW RISK: Download Performance
**Problem**: User may complain about slow downloads
**Mitigation**:
- ✅ R2 has free bandwidth → no throttling
- ✅ LZMA compression reduces bundle size
- ✅ Preload system downloads in background

---

## Next Steps (User Action Required)

1. **Review Plan**: Read `/Users/phucbinhpham/.claude/plans/snoopy-mapping-scott.md`
2. **Backup Project**: Create full project backup before starting
3. **Phase 1-2**: Setup groups and mark built-in levels (low risk, test Addressables)
4. **Test Build**: Verify APK < 150MB with built-in levels only
5. **Phase 3-5**: Create merged atlases and mark remote (high risk, need backup)
6. **Phase 6-9**: Update code, deploy, and test

---

## Decision Log

### Why Addressables over Custom .zip System?
**Decision**: Use Unity Addressables
**Rationale**:
- User already familiar with Addressables
- Built-in dependency management (level → atlas automatic)
- RemoteLevelAssetManager already 50% coded for Addressables
- Unity CCD fallback available
- One-time setup (minimal future maintenance)

### Why Progressive Atlas Consolidation?
**Decision**: Keep built-in atlases separate, merge remote atlases only
**Rationale**:
- Low risk for built-in (already working, in APK)
- High benefit for remote (reduce HTTP requests)
- Easier rollback if remote merging fails
- Simpler debugging (built-in separate from remote)

### Why 10 Levels per Bundle?
**Decision**: 10 levels/bundle (not 20 or 5)
**Rationale**:
- Matches RemoteLevelAssetManager.levelsPerBundle = 10
- Mobile-friendly size (~12-15MB per download)
- Good balance: not too many small requests, not too few large downloads
- User downloads next bundle at level X-1 (e.g., 99 triggers 101-110 download)

---

## Performance Targets

| Metric | Target | Status |
|--------|--------|--------|
| APK Size | < 150MB | ⏳ Will verify after Phase 2 |
| Remote Bundle Size | 12-15MB each | ⏳ Will measure after Phase 3 |
| Built-in Load Time | < 1ms | ⏳ Will test after Phase 6 |
| Remote First Load | < 30s on 4G | ⏳ Will test after Phase 8 |
| Cached Remote Load | < 1ms | ⏳ Will test after Phase 8 |

---

## References

- **Plan File**: `/Users/phucbinhpham/.claude/plans/snoopy-mapping-scott.md` (1,600+ lines detailed plan)
- **Skill**: `.claude/skills/addressable-remote/SKILL.md`
- **Quick Reference**: `.claude/skills/addressable-remote/QUICK_REFERENCE.md`

---

## Implementation Checklist

### Before Starting
- [ ] Read complete plan file
- [ ] Backup entire project
- [ ] Test current game builds successfully
- [ ] Verify R2 bucket access

### Phase 1-2 (Low Risk)
- [ ] Create Addressable groups
- [ ] Run MarkBuiltInLevels.cs script
- [ ] Verify 200 assets marked
- [ ] Test APK build (should still work with Resources)

### Phase 3-5 (High Risk - BACKUP FIRST!)
- [ ] **BACKUP PROJECT AGAIN**
- [ ] Run MergeRemoteAtlases.cs
- [ ] Verify 10 merged atlases created
- [ ] Run RemapLevelDataReferences.cs
- [ ] **TEST 1 LEVEL MANUALLY** before continuing
- [ ] Run MarkRemoteLevels.cs
- [ ] Verify all groups populated

### Phase 6-9 (Integration)
- [ ] Update RemoteLevelAssetManager.cs line 52
- [ ] Update LevelDatabase.cs line 222
- [ ] Create LevelPreloadManager.cs
- [ ] Build Addressables bundles
- [ ] Upload to R2
- [ ] Update R2 URL in code
- [ ] Test on device
- [ ] Monitor crash reports

---

## Current Date: 2025-12-26

**Status**: Migration plan complete and documented. Awaiting user approval to begin implementation.

**Recommendation**: Start with Phase 1-2 (low risk) to validate Addressables setup before proceeding to high-risk atlas remapping.
