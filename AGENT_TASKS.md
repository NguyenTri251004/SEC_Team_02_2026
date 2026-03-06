# Agent Tasks - IMS Implementation Plan

10 tasks doc lap, co the chay song song. Copy prompt cua tung task va paste vao Claude Code agent.

**Luu y:** Task 1 (DB Schema) nen chay truoc. Tasks 2-7 (Backend) va Tasks 8-10 (Frontend) co the chay song song vi FE dung mock data fallback.

---

## Task 1: Database Schema Migration

```
You are working on the IMS (Inventory Management System) project. Your task is to update the database schema file.

**File to modify:** `02_Source/01_Source Code/db_schema/db-init.sql`

**Reference:** Read the Domain Model at `01_Documents/02_Domain Model.md` for exact column definitions, types, constraints, and ENUMs.

**Current state:** The file only has 3 tables: `users` (minimal - just id+name), `materials`, `transactions` (basic IN/OUT only).

**What to do:**

1. **Refactor `users` table** to match Domain Model:
   - user_id VARCHAR(36) PK, username VARCHAR(50) UNIQUE NOT NULL, email VARCHAR(100) UNIQUE NOT NULL, password VARCHAR(100) NOT NULL (default hash), role VARCHAR(20) NOT NULL DEFAULT 'Viewer' CHECK(role IN ('Admin','InventoryManager','QualityControl','Production','Viewer')), is_active BOOLEAN DEFAULT true, last_login TIMESTAMP, created_date, modified_date
   - Insert seed data: admin user, one user per role

2. **Keep `materials` table** as-is (already correct), but add more seed data (at least 5 materials of different types: API, Excipient, Container, Closure, Process Chemical)

3. **Create `label_templates` table** per Domain Model with seed data (3 templates)

4. **Create `inventory_lots` table** per Domain Model:
   - FK to materials(material_id), self-referencing FK parent_lot_id
   - CHECK status IN ('Quarantine','Accepted','Rejected','Depleted')
   - Indexes on material_id, status, expiration_date
   - Insert 5+ seed lots with different statuses

5. **Refactor `transactions` table** to `inventory_transactions`:
   - transaction_id VARCHAR(36) PK, lot_id FK to inventory_lots, transaction_type CHECK IN ('Receipt','Usage','Split','Transfer','Adjustment','Disposal'), quantity DECIMAL(10,3), unit_of_measure, reference_id, notes, performed_by, transaction_date, created_date
   - Remove old transactions table, create new one
   - Insert seed transactions matching the seed lots

6. **Create `qc_tests` table** per Domain Model with seed data

7. **Create `production_batches` table** per Domain Model with seed data

8. **Create `batch_components` table** per Domain Model with seed data

**Important:**
- Use IF NOT EXISTS for all CREATE TABLE
- Add proper indexes for FK columns and commonly filtered columns
- Add meaningful Vietnamese + English comments
- Ensure all FK references are valid with seed data
- Follow the exact column names from Domain Model
```

---

## Task 2: Backend Lots Module

```
You are working on the IMS project backend (Express.js + TypeScript).

**Your task:** Create the Inventory Lots backend module at `02_Source/01_Source Code/backend/src/modules/lots/`

**Reference files to read first:**
- `02_Source/01_Source Code/backend/src/modules/materials/material.routes.ts` (pattern to follow)
- `02_Source/01_Source Code/backend/src/modules/materials/material.service.ts` (pattern to follow)
- `02_Source/01_Source Code/backend/src/modules/materials/material.types.ts` (pattern to follow)
- `02_Source/01_Source Code/backend/src/security/rbac.ts` (for permissions)
- `02_Source/01_Source Code/backend/src/shared/db/pool.ts` (database connection)
- `01_Documents/02_Domain Model.md` (for InventoryLots entity definition)

**Create 3 files:**

1. **`lot.types.ts`** - TypeScript interfaces for InventoryLot, CreateLotInput, UpdateLotInput

2. **`lot.service.ts`** - Database service with functions:
   - `getAllLots(filters?)` - list lots with optional filters (status, material_id, expiring_before), JOIN with materials for material_name/type
   - `getLotById(id)` - get single lot with material info
   - `createLot(input)` - create new lot, auto-set status='Quarantine'
   - `updateLot(id, input)` - update editable fields (storage_location, notes, etc.), NOT status
   - `updateLotStatus(id, status, reason)` - separate function for status changes
   - `getExpiringLots(days)` - lots expiring within N days
   - `getLotsByMaterial(materialId)` - lots for a specific material

3. **`lot.routes.ts`** - Express routes:
   - GET /api/lots - list with filters
   - GET /api/lots/:id - detail
   - POST /api/lots - create (auto Quarantine)
   - PUT /api/lots/:id - update
   - PATCH /api/lots/:id/status - update status only
   - GET /api/lots/expiring - expiring lots
   - GET /api/lots/by-material/:materialId

**Then update `backend/src/server.ts`** to import and mount: `app.use("/api/lots", lotRoutes);`

**Add RBAC permissions** in `backend/src/security/rbac.ts`:
```typescript
lots: {
  read: [ADMIN, INVENTORY_MANAGER, QUALITY_CONTROL, PRODUCTION, VIEWER],
  create: [ADMIN, INVENTORY_MANAGER],
  update: [ADMIN, INVENTORY_MANAGER],
  updateStatus: [ADMIN, INVENTORY_MANAGER, QUALITY_CONTROL],
  delete: [ADMIN],
},
```

**Business rules:**
- New lots MUST start with status='Quarantine'
- Status can only change: Quarantine->Accepted, Quarantine->Rejected, Accepted->Depleted, Accepted->Rejected
- Cannot issue/use lots that are Quarantine, Rejected, or expired
```

