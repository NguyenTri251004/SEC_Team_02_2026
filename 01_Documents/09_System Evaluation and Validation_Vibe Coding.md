# 09_System Evaluation and Validation — Vibe Coding

Tài liệu ghi lại **quá trình vibe coding** đã dẫn tới `09_System Evaluation and Validation.md` — các vòng prompt sinh test case, review coverage, so sánh competitor, được AI tạo và team verify bằng kết quả chạy thật.

## 0. Công cụ AI và công cụ kiểm thử đã sử dụng

| Công cụ | Loại | Vai trò |
|---------|------|---------|
| **Claude (Anthropic) — Claude Opus 4.x qua Claude Code CLI** | AI | Sinh test case, review coverage report, so sánh competitor |
| **Jest 29 + ts-jest** | Test framework | 669 unit test backend |
| **Vitest 4 + React Testing Library + jsdom** | Test framework | 68 test frontend |
| **Supertest 7** | HTTP testing | Integration test Express routes + real PostgreSQL |
| **ESLint 9** | Static analysis | Lint frontend |
| **`tsc --noEmit`** | Type checker | Enforce strict TS (block deploy khi type error) |
| **curl + Postman** | Manual API | Smoke test sau deploy |

---

## 1. Test Strategy và Pyramid

### 1.1. Vòng prompt — thiết kế pyramid

**Prompt gốc:**
> "Thiết kế test strategy cho IMS theo pyramid:
> - Bottom (nhiều nhất): Unit test — mọi service function
> - Middle: Integration test với PostgreSQL thật (không mock DB cho luồng nghiệp vụ critical)
> - Top (ít nhất): Manual UAT trước mỗi milestone
> Giải thích chiến lược: unit test chạy CI mỗi push; integration test chạy cục bộ trước khi merge thay đổi lớn ảnh hưởng luồng nghiệp vụ; UAT chạy trước M1/M2/M3/M4. Viết ASCII pyramid."

**Output:** pyramid rõ + chiến lược phù hợp. **Vấn đề:** AI đề xuất "E2E test với Playwright" ở top — team chưa đủ thời gian, chỉ có scaffold `e2e/` chưa có test.

**Prompt fix:**
> "Bỏ Playwright E2E ra khỏi strategy hiện tại — team mới có scaffold `e2e/` chưa có test thật. Ghi là 'scaffold sẵn sàng, sẽ bổ sung milestone sau' thay vì claim đã có."

**Output:** strategy honest — chỉ ghi gì đã chạy được.

**Kết quả:** Section "2. Phương pháp thực thi kiểm thử" trong Evaluation — khớp thực tế.

---

## 2. Sinh test case

### 2.1. Vòng prompt — test cho `lots.service.ts`

**Prompt gốc:**
> "Cho service `backend/src/modules/lots/lots.service.ts` có method: `createLot`, `approveLot`, `rejectLot`, `consumeFromLot`. Sinh Jest test cover:
> - Happy path: mỗi method với input hợp lệ
> - Validation error: input thiếu field / sai format
> - State transition invalid: ví dụ approve lot đang Accepted (không phải Quarantine) → error
> - Atomic rollback: mock DB fail giữa transaction, verify không có partial write
> Dùng mock pg pool (`jest.mock` pool module). Tối thiểu 15 test case. Dùng describe block theo method."

**Output:** 18 test case. Coverage function này đạt 92%.

**Vấn đề:** 3 test case **fail khi chạy** vì AI dùng API pg mock sai (gọi `pool.query.mockResolvedValue` nhưng pool là object có `.connect()` trong code thực).

**Prompt fix:**
> "3 test fail vì pool API sai. Code thực dùng `pool.connect()` → `client.query()` → `client.release()`. Mock phải: `jest.mock('@/shared/db/pool', () => ({ connect: jest.fn().mockResolvedValue({ query: jest.fn(), release: jest.fn() }) }))`. Viết lại 3 test fail."

**Output:** fix xong, 18/18 pass.

**Kết quả:** `backend/src/modules/lots/__tests__/lots.service.test.ts` 18 test.

### 2.2. Các service khác

Pattern tương tự cho 8 service khác (materials, transactions, qc, production, admin, dashboard, labels, reports). Mỗi service 15-30 test → tổng **669 test pass** trên backend.

---

## 3. Review Coverage

### 3.1. Vòng prompt — phân tích coverage report

**Prompt:**
> "Đọc `backend/coverage/coverage-summary.json` (output của `npm run test:coverage`). Xác định:
> - Coverage tổng: Statements, Branches, Functions, Lines
> - 3 module coverage thấp nhất (có thể là nơi test thiếu)
> - Branch coverage thấp nhất: thường là error path chưa test
> Xuất bảng chi tiết theo module."

**Output:** bảng coverage. Thấp nhất:
- `security/rbac` — Statements 64%, Branches 33%
- `shared/elasticsearch` — Statements 71%, Functions 70%
- `security/auth` — Branches 58%

