# 01_Product Requirements Document — Vibe Coding

Tài liệu ghi lại **quá trình vibe coding** đã dẫn tới nội dung trong `01_Product Requirements Document.md` — từng mục lớn (Objectives, Scope, Pain Points, NFR) được soạn thảo qua các vòng đối thoại với AI như thế nào.

## 0. Công cụ AI đã sử dụng

| Công cụ | Vai trò |
|---------|---------|
| **Claude (Anthropic) — Claude Opus 4.x qua Claude Code CLI** | Tool chính, soạn từng mục PRD trong context của repo |
| **ChatGPT (GPT-4)** | Cross-check thuật ngữ tiếng Việt chuyên ngành dược/manufacturing |
| **Google Search / tài liệu FDA + GMP** | Tra thực tiễn pharma để xác định pain points thật (AI hay sinh generic, phải dựa docs ngành) |

---

## 1. Xác định Objectives và Scope

### 1.1. Vòng prompt 1 — brief toàn cảnh

**Prompt gốc:**
> "Tôi đang xây dựng Inventory Management System (IMS) cho nhà máy dược phẩm/sản xuất. Đồ án sinh viên, 6 thành viên, 11 tuần. Đề xuất các **strategic objectives** và **scope boundaries** — phân biệt rõ in-scope vs out-of-scope. Viết tiếng Việt, theo cấu trúc PRD chuẩn."

**Output AI:** 5 objective + 12 mục in-scope + 8 mục out-of-scope. Nhưng **objective quá generic** — "tăng hiệu quả vận hành" không đo lường được.

**Vấn đề:** PRD mà không có số thì thành slogan. Cần threshold cụ thể.

**Prompt refine:**
> "Các objective trên quá trừu tượng. Viết lại sao cho mỗi objective có **ít nhất 1 metric đo lường được** (ví dụ: 'giảm 50% thời gian kiểm kê cuối tháng', 'hỗ trợ ≥10.000 giao dịch/ngày'). Loại bỏ các câu slogan không đo được."

**Output sau refine:** 5 objective kèm SMART metric — ví dụ "Hỗ trợ ≥100 concurrent user", "Query tồn kho < 2s", "Audit trail 100% thao tác ghi".

**Kết quả:** Section "1. Mục tiêu chiến lược" và "2. Phạm vi" trong PRD.

### 1.2. Vòng prompt 2 — thu hẹp out-of-scope

**Vấn đề:** AI ban đầu đưa vào scope cả mobile app, CRM, accounting module — vượt quá khả năng 11 tuần.

**Prompt:**
> "Out-of-scope hiện tại chưa dứt khoát. Rule cho đồ án sinh viên: chỉ giữ trong scope những gì team 6 người có thể demo đầy đủ trong 11 tuần. Đẩy ra out-of-scope: mobile app, CRM, HR, accounting, POS, WMS cấp cao (AS/RS, AGV). Viết lại mục 2.2."

**Output:** out-of-scope dứt khoát, có ghi chú lý do loại từng mục.

**Kết quả:** Section "2.2. Ngoài phạm vi" PRD.

---

## 2. Pain Points và User Needs

### 2.1. Vòng prompt — map pain → need

**Prompt gốc:**
> "Với 4 vai trò chính (Admin, Inventory Manager, QC, Production), liệt kê 2-3 pain points thực tế trong nhà máy dược còn dùng giấy tờ thủ công. Map mỗi pain thành need cụ thể hệ thống phải đáp ứng. Dùng format: Role → Pain → Need → Requirement ID. Dẫn chứng thực tế (GMP, FDA 21 CFR Part 11) cho pain liên quan compliance."

**Output:** 10 pain × 10 need, có trích dẫn GMP cho các pain về truy xuất nguồn gốc.

**Vấn đề:** AI tự bịa trích dẫn FDA không tồn tại (ví dụ "FDA guideline 2019-XYZ" — không có thật).

**Prompt fix:**
> "Các dẫn chứng FDA/GMP phải trích được từ document chính thức. Nếu không trích được thì bỏ, đừng bịa. Chỉ giữ lại dẫn chứng nào tôi có thể verify qua fda.gov hoặc ich.org."

**Output:** xoá 3 trích dẫn bịa, giữ 2 dẫn chứng có nguồn (FDA 21 CFR Part 11 về electronic records, ICH Q7 về GMP API).

**Kết quả:** Section "3. Phân tích vai trò và nhu cầu" PRD.

---

## 3. Non-Functional Requirements

### 3.1. Vòng prompt — NFR theo category

**Prompt:**
> "Hệ thống cần phục vụ ≥100 user đồng thời, ≥10.000 giao dịch/ngày, ≥1 triệu bản ghi. Sinh NFR chi tiết theo category: (1) Performance, (2) Scalability, (3) Availability, (4) Security, (5) Maintainability, (6) Usability. Mỗi NFR có threshold số học + cách đo."

**Output:** 18 NFR, mỗi NFR có threshold + cách đo.

**Vấn đề Leader review:** NFR "99.9% uptime" không thực tế với free tier Fly.io (shared-CPU có downtime). Hạ xuống 99% với ghi chú "best-effort trên free tier".

**Prompt fix:**
> "Availability 99.9% không đạt được trên free tier Fly.io (không có multi-region redundancy, shared CPU). Hạ xuống mức thực tế đo được qua Fly.io metrics: 99% trong giờ làm việc. Thêm disclaimer rõ ràng là free tier constraint."

**Output:** NFR-Availability sửa còn 99% + disclaimer. Các NFR khác giữ nguyên.

**Kết quả:** Section "4. Yêu cầu phi chức năng" PRD.

---

## 4. Review cross-artifact

### 4.1. Vòng prompt cuối — kiểm tra consistency

**Prompt:**
> "Đọc PRD hiện tại cùng `04_Product Backlog.md` và `05_Architecture.md`. Tìm:
> - NFR nào không có component kiến trúc đỡ (ví dụ: nói cache nhưng không có Redis)
> - User story nào trong backlog không map được với scope PRD
> - Metric nào trong PRD không có test case trong `09_System Evaluation.md`
> Xuất ra bảng gap."

**Output:** bảng gap 5 dòng. Ví dụ: "NFR Performance API <2s nhưng chưa có performance test case" → Leader tạo issue tracking.

**Kết quả:** PRD update lần cuối để khớp với Architecture và Backlog.

---

## 5. Phương pháp review của con người

1. **Leader** (Nguyễn Thiên Thọ) review tổng thể mỗi vòng output AI trước khi ghi vào PRD
2. **Cross-check ba chiều:** mỗi NFR phải có (a) component Architecture đỡ, (b) test case Evaluation đo, (c) ít nhất 1 user story Backlog cần
3. **Số phải có nguồn:** threshold "≥10.000 giao dịch/ngày", "≥100 user" được tính ngược từ quy mô nhà máy dược cỡ vừa (~500 nhân viên, 3 ca) — không để AI tự sinh số thiếu cơ sở
4. **Không aspirational:** nếu feature không chắc làm được trong 11 tuần thì đẩy ra out-of-scope ngay, không ghi "sẽ làm" vào PRD
5. **Trích dẫn phải verify** — dẫn chứng FDA/GMP/ISO phải link được tới document thật, không để AI bịa
6. **Leader duyệt bản cuối** trước khi commit vào repo; thay đổi lớn về scope/NFR thảo luận trong Discord trước khi ghi
