# Monitoring, Reporting & Observability Stack for Production IMS 2026

**Research Date:** 2026-02-05
**Status:** Comprehensive Analysis
**Stack:** Node.js + PostgreSQL + Keycloak + Elasticsearch

---

## Executive Summary

For a production IMS in 2026, a **three-layer observability architecture** is recommended:

1. **Metrics & Dashboards**: Prometheus + Grafana (open-source, proven, cost-effective)
2. **Logs**: Fluentd → Elasticsearch (or Grafana Loki for cost optimization)
3. **Traces**: OpenTelemetry + Jaeger (distributed tracing, API performance)
4. **Business Analytics**: Metabase (ease-of-use for non-technical teams)
5. **Alert Routing**: Prometheus AlertManager → Slack/PagerDuty/Email

This stack leverages your existing Elasticsearch deployment and avoids vendor lock-in while maintaining enterprise-grade observability.

---

## 1. MONITORING TOOLS

### 1.1 Prometheus + Grafana (RECOMMENDED)

**Why**: Industry standard for Kubernetes/cloud-native, excellent Node.js/PostgreSQL support, cost-effective, pre-built dashboards available.

#### Key Advantages
- **Free & Open-source** with massive ecosystem
- **Auto-discovery** in Docker/Kubernetes environments
- **PromQL**: Powerful, expressive query language
- **Alert generation** with AlertManager
- **Time-series DB**: Efficient storage for metrics
- **Grafana integration**: Drag-and-drop dashboarding

#### Architecture Overview
```
Applications (Node.js) → prom-client exporter
PostgreSQL → postgres_exporter (port 9187)
Elasticsearch → elasticsearch-exporter
Keycloak → Micrometer/OpenTelemetry bridge
     ↓
Prometheus (scrapes every 15-30s) → Time-series DB
     ↓
Grafana (queries Prometheus) → Dashboards
     ↓
AlertManager (routes alerts) → Slack/PagerDuty/Email
```

#### Setup for Your Stack

**Node.js Metrics** (prom-client):
- Event loop lag, active handles, GC metrics
- HTTP request latency & counts
- Custom business metrics (inventory operations, API calls)

**PostgreSQL Metrics** (postgres_exporter):
- Active connections, query performance
- Database locks, replication status
- Cache hit ratios, transaction throughput

**Elasticsearch Metrics** (elasticsearch-exporter):
- Cluster health, node status
- Index size, query latency
- Memory/JVM metrics

**Keycloak Metrics** (OpenTelemetry):
- Login success/failure counts
- Token refresh rates
- Authentication latency
- User session metrics

#### Grafana Dashboard Templates
- Pre-built: Node.js Application Dashboard, PostgreSQL Overview
- Import from Grafana Labs community (thousands available)
- Create inventory-specific dashboards: Stock levels, item movement, user actions

#### SLO/SLI Configuration
Grafana SLO feature automatically generates:
- **10-12 Prometheus recording rules** per SLO
- **Multi-window, multi-burn rate alerts** (fast vs slow degradation)
- **Error budget tracking** with automated dashboards
- Example SLO: 99.5% API availability, 200ms p99 latency

#### Cost Consideration
- **Free tier**: Unlimited metrics, full feature set
- **Grafana Cloud**: SaaS option, enterprise features (~$12-50/month depending on volume)

**Recommendation for IMS**: Self-hosted Prometheus + Grafana on existing infrastructure.

---

### 1.2 Datadog vs New Relic vs Elastic APM (Comparison)

| Feature | Datadog | New Relic | Elastic APM |
|---------|---------|-----------|------------|
| **Pricing Model** | Complex (per-host, per-GB logs, custom metrics) | Simpler, per-GB ingestion | Transparent bundled ($25/month) |
| **APM Strength** | Infrastructure + APM | Code profiling, diagnostics | Full observability stack |
| **Node.js Support** | Excellent | Excellent (auto-instrumentation) | Good |
| **PostgreSQL** | Deep monitoring | Good | Good |
| **Setup Ease** | Moderate | Easy | Easy |
| **Bill Shock Risk** | **HIGH** | Low-Moderate | Very Low |
| **Best For** | Multi-cloud infrastructure | Application profiling | Cost-conscious teams |

