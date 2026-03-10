# Inventory Management System - Chi Tiết Workflow Từng Bước

Dựa trên [Inventory Management System Database Schema](https://nhbien.github.io/inventory-mangement-system-database-schema/)

---

## TỔNG QUAN: Các Bảng Trong Hệ Thống

| # | Bảng | Mô tả | Số cột |
|---|------|-------|--------|
| 1 | **Users** | Quản lý người dùng và phân quyền | 9 |
| 2 | **Materials** | Dữ liệu master về nguyên vật liệu | 8 |
| 3 | **LabelTemplates** | Mẫu nhãn in | 8 |
| 4 | **InventoryLots** | Các lô hàng nhập kho | 18 |
| 5 | **InventoryTransactions** | Lịch sử giao dịch kho | 10 |
| 6 | **QCTests** | Kết quả kiểm tra chất lượng | 12 |
| 7 | **ProductionBatches** | Lô sản xuất | 10 |
| 8 | **BatchComponents** | Thành phần nguyên liệu của lô sản xuất | 10 |

---

# ═══════════════════════════════════════════════════════════════
# PHASE 0: KHỞI TẠO DỮ LIỆU MASTER
# ═══════════════════════════════════════════════════════════════

## STEP 0.1: Tạo User (Admin tạo tài khoản người dùng)

### 📋 ACTION: INSERT vào bảng `Users`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: Users                                                                 │
│  📝 ACTION: INSERT (Tạo mới)                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┬─────────────────────────────────────────────────────────┐  │
│  │ Column          │ Value                                                   │  │
│  ├─────────────────┼─────────────────────────────────────────────────────────┤  │
│  │ user_id         │ 🆕 "a1b2c3d4-e5f6-7890-abcd-ef1234567890"              │  │
│  │ username        │ 🆕 "jdoe"                                               │  │
│  │ email           │ 🆕 "jdoe@example.com"                                   │  │
│  │ password        │ 🆕 "$2b$10$..." (bcrypt hash)                          │  │
│  │ role            │ 🆕 "InventoryManager"                                   │  │
│  │ is_active       │ 🆕 true                                                 │  │
│  │ last_login      │ 🆕 NULL                                                 │  │
│  │ created_date    │ 🆕 "2025-01-01 09:00:00"                               │  │
│  │ modified_date   │ 🆕 "2025-01-01 09:00:00"                               │  │
│  └─────────────────┴─────────────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Tạo thêm các user khác:

| user_id | username | role |
|---------|----------|------|
| user-uuid-001 | jdoe | InventoryManager |
| user-uuid-002 | qc1 | QualityControl |
| user-uuid-003 | qc_super | QualityControl |
| user-uuid-004 | prod1 | Production |
| user-uuid-005 | admin1 | Admin |

---

## STEP 0.2: Tạo Material (Định nghĩa nguyên vật liệu)

> Role thực hiện: `Admin` hoặc `InventoryManager`

### 📋 ACTION: INSERT vào bảng `Materials`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: Materials                                                             │
│  📝 ACTION: INSERT (Tạo mới)                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────┬───────────────────────────────────────────────────┐  │
│  │ Column                │ Value                                             │  │
│  ├───────────────────────┼───────────────────────────────────────────────────┤  │
│  │ material_id           │ 🆕 "MAT-001"                                      │  │
│  │ part_number           │ 🆕 "PART-10001"                                   │  │
│  │ material_name         │ 🆕 "Vitamin D3 100K"                              │  │
│  │ material_type         │ 🆕 "API"                                          │  │
│  │ storage_conditions    │ 🆕 "2-8°C, dry"                                   │  │
│  │ specification_document│ 🆕 "SPEC-API-001"                                 │  │
│  │ created_date          │ 🆕 "2025-01-01 09:00:00"                          │  │
│  │ modified_date         │ 🆕 "2025-01-01 09:00:00"                          │  │
│  └───────────────────────┴───────────────────────────────────────────────────┘  │
│                                                                                 │
│  📌 ENUM material_type: API | Excipient | Dietary Supplement | Container |      │
│                         Closure | Process Chemical | Testing Material           │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Tạo thêm Material cho sản phẩm (Finished Good):

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: Materials (Product - Finished Good)                                   │
│  📝 ACTION: INSERT (Tạo mới)                                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌───────────────────────┬───────────────────────────────────────────────────┐  │
│  │ Column                │ Value                                             │  │
│  ├───────────────────────┼───────────────────────────────────────────────────┤  │
│  │ material_id           │ 🆕 "PROD-001"                                     │  │
│  │ part_number           │ 🆕 "PART-20001"                                   │  │
│  │ material_name         │ 🆕 "Vitamin D3 Softgel 1000IU"                    │  │
│  │ material_type         │ 🆕 "Dietary Supplement"                           │  │
│  │ storage_conditions    │ 🆕 "Room temperature, dry"                        │  │
│  │ specification_document│ 🆕 "SPEC-PROD-001"                                │  │
│  │ created_date          │ 🆕 "2025-01-01 09:30:00"                          │  │
│  │ modified_date         │ 🆕 "2025-01-01 09:30:00"                          │  │
│  └───────────────────────┴───────────────────────────────────────────────────┘  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 0.3: Tạo Label Templates

### 📋 ACTION: INSERT vào bảng `LabelTemplates`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: LabelTemplates                                                        │
│  📝 ACTION: INSERT (Tạo mới - nhiều templates)                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  TEMPLATE 1: Raw Material Label                                                 │
│  ┌──────────────────┬────────────────────────────────────────────────────────┐  │
│  │ Column           │ Value                                                  │  │
│  ├──────────────────┼────────────────────────────────────────────────────────┤  │
│  │ template_id      │ 🆕 "TPL-RM-01"                                         │  │
│  │ template_name    │ 🆕 "Raw Material 2x1"                                  │  │
│  │ label_type       │ 🆕 "Raw Material"                                      │  │
│  │ template_content │ 🆕 "<material_name>\nLot: <lot_id>\nExp: <exp_date>"   │  │
│  │ width            │ 🆕 2.00                                                │  │
│  │ height           │ 🆕 1.00                                                │  │
│  │ created_date     │ 🆕 "2025-01-01 09:00:00"                               │  │
│  │ modified_date    │ 🆕 "2025-01-01 09:00:00"                               │  │
│  └──────────────────┴────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  TEMPLATE 2: Sample Label                                                       │
│  ┌──────────────────┬────────────────────────────────────────────────────────┐  │
│  │ template_id      │ 🆕 "TPL-SAM-01"                                        │  │
│  │ template_name    │ 🆕 "Sample Label 1x1"                                  │  │
│  │ label_type       │ 🆕 "Sample"                                            │  │
│  │ template_content │ 🆕 "SAMPLE\n<material_name>\nFrom: <parent_lot>"       │  │
│  │ width            │ 🆕 1.00                                                │  │
│  │ height           │ 🆕 1.00                                                │  │
│  └──────────────────┴────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  TEMPLATE 3: Status Label                                                       │
│  ┌──────────────────┬────────────────────────────────────────────────────────┐  │
│  │ template_id      │ 🆕 "TPL-STS-01"                                        │  │
│  │ template_name    │ 🆕 "Status Label 1x0.5"                                │  │
│  │ label_type       │ 🆕 "Status"                                            │  │
│  │ template_content │ 🆕 "<status>\nDate: <date>"                            │  │
│  │ width            │ 🆕 1.00                                                │  │
│  │ height           │ 🆕 0.50                                                │  │
│  └──────────────────┴────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  TEMPLATE 4: Finished Product Label                                             │
│  ┌──────────────────┬────────────────────────────────────────────────────────┐  │
│  │ template_id      │ 🆕 "TPL-FP-01"                                         │  │
│  │ template_name    │ 🆕 "Finished Product 3x2"                              │  │
│  │ label_type       │ 🆕 "Finished Product"                                  │  │
│  │ template_content │ 🆕 "<product_name>\nBatch: <batch_no>\nExp: <exp>"     │  │
│  │ width            │ 🆕 3.00                                                │  │
│  │ height           │ 🆕 2.00                                                │  │
│  └──────────────────┴────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  📌 ENUM label_type: Raw Material | Sample | Intermediate |                     │
│                      Finished Product | API | Status                            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════
# PHASE 1: NHẬN HÀNG (RECEIVING)
# ═══════════════════════════════════════════════════════════════

> **LUỒNG ĐÚNG THEO TÀI LIỆU:**
> ```
> Materials ──────► InventoryLot ──────► InventoryTransaction ──────► Label
>  (Master)         (Tạo Lot)            (Ghi nhận Receipt)        (Generate từ Lot)
>                       │                                               ▲
>                       │                                               │
>                       └───────────────────────────────────────────────┘
>                              Label data lấy từ Lot + Material
> ```

## STEP 1.1: Tạo Inventory Lot (Nhận hàng vào kho) ← BẮT BUỘC TRƯỚC

### 📋 ACTION: INSERT vào bảng `InventoryLots`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: InventoryLots                                                         │
│  📝 ACTION: INSERT (Tạo mới)                                                    │
│  👤 PERFORMED BY: jdoe (InventoryManager)                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────────┬────────────────────────────────────────────────┐  │
│  │ Column                   │ Value                                          │  │
│  ├──────────────────────────┼────────────────────────────────────────────────┤  │
│  │ lot_id                   │ 🆕 "lot-uuid-001"                              │  │
│  │ material_id              │ 🆕 "MAT-001"  ──► FK to Materials              │  │
│  │ manufacturer_name        │ 🆕 "Acme Pharma"                               │  │
│  │ manufacturer_lot         │ 🆕 "MFR-2025-001"                              │  │
│  │ supplier_name            │ 🆕 "Acme Supply"                               │  │
│  │ received_date            │ 🆕 "2025-01-10"                                │  │
│  │ expiration_date          │ 🆕 "2026-01-10"                                │  │
│  │ in_use_expiration_date   │ 🆕 NULL                                        │  │
│  │ status                   │ 🆕 "Quarantine" ⚠️ (mặc định khi nhận)        │  │
│  │ quantity                 │ 🆕 25.500                                      │  │
│  │ unit_of_measure          │ 🆕 "kg"                                        │  │
│  │ storage_location         │ 🆕 "WH-A-12"                                   │  │
│  │ is_sample                │ 🆕 false                                       │  │
│  │ parent_lot_id            │ 🆕 NULL                                        │  │
│  │ po_number                │ 🆕 "PO-12345"                                  │  │
│  │ receiving_form_id        │ 🆕 "RF-2025-001"                               │  │
│  │ created_date             │ 🆕 "2025-01-10 08:00:00"                       │  │
│  │ modified_date            │ 🆕 "2025-01-10 08:00:00"                       │  │
│  └──────────────────────────┴────────────────────────────────────────────────┘  │
│                                                                                 │
│  📌 ENUM status: Quarantine | Accepted | Rejected | Depleted                    │
│  ⚠️  Lot mới nhận LUÔN có status = "Quarantine" cho đến khi QC hoàn tất        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 1.2: Ghi nhận Transaction Receipt ← SAU KHI CÓ LOT

### 📋 ACTION: INSERT vào bảng `InventoryTransactions`

> ⚠️ **PHẢI CÓ lot_id TỪ STEP 1.1 TRƯỚC** - Transaction ghi nhận việc nhận Lot

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: InventoryTransactions                                                 │
│  📝 ACTION: INSERT (Tạo mới)                                                    │
│  🔗 DEPENDS ON: InventoryLot phải tồn tại (lot_id từ STEP 1.1)                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────┬──────────────────────────────────────────────────┐    │
│  │ Column               │ Value                                            │    │
│  ├──────────────────────┼──────────────────────────────────────────────────┤    │
│  │ transaction_id       │ 🆕 "txn-uuid-001"                                │    │
│  │ lot_id               │ 🆕 "lot-uuid-001" ──► FK to InventoryLots        │    │
│  │ transaction_type     │ 🆕 "Receipt" ✅                                  │    │
│  │ quantity             │ 🆕 +25.500   (số dương = nhập vào)               │    │
│  │ unit_of_measure      │ 🆕 "kg"                                          │    │
│  │ reference_id         │ 🆕 NULL                                          │    │
│  │ notes                │ 🆕 "Initial receipt from supplier"               │    │
│  │ performed_by         │ 🆕 "jdoe"                                        │    │
│  │ transaction_date     │ 🆕 "2025-01-10 08:00:00"                         │    │
│  │ created_date         │ 🆕 "2025-01-10 08:00:00"                         │    │
│  └──────────────────────┴──────────────────────────────────────────────────┘    │
│                                                                                 │
│  📌 ENUM transaction_type: Receipt | Usage | Split | Transfer |                 │
│                            Adjustment | Disposal                                │
│                                                                                 │
│  💡 QUANTITY RULES:                                                             │
│     • Receipt: +positive (nhập vào)                                             │
│     • Usage/Split/Disposal: -negative (xuất ra)                                 │
│     • Transfer: 0 (chỉ đổi location)                                            │
│     • Adjustment: ±any (điều chỉnh)                                             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 1.3: Generate Raw Material Label ← LABEL TỪ DỮ LIỆU LOT

### 📋 ACTION: SELECT từ `LabelTemplates` + Data từ `InventoryLots` + `Materials`

> ⚠️ **LABEL ĐƯỢC GENERATE TỪ DỮ LIỆU CỦA LOT** (không phải từ Transaction!)
> 
> Dữ liệu label bao gồm:
> - Từ **InventoryLots**: lot_id, manufacturer_lot, expiration_date, status, storage_location
> - Từ **Materials** (qua JOIN): material_name, storage_conditions

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🏷️ GENERATE LABEL                                                              │
│  📝 ACTION: SELECT template + POPULATE with LOT data (JOIN Materials)           │
│  🔗 DATA SOURCE: InventoryLots + Materials (KHÔNG phải Transaction!)            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  INPUT (Query lấy dữ liệu cho label):                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ -- Bước 1: Lấy template                                                  │   │
│  │ SELECT * FROM LabelTemplates WHERE label_type = 'Raw Material'           │   │
│  │ Result: TPL-RM-01                                                        │   │
│  │                                                                          │   │
│  │ -- Bước 2: Lấy dữ liệu từ Lot + Material                                 │   │
│  │ SELECT                                                                   │   │
│  │   l.lot_id, l.manufacturer_lot, l.expiration_date,                       │   │
│  │   l.status, l.storage_location, l.quantity,                              │   │
│  │   m.material_name, m.storage_conditions                                  │   │
│  │ FROM InventoryLots l                                                     │   │
│  │ JOIN Materials m ON l.material_id = m.material_id                        │   │
│  │ WHERE l.lot_id = 'lot-uuid-001'                                          │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  OUTPUT (Label được in):                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  ┌────────────────────────────────────────┐                              │   │
│  │  │  VITAMIN D3 100K                       │  ◄── material_name           │   │
│  │  │  Lot: lot-uuid-001                     │  ◄── lot_id                  │   │
│  │  │  Mfr Lot: MFR-2025-001                 │  ◄── manufacturer_lot        │   │
│  │  │  Exp: 2026-01-10                       │  ◄── expiration_date         │   │
│  │  │  Location: WH-A-12                     │  ◄── storage_location        │   │
│  │  │  ⚠️ QUARANTINE                         │  ◄── status                  │   │
│  │  └────────────────────────────────────────┘                              │   │
│  │  Size: 2.00" x 1.00"                                                     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 TRẠNG THÁI DATABASE SAU PHASE 1

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📊 DATABASE STATE AFTER PHASE 1 (RECEIVING)                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Materials: 2 records (MAT-001, PROD-001)                                       │
│  Users: 5 records                                                               │
│  LabelTemplates: 4 records                                                      │
│  InventoryLots: 1 record                                                        │
│    └─► lot-uuid-001: quantity=25.500 kg, status=Quarantine                      │
│  InventoryTransactions: 1 record                                                │
│    └─► txn-uuid-001: Receipt +25.500 kg                                         │
│  QCTests: 0 records                                                             │
│  ProductionBatches: 0 records                                                   │
│  BatchComponents: 0 records                                                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════
# PHASE 2: KIỂM TRA CHẤT LƯỢNG (QC TESTING)
# ═══════════════════════════════════════════════════════════════

## STEP 2.1: Tạo QC Test - Identity Test

### 📋 ACTION: INSERT vào bảng `QCTests`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: QCTests                                                               │
│  📝 ACTION: INSERT (Tạo mới)                                                    │
│  👤 PERFORMED BY: qc1 (QualityControl)                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────┬──────────────────────────────────────────────────┐    │
│  │ Column               │ Value                                            │    │
│  ├──────────────────────┼──────────────────────────────────────────────────┤    │
│  │ test_id              │ 🆕 "test-uuid-001"                               │    │
│  │ lot_id               │ 🆕 "lot-uuid-001" ──► FK to InventoryLots        │    │
│  │ test_type            │ 🆕 "Identity"                                    │    │
│  │ test_method          │ 🆕 "HPLC-IDENT-01"                               │    │
│  │ test_date            │ 🆕 "2025-01-12"                                  │    │
│  │ test_result          │ 🆕 "Match"                                       │    │
│  │ acceptance_criteria  │ 🆕 "Must match standard reference"               │    │
│  │ result_status        │ 🆕 "Pass" ✅                                     │    │
│  │ performed_by         │ 🆕 "qc1"                                         │    │
│  │ verified_by          │ 🆕 NULL (chưa verify)                            │    │
│  │ created_date         │ 🆕 "2025-01-12 14:00:00"                         │    │
│  │ modified_date        │ 🆕 "2025-01-12 14:00:00"                         │    │
│  └──────────────────────┴──────────────────────────────────────────────────┘    │
│                                                                                 │
│  📌 ENUM test_type: Identity | Potency | Microbial | Growth Promotion |         │
│                     Physical | Chemical                                         │
│  📌 ENUM result_status: Pass | Fail | Pending                                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 2.2: Tạo QC Test - Potency Test

### 📋 ACTION: INSERT vào bảng `QCTests`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: QCTests                                                               │
│  📝 ACTION: INSERT (Tạo mới)                                                    │
│  👤 PERFORMED BY: qc1 (QualityControl)                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────┬──────────────────────────────────────────────────┐    │
│  │ Column               │ Value                                            │    │
│  ├──────────────────────┼──────────────────────────────────────────────────┤    │
│  │ test_id              │ 🆕 "test-uuid-002"                               │    │
│  │ lot_id               │ 🆕 "lot-uuid-001" ──► FK to InventoryLots        │    │
│  │ test_type            │ 🆕 "Potency"                                     │    │
│  │ test_method          │ 🆕 "HPLC-POT-01"                                 │    │
│  │ test_date            │ 🆕 "2025-01-13"                                  │    │
│  │ test_result          │ 🆕 "101.2%"                                      │    │
│  │ acceptance_criteria  │ 🆕 "98.0% - 102.0% of label claim"               │    │
│  │ result_status        │ 🆕 "Pass" ✅                                     │    │
│  │ performed_by         │ 🆕 "qc1"                                         │    │
│  │ verified_by          │ 🆕 NULL                                          │    │
│  │ created_date         │ 🆕 "2025-01-13 10:00:00"                         │    │
│  │ modified_date        │ 🆕 "2025-01-13 10:00:00"                         │    │
│  └──────────────────────┴──────────────────────────────────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 2.3: Verify QC Tests (Supervisor review)

### 📋 ACTION: UPDATE bảng `QCTests`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: QCTests                                                               │
│  📝 ACTION: UPDATE (Cập nhật verified_by)                                       │
│  👤 PERFORMED BY: qc_super (QualityControl Supervisor)                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  UPDATE QCTests SET verified_by, modified_date                                  │
│  WHERE test_id IN ('test-uuid-001', 'test-uuid-002')                            │
│                                                                                 │
│  ┌──────────────────────┬──────────────────┬──────────────────────────────┐     │
│  │ Column               │ Old Value        │ New Value                    │     │
│  ├──────────────────────┼──────────────────┼──────────────────────────────┤     │
│  │ test_id              │ test-uuid-001    │ (không đổi)                  │     │
│  │ verified_by          │ NULL             │ 🔄 "qc_super"               │     │
│  │ modified_date        │ 2025-01-12 14:00 │ 🔄 "2025-01-14 09:00:00"    │     │
│  └──────────────────────┴──────────────────┴──────────────────────────────┘     │
│                                                                                 │
│  ┌──────────────────────┬──────────────────┬──────────────────────────────┐     │
│  │ Column               │ Old Value        │ New Value                    │     │
│  ├──────────────────────┼──────────────────┼──────────────────────────────┤     │
│  │ test_id              │ test-uuid-002    │ (không đổi)                  │     │
│  │ verified_by          │ NULL             │ 🔄 "qc_super"               │     │
│  │ modified_date        │ 2025-01-13 10:00 │ 🔄 "2025-01-14 09:00:00"    │     │
│  └──────────────────────┴──────────────────┴──────────────────────────────┘     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 2.4: Update Lot Status (QC Pass → Accepted)

### 📋 ACTION: UPDATE bảng `InventoryLots`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: InventoryLots                                                         │
│  📝 ACTION: UPDATE (Thay đổi status)                                            │
│  👤 PERFORMED BY: qc_super (QualityControl)                                     │
│  🔗 TRIGGER: Tất cả QC tests đã Pass và được Verify                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  UPDATE InventoryLots SET status, modified_date                                 │
│  WHERE lot_id = 'lot-uuid-001'                                                  │
│                                                                                 │
│  ⚡ THAY ĐỔI QUAN TRỌNG:                                                        │
│  ┌──────────────────────────┬─────────────────┬───────────────────────────┐     │
│  │ Column                   │ Old Value       │ New Value                 │     │
│  ├──────────────────────────┼─────────────────┼───────────────────────────┤     │
│  │ lot_id                   │ lot-uuid-001    │ (không đổi)               │     │
│  │ material_id              │ MAT-001         │ (không đổi)               │     │
│  │ manufacturer_name        │ Acme Pharma     │ (không đổi)               │     │
│  │ manufacturer_lot         │ MFR-2025-001    │ (không đổi)               │     │
│  │ supplier_name            │ Acme Supply     │ (không đổi)               │     │
│  │ received_date            │ 2025-01-10      │ (không đổi)               │     │
│  │ expiration_date          │ 2026-01-10      │ (không đổi)               │     │
│  │ in_use_expiration_date   │ NULL            │ (không đổi)               │     │
│  │ status                   │ ⚠️ Quarantine   │ ✅ 🔄 "Accepted"         │     │
│  │ quantity                 │ 25.500          │ (không đổi)               │     │
│  │ unit_of_measure          │ kg              │ (không đổi)               │     │
│  │ storage_location         │ WH-A-12         │ (không đổi)               │     │
│  │ is_sample                │ false           │ (không đổi)               │     │
│  │ parent_lot_id            │ NULL            │ (không đổi)               │     │
│  │ po_number                │ PO-12345        │ (không đổi)               │     │
│  │ receiving_form_id        │ RF-2025-001     │ (không đổi)               │     │
│  │ created_date             │ 2025-01-10 08:00│ (không đổi)               │     │
│  │ modified_date            │ 2025-01-10 08:00│ 🔄 "2025-01-14 09:30:00" │     │
│  └──────────────────────────┴─────────────────┴───────────────────────────┘     │
│                                                                                 │
│  💡 STATUS CHANGE: Quarantine ──► Accepted                                      │
│     Lot này giờ có thể được sử dụng cho production                              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 2.5: Generate Status Label (Accepted)

### 📋 ACTION: SELECT từ `LabelTemplates` + Data từ `InventoryLots`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🏷️ GENERATE LABEL                                                              │
│  📝 ACTION: SELECT template WHERE label_type = 'Status'                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  OUTPUT (Label được in - dán đè lên label cũ):                                  │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  ┌────────────────────────────────────────┐                              │   │
│  │  │  ✅ ACCEPTED                           │  ◄── status                  │   │
│  │  │  Date: 2025-01-14                      │  ◄── modified_date           │   │
│  │  │  By: qc_super                          │  ◄── verified_by             │   │
│  │  └────────────────────────────────────────┘                              │   │
│  │  Size: 1.00" x 0.50"                                                     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 TRẠNG THÁI DATABASE SAU PHASE 2

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📊 DATABASE STATE AFTER PHASE 2 (QC TESTING)                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Materials: 2 records (MAT-001, PROD-001)                                       │
│  Users: 5 records                                                               │
│  LabelTemplates: 4 records                                                      │
│  InventoryLots: 1 record                                                        │
│    └─► lot-uuid-001: quantity=25.500 kg, status=✅Accepted (đã thay đổi!)       │
│  InventoryTransactions: 1 record                                                │
│    └─► txn-uuid-001: Receipt +25.500 kg                                         │
│  QCTests: 2 records (MỚI!)                                                      │
│    ├─► test-uuid-001: Identity, Pass, verified by qc_super                      │
│    └─► test-uuid-002: Potency, Pass, verified by qc_super                       │
│  ProductionBatches: 0 records                                                   │
│  BatchComponents: 0 records                                                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════
# PHASE 3: TẠO LÔ SẢN XUẤT (PRODUCTION BATCH)
# ═══════════════════════════════════════════════════════════════

## STEP 3.1: Tạo Production Batch

### 📋 ACTION: INSERT vào bảng `ProductionBatches`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: ProductionBatches                                                     │
│  📝 ACTION: INSERT (Tạo lô sản xuất mới)                                        │
│  👤 PERFORMED BY: prod1 (Production)                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────┬──────────────────────────────────────────────────┐    │
│  │ Column               │ Value                                            │    │
│  ├──────────────────────┼──────────────────────────────────────────────────┤    │
│  │ batch_id             │ 🆕 "batch-uuid-001"                              │    │
│  │ product_id           │ 🆕 "PROD-001" ──► FK to Materials                │    │
│  │ batch_number         │ 🆕 "PB-2025-0001"                                │    │
│  │ batch_size           │ 🆕 1000.000                                      │    │
│  │ unit_of_measure      │ 🆕 "units"                                       │    │
│  │ manufacture_date     │ 🆕 "2025-01-20"                                  │    │
│  │ expiration_date      │ 🆕 "2026-01-20"                                  │    │
│  │ status               │ 🆕 "Planned" 📋 (trạng thái ban đầu)             │    │
│  │ created_date         │ 🆕 "2025-01-18 10:00:00"                         │    │
│  │ modified_date        │ 🆕 "2025-01-18 10:00:00"                         │    │
│  └──────────────────────┴──────────────────────────────────────────────────┘    │
│                                                                                 │
│  📌 ENUM status: Planned | In Progress | Complete | Rejected                    │
│                                                                                 │
│  💡 QUAN TRỌNG:                                                                 │
│     • product_id = "PROD-001": Sản phẩm "Vitamin D3 Softgel 1000IU"             │
│     • status = "Planned": Chỉ mới lên kế hoạch, chưa bắt đầu sản xuất           │
│     • batch_size = 1000 units: Sản xuất 1000 đơn vị sản phẩm                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 3.2: Cập nhật Status → In Progress

### 📋 ACTION: UPDATE bảng `ProductionBatches`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: ProductionBatches                                                     │
│  📝 ACTION: UPDATE (Bắt đầu sản xuất)                                           │
│  👤 PERFORMED BY: prod1 (Production)                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  UPDATE ProductionBatches SET status, modified_date                             │
│  WHERE batch_id = 'batch-uuid-001'                                              │
│                                                                                 │
│  ⚡ THAY ĐỔI:                                                                   │
│  ┌──────────────────────┬─────────────────┬───────────────────────────────┐     │
│  │ Column               │ Old Value       │ New Value                     │     │
│  ├──────────────────────┼─────────────────┼───────────────────────────────┤     │
│  │ batch_id             │ batch-uuid-001  │ (không đổi)                   │     │
│  │ status               │ 📋 Planned      │ 🔄 ⚙️ "In Progress"          │     │
│  │ modified_date        │ 2025-01-18 10:00│ 🔄 "2025-01-20 08:00:00"     │     │
│  │ (các cột khác)       │ ...             │ (không đổi)                   │     │
│  └──────────────────────┴─────────────────┴───────────────────────────────┘     │
│                                                                                 │
│  💡 STATUS CHANGE: Planned ──► In Progress                                      │
│     Batch đã bắt đầu sản xuất, có thể thêm components                           │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 3.3: Thêm Batch Component (Sử dụng nguyên liệu)

### 📋 ACTION: INSERT vào bảng `BatchComponents`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: BatchComponents                                                       │
│  📝 ACTION: INSERT (Thêm nguyên liệu vào batch)                                 │
│  👤 PERFORMED BY: prod1 (Production)                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────┬──────────────────────────────────────────────────┐    │
│  │ Column               │ Value                                            │    │
│  ├──────────────────────┼──────────────────────────────────────────────────┤    │
│  │ component_id         │ 🆕 "comp-uuid-001"                               │    │
│  │ batch_id             │ 🆕 "batch-uuid-001" ──► FK to ProductionBatches  │    │
│  │ lot_id               │ 🆕 "lot-uuid-001" ──► FK to InventoryLots        │    │
│  │ planned_quantity     │ 🆕 2.000                                         │    │
│  │ actual_quantity      │ 🆕 2.000                                         │    │
│  │ unit_of_measure      │ 🆕 "kg"                                          │    │
│  │ addition_date        │ 🆕 "2025-01-20 09:00:00"                         │    │
│  │ added_by             │ 🆕 "prod1"                                       │    │
│  │ created_date         │ 🆕 "2025-01-20 09:00:00"                         │    │
│  │ modified_date        │ 🆕 "2025-01-20 09:00:00"                         │    │
│  └──────────────────────┴──────────────────────────────────────────────────┘    │
│                                                                                 │
│  💡 QUAN TRỌNG:                                                                 │
│     • batch_id: Link đến Production Batch                                       │
│     • lot_id: Link đến Inventory Lot được sử dụng                               │
│     • planned_quantity: Số lượng dự kiến theo công thức                         │
│     • actual_quantity: Số lượng thực tế được sử dụng (có thể khác planned)      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 3.4: Cập nhật số lượng Inventory Lot (Usage)

### 📋 ACTION: UPDATE bảng `InventoryLots`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: InventoryLots                                                         │
│  📝 ACTION: UPDATE (Giảm quantity do sử dụng cho production)                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  UPDATE InventoryLots SET quantity, modified_date                               │
│  WHERE lot_id = 'lot-uuid-001'                                                  │
│                                                                                 │
│  ⚡ THAY ĐỔI:                                                                   │
│  ┌──────────────────────────┬─────────────────┬───────────────────────────┐     │
│  │ Column                   │ Old Value       │ New Value                 │     │
│  ├──────────────────────────┼─────────────────┼───────────────────────────┤     │
│  │ lot_id                   │ lot-uuid-001    │ (không đổi)               │     │
│  │ quantity                 │ 25.000          │ 🔄 23.000 (-2.000)       │     │
│  │ modified_date            │ 2025-01-15 10:00│ 🔄 "2025-01-20 09:00:00" │     │
│  │ (các cột khác)           │ ...             │ (không đổi)               │     │
│  └──────────────────────────┴─────────────────┴───────────────────────────┘     │
│                                                                                 │
│  📊 TÍNH TOÁN:                                                                  │
│     Gốc: 25.500 kg                                                              │
│     - Split (sample): 0.500 kg                                                  │
│     - Usage (production): 2.000 kg                                              │
│     = Còn lại: 23.000 kg                                                        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 3.5: Ghi nhận Transaction Usage

### 📋 ACTION: INSERT vào bảng `InventoryTransactions`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: InventoryTransactions                                                 │
│  📝 ACTION: INSERT (Ghi nhận việc sử dụng nguyên liệu)                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌──────────────────────┬──────────────────────────────────────────────────┐    │
│  │ Column               │ Value                                            │    │
│  ├──────────────────────┼──────────────────────────────────────────────────┤    │
│  │ transaction_id       │ 🆕 "txn-uuid-003"                                │    │
│  │ lot_id               │ 🆕 "lot-uuid-001"                                │    │
│  │ transaction_type     │ 🆕 "Usage" 🏭                                    │    │
│  │ quantity             │ 🆕 -2.000   (số âm = xuất ra)                    │    │
│  │ unit_of_measure      │ 🆕 "kg"                                          │    │
│  │ reference_id         │ 🆕 "PB-2025-0001" (batch number)                 │    │
│  │ notes                │ 🆕 "Used in production batch PB-2025-0001"       │    │
│  │ performed_by         │ 🆕 "prod1"                                       │    │
│  │ transaction_date     │ 🆕 "2025-01-20 09:00:00"                         │    │
│  │ created_date         │ 🆕 "2025-01-20 09:00:00"                         │    │
│  └──────────────────────┴──────────────────────────────────────────────────┘    │
│                                                                                 │
│  💡 reference_id chứa batch_number để track nguyên liệu được dùng cho batch nào│
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 TRẠNG THÁI DATABASE SAU PHASE 3

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📊 DATABASE STATE AFTER PHASE 3 (PRODUCTION IN PROGRESS)                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Materials: 2 records                                                           │
│  Users: 5 records                                                               │
│  LabelTemplates: 4 records                                                      │
│  InventoryLots: 1 record                                                        │
│    └─► lot-uuid-001: quantity=23.500 kg (đã giảm 2), status=Accepted            │
│  InventoryTransactions: 2 records (THÊM 1!)                                     │
│    ├─► txn-uuid-001: Receipt +25.500 kg                                         │
│    └─► txn-uuid-002: Usage -2.000 kg (cho PB-2025-0001)                         │
│  QCTests: 2 records                                                             │
│  ProductionBatches: 1 record (MỚI!)                                             │
│    └─► batch-uuid-001: status=In Progress, batch_size=1000 units                │
│  BatchComponents: 1 record (MỚI!)                                               │
│    └─► comp-uuid-001: lot-uuid-001 → batch-uuid-001, actual_qty=2.000 kg        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════
# PHASE 4: HOÀN THÀNH SẢN XUẤT (PRODUCTION COMPLETE)
# ═══════════════════════════════════════════════════════════════

## STEP 4.1: Cập nhật Status → Complete

### 📋 ACTION: UPDATE bảng `ProductionBatches`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🔵 BẢNG: ProductionBatches                                                     │
│  📝 ACTION: UPDATE (Hoàn thành sản xuất)                                        │
│  👤 PERFORMED BY: prod1 (Production)                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  UPDATE ProductionBatches SET status, modified_date                             │
│  WHERE batch_id = 'batch-uuid-001'                                              │
│                                                                                 │
│  ⚡ THAY ĐỔI:                                                                   │
│  ┌──────────────────────┬──────────────────┬──────────────────────────────┐     │
│  │ Column               │ Old Value        │ New Value                    │     │
│  ├──────────────────────┼──────────────────┼──────────────────────────────┤     │
│  │ batch_id             │ batch-uuid-001   │ (không đổi)                  │     │
│  │ product_id           │ PROD-001         │ (không đổi)                  │     │
│  │ batch_number         │ PB-2025-0001     │ (không đổi)                  │     │
│  │ batch_size           │ 1000.000         │ (không đổi)                  │     │
│  │ unit_of_measure      │ units            │ (không đổi)                  │     │
│  │ manufacture_date     │ 2025-01-20       │ (không đổi)                  │     │
│  │ expiration_date      │ 2026-01-20       │ (không đổi)                  │     │
│  │ status               │ ⚙️ In Progress   │ 🔄 ✅ "Complete"            │     │
│  │ created_date         │ 2025-01-18 10:00 │ (không đổi)                  │     │
│  │ modified_date        │ 2025-01-20 08:00 │ 🔄 "2025-01-21 16:00:00"    │     │
│  └──────────────────────┴──────────────────┴──────────────────────────────┘     │
│                                                                                 │
│  💡 STATUS CHANGE: In Progress ──► Complete                                     │
│     Batch đã hoàn thành, sẵn sàng generate Finished Product label               │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## STEP 4.2: Generate Finished Product Label

### 📋 ACTION: SELECT từ `LabelTemplates` + Data từ `ProductionBatches` + `Materials`

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  🏷️ GENERATE LABEL                                                              │
│  📝 ACTION: SELECT template WHERE label_type = 'Finished Product'               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  QUERY:                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │ SELECT pb.*, m.material_name                                             │   │
│  │ FROM ProductionBatches pb                                                │   │
│  │ JOIN Materials m ON pb.product_id = m.material_id                        │   │
│  │ WHERE pb.batch_id = 'batch-uuid-001'                                     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  OUTPUT (Label cho sản phẩm hoàn thành):                                        │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │  ┌────────────────────────────────────────────────────────┐              │   │
│  │  │  🎁 VITAMIN D3 SOFTGEL 1000IU                          │ ◄── product  │   │
│  │  │                                                        │              │   │
│  │  │  Batch: PB-2025-0001                                   │ ◄── batch_no │   │
│  │  │  Mfg Date: 2025-01-20                                  │ ◄── mfg_date │   │
│  │  │  Exp Date: 2026-01-20                                  │ ◄── exp_date │   │
│  │  │  Qty: 1000 units                                       │ ◄── size     │   │
│  │  │  ✅ QC APPROVED                                        │ ◄── status   │   │
│  │  └────────────────────────────────────────────────────────┘              │   │
│  │  Size: 3.00" x 2.00"                                                     │   │
│  └──────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════
# FINAL: TRẠNG THÁI DATABASE CUỐI CÙNG
# ═══════════════════════════════════════════════════════════════

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  📊 FINAL DATABASE STATE - ALL TABLES                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ══════════════════════════════════════════════════════════════════════════     │
│  🔵 Users (5 records)                                                           │
│  ══════════════════════════════════════════════════════════════════════════     │
│  │ user_id       │ username  │ role             │ is_active │                   │
│  ├───────────────┼───────────┼──────────────────┼───────────┤                   │
│  │ user-uuid-001 │ jdoe      │ InventoryManager │ true      │                   │
│  │ user-uuid-002 │ qc1       │ QualityControl   │ true      │                   │
│  │ user-uuid-003 │ qc_super  │ QualityControl   │ true      │                   │
│  │ user-uuid-004 │ prod1     │ Production       │ true      │                   │
│  │ user-uuid-005 │ admin1    │ Admin            │ true      │                   │
│                                                                                 │
│  ══════════════════════════════════════════════════════════════════════════     │
│  🔵 Materials (2 records)                                                       │
│  ══════════════════════════════════════════════════════════════════════════     │
│  │ material_id │ part_number │ material_name              │ material_type      ││
│  ├─────────────┼─────────────┼────────────────────────────┼────────────────────┤│
│  │ MAT-001     │ PART-10001  │ Vitamin D3 100K            │ API                ││
│  │ PROD-001    │ PART-20001  │ Vitamin D3 Softgel 1000IU  │ Dietary Supplement ││
│                                                                                 │
│  ══════════════════════════════════════════════════════════════════════════     │
│  🔵 LabelTemplates (4 records)                                                  │
│  ══════════════════════════════════════════════════════════════════════════     │
│  │ template_id │ template_name        │ label_type       │ width │ height │    │
│  ├─────────────┼──────────────────────┼──────────────────┼───────┼────────┤    │
│  │ TPL-RM-01   │ Raw Material 2x1     │ Raw Material     │ 2.00  │ 1.00   │    │
│  │ TPL-SAM-01  │ Sample Label 1x1     │ Sample           │ 1.00  │ 1.00   │    │
│  │ TPL-STS-01  │ Status Label 1x0.5   │ Status           │ 1.00  │ 0.50   │    │
│  │ TPL-FP-01   │ Finished Product 3x2 │ Finished Product │ 3.00  │ 2.00   │    │
│                                                                                 │
│  ══════════════════════════════════════════════════════════════════════════     │
│  🔵 InventoryLots (1 record)                                                    │
│  ══════════════════════════════════════════════════════════════════════════     │
│  │ lot_id       │ material_id │ quantity │ status   │ is_sample │ parent_lot  ││
│  ├──────────────┼─────────────┼──────────┼──────────┼───────────┼─────────────┤│
│  │ lot-uuid-001 │ MAT-001     │ 23.500   │ Accepted │ false     │ NULL        ││
│                                                                                 │
│  📊 lot-uuid-001 QUANTITY HISTORY:                                              │
│     Initial:    25.500 kg (Receipt)                                             │
│     - Usage:     2.000 kg (Production)                                          │
│     = Final:    23.500 kg                                                       │
│                                                                                 │
│  ══════════════════════════════════════════════════════════════════════════     │
│  🔵 InventoryTransactions (2 records)                                           │
│  ══════════════════════════════════════════════════════════════════════════     │
│  │ transaction_id │ lot_id       │ type    │ quantity │ reference_id      │    │
│  ├────────────────┼──────────────┼─────────┼──────────┼───────────────────┤    │
│  │ txn-uuid-001   │ lot-uuid-001 │ Receipt │ +25.500  │ NULL              │    │
│  │ txn-uuid-002   │ lot-uuid-001 │ Usage   │ -2.000   │ PB-2025-0001      │    │
│                                                                                 │
│  ══════════════════════════════════════════════════════════════════════════     │
│  🔵 QCTests (2 records)                                                         │
│  ══════════════════════════════════════════════════════════════════════════     │
│  │ test_id       │ lot_id       │ test_type │ result │ status │ verified_by │  │
│  ├───────────────┼──────────────┼───────────┼────────┼────────┼─────────────┤  │
│  │ test-uuid-001 │ lot-uuid-001 │ Identity  │ Match  │ Pass   │ qc_super    │  │
│  │ test-uuid-002 │ lot-uuid-001 │ Potency   │ 101.2% │ Pass   │ qc_super    │  │
│                                                                                 │
│  ══════════════════════════════════════════════════════════════════════════     │
│  🔵 ProductionBatches (1 record)                                                │
│  ══════════════════════════════════════════════════════════════════════════     │
│  │ batch_id       │ product_id │ batch_number │ batch_size │ status   │        │
│  ├────────────────┼────────────┼──────────────┼────────────┼──────────┤        │
│  │ batch-uuid-001 │ PROD-001   │ PB-2025-0001 │ 1000 units │ Complete │        │
│                                                                                 │
│  📊 STATUS HISTORY: Planned → In Progress → Complete                            │
│                                                                                 │
│  ══════════════════════════════════════════════════════════════════════════     │
│  🔵 BatchComponents (1 record)                                                  │
│  ══════════════════════════════════════════════════════════════════════════     │
│  │ component_id  │ batch_id       │ lot_id       │ planned │ actual │ unit │   │
│  ├───────────────┼────────────────┼──────────────┼─────────┼────────┼──────┤   │
│  │ comp-uuid-001 │ batch-uuid-001 │ lot-uuid-001 │ 2.000   │ 2.000  │ kg   │   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

# ═══════════════════════════════════════════════════════════════
# TỔNG HỢP: SƠ ĐỒ LUỒNG DỮ LIỆU HOÀN CHỈNH
# ═══════════════════════════════════════════════════════════════

## Quy tắc quan trọng về Label Generation:

> **⚠️ LABEL LUÔN ĐƯỢC GENERATE TỪ DỮ LIỆU CỦA LOT/BATCH, KHÔNG PHẢI TỪ TRANSACTION!**
>
> | Label Type | Data Source |
> |------------|-------------|
> | Raw Material | InventoryLot + Material |
> | Status | InventoryLot (status field) |
> | Finished Product | ProductionBatch + Material |

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE DATA FLOW DIAGRAM (Đúng theo tài liệu)                          │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                             │
│  ★ LUỒNG CHÍNH: Material → Lot → Transaction → Label (từ Lot data)                         │
│                                                                                             │
│  PHASE 0: MASTER DATA                                                                       │
│  ══════════════════                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐                                 │
│  │   Users     │    │  Materials  │    │ LabelTemplates  │                                 │
│  │ (5 records) │    │ (2 records) │    │   (4 records)   │                                 │
│  └─────────────┘    └──────┬──────┘    └────────┬────────┘                                 │
│                            │                     │                                          │
│  ═══════════════════════════════════════════════════════════════════════════════════════   │
│                            │                     │                                          │
│  PHASE 1: RECEIVING        │                     │                                          │
│  ══════════════════        │                     │                                          │
│                            ▼                     │                                          │
│   ① Material ────► ┌───────────────┐             │                                          │
│      (FK)          │ InventoryLots │             │                                          │
│                    │ lot-uuid-001  │─────────────┼────► 🏷️ RAW MATERIAL LABEL              │
│                    │ qty: 25.500   │             │      (data từ Lot + Material)            │
│                    │ status: Quar. │             │                                          │
│                    └───────┬───────┘             │                                          │
│                            │                     │                                          │
│   ② Lot ──────────► ┌───────────────────┐        │                                          │
│      (FK)           │ InventoryTxn      │        │                                          │
│                     │ Receipt +25.500   │        │                                          │
│                     └───────────────────┘        │                                          │
│                                                  │                                          │
│  ═══════════════════════════════════════════════════════════════════════════════════════   │
│                                                  │                                          │
│  PHASE 2: QC TESTING                             │                                          │
│  ════════════════════                            │                                          │
│                                                  │                                          │
│   ③ Lot ──────────► ┌───────────────┐            │                                          │
│      (FK)           │   QCTests     │            │                                          │
│                     │ Identity:Pass │            │                                          │
│                     │ Potency: Pass │            │                                          │
│                     └───────┬───────┘            │                                          │
│                             │                    │                                          │
│   ④ Update status   ┌───────▼───────┐            │                                          │
│                     │ InventoryLots │────────────┼────► 🏷️ STATUS LABEL                    │
│                     │ lot-uuid-001  │            │      (data từ Lot - status field)        │
│                     │ status: ✅Acc │            │                                          │
│                     └───────┬───────┘            │                                          │
│                             │                    │                                          │
│  ═══════════════════════════════════════════════════════════════════════════════════════   │
│                             │                    │                                          │
│  PHASE 3: PRODUCTION        │                    │                                          │
│  ═══════════════════        │                    │                                          │
│                             │                    │                                          │
│   ⑤ Product Material ► ┌──────────────────┐      │                                          │
│      (FK)               │ ProductionBatch  │     │                                          │
│                         │ batch-uuid-001   │     │                                          │
│                         │ status: Planned  │     │                                          │
│                         │    ↓ In Progress │     │                                          │
│                         └────────┬─────────┘     │                                          │
│                                  │               │                                          │
│   ⑥ Lot + Batch ───────► ┌──────▼───────────┐    │                                          │
│      (FKs)               │ BatchComponents  │    │                                          │
│                          │ lot_id: 001      │    │                                          │
│                          │ batch_id: 001    │    │                                          │
│                          │ actual: 2.000 kg │    │                                          │
│                          └────────┬─────────┘    │                                          │
│                                   │              │                                          │
│   ⑦ Update Lot qty ──────► ┌──────▼──────┐       │                                          │
│                            │ InventoryLots│      │                                          │
│                            │ qty: 23.500  │      │                                          │
│                            └─────────────┘       │                                          │
│                                   │              │                                          │
│   ⑧ Record usage ────────► ┌──────▼──────────┐   │                                          │
│                            │ InventoryTxn   │   │                                          │
│                            │ Usage -2.000   │   │                                          │
│                            └────────────────┘   │                                          │
│                                                  │                                          │
│  ═══════════════════════════════════════════════════════════════════════════════════════   │
│                                                  │                                          │
│  PHASE 4: COMPLETE                               │                                          │
│  ═════════════════                               │                                          │
│                                                  │                                          │
│   ⑨ Complete Batch ────► ┌──────────────────┐    │                                          │
│                          │ ProductionBatch  │────┼────► 🏷️ FINISHED PRODUCT LABEL          │
│                          │ batch-uuid-001   │    │      (data từ Batch + Product Material)  │
│                          │ status: Complete │    │                                          │
│                          │ 1000 units       │    │                                          │
│                          └──────────────────┘    │                                          │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Tóm tắt thứ tự các bước:

| # | Bước | Bảng | Action | Ghi chú |
|---|------|------|--------|---------|
| ① | Material reference | Materials → InventoryLots | FK | Lot tham chiếu Material |
| ② | Record receipt | InventoryLots → Transactions | INSERT | Ghi nhận nhận hàng |
| ③ | QC Testing | InventoryLots → QCTests | INSERT | Thực hiện test |
| ④ | Update status | InventoryLots | UPDATE | Quarantine → Accepted |
| ⑤ | Create batch | Materials → ProductionBatches | INSERT | product_id FK |
| ⑥ | Add component | Lots + Batches → BatchComponents | INSERT | Link lot vào batch |
| ⑦ | Update lot qty | InventoryLots | UPDATE | Trừ số lượng sử dụng |
| ⑧ | Record usage | InventoryTransactions | INSERT | type=Usage |
| ⑨ | Complete batch | ProductionBatches | UPDATE | status=Complete |

---

*Document generated based on [Inventory Management System Database Schema](https://nhbien.github.io/inventory-mangement-system-database-schema/)*
