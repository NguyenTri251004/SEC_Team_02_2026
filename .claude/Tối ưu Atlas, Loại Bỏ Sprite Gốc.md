# **Báo Cáo Chuyên Sâu: Chiến Lược Tối Ưu Hóa Addressables và Kiến Trúc Sprite Atlas Cho Dự Án Game Quy Mô Lớn**

## **1\. Tổng Quan Về Thách Thức Kỹ Thuật và Phạm Vi Dự Án**

Trong bối cảnh phát triển các trò chơi di động hiện đại trên nền tảng Unity, việc quản lý tài nguyên (Asset Management) không chỉ đơn thuần là việc tổ chức thư mục mà là một bài toán kỹ thuật phức tạp ảnh hưởng trực tiếp đến hiệu suất runtime, thời gian khởi động, mức tiêu thụ bộ nhớ và dung lượng bộ cài (build size). Dự án hiện tại đang đối mặt với một vấn đề kinh điển trong kiến trúc 2D quy mô lớn: sự xung đột giữa cơ chế tham chiếu trực tiếp (Direct Reference) truyền thống và hệ thống quản lý tài sản theo địa chỉ (Addressable Asset System). Với quy mô dữ liệu lên tới 500 màn chơi (levels), mỗi màn chơi được định nghĩa bởi các ScriptableObject chứa dữ liệu tham chiếu đến hình ảnh (Sprites), việc tối ưu hóa quy trình đóng gói (packing) là yếu tố sống còn.

Vấn đề cốt lõi được xác định là hiện tượng "Double Packing" (Đóng gói kép), nơi mà các tài nguyên hình ảnh gốc (Source Sprites) bị sao chép một cách không mong muốn vào trong các AssetBundle chứa dữ liệu màn chơi (Level Data), mặc dù các hình ảnh này đã được quy hoạch để nằm trong các Sprite Atlas riêng biệt. Sự dư thừa này không chỉ làm tăng kích thước file APK một cách lãng phí mà còn phá vỡ mục tiêu tối ưu hóa Draw Call, khi mà GPU phải xử lý các texture riêng lẻ thay vì texture đã được batching trong Atlas. Thêm vào đó, yêu cầu tái sử dụng (reuse) tài nguyên cho các level cao (từ level 201 trở đi) mà không tạo ra sự phụ thuộc chéo (circular dependency) hoặc nhân bản dữ liệu càng làm tăng độ phức tạp của bài toán.

Báo cáo này sẽ đi sâu vào phân tích cơ chế hoạt động nội tại của Unity Addressables, mổ xẻ nguyên nhân gốc rễ của việc nhân bản tài sản, đánh giá chiến lược đóng gói hiện tại của dự án, và đề xuất một kiến trúc toàn diện dựa trên AssetReferenceAtlasedSprite. Đồng thời, báo cáo cung cấp một bản thiết kế chi tiết (specification) để lập trình viên hoặc AI Agent có thể xây dựng công cụ tự động hóa quy trình này.

## ---

**2\. Phân Tích Cơ Chế Dependency và Nguyên Nhân Gây "Double Packing"**

Để giải quyết triệt để vấn đề, chúng ta cần hiểu rõ cách Unity xây dựng đồ thị phụ thuộc (Dependency Graph) khi build AssetBundles thông qua hệ thống Addressables. Đây là nền tảng lý thuyết quan trọng để giải thích tại sao cấu hình hiện tại lại thất bại.

### **2.1. Cơ Chế Explicit và Implicit Dependency**

Trong hệ thống Addressables, Unity phân loại các tài sản tham gia vào quá trình build thành hai nhóm chính dựa trên cách chúng được quản lý:

