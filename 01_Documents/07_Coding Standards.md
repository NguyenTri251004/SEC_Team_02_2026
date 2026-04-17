# Coding Standards & Conventions

Tài liệu thể hiện chuẩn mã nguồn (Coding Standards) và quy ước mã nguồn (Coding Convention) mà nhóm phát triển tuân thủ trong dự án Inventory Management System, cùng các công cụ được sử dụng để đảm bảo chuẩn mã nguồn.

## 1. Phạm vi áp dụng

Chuẩn mã nguồn dưới đây được áp dụng cho các thành phần mã nguồn trong `02_Source/01_Source Code/`:

| Thành phần | Ngôn ngữ | Framework |
|------------|----------|-----------|
| `backend/` | TypeScript 5.1 | Express 4, Node.js 22 |
| `frontend/` | TypeScript 5.9 | React 19, Vite 7 |
| `ai-service/` | Python 3.11 | FastAPI |

## 2. Quy ước đặt tên (Naming Conventions)

| Đối tượng | Quy ước | Ví dụ |
|-----------|---------|-------|
| Biến (Variables) | `camelCase` | `userProfile`, `inventoryLot` |
| Hàm (Functions) | `camelCase` | `calculateTotal()`, `consumeMaterial()` |
| Lớp / React Component | `PascalCase` | `AuthProvider`, `InventoryLotService` |
| Hằng số (Constants) | `UPPER_SNAKE_CASE` | `MAX_RETRY_ATTEMPTS`, `BYPASS_KEYCLOAK` |
| File TypeScript utility | `kebab-case.ts` | `user-service.ts`, `column-factories.tsx` |
| File React component | `PascalCase.tsx` | `AppLayout.tsx`, `KpiCard.tsx` |
| File Python | `snake_case.py` | `main.py` |
| Thư mục module | `kebab-case` hoặc `lowercase` | `materials/`, `qc/` |
| Backend module file | `<module>.<role>.ts` | `lot.routes.ts`, `lot.service.ts`, `lot.types.ts` |

## 3. Cấu trúc Module (Backend)

Mỗi domain module trong `backend/src/modules/` tuân thủ cấu trúc sau:

```
modules/<domain>/
├── <domain>.routes.ts     # Express router + validation
├── <domain>.service.ts    # Business logic + DB access
├── <domain>.types.ts      # TypeScript interfaces
└── __tests__/             # Jest test files
    ├── <domain>.routes.test.ts
    └── <domain>.service.test.ts
```

Áp dụng cho toàn bộ module: `admin`, `auth`, `dashboard`, `labels`, `lots`, `materials`, `production`, `qc`, `reports`, `search`, `transactions`.

## 4. Quy ước TypeScript

Cấu hình trong `backend/tsconfig.json` và `frontend/tsconfig.app.json`:

- `strict: true` — bật toàn bộ strict type checking
- `forceConsistentCasingInFileNames: true`
- `esModuleInterop: true`
- `target: ES2020` (backend), `ES2022` (frontend)
- Path alias `@/*` → `src/*` (áp dụng cho cả backend và frontend)

**Yêu cầu:**
- Không được dùng `any` nếu có thể suy luận kiểu
- API response bắt buộc dùng generic `ApiResponse<T>` hoặc `PaginatedResponse<T>`
- Mọi handler Express phải trả về `Promise<void>` hoặc dùng helper `asyncHandler`

## 5. Quy ước React

- Function components + Hooks (không dùng class component)
- State server-side: TanStack React Query (`hooks/use<Domain>Data.ts`)
- State UI client-side: Zustand (`stores/uiStore.ts`)
- Import đường dẫn: dùng `@/` alias, không dùng `../../`
- Mỗi page nằm trong `src/pages/<domain>/`
- Widget dùng lại nằm trong `src/components/dashboard/` hoặc `src/components/common/`

## 6. Quy ước Commit Message

Dự án theo chuẩn [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]
```

Các `type` được sử dụng trong repo:

| Type | Ý nghĩa | Ví dụ thực tế trong repo |
|------|---------|--------------------------|
| `feat` | Thêm tính năng mới | `feat(observability): add observability stack and instrumentation` |
| `fix` | Sửa lỗi | `fix: resolve all failing unit tests in label and business flow modules` |
| `refactor` | Tái cấu trúc không đổi hành vi | `refactor: extract common table column factories` |
| `test` | Thêm/sửa test | `Added 2 integration tests` |
| `docs` | Chỉnh sửa tài liệu | `docs: update deployment guide` |
| `chore` | Việc phụ (build, CI...) | `chore: bump dependencies` |

## 7. Công cụ đảm bảo chất lượng (Tooling)

### 7.1. ESLint (Frontend)

Dự án dùng **ESLint flat config** tại `frontend/eslint.config.js` với các preset:

- `@eslint/js` — recommended rules
- `typescript-eslint` — recommended rules
- `eslint-plugin-react-hooks` — enforce rules of hooks
- `eslint-plugin-react-refresh` — Vite fast-refresh safety

Chạy lint:
```bash
cd "02_Source/01_Source Code/frontend"
npm run lint
```

### 7.2. TypeScript Compiler (Backend + Frontend)

Vai trò như static checker chính. Chạy:

```bash
# Backend
cd "02_Source/01_Source Code/backend"
npx tsc --noEmit

# Frontend (khi build)
cd "02_Source/01_Source Code/frontend"
npm run build    # tsc -b && vite build
```

### 7.3. Jest (Backend)

Cấu hình tại `backend/jest.config.ts`:

- Preset: `ts-jest`
- Test match: `**/__tests__/**/*.test.ts`
- Coverage reporters: `text`, `lcov`, `html`
- Collect coverage từ toàn bộ `src/**/*.ts`

Chạy test:
```bash
npm test                  # Toàn bộ test
npm run test:coverage     # Kèm báo cáo coverage
npm run test:db-integration   # Integration test với DB
npm run test:api-integration  # Integration test warehouse lifecycle
```

## 8. Quy trình Review Code

1. Developer tạo nhánh feature từ `master`: `git checkout -b feat/<ten-tinh-nang>`
2. Commit theo Conventional Commits và push lên GitHub
3. Mở Pull Request tới `master`
4. **GitHub Actions tự động chạy:**
   - `Deploy Backend` workflow (`.github/workflows/deploy-backend.yml`) — type-check bằng `tsc --noEmit` trước khi deploy
   - `Deploy Frontend` workflow (`.github/workflows/deploy-frontend.yml`) — build qua Vercel CLI
5. Ít nhất 1 thành viên khác review và approve
6. Merge vào `master` → CI tự động deploy production (Fly.io + Vercel)

## 9. Ghi chú về các công cụ chưa áp dụng

Để đảm bảo tính trung thực, các công cụ sau **chưa** được tích hợp vào dự án (có thể bổ sung ở vòng hoàn thiện):

- **Prettier** — đang dựa vào ESLint + IDE format (VS Code)
- **Husky pre-commit hook** — chưa có tự động chạy lint khi commit
- **commitlint** — chưa có validation tự động format commit message
- **ESLint cho backend** — hiện backend chỉ dựa vào `tsc --strict`
