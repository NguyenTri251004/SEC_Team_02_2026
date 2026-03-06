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
  03_Build Scripts/
03_Deployment/         # Deployment & user guides
```

## Development Commands

All commands run from `02_Source/01_Source Code/`.

### Backend (`backend/`)
```bash
npm install          # install deps
npm run dev          # start dev server (ts-node) on :3000
npm run build        # compile TypeScript to dist/
npm start            # run compiled JS from dist/
npm run watch        # tsc --watch
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
Modular organization: each domain module has `*.routes.ts`, `*.service.ts`, `*.types.ts`.
- `modules/materials/` - Materials CRUD
- `modules/transactions/` - Inventory transactions (IN/OUT)
- `modules/search/` - Elasticsearch full-text search
- `security/auth.ts` - JWT authentication middleware
- `security/rbac.ts` - Role-based access control
- `shared/db/pool.ts` - PostgreSQL connection pool (supports `DATABASE_URL` or individual `DB_*` env vars)
- `shared/cache/redis.ts` - Redis client (optional, app runs without it)
- `shared/elasticsearch/client.ts` - Elasticsearch client (optional)

API routes are mounted at `/api/materials`, `/api/transactions`, `/api/search`.

### Frontend Structure (`frontend/src/`)
- `auth/` - Keycloak integration + AuthProvider context (demo mode with role switcher)
- `components/layout/AppLayout.tsx` - Main layout with sidebar navigation
- `components/dashboard/` - Reusable dashboard widgets (KpiCard, ChartCard, AlertPanel, DataTableCard)
- `pages/dashboard/` - Role-based dashboards: Admin, InventoryManager, QualityControl, Production
- `pages/materials/` - Materials CRUD page
- `services/api.ts` - Axios API client with Keycloak token interceptor, organized by domain (adminApi, dashboardApi, materialApi, transactionApi, qcApi, lotApi, productionApi, reportApi)
- `types/index.ts` - All TypeScript interfaces and API response types
- `constants/roles.ts` - Role definitions and display config
- `constants/theme.ts` - Ant Design theme configuration
- `hooks/` - React Query hooks (useDashboardData, useMaterialsData)
- `stores/uiStore.ts` - Zustand store for UI state (sidebar)
- `router/index.tsx` - Route definitions with planned routes (many still point to NotFoundPage)

Path alias: `@/*` maps to `src/*` (configured in vite.config.ts and tsconfig.json).

### User Roles
`admin`, `inventory_manager`, `quality_control`, `production`, `viewer` - each role gets a different dashboard view.

### Database Schema (db-init.sql)
Current tables: `users`, `materials`, `transactions`. The frontend types suggest additional tables planned: `inventory_lots`, `qc_tests`, `production_batches`, `label_templates`.

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