**Decision Matrix for IMS**:
- **Choose Datadog if**: Multi-cloud, complex infrastructure, unlimited budget
- **Choose New Relic if**: Deep code profiling, container-based, prefer guided UX
- **Choose Elastic APM if**: Cost-sensitive, want bundled stack, already using Elasticsearch
- **Choose Prometheus if**: Full control, open-source, cost is critical

**Recommendation for IMS**: Prometheus + Grafana (cost-effective for 2026 production, full control).

---

## 2. LOGGING STACK

### 2.1 Fluentd vs Logstash (Core Log Collectors)

#### Fluentd (RECOMMENDED for Docker/Containers)

**Why Choose Fluentd**:
- **Native Docker support**: Built-in fluentd logging driver
- **Memory efficient**: 40MB vs Logstash's 120MB
- **500+ plugins**: Massive ecosystem for integrations
- **Cloud-native**: Designed for Kubernetes/container environments
- **Dynamic environment support**: Quick adaptation to different scenarios

**Architecture for IMS**:
```
Docker containers (fluentd logging driver)
     ↓
Fluentd aggregator (fluent-bit on each host for lightweight collection)
     ↓
Elasticsearch (for indexing & storage)
     ↓
Kibana (visualization)
```

**Configuration (Docker Compose)**:
```yaml
logging:
  driver: fluentd
  options:
    fluentd-address: localhost:24224
    tag: "{{.ImageName}}.{{.Name}}"
```

#### Logstash (Alternative)

**When to use**:
- Need maximum flexibility & customization
- Complex log parsing & transformation
- Already invested in ELK ecosystem
- **Tradeoff**: Requires Filebeat agent on containers, higher resource usage

**Recommendation**: **Fluentd** for IMS (native Docker integration, lighter weight).

---

### 2.2 ELK Stack vs Grafana Loki (Centralized Logging)

#### Elasticsearch + Kibana (ELK)

**Advantages**:
- Full-text search on all log content
- Flexible schema, handles any JSON structure
- Machine Learning (anomaly detection)
- Mature, battle-tested

**Disadvantages**:
- **Expensive**: Indexes every word, requires large storage
- Complex to operate & optimize
- Steep learning curve for operators

**Cost Example**: 1 GB logs/day = ~500GB indexed storage/year = High costs

---

#### Grafana Loki (MODERN ALTERNATIVE)

**Advantages**:
- **10x cheaper**: Indexes only labels, stores compressed raw logs
- **Kubernetes-native**: Service discovery auto-collects logs from pods
- **Unified observability**: Metrics + Logs + Traces in single platform
- **Simple operation**: Minimal dependencies

**Disadvantages**:
- Full-text search requires scanning raw logs (slower)
- Newer ecosystem (less integrations)
- Structured logs with good labels required

**Architecture**:
```
Docker logs (Promtail agent) → Loki (indexes labels only)
                              ↓
                        Grafana (unified dashboards)
                        Prometheus (metrics)
                        Jaeger (traces)
```

**Cost Example**: Same 1 GB logs/day = ~100GB storage/year = ~10% ELK cost

**Recommendation for IMS**:
- **Use ELK** if: Already deployed, need full-text search, budget available
- **Use Loki** if: Cost-conscious, want simplicity, using Prometheus already

**For new IMS**: Start with **Loki + Fluentd** (low cost, unified with Grafana).

---

### 2.3 Log Retention & Rotation Policy

**Docker Container Log Rotation** (Critical for production):

```yaml
# docker-compose.yml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"      # Rotate at 100MB
        max-file: "10"        # Keep 10 rotated files
        labels: "service=inventory"
```

**Elasticsearch Retention Policy**:
```
Daily indices: inventory-logs-2026-02-05
ILM Policy: 30 days hot → 90 days warm → delete after 365 days
Estimated storage: ~500GB for 1 year (1GB/day ingestion)
```

