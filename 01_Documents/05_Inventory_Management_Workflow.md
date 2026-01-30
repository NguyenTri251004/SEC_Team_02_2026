# Inventory Management System - Workflow Diagram

## Tổng quan quy trình

Dựa trên database schema từ [Inventory Management System Database Schema](https://nhbien.github.io/inventory-mangement-system-database-schema/)

---

## 1. Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│   Materials ──1:N──► InventoryLots ──1:N──► InventoryTransactions                   │
│       │                    │                                                        │
│       │                    ├──1:N──► QCTests                                        │
│       │                    │                                                        │
│       │                    └──1:N──► BatchComponents ◄──N:1── ProductionBatches     │
│       │                                                              │              │
│       └──────────────────1:N (product_id)────────────────────────────┘              │
│                                                                                     │
│   LabelTemplates ──used by──► InventoryLots (Raw Material, Sample, API, Status)     │
│   LabelTemplates ──used by──► ProductionBatches (Finished Product, Intermediate)    │
│                                                                                     │
│   Users (standalone - manages all operations)                                       │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Main Workflow Diagram

```mermaid
flowchart TB
    subgraph MASTER["📦 MASTER DATA"]
        MAT[("🏭 Materials<br/>material_id, part_number<br/>material_name, material_type")]
        LBL[("🏷️ Label Templates<br/>template_id, label_type<br/>template_content")]
        USR[("👤 Users<br/>user_id, username<br/>role")]
    end

    subgraph RECEIVING["📥 RECEIVING PROCESS"]
        RCV["📋 Receive Inventory Lot<br/>manufacturer_lot<br/>received_date, quantity"]
        TXN_RCV["💾 Transaction: RECEIPT<br/>+quantity"]
        LBL_RM["🏷️ Generate Label<br/>Raw Material Label"]
    end

    subgraph QC["🔬 QUALITY CONTROL"]
        QC_TEST["🧪 QC Testing<br/>Identity, Potency<br/>Microbial, Physical, Chemical"]
        QC_PASS{"✅ Pass?"}
        STATUS_ACC["✅ Status: ACCEPTED"]
        STATUS_REJ["❌ Status: REJECTED"]
        LBL_STATUS["🏷️ Generate Label<br/>Status Label"]
    end

    subgraph SAMPLE["🧫 SAMPLE MANAGEMENT"]
        SAMPLE_CREATE["📤 Create Sample Lot<br/>is_sample = true<br/>parent_lot_id"]
        TXN_SPLIT["💾 Transaction: SPLIT<br/>-quantity from parent"]
        LBL_SAMPLE["🏷️ Generate Label<br/>Sample Label"]
    end

    subgraph PRODUCTION["�icing PRODUCTION"]
        BATCH["📦 Production Batch<br/>batch_number, product_id<br/>batch_size"]
        BATCH_STATUS{"Status?"}
        BATCH_PLAN["📋 PLANNED"]
        BATCH_PROG["⚙️ IN PROGRESS"]
        BATCH_COMP["✅ COMPLETE"]
        BATCH_REJ["❌ REJECTED"]
    end

    subgraph COMPONENTS["🔗 BATCH COMPONENTS"]
        COMP["🔗 Add Components<br/>lot_id → batch_id<br/>planned_qty, actual_qty"]
        TXN_USE["💾 Transaction: USAGE<br/>-quantity from lot"]
    end

    subgraph FINISH["🎁 FINISHED PRODUCT"]
        FIN["📦 Finished Product<br/>Complete batch"]
        LBL_FIN["🏷️ Generate Label<br/>Finished Product Label"]
    end

    %% Connections
    MAT --> RCV
    RCV --> TXN_RCV
    TXN_RCV --> LBL_RM
    LBL_RM --> QC_TEST
    
    QC_TEST --> QC_PASS
    QC_PASS -->|Yes| STATUS_ACC
    QC_PASS -->|No| STATUS_REJ
    STATUS_ACC --> LBL_STATUS
    STATUS_REJ --> LBL_STATUS
    
    STATUS_ACC -.->|Optional| SAMPLE_CREATE
    SAMPLE_CREATE --> TXN_SPLIT
    TXN_SPLIT --> LBL_SAMPLE
    
    STATUS_ACC --> BATCH
    BATCH --> BATCH_STATUS
    BATCH_STATUS --> BATCH_PLAN
    BATCH_PLAN --> BATCH_PROG
    BATCH_PROG --> COMP
    COMP --> TXN_USE
    TXN_USE --> BATCH_COMP
    BATCH_COMP --> FIN
    FIN --> LBL_FIN
    
    BATCH_STATUS -->|Fail| BATCH_REJ
    
    LBL --> LBL_RM
    LBL --> LBL_STATUS
    LBL --> LBL_SAMPLE
    LBL --> LBL_FIN
    
    USR -.->|performs| TXN_RCV
    USR -.->|performs| QC_TEST
    USR -.->|performs| COMP

    %% Styling
    style MAT fill:#4A90D9,stroke:#2E5C8A,color:#fff
    style LBL fill:#F5A623,stroke:#C78A1B,color:#fff
    style USR fill:#7B68EE,stroke:#5B4AC9,color:#fff
    style RCV fill:#50C878,stroke:#3D9660,color:#fff
    style TXN_RCV fill:#90EE90,stroke:#6DC76D
    style QC_TEST fill:#FF8C00,stroke:#CC7000,color:#fff
    style STATUS_ACC fill:#32CD32,stroke:#28A428,color:#fff
    style STATUS_REJ fill:#DC143C,stroke:#B01030,color:#fff
    style BATCH fill:#4169E1,stroke:#3457B8,color:#fff
    style BATCH_COMP fill:#32CD32,stroke:#28A428,color:#fff
    style FIN fill:#228B22,stroke:#1B6E1B,color:#fff
```

---

## 3. Detailed Process Flow

### 3.1 Material Receipt Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         MATERIAL RECEIPT FLOW                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────┐    ┌─────────────────┐    ┌─────────────────────────┐    │
│  │  Materials  │───►│  Create         │───►│  InventoryTransaction   │    │
│  │  (Master)   │    │  InventoryLot   │    │  Type: RECEIPT          │    │
│  └─────────────┘    └─────────────────┘    │  Quantity: +25.5 kg     │    │
│                              │              └─────────────────────────┘    │
│                              │                                             │
│                              ▼                                             │
│                     ┌─────────────────┐                                    │
│                     │  Generate Label │                                    │
│                     │  Type: Raw      │                                    │
│                     │  Material       │                                    │
│                     └─────────────────┘                                    │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Quality Control Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         QUALITY CONTROL FLOW                               │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────┐    ┌─────────────────────────────────────────────────┐   │
│  │ InventoryLot│───►│              QC TESTING                         │   │
│  │ (Quarantine)│    │  ┌──────────┬──────────┬──────────┬──────────┐  │   │
│  └─────────────┘    │  │ Identity │ Potency  │ Microbial│ Physical │  │   │
│                     │  └──────────┴──────────┴──────────┴──────────┘  │   │
│                     └─────────────────────────────────────────────────┘   │
│                                        │                                   │
│                                        ▼                                   │
│                              ┌─────────────────┐                           │
│                              │   All Pass?     │                           │
│                              └────────┬────────┘                           │
│                                       │                                    │
│                     ┌─────────────────┼─────────────────┐                  │
│                     ▼                 │                 ▼                  │
│            ┌─────────────┐            │        ┌─────────────┐             │
│            │  ACCEPTED   │            │        │  REJECTED   │             │
│            │  ✅ Pass    │            │        │  ❌ Fail    │             │
│            └─────────────┘            │        └─────────────┘             │
│                     │                 │                 │                  │
│                     └─────────────────┼─────────────────┘                  │
│                                       ▼                                    │
│                              ┌─────────────────┐                           │
│                              │  Status Label   │                           │
│                              │  Generated      │                           │
│                              └─────────────────┘                           │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Production Batch Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION BATCH FLOW                              │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌───────────────┐                                                         │
│  │ Production    │                                                         │
│  │ Batch Created │                                                         │
│  │ Status:PLANNED│                                                         │
│  └───────┬───────┘                                                         │
│          │                                                                 │
│          ▼                                                                 │
│  ┌───────────────┐    ┌─────────────────┐    ┌─────────────────────────┐  │
│  │ Status:       │───►│ BatchComponents │───►│ InventoryTransaction   │  │
│  │ IN PROGRESS   │    │ Add Lot to Batch│    │ Type: USAGE            │  │
│  └───────────────┘    │ planned_qty: 2kg│    │ Quantity: -2 kg        │  │
│                       │ actual_qty: 2kg │    └─────────────────────────┘  │
│                       └─────────────────┘                                  │
│          │                                                                 │
│          ▼                                                                 │
│  ┌───────────────┐    ┌─────────────────┐                                  │
│  │ Status:       │───►│ Generate Label  │                                  │
│  │ COMPLETE      │    │ Type: Finished  │                                  │
│  └───────────────┘    │ Product         │                                  │
│                       └─────────────────┘                                  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Transaction Types Summary

| Transaction Type | Description | Quantity Effect |
|-----------------|-------------|-----------------|
| **Receipt** | Nhận nguyên liệu vào kho | +quantity |
| **Usage** | Sử dụng cho production batch | -quantity |
| **Split** | Tách lot (tạo sample) | -quantity (parent) |
| **Transfer** | Chuyển location | 0 (location change) |
| **Adjustment** | Điều chỉnh số lượng | ±quantity |
| **Disposal** | Hủy bỏ | -quantity |

---

## 5. Label Types Summary

| Label Type | Sử dụng cho | Thời điểm generate |
|------------|-------------|-------------------|
| **Raw Material** | InventoryLot | Khi nhận nguyên liệu |
| **Sample** | InventoryLot (is_sample=true) | Khi tạo sample lot |
| **API** | InventoryLot (API materials) | Khi nhận API |
| **Status** | InventoryLot | Khi status thay đổi |
| **Intermediate** | ProductionBatch | Trong quá trình sản xuất |
| **Finished Product** | ProductionBatch | Khi batch complete |

---

## 6. Status Flow

### Inventory Lot Status

```
┌────────────┐     QC Pass     ┌────────────┐
│ QUARANTINE │ ──────────────► │  ACCEPTED  │
└────────────┘                 └────────────┘
      │                              │
      │ QC Fail                      │ Depleted
      ▼                              ▼
┌────────────┐                 ┌────────────┐
│  REJECTED  │                 │  DEPLETED  │
└────────────┘                 └────────────┘
```

### Production Batch Status

```
┌──────────┐           ┌─────────────┐           ┌──────────┐
│ PLANNED  │ ────────► │ IN PROGRESS │ ────────► │ COMPLETE │
└──────────┘           └─────────────┘           └──────────┘
                              │
                              │ Quality Fail
                              ▼
                       ┌────────────┐
                       │  REJECTED  │
                       └────────────┘
```

---

## 7. User Roles & Permissions

| Role | Materials | Inventory | QC | Production | Labels | Users |
|------|-----------|-----------|-----|------------|--------|-------|
| **Admin** | Full | Full | Full | Full | Full | Full |
| **InventoryManager** | View | Full | View | View | Generate | - |
| **QualityControl** | View | Update Status | Full | View | Generate | - |
| **Production** | View | Use | View | Full | Generate | - |
| **Viewer** | View | View | View | View | View | - |

---

## 8. Complete End-to-End Flow Example

```
1. CREATE Material "Vitamin D3 100K" (MAT-001)
   └─► material_type: API, storage: "2-8°C"

2. RECEIVE InventoryLot (lot-uuid-001)
   ├─► material_id: MAT-001
   ├─► quantity: 25.5 kg
   ├─► status: QUARANTINE
   └─► Transaction: RECEIPT +25.5 kg
       └─► Generate: RAW MATERIAL LABEL

3. QC TESTING
   ├─► test_type: Identity → PASS
   ├─► test_type: Potency → PASS
   └─► Update lot status: QUARANTINE → ACCEPTED
       └─► Generate: STATUS LABEL (Accepted)

4. (Optional) CREATE Sample Lot
   ├─► parent_lot_id: lot-uuid-001
   ├─► is_sample: true
   ├─► quantity: 0.5 kg
   └─► Transaction: SPLIT -0.5 kg
       └─► Generate: SAMPLE LABEL

5. CREATE ProductionBatch (batch-uuid-001)
   ├─► product_id: PROD-001
   ├─► batch_size: 1000 units
   └─► status: PLANNED

6. ADD BatchComponent
   ├─► batch_id: batch-uuid-001
   ├─► lot_id: lot-uuid-001
   ├─► planned_qty: 2 kg
   └─► Transaction: USAGE -2 kg

7. COMPLETE Batch
   └─► status: IN PROGRESS → COMPLETE
       └─► Generate: FINISHED PRODUCT LABEL

8. FINAL State
   ├─► lot-uuid-001: 23 kg remaining (25.5 - 0.5 - 2)
   └─► batch-uuid-001: 1000 units complete
```

---

*Document generated based on [Inventory Management System Database Schema](https://nhbien.github.io/inventory-mangement-system-database-schema/)*
