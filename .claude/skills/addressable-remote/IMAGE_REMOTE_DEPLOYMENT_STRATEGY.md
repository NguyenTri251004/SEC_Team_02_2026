# 🎯 Image Remote Deployment Strategy - Phân Tích & Đề Xuất

## 📋 Tổng Quan Vấn Đề

**Hiện trạng:**
- LevelDatabase có `levelsLinks` (string[]) chứa Resources paths
- Mỗi LevelData ref tới ~40 sprites qua:
  - `ElementsData[]` → `characterSprite`
  - `TraitSpawnConfigs[]` → `SpawnTiles[]` → `characterSprite`
- Sprites được atlas theo level (có tool `LevelAtlasBuilder`)
- **Sprites có thể tái sử dụng** giữa các levels
- Atlas được tạo theo level hoặc level groups (10-20 levels/atlas)

**Mục tiêu:**
- Đẩy images/sprites lên server để giảm app bundle size
- Tối ưu download size (tránh duplicate sprites)
- Dễ quản lý và maintain
- Performance tốt (loading nhanh, memory hiệu quả)

---

## 🔍 Phân Tích So Sánh: Addressables vs .zip

### Option 1: Unity Addressables ⭐ **RECOMMENDED**

#### ✅ Ưu Điểm

1. **Tích hợp Native với Unity**
   - Dependency tracking tự động
   - Reference counting (auto memory management)
   - Built-in caching system
   - Preload support

2. **Bundle Organization**
   - Tự động handle dependencies
   - Có thể tạo shared bundles cho common sprites
   - Group management dễ dàng

3. **Developer Experience**
   - Editor tools sẵn có
   - Hot reload support (development)
   - Build pipeline tích hợp

4. **Performance**
   - Async loading không block main thread
   - Cache-aware loading
   - Preload manager support

#### ❌ Nhược Điểm

1. **Phức tạp hơn**
   - Cần setup Addressables groups
   - Learning curve cho team
   - Build process phức tạp hơn

2. **Bundle Size Overhead**
   - Addressables metadata overhead (~5-10% bundle size)
   - Cần build catalog files

3. **Dependency Management**
   - Cần cẩn thận với shared assets
   - Có thể tạo circular dependencies nếu không cẩn thận

---

### Option 2: Custom .zip Solution

#### ✅ Ưu Điểm

1. **Đơn giản**
   - Dễ hiểu và implement
   - Full control over structure
   - Không cần Unity Addressables package

2. **Flexible**
   - Có thể customize format
   - Dễ integrate với custom CDN
   - Có thể compress tốt hơn

3. **Lightweight**
   - Không có Unity overhead
   - Bundle size nhỏ hơn (no metadata)

#### ❌ Nhược Điểm

1. **Tự implement mọi thứ**
   - Download management
   - Caching system
   - Dependency tracking
   - Memory management
   - Error handling

2. **Không có Unity integration**
   - Phải tự handle asset loading
   - Không có preload support
   - Khó debug

3. **Maintenance**
   - Nhiều code tự viết → nhiều bugs tiềm ẩn
   - Khó maintain về lâu dài

---

## 🎯 Đề Xuất: Addressables với Hybrid Strategy

### Strategy Overview

**Kết hợp 3 loại bundles:**

1. **Level Data Bundles** (đã có)
   - LevelData assets
   - 10 levels/bundle

2. **Level Atlas Bundles** (mới)
   - SpriteAtlas cho mỗi level group
   - 10-20 levels/atlas (match với level groups)

3. **Shared Sprite Bundle** (mới - optional)
   - Common sprites được reuse nhiều
   - Load một lần, dùng cho nhiều levels

---

## 📐 Chi Tiết Implementation

### Bundle Organization Strategy

```
Addressables Groups:
├── LevelData_001-010          (LevelData assets)
├── LevelData_011-020
├── ...
├── LevelAtlas_001-010         (SpriteAtlas cho levels 1-10)
├── LevelAtlas_011-020
├── ...
└── SharedSprites_Common       (Optional: Common sprites)
```

### Strategy A: Atlas per Level Group (RECOMMENDED)

**Cấu trúc:**
- Mỗi level group (10 levels) có 1 SpriteAtlas
- Atlas chứa tất cả sprites của 10 levels đó
- Sprites duplicate giữa các groups (acceptable trade-off)

**Ưu điểm:**
- ✅ Đơn giản, dễ quản lý
- ✅ Mỗi bundle độc lập (không có dependencies)
- ✅ Dễ unload khi không cần
- ✅ Match với level loading strategy hiện tại

**Nhược điểm:**
- ❌ Sprites duplicate giữa groups (tăng download size)
- ❌ Không tối ưu cho sprites được reuse nhiều

