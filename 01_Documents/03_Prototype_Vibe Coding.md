# 03_Prototype — Vibe Coding

Tài liệu ghi lại công cụ AI và các prompt chính mà nhóm đã dùng để tạo và cập nhật `03_Prototype.md`.

## 1. Công cụ AI và thiết kế đã sử dụng

| Công cụ | Mục đích |
|---------|----------|
| **Figma** | Công cụ thiết kế prototype chính (link trong `03_Prototype.md`) |
| **Figma AI (First Draft)** | Sinh wireframe sơ khai từ prompt mô tả |
| **Claude (Anthropic)** | Viết kịch bản user journey, đặt tên màn hình, đề xuất cấu trúc điều hướng |
| **Ant Design gallery** | Tham khảo mẫu component cho dashboard/form |

## 2. Các prompt chính đã dùng

### 2.1. Prompt thiết kế user journey
> "Viết user journey end-to-end từ khi nhận nguyên liệu → kiểm QC → tạo batch → tiêu thụ nguyên liệu → hoàn thành batch → in tem. Mỗi bước liệt kê: (a) actor, (b) action, (c) trạng thái hệ thống thay đổi, (d) side-effect (audit log, label print). Tiếng Việt."

### 2.2. Prompt cho Figma First Draft
> "Design a dashboard for Inventory Manager in a pharmaceutical warehouse system. Include KPI cards (total lots, quarantine count, near-expiry lots), a line chart for stock trend, a table of lots with status badges (Quarantine/Accepted/Rejected), and a sidebar with navigation to Materials, Lots, QC, Batches, Reports. Modern, clean, using Ant Design aesthetics."

### 2.3. Prompt đặt tên và text content
> "Đề xuất labels, placeholder text, nút bấm, thông báo lỗi tiếng Việt cho form 'Tạo lô nhập kho mới' (Material, Manufacturer, Lot Number, Received Date, Expiration Date, Quantity, Unit, Storage Location). Phong cách trang trọng, phù hợp nhà máy dược."

### 2.4. Prompt review flow
> "Đọc user journey đã viết. Xác định các điểm có thể gây lỗi người dùng (misclick, thiếu validation, step quá dài). Đề xuất cải thiện UX."

## 3. Phương pháp review của con người

1. Export prototype Figma cho cả nhóm xem qua link share
2. Chạy thử **click-through test** trên prototype với 2-3 thành viên đóng vai từng role
3. Ghi nhận feedback vào GitHub Issue với label `ux-feedback`
4. Update Figma theo feedback trước khi chuyển implementation
5. Cross-check với Domain Model — các trường trong form phải khớp với entity attributes
