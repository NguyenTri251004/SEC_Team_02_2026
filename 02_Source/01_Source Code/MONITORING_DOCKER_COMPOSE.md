# Local Monitoring Guide (Docker Compose)

When running the full stack with `docker-compose up -d`, monitor logs, health, and metrics using these commands.

---

## 1. View Docker Compose Logs

### Backend logs (Node.js)

```bash
# Stream live backend logs
docker compose logs -f ims-backend

# Last 100 lines of backend logs
docker compose logs --tail=100 ims-backend

# Follow logs while filtering for errors
docker compose logs -f ims-backend | grep -i error
```

### Frontend logs (Vite / Node dev server)

```bash
# Stream live frontend logs
docker compose logs -f ims-frontend

# Last 50 lines
docker compose logs --tail=50 ims-frontend
```

### Database logs (PostgreSQL)

```bash
# Stream database logs
docker compose logs -f ims-postgres

# Search for slow queries or errors
docker compose logs ims-postgres | grep -i "error\|slow"
```

### Redis logs

```bash
docker compose logs -f ims-redis
```

### Elasticsearch logs

```bash
docker compose logs -f ims-elasticsearch
```

### AI Service logs

```bash
docker compose logs -f ims-ai-service
```

### All services at once

```bash
# Stream all logs
docker compose logs -f

# Follow all with timestamps
docker compose logs -f --timestamps
```

---

## 2. Health Check Endpoints

### Backend health

```bash
# Basic health check
curl http://localhost:3000/health

# Detailed system health (DB, Redis, Elasticsearch status)
# REQUIRES AUTH TOKEN - See section 3.1 below
curl http://localhost:3000/api/admin/health
```

**Detailed system health response example:**

```json
{
  "success": true,
  "data": {
    "overall": "healthy",
    "services": [
      {
        "name": "PostgreSQL",
        "status": "healthy",
        "latency_ms": 2
      },
      {
        "name": "Redis",
        "status": "healthy",
        "latency_ms": 1
      },
      {
        "name": "Elasticsearch",
        "status": "healthy",
        "latency_ms": 45,
        "message": "Cluster status: green"
      }
    ],
    "timestamp": "2025-04-10T08:30:45.123Z"
  }
}
```

#### 3.1 Getting an Auth Token for `/api/admin/health`

The `/api/admin/health` endpoint requires a JWT token. Choose one option:

**Option A: Get token from Keycloak (Recommended for testing)**

```bash
# Get token
TOKEN=$(curl -s -X POST http://localhost:8080/realms/inventory-management/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=admin" \
  -H "Content-Type: application/x-www-form-urlencoded" | jq -r '.access_token')

# Use token to call health endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/health | jq .
```

**Option B: Bypass auth for development (NOT for production)**

Edit `docker-compose.yml`:

```yaml
backend:
  environment:
    BYPASS_AUTH: "true"  # Change from false to true
```

Then restart:

```bash
docker compose restart ims-backend
```

Now `/api/admin/health` works without a token.



### Frontend health

```bash
# Should respond with 200 OK
curl http://localhost:5173
```

### AI Service health

```bash
curl http://localhost:8000/health
```

---

## 3. Prometheus Metrics

### Scrape metrics endpoint

```bash
# Get all Prometheus metrics
curl http://localhost:3000/metrics

# Filter for specific metrics
curl http://localhost:3000/metrics | grep ims_http_requests_total
curl http://localhost:3000/metrics | grep ims_system_health_status
```

**Key metrics to monitor:**

- `ims_http_requests_total` — total requests by method, route, status
- `ims_http_request_duration_seconds` — request latency/duration histogram
- `ims_http_errors_total` — total errors by route and status code
- `ims_system_health_status` — health status of PostgreSQL, Redis, Elasticsearch (0–1 gauge)
- `process_cpu_seconds_total` — Node.js CPU usage
- `process_resident_memory_bytes` — Node.js memory usage
- `nodejs_heap_size_used_bytes` — V8 heap usage

---

## 4. Local Prometheus + Grafana Stack (Optional)

If you want real-time dashboards and graphs locally, set up a minimal Prometheus + Grafana.

### Step 1: Create a prometheus.yml config

Create `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'ims-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

### Step 2: Start Prometheus in Docker

```bash
docker run -d \
  --name ims-prometheus \
  -p 9090:9090 \
  -v $(pwd)/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus:latest