**Grafana Loki Retention**:
```
Table retention period: 30 days (configurable)
Chunk age: 4 hours before upload to object storage
Storage: S3/GCS (very cheap long-term)
```

**Recommendation**:
- **Hot logs**: 7 days in Elasticsearch/Loki (searchable)
- **Warm logs**: 30-90 days in S3 (archived, queryable via backup)
- **Delete**: After 1 year or per compliance requirements

---

## 3. DISTRIBUTED TRACING

### 3.1 OpenTelemetry + Jaeger (RECOMMENDED)

**Why**: Vendor-neutral standard, auto-instrumentation of Node.js, identifies API bottlenecks.

#### Key Features

**Tracing Scope**:
- Follow single request across all services
- Identify slow services in chain (e.g., inventory lookup → database → Elasticsearch)
- Measure latency at each step
- Detect errors and exceptions with context

**Performance Bottleneck Example**:
```
User Request: Create Inventory Item (800ms total)
├─ API Gateway → Node.js (50ms)
├─ Database INSERT (200ms) ← BOTTLENECK
├─ Elasticsearch index (300ms) ← BOTTLENECK
├─ Keycloak auth check (100ms)
└─ Response (150ms)
```

#### Setup for Node.js

**Install OpenTelemetry packages**:
```bash
npm install \
  @opentelemetry/sdk-trace-node \
  @opentelemetry/instrumentation-express \
  @opentelemetry/instrumentation-http \
  @opentelemetry/instrumentation-pg \
  @opentelemetry/instrumentation-elasticsearch \
  @opentelemetry/exporter-jaeger
```

**Initialize tracer** (early in app startup):
```javascript
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const provider = new NodeTracerProvider();
const exporter = new JaegerExporter({
  host: 'jaeger-collector',
  port: 6831,
});

provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
```

**Automatic Instrumentation**:
- Express middleware: Captures HTTP requests
- node-postgres: Captures database queries
- Elasticsearch client: Captures search queries
- Keycloak client: Captures auth calls

#### Jaeger UI Features

- **Service topology**: Visual dependency graph (shows which services call which)
- **Trace timeline**: See exact latency of each operation
- **Error tracing**: Root cause analysis with full context
- **Span search**: Filter by tags (user_id, request_id, service)

#### Deployment

```
OpenTelemetry agents (in each container)
     ↓
Jaeger collector (localhost:6831)
     ↓
Jaeger query UI (localhost:16686)
     ↓
Elasticsearch (long-term storage of traces)
```

#### Configuration Example

```yaml
# docker-compose.yml
jaeger:
  image: jaegertracing/all-in-one:latest
  ports:
    - "6831:6831/udp"      # Agent
    - "16686:16686"         # UI
  environment:
    SPAN_STORAGE_TYPE: elasticsearch
    ES_SERVER_URLS: http://elasticsearch:9200
```

**Retention**: 72 hours in memory, longer in Elasticsearch storage.

---

### 3.2 Zipkin Alternative

- Simpler UI, similar capabilities
- Smaller ecosystem than Jaeger
- **Recommendation**: Use Jaeger (more mature, better performance at scale)

---

## 4. BUSINESS REPORTING & ANALYTICS

### 4.1 Metabase vs Redash vs Apache Superset

#### Metabase (RECOMMENDED for Non-Technical Users)

**Best For**: Business managers, non-SQL analysts, inventory dashboards.

**Advantages**:
- **Best UX**: Visual Query Builder (no SQL required)
- **Quick setup**: Run in Docker, connects to PostgreSQL immediately
- **Pre-built templates**: Drag-and-drop dashboard creation
- **Drill-down capability**: Click from summary to detail
- **Mobile-friendly**: View dashboards on phones

**Use Cases for IMS**:
- Stock level overview dashboard
- Top-selling items (inventory movement)
- User activity reports
- Daily sales/orders summary

**Setup**:
```yaml
metabase:
  image: metabase/metabase:latest
  ports:
    - "3000:3000"
  environment:
    MB_DB_TYPE: postgres
    MB_DB_DBNAME: inventory_db
```

