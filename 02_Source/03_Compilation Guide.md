# Compilation Guide

Tài liệu hướng dẫn **một nhà phát triển (Developer)** cài đặt môi trường, biên dịch mã nguồn, chỉnh sửa thông tin cấu hình và chạy hệ thống Inventory Management System (IMS) trên một máy tính vừa cài đặt xong hệ điều hành.

## 1. Yêu cầu tiên quyết (Prerequisites)

### 1.1. Hệ điều hành
- macOS 12+ / Ubuntu 20.04+ / Windows 10+ (với WSL2 khuyến nghị)

### 1.2. Phần mềm cần cài

| Công cụ | Phiên bản | Dùng cho |
|---------|-----------|----------|
| Git | 2.30+ | Clone source control |
| Node.js | 22 LTS | Backend + Frontend |
| npm | 10+ (đi kèm Node) | Package manager |
| Python | 3.11+ | AI Service |
| Docker Desktop | 4.20+ | Chạy PostgreSQL / Redis / Elasticsearch / Keycloak |
| Docker Compose | v2 (plugin Docker Desktop) | Orchestrate stack |

### 1.3. Tài khoản cần có
- Tài khoản GitHub (để clone repo)
- Tài khoản Fly.io (không bắt buộc cho dev cục bộ, chỉ cần khi deploy)
- Tài khoản Vercel (tùy chọn, chỉ cần khi deploy frontend)

## 2. Hướng dẫn cài đặt và biên dịch

### Bước 1: Clone source code

```bash
git clone https://github.com/Inventory-management-SEC/SEC_Team_02_2026.git
cd SEC_Team_02_2026
```

### Bước 2: Khởi động các dịch vụ phụ trợ (PostgreSQL + Redis + Elasticsearch + Keycloak)

```bash
cd "02_Source/01_Source Code"
docker compose up -d postgres redis elasticsearch keycloak
```

Chờ PostgreSQL sẵn sàng:
```bash
docker exec ims-postgres pg_isready -U myuser
```

### Bước 3: Cài đặt và chạy Backend

```bash
cd "02_Source/01_Source Code/backend"
npm install
cp .env.example .env    # Chỉnh sửa nếu cần — xem mục 3 bên dưới
npm run dev             # Khởi động dev server tại http://localhost:3000
```

Kiểm tra backend đã chạy:
```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

### Bước 4: Cài đặt và chạy Frontend

Mở terminal thứ 2:

```bash
cd "02_Source/01_Source Code/frontend"
npm install
npm run dev             # Khởi động Vite dev server tại http://localhost:5173
```

Truy cập: http://localhost:5173

### Bước 5 (tùy chọn): Cài đặt và chạy AI Service

```bash
cd "02_Source/01_Source Code/ai-service"
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Bước 6 (tùy chọn): Chạy toàn bộ stack bằng Docker Compose

Thay vì chạy tay từng service:

```bash
cd "02_Source/01_Source Code"
docker compose up -d
```

Lệnh này khởi động: PostgreSQL, Redis, Elasticsearch, Keycloak, AI Service, Backend, Frontend.

## 3. Hướng dẫn chỉnh sửa cấu hình

### 3.1. Backend `.env`

Copy file mẫu:
```bash
cp "02_Source/01_Source Code/backend/.env.example" \
   "02_Source/01_Source Code/backend/.env"
```

Các biến chính:

| Biến | Giá trị mặc định (dev) | Mô tả |
|------|-----------------------|-------|
| `PORT` | `3000` | Cổng HTTP của backend |
| `DATABASE_URL` | `postgresql://myuser:mypassword@localhost:5432/mydatabase` | Kết nối PostgreSQL |
| `REDIS_URL` | `redis://:redispassword@localhost:6379` | Redis cache (tùy chọn) |
| `ELASTICSEARCH_URL` | `http://localhost:9200` | Elasticsearch (tùy chọn) |
| `JWT_SECRET` | `changeme-in-production` | Secret để ký JWT |
| `BYPASS_AUTH` | `true` (dev) / `false` (prod) | Bỏ qua auth cho dev |

### 3.2. Frontend `.env`

```bash
cp "02_Source/01_Source Code/frontend/.env.example" \
   "02_Source/01_Source Code/frontend/.env"
```

