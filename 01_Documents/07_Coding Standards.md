# Coding Standards & Conventions

*(Thể hiện chuẩn mã nguồn hoặc quy ước mã nguồn nhóm phát triển cần tuân thủ, và các công cụ được sử dụng để đảm bảo chuẩn mã nguồn)*

## 1. Quy ước chung (General Conventions)
### 1.1. Naming Convention
*   **Biến (Variables):** `camelCase` (ví dụ: `userProfile`, `inventoryItem`)
*   **Hàm (Functions):** `camelCase` (ví dụ: `calculateTotal()`, `updateStatus()`)
*   **Lớp (Classes):** `PascalCase` (ví dụ: `InventoryController`, `UserMiddleware`)
*   **Hằng số (Constants):** `UPPER_SNAKE_CASE` (ví dụ: `MAX_RETRY_ATTEMPTS`, `DEFAULT_PAGE_SIZE`)
*   **File Name:**
    *   Javascript/Typescript: `kebab-case` (ví dụ: `user-service.ts`) hoặc `PascalCase` cho Component React.
    *   Python: `snake_case` (ví dụ: `data_processing.py`).

### 1.2. Commenting
*   Sử dụng JSDoc/Docstring cho các hàm public và API endpoints.
*   Comment giải thích "Tại sao" (Why) thay vì "Cái gì" (What).

## 2. Công cụ đảm bảo chất lượng (Tools)
Để đảm bảo code tuân thủ chuẩn, nhóm sử dụng các công cụ sau:

### 2.1. Linter & Formatter
*   **ESLint:** Cấu hình theo `airbnb-base` hoặc `google`. Dùng để bắt lỗi cú pháp và style trong JS/TS.
*   **Prettier:** Tự động định dạng code (indentation, quotes, spacing) khi lưu file.
*   **Pylint / Black:** Dành cho Python backend (nếu có).

### 2.2. Git Hooks (Husky)
*   **pre-commit:** Tự động chạy `lint-staged` để kiểm tra các file đang được commit. Nếu lỗi lint, chặn commit.
*   **commit-msg:** Kiểm tra format commit message (theo chuẩn Conventional Commits).

## 3. Quy trình Review Code
1.  Developer tạo Pull Request (PR).
2.  CI Pipeline chạy tự động (Build + Test + Lint).
3.  Ít nhất 1 reviewer phải approve PR.
4.  Merge vào nhánh chính (main/develop).
