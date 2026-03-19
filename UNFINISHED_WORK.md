# Tổng hợp công việc chưa hoàn thành

> Cập nhật: 2026-03-19 — Dựa trên scan toàn bộ codebase

---

## 1. PRODUCTION WORKFLOW (P1 — Critical)

### 1.1 Frontend: Nút Start/Complete/Consume trên UI

**Hiện trạng:** Backend đã hoàn thành 100%. Frontend chỉ có list + create + add component.

**Backend đã có (KHÔNG cần sửa):**
- `PATCH /api/production/batches/:id/status` — chuyển Planned→In Progress→Complete/Rejected
- `POST /api/production/consume` — trừ SL lot, ghi transaction Usage, auto Depleted
- `GET /api/production/traceability/:batchId` — truy xuất nguồn gốc

**Frontend cần thêm:**

| File | Cần làm |
|------|---------|
| `frontend/src/services/api.ts` | Thêm methods: `updateBatchStatus()`, `consumeMaterial()`, `getBatchById()`, `getTraceability()` |
| `frontend/src/hooks/useBatchesData.ts` | Thêm hooks: `useUpdateBatchStatus()`, `useConsumeMaterial()`, `useGetTraceability()` |
| `frontend/src/components/batches/BatchComponentsDrawer.tsx` | Thêm: (1) Status buttons "Start Production"/"Complete"/"Reject" tùy theo batch.status, (2) "Consume" button + quantity input cho mỗi component row khi batch "In Progress", (3) Traceability tab/section |
| `frontend/src/types/index.ts` | **FIX**: `BatchStatus` đang là `"Completed"` → sửa thành `"Complete"` cho khớp backend |

**Luồng UI cần:**
```
BatchesPage → click batch → BatchComponentsDrawer
  ├─ Status = "Planned": [Start Production] button
  ├─ Status = "In Progress":
  │   ├─ Component table có [Consume] action column
  │   ├─ [Complete Batch] button
  │   └─ [Reject Batch] button
  └─ Status = "Complete"/"Rejected": read-only, show traceability
```

### 1.2 Tạo Finished Product khi Complete batch

**Hiện trạng:** Chưa có logic nào. Khi batch Complete, không có output product được tạo.

**Cần làm:**
- **Option A (đơn giản):** Khi batch Complete → tự động tạo 1 inventory_lot mới cho output product (lot_id auto-gen, material_id = batch.product_id, quantity = batch.batch_size, status = "Quarantine" để chờ QC)
- **Option B (phức tạp):** Tạo bảng `finished_products` riêng

**Files cần sửa:**
- `backend/src/modules/production/production.service.ts` → trong `updateBatchStatus()`, khi status = "Complete": INSERT inventory_lot + INSERT inventory_transaction (type = "Production")

### 1.3 Validate lot Accepted khi thêm component

**Hiện trạng:** Backend `addComponent()` đã validate lot.status = "Accepted" ✅. Frontend `BatchComponentsDrawer` đã filter lots Accepted ✅.

**Status: ĐÃ XONG** — không cần thêm gì.

---

## 2. LABEL SYSTEM (P1)

### 2.1 Validation label_type ↔ entity_type

**Hiện trạng:** Không có validation. Cho phép bất kỳ combination nào.

**Mapping cần enforce:**

| label_type | entity_type cho phép |
|-----------|---------------------|
| Raw Material | lot |
| API | lot |
| Sample | lot (is_sample=true) |
| Intermediate | lot, batch |
| Finished Product | batch |
| Status | lot, batch |

**Files cần sửa:**
- `backend/src/modules/labels/label.service.ts` → `generateLabelFromTemplate()` (line ~420): thêm validation mapping
- `backend/src/modules/labels/label.types.ts` → thêm constant `LABEL_TYPE_ALLOWED_ENTITIES`
- `frontend/src/components/labels/GenerateLabelModal.tsx` → enforce entity_type dựa vào template.label_type thay vì chỉ suggest

### 2.2 Frontend: Lot-specific và Batch-specific fields cho template

**Hiện trạng:** `LabelTemplateFormModal.tsx` chỉ có `MATERIAL_FIELDS` (7 fields). Thiếu lot fields và batch fields.

**Cần thêm:**

```typescript
// Lot fields (chưa có)
LOT_FIELDS = ["lot_id", "manufacturer_name", "manufacturer_lot", "received_date",
  "expiration_date", "status", "quantity", "unit_of_measure", "storage_location",
  "is_sample", "po_number"]

// Batch fields (chưa có)
BATCH_FIELDS = ["batch_id", "batch_number", "batch_size", "unit_of_measure",
  "manufacture_date", "expiration_date", "status", "product_name"]
```

