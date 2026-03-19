# Issue Tracker v2

> Cập nhật: 2026-03-19 — Đối chiếu với codebase thực tế

---

## Tổng quan trạng thái

| Trạng thái | Số lượng |
|:-----------|:--------:|
| Closed (Đã fix) | 12 |
| Open | 17 |
| In Progress | 3 |
| **Tổng** | **32** |

---

## A. CÁC ISSUE ĐÃ ĐÓNG (Closed)

Các issue từ ISSUE_TRACKER.md cũ đã được xác nhận fix trong codebase hiện tại.

| # | Issue | Ghi chú |
|:-:|:------|:--------|
| C1 | DB error "database myuser does not exist" | `pool.ts` và `docker-compose.yml` đã đúng `mydatabase` |
| C2 | TS compile error `dashboard.service.ts` (TS2344, TS2345) | Generic đã có `extends QueryResultRow` |
| C3 | Create Material 404 (`/materials` → `/api/materials`) | Frontend api đã gọi đúng `/api/materials` |
| C4 | Không thể edit material | `MaterialFormModal` pre-fill và disable ID khi edit đúng |
| C5 | Frontend build "Found 38 errors" | Build thành công, không còn TS errors |
| C6 | TS compile error `reports.service.ts` | Generic typing đã chuẩn |
| C7 | Admin Dashboard crash do mismatch stats shape | Frontend có normalization logic cho cả 2 shape |
| C8 | Role mismatch crash (`Admin` vs `admin`) | Backend normalize PascalCase→snake_case, FE có fallback |
| C9 | QC queue error `il.lot_number` does not exist | Query đã dùng `il.lot_id AS lot_number` đúng |
| C10 | Transaction table name `transactions` → `inventory_transactions` | Đã dùng đúng tên bảng |
| C11 | Material type không khớp domain model | Đã cập nhật: API, Excipient, Dietary Supplement, Container, Closure, Process Chemical, Testing Material |
| C12 | Thêm thông tin dưới Barcode khi download | Barcode có `includetext: true` + `alttext`. **Lưu ý: QR Code vẫn chưa có text bên dưới** → xem Issue #7 |

---

## B. CÁC ISSUE ĐANG MỞ (Open / In Progress)

### Nhóm 1: Production Workflow (Ưu tiên Cao)

| # | Status | Issue | Priority | Chi tiết |
|:-:|:------:|:------|:--------:|:---------|
| 1 | **Open** | **Frontend: Nút Start/Complete Production & Consume Material** | P1 | Backend đã có đầy đủ: `PATCH /batches/:id/status` (Planned→In Progress→Complete), `POST /production/consume` (trừ SL lot, ghi transaction Usage, auto Depleted). **Frontend thiếu**: hook `useUpdateBatchStatus`, `useConsumeMaterial`, và các nút UI trên BatchesPage/BatchComponentsDrawer. |
| 2 | **Open** | **Tạo Finished Product record khi Complete batch** | P1 | Khi batch chuyển sang Complete, hệ thống chưa tự động tạo record sản phẩm hoàn thành. Cần: bảng `finished_products` hoặc logic tạo inventory lot mới cho output, endpoint kết nối. |
| 3 | **Open** | **Batch component: chỉ cho phép thêm lot có status Accepted** | P2 | Backend `addComponent` chưa validate lot status. Có thể thêm lot Quarantine/Rejected vào batch. |

### Nhóm 2: Label System (Ưu tiên Cao)

| # | Status | Issue | Priority | Chi tiết |
|:-:|:------:|:------|:--------:|:---------|
| 4 | **Open** | **Thiếu validation giữa label_type và entity_type** | P1 | Hiện cho phép mọi combination (vd: Finished Product + lot). Cần enforce: Raw Material/API/Sample → lot, Finished Product → batch, Intermediate → lot hoặc batch, Status → lot hoặc batch. |
| 5 | **Open** | **Label generation chưa đúng quy tắc theo schema** | P1 | Frontend chỉ cho chọn Material-specific fields, không cho chọn Lot-specific hay Batch-specific fields. Thiếu Intermediate template seed trong `db-init.sql`. |
| 6 | **Open** | **Label Status cần tạo tự động khi entity đổi status** | P2 | Hiện phải tạo label thủ công. Cần auto-generate khi lot/batch chuyển status (vd: Quarantine→Accepted, Planned→In Progress). |
| 7 | **Open** | **QR Code thiếu text hiển thị bên dưới** | P2 | Barcode đã có `includetext` + `alttext`. QR Code chỉ generate image, không có text/caption bên dưới. |