---

## Task 3: Backend QC Module

```
You are working on the IMS project backend (Express.js + TypeScript).

**Your task:** Create the QC Tests backend module at `02_Source/01_Source Code/backend/src/modules/qc/`

**Reference files to read first:**
- `02_Source/01_Source Code/backend/src/modules/materials/material.routes.ts` (pattern)
- `02_Source/01_Source Code/backend/src/modules/materials/material.service.ts` (pattern)
- `02_Source/01_Source Code/backend/src/shared/db/pool.ts`
- `02_Source/01_Source Code/backend/src/security/rbac.ts`
- `01_Documents/02_Domain Model.md` (for QCTests entity)

**Create 3 files:**

1. **`qc.types.ts`** - Interfaces: QCTest, CreateQCTestInput, UpdateQCTestInput, QCStats

2. **`qc.service.ts`** - Service functions:
   - `getAllTests(filters?)` - list tests, JOIN with inventory_lots for lot info
   - `getTestById(id)` - single test detail
   - `getTestsByLot(lotId)` - all tests for a lot
   - `createTest(input)` - create QC test (result_status defaults to 'Pending')
   - `updateTestResult(id, result, status, verifiedBy)` - update test result
   - `getPendingTests()` - tests with status='Pending'
   - `getQCStats()` - aggregate stats: pending count, pass rate (30d), tests by type
   - `getQCQueue()` - lots in Quarantine awaiting QC, JOIN with materials
   - `approveLot(lotId, userId)` - check all tests Pass -> set lot status='Accepted'
   - `rejectLot(lotId, userId, reason)` - set lot status='Rejected'

3. **`qc.routes.ts`** - Express routes:
   - GET /api/qc/tests - list all tests
   - GET /api/qc/tests/:id - test detail
   - POST /api/qc/tests - create test
   - PUT /api/qc/tests/:id - update result
   - GET /api/qc/queue - quarantine lots queue
   - GET /api/qc/queue/count - queue count
   - GET /api/qc/stats - QC statistics
   - POST /api/qc/approve/:lotId - approve lot
   - POST /api/qc/reject/:lotId - reject lot
   - GET /api/qc/lot/:lotId/history - test history for lot

**Then update `backend/src/server.ts`:** `app.use("/api/qc", qcRoutes);`

**Add RBAC permissions** in rbac.ts:
```typescript
qc: {
  read: [ADMIN, INVENTORY_MANAGER, QUALITY_CONTROL, VIEWER],
  create: [ADMIN, QUALITY_CONTROL],
  update: [ADMIN, QUALITY_CONTROL],
  approve: [ADMIN, QUALITY_CONTROL],
  reject: [ADMIN, QUALITY_CONTROL],
},
```

**Business rules:**
- approveLot: ALL tests for that lot must be 'Pass'. If any is 'Pending' or 'Fail', reject the approval.
- rejectLot: Set lot status to 'Rejected' immediately, reason is required.
- QC test result_status: only 'Pass', 'Fail', 'Pending'
```

---

## Task 4: Backend Production Module