**Bundle Size Estimate:**
- 1 level: ~40 sprites × 256×256 = ~2.5 MB (uncompressed)
- 10 levels: ~400 sprites → Atlas ~8-12 MB (compressed)
- **Total for 500 levels**: ~400-600 MB (nếu không có shared bundle)

---

### Strategy B: Shared Sprites + Level-Specific Atlas (OPTIMAL)

**Cấu trúc:**
- **SharedSprites_Common**: Sprites được reuse > 50% levels
- **LevelAtlas_XXX**: Chỉ chứa sprites unique cho level group đó

**Ưu điểm:**
- ✅ Tối ưu download size (không duplicate common sprites)
- ✅ Memory efficient (shared atlas load 1 lần)
- ✅ Best for long-term (nhiều levels)

**Nhược điểm:**
- ❌ Phức tạp hơn (cần analyze sprite usage)
- ❌ Dependency management (cần load shared bundle trước)
- ❌ Cần tool để identify shared sprites

**Bundle Size Estimate:**
- Shared sprites: ~100-200 sprites = ~5-10 MB
- Per level group: ~200-300 sprites = ~5-8 MB
- **Total for 500 levels**: ~250-400 MB (tiết kiệm 30-40%)

---

### Strategy C: Individual Atlas per Level (NOT RECOMMENDED)

**Cấu trúc:**
- Mỗi level có 1 SpriteAtlas riêng

**Nhược điểm:**
- ❌ Quá nhiều bundles (500+ bundles)
- ❌ Download overhead lớn
- ❌ Khó quản lý

**Chỉ dùng khi:**
- Có ít levels (< 50)
- Cần unload từng level riêng biệt
- Memory constraints rất nghiêm ngặt

---

## 🛠️ Implementation Plan

### Phase 1: Setup Addressables for Atlases

#### Step 1: Analyze Sprite Usage

Tạo tool để analyze:
- Sprites nào được reuse nhiều nhất?
- Sprites nào unique cho từng level?
- Tỷ lệ reuse giữa các levels?

```csharp
// Pseudo-code
Dictionary<Sprite, HashSet<int>> spriteToLevels = AnalyzeSpriteUsage();
Dictionary<Sprite, int> spriteReuseCount = CountReuse(spriteToLevels);

// Identify shared sprites (reused > 50% of levels)
var sharedSprites = spriteReuseCount
    .Where(kvp => kvp.Value > totalLevels * 0.5f)
    .Select(kvp => kvp.Key)
    .ToList();
```

#### Step 2: Create Addressables Groups

**Option A: Simple (Atlas per Group)**
```
1. Tạo groups: LevelAtlas_001-010, LevelAtlas_011-020, ...
2. Mỗi group chứa SpriteAtlas của 10 levels
3. Mark SpriteAtlas as addressable với key: "Atlas_001-010"
```

**Option B: Optimal (Shared + Level-Specific)**
```
1. Tạo SharedSprites_Common group
2. Tạo LevelAtlas_XXX groups
3. Split sprites: shared → SharedSprites, unique → LevelAtlas
4. Update LevelData references để point tới đúng atlas
```

#### Step 3: Update LevelAtlasBuilder Tool

Extend `LevelAtlasBuilder.cs` để:
- Support Addressables integration
- Auto-create Addressables groups
- Auto-assign atlas to groups
- Handle shared sprites

```csharp
public static void CreateAddressableAtlasGroups(
    LevelDatabase database,
    int levelsPerAtlas = 10,
    bool useSharedSprites = false)
{
    // 1. Analyze sprite usage
    var spriteAnalysis = AnalyzeSpriteUsage(database);
    
    // 2. Create groups
    if (useSharedSprites)
    {
        CreateSharedSpriteGroup(spriteAnalysis.SharedSprites);
    }
    
    // 3. Create level group atlases
    CreateLevelGroupAtlases(database, levelsPerAtlas, spriteAnalysis);
    
    // 4. Mark as addressable
    MarkAtlasesAsAddressable();
}
```

#### Step 4: Update Level Loading

Modify `LevelDatabase.GetLevelFromLevelLinks()` để:
- Load LevelData
- Load corresponding SpriteAtlas
- Ensure dependencies are loaded

```csharp
public LevelData GetLevelFromLevelLinks(int levelIndex)
{
    // 1. Load LevelData
    string levelKey = LevelsLinks[levelIndex];
    var levelHandle = Addressables.LoadAssetAsync<LevelData>(levelKey);
    LevelData level = levelHandle.WaitForCompletion();
    
    // 2. Load corresponding atlas
    string atlasKey = GetAtlasKeyForLevel(levelIndex);
    var atlasHandle = Addressables.LoadAssetAsync<SpriteAtlas>(atlasKey);
    SpriteAtlas atlas = atlasHandle.WaitForCompletion();
    
    // 3. Load shared sprites if needed
    if (HasSharedSprites())
    {
        LoadSharedSprites();
    }
    
    return level;
}
```

