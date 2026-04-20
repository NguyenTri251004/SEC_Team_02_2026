# System Evaluation and Validation

Tài liệu trình bày cách đăng ký và cài đặt các công cụ kiểm thử, phương pháp thực thi kiểm thử, kết quả kiểm thử và bảng so sánh hệ thống IMS với các hệ thống tương tự.

## 1. Công cụ kiểm thử (Testing Tools)

### 1.1. Tổng hợp công cụ đã sử dụng

| Loại test | Công cụ | Phạm vi | Vị trí cấu hình |
|-----------|---------|---------|-----------------|
| **Unit Test** | Jest 29 + ts-jest | Backend (Express + TS) | `backend/jest.config.ts` |
| **Unit/Component Test** | Vitest 4 + React Testing Library + jsdom | Frontend (React + Vite) | `frontend/vite.config.ts`, `frontend/src/test/setup.ts` |
| **Integration Test** | Jest + Supertest + pg (real PostgreSQL) | Backend API + DB | `backend/src/modules/__tests__/warehouse-lifecycle-*` |
| **Manual API Test** | curl + Postman | Smoke test sau deploy | — |
| **Type Check** | `tsc --noEmit` | Toàn bộ TS | `tsconfig.json` |
| **Lint** | ESLint 9 (flat config) | Frontend | `frontend/eslint.config.js` |

### 1.2. Cách cài đặt

Tất cả công cụ đi kèm dependency của project, không cần cài thủ công:

```bash
cd "02_Source/01_Source Code/backend"
npm install

cd "../frontend"
npm install
```

Xác nhận cài đặt:
```bash
npx jest --version     # 29.7.0
npx vitest --version   # 4.1.2
npx tsc --version      # 5.9.x
```

## 2. Phương pháp thực thi kiểm thử

### 2.1. Pyramid kiểm thử

```
      ┌────────────────────────┐
      │  Manual UAT (thủ công) │   ← trước mỗi milestone
      ├────────────────────────┤
      │  Integration Tests     │   ← Supertest + DB thật
      ├────────────────────────┤
      │  Unit Tests            │   ← chạy mỗi commit
      └────────────────────────┘
```

### 2.2. Chiến lược

- **Unit test** chạy local và trên GitHub Actions mỗi lần push
- **Integration test** chạy thủ công trước mỗi Pull Request ảnh hưởng lớn đến luồng nghiệp vụ (cần PostgreSQL thật qua Docker Compose hoặc Supabase)
- **Type check** chạy tự động trong CI workflow `deploy-backend.yml` qua lệnh `npx tsc --noEmit` — block deploy nếu có lỗi type
- **Smoke test** sau mỗi lần deploy: `curl https://ims-backend-sec02.fly.dev/health`

### 2.3. Lệnh chạy

```bash
cd "02_Source/01_Source Code/backend"

npm test                       # Unit + integration
npm run test:coverage          # + báo cáo coverage HTML
npm run test:db-integration    # Integration với DB (cần Docker postgres)
npm run test:api-integration   # End-to-end warehouse lifecycle

cd "../frontend"

npm test                       # Frontend unit/component tests
npm run test:coverage          # Frontend coverage report
npm run build                  # Type check + Vite build
```

## 3. Kết quả kiểm thử (Test Results)

Kết quả chạy trên branch `master` (2026-04-20):

### 3.1. Backend Unit Tests

```
Test Suites: 26 passed, 26 total
Tests:       669 passed, 669 total
Time:        1.992 s
```

**Tỉ lệ pass: 100%** (669/669)

### 3.2. Frontend Unit/Component Tests

```
Test Files:  23 passed, 23 total
Tests:       68 passed, 68 total
Duration:    14.74 s
```

**Tỉ lệ pass: 100%** (68/68)

### 3.3. Coverage toàn bộ frontend

| Metric | Giá trị |
|--------|---------|
| Statements | **98.54%** |
| Branches | **86.93%** |
| Functions | **99.53%** |
| Lines | **98.67%** |

### 3.4. Coverage chi tiết theo nhóm module frontend

| Nhóm module | Statements | Branches | Functions | Lines |
|------------|-----------|----------|-----------|-------|
| `auth` | 100% | 87.80% | 100% | 100% |
| `hooks` | 98.64% | 81.81% | 100% | 98.96% |
| `lib` | 100% | 100% | 100% | 100% |
| `lib/observability` | 95.23% | 80.76% | 100% | 94.82% |
| `pages/dashboard/utils` | 100% | 100% | 100% | 100% |
| `services` | 98.76% | 95.34% | 97.36% | 98.76% |
| `stores` | 100% | 100% | 100% | 100% |

### 3.5. Coverage toàn bộ backend

| Metric | Giá trị |
|--------|---------|
| Statements | **84.26%** |
| Branches | **73.77%** |
| Functions | **83.60%** |
| Lines | **84.00%** |

### 3.6. Coverage chi tiết theo module backend