---

#### Redash (For Engineering Teams)

**Best For**: SQL-savvy engineers, embedded analytics, fast dashboards.

- **Strength**: SQL queries first, lightweight
- **Developer-friendly**: API-driven, JSON-based
- **Performance**: Lower resource usage than Metabase

---

#### Apache Superset (For Maximum Customization)

**Best For**: Teams with dedicated DevOps/Python engineers, unlimited customization.

- **Strength**: Custom Python visualizations, full control
- **Tradeoff**: Requires engineering resources, steeper learning curve
- **Best performance**: At scale with many concurrent users

---

### 4.1 Recommended Analytics Stack for IMS

**Primary Tool**: Metabase
- Manager dashboards (stock levels, top items, revenue)
- User activity reports
- Sales trends

**Secondary Tool**: Grafana (for ops team)
- Infrastructure health
- API performance
- Database metrics

**Integration**: Connect both to PostgreSQL IMS database for real-time analytics.

---

## 5. INTEGRATION PATTERNS

### 5.1 Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ APPLICATION LAYER (Node.js)                            │
│ ├─ prom-client (metrics)                               │
│ ├─ OpenTelemetry SDK (tracing)                         │
│ ├─ winston/pino (structured logging)                   │
│ └─ node-postgres (PostgreSQL client)                   │
└────────────────────────────────────────────────────────┘
                          ↓↓↓
┌─────────────────────────────────────────────────────────┐
│ EXPORTERS & COLLECTORS                                  │
│ ├─ postgres_exporter (PostgreSQL metrics)              │
│ ├─ elasticsearch-exporter (ES metrics)                 │
│ ├─ Fluentd/Promtail (log collection)                  │
│ └─ OpenTelemetry Collector (trace forwarding)          │
└────────────────────────────────────────────────────────┘
                          ↓↓↓
┌─────────────────────────────────────────────────────────┐
│ CENTRAL METRICS & LOGGING                              │
│ ├─ Prometheus (metrics time-series DB)                 │
│ ├─ Elasticsearch (log storage & search)                │
│ ├─ Jaeger (trace storage)                             │
│ └─ Grafana Loki (alternative: log aggregation)        │
└────────────────────────────────────────────────────────┘
                          ↓↓↓
┌─────────────────────────────────────────────────────────┐
│ VISUALIZATION & ANALYSIS                               │
│ ├─ Grafana (unified dashboards: metrics+logs+traces)  │
│ ├─ Kibana (Elasticsearch interface)                   │
│ ├─ Jaeger UI (distributed tracing)                    │
│ ├─ Metabase (business analytics & BI)                │
│ └─ AlertManager (alert routing)                       │
└────────────────────────────────────────────────────────┘
                          ↓↓↓
┌─────────────────────────────────────────────────────────┐
│ ALERT ROUTING                                           │
│ ├─ Slack (#alerts, #incidents)                         │
│ ├─ PagerDuty (on-call incident management)             │
│ ├─ Email (escalation)                                 │
│ └─ Custom webhooks (internal systems)                 │
└────────────────────────────────────────────────────────┘
```

---

### 5.2 Prometheus Exporters Configuration

#### Node.js (prom-client)

```javascript
// middleware/metrics.js
const prometheus = require('prom-client');

// Metrics
const httpRequestDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  buckets: [0.1, 0.5, 1, 2, 5],
  labelNames: ['method', 'route', 'status_code'],
});

const inventoryOperations = new prometheus.Counter({
  name: 'inventory_operations_total',
  help: 'Total inventory operations',
  labelNames: ['operation', 'status'],
});

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path, res.statusCode)
      .observe(duration);
  });
  next();
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', prometheus.register.contentType);
  res.end(await prometheus.register.metrics());
});
```

#### PostgreSQL (postgres_exporter)

```bash
# Docker container
docker run -d \
  --name postgres_exporter \
  -e DATA_SOURCE_NAME="postgresql://user:pass@postgres:5432/inventory_db?sslmode=disable" \
  -p 9187:9187 \
  prometheuscommunity/postgres-exporter
