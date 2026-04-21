# 07_Coding Standards — Vibe Coding

Tài liệu ghi lại **quá trình vibe coding** đã dẫn tới `07_Coding Standards.md` — convention được chuẩn hoá qua các vòng prompt **đọc ngược từ config thực tế của repo** (ESLint, tsconfig, jest.config, package.json) thay vì để AI tự sinh aspirational rule.

## 0. Công cụ AI và source of truth

| Công cụ | Vai trò |
|---------|---------|
| **Claude (Anthropic) — Claude Opus 4.x qua Claude Code CLI** | Đọc config thực tế, tổng hợp convention khớp config, không sinh aspirational |
| **ChatGPT** | So sánh best practice Airbnb/Google style để tham khảo (không apply blind) |
| **ESLint + `tsc --noEmit`** | Source of truth — rule nào enforce được mới ghi vào tài liệu |
| **Commit history (`git log`)** | Source of truth cho commit message convention thực tế nhóm dùng |

---

## 1. Khảo sát config thực tế

### 1.1. Vòng prompt 1 — đọc config hiện có

**Prompt gốc:**
> "Đọc và trích dẫn nguyên văn:
> - `frontend/eslint.config.js`
> - `backend/tsconfig.json` + `frontend/tsconfig.app.json`
> - `backend/jest.config.ts`
> - `backend/package.json` (scripts + dependencies)
> - `frontend/package.json`
> Liệt kê chính xác: rule nào đang enforce, preset nào đang dùng, strict flag nào đang bật. **Không được suy đoán** — chỉ trích nội dung thực tế."

**Output AI:** bảng 4 file × rule được enforce. Phát hiện:
- ESLint 9 flat config với `typescript-eslint` + `react-hooks` + `react-refresh`
- `tsc --strict: true` cả backend lẫn frontend
- Jest `ts-jest` preset, collect coverage từ `src/**/*.ts`
- **KHÔNG có Prettier, Husky, commitlint** trong devDependencies

**Vấn đề phát hiện:** team từng muốn ghi "dùng Prettier" trong tài liệu dù chưa install → aspirational. Prompt refine để tránh:

**Prompt:**
> "Trong `package.json` có Prettier, Husky, commitlint không? Nếu không có thì tài liệu phải ghi rõ 'chưa áp dụng', **không ghi như đã có**. Rule chung: không aspirational — chưa chạy được thì không ghi."

**Output:** danh sách "chưa áp dụng" được ghi nhận: Prettier, Husky pre-commit hook, commitlint.

**Kết quả:** Section "Công cụ đang áp dụng" và "Công cụ chưa áp dụng" trong Coding Standards (honest, không sugarcoat).

---

## 2. Naming Convention

### 2.1. Vòng prompt — naming theo ngôn ngữ

**Prompt:**
> "Viết naming convention khớp với code thực tế trong repo. Đọc 5 file mẫu mỗi loại:
> - Backend TS: `backend/src/modules/lots/lots.service.ts` và 4 file khác
> - Frontend TSX: `frontend/src/pages/dashboard/AdminDashboard.tsx` và 4 file khác
> - Python: `ai-service/main.py`
> Liệt kê convention đã **thực sự dùng** trong repo:
> - Variable / function: camelCase hay snake_case?
> - Class / React component: PascalCase?
> - Constants: UPPER_SNAKE_CASE?
> - File name: kebab-case, PascalCase, hay snake_case?
> Trích dẫn ví dụ cụ thể từng loại."

**Output:** khớp thực tế — Backend/Frontend TS camelCase + PascalCase, file utility kebab-case, React component PascalCase, Python snake_case, constants UPPER_SNAKE_CASE.

**Vấn đề:** có 2 file không tuân convention (`backend/src/shared/utils/asyncHandler.ts` camelCase file name thay vì kebab) — AI flag ngay.

**Prompt fix:**
> "File `asyncHandler.ts` phá convention kebab-case. 2 lựa chọn: (a) rename thành `async-handler.ts` và update tất cả import, (b) ghi vào tài liệu là exception với lý do. Chọn (a) vì ít file và dễ tìm."

**Output:** rename file, update 8 import. Tài liệu ghi convention dứt khoát không có exception.

**Kết quả:** Section "Naming" Coding Standards — 100% khớp code.

