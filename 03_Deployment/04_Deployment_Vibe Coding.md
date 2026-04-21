# 04_Deployment_Vibe Coding

Tài liệu ghi lại **quá trình vibe coding** đã dẫn tới nội dung trong `03_Deployment/` — bao gồm `01_Deployment_Package/` (IaaC files), `02_Deployment Guide.md`, `03_User Guide.md` — và GitHub Actions CI/CD pipeline.

## 0. Công cụ AI và công cụ deploy đã sử dụng

| Công cụ | Loại | Vai trò |
|---------|------|---------|
| **Claude (Anthropic) — Claude Opus 4.x qua Claude Code CLI** | AI | Soạn guide, viết workflow, debug deploy, chạy migration |
| **Fly.io CLI (`flyctl`)** | Deploy tool | Deploy backend `ims-backend-sec02`, quản lý secrets |
| **Vercel CLI** | Deploy tool | Deploy frontend `ims-frontend-sec02` |
| **Supabase Dashboard + SQL Editor** | DB | Apply schema, manage backup |
| **Cloud-IAM (lemur-6) admin console** | Keycloak | Cấu hình realm production |
| **GitHub Actions** | CI/CD | Auto deploy khi push master |
| **Docker Desktop** | Container runtime | Build image cục bộ |

---

## 1. GitHub Actions CI/CD

### 1.1. Vòng prompt 1 — workflow deploy-backend

**Prompt gốc:**
> "Viết GitHub Actions workflow `deploy-backend.yml` trigger khi push master có thay đổi trong `02_Source/01_Source Code/backend/**`. Các step:
> 1. Checkout
> 2. Setup Node 22 kèm cache npm
> 3. Install deps `npm ci`
> 4. Type check `npx tsc --noEmit` — fail nếu lỗi (block deploy)
> 5. Setup flyctl
> 6. Deploy `flyctl deploy --remote-only -a ims-backend-sec02`
> Dùng secret `FLY_API_TOKEN`."

**Output:** workflow ~40 dòng.

**Vấn đề:** workflow chạy **mọi** commit vào master kể cả khi chỉ sửa docs → tốn resource deploy.

**Prompt fix:**
> "Thêm path filter để chỉ trigger khi file trong `02_Source/01_Source Code/backend/**` thay đổi. Dùng `on.push.paths`."

**Output:** `paths: ['02_Source/01_Source Code/backend/**']`. Deploy chỉ chạy khi thực sự thay đổi backend.

**Kết quả:** `.github/workflows/deploy-backend.yml`.

### 1.2. Vòng prompt 2 — workflow deploy-frontend

**Prompt:**
> "Viết `deploy-frontend.yml` deploy Vercel, trigger khi frontend thay đổi:
> 1. Checkout
> 2. Setup Node 22
> 3. Install Vercel CLI global
> 4. `vercel pull --environment=production --token=$VERCEL_TOKEN`
> 5. `vercel build --prod`
> 6. `vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN`
> Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`."

**Output:** workflow chạy được ngay lần đầu.

**Kết quả:** `.github/workflows/deploy-frontend.yml`.

---

## 2. Fly.io Backend Deploy

### 2.1. Vòng prompt — fly.toml

**Prompt:**
> "Viết `fly.toml` cho `ims-backend-sec02`:
> - Primary region Singapore (`sin`)
> - Internal port 3000
> - Force HTTPS
> - Auto-stop khi idle (`auto_stop_machines = 'stop'`, `min_machines_running = 0`)
> - VM: shared-CPU-1x 1GB RAM (free tier)
> - Health check `/health` mỗi 30s timeout 5s
> - Env: `PORT=3000`, `NODE_ENV=production`"

**Output:** `fly.toml` chuẩn.

**Kết quả:** `02_Source/01_Source Code/backend/fly.toml` + mirror `03_Deployment/01_Deployment_Package/fly.toml`.

### 2.2. Vòng prompt — Dockerfile multi-stage

**Prompt:**
> "Viết backend Dockerfile multi-stage Node 22-slim:
> - Stage `build`: COPY package*.json → `npm ci` → COPY src → `npx tsc` (output `dist/`)
> - Stage `runtime`: COPY từ build stage `dist/` và `node_modules` (re-install `npm ci --omit=dev` để bỏ dev deps)
> - EXPOSE 3000
> - USER non-root (`node` user của image)
> - HEALTHCHECK `curl -f http://localhost:3000/health`
> - CMD `['node', 'dist/server.js']`"

**Output:** Dockerfile chạy được.