| Biến | Giá trị mặc định (dev) | Mô tả |
|------|-----------------------|-------|
| `VITE_API_URL` | `http://localhost:3000` | URL backend |
| `VITE_KEYCLOAK_URL` | `http://localhost:8080` | URL Keycloak (tùy chọn) |

### 3.3. Database init

Schema tự động được load khi PostgreSQL container khởi động lần đầu từ file `db_schema/db-init.sql`. Nếu cần re-init:

```bash
docker compose down -v      # Xoá volume
docker compose up -d postgres
```

## 4. Thực thi scripts hỗ trợ

### 4.1. Chạy test

```bash
cd "02_Source/01_Source Code/backend"

npm test                      # Toàn bộ unit test
npm run test:coverage         # Kèm báo cáo coverage (tạo thư mục coverage/)
npm run test:db-integration   # Integration test với PostgreSQL thật
npm run test:api-integration  # End-to-end API test (warehouse lifecycle)
```

### 4.2. Type check

```bash
# Backend
cd "02_Source/01_Source Code/backend" && npx tsc --noEmit

# Frontend
cd "02_Source/01_Source Code/frontend" && npm run build
```

### 4.3. Lint (Frontend)

```bash
cd "02_Source/01_Source Code/frontend"
npm run lint
```

### 4.4. Build production

```bash
# Backend: compile TS → dist/
cd "02_Source/01_Source Code/backend"
npm run build && npm start

# Frontend: static bundle → dist/
cd "02_Source/01_Source Code/frontend"
npm run build && npm run preview
```

## 5. Video hướng dẫn cài đặt

> ⚠️ **[TODO] Cần quay và upload YouTube**
>
> **Nội dung cần có (theo yêu cầu syllabus):** quá trình cài đặt môi trường, biên dịch, cấu hình và chạy mã nguồn trên máy một nhà phát triển.
>
> **YouTube link:** _(sẽ bổ sung)_

## 6. Hệ thống Source Control

**Link repository:** https://github.com/Inventory-management-SEC/SEC_Team_02_2026

Hệ thống: **GitHub** (organization: `Inventory-management-SEC`)

Tính năng GitHub được nhóm sử dụng:
- **Source code hosting** — toàn bộ mã nguồn dự án
- **Pull Requests** — code review và merge workflow
- **Issues** — hệ thống quản lý lỗi (bug tracking)
- **Projects** — hệ thống quản lý dự án (kanban board, sprint tracking)
- **Actions** — CI/CD pipeline tự động

### Ảnh chụp mời giảng viên làm admin trong hệ thống quản lý mã nguồn của nhóm

![Ảnh chụp mời giảng viên làm admin trong hệ thống quản lý mã nguồn của nhóm.](assets/001.png)

## 7. Hệ thống Build và Tích hợp tự động (CI/CD)

Dự án dùng **GitHub Actions** làm hệ thống CI/CD.

**Workflows hiện có:**

| Workflow | File | Trigger | Nhiệm vụ |
|----------|------|---------|----------|
| Deploy Backend | `.github/workflows/deploy-backend.yml` | Push `master` + thay đổi trong `backend/**` | Type-check → Deploy lên Fly.io (`ims-backend-sec02`) |
| Deploy Frontend | `.github/workflows/deploy-frontend.yml` | Push `master` + thay đổi trong `frontend/**` | Build qua Vercel CLI → Deploy lên Vercel (`ims-frontend-sec02`) |

**Secrets cấu hình tại GitHub Actions:**
- `FLY_API_TOKEN` — token deploy lên Fly.io
- `VERCEL_TOKEN` — token deploy lên Vercel
- `VERCEL_ORG_ID` — ID organization Vercel
- `VERCEL_PROJECT_ID` — ID project Vercel

**Xem lịch sử chạy workflow:**
https://github.com/Inventory-management-SEC/SEC_Team_02_2026/actions

### Ảnh chụp lịch sử thực thi workflow

>![Ảnh chụp lịch sử thực thi workflow.](assets/002.png)

> **Ghi chú:** Vì GitHub Actions gắn với repo, nên invite ở mục `Collaborators` (mục 6) đã bao gồm quyền xem Actions.