* **Explicit Dependency (Phụ thuộc tường minh):** Đây là các tài sản được người dùng gán trực tiếp vào một Addressable Group. Ví dụ: Atlas\_015 và LevelData\_015 đều là Explicit Dependency vì chúng được khai báo trong cửa sổ Addressables Groups. Chúng sẽ được đóng gói vào các AssetBundle tương ứng với Group của chúng.  
* **Implicit Dependency (Phụ thuộc ngầm định):** Đây là các tài sản *không* được gán vào bất kỳ Addressable Group nào, nhưng lại được một Explicit Asset tham chiếu tới. Ví dụ: Sprite A (texture gốc) nếu không được đánh dấu là Addressable, nhưng lại được LevelData\_015 tham chiếu trực tiếp.

Quy tắc bất biến của Addressables là: **Mọi AssetBundle phải tự túc (self-contained) về các phụ thuộc của nó, trừ khi phụ thuộc đó nằm trong một AssetBundle khác đã biết.** Khi LevelData\_015 (nằm trong Bundle A) tham chiếu tới Sprite A, và Sprite A không nằm trong bất kỳ Bundle nào khác (theo cách hiểu của Unity tại thời điểm build), hệ thống build sẽ sao chép Sprite A và nhúng trực tiếp vào Bundle A để đảm bảo khi Bundle A được load, Sprite A có thể hiển thị.1

### **2.2. Sự Xung Đột Giữa Sprite Gốc và Sprite Atlas**

Vấn đề trở nên phức tạp khi Sprite Atlas tham gia vào phương trình. Atlas\_015 chứa Sprite A. Khi Atlas\_015 được build thành AssetBundle (Bundle B), nó chứa texture đã được pack (gộp) của Sprite A.  
Tuy nhiên, LevelData\_015 là một ScriptableObject. Trong mã nguồn C\#, trường dữ liệu thường được khai báo như sau:

C\#

public Sprite backgroundSprite;

Khi bạn kéo thả Sprite A từ Project window vào trường này, Unity Editor lưu trữ một tham chiếu đến **GUID của asset gốc** (Sprite A).

Tại thời điểm build, nếu hệ thống Addressables không được cấu hình để hiểu mối liên kết đặc biệt giữa Sprite gốc và Atlas, nó sẽ xử lý như sau:

1. Nó thấy LevelData\_015 cần Sprite A.  
2. Nó kiểm tra xem Sprite A có phải là Addressable không? (Thường là không, vì chúng ta chỉ mark Atlas là Addressable).  
3. Nó kiểm tra xem Sprite A có thuộc về một Bundle nào khác không?  
   * Mặc dù Sprite A nằm trong Atlas\_015 (đã mark Addressable), nhưng Unity thường coi Sprite gốc và packed version trong Atlas là hai thực thể khác nhau trong context của dependency graph nếu không sử dụng cơ chế tham chiếu gián tiếp.  
4. Kết quả: Addressables coi Sprite A là một Implicit Dependency của LevelData\_015 và đóng gói nó vào Bundle A.  
5. Đồng thời, Bundle B (Atlas\_015) cũng chứa dữ liệu hình ảnh của Sprite A.

Đây chính là nguyên nhân gây ra hiện tượng **Double Packing** mà dự án đang gặp phải. Khi chạy game (runtime), LevelData\_015 sẽ load Sprite A từ Bundle A (texture rời rạc), trong khi Atlas\_015 được load từ Bundle B nhưng không được sử dụng, dẫn đến việc tăng Draw Call (do không batching được) và lãng phí bộ nhớ.2

### **2.3. Hạn Chế Của Việc "Tự Ref Tới Atlas" Ở Level Cao**

Yêu cầu *"Từ level 201, các level data sẽ hoàn toàn reuse hình ảnh (tôi muốn nó tự ref tới atlas thay vì sprite gốc mà không được)"* phản ánh một giới hạn của Editor. Trong Unity Editor, bạn không thể "kéo thả" một sub-sprite từ Atlas vào trường Sprite của ScriptableObject một cách trực tiếp để nó tự động hiểu là tham chiếu Atlas. Bạn luôn luôn kéo thả asset gốc. Để đạt được việc reuse mà không duplicate, chúng ta buộc phải thay đổi cách lưu trữ tham chiếu từ "Hard Reference" (trực tiếp) sang "Soft Reference" (gián tiếp thông qua Addressable system).