```

Metrics exposed:
- `pg_stat_activity_count`: Active connections
- `pg_stat_statements_mean_time_ms`: Query latency
- `pg_cache_hits_ratio`: Cache efficiency
- `pg_connections_max`: Connection limits

#### Elasticsearch (elasticsearch-exporter)

```bash
docker run -d \
  --name es_exporter \
  -e ES_URI=http://elasticsearch:9200 \
  -p 9114:9114 \
  prometheuscommunity/elasticsearch-exporter
```

---

### 5.3 Grafana Data Source Configuration

**Add Prometheus**:
- URL: `http://prometheus:9090`
- Scrape interval: 15s
- Evaluation interval: 1m

**Add Elasticsearch** (for logs):
- URL: `http://elasticsearch:9200`
- Index: `logs-inventory-*`
- Timestamp field: `@timestamp`

**Add PostgreSQL** (direct query):
- Host: `postgres`
- Database: `inventory_db`
- User: `grafana`
- Password: (stored as secret)

---

### 5.4 AlertManager Configuration (Slack & PagerDuty)

#### Prometheus Rules File

```yaml
# /etc/prometheus/rules/inventory-alerts.yml
groups:
  - name: inventory-slos
    rules:
      # API Availability
      - alert: HighAPIErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
          team: backend
        annotations:
          summary: "API error rate > 5% ({{ $value }})"
          dashboard: "http://grafana:3000/d/api-health"

      # Database Performance
      - alert: HighDatabaseLatency
        expr: pg_stat_statements_mean_time_ms > 1000
        for: 5m
        labels:
          severity: warning
          team: database
        annotations:
          summary: "Database queries averaging {{ $value }}ms"

      # Elasticsearch
      - alert: ElasticsearchClusterUnhealthy
        expr: elasticsearch_cluster_health_status != 1
        for: 1m
        labels:
          severity: critical
          team: search
        annotations:
          summary: "Elasticsearch cluster status: {{ $value }}"

      # Disk Space
      - alert: DiskSpaceLow
        expr: (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Disk space < 10% on {{ $labels.device }}"
```

#### AlertManager Config

```yaml
# /etc/alertmanager/config.yml
global:
  resolve_timeout: 5m
  slack_api_url: "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

route:
  receiver: default-receiver
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 4h
  routes:
    # Critical alerts → PagerDuty + Slack
    - match:
        severity: critical
      receiver: pagerduty-critical
      continue: true

    # Warnings → Slack only
    - match:
        severity: warning
      receiver: slack-warnings

receivers:
  - name: default-receiver
    slack_configs:
      - channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

  - name: pagerduty-critical
    slack_configs:
      - channel: '#incidents'
        title: 'CRITICAL: {{ .GroupLabels.alertname }}'
    pagerduty_configs:
      - service_key: "YOUR_PAGERDUTY_KEY"
        description: '{{ .GroupLabels.alertname }}: {{ .Alerts.Firing | len }} firing'

  - name: slack-warnings
    slack_configs:
      - channel: '#ops-warnings'
```

#### PagerDuty Integration

```bash
# Test alert routing
curl -X POST http://alertmanager:9093/api/v1/alerts \
  -H 'Content-Type: application/json' \
  -d '{
    "alerts": [{
      "status": "firing",
      "labels": {
        "alertname": "HighAPIErrorRate",
        "severity": "critical"
      },
      "annotations": {
        "summary": "API error rate > 5%"
      }
    }]
  }'
```

---

## 6. KEYCLOAK MONITORING INTEGRATION

### 6.1 Keycloak OpenTelemetry Support (2025-2026)

**Keycloak 26+ Features**:
- Native OpenTelemetry export for logs
- Event metrics (logins, token refreshes, failures)
- Performance SLIs
- Micrometer metrics bridge

#### Keycloak Metrics Exposed

**Default endpoint**: `/q/metrics` (Prometheus format, no auth required)