### Nhóm 3: QC & Quality Workflow (Ưu tiên Cao)

| # | Status | Issue | Priority | Chi tiết |
|:-:|:------:|:------|:--------:|:---------|
| 8 | **Open** | **Workflow khi QC test Failed: thiếu guidance reject** | P1 | Khi test Fail → hệ thống chặn approve (đúng), nhưng không tự động trigger reject và không có UI guidance cho user. Cần: alert/banner gợi ý reject, hoặc auto-reject option. |
| 9 | **In Progress** | **QC Dashboard vẫn có mock data fallback** | P2 | `useQCTests()` hook có hardcoded mock data trả về khi API fail/empty. Logic conditional "My Recent QC Tests" vs "My Recent Transactions" đã hoạt động đúng. Cần: xóa mock fallback, handle empty state đúng cách. |
| 10 | **Open** | **Lot edit/delete: Backend chưa enforce Quarantine-only** | P2 | Frontend đã disable Edit khi status ≠ Quarantine, đã ẩn Delete. Nhưng backend PUT/DELETE không validate status → bypass qua API trực tiếp được. |

### Nhóm 4: Inventory Lot (Ưu tiên Trung bình)

| # | Status | Issue | Priority | Chi tiết |
|:-:|:------:|:------|:--------:|:---------|
| 11 | **Open** | **Sample lot: parent_lot_id cần dropdown thay vì text input** | P2 | Khi `is_sample=true`, form hiện input text tự nhập. Cần: dropdown/select chọn từ danh sách lot hiện có (chỉ lot không phải sample). |
| 12 | **Open** | **Transaction page: cột Notes bị cắt chữ** | P4 | Dùng `ellipsis: true` → text dài bị truncate. Cần: tooltip hoặc expandable cell. Do Ant Design behavior, ưu tiên thấp. |

### Nhóm 5: Dashboard (Ưu tiên Trung bình)

| # | Status | Issue | Priority | Chi tiết |
|:-:|:------:|:------|:--------:|:---------|
| 13 | **Open** | **Admin Dashboard: thiếu Health Monitoring** | P2 | Cần theo backlog QTV_03.01: uptime %, số user online, transaction/ngày, API response time, trạng thái DB/Cache/External API. Auto-refresh 30s. |

### Nhóm 6: Auth & Infrastructure (Ưu tiên Cao)

