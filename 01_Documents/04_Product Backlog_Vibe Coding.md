# 04_Product Backlog — Vibe Coding

Tài liệu ghi lại **quá trình vibe coding** đã dẫn tới `04_Product Backlog.md` — ~90 user story được sinh, refine, ưu tiên hoá và map vào sprint qua nhiều vòng prompt với AI.

## 0. Công cụ AI đã sử dụng

| Công cụ | Vai trò |
|---------|---------|
| **Claude (Anthropic) — Claude Opus 4.x qua Claude Code CLI** | Sinh story theo role, viết acceptance criteria, map sprint |
| **ChatGPT (GPT-4)** | Làm mượt diễn đạt tiếng Việt, check MoSCoW prioritization logic |
| **GitHub Issues + `gh` CLI** | Import story từ backlog thành issue (tự động bulk-create) |

---

## 1. Sinh story theo từng vai trò

### 1.1. Vòng prompt 1 — Admin (QTV)

**Prompt gốc:**
> "Với vai trò **Quản trị viên (Admin)** trong IMS pharma, sinh toàn bộ user story cần có. Format mỗi story:
> - ID (QTV_XX, XX = số thứ tự 2 chữ số)
> - Loại: Chức năng / Phi chức năng
> - Mong muốn: 'As an Admin, I want to…' dịch sang tiếng Việt
> - Mục đích: 'so that…' dịch
> - Độ ưu tiên: Cao / Trung bình / Thấp theo MoSCoW
> - Sprint: 1-4
> - Trạng thái: mặc định 'Chưa bắt đầu'
> - Tiêu chí chấp nhận: cụ thể, đo lường được, tối thiểu 2 điều kiện
> Bao phủ: quản lý user, phân quyền, giám sát sức khỏe, cấu hình hệ thống. Tiếng Việt trang trọng."

**Output AI:** 15 story QTV_01 đến QTV_15. Nhưng **acceptance criteria quá generic** — "Hệ thống phải validate input" không biết validate cái gì.

**Vấn đề:** AC chung chung không giúp developer biết khi nào xong. Không test được.

**Prompt refine:**
> "Acceptance criteria của 15 story trên quá generic. Viết lại theo template cụ thể:
> - Input validation: liệt kê field nào bắt buộc, rule validation (ví dụ 'email đúng format RFC 5322', 'password ≥ 8 ký tự có chữ hoa+số+đặc biệt')
> - State change: trước và sau thao tác, entity nào đổi field gì
> - Side effect: có ghi audit log không, thông báo cho ai
> - Error path: lỗi nào xử lý thế nào, trả HTTP code gì
> Lấy ví dụ QTV_01 (Quản lý user): viết lại AC chi tiết theo template."

**Output sau refine:** QTV_01 có AC cụ thể — field bắt buộc, unique check, audit log entry, error 400/409 handling. Template này áp dụng ngược cho 14 story còn lại.

**Kết quả:** nhóm user story Admin (QTV_XX) trong Backlog.

### 1.2. Các role còn lại

Tương tự prompt cho 4 role khác, mỗi role 1 vòng prompt gốc + ≥1 vòng refine AC:
- **Vận hành (VH_XX)** — 10 story: nhập kho, xuất kho, kiểm kê, in label, quét QR, chuyển kho, sửa lot
- **Quản lý (QL_XX)** — 8 story: dashboard tổng, theo dõi expiry, truy xuất nguồn gốc, audit log, báo cáo
- **Kiểm soát chất lượng (KS_XX)** — 6 story: queue QC, approve/reject, chi tiết lot, xử lý lô Rejected
- **Sản xuất (SX_XX)** — 7 story: tạo batch, start/complete batch, tiêu thụ material, in finished label
- **Hệ thống (HT_XX)** — 3 story chung: đăng nhập, phân quyền, audit trail

**Vấn đề chung:** AI có xu hướng **lặp story giữa các role** — ví dụ "xem tồn kho" xuất hiện ở cả VH và QL với wording khác nhau.

