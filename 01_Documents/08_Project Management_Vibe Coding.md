# 08_Project Management — Vibe Coding

Tài liệu ghi lại **quá trình vibe coding** đã dẫn tới `08_Project Management.md` — các mục estimation, milestones, workflow quản lý dự án được AI đề xuất và team refine như thế nào.

## 0. Công cụ AI và công cụ PM đã sử dụng

| Công cụ | Vai trò |
|---------|---------|
| **Claude (Anthropic) — Claude Opus 4.x qua Claude Code CLI** | Soạn milestone, ước lượng công sức, viết mô tả workflow PM |
| **GitHub Projects** | Hệ thống PM thực tế (kanban board, milestone, assignee) — không phải AI |
| **GitHub Issues** | Hệ thống bug tracking — không phải AI |
| **Discord** | Kênh liên lạc nội bộ — quyết định quan trọng thảo luận ở đây trước khi ghi vào PM artifact |

---

## 1. Estimation (Kích cỡ / Thời gian / Chi phí)

### 1.1. Vòng prompt 1 — man-months từ scope

**Prompt gốc:**
> "Dự án IMS có: 6 thành viên, 11 tuần (theo lịch HK2 2025-2026 môn SEC của thầy Ngô Huy Biên), scope đã xác định trong `01_Product Requirements Document.md` (~90 user story, 4 role dashboard, 3 service backend/frontend/AI). Ước lượng:
> - **Man-months** tổng (giả định mỗi thành viên 2 MM cho 11 tuần part-time)
> - **Chi phí hạ tầng** (free tier Fly.io + Vercel + Supabase + Cloud-IAM)
> - **Chi phí nhân sự** (đồ án sinh viên = N/A)
> Dẫn chứng cách tính man-months."

**Output:** 12 man-months (6 người × 2 MM). **Vấn đề:** AI tự đoán "part-time 50%" nhưng thực tế mỗi thành viên học 4-5 môn khác → chỉ ~25% effort cho môn này → con số 12 MM lạc quan.

**Prompt refine:**
> "Sinh viên HK2 học 5 môn, môn này 1 môn → effort ~25% (không phải 50%). Tính lại: 6 × 11 tuần × 25% × 40h/tuần = 660 hours total = ~4 MM effort thực. Nhưng giữ con số 12 MM kiểu 'Theo lý thuyết scope này cần 12 MM; team có 4 MM effort thực, phải trim scope hoặc dùng AI assist mạnh'."

**Output:** section estimation có 2 con số — "ước lượng scope" (12 MM) vs "effort thực" (4 MM), giải thích vì sao vibe coding + AI giúp team close gap.

**Kết quả:** Section "1. Ước lượng dự án" Project Management — honest, có context.

---

## 2. Milestones

### 2.1. Vòng prompt — 4 milestone chính

**Prompt:**
> "Chia 11 tuần thành 4 milestone theo RUP/Agile hybrid:
> - **M1 Inception** (tuần 3): hoàn thành artifact giai đoạn đầu — PRD, Domain Model, Prototype Figma, Architecture draft
> - **M2 Proof of Concept** (tuần 5): hoàn thành PoC các tính năng khó (Keycloak, Elasticsearch, Label PDF, Lot lifecycle)
> - **M3 Midterm Release** (tuần 7): demo 1 business problem end-to-end — MVP Inventory + Lot + QC + Production, deploy lên Fly.io + Vercel, có URL production
> - **M4 Final Release** (tuần 11 Thứ 6): hoàn thành Backlog đầy đủ, bổ sung tính năng mở rộng, tài liệu đầy đủ, nộp ZIP
> Mỗi milestone có: deadline cụ thể, deliverable list, acceptance criteria."

**Output:** 4 milestone với deliverable rõ. **Vấn đề:** deadline rơi cuối tuần — thực tế deadline môn là **Thứ 6 tuần cuối** (không phải Chủ Nhật).

**Prompt fix:**
> "Deadline final release phải là Thứ 6 tuần 11 (không phải Chủ Nhật). Sửa lại cho khớp lịch môn."