```

**Access at:** http://localhost:9090

### Step 3: Start Grafana in Docker

```bash
docker run -d \
  --name ims-grafana \
  -p 3001:3000 \
  -e GF_SECURITY_ADMIN_PASSWORD=admin \
  grafana/grafana:latest
```

**Access at:** http://localhost:3001 (admin / admin)

### Step 4: Add Prometheus data source in Grafana

1. Open Grafana at http://localhost:3001
2. Go to **Connections** → **Data Sources**
3. Click **Add data source**
4. Select **Prometheus**
5. Set URL: `http://host.docker.internal:9090`
6. Click **Save & Test**

### Step 5: Create a dashboard

1. Go to **Dashboards** → **Create** → **New Dashboard**
2. Add panels:
   - `rate(ims_http_requests_total[5m])` — Requests per second
   - `histogram_quantile(0.95, ims_http_request_duration_seconds_bucket)` — 95th percentile latency
   - `ims_http_errors_total` — Error count
   - `ims_system_health_status` — Health status gauge

---

## 5. Container Inspection

### Check container status

```bash
# List all running containers
docker compose ps

# Check resource usage
docker stats

# Inspect specific container
docker inspect ims-backend
```

### Container logs with timestamps

```bash
docker compose logs -f --timestamps ims-backend
```

### Enter a container shell (for debugging)

```bash
# Connect to backend container
docker compose exec ims-backend sh

# Inside container: check if server is running
curl localhost:3000/health

# Exit with Ctrl+D
```

---

## 6. Service Connections & Credentials

### PostgreSQL Database

**Port:** `5432`  
**Credentials:**
- Username: `myuser`
- Password: `mypassword`
- Database: `mydatabase`

```bash
# Connect from host (requires psql installed)
psql -U myuser -h localhost -p 5432 -d mydatabase

# Or use Docker container
docker compose exec ims-postgres psql -U myuser -d mydatabase
```

**Example commands inside psql**

```sql
-- List all tables
\dt

-- Count users
SELECT COUNT(*) FROM users;

-- View all materials
SELECT material_id, material_name FROM materials LIMIT 5;

-- Exit
\q
```

---

### Redis Cache

**Port:** `6379`  
**Password:** `redispassword`

```bash
# Connect via Docker
docker compose exec ims-redis redis-cli -a redispassword

# Commands inside redis-cli
PING                      # Test connection (should return PONG)
INFO                      # Server info and stats
DBSIZE                    # Total number of keys stored
KEYS *                    # List all keys
GET key_name              # Get value by key
SET key_name value        # Set a key-value pair
DEL key_name              # Delete a key
MONITOR                   # Watch all commands in real-time
exit                      # Quit
```

---

### Elasticsearch Search

**Port:** `9200` (use this for queries)  
**Port:** `9300` (internal node communication—not for client queries)

```bash
# Cluster health
curl http://localhost:9200/_cluster/health | jq .

# List all indices
curl http://localhost:9200/_cat/indices

# Verbose index listing
curl http://localhost:9200/_cat/indices?v

# Sample search materials
curl http://localhost:9200/materials/_search?size=5 | jq .

# Index mapping
curl http://localhost:9200/materials/_mapping | jq .
```

---

### Keycloak (Authentication)

**Port:** `8080`  
**Admin URL:** http://localhost:8080/admin  
**Credentials:** admin / admin

**Get OAuth2 token (for testing API auth):**

```bash
# Linux/Bash
TOKEN=$(curl -s -X POST http://localhost:8080/realms/inventory-management/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=admin" \
  -H "Content-Type: application/x-www-form-urlencoded" | jq -r '.access_token')

echo "Token: $TOKEN"

# Use token
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/health | jq .
```

---

## 7. Database Monitoring (PostgreSQL)

### Check slow queries

```sql
-- Inside psql:
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

### Check table sizes

```sql
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 8. Redis Monitoring

### Check memory usage

```bash
docker compose exec ims-redis redis-cli -a redispassword INFO memory
```

### See all cached keys

```bash
docker compose exec ims-redis redis-cli -a redispassword KEYS "*" | head -20
```

---

## 9. Elasticsearch Monitoring

### Health status

```bash
curl http://localhost:9200/_cluster/health | jq .
```

**Example response:**