```
You are working on the IMS project backend (Express.js + TypeScript).

**Your task:** Create the Production Batches module at `02_Source/01_Source Code/backend/src/modules/production/`

**Reference files to read first:**
- `02_Source/01_Source Code/backend/src/modules/materials/material.routes.ts` (pattern)
- `02_Source/01_Source Code/backend/src/modules/materials/material.service.ts` (pattern)
- `02_Source/01_Source Code/backend/src/shared/db/pool.ts`
- `02_Source/01_Source Code/backend/src/security/rbac.ts`
- `01_Documents/02_Domain Model.md` (for ProductionBatches and BatchComponents)

**Create 3 files:**

1. **`production.types.ts`** - Interfaces: ProductionBatch, BatchComponent, CreateBatchInput, AddComponentInput

2. **`production.service.ts`** - Service functions:
   - `getAllBatches(filters?)` - list batches, JOIN with materials for product_name
   - `getBatchById(id)` - batch detail with components
   - `createBatch(input)` - create batch (status='Planned')
   - `updateBatchStatus(id, status)` - update status with validation
   - `addComponent(batchId, input)` - add lot component to batch, verify lot is Accepted and not expired
   - `getComponents(batchId)` - list components for a batch
   - `consumeMaterial(batchId, componentId, actualQuantity)` - record actual usage, create inventory_transaction type='Usage', decrease lot quantity
   - `getTraceability(batchId)` - trace all materials used in batch

3. **`production.routes.ts`** - Express routes:
   - GET /api/production/batches - list batches
   - GET /api/production/batches/:id - batch detail + components
   - POST /api/production/batches - create batch
   - PATCH /api/production/batches/:id/status - update status
   - POST /api/production/batches/:id/components - add component
   - GET /api/production/batches/:id/components - list components
   - POST /api/production/consume - consume materials
   - GET /api/production/traceability/:batchId - traceability

**Then update `backend/src/server.ts`:** `app.use("/api/production", productionRoutes);`

**Add RBAC permissions** in rbac.ts:
```typescript
production: {
  read: [ADMIN, INVENTORY_MANAGER, PRODUCTION, VIEWER],
  create: [ADMIN, PRODUCTION],
  update: [ADMIN, PRODUCTION],
  consume: [ADMIN, PRODUCTION],
},
```

**Business rules:**
- Only lots with status='Accepted' and not expired can be added as components
- Consuming material creates an inventory_transaction type='Usage' and decreases lot quantity
- If lot quantity reaches 0, auto-set lot status='Depleted'
- Batch status flow: Planned -> In Progress -> Complete or Rejected
```

---

## Task 5: Backend Labels Module

```
You are working on the IMS project backend (Express.js + TypeScript).

**Your task:** Create the Labels module at `02_Source/01_Source Code/backend/src/modules/labels/`

**Reference files to read first:**
- `02_Source/01_Source Code/backend/src/modules/materials/material.routes.ts` (pattern)
- `02_Source/01_Source Code/backend/src/modules/materials/material.service.ts` (pattern)
- `02_Source/01_Source Code/backend/src/shared/db/pool.ts`
- `02_Source/01_Source Code/backend/src/security/rbac.ts`
- `01_Documents/02_Domain Model.md` (for LabelTemplates entity)

**Create 3 files:**

1. **`label.types.ts`** - Interfaces: LabelTemplate, CreateTemplateInput, UpdateTemplateInput, GenerateLabelInput, GeneratedLabel

2. **`label.service.ts`** - Service functions:
   - `getAllTemplates()` - list all templates
   - `getTemplateById(id)` - single template
   - `createTemplate(input)` - create template
   - `updateTemplate(id, input)` - update template
   - `deleteTemplate(id)` - delete template
   - `generateLabel(input)` - generate label data for a lot or batch: look up the lot/batch, combine with template, return JSON with all field values filled in

3. **`label.routes.ts`** - Express routes:
   - GET /api/labels/templates - list templates
   - GET /api/labels/templates/:id - template detail
   - POST /api/labels/templates - create template
   - PUT /api/labels/templates/:id - update template
   - DELETE /api/labels/templates/:id - delete template
   - POST /api/labels/generate - generate label data for a lot

**Then update `backend/src/server.ts`:** `app.use("/api/labels", labelRoutes);`

**Add RBAC permissions** in rbac.ts:
```typescript
labels: {
  read: [ADMIN, INVENTORY_MANAGER, QUALITY_CONTROL, PRODUCTION, VIEWER],
  create: [ADMIN, INVENTORY_MANAGER],
  update: [ADMIN, INVENTORY_MANAGER],
  delete: [ADMIN],
  generate: [ADMIN, INVENTORY_MANAGER, QUALITY_CONTROL, PRODUCTION],
},
```
```

