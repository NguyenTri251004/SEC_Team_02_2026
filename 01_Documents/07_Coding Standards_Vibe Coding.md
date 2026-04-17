# 07_Coding Standards — Vibe Coding

Tài liệu ghi lại công cụ AI và các prompt chính mà nhóm đã dùng để tạo và cập nhật `07_Coding Standards.md`.

## 1. Công cụ AI đã sử dụng

| Công cụ | Mục đích |
|---------|----------|
| **Claude (Anthropic) — Opus 4.x qua Claude Code CLI** | Tổng hợp convention, đọc config thực tế của repo để đảm bảo tài liệu khớp thực tế |
| **ChatGPT** | So sánh best practice giữa các dự án open source (Airbnb style, Google style) |
| **ESLint / tsc** | Source of truth — tài liệu phải khớp với rule đang thực thi |

## 2. Các prompt chính đã dùng

### 2.1. Prompt khảo sát config thực tế
> "Đọc file `frontend/eslint.config.js`, `backend/tsconfig.json`, `backend/jest.config.ts`, `frontend/package.json`. Liệt kê chính xác các rule đang được enforce, preset đang dùng, và các strict flag đang bật. Không được suy đoán — chỉ trích dẫn nội dung thực tế."

### 2.2. Prompt viết convention
> "Dựa trên config đã khảo sát, viết tài liệu Coding Standards tiếng Việt bao gồm: (1) Naming conventions cho variable/function/class/file theo từng ngôn ngữ (TS backend, TSX frontend, Python AI service), (2) Cấu trúc module backend (`.routes.ts`, `.service.ts`, `.types.ts`), (3) Quy ước React Query + Zustand cho frontend, (4) Convention commit message."

### 2.3. Prompt về các công cụ chưa áp dụng
> "Trong repo có Prettier, Husky, commitlint không? Nếu không, phải ghi rõ trong tài liệu — KHÔNG được ghi aspirational (điều chưa có như đã có)."

### 2.4. Prompt cross-validate với commit history
> "Lấy 10 commit gần nhất. Kiểm tra xem format message có tuân thủ Conventional Commits (`<type>(<scope>): <description>`) không. Đưa ví dụ từ commit thật vào tài liệu."

## 3. Phương pháp review của con người

1. Leader đọc lại và đối chiếu từng mục trong tài liệu với file config/code thực tế
2. Quy tắc "nếu không có trong code thì không có trong tài liệu" — tránh aspirational docs
3. Mỗi thành viên thử chạy `npm run lint` và `npx tsc --noEmit` cục bộ để đảm bảo convention trong tài liệu chạy được
4. Khi thêm công cụ mới (ví dụ: Prettier hoặc Husky) thì cập nhật đồng thời tài liệu này
