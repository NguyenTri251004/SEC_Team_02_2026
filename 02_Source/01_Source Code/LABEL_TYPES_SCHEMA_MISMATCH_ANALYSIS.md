# Label Types Schema vs Code Mismatch Analysis

**Ngày phân tích**: March 17, 2026  
**Phạm vi**: Database Schema, Backend Types, Frontend UI

---

## 1. Overview - Các Label Types Được Định Nghĩa

Cả **Database Schema**, **Backend**, và **Frontend** đều định nghĩa 6 loại label type:

| Label Type | DB Schema | Backend Enum | Frontend Options |
|---|---|---|---|  
| **Raw Material** | ✓ | `RAW_MATERIAL` | ✓ |
| **API** | ✓ | `API` | ✓ |
| **Sample** | ✓ | `SAMPLE` | ✓ |
| **Intermediate** | ✓ | `INTERMEDIATE` | ✓ |
| **Finished Product** | ✓ | `FINISHED_PRODUCT` | ✓ |
| **Status** | ✓ | `STATUS` | ✓ |

**Kết luận**: ✓ **CONSISTENT** giữa DB, Backend, và Frontend về định nghĩa label types.

---

## 2. Entity Type Definitions

### Database Schema (db-init.sql)
```sql
CREATE TABLE generated_labels (
  entity_type VARCHAR(20) NOT NULL
    CHECK (entity_type IN ('material', 'lot', 'batch')),
  ...
);
```

### Backend (label.types.ts)
```typescript
export enum EntityType {
  MATERIAL = "material",
  LOT = "lot",
  BATCH = "batch",
}
```

### Frontend (GenerateLabelModal.tsx)
```typescript
export type EntityType = "material" | "lot" | "batch";

// In the UI:
<Radio.Button value="material">Material</Radio.Button>
<Radio.Button value="lot">Inventory Lot</Radio.Button>
<Radio.Button value="batch">Production Batch</Radio.Button>
```

**Kết luận**: ✓ **CONSISTENT** về definition, nhưng có **LOGIC GAPS** (xem mục 3).

---

## 3. 🔴 MISMATCH #1: Missing Label Type → Entity Type Mapping Validation

### Database Schema Requirements (từ Notion document)

Theo **Example Data Flow** trong Notion, các label type có mục đích cụ thể:

| Label Type | Intended Entity | Description |
|---|---|---|
| **Raw Material** | `Inventory Lot` | Label cho raw material khi nhận hàng |
| **API** | `Inventory Lot` | Label cho API materials (tương tự Raw Material) |
| **Sample** | `Inventory Lot` (with `is_sample=true`) | Label khi tạo sample lot từ parent lot |
| **Status** | `Inventory Lot` OR `Batch` | Label khi status thay đổi (Quarantine → Accepted) |
| **Intermediate** | `Production Batch` | Label cho intermediate products trong production |
| **Finished Product** | `Production Batch` | Label khi batch Complete |

### Hiện Tại Frontend Cho Phép (GenerateLabelModal.tsx)

```typescript
const getSuggestedEntityType = (labelType: string): string => {
  const type = labelType.toLowerCase();
  if (type.includes("raw material") || type.includes("api")) return "Inventory Lot";
  if (type.includes("finished product")) return "Production Batch";
  return "Material";  // ← DEFAULT FALLBACK for all other types
};
```

**Current UI Behavior**:
- User có thể chọn **ANY** combination của label_type + entity_type
- Ví dụ, có thể tạo:
  - "Finished Product" label cho Material ❌ (không hợp lý)
  - "Raw Material" label cho Production Batch ❌ (không hợp lý)
  - "Status" label cho Material ❌ (không hợp lý vì Material không có status)
  - "Sample" label cho Material ❌ (không hợp lý)

**Hiện Tại**:
```typescript
// Không có validation để ngăn non-sensical combinations
const handleGenerate = async () => {
  // Chỉ check: 
  // 1. Template được chọn
  // 2. Completed batch (if batch selected)
  // Không check xem label_type + entity_type có hợp lý không
};
```

### Đề Xuất Fix

