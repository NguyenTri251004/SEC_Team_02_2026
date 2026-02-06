# Inventory Management System (IMS)

Full-stack application: Express.js backend + React frontend + Supabase PostgreSQL.

## Quick Start

### Local Development:

**Install & Run:**
```bash
# Backend
cd backend && npm install && npm run dev

# Frontend (new terminal)
cd frontend && npm install && npm run dev
```

**Access:**
- Backend: http://localhost:3000
- Frontend: http://localhost:5173

---

## Docker

```bash
docker-compose up -d
```
- Backend: http://localhost:3000
- Frontend: http://localhost:80

---

## Deployment

See [/docs/DEPLOYMENT.md](../../docs/DEPLOYMENT.md)

**DigitalOcean:** Backend $5/mo, Frontend FREE

---

## Tech Stack

- Backend: Express.js, TypeScript, Supabase
- Frontend: React 19, Vite, TypeScript
- Database: PostgreSQL (Supabase Cloud)
- Deploy: Docker, DigitalOcean

---

## Environment

**backend/.env:**
```
DATABASE_URL=postgresql://...
PORT=3000
```

**frontend/.env.production:**
```
VITE_API_URL=https://backend-url
```

---

**Last Updated:** Feb 6, 2026
