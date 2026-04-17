# 01_Product Requirements Document — Vibe Coding

Tài liệu ghi lại công cụ AI và các prompt chính mà nhóm đã dùng để tạo và cập nhật `01_Product Requirements Document.md`.

## 1. Công cụ AI đã sử dụng

| Công cụ | Mục đích | Ghi chú |
|---------|----------|---------|
| **Claude (Anthropic) — Claude Opus 4.x qua Claude Code CLI** | Soạn thảo, chỉnh sửa, review PRD | Dùng nhiều nhất, chạy trực tiếp trong terminal với context của repo |
| **ChatGPT (OpenAI GPT-4)** | Cross-check thuật ngữ tiếng Việt, làm mượt câu văn | Dùng bổ trợ |
| **Google Search / Wikipedia** | Tham khảo thực tiễn ngành dược/manufacturing để xác định pain points | — |

## 2. Các prompt chính đã dùng

### 2.1. Prompt khởi tạo phạm vi
> "Tôi đang xây dựng một hệ thống Inventory Management System (IMS) cho nhà máy dược phẩm/sản xuất. Hãy đề xuất các mục tiêu chiến lược, in-scope, out-of-scope, và 4 vai trò chính (Admin, Inventory Manager, QC, Production). Viết theo cấu trúc PRD chuẩn, tiếng Việt."

### 2.2. Prompt phân tích pain points
> "Với mỗi vai trò đã xác định (Admin, Inventory Manager, QC, Production), hãy liệt kê 2-3 pain points thực tế trong môi trường sản xuất dược phẩm còn dùng quy trình giấy tờ, và map mỗi pain point thành nhu cầu (needs) cụ thể mà hệ thống cần đáp ứng."

### 2.3. Prompt về Non-Functional Requirements
> "Hệ thống cần phục vụ ≥100 user đồng thời, ≥10.000 giao dịch/ngày, ≥1 triệu bản ghi. Hãy đề xuất các yêu cầu phi chức năng (hiệu năng, bảo mật, vận hành) cụ thể và đo lường được, kèm threshold số học."

### 2.4. Prompt review
> "Đọc PRD hiện tại, tìm chỗ không nhất quán giữa objectives, scope, và NFR. Chỉ ra các yêu cầu quá mơ hồ (không đo lường được) và đề xuất câu viết lại rõ ràng hơn."

## 3. Phương pháp review của con người

1. **Leader** (Nguyễn Thiên Thọ) review tổng thể mỗi vòng output từ AI
2. Cross-check với [Architecture.md](05_Architecture.md) để đảm bảo các NFR (≥10.000 giao dịch/ngày, API < 2s) khớp với kiến trúc đề xuất
3. Đối chiếu với [Product Backlog](04_Product%20Backlog.md) — mỗi tính năng trong PRD phải có ít nhất 1 user story tương ứng
4. Loại bỏ các yêu cầu AI sinh ra nhưng nằm ngoài scope đồ án (ví dụ: mobile app, CRM, accounting)
5. Thảo luận trong kênh liên lạc của nhóm trước khi commit bản cuối