```typescript
// Thêm validation function
const isValidLabelEntityCombination = (labelType: string, entityType: EntityType): boolean => {
  const type = labelType.toLowerCase();
  
  // Raw Material & API → chỉ cho Inventory Lot
  if ((type.includes("raw material") || type.includes("api")) && entityType !== "lot") {
    return false;
  }
  
  // Finished Product & Intermediate → chỉ cho Production Batch
  if ((type.includes("finished product") || type.includes("intermediate")) && entityType !== "batch") {
    return false;
  }
  
  // Sample → chỉ cho Inventory Lot (và phải check is_sample=true)
  if (type.includes("sample") && entityType !== "lot") {
    return false;
  }
  
  // Status → cho Inventory Lot hoặc Production Batch
  if (type.includes("status") && entityType === "material") {
    return false;
  }
  
  return true;
};

// Áp dụng trong form
<Form.Item 
  name="entity_id"
  rules={[
    { required: true, message: "..." },
    {
      validator: async (_, value) => {
        if (!isValidLabelEntityCombination(selectedTemplate.label_type, entityType)) {
          return Promise.reject(
            new Error(`Label type "${selectedTemplate.label_type}" is not valid for ${entityType}`)
          );
        }
        return Promise.resolve();
      }
    }
  ]}
>
```

---

## 4. 🔴 MISMATCH #2: Sample Lot Special Handling Missing

### Database Schema Requirement

```sql
-- InventoryLots table
is_sample BOOLEAN DEFAULT false

-- Example data flow from Notion:
-- "If a sample lot is created from lot-uuid-001 (with is_sample: true), 
--  a Sample label is generated using a LabelTemplate with label_type: 'Sample'"
```

### Current Frontend

**Khi generate label với Sample type**:

```typescript
// Trong GenerateLabelModal.tsx - No special handling for is_sample
{entityType === "lot" && (
  <Form.Item
    name="entity_id"
    label="Select Inventory Lot"
    rules={[{ required: true, message: "Please select a lot" }]}
  >
    <Select
      placeholder="Select inventory lot"
      loading={lotsLoading}
      options={lots.map((l) => ({
        value: l.lot_id,
        label: `${l.lot_id} - ${l.material_name} (${l.status})`,
        // ← NO indication về is_sample status
      }))}
    />
  </Form.Item>
)}
```

**Issues**:
1. Không hiển thị `is_sample` status của lot trong dropdown
2. Không có warning/validation khi chọn non-sample lot với "Sample" label type
3. Không có suggestion khi "Sample" label type được chọn

### Đề Xuất Fix

```typescript
// Option 1: Hiển thị is_sample status trong label
options={lots.map((l) => ({
  value: l.lot_id,
  label: `${l.lot_id} - ${l.material_name} ${l.is_sample ? '(Sample)' : ''} - ${l.status}`,
}))}

// Option 2: Validation khi label_type = "Sample"
{selectedTemplate?.label_type.toLowerCase().includes("sample") && (
  <Alert
    type="warning"
    message="Sample Label requires a sample lot"
    description={
      entityType === "lot" && selectedLot && !selectedLot.is_sample 
        ? "Selected lot is not marked as sample. Consider using a lot with is_sample=true"
        : ""
    }
    style={{ marginBottom: "16px" }}
  />
)}
```

---

## 5. MISMATCH #3: Material Entity Type Should NOT Exist

### DB Schema Analysis

Từ **Entity Relationship Overview**:
```
LabelTemplates ──used by──> InventoryLots (Raw Material, Sample, API, Status labels)
LabelTemplates ──used by──> ProductionBatches (Finished Product, Intermediate labels)
Users (standalone)
```

**Kết luận**: Material KHÔNG được liệt kê! Chỉ có InventoryLots và ProductionBatches.

### Evidence from Notion Document

1. **Entity Relationship Diagram** rõ ràng:
   - Label Templates → InventoryLots (4 loại: Raw Material, Sample, API, Status)
   - Label Templates → ProductionBatches (2 loại: Finished Product, Intermediate)
   - **Material không xuất hiện trong relationship**

2. **Example Data Flow** (từng bước label generation):
   - Step 3: "Raw Material label is generated... populated with data from `lot-uuid-001`" ← **InventoryLot**, không Material
   - Step 5: "Sample label... populated with sample-specific information" ← **InventoryLot sample**, không Material
   - Step 8: "Finished Product label... populated with batch data" ← **ProductionBatch**, không Material
   - Step 9: "Status label... to indicate the current status... on the physical lot" ← **InventoryLot**, không Material
   - **Không có Material labels**