```json
{
  "cluster_name": "docker-cluster",
  "status": "green",
  "timed_out": false,
  "number_of_nodes": 1,
  "number_of_data_nodes": 1,
  "active_primary_shards": 1,
  "active_shards": 1
}
```

### Search indices

```bash
curl http://localhost:9200/_cat/indices?v

# Sample search
curl http://localhost:9200/materials/_search?size=5 | jq .
```

---

## 10. Quick Monitoring Checklist


```bash
# 1. View docker status
docker compose ps

# 2. Check backend health
curl http://localhost:3000/api/admin/health | jq '.data'

# 3. Check logs for errors (last 50 lines)
docker compose logs --tail=50 ims-backend | grep -i error || echo "No errors found"

# 4. Check metrics endpoint
curl http://localhost:3000/metrics | head -20

# 5. Verify database connection
docker compose exec ims-postgres psql -U myuser -d mydatabase -c "SELECT COUNT(*) FROM users;"

# 6. Check Elasticsearch status
curl http://localhost:9200/_cluster/health | jq '.status'

# All in one script:
#!/bin/bash
echo "=== Docker Status ===" && docker compose ps
echo -e "\n=== Backend Health ===" && curl -s http://localhost:3000/api/admin/health | jq '.data'
echo -e "\n=== Recent Errors ===" && docker compose logs --tail=30 ims-backend | grep -i error || echo "No errors"
echo -e "\n=== DB Users Count ===" && docker compose exec -T ims-postgres psql -U myuser -d mydatabase -c "SELECT COUNT(*) FROM users;"
```

---

## 10. Cleanup

### Stop all containers

```bash
docker compose down
```

### Remove volumes (wipe all data)

```bash
docker compose down -v
```

### Clean up Prometheus + Grafana (if created)

```bash
docker stop ims-prometheus ims-grafana
docker rm ims-prometheus ims-grafana
```

---

## 11. Troubleshooting

### Backend not responding

```bash
# Check logs
docker compose logs ims-backend

# Check if container is running
docker compose ps ims-backend

# Restart
docker compose restart ims-backend
```

### Database connection failed

```bash
# Check logs
docker compose logs ims-postgres

# Test connection from host
PGPASSWORD=mypassword psql -U myuser -h localhost -d mydatabase -c "SELECT 1;"
```

### Cannot connect to PostgreSQL/Redis/Elasticsearch

**Port 5432 (PostgreSQL):**
```bash
docker compose exec ims-postgres psql -U myuser -d mydatabase
```
If that fails, check: `docker compose logs ims-postgres`

**Port 6379 (Redis):**
```bash
docker compose exec ims-redis redis-cli -a redispassword
```
Make sure you use the password: `redispassword`

**Port 9200 (Elasticsearch):**
```bash
curl http://localhost:9200/_cluster/health
```
Note: Port 9300 is for internal node communication, not client queries.

### Metrics endpoint returns 404

```bash
# Confirm backend is running with new code
docker compose logs ims-backend | tail -20

# Rebuild image if needed
docker compose build ims-backend
docker compose up -d ims-backend
```

### Authentication error on /api/admin/health

If you get `{"success":false,"error":"Unauthorized - No token provided"}`:

**Option 1: Use Keycloak token**

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/realms/inventory-management/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  -d "username=admin" \
  -d "password=admin" \
  -H "Content-Type: application/x-www-form-urlencoded" | jq -r '.access_token')

curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/health | jq .
```

**Option 2: Bypass auth (dev only)**

Edit `docker-compose.yml`:
```yaml
backend:
  environment:
    BYPASS_AUTH: "true"
```

Then: `docker compose restart ims-backend`

### High memory usage

```bash
# Check which container is using memory
docker stats

# Restart the culprit
docker compose restart ims-backend
```

---

## Summary

| Task | Command |
|------|---------|
| View backend logs | `docker compose logs -f ims-backend` |
| Check basic health | `curl http://localhost:3000/health` |
| Check system health (with auth) | `curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/admin/health` |
| View metrics | `curl http://localhost:3000/metrics` |
| PostgreSQL | `psql -U myuser -h localhost -d mydatabase` |
| Redis | `docker compose exec ims-redis redis-cli -a redispassword` |
| Elasticsearch | `curl http://localhost:9200/_cluster/health` |
| Keycloak admin | http://localhost:8080/admin (admin/admin) |
| Container status | `docker compose ps` |
| Resource usage | `docker stats` |
| Full log history | `docker compose logs --tail=100` |
