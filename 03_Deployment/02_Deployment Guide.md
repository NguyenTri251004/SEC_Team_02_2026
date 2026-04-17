# Deployment Guide

Tài liệu hướng dẫn **một nhà quản trị hệ thống (IT Administrator)** đăng ký dịch vụ, cài đặt môi trường triển khai, cấu hình CI/CD (Continuous Deployment / Continuous Delivery), thực thi kịch bản cung cấp tài nguyên (IaaC) và vận hành hệ thống Inventory Management System (IMS) trên môi trường Internet thực tế.

## 1. Kiến trúc triển khai (Production Architecture)

```
        ┌──────────────────────┐         ┌──────────────────────┐
        │       Vercel         │         │        Fly.io        │
        │   (Frontend CDN)     │         │      (Backend)       │
        │ ims-frontend-sec02   │ ────────▶│ ims-backend-sec02   │
        │  (React + Vite)      │  HTTPS  │  (Express + Node 22) │
        └──────────┬───────────┘         └──────────┬───────────┘
                   │                                 │
                   │                                 │
                   └─────────────┬───────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │       Supabase          │
                    │    PostgreSQL 16        │
                    │ viguwtevkhfiszadpjvy    │
                    └─────────────────────────┘
```

## 2. Kết quả triển khai (Deployment Outputs)

| Thành phần | URL / Định danh | Trạng thái |
|------------|-----------------|------------|
| **Web UI** | https://ims-frontend-sec02.vercel.app | Online (HTTPS, auto SSL) |
| **API Backend** | https://ims-backend-sec02.fly.dev | Online (HTTPS) |
| **Health check API** | https://ims-backend-sec02.fly.dev/health | `{"status":"ok"}` |
| **Database** | Supabase project `viguwtevkhfiszadpjvy` (PostgreSQL 16) | Online (private, TLS) |
| **Authentication** | JWT (HS256) do backend phát hành; Keycloak chuẩn bị cho IAM 3rd party | Prod: `BYPASS_AUTH=false` |
| **Region** | Singapore (`sin`) — Fly.io & Supabase | — |

## 3. Dịch vụ cloud đã đăng ký

| Dịch vụ | Mục đích | Plan | App/Project name |
|---------|----------|------|------------------|
| **Fly.io** | Host backend (Express container) | Shared-CPU 1x, 1GB RAM | `ims-backend-sec02` |
| **Vercel** | Host frontend (static CDN) | Hobby | `ims-frontend-sec02` |
| **Supabase** | Managed PostgreSQL 16 | Free tier | `viguwtevkhfiszadpjvy` |
| **GitHub** | Source control + CI/CD | Free (organization) | `Inventory-management-SEC/SEC_Team_02_2026` |

## 4. CI/CD — Continuous Deployment

Nhóm sử dụng **GitHub Actions** cho pipeline tự động. Mỗi lần merge vào `master` kích hoạt workflow tương ứng theo đường dẫn file thay đổi.

### 4.1. Backend Pipeline (`.github/workflows/deploy-backend.yml`)

**Trigger:** push `master` có thay đổi trong `02_Source/01_Source Code/backend/**`

**Các bước:**
1. Checkout source
2. Setup Node 22 (cache npm)
3. `npm ci` — cài dependencies
4. `npx tsc --noEmit` — type check
5. Setup `flyctl`
6. `flyctl deploy --remote-only -a ims-backend-sec02` — build Docker image trên Fly remote builder và release

**Secrets cần có:** `FLY_API_TOKEN`

### 4.2. Frontend Pipeline (`.github/workflows/deploy-frontend.yml`)

**Trigger:** push `master` có thay đổi trong `02_Source/01_Source Code/frontend/**`

**Các bước:**
1. Checkout source
2. Setup Node 22 (cache npm)
3. Cài `vercel` CLI global
4. `vercel pull` — lấy env production
5. `vercel build --prod` — build bundle
6. `vercel deploy --prebuilt --prod` — release

**Secrets cần có:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

### 4.3. Xem lịch sử chạy workflow
https://github.com/Inventory-management-SEC/SEC_Team_02_2026/actions

## 5. Hướng dẫn triển khai từ đầu

### 5.1. Triển khai Database (Supabase)

1. Tạo tài khoản tại https://app.supabase.com
2. Tạo project mới:
   - Name: `ims-production`
   - Region: `Singapore`
   - Password: lưu lại mật khẩu database
3. Lấy `Connection String` (URI format) tại **Settings → Database**
4. Apply schema — chạy file `02_Source/01_Source Code/db_schema/db-init.sql` vào Supabase SQL Editor

**Hoặc** chạy migration script từ Fly.io machine (khi DNS local không resolve được Supabase):
```bash
# 1. Viết migration script /tmp/migrate.js dùng process.env.DATABASE_URL
# 2. Upload lên Fly.io
echo "put /tmp/migrate.js /tmp/migrate.js" | flyctl sftp shell -a ims-backend-sec02
# 3. Chạy trên Fly.io machine
flyctl ssh console -a ims-backend-sec02 -C \
  "/bin/sh -c 'cp /tmp/migrate.js /app/migrate.js && cd /app && node migrate.js'"
```

