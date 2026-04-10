# ✅ Complete Monitoring Stack - Prometheus & Grafana Setup

**Status:** All services running and configured  
**Date:** 2026-04-10  
**Configuration:** BYPASS_AUTH=false (JWT token required for /api/admin/health)

---

## 🚀 Access Your Monitoring Dashboards

| Service | URL | Credentials | Status |
|---------|-----|-------------|--------|
| **Prometheus** | http://localhost:9090 | No auth | ✅ Running |
| **Grafana** | http://localhost:3001 | admin / admin | ✅ Running |
| **Backend API** | http://localhost:3000 | JWT token required | ✅ Running |
| **Metrics Endpoint** | http://localhost:3000/metrics | No auth | ✅ Running |

---

## 📊 Grafana Dashboard

### Login to Grafana
1. Open **[http://localhost:3001](http://localhost:3001)**
2. Default credentials:
   - **Username:** `admin`
   - **Password:** `admin`
   - (Change password on first login)

### Pre-Built Dashboard
The **IMS Backend Monitoring** dashboard is automatically imported with:
- **Request Rate** - HTTP requests per second by route
- **P95 Latency** - 95th percentile response time
- **System Health Status** - Database, Redis, Elasticsearch status
- **Error Rate** - HTTP errors per second

### Add More Dashboards
1. In Grafana, click **+ → Create → Import**
2. Paste JSON from `/monitoring/grafana/provisioning/dashboards/ims-backend.json`
3. Select **Prometheus** as datasource

---

## 📈 Prometheus Metrics

### Query Metrics Directly
Access **[http://localhost:9090](http://localhost:9090)** and run queries like:

```promql
# Request rate (5-minute average)
rate(ims_http_requests_total[5m])

# 95th percentile latency
histogram_quantile(0.95, rate(ims_http_request_duration_seconds_bucket[5m]))

# Error rate
rate(ims_http_errors_total[5m])

# System health status
ims_system_health_status
```

### Available Metrics
- `ims_http_requests_total` - Request count by method, route, status
- `ims_http_request_duration_seconds` - Latency histogram
- `ims_http_errors_total` - Error count
- `ims_system_health_status` - Service health (0-1 for each service)
- `ims_backend_process_cpu_*` - CPU usage
- `ims_backend_process_resident_memory_bytes` - Memory usage
- Node.js runtime metrics (GC, heap, etc.)

---

## 🔐 API Authentication (BYPASS_AUTH=false)

### Current Status
✅ **BYPASS_AUTH is set to FALSE** - `/api/admin/health` now requires JWT token

### Getting a Test Token

#### Option 1: Generate Test Token (Quickest)
```bash
cd backend
node generate-token.js
```

This generates a valid JWT token valid for 1 hour:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoidGVzd...
```

#### Option 2: Get Real Token from Keycloak (Recommended)

**Important:** You must request the `roles` scope explicitly to include role information in the token.

```bash
# Get token with roles scope
TOKEN=$(curl -s -X POST \
  http://localhost:8080/realms/inventory-management/protocol/openid-connect/token \
  -d "grant_type=password" \
  -d "client_id=inventory-backend" \
  -d "client_secret=backend-secret-change-in-production" \
  -d "username=testuser" \
  -d "password=testpass123" \
  -d "scope=openid profile email roles" \
  -H "Content-Type: application/x-www-form-urlencoded" | jq -r '.access_token')

echo $TOKEN
```

**With PowerShell:**
```powershell
$body = @{
  grant_type = "password"
  client_id = "inventory-backend"
  client_secret = "backend-secret-change-in-production"
  username = "testuser"
  password = "testpass123"
  scope = "openid profile email roles"
}
$response = Invoke-WebRequest -Uri "http://localhost:8080/realms/inventory-management/protocol/openid-connect/token" -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
$token = ($response.Content | ConvertFrom-Json).access_token
```

### Using the Token

**With cURL:**
```bash
TOKEN="your-jwt-token-here"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/admin/health | jq .
```

**With PowerShell:**
```powershell
$token = "your-jwt-token-here"
Invoke-WebRequest -Uri "http://localhost:3000/api/admin/health" `
  -Headers @{Authorization="Bearer $token"} | `
  Select-Object -ExpandProperty Content | `
  ConvertFrom-Json | ConvertTo-Json -Depth 3
```

### Expected Response
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
    "timestamp": "2026-04-10T08:06:50.123Z"
  }
}
```

---

## 📋 All Available Endpoints

| Endpoint | Port | Auth | Method | Purpose |
|----------|------|------|--------|---------|
| `/health` | 3000 | None | GET | Basic liveness check |
| `/metrics` | 3000 | None | GET | Prometheus metrics (text format) |
| `/api/admin/health` | 3000 | **JWT Token** | GET | Detailed system health with DB/Redis/ES status |
| `/` | 9090 | None | GET | Prometheus UI |
| `/api/v1/query` | 9090 | None | GET | Prometheus query API |
| `/` | 3001 | admin/admin | GET | Grafana UI |

---

## 🐳 Docker Services

All services are running in Docker Compose:

```bash
# View running services
docker compose ps

