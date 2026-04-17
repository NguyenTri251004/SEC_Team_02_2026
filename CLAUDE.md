# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Inventory Management System (IMS) for pharmaceutical/manufacturing warehouse operations. University team project (Vietnamese). The system manages materials, inventory lots, transactions (receipts/usage), quality control testing, production batches, and label templates with role-based dashboards.

## Repository Layout

```
01_Documents/          # Requirements, architecture, domain model, backlog (Vietnamese)
02_Source/
  01_Source Code/      # All application code lives here
    backend/           # Express.js + TypeScript API server
    frontend/          # React 19 + Vite + TypeScript SPA
    ai-service/        # FastAPI (Python) AI analytics service (placeholder endpoints)
    db_schema/         # PostgreSQL init SQL + standalone Docker Compose
    reporting/         # Placeholder for reporting module
    docker-compose.yml # Full-stack Docker Compose (all services)
  02_Raw Data/         # Sample/seed data
  03_Compilation Guide.md  # Developer setup guide
03_Deployment/         # Deployment package, deployment guide, user guide
```

## Development Commands

All commands run from `02_Source/01_Source Code/`.

### Backend (`backend/`)
```bash
npm install              # install deps
npm run dev              # start dev server (ts-node) on :3000
npm run build            # compile TypeScript to dist/
npm start                # run compiled JS from dist/
npm run watch            # tsc --watch
npm test                 # run all Jest tests
npm run test:watch       # Jest in watch mode
npm run test:coverage    # Jest with coverage report
npx jest path/to/test.ts # run a single test file
```

### Frontend (`frontend/`)
```bash
npm install          # install deps
npm run dev          # Vite dev server on :5173
npm run build        # tsc -b && vite build
npm run lint         # ESLint (flat config, typescript-eslint + react-hooks + react-refresh)
npm run preview      # preview production build
```