```
# JVM Metrics
process_cpu_usage{...}
jvm_memory_used_bytes{area="heap"}
jvm_gc_pause_seconds{...}

# HTTP Request Metrics
http_server_requests_seconds_sum{method="POST",outcome="SUCCESS",status="200",...}

# Application Metrics
keycloak_logins_total{realm="inventory"}
keycloak_login_errors_total{realm="inventory",error_id="invalid_grant"}
keycloak_token_refreshes_total{realm="inventory"}
```

#### Integration Steps

1. **Enable metrics in Keycloak** (docker-compose):
```yaml
keycloak:
  environment:
    METRICS_ENABLED: true
    JAVA_OPTS: "-Dquarkus.micrometer.enabled=true"
```

2. **Add Prometheus scrape config**:
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'keycloak'
    static_configs:
      - targets: ['keycloak:8080']
    metrics_path: '/q/metrics'
    scrape_interval: 30s
```

3. **Create Grafana dashboard** (import community dashboard #10441)

---

### 6.2 Keycloak Event Logging

```yaml
# keycloak-events.yml (via config or admin API)
realm_events:
  enabled: true
  events_expiration: 604800  # 7 days
  events_listeners:
    - admin_event_listener
  events:
    - LOGIN
    - LOGIN_ERROR
    - REGISTER
    - LOGOUT
    - TOKEN_EXCHANGE
    - REFRESH_TOKEN
```

---

## 7. DEPLOYMENT STRATEGIES

### 7.1 Docker Compose Stack (Recommended for 2026)

```yaml
version: '3.8'
services:
  # Metrics Collection
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./alert-rules.yml:/etc/prometheus/rules/alert-rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  # Visualization
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana

  # Alert Routing
  alertmanager:
    image: prom/alertmanager:latest
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml

  # Logs Aggregation
  fluentd:
    image: fluent/fluentd:latest
    ports:
      - "24224:24224"
    volumes:
      - ./fluent.conf:/fluentd/etc/fluent.conf
    depends_on:
      - elasticsearch

  # Elasticsearch (existing)
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    # ... existing config ...

  # Kibana
  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch

  # Distributed Tracing
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "6831:6831/udp"
      - "16686:16686"
    environment:
      SPAN_STORAGE_TYPE: elasticsearch
      ES_SERVER_URLS: http://elasticsearch:9200

  # Business Analytics
  metabase:
    image: metabase/metabase:latest
    ports:
      - "3001:3000"
    environment:
      MB_DB_TYPE: postgres
      MB_DB_DBNAME: metabase_db

  # Postgres Exporter
  postgres_exporter:
    image: prometheuscommunity/postgres-exporter:latest
    ports:
      - "9187:9187"
    environment:
      DATA_SOURCE_NAME: "postgresql://user:pass@postgres:5432/inventory_db?sslmode=disable"

  # Elasticsearch Exporter
  elasticsearch_exporter:
    image: prometheuscommunity/elasticsearch-exporter:latest
    ports:
      - "9114:9114"
    environment:
      ES_URI: http://elasticsearch:9200

volumes:
  prometheus_data:
  grafana_data:
```

---

### 7.2 Kubernetes Deployment

For production Kubernetes cluster:

**Use Helm charts**:
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add elastic https://helm.elastic.co

# Install stack
helm install prometheus prometheus-community/kube-prometheus-stack
helm install grafana grafana/grafana
helm install elasticsearch elastic/elasticsearch
helm install kibana elastic/kibana
helm install jaeger jaegertracing/jaeger
```