## ---

**3\. Đánh Giá và Tái Cấu Trúc Chiến Lược Bundle**

Chiến lược đóng gói (Bundling Strategy) hiện tại của dự án có những điểm mạnh về tư duy phân tầng (tiering) nhưng lại chứa đựng những rủi ro nghiêm trọng về hiệu năng I/O và quản lý bộ nhớ do việc lạm dụng chế độ "Pack Separately".

### **3.1. Phân Tích Cấu Trúc Hiện Tại**

Bảng dưới đây phân tích chi tiết các nhóm bundle hiện tại và các vấn đề tiềm ẩn:

| Nhóm Dữ Liệu | Số Lượng | Chế Độ Đóng Gói | Đánh Giá Tác Động Kỹ Thuật |
| :---- | :---- | :---- | :---- |
| **Level Data 1-100** | 100 SOs | **Pack Together** | **Hợp lý.** Dữ liệu ScriptableObject thường rất nhẹ (vài KB đến vài chục KB). Gộp 100 level vào 1 bundle giúp giảm số lượng request mạng. Metadata overhead thấp. |
| **Level Data 101-500** | 400 SOs | **Pack Together** | **Chấp nhận được.** Tuy nhiên, nếu tổng kích thước bundle này quá lớn (\>5-10MB text data), việc update một level nhỏ sẽ buộc người dùng tải lại toàn bộ. Nên cân nhắc chia nhỏ hơn (ví dụ: mỗi 100 level/group). |
| **Atlas 1-100** | 100 Atlases | **Pack Separately** | RẤT NGUY HIỂM.4 Việc tạo ra 100 AssetBundle riêng biệt cho 100 atlas đầu là một chiến lược sai lầm về mặt tối ưu. Mỗi AssetBundle có một header (vài KB) và metadata map. Load 100 bundle đồng nghĩa với 100 I/O operations, 100 lần giải nén header, và tiêu tốn bộ nhớ đáng kể cho việc quản lý các SerializedFile header trong RAM. |
| **Atlas 101-200** | 10 Bundles | **Pack Separately** | **Gây hiểu nhầm/Rủi ro.** Nếu "chia thành 10 atlases mỗi bundle" nghĩa là bạn tạo 10 Group, và mỗi Group set "Pack Together", thì ổn. Nhưng nếu set "Pack Separately" trong một Group chứa 10 atlas, nó sẽ lại đẻ ra 10 bundle con. Cần làm rõ thuật ngữ. |

### **3.2. Vấn Đề Của "Pack Separately" Với Số Lượng Lớn**

Tài liệu chính thức của Unity Addressables 4 nhấn mạnh rằng chế độ Pack Separately thường chỉ nên dùng cho các asset phức hợp (như Sprite Atlas) khi chúng thực sự độc lập và có vòng đời (lifecycle) khác nhau hoàn toàn. Tuy nhiên, khi số lượng lên đến hàng trăm, chi phí quản lý (management overhead) sẽ vượt quá lợi ích của việc tải lẻ tẻ.

* **AssetBundle Overhead:** Mỗi bundle khi load vào memory chiếm một lượng bộ nhớ không thể giải phóng (non-swappable memory) để lưu bảng mapping. Với 100 bundle, con số này có thể lên tới vài chục MB lãng phí.  
* **Latency:** Trên mobile, độ trễ khi mở file (File Open Latency) cao hơn PC. Việc preload 5 level tiếp theo sẽ yêu cầu mở 5-10 file bundle liên tục, gây giật lag (hiccup) nếu không xử lý bất đồng bộ tốt.

### **3.3. Kiến Trúc Đề Xuất: Mô Hình Chunking (Gom Nhóm)**

Để tối ưu hóa giữa kích thước file tải xuống và hiệu năng I/O, dự án nên chuyển sang mô hình "Chunking" \- gom nhóm theo logic màn chơi.