**Prompt dedupe:**
> "So sánh story VH và QL. Tìm story trùng ý (ví dụ VH_03 'Xem tồn kho để xuất' và QL_01 'Xem tổng quan tồn'). Nếu thực chất là 1 feature khác scope (Operator xem để action vs Manager xem để báo cáo), giữ cả 2 nhưng làm rõ khác biệt trong AC. Nếu trùng thật, gộp."

**Output:** 3 cặp story bị gộp, 2 cặp giữ với AC làm rõ khác biệt role.

---

## 2. Ưu tiên hoá và sprint assignment

### 2.1. Vòng prompt — MoSCoW và sprint

**Prompt:**
> "~90 story hiện tại. Sắp vào 4 sprint theo MoSCoW:
> - Sprint 1 (Must): chỉ các story **bắt buộc** để chạy luồng nghiệp vụ cốt lõi end-to-end (Material → Lot → QC → Production → Xuất). Không có sprint 1 thì không có demo.
> - Sprint 2 (Should): story quan trọng nhưng không block core flow (QR scan, báo cáo, audit log advanced)
> - Sprint 3 (Could): nice-to-have (cấu hình ngưỡng cảnh báo, chuyển kho nội bộ)
> - Sprint 4 (Won't this time): low-impact, có thể defer (customize label template, scheduled backup)
> Ghi rõ dependency giữa story: nếu story A cần story B hoàn thành trước, phải ở sprint sau hoặc cùng sprint."

**Output:** phân sprint hợp lý 25 / 28 / 22 / 15. **Vấn đề:** AI đẩy `HT_01 Đăng nhập` vào Sprint 2, nhưng tất cả story khác dependency trên login → phải ở Sprint 1.

**Prompt fix:**
> "`HT_01 Đăng nhập` là blocker cho mọi story khác cần auth. Đẩy về Sprint 1. Review lại các story có dependency tương tự (phân quyền `HT_02`, health check `QTV_03`)."

**Output:** HT_01, HT_02 vào Sprint 1. QTV_03 health check vào Sprint 2 (không block demo).

**Kết quả:** cột "Sprint" trong Backlog table.

---

## 3. Cập nhật trạng thái theo tiến độ thực tế

### 3.1. Vòng prompt — sync status

**Prompt (sau milestone M3 Midterm):**
> "Đọc `git log --oneline --since='10 weeks ago'` và `04_Product Backlog.md`. Với mỗi story trong backlog, xác định:
> - Có commit nào implement story đó chưa? (tìm qua scope trong commit message hoặc file path thay đổi)
> - Có unit test cover chưa?
> - Nếu cả 2 có: trạng thái 'Hoàn thành'
> - Nếu chỉ commit không test: 'Đang làm'
> - Nếu chưa có commit: 'Chưa bắt đầu'
> Xuất ra bảng để Leader update."

**Output:** bảng ~90 dòng, ~65 story đã Hoàn thành (khớp commit + test), ~15 Đang làm, ~10 Chưa bắt đầu.

**Kết quả:** cột "Trạng thái" trong Backlog update bulk — chính là commit `318d7165c feat: update product backlog to reflect completed tasks`.

---

## 4. Phương pháp review của con người

1. **Leader duyệt từng batch story** Claude sinh ra trước khi ghi vào backlog — đặc biệt check AC có đo được không
2. **Review theo cặp (pair review)** — 2 thành viên xem lại mỗi role, bắt lỗi logic (ví dụ story cho QC nhưng viết như Operator)
3. **Loại story trùng hoặc mơ hồ** — rule "nếu 2 developer đọc AC hiểu khác nhau thì AC chưa đủ rõ"
4. **Map với Domain Model** — story nào không có entity/field đỡ thì flag (hoặc thêm entity, hoặc bỏ story)
5. **Link với GitHub Issues** — mỗi story quan trọng được tạo issue tương ứng (bulk-create qua `gh issue create` từ file JSON export của backlog), gắn label role + sprint
6. **Weekly status update** — mỗi cuối sprint Leader sync trạng thái backlog với commit history thay vì dựa báo cáo miệng