### 5.2. Triển khai Backend (Fly.io)

**Bước 1 — Cài CLI:**
```bash
curl -L https://fly.io/install.sh | sh
flyctl auth login
```

**Bước 2 — Cấu hình app (đã có `fly.toml`):**
```toml
# 02_Source/01_Source Code/backend/fly.toml
app = 'ims-backend-sec02'
primary_region = 'sin'

[http_service]
  internal_port = 3000
  force_https = true

[[vm]]
  memory = '1gb'
  cpus = 1
```

**Bước 3 — Set secrets:**
```bash
flyctl secrets set \
  DATABASE_URL="postgresql://postgres:<password>@db.viguwtevkhfiszadpjvy.supabase.co:5432/postgres" \
  JWT_SECRET="<random-secret>" \
  BYPASS_AUTH=false \
  PORT=3000 \
  -a ims-backend-sec02
```

**Bước 4 — Deploy:**
```bash
cd "02_Source/01_Source Code/backend"
flyctl deploy --remote-only -a ims-backend-sec02
```

**Bước 5 — Verify:**
```bash
curl https://ims-backend-sec02.fly.dev/health
# {"status":"ok"}
```

### 5.3. Triển khai Frontend (Vercel)

**Bước 1 — Cài CLI:**
```bash
npm i -g vercel
vercel login
```

**Bước 2 — Link project:**
```bash
cd "02_Source/01_Source Code/frontend"
vercel link
```

**Bước 3 — Cấu hình env tại Vercel Dashboard:**
- `VITE_API_URL` = `""` (dùng relative `/api/` hoặc fallback `https://ims-backend-sec02.fly.dev`)

**Bước 4 — Deploy production:**
```bash
vercel --prod
```

**Bước 5 — Verify:**
```bash
curl -I https://ims-frontend-sec02.vercel.app
# HTTP/2 200
```

### 5.4. Thứ tự triển khai khi làm lại từ đầu
**Database schema → Backend → Frontend**

## 6. Cấu hình cung cấp tài nguyên (IaaC)

Dự án dùng các file declarative sau để cung cấp hạ tầng:

| File | Vị trí | Công nghệ | Vai trò |
|------|--------|-----------|---------|
| `fly.toml` | `02_Source/01_Source Code/backend/` | Fly.io | Cấu hình app backend (region, VM, http service) |
| `Dockerfile` | `02_Source/01_Source Code/backend/` | Docker | Build image backend Node 22 |
| `vercel.json` | `02_Source/01_Source Code/frontend/` | Vercel | Rewrite rules cho SPA routing |
| `docker-compose.prod.yml` | `02_Source/01_Source Code/` | Docker Compose | Triển khai self-hosted (tùy chọn) |
| `db-init.sql` | `02_Source/01_Source Code/db_schema/` | PostgreSQL | Tạo schema và bảng khởi tạo |

**Bản sao đầy đủ** các file IaaC được lưu tại `03_Deployment/01_Deployment_Package/` để tham khảo nhanh.

## 7. Continuous Delivery — Quy trình phát hành

```
Developer push/merge → master
       │
       ▼
GitHub Actions trigger (paths filter)
       │
       ├── backend thay đổi → Type check → Fly.io deploy → https://ims-backend-sec02.fly.dev
       │
       └── frontend thay đổi → Vercel build → Vercel deploy → https://ims-frontend-sec02.vercel.app
       │
       ▼
Smoke test thủ công: curl /health + truy cập UI
```

Tag release (tùy chọn):
```bash
git tag -a v1.0.0 -m "First production release"
git push origin v1.0.0
```

## 8. Monitoring & Logs

| Layer | Công cụ | Truy cập |
|-------|---------|----------|
| Backend logs | Fly.io logs | `flyctl logs -a ims-backend-sec02` |
| Backend metrics | Fly.io Grafana | https://fly-metrics.net |
| Frontend logs | Vercel Deployment logs | https://vercel.com/dashboard |
| Database | Supabase Dashboard (Logs + SQL Editor) | https://app.supabase.com/project/viguwtevkhfiszadpjvy |
| Application tracing | OpenTelemetry + stack Prometheus/Grafana/Loki/Tempo | `02_Source/01_Source Code/monitoring/` (self-hosted stack) |

## 9. Backup & Recovery

- **Database**: Supabase tự động backup hằng ngày (Free plan giữ 7 ngày). Có thể export thủ công tại **Database → Backups**.
- **Source code**: GitHub (có lịch sử toàn bộ commit + branches).
- **Rollback deploy:**
  - Backend: `flyctl releases -a ims-backend-sec02` + `flyctl deploy --image <previous>` hoặc `flyctl releases revert`
  - Frontend: Vercel Dashboard → Deployment → **Promote to Production** phiên bản cũ

## 10. Video hướng dẫn triển khai

> ⚠️ **[TODO] Cần quay và upload YouTube**
>
> **Nội dung cần có (theo yêu cầu syllabus):** biểu diễn cách triển khai hệ thống của nhóm — từ push code lên GitHub → GitHub Actions trigger → Fly.io deploy backend + Vercel deploy frontend → verify health endpoints.
>
> **YouTube link:** _(sẽ bổ sung)_
