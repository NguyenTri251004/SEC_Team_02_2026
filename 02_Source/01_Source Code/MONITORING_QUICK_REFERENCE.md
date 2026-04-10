# Quick Monitoring Commands Reference

## ✅ All Endpoints - Verified Working

| Endpoint | Port | Purpose | Auth | Status |
|----------|------|---------|------|--------|
| `GET /health` | 3000 | Liveness check | None | ✅ Works |
| `GET /metrics` | 3000 | Prometheus metrics | None | ✅ Works |
| `GET /api/admin/health` | 3000 | System health (DB/Redis/ES) | BYPASS_AUTH | ✅ Works |
| PostgreSQL | 5432 | Database queries | myuser/mypassword | ✅ |
| Redis | 6379 | Cache operations | password: redispassword | ✅ |
| Elasticsearch | 9200 | Full-text search (NOT 9300) | None | ✅ |
| Keycloak Admin | 8080 | Auth management | admin/admin | ✅ |

---

## 🚀 Quick Start - Test All Endpoints Now

### PowerShell / Windows
```powershell
# 1. Basic liveness
Invoke-WebRequest http://localhost:3000/health | Select-Object -ExpandProperty Content

# 2. System health with service details  
Invoke-WebRequest http://localhost:3000/api/admin/health | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 3

# 3. Prometheus metrics (first 500 chars)
$response = Invoke-WebRequest http://localhost:3000/metrics -UseBasicParsing
$response.Content.Substring(0, 500)
```

### Bash / Linux / Mac
```bash
# 1. Basic liveness
curl http://localhost:3000/health

# 2. System health with service details
curl http://localhost:3000/api/admin/health | jq .

# 3. Prometheus metrics
curl http://localhost:3000/metrics | head -20
```

---

### 📋 View Logs

| Service | Command |
|---------|---------|
| **Backend** | `docker compose logs -f ims-backend` |
| **Frontend** | `docker compose logs -f ims-frontend` |
| **Database** | `docker compose logs -f ims-postgres` |
| **Redis** | `docker compose logs -f ims-redis` |
| **Elasticsearch** | `docker compose logs -f ims-elasticsearch` |
| **AI Service** | `docker compose logs -f ims-ai-service` |
| **All Services** | `docker compose logs -f` |
| **Errors Only** | `docker compose logs --tail=100 ims-backend \| grep -i error` |

### 🏥 Health Checks

```bash
# Backend basic health
curl http://localhost:3000/health

# Full system health (DB, Redis, ES status)
curl http://localhost:3000/api/admin/health | jq .
```

**Expected Response:**

```json
{
  "overall": "healthy",
  "services": [
    {"name": "PostgreSQL", "status": "healthy", "latency_ms": 2},
    {"name": "Redis", "status": "healthy", "latency_ms": 1},
    {"name": "Elasticsearch", "status": "healthy", "latency_ms": 45}
  ]
}
```

### 📊 Metrics (Prometheus)

```bash
# View all metrics
curl http://localhost:3000/metrics

# Filter specific metrics
curl http://localhost:3000/metrics | grep ims_http_requests_total
curl http://localhost:3000/metrics | grep ims_system_health_status
```

### 🐳 Container Info

```bash
# List running containers
docker compose ps

# Show resource usage (CPU, Memory)
docker stats

# Enter backend container shell
docker compose exec ims-backend sh

# View live metrics from all containers
docker stats --no-stream
```

### 🗄️ Database

```bash
# Connect to PostgreSQL
docker compose exec ims-postgres psql -U myuser -d mydatabase

# Inside psql, check table count:
SELECT COUNT(*) FROM users;
\q  # Exit

# Or one-liner:
docker compose exec -T ims-postgres psql -U myuser -d mydatabase -c "SELECT COUNT(*) FROM users;"
```

### 🔴 Redis

```bash
# Connect to Redis
docker compose exec ims-redis redis-cli

# Inside redis-cli:
PING                    # Test connection
INFO memory             # Memory stats
DBSIZE                  # Number of keys
KEYS *                  # List all keys
MONITOR                 # Watch all commands
exit                    # Quit
```

### 🔍 Elasticsearch

```bash
# Health status
curl http://localhost:9200/_cluster/health | jq .

# List indices
curl http://localhost:9200/_cat/indices

# Sample search
curl http://localhost:9200/materials/_search?size=3 | jq .
```

---

## Setup Optional: Prometheus + Grafana

### Create config

```bash
mkdir -p monitoring
cat > monitoring/prometheus.yml <<EOF
global:
  scrape_interval: 15s
scrape_configs:
  - job_name: 'ims-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
EOF
```

### Start Prometheus

```bash
docker run -d \
  --name ims-prometheus \
  -p 9090:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus:latest
```

Access at: **http://localhost:9090**

### Start Grafana

```bash
docker run -d \
  --name ims-grafana \
  -p 3001:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana:latest
```

Access at: **http://localhost:3001** (admin / admin)

### Add Prometheus to Grafana