# View logs
docker compose logs -f ims-backend
docker compose logs -f ims-prometheus
docker compose logs -f ims-grafana

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v
```

---

## 📁 Configuration Files

### Created Files
- `monitoring/prometheus.yml` - Prometheus configuration (scrape backend)
- `monitoring/grafana/provisioning/datasources/prometheus.yml` - Grafana datasource config
- `monitoring/grafana/provisioning/dashboards/dashboards.yml` - Dashboard provisioning
- `monitoring/grafana/provisioning/dashboards/ims-backend.json` - Pre-built dashboard
- `backend/generate-token.js` - Test token generator utility

### Updated Files
- `docker-compose.yml` - Added Prometheus & Grafana services, set BYPASS_AUTH=false
- `MONITORING_QUICK_REFERENCE.md` - Updated with new auth info

---

## 🔧 Configuration Details

### BYPASS_AUTH Setting
Located in `docker-compose.yml` under backend service:
```yaml
environment:
  - BYPASS_AUTH=false  # Requires JWT token for admin endpoints
```

To go back to development mode (no token required):
```yaml
BYPASS_AUTH=true
```

Then restart:
```bash
docker compose restart ims-backend
```

### Prometheus Configuration
Scrapes metrics from backend every 15 seconds:
```yaml
scrape_configs:
  - job_name: 'ims-backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['ims-backend:3000']
```

View targets in Prometheus UI at: **[http://localhost:9090/targets](http://localhost:9090/targets)**

### Grafana Datasource
Automatically provisioned to connect to Prometheus at `http://prometheus:9090`

---

## ✅ Quick Verification Checklist

- [ ] Prometheus running: `Invoke-WebRequest http://localhost:9090 | Select-Object StatusCode`
- [ ] Grafana running: `Invoke-WebRequest http://localhost:3001 | Select-Object StatusCode`
- [ ] Backend metrics: `Invoke-WebRequest http://localhost:3000/metrics | Select-Object StatusCode`
- [ ] Prometheus scraping backend: Check [http://localhost:9090/targets](http://localhost:9090/targets) (should show 2 targets, backend UP)
- [ ] Grafana dashboard loaded: [http://localhost:3001/d/ims-backend-monitoring](http://localhost:3001/d/ims-backend-monitoring)
- [ ] Generate test token: `cd backend && node generate-token.js`
- [ ] Test authenticated endpoint: Use token with `/api/admin/health`

---

## 🚨 Troubleshooting

### Prometheus Not Scraping Backend
**Symptom:** Prometheus targets show "DOWN" at [http://localhost:9090/targets](http://localhost:9090/targets)

**Solution:**
1. Verify backend is running: `docker compose ps ims-backend`
2. Check backend logs: `docker compose logs ims-backend --tail=50`
3. Verify backend metrics endpoint: `Invoke-WebRequest http://localhost:3000/metrics`

### Grafana Not Loading Dashboard
**Symptom:** "No data" in dashboard panels

**Solution:**
1. Wait 60 seconds for Prometheus to scrape first metrics
2. In Grafana, refresh dashboard (press R key)
3. Check Prometheus has data: [http://localhost:9090/graph?query=ims_http_requests_total](http://localhost:9090/graph?query=ims_http_requests_total)

### Token Not Working
**Symptom:** 401 error when calling `/api/admin/health` with token

**Possible Causes:**
- Token is expired (check exp claim in token)
- Token signature is invalid (must match Keycloak public key)

**Solution:**
1. Generate fresh token: `cd backend && node generate-token.js`
2. Verify token not expired: Token generator creates 1-hour tokens

### Grafana Login Failed
**Symptom:** Can't login with admin/admin

**Solution:**
1. Check Grafana is running: `docker compose ps ims-grafana`
2. Check Grafana logs: `docker compose logs ims-grafana --tail=20`
3. Access through UI redirect: Try [http://localhost:3001/login](http://localhost:3001/login)

---

## 📚 Documentation References

- [MONITORING_QUICK_REFERENCE.md](MONITORING_QUICK_REFERENCE.md) - Quick commands
- [MONITORING_DOCKER_COMPOSE.md](MONITORING_DOCKER_COMPOSE.md) - Detailed Docker guide
- [DEPLOYMENT.md](DEPLOYMENT.md) - Production monitoring setup
- [README.md](README.md) - Project overview

---

## 🎯 Next Steps

1. ✅ Open Grafana: [http://localhost:3001](http://localhost:3001)
2. ✅ Generate test token: `cd backend && node generate-token.js`
3. ✅ Test API: Use token to call `/api/admin/health`
4. ✅ View metrics in Prometheus: [http://localhost:9090/graph](http://localhost:9090/graph)
5. ✅ View dashboard in Grafana: [http://localhost:3001/d/ims-backend-monitoring](http://localhost:3001/d/ims-backend-monitoring)

---

**Monitoring stack fully operational! 🎉**