---

## 3. Module Pattern Backend

### 3.1. Vòng prompt — chuẩn hoá pattern

**Prompt:**
> "Mỗi module backend trong `backend/src/modules/` phải có 3 file chính:
> - `<domain>.routes.ts` — Express router, không chứa business logic
> - `<domain>.service.ts` — business logic, gọi DB qua pool
> - `<domain>.types.ts` — TS interface cho request/response
> Và 1 thư mục `__tests__/`. Viết section Module Pattern hướng dẫn developer mới: quy tắc phân chia, import nào được phép giữa 3 file, khi nào tách thêm file (utils, constants)."

**Output:** hướng dẫn đầy đủ. Có 1 rule team **không đồng ý**: "routes chỉ return raw pg result" — team muốn routes trả `ApiResponse<T>` chuẩn.

**Prompt refine:**
> "Sửa lại rule: routes phải wrap kết quả service vào `ApiResponse<T>` hoặc `PaginatedResponse<T>` (đã định nghĩa trong `shared/types.ts`) — không return raw DB row. Thêm ví dụ code."

**Output:** rule đúng convention thực tế. Ví dụ code trích từ `lots.routes.ts`.

**Kết quả:** Section "Backend Module Pattern" Coding Standards.

---

## 4. Frontend Pattern (React Query + Zustand)

### 4.1. Vòng prompt — quy tắc hook + store

**Prompt:**
> "Đọc `frontend/src/hooks/useLotsData.tsx`, `frontend/src/stores/uiStore.ts`, và 3 hook khác. Tổng hợp convention:
> - React Query: khi nào dùng, stale time bao nhiêu, invalidation pattern
> - Zustand: chỉ chứa gì (UI state? server state?), không chứa gì
> - Đặt tên hook: `use<Domain>Data` (query + mutation), `use<Feature>` (logic UI)
> - Path alias `@/*` dùng ở đâu, không dùng ở đâu
> Viết thành rule có ví dụ."

**Output:** convention cụ thể. Rule **quan trọng** team xác nhận: "Zustand **không chứa server state** — server state luôn qua React Query. Zustand chỉ cho UI state (sidebar open, modal visible)."

**Kết quả:** Section "Frontend Convention" Coding Standards.

---

## 5. Commit Message Convention

### 5.1. Vòng prompt — verify từ git log

**Prompt:**
> "Lấy 20 commit gần nhất qua `git log --oneline -20`. Kiểm tra message có tuân Conventional Commits (`<type>(<scope>): <description>`) không. Liệt kê:
> - Type nào team dùng (feat, fix, docs, refactor, chore, test, style)
> - Scope nào phổ biến
> - Tỉ lệ commit tuân convention
> Trích 5 commit mẫu tốt vào tài liệu."

**Output:** ~90% commit tuân convention. Type phổ biến: `feat` (40%), `fix` (20%), `docs` (25%), `refactor` (10%), khác (5%). Scope phổ biến: `auth`, `lots`, `observability`, `qc`.

**5 commit mẫu** trích dẫn vào tài liệu từ history thực — ví dụ `feat(observability): integrate Prometheus metrics`, `fix: enable viewer user account in database initialization`.

**Kết quả:** Section "Commit Message" Coding Standards — có ví dụ thật.

---

## 6. Phương pháp review của con người

1. **Rule "không có trong code thì không có trong tài liệu"** — tránh aspirational. Ví dụ Prettier/Husky chưa install thì tài liệu ghi "chưa áp dụng", không ghi "team dùng Prettier"
2. **Leader đối chiếu từng mục** với file config/code thực tế trước khi commit
3. **Mỗi thành viên thử chạy `npm run lint` và `npx tsc --noEmit` cục bộ** để đảm bảo rule trong tài liệu thực thi được
4. **Thêm công cụ mới = update tài liệu cùng commit** — ví dụ khi install Prettier sẽ phải update `07_Coding Standards.md` và file Vibe Coding này cùng lúc
5. **Commit message vi phạm convention** — không reject hẳn nhưng Leader ping nhắc trong Discord, sau vài lần nhắc thì commit tiếp theo cần Leader review trước khi merge
6. **Naming drift** — nếu file mới sinh ra không khớp convention, reviewer yêu cầu rename trước khi merge; không để "chữa sau"
