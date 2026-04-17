# 09_System Evaluation and Validation — Vibe Coding

Tài liệu ghi lại công cụ AI và các prompt chính mà nhóm đã dùng để tạo và cập nhật `09_System Evaluation and Validation.md`.

## 1. Công cụ AI và công cụ kiểm thử đã sử dụng

| Công cụ | Loại | Vai trò |
|---------|------|---------|
| **Claude (Anthropic) — Opus 4.x qua Claude Code CLI** | AI | Viết strategy, sinh test case, review coverage |
| **Jest 29 + ts-jest** | Test framework | Chạy 669 unit test |
| **Supertest 7** | HTTP testing | Integration test cho Express routes |
| **ESLint 9** | Static analysis | Lint frontend |
| **tsc --noEmit** | Type checker | Enforce strict TS |
| **curl + Postman** | Manual API test | Smoke test sau deploy |

## 2. Các prompt chính đã dùng

### 2.1. Prompt sinh test case
> "Cho service `lot.service.ts` có các method: createLot, approveLot, rejectLot, consumeFromLot. Sinh Jest test cases cover: (a) happy path, (b) validation error, (c) state transition invalid (approve khi không phải Quarantine), (d) atomic rollback khi DB fail. Dùng mock `pg` pool. Tối thiểu 15 test case."

### 2.2. Prompt viết integration test
> "Viết integration test end-to-end cho lifecycle: create material → receive lot (Quarantine) → add QC test → approve lot (Accepted) → create batch → start production → add component (consume from lot) → complete batch. Dùng Supertest + real PostgreSQL qua Docker. Cleanup data sau mỗi test."

### 2.3. Prompt review coverage
> "Tôi có coverage report: Statements 84.26%, Branches 73.77%. Các module coverage thấp nhất là `security/rbac` (64%) và `shared/elasticsearch` (71%). Gợi ý các test case cụ thể để nâng coverage 2 module này lên ≥85% mà không phải test implementation detail."

### 2.4. Prompt so sánh competitor
> "So sánh IMS của nhóm với Odoo Inventory và Zoho Inventory theo 13 tiêu chí: cost, open-source status, lot tracking, QC workflow, label generation, role-based dashboard, AI analytics, customizability, IAM 3rd party, multi-cloud deploy, microservices, suitable for. Viết thành bảng markdown, kèm điểm mạnh và hạn chế của IMS."

## 3. Phương pháp review của con người

1. Mỗi test AI sinh ra phải **chạy được trước khi commit** — không merge test chưa chạy
2. Coverage số liệu **phải được reproduce** — mỗi lần update tài liệu, chạy lại `npm run test:coverage` và copy con số thật
3. Bảng so sánh competitor: Leader verify lại thông tin từ trang chính thức của Odoo và Zoho trước khi ghi
4. Video demo testing quay 1 lần đầy đủ, không edit che phần fail (nếu có fail phải giải thích)