---

### Phase 2: Migration từ Resources

#### Step 1: Build Atlases với Addressables

1. Run `LevelAtlasBuilder` để tạo atlases
2. Mark atlases as addressable
3. Assign to appropriate groups

#### Step 2: Update LevelData References

- LevelData vẫn giữ sprite references (không đổi)
- Sprites tự động resolve từ atlas khi load
- Không cần modify LevelData structure

#### Step 3: Test & Validate

- Test loading từ Addressables
- Verify sprites hiển thị đúng
- Check memory usage
- Measure download size

---

## 📊 So Sánh Bundle Size

### Scenario: 500 Levels, ~40 Sprites/Level

| Strategy | Total Size | Download per Level | Complexity |
|----------|------------|-------------------|------------|
| **Resources (Current)** | ~2 GB | N/A (built-in) | Low |
| **Addressables - Strategy A** | ~400-600 MB | ~8-12 MB | Medium |
| **Addressables - Strategy B** | ~250-400 MB | ~5-8 MB | High |
| **.zip Custom** | ~300-500 MB | ~6-10 MB | Very High |

**Recommendation:** Strategy A (Atlas per Group) - cân bằng tốt giữa simplicity và efficiency.

---

## 🎯 Final Recommendation

### ✅ Chọn Addressables với Strategy A (Atlas per Level Group)

**Lý do:**
1. ✅ Tích hợp tốt với Unity ecosystem
2. ✅ Đơn giản, dễ maintain
3. ✅ Match với level loading strategy hiện tại
4. ✅ Có thể upgrade lên Strategy B sau nếu cần
5. ✅ Tool support sẵn có

### Implementation Steps:

1. **Extend LevelAtlasBuilder** để support Addressables
2. **Create Addressables groups** cho atlases (10 levels/group)
3. **Mark SpriteAtlas as addressable** khi build
4. **Update LevelDatabase** để load atlas cùng với level
5. **Test & Deploy**

### Future Optimization:

Nếu bundle size vẫn lớn, có thể:
- Upgrade lên Strategy B (Shared Sprites)
- Analyze và optimize sprite reuse
- Compress atlases tốt hơn
- Use texture compression formats

---

## 🔧 Code Examples

### Example 1: Create Addressable Atlas Group

```csharp
#if UNITY_EDITOR
using UnityEditor;
using UnityEditor.AddressableAssets;
using UnityEditor.AddressableAssets.Settings;

public static void CreateAddressableAtlasGroup(
    SpriteAtlas atlas,
    string groupName,
    int startLevel,
    int endLevel)
{
    var settings = AddressableAssetSettingsDefaultObject.Settings;
    if (settings == null)
    {
        Debug.LogError("Addressables not initialized!");
        return;
    }
    
    // Find or create group
    var group = settings.FindGroup(groupName);
    if (group == null)
    {
        group = settings.CreateGroup(groupName, false, false, false, null);
    }
    
    // Add atlas to group
    string atlasPath = AssetDatabase.GetAssetPath(atlas);
    var entry = settings.CreateOrMoveEntry(
        AssetDatabase.AssetPathToGUID(atlasPath),
        group);
    
    // Set addressable key
    entry.address = $"Atlas_{startLevel:D3}-{endLevel:D3}";
    
    // Configure as remote bundle
    var schema = group.GetSchema<BundledAssetGroupSchema>();
    if (schema != null)
    {
        schema.BuildPath.SetVariableByName(settings, 
            AddressableAssetSettings.kRemoteBuildPath);
        schema.LoadPath.SetVariableByName(settings,
            AddressableAssetSettings.kRemoteLoadPath);
    }
    
    EditorUtility.SetDirty(settings);
    AssetDatabase.SaveAssets();
}
#endif
```

### Example 2: Load Level với Atlas

```csharp
public IEnumerator LoadLevelWithAtlas(int levelIndex, 
    System.Action<LevelData, SpriteAtlas> callback)
{
    // 1. Load LevelData
    string levelKey = LevelsLinks[levelIndex];
    var levelHandle = Addressables.LoadAssetAsync<LevelData>(levelKey);
    yield return levelHandle;
    
    if (levelHandle.Status != AsyncOperationStatus.Succeeded)
    {
        Debug.LogError($"Failed to load level {levelIndex}");
        callback?.Invoke(null, null);
        yield break;
    }
    
    LevelData level = levelHandle.Result;
    
    // 2. Load corresponding atlas
    string atlasKey = GetAtlasKeyForLevel(levelIndex);
    var atlasHandle = Addressables.LoadAssetAsync<SpriteAtlas>(atlasKey);
    yield return atlasHandle;
    
    if (atlasHandle.Status != AsyncOperationStatus.Succeeded)
    {
        Debug.LogError($"Failed to load atlas for level {levelIndex}");
        callback?.Invoke(level, null);
        yield break;
    }
    
    SpriteAtlas atlas = atlasHandle.Result;
    
    // 3. Load shared sprites if needed (optional)
    if (useSharedSprites)
    {
        yield return StartCoroutine(LoadSharedSpritesIfNeeded());
    }
    
    callback?.Invoke(level, atlas);
}

private string GetAtlasKeyForLevel(int levelIndex)
{
    int levelsPerAtlas = 10;
    int groupStart = (levelIndex / levelsPerAtlas) * levelsPerAtlas + 1;
    int groupEnd = groupStart + levelsPerAtlas - 1;
    return $"Atlas_{groupStart:D3}-{groupEnd:D3}";
}
```

