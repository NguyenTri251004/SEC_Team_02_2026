# 04_Source_Vibe Coding

Tài liệu ghi lại **quá trình vibe coding** đã dẫn tới mã nguồn trong `02_Source/` — bao gồm Backend, Frontend, AI Service, Database schema, Monitoring stack và Docker config.

Khác với tài liệu liệt kê prompt chung, file này mô tả **từng nhóm tính năng đã build** — prompt khởi đầu, output AI, vấn đề phát hiện, prompt refine, và link tới code đã commit.

## 0. Công cụ AI đã sử dụng

| Công cụ | Giai đoạn dùng nhiều nhất | Vai trò |
|---------|--------------------------|---------|
| **Claude (Anthropic) — Claude Opus 4.x qua Claude Code CLI** | Toàn bộ dự án | Sinh code module, refactor, debug, review thay đổi trước khi commit (tool chính) |
| **Cursor IDE** | Setup ban đầu | Inline completion khi scaffolding |
| **GitHub Copilot** | Code lặp | Autocomplete test case, type definition |
| **ChatGPT (GPT-4)** | Hỏi nhanh ngoài repo | Tra cú pháp thư viện, so sánh best practice |

---

## 1. Backend — Module Pattern (Express + TypeScript)

### 1.1. Vòng prompt 1 — scaffolding module `lots`

**Prompt gốc:**
> "Tạo module backend `lots` theo pattern `<domain>.routes.ts / <domain>.service.ts / <domain>.types.ts` trong thư mục `backend/src/modules/lots/`. Bao gồm CRUD lot, filter theo status/material, approve/reject. Dùng pg pool chung từ `shared/db/pool.ts`. Response theo `ApiResponse<T>` / `PaginatedResponse<T>` (types đã định nghĩa trong `shared/types.ts`). Mount vào Express app tại `/api/lots`."

**Output AI:** đúng pattern, nhưng **dùng async/await trong handler chưa có try/catch** — unhandled promise rejection khi DB lỗi.

**Prompt refine:**
> "Mọi async handler trong routes phải wrap bằng `asyncHandler` helper (đã có trong `shared/utils/asyncHandler.ts`) để đẩy error về Express error middleware. Update tất cả route trong `lots.routes.ts`."

**Output:** wrap đúng. Error giờ về `errorHandler` middleware thay vì crash process.

**Code cuối cùng:** `backend/src/modules/lots/` (3 file + `__tests__/`).

### 1.2. Vòng prompt 2 — atomic consume material trong production

**Vấn đề:** khi Production batch consume material từ Lot, cần 3 thao tác DB **atomic**: (1) decrement `inventory_lots.quantity`, (2) update `batch_components.actual_quantity`, (3) insert `inventory_transactions` record. Race condition nếu 2 user consume cùng lot đồng thời.

**Prompt gốc:**
> "Viết `consumeFromLot(batchId, lotId, quantity, userId)` trong `production.service.ts`. Dùng `pool.connect()` → `BEGIN`, rồi 3 thao tác trên, `COMMIT`. Rollback nếu bất kỳ step nào fail. Return `{ lot, transaction, component }` sau commit."

**Output lần 1:** chạy được nhưng **không lock row** → nếu 2 request cùng lúc, cả 2 đọc quantity = 10, trừ 5, DB cuối còn 10 thay vì 0.

**Prompt fix (Leader phát hiện qua integration test fail):**
> "Race condition: khi 2 consume đồng thời trên cùng lot, final quantity sai. Thêm `SELECT ... FOR UPDATE` vào bước đọc lot trong transaction để lock row. Test với 2 promise song song cùng consume 5 từ lot quantity 10 → chỉ 1 thành công, 1 rollback với error `Insufficient quantity`."

**Output sau fix:** `SELECT * FROM inventory_lots WHERE lot_id = $1 FOR UPDATE`. Integration test `warehouse-lifecycle-db.integration.test.ts` với 2 promise song song: 1 pass (quantity=5), 1 throw.

**Code cuối cùng:** `backend/src/modules/production/production.service.ts` — function `consumeFromLot` (atomic transaction block).

### 1.3. Vòng prompt 3 — RBAC middleware

Xem chi tiết trong `01_Documents/06_Proof of Concept_Vibe Coding.md` mục 1.4. File nguồn: `backend/src/security/rbac.ts`.

---

## 2. Frontend — React 19 + Vite

### 2.1. Vòng prompt 1 — init project

**Prompt:**
> "Init project React 19 + Vite 7 + TypeScript 5.9. Dùng Ant Design 6 + Tailwind CSS 4 (coexist — AD cho component, Tailwind cho utility spacing). Config path alias `@/*` → `src/*` trong cả `vite.config.ts` và `tsconfig.app.json`. Add React Router 7, TanStack Query 5, Zustand, Axios."