---

## Task 6: Backend Users/Admin Module

```
You are working on the IMS project backend (Express.js + TypeScript).

**Your task:** Create the Users/Admin module at `02_Source/01_Source Code/backend/src/modules/admin/`

**Reference files to read first:**
- `02_Source/01_Source Code/backend/src/modules/materials/material.routes.ts` (pattern)
- `02_Source/01_Source Code/backend/src/modules/materials/material.service.ts` (pattern)
- `02_Source/01_Source Code/backend/src/shared/db/pool.ts`
- `02_Source/01_Source Code/backend/src/security/rbac.ts`
- `01_Documents/02_Domain Model.md` (for Users entity)

**Create 3 files:**

1. **`admin.types.ts`** - Interfaces: User (without password), CreateUserInput, UpdateUserInput, AdminStats

2. **`admin.service.ts`** - Service functions:
   - `getAllUsers(filters?)` - list users (never return password), filter by role/status
   - `getUserById(id)` - single user
   - `createUser(input)` - create user (hash password with bcrypt or simple hash for now)
   - `updateUser(id, input)` - update user info (name, role), NOT password
   - `toggleUserActive(id)` - lock/unlock user account
   - `resetPassword(id, newPassword)` - admin reset password
   - `getAdminStats()` - total users, active users, users by role, today's transactions count, total lots, lots in quarantine

3. **`admin.routes.ts`** - Express routes:
   - GET /api/admin/users - list users
   - GET /api/admin/users/:id - user detail
   - POST /api/admin/users - create user
   - PUT /api/admin/users/:id - update user
   - PATCH /api/admin/users/:id/toggle-active - lock/unlock
   - POST /api/admin/users/:id/reset-password - reset password
   - GET /api/admin/stats - admin dashboard stats

**Then update `backend/src/server.ts`:** `app.use("/api/admin", adminRoutes);`

All routes should use `adminOnly` middleware from rbac.ts (only Admin role).
```

---

## Task 7: Backend Dashboard + Reports API

```
You are working on the IMS project backend (Express.js + TypeScript).

**Your task:** Create Dashboard and Reports API modules.

**Reference files to read first:**
- `02_Source/01_Source Code/backend/src/modules/materials/material.routes.ts` (pattern)
- `02_Source/01_Source Code/backend/src/shared/db/pool.ts`
- `02_Source/01_Source Code/backend/src/security/rbac.ts`
- `02_Source/01_Source Code/frontend/src/types/index.ts` (for response type shapes: InventorySummary, TransactionSummary, QCStats)
- `02_Source/01_Source Code/frontend/src/services/api.ts` (for expected API endpoints)

**Create 2 modules:**

### Module 1: `backend/src/modules/dashboard/`

1. **`dashboard.types.ts`** - InventorySummary, TransactionSummary response types
2. **`dashboard.service.ts`**:
   - `getInventorySummary()` - aggregate lots by status (count + quantity), by material_type
   - `getTransactionSummary()` - today's receipts/issues count, 7-day trend
3. **`dashboard.routes.ts`**:
   - GET /api/dashboard/inventory-summary
   - GET /api/dashboard/transaction-summary

### Module 2: `backend/src/modules/reports/`

1. **`reports.types.ts`** - ReportExportInput, ReportType
2. **`reports.service.ts`**:
   - `getInventoryReport(filters)` - detailed lot data with material info
   - `getTransactionReport(filters)` - transaction history with filters
   - `getAuditLog(filters)` - combined log of status changes and transactions
   - `exportToCSV(data, columns)` - convert array to CSV string
3. **`reports.routes.ts`**:
   - GET /api/reports/inventory - inventory report data
   - GET /api/reports/transactions - transaction report data
   - GET /api/reports/audit-log - audit log
   - POST /api/reports/export - export data as CSV (return as file download)

**Then update `backend/src/server.ts`:**
```typescript
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
```

Dashboard routes: all authenticated users can read.
Report routes: use existing `reports` permissions from rbac.ts.
```

---

