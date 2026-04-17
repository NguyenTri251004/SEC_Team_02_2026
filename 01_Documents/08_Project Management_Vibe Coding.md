# 08_Project Management — Vibe Coding

Tài liệu ghi lại công cụ AI và các prompt chính mà nhóm đã dùng để tạo và cập nhật `08_Project Management.md`.

## 1. Công cụ AI đã sử dụng

| Công cụ | Mục đích |
|---------|----------|
| **Claude (Anthropic) — Opus 4.x qua Claude Code CLI** | Soạn milestone, ước lượng công sức, viết mô tả quy trình quản lý |
| **GitHub Projects** (tích hợp GitHub) | Hệ thống PM thực tế — không phải AI, nhưng là công cụ vận hành |
| **GitHub Issues** | Hệ thống bug tracking thực tế |

## 2. Các prompt chính đã dùng

### 2.1. Prompt estimate milestone
> "Dự án IMS có 6 thành viên, làm trong 11 tuần theo lịch đồ án môn SEC. Cần hoàn thành: PRD, Domain Model, Prototype, Architecture, PoC, Backlog đầy đủ, implementation MVP + mở rộng (gRPC, GraphQL, RAG AI), testing, deploy. Hãy đề xuất 4 milestone chính (Inception, PoC, Midterm Release, Final Release) với deadline và deliverables từng milestone."

### 2.2. Prompt estimate effort
> "Ước tính man-months cần có để hoàn thành toàn bộ dự án IMS với scope đã có. Giả định mỗi thành viên đóng góp ~2 man-months. Chi phí hạ tầng dùng free tier (Fly.io + Vercel + Supabase + GitHub Free)."

### 2.3. Prompt mô tả workflow PM
> "Viết mô tả cách nhóm dùng GitHub Projects làm kanban board: trạng thái (Backlog → To Do → In Progress → In Review → Done), label (role, sprint), milestone (M1-M4), assignee. Mỗi user story trong Product Backlog được convert thành 1 issue."

### 2.4. Prompt về các mục cần screenshot
> "Theo syllabus `enterprise-project-artifacts`, tài liệu Project Management phải có screenshot mời giáo viên vào hệ thống liên lạc, hệ thống PM, hệ thống bug tracking. Viết block TODO rõ ràng cho từng mục, không fake placeholder."

## 3. Phương pháp review của con người

1. Leader điền thông tin thật về thành viên (MSSV, họ tên) — không để AI sinh tên giả
2. Đối chiếu milestone với tiến độ thực tế: commit date của các feature phải khớp với milestone tương ứng
3. Mỗi lần họp weekly, update trạng thái user story trên GitHub Projects và reflect lại tài liệu này nếu có thay đổi timeline
4. Screenshot và YouTube link chỉ được điền khi đã thực sự quay/chụp — không dùng placeholder image