**Prompt refine:**
> "3 module trên có coverage thấp. Gợi ý test case **cụ thể** (không chung chung) để nâng lên ≥85%:
> - `security/rbac`: case nào chưa cover? (ví dụ: user có token nhưng không có `realm_access.roles`)
> - `shared/elasticsearch`: fallback khi ES unreachable đã test chưa?
> - `security/auth`: token expired, token sai signature, Keycloak key fetch fail?
> Mỗi module ≥5 case cụ thể."

**Output:** 15 case cụ thể. Thành viên viết test theo list → coverage nâng lên ≥85% 3 module.

**Kết quả:** bảng coverage cuối trong Section "3. Kết quả kiểm thử" Evaluation.

---

## 4. Integration Test End-to-End

### 4.1. Vòng prompt — lifecycle test

**Prompt:**
> "Viết integration test `warehouse-lifecycle.test.ts` e2e:
> 1. Create material
> 2. Receive lot (status = Quarantine)
> 3. Add QC test result
> 4. Approve lot (Accepted)
> 5. Create production batch
> 6. Start production (Planned → In Progress)
> 7. Add component (consume từ lot)
> 8. Complete batch
> Dùng Supertest + real PostgreSQL qua Docker Compose. `beforeAll` up DB clean schema, `afterAll` cleanup. Mỗi step verify DB state qua direct SQL query."

**Output:** file `warehouse-lifecycle-db.integration.test.ts` ~300 dòng, 8 step có assertion.

**Vấn đề:** test fail trong CI vì Docker postgres chưa ready khi test start.

**Prompt fix:**
> "Thêm retry loop chờ PostgreSQL ready: `beforeAll` poll `SELECT 1` tối đa 30s trước khi start test. Dùng `pg` client trực tiếp để ping."

**Output:** thêm `waitForDb()` helper. CI pass stable.

**Kết quả:** 4 integration test suite đều pass — `warehouse-lifecycle.test.ts`, `warehouse-lifecycle-api.test.ts`, `warehouse-lifecycle-db.integration.test.ts`, `business-flows.test.ts`.

---

## 5. So sánh với Competitor

### 5.1. Vòng prompt — bảng so sánh

**Prompt:**
> "So sánh IMS với 2 competitor pharma/inventory phổ biến: **Odoo Inventory** và **Zoho Inventory**. 13 tiêu chí:
> 1. Loại (open-source vs SaaS)
> 2. Chi phí (free vs subscription)
> 3. Lot tracking lifecycle
> 4. QC workflow
> 5. Label (barcode/QR) built-in
> 6. Role-based dashboard
> 7. AI analytics / forecasting
> 8. Tùy biến (customize)
> 9. IAM 3rd party support
> 10. Deploy đa cloud
> 11. Microservices
> 12. Mobile app
> 13. Phù hợp cho (target segment)
> Viết bảng markdown. Đánh dấu ✅ / ⚠️ / ❌ theo capability. Phải verify thông tin từ trang chính thức Odoo/Zoho."

**Output:** bảng 13 × 3. **Vấn đề:** AI đoán Zoho có module QC — thực tế không có; phải verify.

**Prompt fix:**
> "Verify lại bằng cách đọc docs chính thức Zoho Inventory (zoho.com/inventory/features). Module QC chuyên biệt có không? Nếu không có thì đánh ❌ không phải ⚠️."

**Output:** Zoho QC = ❌ (chỉ có batch tracking chung, không có workflow approval). Bảng chính xác hơn.

**Kết quả:** Section "5. So sánh với các hệ thống tương tự" Evaluation.

### 5.2. Điểm mạnh và hạn chế

**Prompt:**
> "Dựa trên bảng so sánh, rút ra 4 điểm mạnh và 3 hạn chế của IMS so với Odoo/Zoho. Điểm mạnh phải dựa trên tiêu chí có ✅ mà competitor không có. Hạn chế phải dựa trên tiêu chí ❌ mà competitor có."

**Output:** 4 điểm mạnh (free, QC pharma-specific, AI integrated, full source control) + 3 hạn chế (ít tính năng hơn Odoo, không mobile app, cộng đồng nhỏ).

**Kết quả:** sub-section sau bảng so sánh.

---

## 6. Phương pháp review của con người

1. **Mỗi test AI sinh ra phải chạy pass trước khi commit** — không merge test chưa chạy hoặc skipped. Nếu pass thì có trong coverage report, không pass thì fix hoặc xoá.
2. **Coverage số liệu reproduce được** — mỗi lần update tài liệu phải chạy lại `npm run test:coverage` và copy con số thật (không ghi nhớ số cũ). Coverage thay đổi phải cập nhật tài liệu.
3. **Competitor comparison verify từ official docs** — Leader đọc trang chính Odoo/Zoho, không tin AI tự sinh. Thông tin capability nào không tìm thấy trong docs thì ghi ⚠️ "không xác định".
4. **Video demo testing quay 1 lần đầy đủ** — nếu có test fail trên camera, phải giải thích trong video (không edit che). Video đang TODO, sẽ quay sau khi tất cả test xanh stable.
5. **Integration test CI stable** — nếu flaky, không skip mà fix root cause (ví dụ thêm `waitForDb()` thay vì retry blind)
6. **Type check = gate deploy** — workflow `deploy-backend.yml` chạy `npx tsc --noEmit` trước deploy, fail → block deploy. Convention: production không bao giờ có TS error.