| Module | Statements | Branches | Functions | Lines |
|--------|-----------|----------|-----------|-------|
| `modules/search` | 100% | 100% | 100% | 100% |
| `modules/reports` | 95.94% | 80.70% | 95.00% | 96.47% |
| `modules/qc` | 93.91% | 77.38% | 93.75% | 93.65% |
| `modules/production` | 91.37% | 72.54% | 100% | 90.96% |
| `modules/transactions` | 90.90% | 91.17% | 100% | 90.41% |
| `security/auth` | 90.21% | 58.13% | 87.50% | 92.94% |
| `security/rbac` | 64.00% | 33.33% | 75.00% | 57.14% |
| `shared/db/pool` | 100% | 78.57% | 100% | 100% |

### 3.7. Integration Tests

| Suite | Kết quả |
|-------|---------|
| `warehouse-lifecycle.test.ts` (mocked) | Pass |
| `warehouse-lifecycle-api.test.ts` (API + mocked DB) | Pass |
| `warehouse-lifecycle-db.integration.test.ts` (real DB) | Pass |
| `business-flows.test.ts` | Pass |

### 3.8. Log cài đặt và chạy thử

HTML coverage report được tạo tại `backend/coverage/lcov-report/index.html`.
Text summary của lần chạy gần nhất lưu trong commit history (xem `git log`).

Frontend coverage report được tạo tại `frontend/coverage/`.

## 4. Video hướng dẫn kiểm thử

> ⚠️ **[TODO] Cần quay và upload YouTube**
>
> **Nội dung cần có (theo yêu cầu syllabus):** quá trình đăng ký hoặc cài đặt các công cụ để kiểm thử hệ thống, phương pháp thực thi việc kiểm thử, và các kết quả kiểm thử thu được.
>
> **Gợi ý kịch bản:**
> 1. Clone repo → `cd backend` → `npm install`
> 2. Chạy `npm test` → show 669 tests pass
> 3. Chạy `npm run test:coverage` → mở HTML coverage report
> 4. Chạy integration test với Docker Compose up PostgreSQL
> 5. Show GitHub Actions log type-check trên PR
>
> **YouTube link:** _(sẽ bổ sung)_

## 5. So sánh với các hệ thống tương tự

Bảng so sánh IMS của nhóm với 2 hệ thống thương mại phổ biến trong ngành quản lý kho / tồn kho:

| Tiêu chí | **IMS của nhóm** | **Odoo Inventory** | **Zoho Inventory** |
|---------|-----------------|-------------------|-------------------|
| **Loại** | Open-source, self-hosted | Open-source (Community) / SaaS (Enterprise) | SaaS (proprietary) |
| **Chi phí** | Miễn phí (free tier cloud) | Community miễn phí; Enterprise ~ $25+/user/tháng | Free plan ≤ 50 đơn/tháng; Standard $29/tháng |
| **Ngôn ngữ nguồn** | TypeScript (Node) + Python (AI) | Python | Proprietary |
| **Lot tracking (vòng đời)** | ✅ Quarantine → Accepted/Rejected → Depleted | ✅ Có (lots/serial) | ✅ Có (batch tracking) |
| **QC workflow (kiểm định chất lượng)** | ✅ Tích hợp native (dành cho pharma) | ⚠️ Cần module Quality riêng (Enterprise) | ❌ Không có QC chuyên biệt |
| **Label (barcode/QR) built-in** | ✅ bwip-js + qrcode + jsPDF | ✅ Có (module Barcodes) | ✅ Có |
| **Role-based dashboard** | ✅ 5 role, mỗi role có view riêng | ✅ Tuỳ biến qua Groups | ✅ Có |
| **AI analytics / forecasting** | ✅ AI service (FastAPI) — demand forecast + anomaly | ⚠️ Enterprise add-on | ⚠️ Zoho Analytics riêng |
| **Tùy biến (customize)** | ✅ Full source control | ✅ Full (Community) | ❌ Bị giới hạn |
| **IAM 3rd party (Keycloak)** | ✅ Keycloak sẵn sàng | ⚠️ Cần module LDAP/OAuth | ✅ Zoho Accounts |
| **Deploy đa cloud** | ✅ Fly.io / Vercel / Supabase | ✅ Odoo.sh / self-hosted | ❌ SaaS duy nhất |
| **Microservices (tách service)** | ✅ Backend + AI service + DB tách biệt | ❌ Monolith | ❌ SaaS monolith |
| **Phù hợp cho** | Pharma/manufacturing nhỏ & vừa | Doanh nghiệp đa ngành | SMB bán lẻ, e-commerce |

### Điểm mạnh của IMS nhóm so với hệ thống tham khảo
1. **Miễn phí hoàn toàn** — dùng free tier cloud, không phát sinh chi phí license
2. **QC workflow chuyên biệt pharma** — lot phải qua Quarantine → QC Accept mới xuất kho, trong khi Zoho không có module QC tương đương
3. **AI add-on tích hợp** — service FastAPI dự đoán nhu cầu và phát hiện bất thường
4. **Traceability chi tiết** — audit log đầy đủ mọi thao tác, đáp ứng yêu cầu tuân thủ pháp lý

### Điểm hạn chế
1. Số lượng tính năng ít hơn Odoo (không có module kế toán, CRM, HR)
2. Chưa có mobile app (trong khi Zoho và Odoo đều có)
3. Ecosystem và cộng đồng nhỏ (là đồ án sinh viên)