**Output:** `vite.config.ts` và `tsconfig.json` đúng, nhưng quên `baseUrl` + `paths` trong `tsconfig.app.json` — khi chạy `tsc -b` (build) thì fail `Cannot find module '@/auth/keycloak'`.

**Prompt fix:**
> "`npm run build` fail với `TS2307: Cannot find module '@/...'`. Thêm `baseUrl: \".\"` và `paths: { \"@/*\": [\"src/*\"] }` vào `compilerOptions` của `tsconfig.app.json` (không chỉ `tsconfig.json`)."

**Output:** build pass. CI/CD Vercel cũng pass theo.

**Code cuối cùng:** `frontend/vite.config.ts` + `frontend/tsconfig.app.json`.

### 2.2. Vòng prompt 2 — React Query hook pattern

**Prompt:**
> "Tạo `hooks/useLotsData.ts` dùng TanStack React Query. Convention team:
> - Query key theo filter object: `['lots', filters]`
> - Stale time 30s cho data tồn kho (đổi thường xuyên)
> - Tách riêng query hook (`useLots`, `useLotById`) và mutation hook (`useCreateLot`, `useApproveLot`)
> - Mutation success → invalidate `['lots']` (invalidate cả query list)
> - Error toast dùng `message.error` từ antd"

**Output:** đúng pattern ngay lần đầu. Team áp dụng template này cho **10 hook domain** khác (`useMaterialsData`, `useTransactionsData`, `useQCData`, ...).

**Code cuối cùng:** `frontend/src/hooks/use*Data.{ts,tsx}` — 10 file cùng pattern.

### 2.3. Vòng prompt 3 — Keycloak + Axios token flow

Xem `01_Documents/06_Proof of Concept_Vibe Coding.md` mục 1.5-1.6. File nguồn: `frontend/src/auth/keycloak.ts`, `AuthProvider.tsx`, `services/api.ts`.

### 2.4. Vòng prompt 4 — Role-based dashboard

**Prompt:**
> "4 role có 4 dashboard khác nhau: Admin (uptime/user online/error log), Inventory Manager (tổng tồn/lô sắp hết hạn), QC (queue cần xử lý), Production (batch đang chạy). Tách `pages/dashboard/AdminDashboard.tsx`, `InventoryManagerDashboard.tsx`, `QualityControlDashboard.tsx`, `ProductionDashboard.tsx`. Router dựa vào role trong keycloak token để redirect đúng dashboard sau login."

**Output:** 4 file ~80-120 dòng mỗi file, dùng chung widget `KpiCard`, `ChartCard`, `AlertPanel` (trong `components/dashboard/`).

**Refine duy nhất:** Admin dashboard ban đầu có **tag "DEMO"** hardcode trên UI — Leader yêu cầu gỡ khi chuẩn bị cho milestone demo. Commit `e7853783b docs: add invite image and remove demo tag from UI`.

**Code cuối cùng:** `frontend/src/pages/dashboard/*.tsx` (4 file).

---

## 3. Observability Stack (mới re-merged 2026-04)

### 3.1. Ngữ cảnh

Team muốn có giám sát sản xuất: metrics (Prometheus), logs (Loki), traces (Tempo), alerts (Alertmanager), dashboard (Grafana). Stack này từng được POC trên branch `feature/monitoring-observability`, sau đó merge vào master qua commit `eeab5b975`.

### 3.2. Vòng prompt 1 — stack docker-compose

**Prompt:**
> "Thêm stack observability vào `monitoring/` với 7 service: Prometheus scrape backend metrics, Grafana dashboard, Loki + Promtail cho log aggregation, Tempo cho distributed tracing, OpenTelemetry Collector nhận OTLP/HTTP, Alertmanager cho notification. Viết config YAML từng service tối thiểu chạy được. Tạo `docker-compose.prod.yml` include stack này cùng với backend/frontend."

**Output:** 7 thư mục `monitoring/{prometheus,grafana,loki,tempo,otel-collector,promtail,alertmanager}/` với config YAML từng cái + `docker-compose.prod.yml`.

**Issue phát sinh:** Prometheus scrape `/metrics` backend → 404 vì backend chưa expose endpoint này.

### 3.3. Vòng prompt 2 — backend expose metrics