**Cấu trúc khuyến nghị:**

1. **Core Data (Level 1-100):**  
   * **Level Data:** 1 Bundle (như hiện tại).  
   * **Atlases:** Gom thành **5-10 Bundles** (thay vì 100). Ví dụ: Atlas\_Bundle\_01 (chứa Atlas 1-10), Atlas\_Bundle\_02 (chứa Atlas 11-20).  
   * **Lợi ích:** Giảm số lượng file từ 100 xuống 10\. Kích thước mỗi file vẫn đủ nhỏ (ví dụ 5-10MB) để tải nhanh, nhưng đủ lớn để giảm overhead.  
2. **Expansion Data (Level 101-500):**  
   * **Level Data:** Chia thành các Group theo cụm 100 levels: LevelData\_101\_200, LevelData\_201\_300... Mỗi Group set chế độ Pack Together.  
   * **Atlases:** Tương tự, chia thành các Group theo cụm tương ứng (ví dụ mỗi cụm chứa 10-20 Atlases). Set chế độ Pack Together.  
3. **Cơ Chế Preload:**  
   * Giữ nguyên logic preload trước 5 level. Tuy nhiên, thay vì download 1 file atlas nhỏ, hệ thống sẽ download 1 "Chunk Atlas" (chứa atlas của 10-20 level).  
   * Việc này có lợi: Khi người chơi chơi level 99, hệ thống tải Atlas\_Chunk\_10 (chứa 91-100). Khi sang level 101, hệ thống tải Atlas\_Chunk\_11 (chứa 101-110). Do đó, người chơi có sẵn data cho 10 level tiếp theo, giảm tần suất phải download liên tục.

## ---

**4\. Giải Pháp Kỹ Thuật: AssetReferenceAtlasedSprite**

Để giải quyết vấn đề "Double Packing" và cho phép Level 201+ reuse hình ảnh mà không cần copy, giải pháp duy nhất chuẩn mực là thay đổi cách ScriptableObject tham chiếu đến Sprite. Chúng ta cần chuyển từ **Hard Reference** sang **Addressable Reference**.

### **4.1. Tại Sao Phải Là AssetReferenceAtlasedSprite?**

Unity cung cấp class AssetReferenceAtlasedSprite đặc biệt được thiết kế cho mục đích này.3

* **Trong Editor:** Nó cho phép bạn chọn một Atlas và sau đó chọn một Sprite cụ thể trong Atlas đó thông qua giao diện dropdown (Sub-asset selection).  
* **Trong Build:** Nó không lưu tham chiếu trực tiếp đến texture. Nó chỉ lưu GUID (địa chỉ) của Sprite. Vì Addressables biết Sprite này thuộc về Atlas (đã được mark Addressable), nó sẽ **không** kéo texture gốc vào bundle của Level Data.  
* **Dependency:** Bundle của Level Data lúc này chỉ chứa text data (địa chỉ). Nó sẽ có một dependency logic tới Bundle của Atlas.

### **4.2. Quy Trình Chuyển Đổi Dữ Liệu**

1. Refactor Code:  
   Thay đổi ScriptableObject định nghĩa Level Data:  
   C\#  
   // CŨ (Gây lỗi double packing)  
   // public Sprite background;  
   // public Sprite enemyIcon;

   // MỚI (Tối ưu)  
   using UnityEngine.AddressableAssets;

   public AssetReferenceAtlasedSprite backgroundRef;  
   public AssetReferenceAtlasedSprite enemyIconRef;

