# Inventory Management System - Source Code

✅ **Production Status:** Deployed and operational  
🌐 **Frontend:** https://ims-frontend-sec02.vercel.app  
📡 **Backend:** https://ims-backend-sec02.fly.dev  

This directory contains the complete source code for the Inventory Management System (IMS), including the backend API, frontend application, and database schema.

## Project Structure

```
01_Source Code/
├── backend/              # Express.js TypeScript backend server
├── frontend/             # React + Vite frontend application
├── db_schema/            # PostgreSQL database schema and Docker setup
```

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Docker** and **Docker Compose** - [Download](https://www.docker.com/products/docker-desktop)
- **Git** - [Download](https://git-scm.com/)

## Quick Start

### 1. Database Setup

Start the PostgreSQL database using Docker Compose:

```bash
cd db_schema
docker-compose up -d
```

This will start a PostgreSQL 16 container with:

- **User**: myuser
- **Password**: mypassword
- **Database**: mydatabase
- **Port**: 5432

Verify the database is running:

```bash
docker-compose ps
```

### 2. Initialize Database Schema

Once the database is running, initialize the schema:

```bash
cd db_schema
psql -U myuser -h localhost -d mydatabase -f db-init.sql
```

### 3. Backend Setup

Install dependencies and start the backend server:

```bash
cd backend
npm install
npm run dev
```

The backend server will start on `http://localhost:3000`

**Available scripts:**

- `npm run dev` - Start development server with ts-node
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Run compiled JavaScript server
- `npm run watch` - Watch TypeScript files and recompile on changes

### 4. Frontend Setup

In a new terminal, install dependencies and start the frontend development server:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173` (Vite default port)

**Available scripts:**

- `npm run dev` - Start Vite development server
- `npm run build` - Build optimized production bundle
- `npm run lint` - Run ESLint to check code quality
- `npm run preview` - Preview production build locally

## Technology Stack

### Backend

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Database Driver**: pg (node-postgres)

### Frontend

- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Linter**: ESLint

### Database

- **DBMS**: PostgreSQL 16 (Alpine)
- **Container**: Docker

## Database Configuration

The default database credentials are configured in:

- **Backend**: `backend/src/server.ts` (lines 8-13)
- **Docker Compose**: `db_schema/docker-compose.yml` (lines 8-10)

### Production Deployment Note

⚠️ **Do not use these credentials in production!** Update them in:

1. `backend/src/server.ts` - Pool configuration
2. `db_schema/docker-compose.yml` - Environment variables
3. Use environment variables for sensitive credentials

## Development Workflow

### Running All Services Locally

**Terminal 1 - Database:**

```bash
cd db_schema
docker-compose up
```

**Terminal 2 - Backend:**

```bash
cd backend
npm install  # First time only
npm run dev
```

**Terminal 3 - Frontend:**

```bash
cd frontend
npm install  # First time only
npm run dev
```

### API Communication

The frontend is configured to communicate with the backend at `http://localhost:3000`. Ensure both servers are running for full functionality.

## Troubleshooting

### Database Connection Issues

If the backend fails to connect to the database:

1. Verify Docker container is running:

   ```bash
   docker-compose ps
   ```

2. Check database logs:

   ```bash
   docker-compose logs db
   ```

3. Test connection manually:
   ```bash
   psql -U myuser -h localhost -d mydatabase
   ```

### Port Already in Use

If ports are already in use:

- **Backend (3000)**: Set `PORT` environment variable

  ```bash
  PORT=3001 npm run dev
  ```

- **Frontend (5173)**: Vite will automatically use the next available port

### Node Modules Issues

Clear cache and reinstall:

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Building for Production

### Backend

```bash
cd backend
npm run build
npm start
```

Compiled files will be in `dist/` directory.

### Frontend

```bash
cd frontend
npm run build
```

Build output will be in `dist/` directory.

## Environment Variables

Create `.env` files in respective directories if needed:

**Backend** (`backend/.env`):

```
PORT=3000
DB_USER=myuser
DB_HOST=localhost
DB_NAME=mydatabase
DB_PASSWORD=mypassword
DB_PORT=5432
```

**Frontend** (`frontend/.env`):

```
VITE_API_URL=http://localhost:3000
```

## Code Quality

### Frontend Linting

```bash
cd frontend
npm run lint
```

## Docker Cleanup

To stop and remove the database container:

```bash
cd db_schema
docker-compose down
```

To remove the database volume as well:

```bash
docker-compose down -v
```

## Additional Resources

For detailed information, refer to:

- [Product Requirements Document](../../01_Documents/01_Product%20Requirements%20Document.md)
- [Architecture](../../01_Documents/05_Architecture.md)
- [Coding Standards](../../01_Documents/07_Coding%20Standards.md)
- [Deployment Guide](../../03_Deployment/02_Deployment%20Guide.md)

## Support

For issues or questions about the source code setup, refer to the project documentation in the `01_Documents/` directory or contact the development team.
