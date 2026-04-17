# 02_Domain Model — Vibe Coding

Tài liệu ghi lại công cụ AI và các prompt chính mà nhóm đã dùng để tạo và cập nhật `02_Domain Model.md`.

## 1. Công cụ AI đã sử dụng

| Công cụ | Mục đích |
|---------|----------|
| **Claude (Anthropic) — Opus 4.x qua Claude Code CLI** | Thiết kế entity, quan hệ, trạng thái, rule nghiệp vụ |
| **Mermaid Live Editor** | Vẽ sơ đồ class diagram / state diagram (render từ cú pháp Mermaid do Claude sinh ra) |
| **dbdiagram.io** | Preview ERD trước khi chuyển sang SQL |

## 2. Các prompt chính đã dùng

### 2.1. Prompt xác định entity chính
> "Dựa trên PRD của hệ thống IMS pharma (Material, Lot, QC, Production batch), hãy đề xuất các entity chính, thuộc tính từng entity, và quan hệ giữa chúng. Dùng quy ước DDD: phân biệt Aggregate Root, Entity, Value Object."

### 2.2. Prompt cho vòng đời (state machine)
> "Thiết kế state machine cho InventoryLot với 4 trạng thái: Quarantine → Accepted → Rejected → Depleted. Liệt kê các transition hợp lệ, điều kiện trigger, và hành động side-effect (tạo audit log, update transaction) khi chuyển state. Xuất dưới dạng Mermaid stateDiagram-v2."

### 2.3. Prompt cho business rules
> "Viết các invariant (bất biến) của domain IMS — ví dụ: 'Lot chỉ có thể được dùng trong ProductionBatch nếu status = Accepted và chưa hết hạn'. Liệt kê ≥10 invariant quan trọng, mỗi invariant có ví dụ tình huống vi phạm."

### 2.4. Prompt cross-validate
> "Đọc Domain Model hiện tại và Product Backlog. Với mỗi user story trong backlog, xác định entity/field nào trong Domain Model phục vụ cho story đó. Chỉ ra các story không có entity đỡ — đó là gap cần bổ sung."

## 3. Phương pháp review của con người

1. Toàn nhóm review sơ đồ ER và state diagram
2. Đối chiếu trực tiếp với `db_schema/db-init.sql` — các bảng, cột, constraint PostgreSQL phải khớp với Domain Model
3. Chạy PoC một số rule (ví dụ: constraint `batch_components.lot_id` → lot có status `Accepted`) để xác nhận rule thực thi được
4. Điều chỉnh khi phát hiện xung đột giữa model lý thuyết và implementation thực tế