2. **Logic Reuse cho Level 201+:**  
   * Level 201 reuse hình ảnh của Level 015\.  
   * Trong LevelData\_201 (SO), bạn gán backgroundRef trỏ tới cùng một AssetReference (cùng GUID) như trong LevelData\_015.  
   * Khi build:  
     * Atlas\_Bundle\_01 (chứa ảnh Lv1-20) được build.  
     * LevelData\_Bundle\_201 được build. Nó chứa references trỏ về nội dung trong Atlas\_Bundle\_01.  
   * Khi runtime (Level 201):  
     * Game yêu cầu load LevelData\_201.  
     * Game đọc backgroundRef.  
     * Hệ thống Addressables kiểm tra: Asset này nằm ở đâu? \-\> Nó nằm trong Atlas\_Bundle\_01.  
     * Hệ thống tự động tải Atlas\_Bundle\_01 (nếu chưa có) và trả về Sprite chính xác.  
   * **Kết quả:** KHÔNG có texture nào bị nhân bản. Draw call được tối ưu vì dùng chung Atlas texture.

### **4.3. Runtime Implementation**

Khi sử dụng AssetReference, bạn không thể truy cập .sprite trực tiếp. Bạn phải tải nó bất đồng bộ (asynchronous).8

C\#

// Runtime Code Example  
public void LoadLevelImage(AssetReferenceAtlasedSprite refSprite, Image targetImage) {  
    refSprite.LoadAssetAsync\<Sprite\>().Completed \+= (handle) \=\> {  
        if (handle.Status \== AsyncOperationStatus.Succeeded) {  
            targetImage.sprite \= handle.Result;  
        }  
    };  
}

Lưu ý: Cần quản lý việc Release asset khi chuyển màn chơi để tránh rò rỉ bộ nhớ.

## ---

**5\. Hướng Dẫn Markdown Cho Code Assistant Agent**

Dưới đây là phần nội dung kỹ thuật chi tiết được soạn thảo để bạn có thể cung cấp trực tiếp cho một AI Agent (hoặc lập trình viên tool) nhằm xây dựng công cụ tự động hóa quá trình "gộp bundle" và "fix reference". Hướng dẫn này bao gồm logic xử lý dữ liệu, quy tắc validation và cấu trúc code.

# ---

**Specification for Unity Addressables Optimization Tool**

Role: Expert Unity Tool Developer.  
Objective: Create a comprehensive Editor Tool to automate the optimization of Addressable Groups, fix "Double Packing" of sprites, and enforce a "Chunking" bundle strategy for a project with 500+ levels.

### **1\. Functional Requirements**

#### **A. Dependency Analysis & Double Packing Detection**

The tool must scan all LevelData ScriptableObjects and detect "Hard References" to Sprites that are already part of a SpriteAtlas.

* **Logic:**  
  1. Build a cache mapping: Dictionary\<SpriteGUID, AtlasPath\>. Iterate all SpriteAtlas assets in the project, retrieve their packed sprites, and populate the map.  
  2. Iterate all LevelData assets (ScriptableObjects).  
  3. Inspect serialized properties. If a property is of type Sprite (Hard Reference):  
     * Check if the Sprite's GUID exists in the Atlas Map.  
     * **Condition:** If Sprite is in Map AND LevelData references the Sprite directly (Source Texture) $\\rightarrow$ **FLAG AS ERROR (Double Packing Risk)**.  
     * **Reasoning:** Direct reference causes implicit inclusion of the source texture, while the Atlas includes the packed texture.

#### **B. Automated Refactoring (Smart Conversion)**

The tool should provide a "Fix" button to convert Hard References to AssetReferenceAtlasedSprite.