**Prompt:**
> "Trong `backend/src/shared/observability/`:
> - `metrics.ts` — dùng `prom-client`, expose counter `http_requests_total{method,route,status}`, histogram `http_request_duration_seconds`, counter `auth_failures_total{reason}`. Export function `register` để mount vào `/metrics`.
> - `middleware.ts` — Express middleware đo latency mỗi request, increment counter.
> - `logger.ts` — pino structured logger, JSON output cho Loki scrape.
> - `tracing.ts` — init OpenTelemetry NodeSDK với auto-instrumentations + OTLP trace exporter."

**Output:** 4 file đúng pattern. Issue duy nhất: **`tracing.ts` load sau `express` import** → auto-instrumentation không patch được Express. Phải move `startTracing()` vào dòng đầu `server.ts` trước mọi import khác.

**Prompt fix:**
> "OpenTelemetry auto-instrumentation không work vì Express đã require trước khi `startTracing()` chạy. Tách `tracing.ts` ra file riêng, `require('./shared/observability/tracing').startTracing()` ở dòng 1 của `server.ts` trước mọi import khác."

**Output:** `server.ts` dòng 1-2 load tracing trước. Trace data về Tempo thành công.

**Code cuối cùng:** `backend/src/shared/observability/{logger,metrics,middleware,tracing}.ts` + `backend/src/server.ts` (tracing load first).

### 3.4. Vòng prompt 3 — frontend web vitals + ErrorBoundary

**Prompt:**
> "Frontend observability:
> - `lib/observability/logger.ts` — simple structured logger gửi ra console + POST `/api/client-logs` cho critical error
> - `lib/observability/vitals.ts` — dùng package `web-vitals` để track CLS, INP, LCP, FCP, TTFB, gửi qua logger
> - `lib/observability/tracing.ts` — inject `traceparent` header + `x-correlation-id` vào Axios request
> - `lib/observability/errors.ts` + `components/common/ErrorBoundary.tsx` — React error boundary catch crash, log qua logger
> Mỗi file có test (vitest)."

**Output:** 5 module + 5 test file (`*.test.ts`). Coverage 95%+ cho toàn bộ `lib/observability/`.

**Code cuối cùng:** `frontend/src/lib/observability/*.ts` + `frontend/src/components/common/ErrorBoundary.tsx`.

### 3.5. Commit sequence

Stack này được build qua 6 commit (xem `git log`):
```
e17b51014 feat(monitoring): add observability stack and instrumentation
123e8806f feat(observability): add configuration for observability stack and alertmanager
9b20ae205 feat(observability): enhance observability middleware and update deployment configurations
70c9ed59b feat(observability): integrate Prometheus metrics and enhance observability dashboard
2d2220535 feat: enhance docker-compose configuration for observability with OpenTelemetry and Grafana
55c2ec503 feat: enhance observability with logging and error handling tests
```

---

## 4. AI Service (FastAPI)

**Prompt duy nhất (placeholder):**
> "Init FastAPI service với: health endpoint `GET /health`, 2 endpoint stub `POST /predict-demand` và `POST /detect-anomaly` dùng Pydantic models. Async Redis + async Elasticsearch client (optional — nếu env không có thì skip init). CORS enable cho `localhost:5173`. Dockerfile Python 3.11-slim."

**Output:** `ai-service/main.py` (~100 dòng), `requirements.txt`, `Dockerfile`.

**Trạng thái:** **chưa implement logic AI thật** — hiện là stub trả mock data. Sẽ vibe code trong milestone tiếp theo với RAG hoặc scikit-learn cho demand forecast.

**Code cuối cùng:** `02_Source/01_Source Code/ai-service/main.py`.

---

## 5. Database Schema

**Prompt:**
> "Viết `db-init.sql` cho PostgreSQL 16 cho IMS pharma. Bao gồm 8 bảng: `users`, `materials`, `inventory_lots`, `inventory_transactions`, `qc_tests`, `production_batches`, `batch_components`, `label_templates`. Yêu cầu:
> - PK tự sinh (UUID hoặc serial), FK constraint đầy đủ
> - CHECK constraint cho status enum: lot status ∈ {Quarantine, Accepted, Rejected, Depleted}; batch status ∈ {Planned, In Progress, Complete, Cancelled}
> - Index trên column hay query: `lot_number`, `material_id`, `status`, `received_date`, `expiration_date`
> - Trigger `BEFORE UPDATE` tự động set `modified_date = NOW()`
> - Seed data: 3 user (admin/manager/viewer), 5 material mẫu"

**Output:** `db-init.sql` ~400 dòng. Chạy qua `docker exec ims-postgres psql -f db-init.sql`, tạo schema đúng.

**Refine sau này:** bật account `viewer` trong seed (commit `d525cb476 fix: enable viewer user account in database initialization`).