**Files cần sửa:**
- `frontend/src/components/labels/LabelTemplateFormModal.tsx` → thêm LOT_FIELDS, BATCH_FIELDS, dynamic switch theo label_type

### 2.3 QR Code thiếu text bên dưới

**Hiện trạng:** Barcode có `includetext: true`. QR Code chỉ generate PNG image, không có caption.

**Cần sửa:**
- `backend/src/modules/labels/label.service.ts` → `generateQRCode()` (line ~133): dùng canvas để composite QR image + text bên dưới

### 2.4 Auto label generation khi status change

**Hiện trạng:** Label chỉ tạo manual.

**Cần thêm:**
- `backend/src/modules/qc/qc.service.ts` → trong `approveLot()`/`rejectLot()`: gọi label.service tạo Status label
- `backend/src/modules/production/production.service.ts` → trong `updateBatchStatus()`: gọi label.service tạo label tương ứng
- Cần xác định template nào dùng cho auto-gen (default template per label_type)

### 2.5 Seed Intermediate template

**Hiện trạng:** 5 templates seeded (Raw Material, API, Status, Finished Product, Sample). Thiếu Intermediate.

**Cần thêm vào:**
- `db_schema/db-init.sql` → INSERT thêm 1 template label_type = "Intermediate"

---

## 3. QC & QUALITY WORKFLOW (P1-P2)

### 3.1 Workflow khi QC test Failed — guidance reject

**Hiện trạng:** Khi test = Fail → approveLot bị block (đúng). Nhưng không có UI guidance để reject.

**Cần thêm:**
- `frontend/src/components/qc/QCResultModal.tsx` → sau khi record Fail, hiện alert + button "Reject Lot Now?"
- Hoặc: trên QCPage, khi lot có failed tests → hiện warning banner + highlight Reject button

### 3.2 QC Dashboard: xóa mock data fallback

**Hiện trạng:** `useQCData.ts` → `useQCTests()` (line 65-78) trả về hardcoded mock data khi API fail.

**Cần sửa:**
- `frontend/src/hooks/useQCData.ts` → xóa mock data, return empty array + proper error state thay vì mock

### 3.3 Backend enforce Quarantine-only cho lot edit/delete

**Hiện trạng:** Frontend disable Edit khi ≠ Quarantine ✅, Delete ẩn ✅. Backend KHÔNG validate.

**Cần sửa:**
- `backend/src/modules/lots/lot.service.ts` → `updateLot()` (line ~110): thêm check lot.status === "Quarantine"
- `backend/src/modules/lots/lot.service.ts` → `deleteLot()` (line ~194): thêm check lot.status === "Quarantine"
- Return 400/403 với message "Only Quarantine lots can be edited/deleted"

---

## 4. INVENTORY LOT UX (P2-P3)

### 4.1 Sample lot: parent_lot_id dropdown

**Hiện trạng:** Text input tự nhập (line 210-212 LotFormModal.tsx).

**Cần sửa:**
- `frontend/src/components/lots/LotFormModal.tsx` → thay Input bằng Select/Dropdown
- Fetch lots (filter: non-sample, status = Accepted) làm options
- Hiển thị: "LOT-001 — Material X (500 kg)"

### 4.2 Transaction Notes column truncated

**Hiện trạng:** Dùng `ellipsis: true` → text dài bị cắt.

**Cần sửa:**
- `frontend/src/pages/transactions/TransactionsPage.tsx` (line 94-98) → thêm Ant Design Tooltip hoặc Popover cho Notes column

---

## 5. ADMIN DASHBOARD (P2)

### 5.1 Health Monitoring

**Hiện trạng:** Chỉ có KPI cards (Active Users, Transactions, Lots). Không có infrastructure health.

**Cần thêm (theo backlog QTV_03.01):**

**Backend:**
- `backend/src/modules/admin/admin.routes.ts` → thêm `GET /api/admin/health`
- `backend/src/modules/admin/admin.service.ts` → thêm `getSystemHealth()`: ping DB, Redis, Elasticsearch, check uptime

**Frontend:**
- `frontend/src/pages/dashboard/AdminDashboard.tsx` → thêm Health panel:
  - Service status cards (DB/Redis/ES: Active/Error)
  - API response time
  - Uptime %
  - Auto-refresh 30s

---

## 6. AUTH & INFRASTRUCTURE (P1-P2)

### 6.1 Keycloak realm seed file (P1)

**Hiện trạng:** Không có file seed realm. Phải setup manual.

**Cần tạo:**
- `backend/keycloak/realm-export.json` → realm `inventory-management`, client `inventory-frontend`, 5 roles, 5 test accounts
- `docker-compose.yml` → mount volume realm-export.json vào Keycloak container