**Vấn đề sau khi deploy:** image size 450MB — quá lớn vì COPY cả `src/` vào runtime stage.

**Prompt fix:**
> "Stage runtime không cần `src/` hoặc `tsconfig.json` — chỉ cần `dist/` và `package.json` + `node_modules` prod. Bỏ COPY thừa. Target image < 250MB."

**Output:** image xuống ~180MB. Deploy nhanh hơn.

**Kết quả:** `backend/Dockerfile`.

---

## 3. Supabase Database

### 3.1. Vấn đề DNS local

Khi chạy migration local, máy không resolve được `db.viguwtevkhfiszadpjvy.supabase.co` (ISP chặn hoặc IPv6-only DNS issue). Migration fail ngay từ `pg.connect`.

### 3.2. Vòng prompt — workaround qua Fly.io machine

**Prompt:**
> "Máy local không resolve DNS `db.*.supabase.co` (có thể ISP chặn). Nhưng Fly.io Singapore machine resolve được (cùng region). Viết:
> - Script `migrate.js` dùng `pg` client, đọc `process.env.DATABASE_URL` (đã set trên Fly.io secrets), `ssl: { rejectUnauthorized: false }`
> - Hướng dẫn upload script qua `flyctl sftp shell` và chạy qua `flyctl ssh console`
> - Lưu ý: `sftp put` vào `/tmp/` rồi `cp` vào `/app/` để `pg` module accessible"

**Output:** script + hướng dẫn step-by-step.

**Kết quả:** migration chạy thành công qua Fly.io machine. Pattern này được ghi vào CLAUDE.md mục "Deploy Database Schema" để tái sử dụng.

---

## 4. Keycloak Production

### 4.1. Vòng prompt — deploy realm lên Cloud-IAM

**Prompt:**
> "Production IAM dùng Cloud-IAM (tier free, URL `https://lemur-6.cloud-iam.com/auth`). Realm local `inventory-realm.json` đã có 5 user + 2 client. Cách import realm lên Cloud-IAM:
> 1. Login Cloud-IAM admin console
> 2. Import realm JSON
> 3. Verify 5 user login được qua endpoint `https://lemur-6.cloud-iam.com/auth/realms/inventory-management/protocol/openid-connect/token`
> Viết hướng dẫn step-by-step."

**Output:** guide cụ thể.

**Vấn đề khi test:** 4/5 account login OK, **account `admin` fail** với `Invalid user credentials` — password không import đúng.

**Prompt fix:**
> "Password của `admin` user không đúng sau import. Cloud-IAM có giới hạn nào về password complexity khi import? Hướng dẫn reset password qua admin console: Users → admin → Credentials → Reset password → set `admin123`, bỏ flag Temporary."

**Output:** guide reset password. Áp dụng được — account admin login OK sau khi reset.

**Kết quả:** section "Tài khoản demo" trong `03_User Guide.md` với note về reset password.

---

## 5. Deployment Guide

### 5.1. Vòng prompt — structure guide

**Prompt:**
> "Viết `02_Deployment Guide.md` cho IT Administrator. Cấu trúc:
> 1. Kiến trúc triển khai — ASCII diagram Fly.io + Vercel + Supabase + Cloud-IAM
> 2. Kết quả triển khai — 4 bảng URL + trạng thái (frontend, backend, DB, Keycloak)
> 3. Dịch vụ cloud đã đăng ký — tài khoản, region, tier
> 4. CI/CD pipeline — chi tiết từng step workflow
> 5. Hướng dẫn deploy từ scratch — thứ tự: DB schema → backend → frontend
> 6. IaaC file mapping — file nào deploy cái gì
> 7. Monitoring & logs — cách xem Fly.io logs, Vercel logs, Supabase dashboard
> 8. Backup & recovery — Supabase snapshot, Fly.io rollback"

**Output:** guide ~300 dòng. Đủ cho IT Admin deploy từ 0.

**Kết quả:** `03_Deployment/02_Deployment Guide.md`.

### 5.2. Vòng prompt — verify guide chạy được

**Prompt:**
> "Giả sử tôi là IT Admin mới, làm theo Deployment Guide từ đầu, có step nào unclear hoặc thiếu thông tin không? Flag cụ thể:
> - Step nào cần tài khoản cloud trước khi chạy mà guide không đề cập?
> - Command nào có placeholder mà không giải thích cách lấy?
> - Thứ tự deploy có dependency nào bị bỏ?
> Xuất list issue."

