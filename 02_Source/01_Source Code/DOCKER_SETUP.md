# Local Development Stack

Complete Docker Compose setup for the Inventory Management System.

## Services

The stack includes the following services:

1. **PostgreSQL** (port 5432) - Main database
2. **Redis** (port 6379) - Caching layer
3. **Elasticsearch** (port 9200) - Search and analytics
4. **Keycloak** (port 8080) - Authentication and authorization
5. **AI Service** (port 8000) - FastAPI-based AI/ML service
6. **Backend** (port 3000) - Node.js/Express API
7. **Frontend** (port 5173) - React/Vite application

## Quick Start

### 1. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` file if you need to change default values.

### 2. Start All Services

```bash
# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f backend
```

### 3. Start Individual Services

```bash
# Start only database and cache
docker-compose up -d postgres redis

# Start backend with dependencies
docker-compose up -d postgres redis backend
```

### 4. Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This deletes all data)
docker-compose down -v
```

## Service URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Keycloak Admin**: http://localhost:8080 (admin/admin)
- **AI Service**: http://localhost:8000
- **AI Service Docs**: http://localhost:8000/docs
- **Elasticsearch**: http://localhost:9200

## Health Checks

All services include health checks. Check status with:

```bash
docker-compose ps
```

## Development Workflow

### Backend Development

```bash
# Backend code is mounted, changes reflect immediately
# Edit files in ./backend/src/

# Restart backend service if needed
docker-compose restart backend
```

### Frontend Development

```bash
# Frontend code is mounted, hot-reload enabled
# Edit files in ./frontend/src/

# Rebuild if package.json changes
docker-compose up -d --build frontend
```

### AI Service Development

```bash
# Edit files in ./ai-service/
# Service has hot-reload enabled

docker-compose restart ai-service
```

## Troubleshooting

### Service Won't Start

```bash
# Check logs
docker-compose logs [service-name]

# Rebuild service
docker-compose up -d --build [service-name]
```

### Port Already in Use

Edit `.env` file to change port numbers.

### Database Connection Issues

```bash
# Check if PostgreSQL is ready
docker-compose exec postgres pg_isready

# Access PostgreSQL
docker-compose exec postgres psql -U myuser -d mydatabase
```

### Reset Everything

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all -v

# Start fresh
docker-compose up -d
```

## Performance Tips

### For Windows Users

1. Ensure Docker Desktop is using WSL 2 backend
2. Keep source code in WSL 2 file system for better performance
3. Allocate sufficient resources in Docker Desktop settings

### Resource Allocation

Minimum recommended:
- CPU: 4 cores
- RAM: 8 GB
- Disk: 20 GB free space

## Database Management

### Initialize Database

The database is automatically initialized with `db_schema/db-init.sql` on first run.

### Backup Database

```bash
docker-compose exec postgres pg_dump -U myuser mydatabase > backup.sql
```

### Restore Database

```bash
docker-compose exec -T postgres psql -U myuser mydatabase < backup.sql
```

## Keycloak Setup

1. Access Keycloak admin console: http://localhost:8080
2. Login with credentials: admin/admin
3. Create a new realm for the application
4. Configure clients, roles, and users

## Elasticsearch Setup

### Create Indices

```bash
# Materials index
curl -X PUT "localhost:9200/materials" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "material_id": { "type": "keyword" },
      "name": { "type": "text" },
      "description": { "type": "text" },
      "quantity": { "type": "integer" },
      "unit_price": { "type": "float" }
    }
  }
}
'

# Transactions index
curl -X PUT "localhost:9200/transactions" -H 'Content-Type: application/json' -d'
{
  "mappings": {
    "properties": {
      "transaction_id": { "type": "keyword" },
      "material_id": { "type": "keyword" },
      "type": { "type": "keyword" },
      "quantity": { "type": "integer" },
      "timestamp": { "type": "date" }
    }
  }
}
'
```

## Monitoring

### View Service Status

```bash
# All services
docker-compose ps

# Service stats
docker stats
```

### Access Service Logs

```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## Network

All services are connected via the `ims-network` bridge network, allowing them to communicate using service names as hostnames.

Example: Backend can access Redis at `redis://redis:6379`

## Volumes

Persistent volumes:
- `postgres_data` - PostgreSQL database
- `redis_data` - Redis cache
- `elasticsearch_data` - Elasticsearch indices
- `backend_node_modules` - Backend dependencies
- `frontend_node_modules` - Frontend dependencies