**Code cuối cùng:** `02_Source/01_Source Code/db_schema/db-init.sql` (cũng mirror sang `03_Deployment/01_Deployment_Package/db-init.sql`).

---

## 6. Docker + Production Config

### 6.1. Backend Dockerfile multi-stage

**Prompt:**
> "Viết `backend/Dockerfile` multi-stage Node 22-slim:
> - Stage 1 `build`: COPY package*.json, `npm ci`, COPY src, `npx tsc` → `dist/`
> - Stage 2 `runtime`: COPY từ build `dist/` và `node_modules` (chỉ prod, hoặc re-install `npm ci --omit=dev`). EXPOSE 3000. USER non-root. CMD `node dist/server.js`. HEALTHCHECK `curl -f http://localhost:3000/health`."

**Output:** Dockerfile đúng pattern. Image size ~180MB (production).

**Code cuối cùng:** `backend/Dockerfile` + `backend/Dockerfile.dev` (dev variant dùng `ts-node-dev`).

### 6.2. Fly.io config

**Prompt:**
> "Viết `fly.toml` deploy backend `ims-backend-sec02`, primary region Singapore (`sin`), internal port 3000, force HTTPS, auto-stop khi idle (`min_machines_running = 0`), VM shared-CPU-1x 1GB RAM. Health check `/health` mỗi 30s."

**Output:** `fly.toml` chuẩn, deploy thành công qua `flyctl deploy`.

**Code cuối cùng:** `backend/fly.toml` (mirror `03_Deployment/01_Deployment_Package/fly.toml`).

---

## 7. Testing

**Prompt setup:**
> "Config `jest.config.ts` cho backend: ts-jest preset, testEnvironment node, coverage collect `src/**/*.ts` trừ `__tests__` và `*.d.ts`, alias `@/*` → `<rootDir>/src/*`. Setup file `src/__tests__/setup.ts` mock pg pool mặc định, test individual có thể override."

**Output:** chạy được. Sau đó team vibe code prompt sinh test case cho từng service:

> "Cho service `lot.service.ts` có method: `createLot`, `approveLot`, `rejectLot`, `consumeFromLot`. Sinh Jest test cover: happy path, validation error, state transition invalid (approve khi không phải Quarantine), atomic rollback khi DB fail. Dùng mock pg pool. Tối thiểu 15 test case."

**Kết quả:**
- **Backend:** 669/669 pass, coverage 84.26% statements
- **Frontend:** 68/68 pass (68 file test), coverage 98.54% statements
- Integration test với PostgreSQL thật: 4 suite pass (warehouse-lifecycle, business-flows, warehouse-lifecycle-api, warehouse-lifecycle-db)

**Code cuối cùng:** test file rải khắp `__tests__/` mỗi module.

---

## 8. Phương pháp review của con người

1. **Không merge blind AI code** — code AI sinh phải chạy được `npm test` + `npx tsc --noEmit` cục bộ trước khi commit, Leader hoặc 1 thành viên khác review trước khi merge vào master.
2. **Trace back to design** — mỗi module backend phải map được với entity trong Domain Model và user story trong Product Backlog. Module nào không có story thì flag trong review.
3. **Type-check nghiêm** — `tsc --strict`, không cho `any` trừ khi có comment giải thích tại sao.
4. **Convention drift = refactor ngay** — nếu AI sinh code không khớp pattern `<domain>.routes.ts / .service.ts / .types.ts`, refactor trước khi merge, không để tích tụ nợ kỹ thuật.
5. **Version thư viện phải verify** — AI hay nhớ sai version (ES client v7 vs v8, Keycloak adapter v18 vs v24, React 18 vs 19). Luôn check `npm ls <package>` hoặc docs chính thức trước khi trust output.
6. **Git commit message kể story** — Conventional Commits có scope (`feat(lots):`, `fix(auth):`, `refactor(observability):`) để truy ngược được commit nào giải quyết vấn đề gì.
7. **Prompt edge case** — luôn hỏi AI "case nào có thể break?" sau mỗi output. Race condition, null check, timeout, version mismatch thường lộ ra từ vòng prompt thứ 2, không phải vòng 1.

## 9. Ghi chú về sử dụng AI có trách nhiệm

- Toàn bộ code AI sinh ra đều được thành viên đọc và hiểu — không copy-paste mù
- Khi AI gợi ý thư viện lạ, verify trên npm/pypi (downloads, maintenance, security advisory) trước khi cài
- Không dùng AI sinh dữ liệu thật (credentials, tên user thật, token) — chỉ dùng mock data
- Prompt chứa thông tin nhạy cảm (secret, production DB dump) **không được gửi lên AI cloud** — chạy local model hoặc xoá sensitive trước khi prompt