3. **Label Generation Details**:
   ```
   "- Raw Material: When InventoryLot is received (initial label) or when status changes
    - Sample: When a sample lot is created (is_sample: true)
    - Finished Product: When ProductionBatch is completed
    - API: For API materials (similar to Raw Material)
    - Status: When lot or batch status changes
    - Intermediate: For intermediate products during production"
   ```
   Tất cả refer đến InventoryLot hoặc ProductionBatch, KHÔNG phải Material.

### Current Problematic Code

```typescript
// GenerateLabelModal.tsx - SAIIII
<Radio.Button value="material">Material</Radio.Button>

// types/index.ts - SAIIII
export type EntityType = "material" | "lot" | "batch";

// backend/src/modules/labels/label.types.ts - SAIIII
export enum EntityType {
  MATERIAL = "material",  // ← KHÔNG CÓ TRONG SCHEMA
  LOT = "lot",
  BATCH = "batch",
}
```

### Why This is a Problem

- **Material là "master data"** (catalog/reference), không phải "inventory entity"
- Material không có các trường mà label cần (lot_id, manufacturer_lot, status, batch_number, v.v.)
- **Mỗi Material có NHIỀU InventoryLots** → Label phải generate cho InventoryLot cụ thể, không phải Material chung

### Action Required

✅ **REMOVE Material entity_type** từ:
1. Frontend radio buttons
2. `EntityType` type definition
3. Backend EntityType enum
4. Database CHECK constraint (nếu có)

**Sửa thành:**
```typescript
// Đúng
export type EntityType = "lot" | "batch";

// Đúng
export enum EntityType {
  LOT = "lot",
  BATCH = "batch",
}
```

---

## 6. 🟡 MISMATCH #4: Status Label Auto-Generation Not Implemented

### Database Schema Requirement

Từ Notion **Example Data Flow** step 9:

```
"Labels can be generated at multiple points:
- ...
- Status: When lot or batch status changes (e.g., Quarantine → Accepted)
```

### Current Implementation

**Database**: ✓ `label_type = 'Status'` được hỗ trợ  
**Backend**: ✓ `LabelType.STATUS` tồn tại  
**Frontend**: ⚠️ Manual generation only (không auto-trigger)

```typescript
// GenerateLabelModal.tsx - User phải manually select "Status" label
// Không có tự động trigger khi lot status thay đổi
```

### Expected Behavior (từ schema)

1. Khi QC lot được approve:
   - Lot status: `Quarantine` → `Accepted`
   - **Tự động** generate Status label hoặc suggest user
   - Label content: lot_id, material_name, status, modified_date

2. Khi lot bị reject:
   - Lot status: `Quarantine` → `Rejected`
   - Tương tự tự động generate hoặc suggest

### Current Code (trong backend)

**File**: `backend/src/modules/qc/qc.service.ts` (if exists)

Không thấy logic auto-generate Status label khi lot status thay đổi.

### Recommendation

1. **Short-term**: Add UI hint khi lot status thay đổi
   ```typescript
   // Trong lot detail page hoặc QC approval flow
   if (lotStatusChanged) {
     message.info(
       "Lot status changed. Consider generating a Status label for physical marking.",
       [
         { text: "Generate Label", onClick: () => openGenerateLabelModal("Status") }
       ]
     );
   }
   ```

2. **Long-term**: Implement auto-generation
   ```typescript
   // backend/src/modules/qc/qc.service.ts
   async approveLot(lotId: string, approvedBy: string) {
     await updateLotStatus(lotId, "Accepted");
     // Auto-generate Status label
     await this.labelService.generateStatusLabel(lotId);
   }
   ```

---

## 7. 🟡 MISMATCH #5: Frontend Field Templates Mismatch

### Issue: Hardcoded Fields in Frontend vs Database Flexibility

**Frontend** (`LabelTemplateFormModal.tsx`):

```typescript
const MATERIAL_FIELDS = [
  { value: "material_id", label: "Material ID" },
  { value: "part_number", label: "Part Number" },
  { value: "material_name", label: "Material Name" },
  { value: "material_type", label: "Material Type" },
  { value: "storage_conditions", label: "Storage Conditions" },
  { value: "specification_document", label: "Specification Document" },
  { value: "created_date", label: "Created Date" },
];
```

**Problem**:
1. Chỉ có Material fields → không hỗ trợ InventoryLot-specific fields:
   - `lot_id`, `manufacturer_lot`, `received_date`, `expiration_date`, `quantity`, `status`

2. Không hỗ trợ ProductionBatch fields:
   - `batch_number`, `product_name`, `manufacture_date`, `batch_size`

