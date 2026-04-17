# Deployment Package

Thư mục này chứa các file cấu hình và kịch bản triển khai (IaaC) để cài đặt và chạy hệ thống IMS trên môi trường production. Các file đều là bản sao từ source code chính để thuận tiện cho IT Administrator tham khảo nhanh mà không cần vào sâu source.

## Danh sách file

| File | Nguồn gốc trong source | Vai trò |
|------|------------------------|---------|
| `fly.toml` | `02_Source/01_Source Code/backend/fly.toml` | Cấu hình Fly.io app `ims-backend-sec02` (region Singapore, shared-CPU 1x, 1GB RAM, port 3000) |
| `Dockerfile.backend` | `02_Source/01_Source Code/backend/Dockerfile` | Build image backend (Node 22-slim) |
| `Dockerfile.frontend` | `02_Source/01_Source Code/frontend/Dockerfile` | Build image frontend (Vite → nginx) |
| `nginx.conf` | `02_Source/01_Source Code/frontend/nginx.conf` | Cấu hình nginx phục vụ SPA trong Docker image frontend |
| `vercel.json` | `02_Source/01_Source Code/frontend/vercel.json` | Rewrite rules cho SPA trên Vercel |
| `docker-compose.prod.yml` | `02_Source/01_Source Code/docker-compose.prod.yml` | Compose stack cho môi trường self-hosted (thay thế cho Fly.io + Vercel nếu cần) |
| `db-init.sql` | `02_Source/01_Source Code/db_schema/db-init.sql` | Schema PostgreSQL khởi tạo (tables, indexes, constraints) |
| `deploy-backend.yml` | `.github/workflows/deploy-backend.yml` | GitHub Actions workflow auto-deploy backend |
| `deploy-frontend.yml` | `.github/workflows/deploy-frontend.yml` | GitHub Actions workflow auto-deploy frontend |

## Cách dùng

1. Xem hướng dẫn chi tiết tại `../02_Deployment Guide.md`
2. Các file trong thư mục này là **snapshot**; source chính vẫn ở `02_Source/01_Source Code/`. Khi có thay đổi cấu hình, cập nhật cả 2 nơi.

## Secrets / biến môi trường cần set (không lưu trong file)

**Fly.io** (`flyctl secrets set ... -a ims-backend-sec02`):
- `DATABASE_URL`
- `JWT_SECRET`
- `BYPASS_AUTH=false`
- `PORT=3000`

**Vercel** (Dashboard → Settings → Environment Variables):
- `VITE_API_URL` (có thể để rỗng)

**GitHub Actions** (Repo Settings → Secrets):
- `FLY_API_TOKEN`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
