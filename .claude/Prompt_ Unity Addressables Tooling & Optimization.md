# **INSTRUCTION: Unity Addressables Automation & Optimization Tool**

Role: You are a Senior Unity Tools Programmer & Technical Artist.  
Task: Create a comprehensive Editor Tool (AddressablesManagerWindow.cs) to automate the organization, optimization, and validation of Addressable Assets for a large-scale Puzzle Game.

## **1\. Project Context & Constraints (System Spec)**

* **Scale:** 500 Levels (ScriptableObjects).  
* **Assets:** 200 Sprite Atlases (corresponding to the first 200 levels).  
* **Reuse Logic:** Levels 201-500 reuse sprites located in the 200 Atlases.  
* **Bundle Size Data:** Each Atlas bundle averages **300KB \- 500KB**.  
* **Deployment Strategy (Hybrid):**  
  * **Local (Built-in APK):** Levels 1-100 \+ Related Atlases.  
  * **Remote (CCD):** Levels 101-500 \+ Related Atlases.  
* **Critical Issue:** Explicit Sprite references in ScriptableObjects are causing texture duplication (Implicit Dependency) in Level Data bundles.

## **2\. Required Tool Features**

### **Feature A: The "Reference Fixer" (Critical)**

**Goal:** Eliminate texture duplication by converting "Hard References" (Sprite) to "Soft References" (AssetReferenceAtlasedSprite).

**Logic Requirement:**

1. **Script Generation:** Generate a LevelDataRefactor script that adds a new field public AssetReferenceAtlasedSprite iconReference; to the user's LevelData class (if not present).  
2. **Migration Tool:**  
   * Iterate through all LevelData ScriptableObjects.  
   * Read the existing Sprite field (e.g., icon).  
   * **Reverse Lookup:** Find which SpriteAtlas contains this Sprite. *Tip: Use SpriteAtlasExtensions.GetPackables or verify AssetDatabase dependencies.*  
   * **Assignment:**  
     * Create a new AssetReferenceAtlasedSprite.  
     * Set the **Asset GUID** to the SpriteAtlas GUID.  
     * Set the **Sub-Asset** (Editor Only) using reference.SetEditorSubObject(sprite). *Note: This is crucial for the reference to work correctly in the Inspector.*  
3. **Sanity Check:** Log warnings if a Sprite is used but not found in any Atlas (orphan sprite).

### **Feature B: Bundle Architecture Automator**

**Goal:** Automatically sort assets into Groups with the correct Schema to optimize for CCD and File I/O.

**Grouping Rules:**

| Cluster | Content | Strategy | Schema Config |
| :---- | :---- | :---- | :---- |
| **Local\_Core** | Levels 1-100 \+ Atlases 1-100 | **Pack Together** | BundledAssetGroupSchema BuildPath: Local LoadPath: Local |
| **Remote\_Levels** | Levels 101-500 | **Pack Together** | BundledAssetGroupSchema BuildPath: Remote LoadPath: Remote *Note: Data files are tiny, packing together reduces HTTP requests.* |
| **Remote\_Atlas\_Chunk\_{N}** | Atlases 101-200 (Grouped by 10\) | **Pack Together** | BundledAssetGroupSchema BuildPath: Remote LoadPath: Remote *Target Size: \~3MB-5MB per bundle.* |

**Algorithm for Remote Atlas Chunks:**

* Loop through Atlases with ID 101 to 200\.  
* Create groups named Atlas\_Chunk\_101\_110, Atlas\_Chunk\_111\_120, etc.  
* **Crucial:** Set BundleMode \= PackTogether. Do **NOT** use PackSeparately (which would create 10 tiny files). We want 1 file containing 10 atlases.

### **Feature C: Schema & CCD Configuration**

**Goal:** Ensure every group has the correct settings for Cloud Content Delivery.

1. **Static Content:** For all Atlas groups, ensure ContentUpdateGroupSchema has StaticContent \= true. (Atlases rarely change, this enables better caching on CCD).  
2. **Compression:** Use LZ4 for all Local and Remote bundles to allow partial loading and fast seek times.

### **Feature D: Validation (Analyze)**

**Goal:** Verify no duplication exists before build.

* Expose a button to run Addressables.Analyze().  
* Specifically check/fix the rule: CheckSpriteAtlasAddressableDuplicateDependencies.

## **3\. Technical Implementation Details (Usage for Code Generation)**

Please write the C\# Editor code for AddressablesOptimizerTool.cs.

**Key APIs to use:**

* AddressableAssetSettingsDefaultObject.Settings  
* settings.CreateGroup(name,...)  
* settings.CreateOrMoveEntry(guid, group)  
* BundledAssetGroupSchema, ContentUpdateGroupSchema  
* AssetDatabase.FindAssets, AssetDatabase.LoadAssetAtPath

**Sample Logic for Atlas Lookup (Hint):**

C\#

// Helper to find atlas for a sprite  
SpriteAtlas FindAtlasForSprite(Sprite sprite) {  
    // 1\. Get path of sprite  
    // 2\. Check dependencies or internal dictionary of all atlases  
    // Warning: Direct dependency check might be slow, consider caching all Atlas contents first.  
}

## **4\. Runtime Preload Strategy (Guidance for Runtime Script)**

Also generate a snippet for the Runtime Preloader (ContentDeliveryManager.cs).

* **Logic:** Do NOT map Level ID to Atlas ID manually.  
* **Method:** Use Addressables.DownloadDependenciesAsync(levelDataReference).  
  * Since we switched to AssetReferenceAtlasedSprite in Feature A, loading the Level Data's dependencies will **automatically** resolve and download the specific Atlas Chunk containing the required image.  
  * This supports the reuse case (Level 250 using Atlas 050\) without any extra code.

---

**Output Requirement:**

1. Complete C\# Editor Script (AddressablesOptimizerTool).  
2. Snippet for LevelData class modification.  
3. Snippet for Runtime Preloading logic.