* **Refactoring Logic:**  
  * Since changing a field type from Sprite to AssetReferenceAtlasedSprite in C\# breaks data serialization (Unity will lose the reference), the tool must:  
    1. Read the current Sprite reference.  
    2. Store the mapping LevelDataPath \-\> SpriteGUID.  
    3. Wait for the user to update the C\# script (change type to AssetReferenceAtlasedSprite).  
    4. Repopulate the new AssetReferenceAtlasedSprite fields using the stored GUIDs.  
  * *Note:* Programmatically setting AssetReference requires using the SetEditorAsset or SetEditorSubObject API (since it's a sub-asset of the Atlas).7

#### **C. Intelligent Grouping (Auto-Bundling)**

The tool must reorganize Addressable Groups based on the "Chunking Strategy" to optimize I/O.

* **Target Structure:**  
  * **Atlases:**  
    * Levels 1-100: Create groups Atlas\_Chunk\_01 to Atlas\_Chunk\_10 (each containing \~10 atlases).  
    * Levels 101-500: Create groups Atlas\_Chunk\_11 onwards.  
    * **CRITICAL:** Set BundledAssetGroupSchema.BundleMode to PackTogether for ALL Atlas groups. Explicitly disable PackSeparately.  
  * **Level Data:**  
    * Create groups LevelData\_Chunk\_01 (1-100), LevelData\_Chunk\_02 (101-200), etc.  
    * Set BundleMode to PackTogether.

### **2\. Implementation Guide (C\# Pseudo-Code)**

#### **Step 1: Atlas Mapper**

C\#

// Helper to map every sprite to its atlas  
public Dictionary\<string, string\> BuildSpriteToAtlasMap() {  
    var map \= new Dictionary\<string, string\>();  
    var atlases \= AssetDatabase.FindAssets("t:SpriteAtlas");  
    foreach (var guid in atlases) {  
        var path \= AssetDatabase.GUIDToAssetPath(guid);  
        var atlas \= AssetDatabase.LoadAssetAtPath\<SpriteAtlas\>(path);  
          
        // Use SpriteAtlasExtensions (Editor only) to get packed sprites  
        SerializedObject so \= new SerializedObject(atlas);  
        SerializedProperty packables \= so.FindProperty("m\_PackedSprites");   
        // Iterate packables, if type is Sprite, add GUID to map  
    }  
    return map;  
}

#### **Step 2: Validator Logic**

C\#

public void ValidateLevelData(LevelData data, Dictionary\<string, string\> atlasMap) {  
    SerializedObject so \= new SerializedObject(data);  
    SerializedProperty iterator \= so.GetIterator();  
    while (iterator.NextVisible(true)) {  
        if (iterator.propertyType \== SerializedPropertyType.ObjectReference) {  
            var obj \= iterator.objectReferenceValue;  
            if (obj is Sprite sprite) {  
                string spriteGuid \= AssetDatabase.AssetPathToGUID(AssetDatabase.GetAssetPath(sprite));  
                if (atlasMap.ContainsKey(spriteGuid)) {  
                    Debug.LogError($" LevelData {data.name} has hard ref to {sprite.name} which is in Atlas {atlasMap\[spriteGuid\]}. Change to AssetReferenceAtlasedSprite\!");  
                }  
            }  
        }  
    }  
}

#### **Step 3: Group Organization Logic**

C\#

public void OrganizeGroups() {  
    var settings \= AddressableAssetSettingsDefaultObject.Settings;  
      
    // Example: Create Chunk for Atlases 101-110  
    var group \= settings.FindGroup("Atlas\_Chunk\_101\_110");  
    if (group \== null) group \= settings.CreateGroup("Atlas\_Chunk\_101\_110", false, false, true, null, typeof(BundledAssetGroupSchema));  
      
    var schema \= group.GetSchema\<BundledAssetGroupSchema\>();  
    schema.BundleMode \= BundledAssetGroupSchema.BundlePackingMode.PackTogether; // FORCE PACK TOGETHER  
      
    // Add assets to group  
    //...  
}

### **3\. Usage Workflow for User**

1. Run **"Analyze Dependencies"**: Tool prints all SOs causing double packing.  
2. User updates C\# scripts (public Sprite \-\> public AssetReferenceAtlasedSprite).  
3. Run **"Restore References"**: Tool re-links data using the correct Atlas Sub-object references.  
4. Run **"Auto-Group Bundles"**: Tool moves assets into the defined Chunk structure (Pack Together).  
5. **Result:** Zero duplication, optimized draw calls, organized bundles.

## ---

**6\. Phân Tích Lợi Ích Của Giải Pháp Đề Xuất**

Việc áp dụng kiến trúc mới với AssetReferenceAtlasedSprite và chiến lược Pack Together theo cụm (Chunking) sẽ mang lại các chỉ số hiệu năng cụ thể:

| Tiêu Chí | Hiện Tại (Pack Separately \+ Hard Ref) | Đề Xuất (Chunking \+ AssetRef) | Giải Thích |
| :---- | :---- | :---- | :---- |
| **Kích Thước Build (APK)** | **Lớn** (Double Packing) | **Tối Ưu** (Zero Duplication) | Loại bỏ hoàn toàn bản sao của Sprite gốc trong bundle Level Data. |
| **Draw Calls** | **Cao** (Broken Batching) | **Thấp** (Perfect Batching) | Level 201+ sử dụng chính xác texture trong Atlas, cho phép GPU gộp lệnh vẽ. |
| **Thời Gian Tải (I/O)** | **Chậm** (100+ requests) | **Nhanh** (10-20 requests) | Giảm overhead của việc mở file và bắt tay (handshake) khi tải bundle. |
| **Quản Lý Bộ Nhớ** | **Lãng Phí** (Metadata overhead) | **Hiệu Quả** | Giảm lượng RAM tiêu tốn cho việc duy trì bảng mapping của hàng trăm bundle nhỏ. |
| **Khả Năng Mở Rộng** | Khó (Level mới dễ lỗi reuse) | Dễ Dàng | Quy trình reuse level trở nên trong suốt thông qua AssetReference. |

## **7\. Kết Luận và Lộ Trình Triển Khai**

Vấn đề "Double Packing" và khó khăn trong việc reuse asset tại level cao của dự án xuất phát từ sự xung đột giữa cách Unity Editor xử lý tham chiếu trực tiếp và cách Addressables đóng gói tài nguyên. Việc cố gắng giữ tham chiếu Sprite truyền thống trong ScriptableObject khi sử dụng Addressables và Sprite Atlas là nguyên nhân chính.

**Lộ trình triển khai ngay lập tức:**

1. **Dừng ngay việc dùng "Pack Separately" cho các Atlas nhỏ.** Hãy gộp chúng lại thành các nhóm lớn hơn (Pack Together) để tối ưu hóa I/O.  
2. **Refactor Code:** Chuyển đổi các field Sprite trong ScriptableObject sang AssetReferenceAtlasedSprite. Đây là bước bắt buộc để hệ thống Addressables hoạt động đúng thiết kế.  
3. **Xây dựng Tool:** Sử dụng bản thiết kế ở Mục 5 để tạo công cụ tự động hóa, giúp quét và sửa lỗi cho 500 level hiện tại một cách an toàn.  
4. **Kiểm Thử:** Sử dụng công cụ "Addressables Analyze" có sẵn trong Unity (Window \> Asset Management \> Addressables \> Analyze) và chạy rule "Check Scene to Addressable Duplicate Dependencies" (hoặc custom rule tương tự cho SO) để xác nhận không còn tài nguyên nào bị nhân bản.12

Bằng cách tuân thủ kiến trúc này, dự án sẽ đạt được sự cân bằng tối ưu giữa kích thước ứng dụng, hiệu năng runtime và khả năng bảo trì lâu dài.

---

*(Hết báo cáo)*

#### **Works cited**

1. Build sprite atlases | Addressables | 2.0.8 \- Unity \- Manual, accessed December 28, 2025, [https://docs.unity3d.com/Packages/com.unity.addressables@2.0/manual/AddressablesAndSpriteAtlases.html](https://docs.unity3d.com/Packages/com.unity.addressables@2.0/manual/AddressablesAndSpriteAtlases.html)  
2. Sprite Atlas… or should I say, Mr. Sprite Duplicator? : r/Unity3D \- Reddit, accessed December 28, 2025, [https://www.reddit.com/r/Unity3D/comments/1jjiuk8/sprite\_atlas\_or\_should\_i\_say\_mr\_sprite\_duplicator/](https://www.reddit.com/r/Unity3D/comments/1jjiuk8/sprite_atlas_or_should_i_say_mr_sprite_duplicator/)  
3. Unity Addressables & SpriteAtlas: How to Efficiently Use Sprites | TheGamedev.Guru, accessed December 28, 2025, [https://thegamedev.guru/unity-addressables/spriteatlas-save-memory/](https://thegamedev.guru/unity-addressables/spriteatlas-save-memory/)  
4. Pack groups into AssetBundles | Addressables | 2.5.0 \- Unity \- Manual, accessed December 28, 2025, [https://docs.unity3d.com/Packages/com.unity.addressables@2.5/manual/PackingGroupsAsBundles.html](https://docs.unity3d.com/Packages/com.unity.addressables@2.5/manual/PackingGroupsAsBundles.html)  
5. Tales from the optimization trenches: Saving memory with Addressables \- Unity, accessed December 28, 2025, [https://unity.com/blog/technology/tales-from-the-optimization-trenches-saving-memory-with-addressables](https://unity.com/blog/technology/tales-from-the-optimization-trenches-saving-memory-with-addressables)  
6. Packing groups into AssetBundles | Addressables | 1.20.5 \- Unity \- Manual, accessed December 28, 2025, [https://docs.unity3d.com/Packages/com.unity.addressables@1.20/manual/PackingGroupsAsBundles.html](https://docs.unity3d.com/Packages/com.unity.addressables@1.20/manual/PackingGroupsAsBundles.html)  
7. Method SetEditorAsset | Addressables | 2.5.0 \- Unity \- Manual, accessed December 28, 2025, [https://docs.unity3d.com/Packages/com.unity.addressables@2.5/api/UnityEngine.AddressableAssets.AssetReference.SetEditorAsset.html](https://docs.unity3d.com/Packages/com.unity.addressables@2.5/api/UnityEngine.AddressableAssets.AssetReference.SetEditorAsset.html)  
8. Unity Loading Sprites with Addressables \- Stack Overflow, accessed December 28, 2025, [https://stackoverflow.com/questions/58211306/unity-loading-sprites-with-addressables](https://stackoverflow.com/questions/58211306/unity-loading-sprites-with-addressables)  
9. How to load player sprite in runtime. Unity \- Stack Overflow, accessed December 28, 2025, [https://stackoverflow.com/questions/56009252/how-to-load-player-sprite-in-runtime-unity](https://stackoverflow.com/questions/56009252/how-to-load-player-sprite-in-runtime-unity)  
10. Loading Addressable assets | Addressables | 1.20.5 \- Unity \- Manual, accessed December 28, 2025, [https://docs.unity3d.com/Packages/com.unity.addressables@1.20/manual/LoadingAddressableAssets.html](https://docs.unity3d.com/Packages/com.unity.addressables@1.20/manual/LoadingAddressableAssets.html)  
11. Method SetEditorSubObject | Addressables | 2.2.2 \- Unity \- Manual, accessed December 28, 2025, [https://docs.unity3d.com/Packages/com.unity.addressables@2.2//api/UnityEngine.AddressableAssets.AssetReference.SetEditorSubObject.html](https://docs.unity3d.com/Packages/com.unity.addressables@2.2//api/UnityEngine.AddressableAssets.AssetReference.SetEditorSubObject.html)  
12. Addressables Analyze | Package Manager UI website \- Unity \- Manual, accessed December 28, 2025, [https://docs.unity3d.com/Packages/com.unity.addressables@1.1/manual/AddressableAssetsAnalyze.html](https://docs.unity3d.com/Packages/com.unity.addressables@1.1/manual/AddressableAssetsAnalyze.html)  
13. Analyze tool | Addressables | 1.21.21 \- Unity \- Manual, accessed December 28, 2025, [https://docs.unity3d.com/Packages/com.unity.addressables@1.21/manual/AnalyzeTool.html](https://docs.unity3d.com/Packages/com.unity.addressables@1.21/manual/AnalyzeTool.html)