| # | Status | Issue | Priority | Chi tiết |
|:-:|:------:|:------|:--------:|:---------|
| 14 | **In Progress** | **User Management: chưa import Keycloak realm trên cloud** | P1 | CRUD user hoạt động. Username "admin" dùng admin123 thay thế. `last_login` track qua JWT middleware (throttle 5 phút). **Chưa**: import realm lên cloud Keycloak, sync login time từ cloud. |
| 15 | **Open** | **Seed Keycloak realm/client/roles/test accounts** | P1 | Cần file seed realm mount vào Keycloak container. Realm `inventory-management`, client `inventory-frontend`, 5 roles, test accounts cho mỗi role. |
| 16 | **Open** | **Đồng bộ .env / .env.example cho auth config** | P2 | Rủi ro lệch config giữa `.env` thực tế và `.env.example`. Cần chuẩn hóa: `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `VITE_BYPASS_KEYCLOAK`, `BYPASS_AUTH`. |
| 17 | **Open** | **Docker Compose: Keycloak unhealthy → BE/FE không start** | P2 | `depends_on` chain: DB→Keycloak→BE/FE. Keycloak không healthy → cascade fail. Cần fix healthcheck/startup timing. |
| 18 | **Open** | **Backend JWT verify theo Keycloak public key** | P2 | Cần verify JWT bằng Keycloak realm public key thay vì chỉ `JWT_SECRET`. Cache key hợp lý, handle refresh. |
| 19 | **Open** | **Nút Sign Out chưa nối đúng flow logout** | P2 | Cần gọi đúng Keycloak logout endpoint, clear session/token, redirect về login. |

### Nhóm 7: Khác

| # | Status | Issue | Priority | Chi tiết |
|:-:|:------:|:------|:--------:|:---------|
| 20 | **In Progress** | **Disable role switcher (demo mode)** | P2 | Đã gỡ role switcher khỏi header. Cần verify: FE không còn cho đổi role thủ công, role luôn lấy từ JWT token. |
| 21 | **Open** | **Chưa thống nhất rule ID auto-generated vs nhập tay** | P3 | Các module: material_id, lot_id, transaction_id, batch_id, template_id — chưa rõ auto-gen hay manual. Cần chuẩn hóa. |
| 22 | **Open** | **Test coverage thấp — thiếu test cho nhiều module** | P3 | Cần bổ sung: happy path, validation path, permission path, error path. Ưu tiên flow P1: production, QC, lots, transactions. |
| 23 | **Open** | **Viết lại test label.routes theo integration style** | P3 | Test hiện tại chưa cover đủ auth, permission, validation, error paths. |

---

## C. PHÂN CÔNG CÔNG VIỆC — 6 THÀNH VIÊN

### Nguyên tắc phân công
- Mỗi người phụ trách 1 nhóm chức năng chính + hỗ trợ nhóm liên quan
- Ưu tiên P1 trước, P2 sau
- Các issue Auth/Infra chia đều vì ảnh hưởng toàn hệ thống

---

### Thành viên 1 — Production & Batch Workflow
> **Focus**: Hoàn thiện luồng sản xuất end-to-end

| # | Issue | Priority | Loại |
|:-:|:------|:--------:|:----:|
| 1 | Frontend: Nút Start/Complete Production & Consume Material | P1 | Chính |
| 2 | Tạo Finished Product record khi Complete batch | P1 | Chính |
| 3 | Batch component: validate lot Accepted only | P2 | Chính |
| 6 | Label Status tự động khi batch đổi status | P2 | Hỗ trợ |

**Deliverables:**
- [ ] Hook `useUpdateBatchStatus` + `useConsumeMaterial` trong `useBatchesData.ts`
- [ ] UI buttons: "Start Production", "Complete", "Consume Material" trên BatchesPage
- [ ] Logic tạo finished product khi batch Complete
- [ ] Validate lot status = Accepted khi thêm component

---

### Thành viên 2 — Label System
> **Focus**: Sửa toàn bộ label generation theo đúng schema/quy tắc

| # | Issue | Priority | Loại |
|:-:|:------|:--------:|:----:|
| 4 | Validation label_type ↔ entity_type | P1 | Chính |
| 5 | Label generation đúng quy tắc, thêm Lot/Batch-specific fields | P1 | Chính |
| 7 | QR Code thêm text bên dưới | P2 | Chính |
| 23 | Viết lại test label.routes | P3 | Chính |

**Deliverables:**
- [ ] Backend: validation mapping label_type → allowed entity_types
- [ ] Frontend: dynamic fields theo entity_type (material/lot/batch fields)
- [ ] Seed Intermediate template vào `db-init.sql`
- [ ] QR code generator thêm caption text
- [ ] Integration tests cho label routes

---

### Thành viên 3 — QC & Quality Workflow
> **Focus**: Hoàn thiện luồng QC, dashboard real data, failed test workflow

| # | Issue | Priority | Loại |
|:-:|:------|:--------:|:----:|
| 8 | Workflow khi QC test Failed | P1 | Chính |
| 9 | QC Dashboard: xóa mock data, handle empty state | P2 | Chính |
| 10 | Backend enforce Quarantine-only cho lot edit/delete | P2 | Chính |
| 6 | Label Status tự động khi lot đổi status (QC approve/reject) | P2 | Hỗ trợ |

**Deliverables:**
- [ ] UI alert/guidance khi lot có failed tests → gợi ý reject
- [ ] Xóa mock fallback trong `useQCTests()`, thêm proper empty state
- [ ] Backend middleware validate lot status trước khi PUT/DELETE
- [ ] Hook auto-generate Status label khi QC approve/reject lot

---

### Thành viên 4 — Frontend UX & Dashboard
> **Focus**: Inventory lot UX, Admin dashboard, transaction page

| # | Issue | Priority | Loại |
|:-:|:------|:--------:|:----:|
| 13 | Admin Dashboard: Health Monitoring | P2 | Chính |
| 11 | Sample lot: dropdown chọn parent lot | P2 | Chính |
| 12 | Transaction Notes: tooltip/expandable | P4 | Chính |
| 21 | Chuẩn hóa ID auto-gen vs manual | P3 | Chính |

**Deliverables:**
- [ ] Health monitoring panel: uptime, API latency, DB/Redis status, auto-refresh 30s
- [ ] Backend endpoint `/api/admin/health` trả system health metrics
- [ ] `LotFormModal`: dropdown select parent lot (filter non-sample lots)
- [ ] Transaction Notes column: Ant Design Tooltip hoặc expandable row
- [ ] Audit tất cả form → document ID rules, update UI accordingly

---

### Thành viên 5 — Auth & Keycloak Integration
> **Focus**: Hoàn thiện auth flow thực tế, Keycloak setup, security

| # | Issue | Priority | Loại |
|:-:|:------|:--------:|:----:|
| 14 | Import Keycloak realm lên cloud + sync login | P1 | Chính |
| 15 | Seed Keycloak realm/client/roles/accounts | P1 | Chính |
| 18 | JWT verify bằng Keycloak public key | P2 | Chính |
| 19 | Sign Out → đúng Keycloak logout flow | P2 | Chính |
| 20 | Verify role switcher đã disabled hoàn toàn | P2 | Chính |

**Deliverables:**
- [ ] File `realm-export.json` + mount vào docker-compose Keycloak
- [ ] 5 test accounts (1 per role) đăng nhập được
- [ ] Backend verify JWT bằng Keycloak JWKS endpoint, cache public key
- [ ] Sign Out gọi Keycloak logout, clear token, redirect login
- [ ] Import realm lên cloud Keycloak instance
- [ ] Confirm role switcher không còn trong production build

---

### Thành viên 6 — DevOps, Config & Testing
> **Focus**: Docker, env config, CI/CD, test coverage

| # | Issue | Priority | Loại |
|:-:|:------|:--------:|:----:|
| 16 | Đồng bộ .env / .env.example | P2 | Chính |
| 17 | Docker Compose: fix Keycloak healthcheck | P2 | Chính |
| 22 | Bổ sung test coverage cho các module | P3 | Chính |

**Deliverables:**
- [ ] `.env.example` chuẩn cho cả backend và frontend, document trong README
- [ ] Fix Keycloak healthcheck + startup order trong docker-compose
- [ ] Test coverage: production, QC, lots, transactions (happy + error paths)
- [ ] Verify `docker-compose up -d` chạy thành công end-to-end

---

## D. BẢNG TỔNG HỢP PHÂN CÔNG

| Thành viên | Vai trò | Issues chính | Issues hỗ trợ | Tổng |
|:----------:|:--------|:------------:|:--------------:|:----:|
| **TV1** | Production & Batch | #1, #2, #3 | #6 | 4 |
| **TV2** | Label System | #4, #5, #7, #23 | — | 4 |
| **TV3** | QC & Quality | #8, #9, #10 | #6 | 4 |
| **TV4** | Frontend UX & Dashboard | #11, #12, #13, #21 | — | 4 |
| **TV5** | Auth & Keycloak | #14, #15, #18, #19, #20 | — | 5 |
| **TV6** | DevOps & Testing | #16, #17, #22 | — | 3 |

---

## E. THỨ TỰ THỰC HIỆN ĐỀ XUẤT

```
Tuần 1 (P1 — Critical Path):
├── TV1: Issue #1 (Start/Complete Production UI)
├── TV2: Issue #4, #5 (Label validation + generation rules)
├── TV3: Issue #8 (QC Failed workflow)
├── TV5: Issue #15 (Seed Keycloak realm) → Issue #14 (Import cloud)
└── TV6: Issue #17 (Docker Keycloak fix) — unblock TV5