**Output:** deadline đúng Thứ 6.

**Kết quả:** Section "2. Các cột mốc quan trọng" Project Management.

---

## 3. Team Info

### 3.1. Vòng prompt — role trong team

**Prompt:**
> "Leader là Nguyễn Thiên Thọ (MSSV 21127173). 5 thành viên còn lại đều là thành viên bình thường (không chia role kiểu Backend Dev / Frontend Dev / QA — tất cả cùng tham gia mọi giai đoạn). Viết section team theo format bảng: STT, MSSV, Họ tên, Vai trò.
> Ghi chú: Leader điều phối chung và nộp bài, KHÔNG ghi phân bổ điểm số (chưa quyết định)."

**Output:** bảng 6 dòng. **Lần đầu AI tự sinh tên giả** — bị Leader yêu cầu điền tên thật từ thông tin thực.

**Prompt fix:**
> "Không sinh tên giả. Placeholder `[Tên thành viên X]` để Leader điền tay. MSSV cũng placeholder. Ghi rõ vai trò tất cả là 'Thành viên' trừ Leader."

**Output:** bảng với placeholder. Leader điền tay sau đó.

**Kết quả:** Section "3. Thành viên nhóm" Project Management — tên thật.

---

## 4. Workflow GitHub Projects

### 4.1. Vòng prompt — mô tả cách dùng

**Prompt:**
> "Viết mô tả cách nhóm dùng GitHub Projects:
> - **Kanban board** với 5 cột: Backlog → To Do → In Progress → In Review → Done
> - **Issue** tạo từ user story backlog (bulk import qua `gh issue create` từ file JSON)
> - **Label** phân loại: `role: admin`, `role: operator`, `role: manager`, `role: qc`, `role: production`; sprint label `sprint-1` đến `sprint-4`
> - **Milestone** tương ứng M1-M4
> - **Assignee** gán thành viên phụ trách
> Giải thích khi nào move card giữa cột (ví dụ: chuyển In Progress khi có commit đầu tiên, In Review khi Leader được ping review, Done khi commit đã vào master)."

**Output:** mô tả rõ workflow. Khớp thực tế team đang dùng.

**Kết quả:** Section "5. Hệ thống quản lý dự án" Project Management.

---

## 5. Screenshot và Invitation

### 5.1. Vòng prompt — chỗ cần screenshot

**Prompt:**
> "Theo syllabus `enterprise-project-artifacts`, Project Management artifact phải có screenshot mời giảng viên làm admin vào hệ thống PM (GitHub Projects) và hệ thống bug tracking (GitHub Issues). Viết block TODO cho từng screenshot. Team quyết định **KHÔNG mời giảng viên vào Discord** (chỉ ghi Discord là kênh liên lạc nội bộ)."

**Output:** 2 block TODO rõ ràng. Sau này team quay screenshot thật → file `assets/001.png` (invite PM admin) và `assets/002.png` (Issues tab + labels).

**Kết quả:** Section Screenshot trong Project Management — **đã hoàn thành** cả 2 screenshot tính đến commit `9851e606c`.

---

## 6. Phương pháp review của con người

1. **Leader điền thông tin thật về thành viên** (MSSV, tên) — tuyệt đối không để AI sinh tên giả
2. **Đối chiếu milestone với tiến độ thực tế** — commit date của feature phải nằm trong khoảng milestone tương ứng; nếu lệch nhiều thì cập nhật milestone hoặc re-plan
3. **Weekly sync Discord** — mỗi Thứ 2 Leader tổng kết trạng thái backlog + milestone; thay đổi timeline reflect lại tài liệu này
4. **Screenshot chỉ điền khi đã chụp thật** — không dùng placeholder image hoặc stock photo
5. **Con số estimation có context** — nếu ghi 12 MM phải giải thích cách tính (6 × 2), không để trống
6. **Không ghi Discord invite link** — Discord là kênh nội bộ, không mời ngoài. Tài liệu chỉ ghi "team dùng Discord"
