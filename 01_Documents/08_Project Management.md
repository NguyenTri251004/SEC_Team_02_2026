# Project Management

Tài liệu trình bày các kết quả ước lượng kích cỡ, thời gian và chi phí để hoàn thành đồ án; các cột mốc quan trọng; thông tin các thành viên nhóm; cùng các hệ thống cộng tác được nhóm sử dụng.

## 0. Bối cảnh môn học

| Thông tin | Giá trị |
|-----------|---------|
| Môn học | Software Engineering Capstone |
| Giảng viên | Ngô Huy Biên |
| Đồ án | Theo hướng hệ thống doanh nghiệp (Enterprise System Project) |
| Nhóm | SEC Team 02 — 2026 |
| Tham chiếu yêu cầu | https://nhbien.github.io/enterprise-project-artifacts/ |

## 1. Ước lượng dự án (Estimation)

| Thông số | Giá trị |
|----------|---------|
| Quy mô nhóm | 6 thành viên |
| Thời gian dự kiến | 11 tuần (Tuần 1 → Tuần 11 theo lịch môn học) |
| Khối lượng ước lượng | ~12 man-months |
| Chi phí hạ tầng | Miễn phí — dùng free tier (Fly.io shared-CPU 1x, Vercel Hobby, Supabase Free, GitHub Free) |
| Chi phí nhân sự | N/A (đồ án sinh viên) |

## 2. Các cột mốc quan trọng (Milestones)

| Milestone | Thời hạn | Mục tiêu |
|-----------|----------|----------|
| **M1: Inception** | Tuần 3 | Hoàn thành Product Requirements, Domain Model, Prototype (Figma), Architecture |
| **M2: Proof of Concept** | Tuần 5 | Hoàn thành PoC các tính năng khó (QR/Barcode, Label PDF, Lot lifecycle) |
| **M3: Midterm Release** | Tuần 7 | Demo 1 business problem; hoàn thành MVP Inventory + Lot + QC + Production; deploy lên Fly.io + Vercel |
| **M4: Final Release** | Tuần 11 (Thứ 6) | Hoàn thành Product Backlog, bổ sung gRPC/GraphQL/RAG AI, tài liệu đầy đủ, nộp ZIP |

## 3. Thành viên nhóm (Team Members)

| STT | MSSV | Họ và Tên | Vai trò |
|-----|----------|-------------------------|--------------|
| 1 | 21127173 | Nguyễn Thiên Thọ | **Leader** |
| 2 | 22127424 | Nguyễn Phước Minh Trí | Thành viên |
| 3 | 22127316 | Nguyễn Ngô Ngọc Như | Thành viên |
| 4 | 22127176 | Huỳnh Nguyễn Minh Khang | Thành viên |
| 5 | 22127074 | Võ Hoàng Đức | Thành viên |
| 6 | 18127008 | Lê Mạnh Hoàng | Thành viên |

**Ghi chú:** Leader chịu trách nhiệm điều phối chung, nộp bài, và thông báo phân bổ điểm số với giảng viên (nếu có). Các thành viên cùng tham gia tất cả giai đoạn từ phân tích yêu cầu, thiết kế, hiện thực, kiểm thử đến triển khai.

## 4. Video Team Building

> ⚠️ **[TODO] Cần quay và upload YouTube**
>
> **Nội dung cần có (theo yêu cầu syllabus):** video quay một buổi team building của nhóm.
>
> **YouTube link:** _(sẽ bổ sung)_

## 5. Hệ thống tương tác, liên lạc của nhóm

**Hệ thống:** _(TODO — xác nhận: nhóm dùng Discord / Messenger / Zalo / Slack?)_

**Link mời tham gia:** _(TODO — leader cung cấp link mời)_

### Ảnh chụp mời giảng viên làm admin/user

> ⚠️ **[TODO] Cần chụp màn hình**
>
> **Yêu cầu (theo syllabus):** ảnh chụp hành động mời tham gia hệ thống với vai trò admin/user để truy cập hệ thống tương tác, liên lạc của nhóm (ví dụ Slack, Discord).

## 6. Hệ thống quản lý dự án (Project Management)

**Hệ thống:** **GitHub Projects** — tích hợp sẵn trong repo chính của nhóm

**Link:** https://github.com/orgs/Inventory-management-SEC/projects

**Cách nhóm sử dụng:**
- **Kanban board** phân theo trạng thái: `Backlog → To Do → In Progress → In Review → Done`
- **Mỗi user story** trong Product Backlog được convert thành GitHub Issue, gắn label theo role (`admin`, `inventory_manager`, `qc`, `production`) và sprint (`sprint-1`, `sprint-2`, ...)
- **Milestones** tương ứng với các M1–M4 ở mục 2
- **Assignees** gán cho thành viên phụ trách

### Ảnh chụp mời giảng viên làm admin/user

> ⚠️ **[TODO] Cần chụp màn hình**
>
> **Yêu cầu (theo syllabus):** ảnh chụp hành động mời tham gia hệ thống quản lý dự án của nhóm.
>
> **Cách chụp:** Vào organization `Inventory-management-SEC` → `People` → `Invite member` (hoặc Project settings → Manage access) → chụp danh sách đã mời.

## 7. Hệ thống quản lý lỗi (Bug / Issue Tracking)

**Hệ thống:** **GitHub Issues** — tích hợp sẵn trong repo

**Link:** https://github.com/Inventory-management-SEC/SEC_Team_02_2026/issues

**Cách nhóm sử dụng:**
- Mỗi lỗi được tạo Issue với template gồm: mô tả, steps to reproduce, expected vs actual, environment, screenshots
- Label phân loại: `bug`, `enhancement`, `documentation`, `priority: high/medium/low`
- Link trực tiếp từ Issue sang Pull Request khi fix (`Fixes #123`)
- Milestones và assignees đồng bộ với GitHub Projects

### Ảnh chụp mời giảng viên làm admin/user

> ⚠️ **[TODO] Cần chụp màn hình**
>
> **Yêu cầu (theo syllabus):** ảnh chụp hành động mời tham gia hệ thống quản lý lỗi của nhóm.
>
> **Ghi chú:** GitHub Issues gắn với repo, nên invite ở mục Collaborators repo (xem `02_Source/03_Compilation Guide.md` mục 6) đã bao gồm quyền truy cập Issues. Có thể chụp bổ sung màn hình Issues tab với filter/label đang dùng làm minh chứng.
