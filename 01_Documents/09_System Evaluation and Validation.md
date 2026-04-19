# System Evaluation and Validation

Tài liệu này trình bày công cụ kiểm thử, phương pháp thực thi và hiện trạng suite kiểm thử phù hợp với mã nguồn hiện tại.

## 1. Công cụ kiểm thử (Testing Tools)

### 1.1. Tổng hợp công cụ đã sử dụng

| Loại test | Công cụ | Phạm vi | Vị trí cấu hình |
|-----------|---------|---------|-----------------|
| **Unit Test** | Jest 29 | Backend (Express + TS) | `backend/jest.config.ts` |
| **Unit/Component Test** | Vitest 4 + React Testing Library + jsdom | Frontend (React + Vite) | `frontend/vite.config.ts`, `frontend/src/test/setup.ts` |
| **Integration Test** | Jest + Supertest + pg | Backend API + DB | `backend/src/modules/__tests__/warehouse-lifecycle-*` |
| **Type Check** | `tsc --noEmit` | Toàn bộ TS | `tsconfig.json` |
| **Lint** | ESLint 9 | Frontend | `frontend/eslint.config.js` |

### 1.2. Cách cài đặt

Tất cả công cụ được cài qua `npm install` trong từng thư mục:

```bash
cd "02_Source/01_Source Code/backend"
npm install

cd "02_Source/01_Source Code/frontend"
npm install
```

Xác nhận cài đặt:

```bash
cd "02_Source/01_Source Code/backend"
npx jest --version

cd "02_Source/01_Source Code/frontend"
npx vitest --version
```

## 2. Phương pháp thực thi kiểm thử

### 2.1. Pyramid kiểm thử

- **Unit Tests**: nhiều nhất, chạy mỗi lần phát triển.
- **Integration Tests**: tập trung vào các luồng nghiệp vụ chính, chạy với PostgreSQL thật.
- **Manual/UAT**: kiểm tra giao diện và luồng chính.

### 2.2. Chiến lược

- Backend dùng Jest để kiểm thử unit và integration.
- Frontend dùng Vitest với React Testing Library và jsdom cho component/unit tests.
- Type check chạy tự động với `npx tsc --noEmit`.
- Lint chạy qua ESLint.

### 2.3. Lệnh chạy

```bash
cd "02_Source/01_Source Code/backend"
npm test
npm run test:coverage
npm run test:db-integration
npm run test:api-integration

cd "02_Source/01_Source Code/frontend"
npm test
npm run test:coverage
npm run build
```

## 3. Kết quả kiểm thử (Test Results)

### 3.1. Kích thước suite kiểm thử

- Backend: 27 test files trong `backend/src/**/__tests__`.
- Frontend: 18 test files trong `frontend/src/**/*.{test.ts,test.tsx}`.

### 3.2. Backend

- Runner: Jest 29.
- Script chính: `npm test`.
- Có unit tests và integration tests cho các module chính: auth, rbac, materials, lots, qc, production, transactions, labels, reports, dashboard, search, admin.
- Có test files chuyên biệt `warehouse-lifecycle-db.integration.test.ts` và `warehouse-lifecycle-api.test.ts`.

### 3.3. Frontend

- Runner: Vitest 4.
- Kết hợp React Testing Library và jsdom.
- Bao gồm test cho hooks, components, services và screen-level interactions.

### 3.4. Coverage

- Backend coverage có thể tạo bằng `npm run test:coverage`.
- Frontend coverage có thể tạo bằng `npm run test:coverage`.
- Các báo cáo coverage chưa được ghi nhận ở tài liệu này bằng số liệu cố định, nên cần chạy lại trên môi trường hiện tại để cập nhật.

### 3.5. Tình trạng thực tế

- Mã nguồn hiện tại hỗ trợ kiểm thử tự động và đang có bộ test backend lẫn frontend.
- Các kết quả chi tiết của lần chạy cụ thể cần kiểm tra lại bằng lệnh `npm test`/`npm run test:coverage`.

## 4. Video hướng dẫn kiểm thử

> ⚠️ **TODO**: Bổ sung video hướng dẫn.

**Nội dung đề xuất:**
1. Clone repo → `cd backend` → `npm install`.
2. Chạy `npm test` và `npm run test:coverage`.
3. Mở báo cáo coverage.
4. Chạy integration tests với Docker Compose PostgreSQL.

## 5. So sánh với hệ thống tham khảo

Bảng so sánh có thể giữ nguyên như tài liệu đang trình bày, với điểm mạnh về QC workflow, role-based dashboard và nguồn mở.

> Lưu ý: phần này là so sánh tham chiếu và không ảnh hưởng trực tiếp tới cấu trúc mã nguồn.