### 6.2 Import Keycloak lên cloud (P1)

**Hiện trạng:** Local có Keycloak trong Docker. Cloud chưa import.

**Cần làm:**
- Export realm từ local Keycloak
- Import lên cloud Keycloak instance (lemur-7.cloud-iam.com)
- Verify test accounts login được

### 6.3 Docker Compose: Keycloak healthcheck dependency (P2)

**Hiện trạng:** Backend dùng `condition: service_started` thay vì `service_healthy`.

**Cần sửa:**
- `docker-compose.yml` (line ~159): đổi thành `condition: service_healthy`

### 6.4 .env / .env.example đồng bộ (P2)

**Hiện trạng:** 3 file .env.example không sync. Thiếu keys.

**Cần sửa:**

| Variable | Root | Backend | Frontend | Action |
|----------|------|---------|----------|--------|
| KEYCLOAK_PUBLIC_KEY | ✗ | ✓ | ✗ | Thêm vào root |
| KEYCLOAK_ADMIN_USER/PASSWORD | ✓ | ✗ | ✗ | Thêm vào backend |
| VITE_BYPASS_KEYCLOAK | ✗ | ✗ | ✓ | Thêm vào root |

### 6.5 Sign Out flow (ĐÃ XONG ✅)

AuthProvider.tsx gọi `keycloak.logout()` đúng. AppLayout kết nối logout button. **Không cần sửa.**

### 6.6 JWT Keycloak verify (ĐÃ XONG ✅)

auth.ts đã có `getVerificationKey()` fetch Keycloak public key + cache 60s. **Không cần sửa.**

---

## 7. MISC (P3-P4)

### 7.1 ID auto-generated vs manual

**Hiện trạng:** Không thống nhất. Một số module auto-gen, một số yêu cầu nhập tay.

**Cần:** Audit từng module, document rule, cập nhật UI cho consistent.

### 7.2 Test coverage

**Hiện trạng:** Test coverage thấp ở nhiều module.

**Cần:** Bổ sung unit + integration tests cho production, QC, lots, transactions.

### 7.3 Test label.routes viết lại

**Hiện trạng:** Test chưa cover đủ auth, permission, validation paths.

**Cần:** Rewrite theo integration style.

---

## TÓM TẮT SỐ LƯỢNG

| Nhóm | Items cần làm | Priority |
|------|:-------------:|:--------:|
| 1. Production Workflow | 5 | P1 |
| 2. Label System | 5 | P1 |
| 3. QC & Quality | 3 | P1-P2 |
| 4. Inventory Lot UX | 2 | P2-P3 |
| 5. Admin Dashboard | 1 | P2 |
| 6. Auth & Infra | 4 (2 đã xong) | P1-P2 |
| 7. Misc | 3 | P3-P4 |
| **Tổng** | **~20 items** | |

---

## FILES CHÍNH CẦN SỬA

### Backend (8 files):
1. `backend/src/modules/production/production.service.ts` — finished product on Complete
2. `backend/src/modules/labels/label.service.ts` — validation, QR text, auto-gen
3. `backend/src/modules/labels/label.types.ts` — mapping constant
4. `backend/src/modules/lots/lot.service.ts` — Quarantine validation
5. `backend/src/modules/qc/qc.service.ts` — auto-label on approve/reject
6. `backend/src/modules/admin/admin.service.ts` — health endpoint
7. `backend/src/modules/admin/admin.routes.ts` — health route
8. `db_schema/db-init.sql` — Intermediate template seed

### Frontend (12 files):
1. `frontend/src/services/api.ts` — production API methods
2. `frontend/src/hooks/useBatchesData.ts` — new hooks
3. `frontend/src/components/batches/BatchComponentsDrawer.tsx` — status/consume UI
4. `frontend/src/types/index.ts` — BatchStatus fix
5. `frontend/src/components/labels/GenerateLabelModal.tsx` — enforce entity_type
6. `frontend/src/components/labels/LabelTemplateFormModal.tsx` — lot/batch fields
7. `frontend/src/components/qc/QCResultModal.tsx` — failed test guidance
8. `frontend/src/hooks/useQCData.ts` — remove mock
9. `frontend/src/components/lots/LotFormModal.tsx` — parent lot dropdown
10. `frontend/src/pages/transactions/TransactionsPage.tsx` — Notes tooltip
11. `frontend/src/pages/dashboard/AdminDashboard.tsx` — health panel
12. `frontend/src/hooks/useLotsData.ts` — fetch parent lots hook

### Infrastructure (3 files):
1. `docker-compose.yml` — healthcheck dependency
2. `.env.example` (3 files) — sync keys
3. `backend/keycloak/realm-export.json` — new file