**ServiceMonitor for Prometheus discovery**:
```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: inventory-app
spec:
  selector:
    matchLabels:
      app: inventory
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

---

## 8. COST ANALYSIS (Annual 2026)

### Option A: Prometheus + Grafana + Loki (RECOMMENDED)

| Component | Cost/Year | Notes |
|-----------|-----------|-------|
| Prometheus (OSS) | $0 | Self-hosted |
| Grafana OSS | $0 | Self-hosted |
| Grafana Cloud (optional) | $12-100 | For SaaS convenience |
| Grafana Loki (OSS) | $0 | Self-hosted |
| Jaeger (OSS) | $0 | Self-hosted |
| S3 storage (logs, long-term) | $300-500 | ~100GB archived logs/year |
| Infrastructure (VM/Server) | $1000-2000 | Single node for stack |
| **TOTAL** | **$1300-2600** | Fully controlled, no surprises |

### Option B: ELK Stack + Prometheus + Grafana

| Component | Cost/Year | Notes |
|-----------|-----------|-------|
| Elasticsearch (OSS) | $0 | Self-hosted |
| Kibana (OSS) | $0 | Self-hosted |
| Logstash (OSS) | $0 | Self-hosted |
| Filebeat (OSS) | $0 | Self-hosted |
| Infrastructure (larger VM) | $2000-4000 | Need bigger specs |
| **TOTAL** | **$2000-4000** | Higher resource overhead |

### Option C: Datadog (SaaS)

| Component | Cost/Year | Notes |
|-----------|-----------|-------|
| APM (per-host) | $15/host × 2 × 12 = $360 | 2 instances |
| Log ingestion (per-GB) | $0.10 × 365GB × 12 = $438 | 1GB/day |
| **TOTAL (low estimate)** | **$800** | Often exceeds due to custom metrics |
| **TOTAL (realistic)** | **$3000-5000** | "Bill shock" from hidden fees |

### Option D: New Relic (SaaS)

| Component | Cost/Year | Notes |
|-----------|-----------|-------|
| Pro tier (per-GB) | $0.30 × 365GB = $110/month | More transparent |
| **TOTAL** | **$1320** | Simpler pricing, good APM |

---

## 9. IMPLEMENTATION ROADMAP

### Phase 1: Core Metrics (Week 1-2)
- [ ] Deploy Prometheus + Grafana
- [ ] Configure prom-client in Node.js app
- [ ] Setup postgres_exporter
- [ ] Create basic dashboards

### Phase 2: Logging (Week 2-3)
- [ ] Deploy Fluentd/Promtail
- [ ] Configure log forwarding to Elasticsearch
- [ ] Setup Kibana dashboards
- [ ] Define log retention policies

### Phase 3: Tracing (Week 3-4)
- [ ] Install OpenTelemetry packages in Node.js
- [ ] Deploy Jaeger
- [ ] Create span processors
- [ ] Test trace collection

### Phase 4: Alerting (Week 4)
- [ ] Configure AlertManager
- [ ] Setup Slack webhook
- [ ] Define SLOs and alert rules
- [ ] Test alert routing

### Phase 5: Business Analytics (Week 5)
- [ ] Deploy Metabase
- [ ] Connect to PostgreSQL
- [ ] Create inventory dashboards
- [ ] Share with stakeholders

### Phase 6: Monitoring Keycloak (Week 5)
- [ ] Enable Keycloak metrics endpoint
- [ ] Configure Prometheus scraping
- [ ] Create auth/identity dashboards
- [ ] Setup event logging

### Phase 7: Optimization & Documentation (Week 6)
- [ ] Fine-tune scrape intervals
- [ ] Establish on-call runbooks
- [ ] Document dashboards & alerts
- [ ] Train team

---

## 10. BEST PRACTICES & RECOMMENDATIONS

### Metrics
- **Scrape Interval**: 15-30s (balance between precision and load)
- **Retention**: 15 days in Prometheus (long-term: Thanos or S3)
- **Labels**: Use consistent labeling (team, service, severity)
- **SLOs**: Define 2-3 key SLOs per service (availability, latency, error rate)

### Logs
- **Structured Logging**: Use JSON format with consistent fields
- **Retention**: 7 days hot, 30-90 days warm, 1 year archive
- **Sampling**: For high-volume services, sample logs above threshold
- **Labels/Tags**: Environment, service, level, request_id

### Traces
- **Sampling Rate**: 10-100% in prod (depends on volume)
- **Retention**: 72 hours in Jaeger, longer in Elasticsearch
- **Instrumentation**: Auto-instrument key libraries (Express, pg, Elasticsearch)
- **Custom spans**: Add business-level spans (inventory operations)

### Alerts
- **On-call rotation**: Clear escalation path
- **Alert fatigue**: Alert on business impact, not every threshold breach
- **Runbooks**: Document resolution steps for each alert
- **SLO-based**: Use burn-rate alerts, not raw thresholds

### Security
- **Grafana auth**: Enable RBAC, OAuth/OIDC integration
- **API access**: Restrict Prometheus/Elasticsearch API to trusted IPs
- **Secrets**: Store credentials in `.env` files or vaults
- **Audit logs**: Track who accessed what in Grafana

### Cost Control
- **Retention limits**: Don't keep everything forever
- **Cardinality control**: Avoid high-cardinality labels (user_id, IP)
- **Open-source first**: Use OSS for cost savings
- **Resource limits**: Set memory limits on containers

---

## 11. UNRESOLVED QUESTIONS

1. **Existing Elasticsearch Usage**: Are you currently using Elasticsearch for anything besides logs? (Affects ELK vs Loki decision)

2. **Compliance Requirements**: Any regulatory requirements (GDPR, HIPAA) affecting data retention or audit logging?

3. **Scale Projections**: Expected growth in log volume, metric cardinality, trace volume by end of 2026?

4. **Team Expertise**: Do you have Prometheus/Grafana experience in-house, or would you prefer vendor-managed SaaS?

5. **Multi-Region**: Are you deploying to multiple regions/cloud providers, requiring cross-region observability?

6. **Historical Data**: Do you need to keep historical data for analytics/reporting beyond standard retention?

---

## FINAL RECOMMENDATION SUMMARY

**For Production IMS in 2026**:

```
METRICS:      Prometheus + Grafana (cost-effective, proven)
LOGS:         Fluentd → Elasticsearch (leverage existing ES)
              OR Grafana Loki (if cost is critical)