3. Template được store như `template_content` TEXT, nhưng frontend chỉ allow chosen fields

### Database Schema (db-init.sql)

```sql
INSERT INTO label_templates (...) VALUES
  ('TPL-001', 'Standard Raw Material Label', 'Raw Material',
   '{"fields":["lot_id","material_name","manufacturer_lot","received_date","expiration_date","quantity","storage_location"]}',
   100.0, 50.0, ...),
   
  ('TPL-004', 'Finished Product Label', 'Finished Product',
   '{"fields":["batch_number","product_name","manufacture_date","expiration_date","batch_size"]}',
   100.0, 75.0, ...),
```

**Template content gồm các fields khác nhau tùy vào label_type**, nhưng frontend form không reflect điều này.

### Recommendation

```typescript
// Dynamic field selection dựa vào label_type
const FIELDS_BY_LABEL_TYPE: Record<string, FieldOption[]> = {
  "Raw Material": [
    { value: "lot_id", label: "Lot ID" },
    { value: "material_name", label: "Material Name" },
    { value: "manufacturer_lot", label: "Manufacturer Lot" },
    { value: "received_date", label: "Received Date" },
    { value: "expiration_date", label: "Expiration Date" },
    { value: "quantity", label: "Quantity" },
    { value: "storage_location", label: "Storage Location" },
  ],
  "Finished Product": [
    { value: "batch_number", label: "Batch Number" },
    { value: "product_name", label: "Product Name" },
    { value: "manufacture_date", label: "Manufacture Date" },
    { value: "expiration_date", label: "Expiration Date" },
    { value: "batch_size", label: "Batch Size" },
  ],
  "Status": [
    { value: "lot_id", label: "Lot ID" },
    { value: "material_name", label: "Material Name" },
    { value: "status", label: "Status" },
    { value: "modified_date", label: "Modified Date" },
  ],
  // ... etc
};

// Use trong form
const availableFields = FIELDS_BY_LABEL_TYPE[selectedLabelType] || MATERIAL_FIELDS;
```

---

## 8. 🟡 MISMATCH #6: Batch Status Validation - Intermediate Labels Unclear

### Issue: Only "Complete" Batches Allowed vs Intermediate Labels

```typescript
// GenerateLabelModal.tsx
const completedBatches = batches.filter((batch) => batch.status === "Complete");

const handleGenerate = async () => {
  if (entityType === "batch") {
    const selectedBatch = batches.find((batch) => batch.batch_id === values.entity_id);
    if (!selectedBatch || selectedBatch.status !== "Complete") {
      message.error("Only Completed batches are allowed for label generation.");
      return;  // ← Blocks BOTH Finished Product AND Intermediate labels
    }
  }
};
```

### DB Schema Answer

**From Label Generation Details**:
```
"- Finished Product: When ProductionBatch is completed
 - Intermediate: For intermediate products during production"
```

**Analysis**:
- **Finished Product** → Explicitly "when completed" → status = `Complete` ✓
- **Intermediate** → Vaguely "during production" → status = `In Progress` (implied but NOT explicit)

### Schema Document Evidence

**ProductionBatch statuses** (db-init.sql):
```sql
status ENUM NOT NULL DEFAULT 'Planned', 'In Progress', 'Complete', 'Rejected'
```

**Label Generation Context**:
- "during production" = while batch is being manufactured = `In Progress` status
- "when completed" = after manufacturing = `Complete` status

### Current Problem

**Current code rejects BOTH** Finished Product và Intermediate labels cho non-Complete batches.

```
Batch Status:  Planned  |  In Progress  |  Complete  |  Rejected
Finished Prod: ❌       |  ❌           |  ✅        |  ❌
Intermediate:  ❌       |  ⚠️ (unclear) |  ✅        |  ❌
```

### Recommended Fix

**Option A: Based on schema "during production" intent**
```typescript
const getLabelableBatches = (labelType: string | undefined) => {
  if (!labelType) return [];
  
  const type = labelType.toLowerCase();
  
  // Intermediate: during production (In Progress or Complete)
  if (type.includes("intermediate")) {
    return batches.filter(b => ["In Progress", "Complete"].includes(b.status));
  }
  
  // Finished Product: only when Complete
  if (type.includes("finished product")) {
    return batches.filter(b => b.status === "Complete");
  }
  
  return [];
};

const labelableBatches = getLabelableBatches(selectedTemplate?.label_type);
```