**Output:** 4 issue phát hiện:
1. Bước setup Fly.io cần `flyctl auth login` interactive — guide thiếu
2. Supabase `DATABASE_URL` lấy từ đâu trong dashboard — guide thiếu
3. Vercel `ORG_ID` và `PROJECT_ID` lấy thế nào — guide thiếu
4. Thứ tự: deploy backend trước khi schema có thể chưa ready — cần emphasize DB trước

**Kết quả:** fix 4 issue trong guide. Sau fix, Leader thử deploy từ scratch trên máy mới → chạy được end-to-end.

---

## 6. User Guide

### 6.1. Vòng prompt — viết cho end user

**Prompt:**
> "Viết `03_User Guide.md` cho end user hệ thống IMS (nhân viên kho dược, không phải developer). Bao gồm:
> - Cách truy cập (URL production https://ims-frontend-sec02.vercel.app)
> - 5 role + quyền mỗi role (Admin, Inventory Manager, QC, Production, Viewer)
> - 5 tài khoản demo với username/password cho giảng viên test
> - Hướng dẫn từng luồng nghiệp vụ chính: đăng nhập, Material, Lot, QC, Production, Label, Reports
> - Dashboard theo role
> Tiếng Việt trang trọng, ngôn ngữ phù hợp nhân viên kho (không jargon developer)."

**Output:** guide đầy đủ. Section tài khoản demo để trống password — cần điền từ `inventory-realm.json`.

**Prompt fill-in:**
> "Đọc `02_Source/01_Source Code/keycloak/inventory-realm.json`, trích 5 user: admin/admin123, inv_manager/manager123, qc_user/qc123, prod_user/prod123, viewer/viewer123. Cập nhật bảng trong User Guide. Ghi status test trên production (admin cần reset password, 4 cái kia login OK)."

**Output:** bảng 5 tài khoản demo hoàn chỉnh.

**Kết quả:** `03_Deployment/03_User Guide.md` section "2. Tài khoản đăng nhập".

---

## 7. Deployment Package (IaaC)

### 7.1. Vòng prompt — gom IaaC file

**Prompt:**
> "Thư mục `03_Deployment/01_Deployment_Package/` phải chứa toàn bộ file cần thiết để 1 IT admin deploy từ 0, không phải đọc cả repo source. Copy 9 file IaaC sau vào package + viết `README.md` mô tả từng file:
> 1. `docker-compose.yml` (full stack local)
> 2. `docker-compose.prod.yml` (production stack)
> 3. `fly.toml` (backend Fly.io config)
> 4. `Dockerfile` (backend runtime image)
> 5. `vercel.json` (frontend Vercel config)
> 6. `db-init.sql` (PostgreSQL schema + seed)
> 7. `inventory-realm.json` (Keycloak realm + users)
> 8. `.env.example` backend
> 9. `.env.example` frontend
> README giải thích mỗi file deploy service nào, thứ tự apply."

**Output:** 9 file copy + README 60 dòng. Package self-contained.

**Kết quả:** `03_Deployment/01_Deployment_Package/` có đầy đủ 10 file (9 IaaC + README).

---

## 8. Phương pháp review của con người

1. **Smoke test sau mỗi deploy** — `curl https://ims-backend-sec02.fly.dev/health` phải trả `{"status":"ok"}`, Vercel URL phải HTTP 200. Không claim "deploy thành công" nếu không chạy smoke test.
2. **Deployment Guide verify bằng làm theo** — Leader thử deploy máy mới từ scratch theo guide; step nào fail hoặc unclear thì sửa guide, không nói "thiếu kinh nghiệm" của tester.
3. **Rollback plan test ít nhất 1 lần** — `flyctl releases revert` trên staging để đảm bảo rollback thực sự chạy
4. **Secret management nghiêm** — tuyệt đối không commit secret vào repo. Dùng `flyctl secrets set` và Vercel env dashboard. Check bằng `git log -p | grep -i 'api_key\|secret\|password'` trước mỗi push.
5. **Verify IaaC snapshot sync** — khi thay đổi `fly.toml` hoặc `Dockerfile` trong source, phải sync sang `01_Deployment_Package/` cùng commit; tránh drift.
6. **User Guide verify bởi non-developer** — thành viên không làm feature đó đọc User Guide và thử làm theo; nếu bước nào không hiểu thì sửa guide (ngôn ngữ, thứ tự, screenshot).
7. **Production password rotate** — dev plaintext trong `inventory-realm.json` chỉ để demo/đồ án; production lemur-6 phải reset password thủ công qua admin console (không import password plaintext).
