# 06_Proof of Concept — Vibe Coding

Tài liệu ghi lại công cụ AI và các prompt chính mà nhóm đã dùng để tạo và cập nhật `06_Proof of Concept.md`.

## 1. Công cụ AI đã sử dụng

| Công cụ | Mục đích |
|---------|----------|
| **Claude (Anthropic) — Opus 4.x qua Claude Code CLI** | Sinh code mẫu, debug, giải thích kết quả PoC |
| **Cursor IDE** (đợt đầu) | IDE hỗ trợ autocomplete AI, refactor nhanh |
| **GitHub Copilot** | Gợi ý inline khi viết code |
| **Stack Overflow / GitHub Issues** | Tham khảo giải pháp cho các thư viện cụ thể (bwip-js, qrcode, jsPDF) |

## 2. Các tính năng khó đã thử nghiệm PoC

1. **Barcode + QR code generation** — dùng `bwip-js` (barcode) + `qrcode` (QR) phía backend, render ra buffer PNG
2. **Label PDF với template tùy biến** — dùng `jsPDF` + `jspdf-autotable` phía frontend, hỗ trợ in nhãn Raw Material / Status / Finished Product
3. **Lot lifecycle state machine** — đảm bảo atomicity khi chuyển state (transaction DB + audit log + update lot quantity)
4. **Full-text search với Elasticsearch** — index materials và lots, query với fuzzy match
5. **Role-based dashboard** — React Query + Zustand, tách data hook theo role
6. **OpenTelemetry tracing** — instrument cả backend (Node) và frontend (browser) gửi trace về OTel collector

## 3. Các prompt chính đã dùng

### 3.1. Prompt cho Barcode/QR
> "Tôi cần generate barcode CODE128 và QR code trong Node.js, trả về base64 PNG để frontend render trên label. So sánh `bwip-js` vs `jsbarcode` vs `barcode-generator`. Viết function wrapper `generateBarcode(value, type)` trả về Promise<string>."

### 3.2. Prompt cho Lot state machine atomic
> "Khi consume material từ lot trong ProductionBatch, cần thực hiện 3 thao tác atomic: (1) trừ quantity của lot, (2) cập nhật `batch_components.actual_quantity`, (3) tạo `inventory_transactions` record. Viết implementation TypeScript + pg dùng transaction `BEGIN/COMMIT/ROLLBACK`, handle lock row (FOR UPDATE) để tránh race condition."

### 3.3. Prompt cho PDF Label
> "Dùng jsPDF và jspdf-autotable để in một label kích thước 100x60mm gồm: tên material, lot number, barcode, QR code, received date, expiration date, manufacturer. Tự động fit font size nếu text dài. Support print batch (nhiều label/trang A4)."

### 3.4. Prompt cho Elasticsearch full-text
> "Config Elasticsearch index cho bảng `materials` và `inventory_lots` với analyzer hỗ trợ tiếng Việt (ICU hoặc built-in). Viết service `search.service.ts` với method `searchMaterials(query, filters, pagination)` dùng `multi_match` query và highlight."

### 3.5. Prompt debug
> "Integration test `warehouse-lifecycle-db.integration.test.ts` bị fail với `AggregateError: pg connection timeout`. Log cho thấy connect `localhost:5432` refused. Kiểm tra giúp các giả thuyết: (a) Docker postgres chưa up, (b) DATABASE_URL sai port, (c) test setup chưa await DB ready. Đề xuất cách debug."

## 4. Phương pháp review của con người

1. Mỗi PoC có branch riêng (`poc/barcode-gen`, `poc/lot-state-machine`, ...) và PR có test kèm
2. Review code thủ công — không merge code AI sinh mà chưa chạy test
3. Đo performance: mỗi PoC ghi lại thời gian xử lý (ví dụ: generate 1 label < 100ms, search full-text < 500ms)
4. Nếu PoC thất bại hoặc performance kém, ghi rõ lý do và giải pháp thay thế
5. Kết quả PoC (snippets + benchmark) được tổng hợp vào `06_Proof of Concept.md`