Tuần 2 (P1 tiếp + P2):
├── TV1: Issue #2 (Finished Product on Complete)
├── TV2: Issue #7 (QR text) + Issue #23 (Label tests)
├── TV3: Issue #9, #10 (QC dashboard cleanup, lot backend validation)
├── TV4: Issue #13 (Health monitoring) + Issue #11 (Parent lot dropdown)
├── TV5: Issue #18 (JWT Keycloak verify) + Issue #19 (Sign Out)
└── TV6: Issue #16 (.env sync) + Issue #22 (Test coverage)

Tuần 3 (P2-P4 còn lại):
├── TV1: Issue #3 (Lot Accepted validation) + Issue #6 (Auto label on status change)
├── TV3: Issue #6 (Auto label on QC decision)
├── TV4: Issue #21 (ID rules) + Issue #12 (Notes column)
├── TV5: Issue #20 (Verify role switcher removed)
└── TV6: Issue #22 (Thêm test coverage)
```

---

## F. GHI CHÚ

- **P1** = Blocking production workflow hoặc auth flow → phải fix trước
- **P2** = Quan trọng nhưng hệ thống vẫn chạy được khi thiếu
- **P3** = Cải thiện chất lượng code, UX
- **P4** = Nice-to-have
- Issue #6 (Auto label) là shared giữa TV1 và TV3 vì liên quan cả batch và lot status changes
- TV5 (Auth) là dependency cho nhiều team → ưu tiên hoàn thành sớm
- TV6 (DevOps) unblock TV5 bằng cách fix Docker trước
