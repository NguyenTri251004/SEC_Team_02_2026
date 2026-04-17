# 04_Product Backlog — Vibe Coding

Tài liệu ghi lại công cụ AI và các prompt chính mà nhóm đã dùng để tạo và cập nhật `04_Product Backlog.md`.

## 1. Công cụ AI đã sử dụng

| Công cụ | Mục đích |
|---------|----------|
| **Claude (Anthropic) — Opus 4.x qua Claude Code CLI** | Sinh user stories, acceptance criteria, ưu tiên, sprint assignment |
| **ChatGPT** | Cross-check, làm mượt diễn đạt tiếng Việt |
| **GitHub Issues** | Import từng story thành issue (dùng CLI `gh issue create`) |

## 2. Các prompt chính đã dùng

### 2.1. Prompt tạo story theo vai trò
> "Với vai trò **Quản trị viên (Admin)** trong hệ thống IMS, hãy sinh toàn bộ user story cần có, theo format:
> - ID (QTV_XX)
> - Loại (Chức năng / Phi chức năng)
> - Mong muốn (As an Admin, I want to...)
> - Mục đích (so that...)
> - Độ ưu tiên (Cao / Trung bình / Thấp)
> - Sprint (1-4)
> - Tiêu chí chấp nhận rõ ràng, đo lường được
>
> Tiếng Việt. Bao phủ ít nhất: quản lý user, phân quyền, giám sát hệ thống, cấu hình."

### 2.2. Prompt tương tự cho các role khác
Các role khác: Vận hành (VH_XX), Quản lý (QL_XX), Kiểm soát chất lượng (KS_XX), Hệ thống (HT_XX). Cùng template.

### 2.3. Prompt ưu tiên hóa
> "Dưới đây là danh sách X user stories. Hãy sắp xếp vào 4 sprint theo MoSCoW (Must / Should / Could / Won't). Sprint 1 chỉ chứa các story bắt buộc để chạy luồng nghiệp vụ cốt lõi (Nhập → QC → Sản xuất → Xuất). Sprint 4 chứa các story nice-to-have."

### 2.4. Prompt acceptance criteria
> "Viết lại tiêu chí chấp nhận cho story 'VH_01 — Nhập kho nguyên vật liệu' theo chuẩn Given/When/Then hoặc câu tuyên bố đo được. Phải có: các trường bắt buộc, validation trùng lặp, trạng thái khởi tạo, audit log yêu cầu."

## 3. Phương pháp review của con người

1. Leader duyệt từng batch user story Claude sinh ra trước khi ghi vào backlog
2. Review theo cặp (pair review): 2 thành viên xem lại mỗi role
3. Loại bỏ các story trùng lặp hoặc quá mơ hồ
4. Đối chiếu với Domain Model — story không có entity hỗ trợ thì phải flag
5. Mỗi story trong backlog được link 1-1 với GitHub Issue và gắn milestone M1-M4