## Task 8: Frontend - Lots + Transactions CRUD Forms

```
You are working on the IMS project frontend (React 19 + TypeScript + Ant Design).

**Your task:** Add create/edit modals for Lots and Transactions pages.

**Reference files to read first:**
- `02_Source/01_Source Code/frontend/src/components/materials/MaterialFormModal.tsx` (pattern for modals)
- `02_Source/01_Source Code/frontend/src/hooks/useMaterialsData.ts` (pattern for mutations)
- `02_Source/01_Source Code/frontend/src/pages/lots/LotsPage.tsx` (page to enhance)
- `02_Source/01_Source Code/frontend/src/pages/transactions/TransactionsPage.tsx` (page to enhance)
- `02_Source/01_Source Code/frontend/src/types/index.ts` (existing types)
- `01_Documents/02_Domain Model.md` (for field definitions)

**What to create:**

### 1. `frontend/src/components/lots/LotFormModal.tsx`
- Ant Design Modal with Form for creating/receiving a new lot
- Fields: material_id (Select from materials list), manufacturer_name, manufacturer_lot, supplier_name, received_date (DatePicker), expiration_date (DatePicker), quantity, unit_of_measure (Select: kg, L, each, units), storage_location, po_number, is_sample (Switch)
- On create: POST to /api/lots (or add to mock if backend unavailable)
- On edit: PUT to /api/lots/:id
- Validation: required fields, quantity > 0, expiration_date > received_date

### 2. `frontend/src/components/lots/LotDetailDrawer.tsx`
- Ant Design Drawer showing lot details
- Display all lot fields, status tag, transaction history for this lot
- Action buttons: Update Status (dropdown: Accepted/Rejected with reason input)

### 3. Update `frontend/src/hooks/useLotsData.ts`
- Add `useSaveLot()` mutation (create/update)
- Add `useUpdateLotStatus()` mutation

### 4. `frontend/src/components/transactions/TransactionFormModal.tsx`
- Modal with Form for recording a new transaction
- Fields: transaction_type (Select: Receipt/Usage/Split/Transfer/Adjustment/Disposal), lot_id (Select from lots), quantity, unit_of_measure, reference_id, notes
- Different form behavior based on transaction_type (e.g., Transfer shows destination field)
- Validation: quantity > 0

### 5. Update `frontend/src/hooks/useTransactionsData.ts`
- Add `useRecordTransaction()` mutation

### 6. Update both pages to integrate the new modals:
- LotsPage: wire "Receive New Lot" button to LotFormModal, add row click for LotDetailDrawer, add Edit button
- TransactionsPage: wire "Record Transaction" button to TransactionFormModal

Use the `@/` path alias for imports. Follow existing code patterns.
```

---

## Task 9: Frontend - QC + Batches CRUD Forms

```
You are working on the IMS project frontend (React 19 + TypeScript + Ant Design).

**Your task:** Add create/edit functionality for QC and Batches pages.

**Reference files to read first:**
- `02_Source/01_Source Code/frontend/src/components/materials/MaterialFormModal.tsx` (modal pattern)
- `02_Source/01_Source Code/frontend/src/hooks/useMaterialsData.ts` (mutation pattern)
- `02_Source/01_Source Code/frontend/src/pages/qc/QCPage.tsx` (page to enhance)
- `02_Source/01_Source Code/frontend/src/pages/batches/BatchesPage.tsx` (page to enhance)
- `02_Source/01_Source Code/frontend/src/types/index.ts` (existing types)
- `01_Documents/02_Domain Model.md` (for entity definitions)

**What to create:**

### 1. `frontend/src/components/qc/QCTestFormModal.tsx`
- Modal with Form for creating a new QC test
- Fields: lot_id (Select from quarantine lots), test_type (Select: Identity/Potency/Microbial/Growth Promotion/Physical/Chemical), test_method, test_date (DatePicker, default today), acceptance_criteria
- performed_by auto-filled from current user

### 2. `frontend/src/components/qc/QCResultModal.tsx`
- Modal for recording QC test result
- Fields: test_result (input), result_status (Select: Pass/Fail), verified_by
- Show lot info and test info as read-only header

### 3. `frontend/src/components/qc/QCApproveRejectButtons.tsx`
- Component with Approve (green) and Reject (red) buttons for a lot
- Approve: confirm dialog, calls approve API
- Reject: modal with required reason textarea, calls reject API

### 4. Update `frontend/src/hooks/useQCData.ts`
- Add `useCreateQCTest()` mutation
- Add `useUpdateTestResult()` mutation
- Add `useApproveLot()` and `useRejectLot()` mutations

### 5. `frontend/src/components/batches/BatchFormModal.tsx`
- Modal for creating a new production batch
- Fields: product_id (Select from materials), batch_number, batch_size, unit_of_measure, manufacture_date, expiration_date

### 6. `frontend/src/components/batches/BatchComponentsDrawer.tsx`
- Drawer showing batch components (lots used)
- Button to add component: select lot (only Accepted), planned_quantity
- Table of current components

### 7. Update `frontend/src/hooks/useBatchesData.ts`
- Add `useCreateBatch()` mutation
- Add `useAddComponent()` mutation

### 8. Update QCPage.tsx:
- Wire "Create QC Test" button to QCTestFormModal
- Add "Record Result" action button per row
- Add Approve/Reject buttons for lots in quarantine

### 9. Update BatchesPage.tsx:
- Wire "Create Batch" button to BatchFormModal
- Add row click to open BatchComponentsDrawer

Use the `@/` path alias for imports. Follow existing code patterns.
```

