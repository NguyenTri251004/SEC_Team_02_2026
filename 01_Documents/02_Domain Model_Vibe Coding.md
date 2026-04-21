# 02_Domain Model — Vibe Coding

Tài liệu ghi lại **quá trình vibe coding** đã dẫn tới nội dung trong `02_Domain Model.md` — từng entity, state machine, business rule được AI đề xuất và team refine như thế nào, kết thúc ở schema SQL thật.

## 0. Công cụ AI đã sử dụng

| Công cụ | Vai trò |
|---------|---------|
| **Claude (Anthropic) — Claude Opus 4.x qua Claude Code CLI** | Thiết kế entity, sinh sơ đồ Mermaid, review consistency giữa model và SQL |
| **Mermaid Live Editor** (mermaid.live) | Render class/state diagram từ cú pháp Claude sinh, verify trước khi embed |
| **dbdiagram.io** | Preview ERD từ DBML, dễ nhìn relationship hơn Mermaid |
| **ChatGPT** | Hỏi nhanh về DDD convention (Aggregate Root vs Entity vs Value Object) |

---

## 1. Xác định Entity chính

### 1.1. Vòng prompt 1 — danh sách entity

**Prompt gốc:**
> "Dựa trên PRD của IMS pharma (đã đọc ở `01_Product Requirements Document.md`), đề xuất các entity chính phục vụ: (a) nhập kho nguyên liệu, (b) QC kiểm định lô, (c) production batch tiêu thụ lô, (d) audit trail. Dùng quy ước DDD: phân biệt Aggregate Root, Entity, Value Object. Liệt kê thuộc tính cốt lõi của mỗi entity."

**Output AI:** 8 entity — Material, InventoryLot, InventoryTransaction, QCTest, ProductionBatch, BatchComponent, LabelTemplate, User. Phân loại AR: Material (root), InventoryLot (root), ProductionBatch (root). BatchComponent là Entity thuộc ProductionBatch.

**Vấn đề:** AI gộp `LabelTemplate` thành AR riêng, nhưng trong code thực tế label chỉ là config không có lifecycle phức tạp → nên là Value Object hoặc config table thuần.

**Prompt refine:**
> "`LabelTemplate` không có state/lifecycle, chỉ là config print. Coi nó là bảng config đơn giản (không phải Aggregate Root). Cập nhật lại phân loại DDD."

**Output sau refine:** 7 AR + 1 config table. Gọn hơn, khớp với `db-init.sql` thực tế.

**Kết quả:** Section "Entity chính" Domain Model.

### 1.2. Vòng prompt 2 — quan hệ và cardinality

**Prompt:**
> "Vẽ ER diagram Mermaid thể hiện quan hệ giữa 7 entity. Cardinality cụ thể: Material 1-* InventoryLot, InventoryLot 1-* InventoryTransaction, InventoryLot 1-* QCTest, ProductionBatch 1-* BatchComponent, BatchComponent *-1 InventoryLot (1 batch có thể dùng nhiều lot). Xác định FK cụ thể."

**Output:** Mermaid ERD + bảng FK. **Sai 1 chỗ:** đánh dấu `BatchComponent.lot_id` là nullable — nhưng business rule yêu cầu mỗi component PHẢI link tới 1 lot Accepted.

**Prompt fix:**
> "`BatchComponent.lot_id` phải NOT NULL và FK constraint NOT DEFERRABLE. Không cho phép có component mà không gắn lot. Cập nhật ER + SQL snippet."

**Output:** `lot_id UUID NOT NULL REFERENCES inventory_lots(lot_id)`. Consistent với rule "consume chỉ khi lot Accepted".

**Kết quả:** ER diagram section Domain Model + khớp với `db-init.sql` constraint.

---

## 2. State Machine của InventoryLot

### 2.1. Vòng prompt — thiết kế state diagram

