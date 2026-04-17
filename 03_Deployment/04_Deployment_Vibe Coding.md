# 04_Deployment_Vibe Coding

Tài liệu ghi lại công cụ AI và các prompt chính mà nhóm đã dùng để tạo và cập nhật các sản phẩm trong thư mục `03_Deployment/` — bao gồm `01_Deployment_Package/` (IaaC files), `02_Deployment Guide.md` và `03_User Guide.md`.

## 1. Công cụ AI và công cụ triển khai đã sử dụng

| Công cụ | Loại | Vai trò |
|---------|------|---------|
| **Claude (Anthropic) — Opus 4.x qua Claude Code CLI** | AI | Soạn thảo guide, viết GitHub Actions workflow, debug deploy |
| **Fly.io CLI (`flyctl`)** | Deploy tool | Deploy backend, quản lý secrets |
| **Vercel CLI** | Deploy tool | Deploy frontend |
| **Supabase Dashboard + SQL Editor** | DB management | Apply schema, quản lý backup |
| **GitHub Actions** | CI/CD | Auto deploy khi push master |
| **Docker Desktop** | Container runtime | Build image cục bộ trước khi deploy |

## 2. Các prompt chính đã dùng

### 2.1. Prompt cho GitHub Actions workflow backend
> "Viết workflow `deploy-backend.yml` chạy khi push master có thay đổi trong `02_Source/01_Source Code/backend/**`. Các step: checkout, setup Node 22 cache npm, `npm ci`, `npx tsc --noEmit` (type-check, fail nếu lỗi), setup flyctl, `flyctl deploy --remote-only -a ims-backend-sec02`. Dùng `FLY_API_TOKEN` từ secrets."

### 2.2. Prompt cho GitHub Actions workflow frontend
> "Viết workflow `deploy-frontend.yml` deploy lên Vercel. Các step: checkout, setup Node 22, cài vercel CLI global, `vercel pull --environment=production`, `vercel build --prod`, `vercel deploy --prebuilt --prod`. Dùng `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` từ secrets."

### 2.3. Prompt cho fly.toml
> "Viết `fly.toml` cho backend: app name `ims-backend-sec02`, primary region Singapore (`sin`), internal port 3000, force HTTPS, auto-stop khi idle, min 0 machine, VM shared-CPU 1x 1GB RAM."

### 2.4. Prompt cho Dockerfile backend
> "Viết Dockerfile multi-stage cho backend Node 22-slim. Stage build: copy package.json → npm ci → copy src → tsc. Stage runtime: chỉ copy dist + node_modules production. EXPOSE 3000, CMD `node dist/server.js`. Dùng non-root user cho security."

### 2.5. Prompt cho Supabase migration script
> "Máy local không resolve được DNS `db.viguwtevkhfiszadpjvy.supabase.co` (có thể do ISP chặn). Viết script migration chạy trên Fly.io machine (có DNS resolve được) dùng `DATABASE_URL` từ env, `ssl: { rejectUnauthorized: false }`. Hướng dẫn upload script qua `flyctl sftp` và run qua `flyctl ssh console`."

### 2.6. Prompt cho Deployment Guide structure
> "Viết Deployment Guide hướng dẫn IT Administrator, bao gồm: (1) Kiến trúc triển khai (ASCII diagram), (2) Kết quả triển khai (URL + trạng thái), (3) Dịch vụ cloud đã đăng ký, (4) CI/CD pipeline chi tiết từng step, (5) Hướng dẫn deploy từ đầu (DB → Backend → Frontend), (6) IaaC file mapping, (7) Monitoring & logs, (8) Backup & recovery."

### 2.7. Prompt cho User Guide
> "Viết User Guide cho end user của hệ thống IMS. Bao gồm: cách truy cập (URL production), các role + quyền, hướng dẫn từng luồng nghiệp vụ (Material, Lot, QC, Production, Labeling, Reports), dashboard theo role. Viết tiếng Việt trang trọng, phù hợp nhân viên kho."

## 3. Phương pháp review của con người

1. **Smoke test sau mỗi deploy:** `curl https://ims-backend-sec02.fly.dev/health` phải trả `{"status":"ok"}`, Vercel URL phải HTTP 200
2. **Verify Deployment Guide bằng cách làm theo:** Leader cài máy mới từ scratch, follow Deployment Guide — nếu không deploy được thì guide có vấn đề
3. **Rollback plan phải test ít nhất 1 lần:** thử `flyctl releases revert` trên staging
4. **Secret management:** tuyệt đối không commit secret vào repo — dùng `flyctl secrets` và Vercel env. Kiểm tra bằng `git secrets` hoặc GitHub Secret Scanning
5. **Verify IaaC file snapshot:** khi thay đổi `fly.toml` hoặc `Dockerfile` trong source, phải sync sang `01_Deployment_Package/` tương ứng
6. **User Guide verify:** thành viên không tham gia phát triển feature đọc User Guide và thử làm theo — nếu bước nào không làm được thì sửa guide