**Option B: Request clarification from Product Owner**
- Intermediate labels: In Progress batches? Hay chỉ Complete?
- Should intermediate labels be auto-archived khi batch Complete?

### Current Status
⚠️ **Cannot confirm từ schema** - "during production" needs explicit batch status(es)

---

## 9. Summary Table: Mismatches

| # | Issue | Severity | Component | Status | DB Schema Answer |
|---|---|---|---|---|---|
| 1 | Missing label_type → entity_type validation | 🔴 High | Frontend | Not implemented | Enforce constraints from schema |
| 2 | Sample lot (`is_sample`) not highlighted in UI | 🟡 Medium | Frontend | Not implemented | Schema requires sample lot indication |
| 3 | **Material entity_type should NOT exist (REMOVE)** | 🔴 High | Design/Code | Remove immediately | Entity Relationship shows only InventoryLots + ProductionBatches |
| 4 | Status label auto-generation not implemented | 🟡 Medium | Backend + Frontend | Not implemented | Schema suggests auto-trigger on status change |
| 5 | Frontend fields hardcoded, not dynamic by label_type | 🟡 Medium | Frontend | Not implemented | Schema templates use different fields per type |
| 6 | Batch status validation (Intermediate labels unclear) | 🟡 Medium | Frontend | Partial | "During production" implies In Progress status |

### Verified Items (No Issues)

| Item | Status | Details |
|---|---|---|
| Code Type Options (barcode, qrcode) | ✅ Consistent | Backend enum matches frontend UI |
| Label Types Count (6 types) | ✅ Consistent | Raw Material, API, Sample, Intermediate, Finished Product, Status |

---

## 10. Code Files Involved

### Frontend

- [GenerateLabelModal.tsx](frontend/src/components/labels/GenerateLabelModal.tsx) - Main label generation UI
- [LabelTemplateFormModal.tsx](frontend/src/components/labels/LabelTemplateFormModal.tsx) - Template creation
- [types/index.ts](frontend/src/types/index.ts) - Type definitions

### Backend

- [backend/src/modules/labels/label.types.ts](backend/src/modules/labels/label.types.ts) - Type enums
- [backend/src/modules/labels/label.service.ts](backend/src/modules/labels/label.service.ts) - Service logic
- [backend/src/modules/labels/label.routes.ts](backend/src/modules/labels/label.routes.ts) - API endpoints

### Database

- [db_schema/db-init.sql](db_schema/db-init.sql) - Schema definition
- **Notion Document**: Database Schema (provided URL)

---

## 11. Recommendations Priority

