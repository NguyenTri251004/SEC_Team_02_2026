# 04_Source_Vibe Coding

Tài liệu ghi lại công cụ AI và các prompt chính mà nhóm đã dùng để tạo và cập nhật các sản phẩm trong thư mục `02_Source/` — bao gồm mã nguồn Backend, Frontend, AI Service, Database schema, Monitoring stack, Docker Compose, và các tài liệu hướng dẫn build.

## 1. Công cụ AI đã sử dụng

| Công cụ | Giai đoạn dùng nhiều nhất | Vai trò chính |
|---------|---------------------------|---------------|
| **Claude (Anthropic) — Opus 4.x qua Claude Code CLI** | Toàn bộ dự án | Sinh code module, refactor, debug, review PR |
| **Cursor IDE** (giai đoạn đầu) | Setup dự án, scaffolding | Inline AI completion |
| **GitHub Copilot** | Khi viết code lặp | Autocomplete snippet |
| **ChatGPT (GPT-4)** | Hỏi nhanh về thư viện / syntax | Supplement |

## 2. Các prompt chính theo từng phần

### 2.1. Backend (Express + TypeScript)

> **Prompt scaffolding module:** "Tạo module backend cho domain `lots` theo pattern `<domain>.routes.ts / <domain>.service.ts / <domain>.types.ts`. Bao gồm: CRUD lot, filter theo status/material, approve/reject, consume. Dùng pg pool chung từ `shared/db/pool.ts`. Response theo `ApiResponse<T>` / `PaginatedResponse<T>`."

> **Prompt viết service transaction:** "Viết function `consumeFromLot(batchId, lotId, quantity)` dùng pg transaction đảm bảo atomic: (1) decrement lot.quantity, (2) update batch_components.actual_quantity, (3) insert inventory_transactions. Rollback toàn bộ nếu bất kỳ step nào fail."

> **Prompt viết RBAC:** "Thiết kế RBAC middleware dùng PERMISSIONS matrix `{ resource: { action: role[] } }`. Tích hợp với JWT middleware để extract role từ token Keycloak. Ví dụ: `{ lots: { approve: ['admin', 'quality_control'] } }`."

### 2.2. Frontend (React 19 + Vite)

> **Prompt setup dự án:** "Init React 19 + Vite 7 + TypeScript project. Dùng Ant Design 6, Tailwind CSS 4. Config path alias `@/*` → `src/*` trong vite.config.ts và tsconfig.app.json."

> **Prompt React Query hook:** "Viết `hooks/useLotsData.ts` dùng TanStack React Query: queryKey theo filter, stale time 30s, invalidation khi mutation thành công. Tách riêng query hook và mutation hook."

> **Prompt Auth flow:** "Tích hợp Keycloak-js vào React. Khi init: gọi `check-sso`, nếu đã đăng nhập thì set token vào Zustand store. Axios interceptor: auto attach Bearer token, refresh khi 401."

### 2.3. AI Service (FastAPI)

> **Prompt boilerplate:** "Init FastAPI service với: health endpoint, 2 endpoint stub (`/predict-demand`, `/detect-anomaly`) dùng Pydantic models. Async Redis + async Elasticsearch client. CORS enabled cho localhost:5173."

### 2.4. Database Schema

> **Prompt schema:** "Viết PostgreSQL 16 schema (`db-init.sql`) cho IMS: `users`, `materials`, `inventory_lots`, `inventory_transactions`, `qc_tests`, `production_batches`, `batch_components`, `label_templates`. Bao gồm: PK, FK, CHECK constraint cho status enum, indexes cho cột tìm kiếm thường xuyên (lot_number, material_id, status, received_date), trigger update `updated_at`."

### 2.5. Monitoring Stack _(đã thử nghiệm, hiện đã revert)_

> **Prompt setup OpenTelemetry:** "Instrument backend Express với `@opentelemetry/auto-instrumentations-node` export trace qua OTLP HTTP tới collector. Frontend dùng `@opentelemetry/sdk-trace-web` instrument fetch và document-load. Config stack Prometheus + Grafana + Loki + Tempo trong `monitoring/` dùng docker-compose."

_Ghi chú: stack quan sát đầy đủ đã được POC trên branch `feature/monitoring-observability`, nhưng hiện tại được revert về master để tập trung cho các tính năng cốt lõi. Kế hoạch đưa lại theo lộ trình trong `05_Architecture.md`._

### 2.6. Docker + Deploy

> **Prompt Dockerfile:** "Viết Dockerfile cho backend Node 22-slim multi-stage: stage 1 build (tsc), stage 2 runtime chỉ copy dist + production deps. Dùng non-root user. Healthcheck `curl /health`."

> **Prompt Fly.io config:** "Viết `fly.toml` deploy app `ims-backend-sec02` region Singapore, shared-CPU 1x 1GB RAM, auto-stop khi idle, force HTTPS, internal port 3000."

### 2.7. Testing

> **Prompt Jest setup:** "Config `jest.config.ts` với ts-jest preset, coverage collect từ `src/**/*.ts` trừ `__tests__` và `.d.ts`. Map alias `@/*`. Setup file chung để mock pg pool."

## 3. Phương pháp review của con người

1. **Code review cứng:** mỗi PR phải có ít nhất 1 thành viên khác approve trước khi merge
2. **Không merge blind AI code:** code AI sinh ra phải chạy được `npm test` + `npx tsc --noEmit` trước khi commit
3. **Trace back to design:** mỗi module backend phải map với entity trong Domain Model và user story trong Product Backlog
4. **Type check nghiêm ngặt:** dùng `tsc --strict`, không cho phép `any` trừ khi có comment giải thích
5. **Refactor khi phát hiện drift:** nếu code AI sinh không khớp convention (ví dụ: naming, module pattern), refactor trước khi merge — không để tích tụ nợ kỹ thuật
6. **Self-test trước PR:** developer phải tự chạy test liên quan cục bộ trước khi push

## 4. Ghi chú về sử dụng AI có trách nhiệm

- Toàn bộ code AI sinh ra đều được thành viên đọc và hiểu — không copy-paste mù
- Khi AI gợi ý thư viện lạ, verify trên npm/pypi (downloads, maintenance, security advisory) trước khi cài
- Không dùng AI sinh dữ liệu thật (credentials, tên user thật) — chỉ dùng dữ liệu mẫu
- Prompt chứa thông tin nhạy cảm (ví dụ: secret, database dump) không được gửi lên AI cloud