### Example 3: Analyze Sprite Usage

```csharp
public class SpriteUsageAnalysis
{
    public Dictionary<Sprite, HashSet<int>> SpriteToLevels { get; private set; }
    public List<Sprite> SharedSprites { get; private set; }
    public Dictionary<int, List<Sprite>> LevelToSprites { get; private set; }
    
    public static SpriteUsageAnalysis Analyze(LevelDatabase database)
    {
        var analysis = new SpriteUsageAnalysis
        {
            SpriteToLevels = new Dictionary<Sprite, HashSet<int>>(),
            LevelToSprites = new Dictionary<int, List<Sprite>>()
        };
        
        // Collect sprites from all levels
        for (int i = 0; i < database.LevelsLinks.Length; i++)
        {
            var level = database.GetLevelFromLevelLinks(i);
            if (level == null) continue;
            
            var levelSprites = new List<Sprite>();
            
            // From ElementsData
            if (level.ElementsData != null)
            {
                foreach (var element in level.ElementsData)
                {
                    if (element.characterSprite != null)
                    {
                        levelSprites.Add(element.characterSprite);
                        if (!analysis.SpriteToLevels.ContainsKey(element.characterSprite))
                        {
                            analysis.SpriteToLevels[element.characterSprite] = new HashSet<int>();
                        }
                        analysis.SpriteToLevels[element.characterSprite].Add(i);
                    }
                }
            }
            
            // From TraitSpawnConfigs
            if (level.TraitSpawnConfigs != null)
            {
                foreach (var config in level.TraitSpawnConfigs)
                {
                    if (config.SpawnTiles != null)
                    {
                        foreach (var tile in config.SpawnTiles)
                        {
                            if (tile.characterSprite != null)
                            {
                                levelSprites.Add(tile.characterSprite);
                                if (!analysis.SpriteToLevels.ContainsKey(tile.characterSprite))
                                {
                                    analysis.SpriteToLevels[tile.characterSprite] = new HashSet<int>();
                                }
                                analysis.SpriteToLevels[tile.characterSprite].Add(i);
                            }
                        }
                    }
                }
            }
            
            analysis.LevelToSprites[i] = levelSprites;
        }
        
        // Identify shared sprites (reused > 50% of levels)
        int totalLevels = database.LevelsLinks.Length;
        float reuseThreshold = 0.5f;
        
        analysis.SharedSprites = analysis.SpriteToLevels
            .Where(kvp => kvp.Value.Count > totalLevels * reuseThreshold)
            .Select(kvp => kvp.Key)
            .ToList();
        
        Debug.Log($"Analysis complete:");
        Debug.Log($"  Total sprites: {analysis.SpriteToLevels.Count}");
        Debug.Log($"  Shared sprites (>50% reuse): {analysis.SharedSprites.Count}");
        Debug.Log($"  Unique sprites: {analysis.SpriteToLevels.Count - analysis.SharedSprites.Count}");
        
        return analysis;
    }
}
```

---

## 📝 Checklist Implementation

### Phase 1: Preparation
- [ ] Analyze sprite usage across all levels
- [ ] Decide on strategy (A or B)
- [ ] Backup current project
- [ ] Test Addressables setup

### Phase 2: Tool Development
- [ ] Extend LevelAtlasBuilder với Addressables support
- [ ] Create sprite usage analysis tool
- [ ] Create Addressables group creation tool
- [ ] Test tools in editor

### Phase 3: Migration
- [ ] Build atlases với Addressables groups
- [ ] Update LevelDatabase loading logic
- [ ] Test level loading từ Addressables
- [ ] Verify sprite display

### Phase 4: Deployment
- [ ] Build remote bundles
- [ ] Upload to CDN
- [ ] Test on device
- [ ] Monitor download size & performance

---

## 🚀 Next Steps

1. **Review và approve strategy**
2. **Implement sprite usage analysis tool**
3. **Extend LevelAtlasBuilder với Addressables**
4. **Test với 10-20 levels đầu tiên**
5. **Scale up to all levels**

---

**Tài liệu này sẽ được update khi có thêm insights từ implementation!**

