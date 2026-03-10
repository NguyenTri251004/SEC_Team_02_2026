# Domain Model: Hệ thống Quản lý Kho (Inventory Management System)

Tài liệu này mô tả chi tiết mô hình dữ liệu, các thực thể nghiệp vụ và quy tắc chuyển đổi trạng thái.

Dựa trên [Inventory Management System Database Schema](https://nhbien.github.io/inventory-mangement-system-database-schema/)

---

## 1. Tổng quan Entity Relationship

```
Materials ──1:N──► InventoryLots ──1:N──► InventoryTransactions
    │                    │
    │                    ├──1:N──► QCTests
    │                    │
    │                    └──1:N──► BatchComponents ◄──N:1── ProductionBatches
    │                                                              │
    └──────────────────1:N (product_id)───────────────────────────┘

LabelTemplates ──used by──► InventoryLots (Raw Material, API, Status labels)
LabelTemplates ──used by──► ProductionBatches (Finished Product, Intermediate labels)

Users (standalone - manages all operations)
```

---

## 2. Mô hình Thực thể (Entities)

### 2.1. Users (Người dùng)

Quản lý tài khoản người dùng và phân quyền trong hệ thống.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| user_id | STRING(36) | PK, NOT NULL | UUID primary key (= Keycloak sub) |
| username | STRING(50) | NOT NULL, UNIQUE | Tên đăng nhập |
| email | STRING(100) | NOT NULL, UNIQUE | Email (validated) |
| role | ENUM | NOT NULL, default: 'Viewer' | Vai trò người dùng |
| is_active | BOOLEAN | default: true | Trạng thái tài khoản |
| last_login | DATE | nullable | Lần đăng nhập cuối |
| created_date | DATE | default: NOW | Ngày tạo |
| modified_date | DATE | default: NOW | Ngày cập nhật |

**ENUM role:**
- `Admin` - Quản trị toàn bộ hệ thống
- `InventoryManager` - Quản lý kho, nhập/xuất hàng
- `QualityControl` - Kiểm tra chất lượng
- `Production` - Sản xuất
- `Viewer` - Chỉ xem

---

### 2.2. Materials (Nguyên vật liệu)

Master data cho nguyên vật liệu, API, bao bì, v.v.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| material_id | STRING(20) | PK, NOT NULL | Mã định danh vật liệu |
| part_number | STRING(20) | NOT NULL, UNIQUE | Mã part (PART-xxxxx) |
| material_name | STRING(100) | NOT NULL | Tên hiển thị |
| material_type | ENUM | NOT NULL | Loại vật liệu |
| storage_conditions | STRING(100) | nullable | Điều kiện bảo quản |
| specification_document | STRING(50) | nullable | Tài liệu quy cách |
| created_date | DATE | default: NOW | Ngày tạo |
| modified_date | DATE | default: NOW | Ngày cập nhật |

**ENUM material_type:**
- `API` - Active Pharmaceutical Ingredient
- `Excipient` - Tá dược
- `Dietary Supplement` - Thực phẩm chức năng
- `Container` - Bao bì
- `Closure` - Nắp đậy
- `Process Chemical` - Hóa chất sản xuất
- `Testing Material` - Vật liệu thử nghiệm

---

### 2.3. LabelTemplates (Mẫu nhãn)

Mẫu nhãn để in cho nguyên vật liệu và sản phẩm.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| template_id | STRING(20) | PK, NOT NULL | Mã mẫu nhãn |
| template_name | STRING(100) | NOT NULL | Tên mẫu |
| label_type | ENUM | NOT NULL | Loại nhãn |
| template_content | TEXT | NOT NULL | Nội dung/layout nhãn |
| width | DECIMAL(5,2) | NOT NULL | Chiều rộng (inches) |
| height | DECIMAL(5,2) | NOT NULL | Chiều cao (inches) |
| created_date | DATE | default: NOW | Ngày tạo |
| modified_date | DATE | default: NOW | Ngày cập nhật |

**ENUM label_type:**
- `Raw Material` - Nhãn nguyên liệu thô
- `API` - Nhãn cho vật liệu có material_type = `API`
- `Sample` - Nhãn mẫu thử
- `Intermediate` - Nhãn sản phẩm trung gian
- `Finished Product` - Nhãn thành phẩm
- `Status` - Nhãn trạng thái (Quarantine/Accepted/Rejected)

**Quy tắc Label Generation:**
> Label được generate từ dữ liệu của **InventoryLot** hoặc **ProductionBatch**, KHÔNG phải từ Transaction.

**Quy tắc phân loại Label theo Material Type:**
- Nếu `Materials.material_type = 'API'` → label_type = `API`.
- Nếu `Materials.material_type ≠ 'API'` → label_type = `Raw Material`.

| Label Type | Data Source | Thời điểm generate |
|------------|-------------|-------------------|
| Raw Material | InventoryLot + Material | Khi nhận hàng vào kho |
| Sample | InventoryLot (is_sample=true) + Material | Khi tạo lô mẫu thử (Split) |
| API | InventoryLot + Material | Khi nhận API |
| Status | InventoryLot (status) | Khi status thay đổi |
| Intermediate | ProductionBatch | Trong quá trình sản xuất |
| Finished Product | ProductionBatch + Material | Khi batch hoàn thành |

---

### 2.4. InventoryLots (Lô hàng)

Các lô hàng cụ thể của một nguyên vật liệu (mỗi đợt nhận hàng là một lot).

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| lot_id | STRING(36) | PK, NOT NULL | UUID primary key |
| material_id | STRING(20) | FK→Materials, NOT NULL | Vật liệu của lô |
| manufacturer_name | STRING(100) | NOT NULL | Tên nhà sản xuất |
| manufacturer_lot | STRING(50) | NOT NULL | Số lô của nhà sản xuất |
| supplier_name | STRING(100) | nullable | Tên nhà cung cấp |
| received_date | DATEONLY | NOT NULL | Ngày nhận hàng |
| expiration_date | DATEONLY | NOT NULL | Ngày hết hạn |
| in_use_expiration_date | DATEONLY | nullable | Hạn sử dụng sau khi mở |
| status | ENUM | NOT NULL | Trạng thái lô hàng |
| quantity | DECIMAL(10,3) | NOT NULL | Số lượng hiện tại |
| unit_of_measure | STRING(10) | NOT NULL | Đơn vị (kg, L, each) |
| storage_location | STRING(50) | nullable | Vị trí kho |
| is_sample | BOOLEAN | default: false | Có phải lô mẫu |
| parent_lot_id | STRING(36) | FK→InventoryLots, nullable | Lô gốc (nếu split) |
| po_number | STRING(30) | nullable | Số PO |
| receiving_form_id | STRING(50) | nullable | Mã phiếu nhận hàng |
| created_date | DATE | default: NOW | Ngày tạo |
| modified_date | DATE | default: NOW | Ngày cập nhật |

**ENUM status:**
- `Quarantine` - Đang chờ kiểm định (mặc định khi nhập kho)
- `Accepted` - Đã qua QC, được phép sử dụng
- `Rejected` - Không đạt QC
- `Depleted` - Đã hết hàng (quantity = 0)

**Quy tắc nghiệp vụ quan trọng:**
> **AUTO-BLOCK:** Hệ thống tự động **CHẶN** mọi thao tác xuất kho đối với các lô hàng có:
> - Status = `Rejected`
> - Status = `Quarantine` (chưa qua QC)
> - Đã quá `expiration_date`

---

### 2.5. InventoryTransactions (Giao dịch kho)

Lịch sử di chuyển và sử dụng của mỗi lô hàng.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| transaction_id | STRING(36) | PK, NOT NULL | UUID primary key |
| lot_id | STRING(36) | FK→InventoryLots, NOT NULL | Lô bị ảnh hưởng |
| transaction_type | ENUM | NOT NULL | Loại giao dịch |
| quantity | DECIMAL(10,3) | NOT NULL | Số lượng (+/-) |
| unit_of_measure | STRING(10) | NOT NULL | Đơn vị |
| reference_id | STRING(50) | nullable | ID tham chiếu (batch, order) |
| notes | TEXT | nullable | Ghi chú |
| performed_by | STRING(50) | NOT NULL | Người thực hiện |
| transaction_date | DATE | NOT NULL, default: NOW | Ngày thực hiện |
| created_date | DATE | default: NOW | Ngày tạo |

**ENUM transaction_type:**
| Type | Mô tả | Quantity Effect |
|------|-------|-----------------|
| `Receipt` | Nhận hàng vào kho | +quantity |
| `Usage` | Sử dụng cho production | -quantity |
| `Split` | Chia lô hàng (tạo lô mẫu/lô con) | -quantity (từ lô gốc) |
| `Transfer` | Chuyển location | 0 (chỉ đổi location) |
| `Adjustment` | Điều chỉnh số lượng | ±quantity |
| `Disposal` | Hủy bỏ | -quantity |

---

### 2.6. QCTests (Kiểm tra chất lượng)

Kết quả kiểm tra chất lượng cho các lô hàng.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| test_id | STRING(36) | PK, NOT NULL | UUID primary key |
| lot_id | STRING(36) | FK→InventoryLots, NOT NULL | Lô được kiểm tra |
| test_type | ENUM | NOT NULL | Loại test |
| test_method | STRING(100) | NOT NULL | Phương pháp/SOP |
| test_date | DATEONLY | NOT NULL | Ngày thực hiện |
| test_result | STRING(100) | NOT NULL | Kết quả |
| acceptance_criteria | STRING(200) | nullable | Tiêu chí chấp nhận |
| result_status | ENUM | NOT NULL | Trạng thái kết quả |
| performed_by | STRING(50) | NOT NULL | Người thực hiện |
| verified_by | STRING(50) | nullable | Người xác nhận |
| created_date | DATE | default: NOW | Ngày tạo |
| modified_date | DATE | default: NOW | Ngày cập nhật |

**ENUM test_type:**
- `Identity` - Định danh
- `Potency` - Hiệu lực
- `Microbial` - Vi sinh
- `Growth Promotion` - Xúc tiến tăng trưởng
- `Physical` - Vật lý
- `Chemical` - Hóa học

**ENUM result_status:**
- `Pass` - Đạt
- `Fail` - Không đạt
- `Pending` - Đang chờ

---

### 2.7. ProductionBatches (Lô sản xuất)

Các đợt sản xuất sản phẩm.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| batch_id | STRING(36) | PK, NOT NULL | UUID primary key |
| product_id | STRING(20) | FK→Materials, NOT NULL | Sản phẩm (Material) |
| batch_number | STRING(50) | NOT NULL, UNIQUE | Số lô sản xuất |
| batch_size | DECIMAL(10,3) | NOT NULL | Kích thước lô |
| unit_of_measure | STRING(10) | NOT NULL | Đơn vị |
| manufacture_date | DATEONLY | NOT NULL | Ngày sản xuất |
| expiration_date | DATEONLY | NOT NULL | Ngày hết hạn |
| status | ENUM | NOT NULL | Trạng thái |
| created_date | DATE | default: NOW | Ngày tạo |
| modified_date | DATE | default: NOW | Ngày cập nhật |

**ENUM status:**
- `Planned` - Đã lên kế hoạch
- `In Progress` - Đang sản xuất
- `Complete` - Hoàn thành
- `Rejected` - Bị từ chối

---

### 2.8. BatchComponents (Thành phần lô sản xuất)

Liên kết lô sản xuất với các lô nguyên liệu được sử dụng.

| Column | Type | Constraints | Mô tả |
|--------|------|-------------|-------|
| component_id | STRING(36) | PK, NOT NULL | UUID primary key |
| batch_id | STRING(36) | FK→ProductionBatches, NOT NULL | Lô sản xuất |
| lot_id | STRING(36) | FK→InventoryLots, NOT NULL | Lô nguyên liệu |
| planned_quantity | DECIMAL(10,3) | NOT NULL | Số lượng dự kiến |
| actual_quantity | DECIMAL(10,3) | nullable | Số lượng thực tế |
| unit_of_measure | STRING(10) | NOT NULL | Đơn vị |
| addition_date | DATE | nullable | Ngày thêm component |
| added_by | STRING(50) | nullable | Người thêm |
| created_date | DATE | default: NOW | Ngày tạo |
| modified_date | DATE | default: NOW | Ngày cập nhật |

---

## 3. Sơ đồ Quan hệ (Entity Relationship Diagram)

```mermaid
erDiagram
    Users {
        string user_id PK
        string username UK
        string email UK
        enum role "Admin|InventoryManager|QualityControl|Production|Viewer"
        boolean is_active
        date last_login
        date created_date
        date modified_date
    }

    Materials {
        string material_id PK
        string part_number UK
        string material_name
        enum material_type "API|Excipient|DietarySupplement|Container|Closure|ProcessChemical|TestingMaterial"
        string storage_conditions
        string specification_document
        date created_date
        date modified_date
    }

    LabelTemplates {
        string template_id PK
        string template_name
        enum label_type "RawMaterial|API|Intermediate|FinishedProduct|Status"
        text template_content
        decimal width
        decimal height
        date created_date
        date modified_date
    }

    InventoryLots {
        string lot_id PK
        string material_id FK
        string manufacturer_name
        string manufacturer_lot
        string supplier_name
        date received_date
        date expiration_date
        date in_use_expiration_date
        enum status "Quarantine|Accepted|Rejected|Depleted"
        decimal quantity
        string unit_of_measure
        string storage_location
        boolean is_sample
        string parent_lot_id FK
        string po_number
        string receiving_form_id
        date created_date
        date modified_date
    }

    InventoryTransactions {
        string transaction_id PK
        string lot_id FK
        enum transaction_type "Receipt|Usage|Transfer|Adjustment|Disposal"
        decimal quantity
        string unit_of_measure
        string reference_id
        text notes
        string performed_by
        date transaction_date
        date created_date
    }

    QCTests {
        string test_id PK
        string lot_id FK
        enum test_type "Identity|Potency|Microbial|GrowthPromotion|Physical|Chemical"
        string test_method
        date test_date
        string test_result
        string acceptance_criteria
        enum result_status "Pass|Fail|Pending"
        string performed_by
        string verified_by
        date created_date
        date modified_date
    }

    ProductionBatches {
        string batch_id PK
        string product_id FK
        string batch_number UK
        decimal batch_size
        string unit_of_measure
        date manufacture_date
        date expiration_date
        enum status "Planned|InProgress|Complete|Rejected"
        date created_date
        date modified_date
    }

    BatchComponents {
        string component_id PK
        string batch_id FK
        string lot_id FK
        decimal planned_quantity
        decimal actual_quantity
        string unit_of_measure
        date addition_date
        string added_by
        date created_date
        date modified_date
    }

    Materials ||--o{ InventoryLots : "has lots"
    Materials ||--o{ ProductionBatches : "is product"
    InventoryLots ||--o{ InventoryTransactions : "has transactions"
    InventoryLots ||--o{ QCTests : "has tests"
    InventoryLots ||--o{ BatchComponents : "used in"
    InventoryLots ||--o{ InventoryLots : "parent of (split)"
    ProductionBatches ||--o{ BatchComponents : "contains"
    LabelTemplates ||--o{ InventoryLots : "labels for"
    LabelTemplates ||--o{ ProductionBatches : "labels for"
```

---

## 4. Biểu đồ Trạng thái Lô hàng (InventoryLot State Diagram)

```mermaid
stateDiagram-v2
    [*] --> Quarantine : 1. Receive Material (Nhập kho)
    
    state Quarantine {
        [*] --> WaitingQC
        WaitingQC --> Testing : QC performs tests
    }

    Quarantine --> Accepted : 2. All QC Tests Pass
    Quarantine --> Rejected : 2. Any QC Test Fail

    Accepted --> Depleted : 3. quantity = 0 (Usage)
    Accepted --> Rejected : 4. Expired / Re-test Fail

    state Rejected {
        [*] --> Locked
        Locked --> Disposal : Tiêu hủy
        Locked --> Return : Trả nhà cung cấp
    }

    Depleted --> [*]
    Disposal --> [*]
    Return --> [*]

    note right of Quarantine
        Trạng thái mặc định khi nhập kho.
        Không được phép xuất cho sản xuất.
    end note

    note right of Rejected
        AUTO-BLOCK: Không cho phép
        sử dụng cho production.
    end note
```

---

## 5. Biểu đồ Trạng thái Lô Sản xuất (ProductionBatch State Diagram)

```mermaid
stateDiagram-v2
    [*] --> Planned : Create Batch

    Planned --> InProgress : Start Production
    
    state InProgress {
        [*] --> AddComponents
        AddComponents --> Processing : Add BatchComponents
        Processing --> QCCheck : Production complete
    }

    InProgress --> Complete : QC Pass
    InProgress --> Rejected : QC Fail

    Complete --> [*] : Generate Finished Product Label
    Rejected --> [*] : Disposal/Investigation

    note right of Planned
        Batch đã được lên kế hoạch.
        Chưa sử dụng nguyên liệu.
    end note

    note right of InProgress
        Đang sản xuất.
        Nguyên liệu được tiêu thụ (Usage).
    end note
```

---

## 6. Luồng Nghiệp vụ Chính (Main Workflow)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            INVENTORY MANAGEMENT WORKFLOW                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  PHASE 0: MASTER DATA                                                           │
│  ════════════════════                                                           │
│  Users → Materials → LabelTemplates                                             │
│                                                                                 │
│  PHASE 1: RECEIVING (Nhận hàng)                                                 │
│  ══════════════════════════════                                                 │
│  Material ──► InventoryLot ──► Transaction (Receipt) ──► Label (Raw Material)  │
│               │                                                                 │
│               └── status: Quarantine (mặc định)                                 │
│                                                                                 │
│  PHASE 2: QC TESTING (Kiểm tra chất lượng)                                      │
│  ═════════════════════════════════════════                                      │
│  InventoryLot ──► QCTests (Identity, Potency, ...)                              │
│               │                                                                 │
│               ├── All Pass → status: Accepted → Label (Status)                  │
│               └── Any Fail → status: Rejected → Label (Status)                  │
│                                                                                 │
│  PHASE 3: PRODUCTION (Sản xuất)                                                 │
│  ══════════════════════════════                                                 │
│  ProductionBatch (Planned) ──► BatchComponents ──► Transaction (Usage)          │
│       │                              │                                          │
│       │                              └── Link InventoryLot to Batch             │
│       └── status: In Progress                                                   │
│                                                                                 │
│  PHASE 4: COMPLETE (Hoàn thành)                                                 │
│  ══════════════════════════════                                                 │
│  ProductionBatch ──► status: Complete ──► Label (Finished Product)              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Quy tắc Kiểm soát & Truy xuất

### 7.1. Quy tắc nhập kho (Receiving)
- Khi nhập kho, InventoryLot **tự động** có status = `Quarantine`
- Không được phép cấp phát lô này cho sản xuất cho đến khi QC approve

### 7.2. Quy tắc QC
- Tất cả QCTests phải `Pass` → Lot status = `Accepted`
- Bất kỳ QCTest nào `Fail` → Lot status = `Rejected`
- QC kết quả phải được `verified_by` (QC Supervisor) xác nhận

### 7.3. Quy tắc sử dụng (Usage)
- Chỉ lot có status = `Accepted` mới được sử dụng cho Production
- Khi thêm BatchComponent → tự động tạo Transaction type = `Usage`
- Quantity của InventoryLot giảm tương ứng

### 7.4. Quy tắc hết hạn (Expiration)
- Cronjob chạy hàng ngày kiểm tra `expiration_date`
- Nếu quá hạn → tự động chuyển status sang `Rejected` và khóa lô

### 7.5. Nhật ký hệ thống (Audit Trail)
- Mọi thay đổi số lượng → sinh InventoryTransaction
- Mọi thay đổi trạng thái → lưu trong `modified_date`
- Lưu lại: Ai làm (`performed_by`), Lúc nào (`transaction_date`), Ghi chú (`notes`)

---

## 8. Ma trận Phân quyền (User Roles & Permissions)

| Chức năng | Admin | InventoryManager | QualityControl | Production | Viewer |
|-----------|-------|------------------|----------------|------------|--------|
| Quản lý Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| CRUD Materials | ✅ | ✅ | 👁️ | 👁️ | 👁️ |
| CRUD LabelTemplates | ✅ | ✅ | ❌ | ❌ | 👁️ |
| Receive InventoryLots | ✅ | ✅ | ❌ | ❌ | 👁️ |
| Perform QCTests | ✅ | ❌ | ✅ | ❌ | 👁️ |
| Update Lot Status | ✅ | ✅ | ✅ | ❌ | 👁️ |
| Create ProductionBatch | ✅ | ❌ | ❌ | ✅ | 👁️ |
| Add BatchComponents | ✅ | ❌ | ❌ | ✅ | 👁️ |
| Generate Labels | ✅ | ✅ | ✅ | ✅ | ❌ |
| View Reports | ✅ | ✅ | ✅ | ✅ | ✅ |

**Legend:** ✅ Full Access | 👁️ View Only | ❌ No Access

---

*Document based on [Inventory Management System Database Schema](https://nhbien.github.io/inventory-mangement-system-database-schema/)*