---

## Task 10: Frontend - Users + Labels + Reports Enhancement

```
You are working on the IMS project frontend (React 19 + TypeScript + Ant Design).

**Your task:** Add CRUD forms for Users, Labels, and enhance Reports with real export.

**Reference files to read first:**
- `02_Source/01_Source Code/frontend/src/components/materials/MaterialFormModal.tsx` (modal pattern)
- `02_Source/01_Source Code/frontend/src/hooks/useMaterialsData.ts` (mutation pattern)
- `02_Source/01_Source Code/frontend/src/pages/users/UsersPage.tsx`
- `02_Source/01_Source Code/frontend/src/pages/labels/LabelsPage.tsx`
- `02_Source/01_Source Code/frontend/src/pages/reports/ReportsPage.tsx`
- `02_Source/01_Source Code/frontend/src/types/index.ts`
- `01_Documents/02_Domain Model.md`

**What to create:**

### 1. `frontend/src/components/users/UserFormModal.tsx`
- Modal for creating/editing a user
- Create mode: username, email, password, role (Select from ROLE_TAG), is_active (Switch)
- Edit mode: username (disabled), email, role, is_active (no password field)
- Validation: email format, required fields

### 2. Update `frontend/src/hooks/useUsersData.ts`
- Add `useSaveUser()` mutation (create/update)
- Add `useToggleUserActive()` mutation

### 3. Update UsersPage.tsx:
- Wire "Add User" button to UserFormModal (create mode)
- Add Edit button per row to open UserFormModal (edit mode)
- Add Lock/Unlock toggle button per row

### 4. `frontend/src/components/labels/LabelTemplateFormModal.tsx`
- Modal for creating/editing label templates
- Fields: template_name, label_type (Select: Raw Material/API/Sample/Intermediate/Finished Product/Status), width, height, template_content (JSON editor or multi-select of fields)

### 5. Update `frontend/src/hooks/useLabelsData.ts`
- Add `useSaveTemplate()` mutation

### 6. Update LabelsPage.tsx:
- Wire "Create Template" button to LabelTemplateFormModal
- Add Edit/Delete action buttons per row

### 7. `frontend/src/lib/exportUtils.ts`
- Helper function `exportToCSV(data, columns, filename)` that:
  - Takes array of objects, column definitions [{key, title}], and filename
  - Generates CSV content with headers
  - Creates Blob and triggers download

### 8. Update ReportsPage.tsx:
- Wire "Export Excel" button to exportToCSV with current report data
- Wire "Export PDF" button (use window.print() as simple approach, or just show "PDF export coming soon")
- Add date range filter (DatePicker.RangePicker) to filter report data
- Add report type selector that changes the displayed data table

Use the `@/` path alias for imports. Follow existing code patterns.
```

---

## How to Run

Run Task 1 first, then run Tasks 2-10 in parallel:

```bash
# Terminal 1 - Task 1 (run first, wait for completion)
claude "$(cat AGENT_TASKS.md | sed -n '/^## Task 1:/,/^## Task 2:/p')"

# Then run remaining tasks in parallel (each in its own terminal):
# Terminal 2-10 for Tasks 2-10
```

Or in Claude Code, paste each task prompt and run as separate agents.