### AI Service (`ai-service/`)
```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Docker (full stack from `02_Source/01_Source Code/`)
```bash
docker-compose up -d          # start all: postgres, redis, elasticsearch, keycloak, ai-service, backend, frontend
docker-compose down -v        # tear down including volumes
```

### Database only (`db_schema/`)
```bash
docker-compose up -d          # PostgreSQL 16 on :5432 (myuser/mypassword/mydatabase)
psql -U myuser -h localhost -d mydatabase -f db-init.sql   # init schema
```

## Architecture

### Tech Stack
- **Frontend:** React 19, Vite 7, TypeScript 5.9, Ant Design 6 (antd), Tailwind CSS 4, React Router 7, TanStack React Query, Zustand (UI state), Axios, Recharts, keycloak-js
- **Backend:** Node.js, Express 4, TypeScript 5, pg (node-postgres), Redis, Elasticsearch 8, jsonwebtoken
- **AI Service:** Python, FastAPI, Redis (async), Elasticsearch (async), Pydantic
- **Database:** PostgreSQL 16
- **Auth:** Keycloak 23 (with `BYPASS_KEYCLOAK = true` flag in `AuthProvider.tsx` for demo/dev mode)
- **Infrastructure:** Docker Compose with health checks

### Backend Structure (`backend/src/`)
Modular organization: each domain module has `*.routes.ts`, `*.service.ts`, `*.types.ts` and a `__tests__/` subdirectory.
- `modules/admin/` - Admin user management and system stats (`/api/admin`)
- `modules/auth/` - Auth routes (`/api/auth`)
- `modules/dashboard/` - Aggregated dashboard data per role (`/api/dashboard`)
- `modules/labels/` - Label template CRUD + barcode/QR generation via bwip-js and qrcode (`/api/labels`)
- `modules/lots/` - Inventory lot lifecycle (Quarantine → Accepted/Rejected) (`/api/lots`)
- `modules/materials/` - Materials catalog CRUD (`/api/materials`)
- `modules/production/` - Production batches and component consumption (`/api/production`)
- `modules/qc/` - QC tests, QC queue, lot approve/reject (`/api/qc`)
- `modules/reports/` - Inventory, transaction and audit reports (`/api/reports`)
- `modules/search/` - Elasticsearch full-text search (`/api/search`)
- `modules/transactions/` - Inventory transactions (IN/OUT) (`/api/transactions`)
- `modules/__tests__/` - Cross-module integration tests (warehouse-lifecycle, business-flows)
- `security/auth.ts` - JWT authentication middleware
- `security/rbac.ts` - Role-based access control (PERMISSIONS matrix mapping resource+action → allowed roles)
- `shared/db/pool.ts` - PostgreSQL connection pool (supports `DATABASE_URL` or individual `DB_*` env vars)
- `shared/cache/redis.ts` - Redis client (optional, app runs without it)
- `shared/elasticsearch/client.ts` - Elasticsearch client (optional)

### Frontend Structure (`frontend/src/`)
- `auth/` - Keycloak integration + AuthProvider context (demo mode with role switcher via `BYPASS_KEYCLOAK`)
- `components/layout/AppLayout.tsx` - Main layout with sidebar navigation
- `components/dashboard/` - Reusable dashboard widgets (KpiCard, ChartCard, AlertPanel, DataTableCard)
- `components/common/tables/columnFactories.tsx` - Shared TanStack React Table column factories
- `pages/dashboard/` - Role-based dashboards: Admin, InventoryManager, QualityControl, Production
- `pages/` - Full pages: batches, labels, lots, materials, qc, reports, transactions, users
- `services/api.ts` - Axios API client with Keycloak token interceptor (auto-refresh on 401), organized by domain
- `types/index.ts` - All TypeScript interfaces and API response types
- `constants/roles.ts` - Role definitions and display config
- `constants/theme.ts` - Ant Design theme configuration
- `hooks/` - React Query hooks per domain: `useDashboardData`, `useMaterialsData`, `useTransactionsData`, `useLotsData`, `useQCData`, `useBatchesData`, `useLabelsData`, `useReportsData`, `useUsersData`
- `lib/utils.ts` - General utility functions
- `lib/exportUtils.ts` - PDF export helpers (jsPDF + jspdf-autotable)
- `stores/uiStore.ts` - Zustand store for UI state (sidebar)
- `router/index.tsx` - Route definitions

Additional frontend dependencies: TanStack React Table (data grids), dayjs (date handling), lucide-react (icons), jsPDF (PDF export).

Path alias: `@/*` maps to `src/*` (configured in vite.config.ts and tsconfig.json).

### User Roles
`admin`, `inventory_manager`, `quality_control`, `production`, `viewer` - each role gets a different dashboard view.

### Database Schema (db-init.sql)
Implemented tables: `users`, `materials`, `inventory_lots`, `inventory_transactions`, `qc_tests`, `production_batches`, `batch_components`, `label_templates`.

**Lot status workflow (core business rule):** `Quarantine` (on receipt) → `Accepted` (after QC approval) or `Rejected`. A lot must be `Accepted` before it can be added to a production batch. A batch must be `In Progress` before material can be consumed. Consuming material atomically updates `batch_components.actual_quantity`, decrements `inventory_lots.quantity` (possibly marking lot as `Depleted`), and inserts an `inventory_transactions` record.

## Coding Conventions

- **Variables/Functions:** camelCase
- **Classes/Components:** PascalCase
- **Constants:** UPPER_SNAKE_CASE
- **File names:** kebab-case for TS/JS utilities, PascalCase for React components
- **Frontend imports:** Use `@/` path alias for src-relative imports
- **Backend modules:** Follow the `module-name.routes.ts` / `module-name.service.ts` / `module-name.types.ts` pattern
- **API responses:** Use `ApiResponse<T>` for single items, `PaginatedResponse<T>` for lists
- **Commit messages:** Conventional Commits style (feat:, fix:, refactor:, etc.)

## Key Environment Variables

Backend (`.env` in `backend/`): `DATABASE_URL` or `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`, `PORT`, `REDIS_URL`, `ELASTICSEARCH_URL`, `JWT_SECRET`, `BYPASS_AUTH`

Frontend (`.env` in `frontend/`): `VITE_API_URL`, `VITE_KEYCLOAK_URL`

## Default Ports
- Frontend: 5173
- Backend: 3000
- PostgreSQL: 5432
- Redis: 6379
- Elasticsearch: 9200
- Keycloak: 8080
- AI Service: 8000

## Run Project

When user says "Run Project", execute the following steps automatically and fix any errors encountered:

1. **Start Docker Desktop** (if not running): `open -a Docker`, wait for daemon ready
2. **Start Database**: `cd db_schema/ && docker-compose up -d`, handle container name conflicts by removing old containers
3. **Wait for PostgreSQL**: poll `docker exec ims-postgres pg_isready -U myuser` until ready
4. **Install deps if needed**: check `node_modules/` exists in both `backend/` and `frontend/`, run `npm install` if missing
5. **Start Backend**: `cd backend/ && npm run dev` (run in background). Redis and Elasticsearch are optional — if they cause startup blocking, fix and retry
6. **Start Frontend**: `cd frontend/ && npm run dev` (run in background)
7. **Verify**: health check `curl localhost:3000/health` and `curl localhost:5173`, report status table

Known issues to auto-fix:
- Docker container name conflict → `docker rm -f ims-postgres` then retry
- Redis blocking startup → ensure `redis.ts` has `socket.reconnectStrategy: false` and `connectTimeout: 3000`
- Port already in use → kill existing process on that port and retry

## Deploy

When user says "Deploy", execute the following steps automatically. Fix any TS/build errors encountered before deploying.

### Production URLs
- **Frontend**: https://ims-frontend-sec02.vercel.app
- **Backend**: https://ims-backend-sec02.fly.dev
- **Database**: Supabase project `viguwtevkhfiszadpjvy`

### Deploy Backend (Fly.io)
```bash
cd "02_Source/01_Source Code/backend"
npx tsc --noEmit                                    # type-check first, fix errors if any
flyctl deploy --remote-only -a ims-backend-sec02     # build & deploy (takes ~1-2 min)
```
- If TS errors occur, fix them before deploying
- Fly.io app: `ims-backend-sec02`, region: Singapore (`sin`), image: node:22-slim
- Secrets managed via `flyctl secrets set KEY=VALUE -a ims-backend-sec02`
- Current secrets: `DATABASE_URL` (Supabase), `BYPASS_AUTH=false`, `PORT=3000`
- Verify after deploy: `curl https://ims-backend-sec02.fly.dev/api/materials`
- If DNS doesn't resolve locally, use: `curl --resolve ims-backend-sec02.fly.dev:443:66.241.125.199 https://ims-backend-sec02.fly.dev/api/materials`

### Deploy Frontend (Vercel)
Frontend auto-deploys on `git push` to `master` if connected to Vercel.
If manual deploy needed:
```bash
cd "02_Source/01_Source Code/frontend"
npm run build                                        # verify build succeeds
vercel --prod                                        # deploy to production
```
- Vercel project: `ims-frontend-sec02`
- `VITE_API_URL` is set to empty string (uses relative `/api/` path or falls back to fly.dev URL)
- `tsconfig.app.json` must have `baseUrl` + `paths` for `@/*` alias (required for `tsc -b`)

### Deploy Database Schema (Supabase)
For schema changes, write a Node.js migration script and run it on Fly.io machine (local DNS cannot resolve `db.*.supabase.co`):
```bash
# 1. Write migration script to /tmp/migrate.js
# 2. Upload to Fly.io
echo "put /tmp/migrate.js /tmp/migrate.js" | flyctl sftp shell -a ims-backend-sec02
# 3. Run on Fly.io (must copy to /app/ for pg module access)
flyctl ssh console -a ims-backend-sec02 -C "/bin/sh -c 'cp /tmp/migrate.js /app/migrate.js && cd /app && node migrate.js'"
```
- The script should use `process.env.DATABASE_URL` (already set on Fly.io) with `ssl: { rejectUnauthorized: false }`
- Or use Supabase Dashboard → SQL Editor for simple changes

### Deploy Order
If deploying everything: Database schema first → Backend → Frontend (push to trigger Vercel)

### Quick Deploy (most common case — backend code changes only)
```bash
cd "02_Source/01_Source Code/backend" && npx tsc --noEmit && flyctl deploy --remote-only -a ims-backend-sec02
```