### 🔴 High Priority (Logic Gaps - Fix Immediately)
1. **REMOVE Material entity_type** (doesn't exist in DB schema)
   - Delete from: EntityType enum (backend), type definitions (frontend), UI radio buttons
   - Keep only: `lot` and `batch`
2. Implement label_type ↔ entity_type validation (prevent non-sensical combinations)
3. Add is_sample indication for inventory lots in dropdown

### 🟡 Medium Priority (Feature Completeness)
4. Implement Status label auto-generation trigger on lot status change
5. Make template field selection dynamic by label_type
6. Clarify Intermediate batch status handling (In Progress? or just Complete?)

---

## Summary

**Overall Status**: **6 Actual Mismatches Found** | **2 Items Verified as Consistent**

### Mismatches (Cần Fix):
- ❌ Missing label_type ↔ entity_type validation
- ❌ Sample lot handling not highlighted
- ❌ **Material entity_type MUST BE REMOVED** (biggest issue)
- ❌ Status label auto-generation not implemented
- ❌ Template fields hardcoded
- ❌ Intermediate batch status unclear

### Verified Consistent:
- ✅ Code Type options (barcode, qrcode) 
- ✅ 6 Label Types defined identically across all layers

---

## 12. Direct Answers to Your Questions

### ❓ Question 1: "Có cần Material entity_type hay không?" - Dựa trên DB Schema?

### ✅ ANSWER: **NO - Material entity_type should be REMOVED entirely**

**Evidence từ DB Schema (Notion Document)**:

1. **Entity Relationship Diagram** (trang "Entity Relationship Overview"):
   ```
   LabelTemplates ──used by──> InventoryLots (Raw Material, Sample, API, Status labels)
   LabelTemplates ──used by──> ProductionBatches (Finished Product, Intermediate labels)
   ```
   - Material **KHÔNG xuất hiện** trong Entity Relationship
   - Chỉ có 2 relationships: LabelTemplates → InventoryLots + ProductionBatches

2. **Example Data Flow** (9 bước sinh label):
   - Step 3 (Raw Material label): "populated with data from `lot-uuid-001`" ← InventoryLot
   - Step 5 (Sample label): "containing sample-specific information" ← InventoryLot
   - Step 8 (Finished Product label): "populated with batch data" ← ProductionBatch
   - Step 9 (Status label): "indicate the current status on the physical lot" ← InventoryLot
   - **Không có step nào cho Material labels**

3. **Label Generation Details**:
   ```
   "- Raw Material: When InventoryLot is received
    - Sample: When a sample lot is created
    - API: For API materials (similar to Raw Material)
    - Status: When lot or batch status changes
    - Finished Product: When ProductionBatch is completed
    - Intermediate: For intermediate products during production"
   ```
   - Tất cả refer đến InventoryLot hoặc ProductionBatch
   - **Material không được đề cập**

4. **Why Material can't be an entity_type**:
   - Material là **catalog/master data** (không phải inventory entity)
   - Material không có các trường cần thiết cho label: `lot_id`, `manufacturer_lot`, `received_date`, `status`, `batch_number`, v.v.
   - **1 Material = NHIỀU InventoryLots** → Label phải generate cho Lot cụ thể, không phải Material chung

### Action Required:
```typescript
// ❌ REMOVE (sai)
export enum EntityType {
  MATERIAL = "material",
  LOT = "lot",
  BATCH = "batch",
}

// ✅ CORRECT (đúng)
export enum EntityType {
  LOT = "lot",
  BATCH = "batch",
}
```

---

### ❓ Question 2: "Intermediate labels cho batches ở status nào?" - Dựa trên DB Schema?

### ⚠️ ANSWER: **Schema suggests "In Progress" but NOT explicitly stated**

**Evidence từ DB Schema**:

1. **Label Generation Details**:
   ```
   "- Finished Product: When ProductionBatch is completed
    - Intermediate: For intermediate products during production"
   ```
   - **Finished Product** → Rõ ràng: "when completed" = `Complete` status
   - **Intermediate** → Mơ hồ: "during production" = `In Progress` status (implied)

2. **ProductionBatch Statuses**:
   ```sql
   status VARCHAR(20) CHECK (status IN ('Planned', 'In Progress', 'Complete', 'Rejected'))
   ```
   - "during production" → status nào? Planned (NO)? In Progress (LIKELY)? Complete (NO)?

3. **Reasonable Interpretation**:
   ```
   Production Timeline:
   Planned ──→ In Progress ──→ Complete ──→ (shipped/archived)
   Intermediate label for "intermediate products" = products being made = In Progress
   Finished Product label for "finished" = products done = Complete
   ```

### Schema's Limitation:
- **"During production"** không explicitly specify batch status
- Có thể nghĩa: "In Progress" status (khi đang sản xuất)
- Hoặc "In Progress OR Complete" (anytime before rejected)
- **Schema document không rõ ràng**

### Recommended Actions:

**Option A: Conservative (Follow Notion intent)**
```typescript
const getLabelableBatchStatuses = (labelType: string): string[] => {
  if (labelType.includes("Intermediate")) {
    return ["In Progress", "Complete"];  // "during production"
  }
  if (labelType.includes("Finished Product")) {
    return ["Complete"];  // "when completed"
  }
  return [];
};
```

**Option B: Request Clarification**  
Hỏi Product Owner/Requirement Owner:
- Intermediate labels → In Progress? Hay Complete? Hay cả hai?
- Khi batch chuyển từ In Progress → Complete, có cần archive/reissue Intermediate label không?
- Intermediate có phải cho "semi-finished products" trong production line không?

---

## 📊 Final Comparison Table

| Question | DB Schema Says | Current Code | Status | Recommendation |
|---|---|---|---|---|
| **Material entity_type needed?** | ❌ Not in schema | ✓ Implemented | 🔴 Mismatch | **REMOVE immediately** |
| **Intermediate batch status** | 🟡 "During production" (unclear) | ❌ Only "Complete" | 🟡 Unclear | **Clarify with PO, likely "In Progress"** |
| **Label Types Defined** | 6 types | 6 types | ✅ Consistent | No action needed |
| **Entity Types Defined** | 2 types (Lot, Batch) | 3 types (Material, Lot, Batch) | 🔴 Mismatch | **Remove Material** |