TRACES:       OpenTelemetry + Jaeger (open standard)
ANALYTICS:    Metabase (business users)
ALERTS:       Prometheus AlertManager → Slack/PagerDuty
KEYCLOAK:     OpenTelemetry metrics + event logging
DEPLOYMENT:   Docker Compose (small-medium) or K8s (enterprise)
COST:         $1,300-2,600/year (OSS) vs $3,000-5,000/year (SaaS)
```

**Key Advantages**:
- Full control, no vendor lock-in
- Cost predictable and low
- Proven ecosystem with 1000s of integrations
- Team can debug & optimize directly
- Scales from startup to enterprise

**Next Steps**:
1. Review this analysis with team
2. Answer unresolved questions (Section 11)
3. Create implementation plan using phased roadmap (Section 9)
4. Delegate to planner agent for detailed execution tasks

---

## SOURCES

- [Grafana Prometheus Monitoring Guides](https://grafana.com/docs/prometheus/)
- [ELK Stack Docker Deployment](https://github.com/deviantony/docker-elk)
- [OpenTelemetry Node.js Documentation](https://opentelemetry.io/docs/instrumentation/js/)
- [Grafana Loki vs ELK Stack Comparison](https://grafana.com/blog/loki-vs-elk/)
- [Prometheus AlertManager Configuration](https://prometheus.io/docs/alerting/latest/configuration/)
- [Keycloak Metrics & Observability](https://www.keycloak.org/observability/configuration-metrics)
- [Metabase vs Redash vs Superset Analysis](https://hevodata.com/blog/superset-vs-metabase-vs-redash/)
- [Datadog vs New Relic 2026 Comparison](https://betterstack.com/community/comparisons/datadog-vs-newrelic/)
- [Fluentd vs Logstash 2026](https://betterstack.com/community/comparisons/fluentd-vs-logstash/)
- [Docker Log Rotation Best Practices](https://signoz.io/blog/docker-log-rotation/)

---

**Report Generated**: 2026-02-05
**Researcher ID**: a35a22b
**Token Efficiency**: Comprehensive research spanning 12+ sources with synthesis