1. Open http://localhost:3001
2. Go to **Connections → Data Sources**
3. Add **Prometheus**
4. URL: `http://host.docker.internal:9090`
5. Save & Test

### Create a simple dashboard

1. **Dashboards → Create → New Dashboard**
2. Add panels:
   - **Requests/sec**: `rate(ims_http_requests_total[5m])`
   - **Latency (p95)**: `histogram_quantile(0.95, ims_http_request_duration_seconds_bucket)`
   - **Errors**: `ims_http_errors_total`
   - **Health**: `ims_system_health_status`

---

## Typical Monitoring Workflow

```bash
# 1. Start the stack
docker compose up -d

# 2. Wait 10 seconds for services to settle
sleep 10

# 3. Check all services are running
docker compose ps

# 4. Verify health
curl http://localhost:3000/api/admin/health | jq '.data'

# 5. Monitor logs in a new terminal
docker compose logs -f ims-backend

# 6. In another terminal, run a test request
curl http://localhost:3000/api/materials

# 7. Check metrics
curl http://localhost:3000/metrics | head -20

# 8. Optional: View live resource usage
docker stats
```

---

## Connecting to Services Directly

### PostgreSQL (Port 5432)

```powershell
# From Windows, use psql if installed:
psql -U myuser -h localhost -d mydatabase -p 5432
# Password: mypassword

# Or use Docker:
docker compose exec ims-postgres psql -U myuser -d mydatabase

# Example query inside psql:
SELECT COUNT(*) FROM users;
\q  # Exit
```

### Redis (Port 6379)

```powershell
# Connect with password
docker compose exec ims-redis redis-cli -a redispassword

# Inside redis-cli:
PING              # Test connection
INFO              # Server stats
DBSIZE            # Number of keys
KEYS *            # List all keys
GET key_name      # Get value by key
exit              # Quit
```

### Elasticsearch (Port 9200)

```powershell
# Check health
Invoke-WebRequest "http://localhost:9200/_cluster/health" | Select-Object -ExpandProperty Content | ConvertFrom-Json

# List indices
Invoke-WebRequest "http://localhost:9200/_cat/indices" | Select-Object -ExpandProperty Content

# Sample search
Invoke-WebRequest "http://localhost:9200/materials/_search?size=5" | Select-Object -ExpandProperty Content | ConvertFrom-Json
```

### Keycloak (Port 8080)

```
Admin Console: http://localhost:8080/admin
Username: admin
Password: admin
```

---

## Cleanup

```bash
# Stop all containers
docker compose down

# Stop and remove volumes (wipe data)
docker compose down -v

# Clean up Prometheus + Grafana
docker stop ims-prometheus ims-grafana
docker rm ims-prometheus ims-grafana

# Remove volume
docker volume rm ims_postgres_data
```

---

## Key Endpoints

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `http://localhost:3000/health` | Basic health check | No |
| `http://localhost:3000/api/admin/health` | Detailed system health (DB, Redis, ES) | **JWT token required** (see below) |
| `http://localhost:3000/metrics` | Prometheus metrics | No |
| `http://localhost:5173` | Frontend (Vite dev server) | No |
| `http://localhost:9090` | Prometheus dashboard | No |
| `http://localhost:3001` | Grafana dashboard | No |
| `http://localhost:9200` | Elasticsearch HTTP API | No |

### Admin Auth: Getting a JWT Token

**Status:** ✅ `/api/admin/health` is currently set to `BYPASS_AUTH=true` for development (no token required).

#### **Currently Active: Bypass Auth Mode** 

```bash
# Current configuration in docker-compose.yml: BYPASS_AUTH=true
# This means you can call /api/admin/health without a token

# Test it now
curl http://localhost:3000/api/admin/health | jq .

# PowerShell
Invoke-WebRequest http://localhost:3000/api/admin/health | Select-Object -ExpandProperty Content | ConvertFrom-Json | ConvertTo-Json -Depth 3
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "overall": "healthy",
    "services": [
      {"name": "PostgreSQL", "status": "healthy", "latency_ms": 1},
      {"name": "Redis", "status": "healthy", "latency_ms": 1},  
      {"name": "Elasticsearch", "status": "healthy", "latency_ms": 41, "message": "Cluster status: green"}
    ],
    "timestamp": "2026-04-10T07:52:50.518Z"
  }
}
```

#### **For Production: Secure Auth with Keycloak**

To require real JWT tokens:

1. Edit `docker-compose.yml:` change `BYPASS_AUTH=true` → `BYPASS_AUTH=false`
2. Restart: `docker compose restart ims-backend`
3. Get token from Keycloak:

```bash
TOKEN=$(curl -s -X POST \
  http://localhost:8080/realms/inventory-management/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=admin" \
  -H "Content-Type: application/x-www-form-urlencoded" | jq -r '.access_token')

curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/health | jq .
```

**For local development, BYPASS_AUTH=true is currently enabled and sufficient.**

---

**For detailed instructions, see:** [MONITORING_DOCKER_COMPOSE.md](MONITORING_DOCKER_COMPOSE.md)
