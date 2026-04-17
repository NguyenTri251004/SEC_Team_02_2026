# Inventory Management System (IMS)

Đồ án môn **SEC (Software Enterprise Construction)** — xây dựng hệ thống quản lý kho hàng (Inventory Management System) cho ngành dược phẩm / sản xuất, hỗ trợ quản lý nguyên vật liệu, vòng đời lô hàng, kiểm soát chất lượng (QC), sản xuất batch và in tem nhãn truy xuất nguồn gốc.

## Thông tin môn học

- **Môn học:** Software Engineering Capstone
- **Giảng viên:** Ngô Huy Biên
- **Nhóm:** SEC Team 02 — 2026
- **Tham chiếu yêu cầu đồ án:** https://nhbien.github.io/enterprise-project-artifacts/

> ⚠️ **[TODO]** Bổ sung **học kỳ / năm học** cụ thể (ví dụ: HK2 / 2025-2026).

## Thành viên nhóm

| STT | MSSV     | Họ và Tên               | Vai trò     |
|-----|----------|-------------------------|-------------|
| 1   | 21127173 | Nguyễn Thiên Thọ        | Leader      |
| 2   | 22127424 | Nguyễn Phước Minh Trí   | Thành viên  |
| 3   | 22127316 | Nguyễn Ngô Ngọc Như     | Thành viên  |
| 4   | 22127176 | Huỳnh Nguyễn Minh Khang | Thành viên  |
| 5   | 22127074 | Võ Hoàng Đức            | Thành viên  |
| 6   | 18127008 | Lê Mạnh Hoàng           | Thành viên  |

## Link truy cập nhanh

| Thành phần | URL |
|------------|-----|
| **Repository** | https://github.com/Inventory-management-SEC/SEC_Team_02_2026 |
| **Frontend (production)** | https://ims-frontend-sec02.vercel.app |
| **Backend API (production)** | https://ims-backend-sec02.fly.dev |
| **Backend health check** | https://ims-backend-sec02.fly.dev/health |
| **GitHub Issues** | https://github.com/Inventory-management-SEC/SEC_Team_02_2026/issues |
| **GitHub Projects** | https://github.com/orgs/Inventory-management-SEC/projects |
| **CI/CD** | https://github.com/Inventory-management-SEC/SEC_Team_02_2026/actions |

## Chức năng chính

- **Quản lý Nguyên vật liệu (Material Catalog)** — danh mục, phiên bản, thông tin tuân thủ
- **Quản lý Lô hàng (Lot Tracking)** — vòng đời: Quarantine → Accepted/Rejected → Depleted
- **Kiểm soát Chất lượng (QC)** — quy trình kiểm định, phê duyệt, cách ly lô
- **Sản xuất (Production Batch)** — tạo batch, tiêu thụ nguyên liệu, traceability
- **Tem nhãn (Labeling)** — Barcode + QR Code + PDF export
- **Báo cáo & Audit Trail** — Inventory / Transactions / Audit reports
- **Dashboard theo vai trò** — 5 role: Admin / Inventory Manager / QC / Production / Viewer

## Công nghệ sử dụng

| Layer | Tech Stack |
|-------|------------|
| Frontend | React 19 · Vite 7 · TypeScript 5.9 · Ant Design 6 · Tailwind CSS 4 · TanStack React Query · Zustand · React Router 7 |
| Backend | Node.js 22 · Express 4 · TypeScript 5.1 · pg · Redis · Elasticsearch 8 · JWT |
| AI Service | Python 3.11 · FastAPI · Redis (async) · Elasticsearch (async) |
| Database | PostgreSQL 16 (Supabase prod) |
| Identity | Keycloak 23 |
| Infrastructure | Docker Compose · Fly.io (backend) · Vercel (frontend) · Supabase (DB) · GitHub Actions (CI/CD) |

## Cài đặt và chạy

### Chạy nhanh với Docker Compose

```bash
git clone https://github.com/Inventory-management-SEC/SEC_Team_02_2026.git
cd SEC_Team_02_2026/02_Source/01_Source\ Code/
docker compose up -d
```

Truy cập:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### Chạy từng service (dev mode)

Chi tiết xem `02_Source/03_Compilation Guide.md`.

```bash
# Terminal 1 — DB + services phụ trợ
cd 02_Source/01_Source\ Code && docker compose up -d postgres redis elasticsearch keycloak

# Terminal 2 — Backend
cd 02_Source/01_Source\ Code/backend && npm install && npm run dev

# Terminal 3 — Frontend
cd 02_Source/01_Source\ Code/frontend && npm install && npm run dev
```

## Cấu trúc repository

```
SEC_Team_02_2026/
├── 01_Documents/                   # Tài liệu dự án (PRD, Domain Model, Architecture, PoC, ...)
│   ├── 01_Product Requirements Document.md
│   ├── 02_Domain Model.md
│   ├── 03_Prototype.md
│   ├── 04_Product Backlog.md
│   ├── 05_Architecture.md
│   ├── 06_Proof of Concept.md
│   ├── 07_Coding Standards.md
│   ├── 08_Project Management.md
│   └── 09_System Evaluation and Validation.md
├── 02_Source/
│   ├── 01_Source Code/             # Mã nguồn
│   │   ├── backend/                # Express + TypeScript API
│   │   ├── frontend/               # React + Vite SPA
│   │   ├── ai-service/             # FastAPI AI analytics
│   │   ├── db_schema/              # PostgreSQL init SQL
│   │   ├── monitoring/             # Prometheus scrape config (observability stack, planned)
│   │   ├── keycloak/               # Keycloak realm config
│   │   └── docker-compose.yml      # Full-stack orchestration
│   ├── 02_Raw Data/                # Dữ liệu gốc
│   └── 03_Compilation Guide.md     # Hướng dẫn build cho developer
├── 03_Deployment/
│   ├── 01_Deployment_Package/      # IaaC files (fly.toml, Dockerfile, vercel.json, ...)
│   ├── 02_Deployment Guide.md      # Hướng dẫn triển khai cho IT admin
│   └── 03_User Guide.md            # Hướng dẫn sử dụng cho end user
├── .github/workflows/              # GitHub Actions CI/CD
│   ├── deploy-backend.yml
│   └── deploy-frontend.yml
├── CLAUDE.md                       # Project context cho AI assistant
└── README.md                       # File này
```

## License

Dự án được phát triển cho mục đích học tập (đồ án môn SEC).