**Prompt:**
> "Thiết kế state machine cho InventoryLot. 4 trạng thái: **Quarantine** (lúc mới nhập) → **Accepted** / **Rejected** (sau QC) → **Depleted** (khi quantity = 0, chỉ áp dụng với Accepted). Viết:
> - Mermaid stateDiagram-v2
> - Bảng transition: From → To, trigger, actor, điều kiện, side-effect (audit log, ghi transaction, update quantity)
> - Các invariant: ví dụ 'không thể từ Rejected quay về Accepted'"

**Output:** Mermaid + bảng 6 transition. Có 1 transition **sai logic**: cho phép Quarantine → Depleted trực tiếp (không qua Accepted). Không hợp lệ: chưa QC không thể hết hàng.

**Prompt fix:**
> "Transition `Quarantine → Depleted` sai. Chỉ `Accepted → Depleted` mới hợp lệ (consume material chỉ từ Accepted lot). Xoá transition đó và bổ sung invariant 'Depleted chỉ đạt được từ Accepted'."

**Output:** state diagram gọn lại còn 5 transition hợp lệ. Invariant bổ sung.

**Kết quả:** Section "Vòng đời Lot" Domain Model — bây giờ khớp 1-1 với check constraint SQL và logic trong `backend/src/modules/lots/lots.service.ts`.

### 2.2. Vòng prompt — verify bằng implementation

**Prompt:**
> "Đọc `backend/src/modules/lots/lots.service.ts`. Xác định mỗi function `createLot`, `approveLot`, `rejectLot`, `markDepleted` khớp với transition nào trong state diagram. Nếu có function không có transition tương ứng (hoặc ngược lại) thì flag."

**Output:** 4/4 function khớp. Không gap.

**Kết quả:** confirm Domain Model ↔ code thực tế consistent.

---

## 3. Business Rules (Invariants)

### 3.1. Vòng prompt — sinh invariant

**Prompt:**
> "Viết ≥10 business invariant cho domain IMS. Mỗi invariant phải có: (a) phát biểu rõ ràng, (b) ví dụ tình huống vi phạm cụ thể, (c) cơ chế enforce (DB constraint, app logic, hay cả hai). Ví dụ: 'Một lot chỉ được dùng trong ProductionBatch nếu lot.status = Accepted VÀ lot.expiration_date > NOW()'."

**Output:** 12 invariant — cover expiration, quantity non-negative, status transition, QC test result validity, batch completion rule.

**Vấn đề:** invariant số 7 "ProductionBatch chỉ complete khi mọi component có actual_quantity > 0" **xung đột** với business flow cho phép batch complete với 1 vài component `actual_quantity = planned_quantity = 0` (placeholder).

**Prompt fix:**
> "Invariant #7 sai — batch có thể complete với component actual_quantity = 0 nếu planned cũng = 0 (component tuỳ chọn). Sửa lại: 'ProductionBatch complete chỉ khi mọi component có actual_quantity >= planned_quantity × (1 - tolerance)'. Tolerance mặc định 5%."

**Output:** invariant sửa, thêm tham số tolerance.

**Kết quả:** Section "Business Rules" Domain Model — 12 invariant có cơ chế enforce rõ.

---

## 4. Phương pháp review của con người

1. **Toàn nhóm review ER và state diagram** trong buổi họp sprint planning — mỗi thành viên đối chiếu với module mình phụ trách
2. **Đối chiếu trực tiếp với `db_schema/db-init.sql`** — bảng/cột/constraint PostgreSQL phải khớp với Domain Model. Nếu lệch, ưu tiên sửa Domain Model theo SQL (SQL là source of truth đã chạy test).
3. **Chạy integration test** `warehouse-lifecycle-db.integration.test.ts` để verify state transition thực thi đúng trên DB thật — nếu test fail thì Domain Model hoặc code sai, phải reconcile
4. **AI bịa entity phải gỡ** — ví dụ AI từng đề xuất entity `SupplierContract` không có trong scope, Leader gỡ ngay
5. **Invariant phải có cơ chế enforce** — không ghi invariant nếu không có DB constraint hoặc unit test cover
