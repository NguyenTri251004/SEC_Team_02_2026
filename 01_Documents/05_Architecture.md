# 05_Architecture - Modern IMS (2026)

## 1. Tổng quan kiến trúc

Hệ thống **Inventory Management System** được thiết kế theo mô hình **Hybrid Modular Architecture** kết hợp:
- **Modular Monolith Core** với khả năng extract services khi cần
- **Event-driven patterns** cho real-time capabilities
- **Cloud-native deployment** với containerization
- **AI/ML capabilities** cho intelligent operations
- **Comprehensive observability** cho production reliability

### 1.1 Kiến trúc tổng thể (Solution Sketch)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                        IMS ARCHITECTURE 2026                                    │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  CLIENT LAYER                                                             │ │
│  │  ────────────────────────────────────────────────────────────────────── │ │
│  │  • Web Browser (React SPA)                                               │ │
│  │  • Mobile Browser (Responsive)                                           │ │
│  │  • Real-time Updates (WebSocket)                                        │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                              │                                                 │
│                              │ HTTPS + JWT + WebSocket                         │
│                              ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  API GATEWAY (Kong/NGINX)                                                │ │
│  │  • Routing, Auth Verification, Rate Limiting                            │ │
│  │  • Load Balancing, SSL Termination                                      │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                              │                                                 │
│                              ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  APPLICATION LAYER (Modular Monolith)                                    │ │
│  │  ────────────────────────────────────────────────────────────────────── │ │
│  │  CORE MODULES:                                                           │ │
│  │  ├─ Inventory Module (Stock Management, Lots, Transactions)             │ │
│  │  ├─ QC Module (Quality Control, Approval/Reject)                        │ │
│  │  ├─ Production Module (Batches, Components)                             │ │
│  │  ├─ Reporting Module (Analytics, Audit Logs)                            │ │
│  │  └─ User Management (RBAC integration with Keycloak)                    │ │
│  │                                                                           │ │
│  │  AI/ML SERVICES (FastAPI):                                               │ │
│  │  ├─ Semantic Search (Elasticsearch + Vector Embeddings)                  │ │
│  │  ├─ Demand Forecasting (Prophet + LSTM)                                 │ │
│  │  ├─ Anomaly Detection (Isolation Forest)                                │ │
│  │  ├─ QC Vision (YOLOv8 - Computer Vision)                               │ │
│  │  └─ LLM Chatbot (Claude API)                                            │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                              │                                                 │
│                              │ Event Bus (Kafka/RabbitMQ)                      │
│                              ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  DATA & INFRASTRUCTURE LAYER                                             │ │
│  │  ────────────────────────────────────────────────────────────────────── │ │
│  │  PRIMARY STORAGE:                                                         │ │
│  │  ├─ PostgreSQL 15+ (OLTP - inventory data)                              │ │
│  │  ├─ Redis (Cache - stock levels, sessions)                              │ │
│  │  └─ Elasticsearch 8.12+ (Search + Vectors)                              │ │
│  │                                                                           │ │
│  │  IDENTITY & ACCESS:                                                       │ │
│  │  └─ Keycloak 24+ (SSO, RBAC, OAuth2/OIDC)                               │ │
│  │                                                                           │ │
│  │  OBSERVABILITY STACK:                                                     │ │
│  │  ├─ Prometheus + Grafana (Metrics & Dashboards)                         │ │
│  │  ├─ Fluentd → Elasticsearch (Logs)                                      │ │
│  │  ├─ OpenTelemetry + Jaeger (Traces)                                     │ │
│  │  ├─ Metabase (Business Analytics)                                       │ │
│  │  └─ AlertManager (Slack/PagerDuty)                                      │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐ │
│  │  DEPLOYMENT & ORCHESTRATION                                              │ │
│  │  ────────────────────────────────────────────────────────────────────── │ │
│  │  • Docker Containers (All services)                                      │ │
│  │  • Kubernetes/Docker Compose (Orchestration)                             │ │
│  │  • GitHub Actions (CI/CD Pipeline)                                       │ │
│  │  • PostgreSQL Backups (Automated)                                        │ │
│  └──────────────────────────────────────────────────────────────────────────┘ │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Các góc nhìn kiến trúc (4+1 View Model)

### 2.1 Góc nhìn nghiệp vụ (Business View)

- **User Roles:**
  - `Admin` - Quản trị hệ thống, cấu hình, user management
  - `InventoryManager` - Quản lý kho, nhập/xuất hàng, truy xuất
  - `QualityControl` - Kiểm tra chất lượng, approve/reject lots
  - `Production` - Tạo lô sản xuất, quản lý batches
  - `Viewer` - Xem báo cáo, dashboard (read-only)

- **Core Workflows:**
  - **Receiving:** Nhập kho → Tạo InventoryLot → QC Testing → Approve/Reject
  - **Production:** Tạo ProductionBatch → Consume materials → Track components
  - **Labeling:** Generate labels (QR/Barcode) → Print
  - **Real-time Monitoring:** WebSocket updates → Live dashboards
  - **AI-Assisted Operations:** Demand forecasting → Auto-reorder suggestions → Anomaly alerts

---

### 2.2 Góc nhìn phát triển (Development View)

#### 2.2.1 Kiến trúc phân lớp (Layered Architecture)

```
┌────────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (React)                                        │
│  ────────────────────────────────────────────────────────────────  │
│  • Components (Ant Design UI)                                      │
│  • Pages/Routes (React Router v6)                                  │
│  • State Management (React Query + Zustand)                        │
│  • Real-time Updates (WebSocket client)                            │
│  • Keycloak Auth Integration (@react-keycloak/web)                │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ REST API (JSON) + WebSocket
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  APPLICATION/SERVICE LAYER (Node.js + Express)                    │
│  ────────────────────────────────────────────────────────────────  │
│  • Controllers (Route handlers)                                    │
│  • Middleware (Auth, Validation, Error Handling)                   │
│  • Services (Business logic modules)                               │
│  • WebSocket Server (Real-time events)                            │
│  • API Documentation (Swagger/OpenAPI)                             │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ Internal Module Calls + Events
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  DOMAIN/BUSINESS LOGIC LAYER                                       │
│  ────────────────────────────────────────────────────────────────  │
│  CORE DOMAIN MODULES (Bounded Contexts):                           │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Inventory Module                                             │  │
│  │ • Stock levels, reservations, transfers                      │  │
│  │ • Lot tracking (expiry, status)                             │  │
│  │ • Transactions (receive, issue, adjust)                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Quality Control Module                                       │  │
│  │ • QC tests (sampling, results)                              │  │
│  │ • Approval/Rejection workflow                                │  │
│  │ • Quarantine enforcement                                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Production Module                                            │  │
│  │ • Batch creation/management                                  │  │
│  │ • Component tracking (materials → batches)                  │  │
│  │ • Production history                                         │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Reporting & Analytics Module                                 │  │
│  │ • KPI calculations                                           │  │
│  │ • Audit trail                                                │  │
│  │ • Traceability (lot → batch → product)                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ AI/ML Module (FastAPI Services)                             │  │
│  │ • Semantic search engine                                     │  │
│  │ • Demand forecasting (Prophet + LSTM)                       │  │
│  │ • Anomaly detection (Isolation Forest)                      │  │
│  │ • Computer vision QC (YOLOv8)                               │  │
│  │ • LLM chatbot assistant                                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  CROSS-CUTTING CONCERNS:                                           │
│  • Validation (Joi/Zod schemas)                                    │
│  • Logging (Winston structured logs)                               │
│  • Error handling (Custom exceptions)                              │
│  • Event publishing (Internal event bus)                           │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ ORM (Sequelize) + Direct Queries
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  DATA ACCESS LAYER                                                 │
│  ────────────────────────────────────────────────────────────────  │
│  • Sequelize Models (ORM)                                          │
│  • Database Migrations (Sequelize CLI)                             │
│  • Connection Pooling                                              │
│  • Query Optimization (Indexes, Views)                             │
│  • Cache Integration (Redis)                                       │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  DATABASE LAYER                                                    │
│  ────────────────────────────────────────────────────────────────  │
│  • PostgreSQL 15+ (Primary OLTP)                                   │
│  • Redis (Cache - hot data <100ms)                                │
│  • Elasticsearch (Search + Vectors)                                │
└────────────────────────────────────────────────────────────────────┘
```

#### 2.2.2 Modular Monolith Pattern (Recommended)

**Lý do chọn Modular Monolith:**
- Team nhỏ (<20 engineers) - phù hợp single deployable unit
- Giảm operational complexity (vs full microservices)
- 42% organizations đang consolidate microservices về modular monolith (2026 trend)
- Dễ testing, debugging hơn microservices
- **Khả năng extract services sau:** Khi cần scale, extract "hot paths" thành độc lập

**Internal Module Communication:**
```javascript
// Internal event bus (in-process)
eventEmitter.emit('inventory.lot.created', { lotNumber, materialId });

// Module boundaries via interfaces
inventoryModule.reserveStock({ sku, quantity });
qcModule.approveL(lotNumber);
```

**Selective Service Extraction (Future):**
```
Monolith Core (95% traffic):
├─ Inventory, QC, Production, Reporting

Extracted Services (hot paths):
├─ Real-time Stock Updates (WebSocket service)
├─ AI/ML Inference (FastAPI - already separate)
└─ Notification Service (high concurrency)
```

---

### 2.3 Góc nhìn quy trình (Process View)

#### 2.3.1 Concurrency & Task Distribution

**1. Request Processing Model:**

```
Client Request → API Gateway (Load Balancer)
                      ↓
           ┌──────────────────────────┐
           │  Node.js Cluster         │
           │  ├─ Worker 1 (CPU core)  │
           │  ├─ Worker 2             │
           │  ├─ Worker 3             │
           │  └─ Worker 4             │
           └──────────────────────────┘
                      ↓
           ┌──────────────────────────┐
           │  Connection Pool         │
           │  PostgreSQL (max 20)     │
           │  Redis (max 50)          │
           └──────────────────────────┘
```

**Concurrency Strategy:**
- **Node.js Cluster Mode:** 1 worker per CPU core (4-8 workers)
- **PostgreSQL Pool:** Max 20 connections per instance
- **Redis Pool:** Max 50 connections (lightweight)
- **Async/Await:** Non-blocking I/O for all database calls

**2. Real-Time Updates Flow:**

```
Database Change (Inventory Update)
          ↓
    Trigger Event
          ↓
    Event Publisher
          ↓
    Message Queue (Kafka/RabbitMQ)
          ↓
    WebSocket Server
          ↓
    Broadcast to Connected Clients
          ↓
    Frontend Updates (React state)
```

**Performance Target:**
- API response: <200ms (p99)
- WebSocket latency: <100ms
- Database query: <50ms (p95)

**3. Task Distribution Patterns:**

| Operation | Pattern | Rationale |
|-----------|---------|-----------|
| **Stock Lookup** | Direct DB query + Redis cache | <100ms read, 80/20 rule (hot SKUs) |
| **Lot Creation** | Sync write + Async event | Ensure data consistency, notify async |
| **QC Approval** | Optimistic locking | Prevent concurrent approval conflicts |
| **Demand Forecast** | Batch processing (daily) | Non-realtime, GPU training |
| **Anomaly Detection** | Stream processing (Kafka) | Continuous monitoring |
| **Search** | Elasticsearch hybrid (kNN + keyword) | Sub-second semantic search |

**4. Event-Driven Architecture (CQRS Light)**

```
Write Model (Commands):
├─ CreateLot → PostgreSQL insert
├─ ApproveLot → Status update
└─ ReserveStock → Transaction

Event Bus:
├─ LotCreated event
├─ LotApproved event
└─ StockReserved event

Read Model (Queries - Eventual Consistency):
├─ Elasticsearch index (search)
├─ Redis cache (hot data)
└─ Materialized views (reporting)
```

**Benefits:**
- Read queries 10-100x faster (denormalized, precomputed)
- Write operations independent of read load
- Supports real-time dashboards

---

### 2.4 Góc nhìn dữ liệu (Data View)

Database schema giữ nguyên như đã thiết kế:
- [Database Schema Visualization](https://nhbien.github.io/inventory-mangement-system-database-schema/)

**Polyglot Persistence Strategy:**

```
┌────────────────────────────────────────────────────────────┐
│  DATA STORAGE ARCHITECTURE                                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Layer 1: Real-time Cache (Redis)                         │
│  • Stock levels by SKU (TTL: 5 min)                       │
│  • Top 1000 SKUs (80/20 rule)                             │
│  • Session data, rate limiting                             │
│  • Response time: <10ms                                    │
│                                                            │
│  Layer 2: Primary OLTP (PostgreSQL)                       │
│  • All inventory records                                   │
│  • Transactional data (ACID compliance)                   │
│  • Audit logs                                              │
│  • Response time: 10-100ms                                 │
│                                                            │
│  Layer 3: Search & Vectors (Elasticsearch)                │
│  • Full-text search                                        │
│  • Semantic search (vector embeddings)                    │
│  • Log aggregation                                         │
│  • Response time: 50-200ms                                 │
│                                                            │
│  Layer 4: Analytics (Future - Optional)                   │
│  • Data warehouse (Snowflake/BigQuery)                    │
│  • Daily snapshots from PostgreSQL                         │
│  • Historical trends, ML features                          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Cache Invalidation Pattern:**
```
1. Write to PostgreSQL (definitive source)
2. Publish event to Kafka/RabbitMQ
3. Redis consumer updates cache (async, <1 second)
4. Elasticsearch indexer updates search (async, <5 seconds)
```

**Data Consistency Model:**
- **Strong Consistency:** PostgreSQL (transactions, inventory)
- **Eventual Consistency:** Redis (cache), Elasticsearch (search)
- **Acceptable lag:** <5 seconds for most operations

---

### 2.5 Góc nhìn triển khai (Deployment/Physical View)

#### 2.5.1 Container Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  DOCKER COMPOSE STACK (Development/Staging)                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Frontend       │  │ Backend        │  │ AI/ML API     │ │
│  │ (React:5173)   │  │ (Node.js:3000) │  │ (FastAPI:8000)│ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│          │                   │                    │          │
│          └───────────────────┴────────────────────┘          │
│                              │                               │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ PostgreSQL     │  │ Redis          │  │ Elasticsearch │ │
│  │ (:5432)        │  │ (:6379)        │  │ (:9200)       │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Keycloak       │  │ Prometheus     │  │ Grafana       │ │
│  │ (:8080)        │  │ (:9090)        │  │ (:3001)       │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐ │
│  │ Jaeger         │  │ Metabase       │  │ Fluentd       │ │
│  │ (:16686)       │  │ (:3002)        │  │ (:24224)      │ │
│  └────────────────┘  └────────────────┘  └───────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

#### 2.5.2 Kubernetes Deployment (Production - Optional)

```yaml
Production Environment:
├── Namespace: production
│   ├── Frontend (3 replicas, auto-scale 3-10)
│   ├── Backend (5 replicas, auto-scale 5-20)
│   ├── AI/ML API (2 replicas with GPU)
│   ├── PostgreSQL (1 primary + 2 replicas)
│   ├── Redis Cluster (3 nodes)
│   └── Elasticsearch (3 nodes)
│
├── Namespace: monitoring
│   ├── Prometheus (1 replica)
│   ├── Grafana (2 replicas)
│   └── Jaeger (1 replica)
│
└── Namespace: security
    └── Keycloak (2 replicas)
```

**Auto-scaling Triggers:**
- Backend API: CPU >70% → Scale up
- Inventory service: Order rate >100/sec → Scale to 20 replicas
- AI/ML API: Queue length >50 → Add GPU instance

---

#### 2.5.3 Chi tiết Deployment theo thành phần

##### A. FRONTEND DEPLOYMENT

**Option 1: CDN/Edge Deployment (RECOMMENDED for Production)**

```
┌────────────────────────────────────────────────────────────┐
│  FRONTEND CDN ARCHITECTURE                                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Build Process:                                         │
│     npm run build (Vite)                                   │
│     ↓                                                      │
│     Static files: HTML, JS, CSS, Assets                   │
│     ↓                                                      │
│  2. Deploy to CDN:                                         │
│     • Vercel (RECOMMENDED)                                 │
│       - Auto SSL, Git integration                          │
│       - Global CDN (100+ locations)                        │
│       - Cost: FREE for small teams                         │
│       - Deploy: vercel --prod                              │
│                                                            │
│     • Cloudflare Pages                                     │
│       - Free tier generous                                 │
│       - DDoS protection included                           │
│       - Deploy: wrangler pages deploy dist/                │
│                                                            │
│     • Netlify                                              │
│       - Easy setup, auto deploy                            │
│       - Cost: FREE for <100GB bandwidth                    │
│                                                            │
│  3. Configuration:                                         │
│     • Environment Variables:                               │
│       VITE_API_URL=https://api.yourdomain.com             │
│       VITE_KEYCLOAK_URL=https://auth.yourdomain.com       │
│       VITE_WS_URL=wss://api.yourdomain.com/ws             │
│                                                            │
│  4. Custom Domain:                                         │
│     app.yourdomain.com → CDN                              │
│     (A/CNAME record in DNS)                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Option 2: Self-Hosted with NGINX (Cost-effective)**

```
┌────────────────────────────────────────────────────────────┐
│  NGINX STATIC FILE SERVING                                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Server: VPS (Same server as Backend)                     │
│  ├── NGINX Config:                                         │
│  │   server {                                             │
│  │     listen 80;                                         │
│  │     server_name app.yourdomain.com;                   │
│  │                                                        │
│  │     # Redirect to HTTPS                                │
│  │     return 301 https://$server_name$request_uri;      │
│  │   }                                                    │
│  │                                                        │
│  │   server {                                             │
│  │     listen 443 ssl http2;                             │
│  │     server_name app.yourdomain.com;                   │
│  │                                                        │
│  │     # SSL Configuration                                │
│  │     ssl_certificate /etc/ssl/cert.pem;                │
│  │     ssl_certificate_key /etc/ssl/key.pem;             │
│  │                                                        │
│  │     # Frontend static files                            │
│  │     root /var/www/ims-frontend/dist;                  │
│  │     index index.html;                                  │
│  │                                                        │
│  │     # SPA routing (React Router)                       │
│  │     location / {                                       │
│  │       try_files $uri $uri/ /index.html;               │
│  │     }                                                  │
│  │                                                        │
│  │     # Cache static assets                              │
│  │     location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {│
│  │       expires 1y;                                      │
│  │       add_header Cache-Control "public, immutable";   │
│  │     }                                                  │
│  │                                                        │
│  │     # API Proxy (Backend)                              │
│  │     location /api/ {                                   │
│  │       proxy_pass http://localhost:3000;               │
│  │       proxy_http_version 1.1;                         │
│  │       proxy_set_header Upgrade $http_upgrade;         │
│  │       proxy_set_header Connection 'upgrade';          │
│  │       proxy_set_header Host $host;                    │
│  │     }                                                  │
│  │   }                                                    │
│  └────────────────────────────────────────────────────────│
│                                                            │
│  Deployment Script:                                        │
│  #!/bin/bash                                               │
│  cd /var/www/ims-frontend                                 │
│  git pull origin master                                    │
│  npm install                                               │
│  npm run build                                             │
│  sudo systemctl reload nginx                               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Option 3: Docker Container (Development/Staging)**

```dockerfile
# Dockerfile.frontend
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Frontend Deployment Comparison:**

| Option | Cost | Performance | Complexity | Best For |
|--------|------|-------------|------------|----------|
| **Vercel** | FREE-$20/mo | Excellent (Global CDN) | Very Low | Production (RECOMMENDED) |
| **Cloudflare Pages** | FREE | Excellent | Low | Production |
| **NGINX Self-hosted** | $0 (VPS included) | Good | Medium | Budget-conscious |
| **Docker Container** | $0 (VPS included) | Good | Medium | Consistent env |

---

##### B. BACKEND DEPLOYMENT

**Option 1: Docker Container on VPS (RECOMMENDED)**

```
┌────────────────────────────────────────────────────────────┐
│  BACKEND DOCKER DEPLOYMENT                                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Infrastructure:                                           │
│  • VPS Provider: Hetzner / DigitalOcean / Vultr           │
│  • Specs: 16GB RAM, 4 vCPU, 200GB SSD                     │
│  • Cost: $80-150/month                                     │
│  • OS: Ubuntu 22.04 LTS                                    │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  VPS Server (IP: 123.456.789.0)                       │ │
│  │  ────────────────────────────────────────────────────│ │
│  │                                                        │ │
│  │  NGINX Reverse Proxy (:80, :443)                      │ │
│  │  • SSL Termination (Let's Encrypt)                    │ │
│  │  • Load Balancing (if multiple backends)              │ │
│  │  • Rate Limiting                                       │ │
│  │         ↓                                              │ │
│  │  Backend Containers (Docker Compose)                  │ │
│  │  ├── backend-1 (:3000) ──────┐                        │ │
│  │  ├── backend-2 (:3001)        │ NGINX upstream        │ │
│  │  └── backend-3 (:3002) ──────┘                        │ │
│  │         ↓                                              │ │
│  │  Databases (Docker Containers)                        │ │
│  │  ├── PostgreSQL (:5432)                               │ │
│  │  ├── Redis (:6379)                                    │ │
│  │  └── Elasticsearch (:9200)                            │ │
│  │                                                        │ │
│  │  Monitoring Stack                                      │ │
│  │  ├── Prometheus (:9090)                               │ │
│  │  ├── Grafana (:3001)                                  │ │
│  │  └── Jaeger (:16686)                                  │ │
│  │                                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Docker Compose Setup:                                     │
│  ──────────────────────────────────────────────────────── │
│  version: '3.8'                                            │
│  services:                                                 │
│    backend:                                                │
│      build: ./backend                                      │
│      image: ims-backend:latest                            │
│      deploy:                                               │
│        replicas: 3                                         │
│        resources:                                          │
│          limits:                                           │
│            cpus: '1'                                       │
│            memory: 2G                                      │
│      environment:                                          │
│        - NODE_ENV=production                               │
│        - DATABASE_URL=postgresql://user:pass@postgres/ims │
│        - REDIS_URL=redis://redis:6379                     │
│        - KEYCLOAK_URL=https://auth.yourdomain.com         │
│      ports:                                                │
│        - "3000-3002:3000"                                  │
│      restart: always                                       │
│      healthcheck:                                          │
│        test: ["CMD", "curl", "-f", "http://localhost:3000/health"]│
│        interval: 30s                                       │
│        timeout: 10s                                        │
│        retries: 3                                          │
│      logging:                                              │
│        driver: "fluentd"                                   │
│        options:                                            │
│          fluentd-address: localhost:24224                  │
│          tag: backend.{{.Name}}                            │
│                                                            │
│  Deployment Process:                                       │
│  1. SSH to VPS: ssh user@123.456.789.0                    │
│  2. Pull latest code: cd /opt/ims && git pull             │
│  3. Build image: docker-compose build backend             │
│  4. Deploy: docker-compose up -d --scale backend=3        │
│  5. Health check: curl https://api.yourdomain.com/health  │
│                                                            │
│  CI/CD (GitHub Actions):                                   │
│  name: Deploy Backend                                      │
│  on:                                                       │
│    push:                                                   │
│      branches: [master]                                    │
│  jobs:                                                     │
│    deploy:                                                 │
│      runs-on: ubuntu-latest                                │
│      steps:                                                │
│        - uses: actions/checkout@v3                         │
│        - name: Deploy to VPS                               │
│          uses: appleboy/ssh-action@master                  │
│          with:                                             │
│            host: ${{ secrets.VPS_HOST }}                   │
│            username: ${{ secrets.VPS_USER }}               │
│            key: ${{ secrets.SSH_PRIVATE_KEY }}             │
│            script: |                                       │
│              cd /opt/ims                                   │
│              git pull                                      │
│              docker-compose up -d --build backend          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Option 2: Kubernetes (Production - High Scale)**

```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ims-backend
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: ims-backend
  template:
    metadata:
      labels:
        app: ims-backend
    spec:
      containers:
      - name: backend
        image: registry.yourdomain.com/ims-backend:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: ims-backend-service
spec:
  selector:
    app: ims-backend
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ims-backend-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ims-backend
  minReplicas: 5
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

**Option 3: Cloud Managed Services**

| Provider | Service | Cost (est.) | Use Case |
|----------|---------|-------------|----------|
| **AWS** | Elastic Beanstalk | $100-300/mo | Easy scaling, managed |
| **Google Cloud** | Cloud Run | $50-200/mo | Serverless, auto-scale |
| **Azure** | App Service | $80-250/mo | Enterprise integration |
| **Heroku** | Standard Dynos | $150-400/mo | Rapid deployment |

**Backend Deployment Comparison:**

| Option | Cost | Scalability | Control | Complexity | Best For |
|--------|------|-------------|---------|------------|----------|
| **Docker on VPS** | $80-150/mo | Medium | Full | Medium | Small-medium teams (RECOMMENDED) |
| **Kubernetes** | $300-1000/mo | High | Full | High | Large scale (>50K users) |
| **Cloud Managed** | $100-400/mo | High | Limited | Low | Fast deployment, less DevOps |

---

##### C. DATABASE DEPLOYMENT

**Option 1: Self-Hosted on VPS (RECOMMENDED for Control)**

```
┌────────────────────────────────────────────────────────────┐
│  DATABASE SELF-HOSTED ARCHITECTURE                         │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  VPS Configuration:                                         │
│  • Dedicated DB Server OR Same VPS as Backend             │
│  • Specs (Dedicated): 32GB RAM, 8 vCPU, 500GB NVMe SSD    │
│  • Cost: $150-300/month                                    │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  DATABASE SERVER                                      │ │
│  │  ────────────────────────────────────────────────────│ │
│  │                                                        │ │
│  │  1. PostgreSQL 15 (Primary)                           │ │
│  │     ├── Port: 5432                                    │ │
│  │     ├── Data: /var/lib/postgresql/15/main            │ │
│  │     ├── Config: /etc/postgresql/15/main/postgresql.conf│ │
│  │     ├── Max Connections: 200                          │ │
│  │     ├── Shared Buffers: 8GB                           │ │
│  │     ├── Effective Cache: 24GB                         │ │
│  │     └── Work Mem: 64MB                                │ │
│  │                                                        │ │
│  │  2. PostgreSQL Replication (Optional)                 │ │
│  │     Primary (Read/Write)                              │ │
│  │         ↓                                              │ │
│  │     Streaming Replication                             │ │
│  │         ↓                                              │ │
│  │     Standby 1 (Read-only)                             │ │
│  │     Standby 2 (Read-only)                             │ │
│  │                                                        │ │
│  │     Replication Config:                                │ │
│  │     # postgresql.conf (Primary)                       │ │
│  │     wal_level = replica                                │ │
│  │     max_wal_senders = 3                               │ │
│  │     wal_keep_size = 1GB                               │ │
│  │     hot_standby = on                                  │ │
│  │                                                        │ │
│  │  3. Redis 7.x                                         │ │
│  │     ├── Port: 6379                                    │ │
│  │     ├── Memory: 4GB allocated                         │ │
│  │     ├── Persistence: RDB + AOF                        │ │
│  │     ├── Eviction: allkeys-lru                         │ │
│  │     └── Config:                                        │ │
│  │         maxmemory 4gb                                  │ │
│  │         maxmemory-policy allkeys-lru                   │ │
│  │         save 900 1                                     │ │
│  │         appendonly yes                                 │ │
│  │                                                        │ │
│  │  4. Elasticsearch 8.12                                │ │
│  │     ├── Port: 9200 (HTTP), 9300 (Transport)          │ │
│  │     ├── Heap: 4GB (50% of allocated RAM)             │ │
│  │     ├── Nodes: 3 (cluster for HA)                     │ │
│  │     └── Config:                                        │ │
│  │         cluster.name: ims-search                       │ │
│  │         node.name: es-node-1                           │ │
│  │         discovery.seed_hosts: ["es-node-2", "es-node-3"]│
│  │         xpack.security.enabled: true                   │ │
│  │                                                        │ │
│  │  5. Backup Strategy                                    │ │
│  │     PostgreSQL:                                        │ │
│  │     ├── Daily: pg_dump (full backup)                  │ │
│  │     ├── Hourly: WAL archiving                         │ │
│  │     ├── Storage: S3-compatible (Backblaze B2)         │ │
│  │     └── Retention: 7 days daily, 4 weeks weekly,      │ │
│  │                    12 months monthly                   │ │
│  │                                                        │ │
│  │     Backup Script (Cron):                              │ │
│  │     #!/bin/bash                                        │ │
│  │     # /opt/scripts/backup-postgres.sh                 │ │
│  │     DATE=$(date +%Y%m%d_%H%M%S)                       │ │
│  │     BACKUP_DIR="/backups/postgres"                    │ │
│  │     pg_dump -U postgres ims > $BACKUP_DIR/ims_$DATE.sql│
│  │     gzip $BACKUP_DIR/ims_$DATE.sql                    │ │
│  │     # Upload to S3                                     │ │
│  │     aws s3 cp $BACKUP_DIR/ims_$DATE.sql.gz \          │ │
│  │       s3://ims-backups/postgres/                      │ │
│  │     # Cleanup old local backups (>7 days)             │ │
│  │     find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete│
│  │                                                        │ │
│  │     Redis:                                             │ │
│  │     ├── RDB snapshots (automatic)                     │ │
│  │     ├── AOF logs (continuous)                         │ │
│  │     └── Daily copy to S3                              │ │
│  │                                                        │ │
│  │  6. Monitoring                                         │ │
│  │     ├── postgres_exporter (Prometheus)                │ │
│  │     ├── redis_exporter                                │ │
│  │     ├── elasticsearch_exporter                        │ │
│  │     └── Grafana dashboards                            │ │
│  │                                                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Security:                                                 │
│  • Firewall: Only allow Backend IPs                       │
│  • SSL/TLS: Required for all connections                  │
│  • Authentication: Strong passwords + key-based           │
│  • Encryption at rest: LUKS (Linux)                       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Option 2: Managed Database Services**

```
┌────────────────────────────────────────────────────────────┐
│  MANAGED DATABASE OPTIONS                                  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. AWS RDS (PostgreSQL)                                   │
│     ├── Instance: db.r6g.xlarge (4 vCPU, 32GB)           │
│     ├── Storage: 500GB GP3 SSD                            │
│     ├── Multi-AZ: Yes (HA)                                │
│     ├── Automated backups: 7-35 days retention            │
│     ├── Read replicas: 2 instances                        │
│     └── Cost: ~$400-600/month                             │
│                                                            │
│  2. Google Cloud SQL (PostgreSQL)                         │
│     ├── Instance: db-custom-4-32768                       │
│     ├── Storage: 500GB SSD                                │
│     ├── HA: Regional (automatic failover)                 │
│     ├── Backups: Automated daily                          │
│     └── Cost: ~$350-550/month                             │
│                                                            │
│  3. Azure Database for PostgreSQL                         │
│     ├── Tier: General Purpose                             │
│     ├── vCores: 4                                         │
│     ├── Storage: 512GB                                    │
│     ├── HA: Zone-redundant                                │
│     └── Cost: ~$400-650/month                             │
│                                                            │
│  4. DigitalOcean Managed Databases                        │
│     ├── Size: 4GB RAM, 2 vCPU, 115GB storage             │
│     ├── Standby nodes: 1                                  │
│     ├── Daily backups                                     │
│     └── Cost: ~$120/month (RECOMMENDED for budget)       │
│                                                            │
│  5. Supabase (PostgreSQL)                                 │
│     ├── Pro Plan: Dedicated compute                       │
│     ├── Storage: 100GB included                           │
│     ├── Daily backups                                     │
│     ├── Bonus: REST API auto-generated                    │
│     └── Cost: $25/month + usage                           │
│                                                            │
│  6. Redis Cloud (Managed Redis)                           │
│     ├── Fixed: 5GB dataset                                │
│     ├── HA: Replication enabled                           │
│     └── Cost: ~$40-100/month                              │
│                                                            │
│  7. Elastic Cloud (Managed Elasticsearch)                 │
│     ├── Deployment: 8GB RAM, 2 zones                      │
│     ├── Storage: 240GB                                    │
│     ├── Snapshot backups                                  │
│     └── Cost: ~$150-300/month                             │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Option 3: Hybrid Approach (OPTIMAL)**

```
PostgreSQL:  Managed (AWS RDS / DigitalOcean)
             └─→ Critical data, needs HA, automated backups

Redis:       Self-hosted on VPS
             └─→ Cache layer, acceptable data loss

Elasticsearch: Self-hosted OR Elastic Cloud
             └─→ Search indexing, can rebuild from Postgres
```

**Database Deployment Comparison:**

| Option | Cost | Reliability | Control | Maintenance | Best For |
|--------|------|-------------|---------|-------------|----------|
| **Self-hosted** | $150-300/mo | Medium | Full | High | Full control, budget-conscious |
| **AWS RDS** | $400-600/mo | Very High | Limited | Low | Enterprise, compliance required |
| **DigitalOcean Managed** | $120/mo | High | Medium | Low | Startups (RECOMMENDED) |
| **Hybrid** | $200-400/mo | High | Flexible | Medium | Optimal balance |

---

#### 2.5.4 Tổng hợp Chi phí & Khuyến nghị Deployment

**RECOMMENDED ARCHITECTURE (Cost-Optimized):**

```
┌────────────────────────────────────────────────────────────┐
│  PRODUCTION DEPLOYMENT ARCHITECTURE                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐                                      │
│  │  FRONTEND        │  Vercel (FREE-$20/mo)                │
│  │  React SPA       │  • Global CDN                        │
│  │  (Vercel CDN)    │  • Auto SSL                          │
│  └──────────────────┘  • Git deploy                        │
│          │                                                  │
│          │ HTTPS                                            │
│          ▼                                                  │
│  ┌──────────────────┐                                      │
│  │  API GATEWAY     │  VPS - NGINX Reverse Proxy           │
│  │  (NGINX)         │  Cost: Included in VPS               │
│  └──────────────────┘                                      │
│          │                                                  │
│          ▼                                                  │
│  ┌──────────────────┐                                      │
│  │  BACKEND         │  VPS - Docker Containers             │
│  │  Node.js + AI/ML │  Hetzner CPX41: $80/mo              │
│  │  (3 replicas)    │  • 16GB RAM, 8 vCPU                 │
│  └──────────────────┘  • 240GB NVMe                        │
│          │                                                  │
│          ▼                                                  │
│  ┌──────────────────┐                                      │
│  │  DATABASES       │  Hybrid Approach:                    │
│  │                  │                                       │
│  │  PostgreSQL      │  DigitalOcean Managed: $120/mo      │
│  │  (Managed)       │  • Auto backups, HA                  │
│  │                  │                                       │
│  │  Redis           │  Self-hosted on VPS: $0              │
│  │  (Self-hosted)   │  • Cache layer                       │
│  │                  │                                       │
│  │  Elasticsearch   │  Self-hosted on VPS: $0              │
│  │  (Self-hosted)   │  • Search indexing                   │
│  └──────────────────┘                                      │
│                                                            │
│  TOTAL COST: ~$220/month                                   │
│  • Frontend: $20 (Vercel)                                  │
│  • Backend VPS: $80 (Hetzner)                              │
│  • PostgreSQL: $120 (DigitalOcean Managed)                │
│  • Redis + ES: $0 (self-hosted)                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**ALTERNATIVE: Budget-Constrained (<$150/mo):**

```
Single VPS Deployment (All-in-One):
• VPS: Hetzner CCX33 ($100/mo) - 32GB RAM, 8 vCPU
  ├── Frontend: NGINX static files
  ├── Backend: Docker containers (3 replicas)
  ├── PostgreSQL: Self-hosted with daily backups to S3
  ├── Redis: Self-hosted
  └── Elasticsearch: Self-hosted (or skip, use PostgreSQL FTS)

• Backups: Backblaze B2 ($10/mo)
• SSL: Let's Encrypt (FREE)
• Monitoring: Self-hosted Prometheus/Grafana

TOTAL: ~$110/month
```

**ALTERNATIVE: Enterprise Scale (>10K users):**

```
Kubernetes + Managed Services:
• Frontend: Vercel ($20/mo)
• Backend: GKE/EKS ($500-1000/mo)
  └── Auto-scaling 5-50 pods
• PostgreSQL: AWS RDS Multi-AZ ($600/mo)
• Redis: Redis Enterprise Cloud ($200/mo)
• Elasticsearch: Elastic Cloud ($300/mo)
• Monitoring: Datadog ($500/mo)

TOTAL: ~$2,120-2,620/month
```

**Cost Comparison Table:**

| Deployment Model | Monthly Cost | Max Users | Reliability | Complexity |
|------------------|--------------|-----------|-------------|------------|
| **Budget (All-in-One VPS)** | $110 | ~500 | Medium | Low |
| **Recommended (Hybrid)** | $220 | ~5,000 | High | Medium |
| **Enterprise (K8s + Managed)** | $2,120 | >50,000 | Very High | High |

---

### 2.6 Góc nhìn bảo mật (Security View)

**Zero Trust Architecture:**

```
┌────────────────────────────────────────────────────────────┐
│  SECURITY LAYERS                                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Layer 1: Authentication (Keycloak)                       │
│  • OAuth 2.0 / OIDC                                       │
│  • JWT Access Token (5 min) + Refresh Token (30 min)     │
│  • Multi-factor authentication (MFA) for Admin            │
│  • Social login support (Google, GitHub)                  │
│                                                            │
│  Layer 2: Authorization (RBAC)                            │
│  • 5 roles: admin, inventory_manager, quality_control,   │
│            production, viewer                             │
│  • Fine-grained permissions (read/write per resource)     │
│  • Site-specific RBAC (warehouse isolation)              │
│                                                            │
│  Layer 3: API Security                                    │
│  • JWT verification at API Gateway                        │
│  • Rate limiting (10K req/min per user)                  │
│  • CORS policies (allowed origins)                        │
│  • Input validation (Joi/Zod schemas)                    │
│                                                            │
│  Layer 4: Data Protection                                 │
│  • TLS 1.3 (all traffic encrypted)                       │
│  • Database encryption at rest (AES-256)                  │
│  • Secrets management (Kubernetes secrets / .env)        │
│  • PII masking in logs                                    │
│                                                            │
│  Layer 5: Audit & Compliance                              │
│  • All mutations logged (who, what, when)                │
│  • Audit trail immutable (append-only)                    │
│  • Regulatory compliance (GDPR, HIPAA if needed)         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Security Best Practices Implemented:**
- ✅ No passwords in code (environment variables)
- ✅ JWT signature verification (JWKS from Keycloak)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (React auto-escaping + CSP headers)
- ✅ CSRF tokens (SameSite cookies)
- ✅ Dependency scanning (GitHub Dependabot)

---

## 3. Công nghệ và công cụ (Tech Stack) - UPDATED 2026

### 3.1 Technology Stack (Comprehensive)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE TECHNOLOGY STACK 2026                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  FRONTEND (Client)                                                       │   │
│  │  ────────────────────────────────────────────────────────────────────── │   │
│  │  • Framework:       React 18 + TypeScript                               │   │
│  │  • UI Library:      Ant Design 5.x                                      │   │
│  │  • State:           React Query (server) + Zustand (client)             │   │
│  │  • Routing:         React Router v6                                     │   │
│  │  • Build Tool:      Vite                                                │   │
│  │  • Auth Client:     @react-keycloak/web                                 │   │
│  │  • Charts:          Recharts / Chart.js                                 │   │
│  │  • Real-time:       WebSocket client                                    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│                              │ REST API (JSON) + JWT + WebSocket                │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  BACKEND (Server)                                                        │   │
│  │  ────────────────────────────────────────────────────────────────────── │   │
│  │  • Runtime:         Node.js 20 LTS                                       │   │
│  │  • Framework:       Express.js + TypeScript                              │   │
│  │  • ORM:             Sequelize v6                                         │   │
│  │  • Validation:      Joi / Zod                                            │   │
│  │  • Auth:            Keycloak JWT Verify (express-jwt + jwks-rsa)        │   │
│  │  • API Docs:        Swagger / OpenAPI 3.0                               │   │
│  │  • Logging:         Winston (structured JSON logs)                       │   │
│  │  • WebSocket:       ws / Socket.io                                      │   │
│  │  • Metrics:         prom-client (Prometheus)                            │   │
│  │  • Tracing:         OpenTelemetry SDK                                   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│                              │ ORM + Direct Queries                             │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  DATABASE & STORAGE                                                      │   │
│  │  ────────────────────────────────────────────────────────────────────── │   │
│  │  PRIMARY OLTP:                                                           │   │
│  │  • PostgreSQL 15+   UUID, ENUM, DECIMAL(10,3), JSONB                    │   │
│  │  • Features:        Partitioning, Replication, Point-in-time Recovery   │   │
│  │  • Backup:          pg_dump automated daily                             │   │
│  │                                                                           │   │
│  │  CACHE:                                                                   │   │
│  │  • Redis 7.x        Stock levels, sessions, rate limiting               │   │
│  │  • TTL:             5-60 minutes (per use case)                          │   │
│  │                                                                           │   │
│  │  SEARCH & VECTORS:                                                        │   │
│  │  • Elasticsearch 8.12+  Full-text search, semantic search (vectors)     │   │
│  │  • Vector Model:    BAAI/bge-m3 (1024 dims, multilingual)              │   │
│  │  • Analyzer:        ICU tokenizer (Vietnamese support)                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  IDENTITY & ACCESS MANAGEMENT                                            │   │
│  │  ────────────────────────────────────────────────────────────────────── │   │
│  │  • Provider:        Keycloak 24+ (Self-hosted)                           │   │
│  │  • Protocol:        OAuth 2.0 / OpenID Connect (OIDC)                   │   │
│  │  • Features:        SSO, RBAC, MFA, Social Login, User Federation       │   │
│  │  • Database:        PostgreSQL (shared or dedicated)                    │   │
│  │  • Admin UI:        http://localhost:8080/admin                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  AI/ML SERVICES                                                          │   │
│  │  ────────────────────────────────────────────────────────────────────── │   │
│  │  SEMANTIC SEARCH (Already POC'd):                                       │   │
│  │  • Embeddings:      @xenova/transformers (BAAI/bge-m3)                  │   │
│  │  • Storage:         Elasticsearch vectors                                │   │
│  │  • Status:          ✅ Production Ready                                  │   │
│  │                                                                           │   │
│  │  DEMAND FORECASTING:                                                      │   │
│  │  • Baseline:        Prophet (Facebook)                                   │   │
│  │  • Advanced:        TensorFlow LSTM (GPU)                               │   │
│  │  • Serving:         FastAPI + Uvicorn                                   │   │
│  │                                                                           │   │
│  │  ANOMALY DETECTION:                                                       │   │
│  │  • Algorithm:       Isolation Forest (scikit-learn)                     │   │
│  │  • Use Case:        Theft, data errors, unusual patterns                │   │
│  │                                                                           │   │
│  │  COMPUTER VISION QC:                                                      │   │
│  │  • Model:           YOLOv8 (lightweight)                                │   │
│  │  • Accuracy:        97% defect detection                                │   │
│  │  • Alternative:     Cloud APIs (AWS Rekognition, Cloudinary)            │   │
│  │                                                                           │   │
│  │  LLM CHATBOT:                                                             │   │
│  │  • Provider:        Anthropic Claude 3.5 Haiku API                      │   │
│  │  • Cost:            $0.003/1K tokens (cost-effective)                   │   │
│  │  • Fallback:        Self-hosted Llama-2 7B (if >20M tokens/month)      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  OBSERVABILITY & MONITORING                                              │   │
│  │  ────────────────────────────────────────────────────────────────────── │   │
│  │  METRICS:                                                                 │   │
│  │  • Collection:      Prometheus (time-series DB)                          │   │
│  │  • Exporters:       prom-client (Node.js), postgres_exporter,           │   │
│  │                     elasticsearch-exporter                               │   │
│  │  • Visualization:   Grafana (dashboards + alerts)                       │   │
│  │  • Retention:       15 days in Prometheus                               │   │
│  │                                                                           │   │
│  │  LOGS:                                                                    │   │
│  │  • Collection:      Fluentd (Docker logging driver)                     │   │
│  │  • Storage:         Elasticsearch (leverage existing)                    │   │
│  │  • Visualization:   Kibana / Grafana Loki                               │   │
│  │  • Retention:       7 days hot, 30 days warm, 1 year archive           │   │
│  │                                                                           │   │
│  │  TRACES:                                                                  │   │
│  │  • Standard:        OpenTelemetry (vendor-neutral)                      │   │
│  │  • Backend:         Jaeger (distributed tracing)                        │   │
│  │  • Auto-instrumentation: Express, pg, Elasticsearch clients            │   │
│  │  • Retention:       72 hours in Jaeger, longer in Elasticsearch        │   │
│  │                                                                           │   │
│  │  BUSINESS ANALYTICS:                                                      │   │
│  │  • Tool:            Metabase (no-code BI)                               │   │
│  │  • Data Source:     PostgreSQL direct query                             │   │
│  │  • Use Case:        Manager dashboards, inventory reports               │   │
│  │                                                                           │   │
│  │  ALERTING:                                                                │   │
│  │  • Manager:         Prometheus AlertManager                              │   │
│  │  • Channels:        Slack (#alerts), PagerDuty, Email                   │   │
│  │  • SLOs:            99.5% availability, p99 latency <200ms              │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  DEVOPS & TOOLS                                                          │   │
│  │  ────────────────────────────────────────────────────────────────────── │   │
│  │  • Version Control:     Git + GitHub                                     │   │
│  │  • CI/CD:               GitHub Actions                                   │   │
│  │  • Container:           Docker + Docker Compose                          │   │
│  │  • Orchestration:       Kubernetes (production, optional)                │   │
│  │  • API Testing:         Postman / Thunder Client                         │   │
│  │  • Code Quality:        ESLint + Prettier                                │   │
│  │  • Testing:             Jest + React Testing Library                     │   │
│  │  • Load Testing:        k6                                               │   │
│  │  • Secret Management:   .env files (dev) / Kubernetes secrets (prod)    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  MESSAGE QUEUE (Future - Optional)                                       │   │
│  │  ────────────────────────────────────────────────────────────────────── │   │
│  │  • High-volume events:  Apache Kafka                                     │   │
│  │  • Service-to-service:  RabbitMQ                                        │   │
│  │  • Use Case:            Event streaming, async processing                │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Kiến trúc tổ chức thư mục (Project Structure)

```
inventory-management-system/
├── frontend/                          # React Application
│   ├── src/
│   │   ├── components/                # Reusable UI components
│   │   │   ├── common/                # Shared components (Button, Table, Modal)
│   │   │   ├── inventory/             # Inventory-specific components
│   │   │   ├── qc/                    # Quality Control components
│   │   │   ├── production/            # Production management components
│   │   │   └── layout/                # Layout components (Header, Sidebar)
│   │   ├── pages/                     # Page components (routes)
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Inventory/             # Inventory pages
│   │   │   ├── QualityControl/
│   │   │   ├── Production/
│   │   │   └── Reports/
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useInventory.ts
│   │   │   ├── useAuth.ts
│   │   │   └── useWebSocket.ts
│   │   ├── services/                  # API calls
│   │   │   ├── api.ts                 # Axios instance
│   │   │   ├── inventoryService.ts
│   │   │   ├── qcService.ts
│   │   │   └── productionService.ts
│   │   ├── store/                     # State management
│   │   │   ├── useAuthStore.ts        # Zustand stores
│   │   │   └── useNotificationStore.ts
│   │   ├── types/                     # TypeScript interfaces
│   │   │   ├── inventory.ts
│   │   │   ├── qc.ts
│   │   │   └── production.ts
│   │   ├── utils/                     # Helper functions
│   │   │   ├── formatters.ts
│   │   │   ├── validators.ts
│   │   │   └── constants.ts
│   │   ├── auth/                      # Keycloak configuration
│   │   │   └── keycloak.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/                           # Express Application
│   ├── src/
│   │   ├── controllers/               # Route handlers
│   │   │   ├── inventory.controller.ts
│   │   │   ├── qc.controller.ts
│   │   │   ├── production.controller.ts
│   │   │   └── report.controller.ts
│   │   ├── models/                    # Sequelize models
│   │   │   ├── index.ts
│   │   │   ├── User.ts
│   │   │   ├── Material.ts
│   │   │   ├── InventoryLot.ts
│   │   │   ├── InventoryTransaction.ts
│   │   │   ├── QCTest.ts
│   │   │   ├── ProductionBatch.ts
│   │   │   └── BatchComponent.ts
│   │   ├── routes/                    # API routes
│   │   │   ├── index.ts
│   │   │   ├── inventory.routes.ts
│   │   │   ├── qc.routes.ts
│   │   │   ├── production.routes.ts
│   │   │   └── report.routes.ts
│   │   ├── middleware/                # Auth, validation, error handling
│   │   │   ├── auth.ts                # JWT verify + RBAC
│   │   │   ├── validation.ts          # Joi/Zod schemas
│   │   │   ├── errorHandler.ts
│   │   │   └── metrics.ts             # Prometheus metrics
│   │   ├── services/                  # Business logic
│   │   │   ├── inventory.service.ts
│   │   │   ├── qc.service.ts
│   │   │   ├── production.service.ts
│   │   │   ├── search.service.ts      # Elasticsearch semantic search
│   │   │   └── websocket.service.ts   # Real-time updates
│   │   ├── utils/                     # Helpers
│   │   │   ├── logger.ts              # Winston logger
│   │   │   ├── validation.ts
│   │   │   └── constants.ts
│   │   ├── config/                    # Configuration
│   │   │   ├── database.ts            # Sequelize config
│   │   │   ├── keycloak.config.ts
│   │   │   ├── elasticsearch.config.ts
│   │   │   ├── redis.config.ts
│   │   │   └── env.ts                 # Environment variables
│   │   └── server.ts                  # Express app entry point
│   ├── migrations/                    # Database migrations
│   │   └── YYYYMMDDHHMMSS-create-*.js
│   ├── seeders/                       # Test data
│   │   └── demo-data.js
│   ├── tests/                         # Unit & Integration tests
│   │   ├── unit/
│   │   └── integration/
│   ├── package.json
│   └── tsconfig.json
│
├── ai-ml-services/                    # AI/ML FastAPI Services
│   ├── src/
│   │   ├── semantic_search/           # Semantic search service
│   │   │   ├── __init__.py
│   │   │   ├── embeddings.py          # BAAI/bge-m3 model
│   │   │   └── search.py              # Elasticsearch integration
│   │   ├── forecasting/               # Demand forecasting
│   │   │   ├── __init__.py
│   │   │   ├── prophet_model.py       # Prophet baseline
│   │   │   ├── lstm_model.py          # TensorFlow LSTM
│   │   │   └── serving.py             # FastAPI endpoints
│   │   ├── anomaly_detection/         # Anomaly detection
│   │   │   ├── __init__.py
│   │   │   └── isolation_forest.py
│   │   ├── computer_vision/           # QC computer vision
│   │   │   ├── __init__.py
│   │   │   └── yolo_model.py          # YOLOv8
│   │   ├── chatbot/                   # LLM chatbot
│   │   │   ├── __init__.py
│   │   │   └── claude_client.py       # Claude API integration
│   │   ├── main.py                    # FastAPI app
│   │   └── config.py
│   ├── models/                        # Trained models storage
│   ├── data/                          # Training data
│   ├── requirements.txt
│   └── Dockerfile
│
├── keycloak/                          # Keycloak Configuration
│   ├── realm-export.json              # Realm config (import on startup)
│   └── themes/                        # Custom login themes (optional)
│
├── monitoring/                        # Observability Stack Configs
│   ├── prometheus/
│   │   ├── prometheus.yml             # Prometheus config
│   │   └── alert-rules.yml            # Alert rules
│   ├── grafana/
│   │   ├── dashboards/                # JSON dashboard definitions
│   │   └── datasources/               # Data source configs
│   ├── fluentd/
│   │   └── fluent.conf                # Log collection config
│   └── jaeger/
│       └── jaeger-config.yml
│
├── infrastructure/                    # Infrastructure as Code
│   ├── docker/
│   │   └── docker-compose.yml         # Development stack
│   ├── kubernetes/                    # Production deployment (optional)
│   │   ├── deployments/
│   │   ├── services/
│   │   ├── configmaps/
│   │   └── secrets/
│   └── scripts/
│       ├── setup-dev.sh
│       └── backup-db.sh
│
├── docs/                              # Documentation
│   ├── architecture/
│   ├── api/                           # API documentation
│   ├── deployment/
│   └── user-guide/
│
├── .github/                           # CI/CD
│   └── workflows/
│       ├── ci.yml                     # Build & Test
│       └── cd.yml                     # Deploy
│
├── init-db.sql                        # Database initialization
├── .env.example                       # Environment variables template
├── .gitignore
└── README.md
```

**Key Organization Principles:**

1. **Separation of Concerns:**
   - Frontend, Backend, AI/ML services hoàn toàn tách biệt
   - Mỗi service có dependencies và deployment độc lập

2. **Module Boundaries:**
   - Backend: Controllers → Services → Models (layered architecture)
   - Frontend: Pages → Components → Services (feature-based)
   - AI/ML: Mỗi model là một module riêng

3. **Configuration Centralized:**
   - Tất cả configs trong `config/` directories
   - Environment-specific configs (dev, staging, prod)

4. **Infrastructure as Code:**
   - Docker Compose cho development
   - Kubernetes manifests cho production (optional)

5. **Monitoring & Observability:**
   - Dedicated `monitoring/` directory
   - Pre-configured dashboards và alert rules

---

### 3.3 Cost Analysis (Infrastructure)

#### Option A: Self-Hosted (RECOMMENDED)

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| VPS (16GB RAM, 4 vCPU) | $80-150 | Hetzner, DigitalOcean, Vultr |
| PostgreSQL backup storage | $10-20 | S3-compatible (Backblaze B2) |
| Redis (self-hosted) | $0 | Included in VPS |
| Elasticsearch (3 nodes) | $150-300 | Or use existing VPS |
| Monitoring stack | $0-50 | Self-hosted Prometheus/Grafana |
| AI/ML GPU (spot instances) | $200-400 | For LSTM training |
| Claude API (LLM chatbot) | $200-500 | Pay-per-use, ~5-20M tokens |
| **TOTAL** | **$640-1,420** | Full control, no vendor lock-in |

#### Option B: Managed Services (SaaS)

| Component | Monthly Cost | Notes |
|-----------|--------------|-------|
| Elastic Cloud (ES + Kibana) | $150-300 | Managed Elasticsearch |
| Datadog (monitoring) | $250-500 | APM + logs + metrics |
| PostgreSQL managed (RDS) | $100-200 | AWS RDS or equivalent |
| Keycloak managed | $100-200 | Red Hat SSO or third-party |
| **TOTAL** | **$600-1,200** | Bill shock risk, vendor lock-in |

**Recommendation:** Self-hosted (Option A) - more control, predictable cost.

---

## 4. Implementation Roadmap

### 4.1 Special Features Implementation

#### 4.1.1 Semantic Search (✅ POC Completed Feb 4, 2026)

**Architecture:**
```
User Query: "Cà phê" (Vietnamese)
     ↓
Backend: Generate embedding (BAAI/bge-m3)
     ↓
Elasticsearch: kNN search (vector similarity)
     ↓
Hybrid scoring: Vector (10x) + Keyword (0.2x)
     ↓
Return results: "Organic Coffee Beans" (score: 7.35)
```

**Performance:**
- Multilingual: Vietnamese ↔ English semantic matching
- Latency: <500ms for 100K+ SKUs
- Accuracy: Better than pure keyword search

---

#### 4.1.2 Real-Time Inventory Updates

**WebSocket Flow:**
```
Database Update (Stock Change)
     ↓
Event Trigger (PostgreSQL trigger or app-level)
     ↓
Publish to Message Queue (optional: Kafka/RabbitMQ)
     ↓
WebSocket Server broadcasts event
     ↓
Connected clients receive update (<100ms)
     ↓
React components re-render (optimistic UI)
```

---

#### 4.1.3 Label Printing

**Technology:**
- **PDF Generation:** jsPDF or Puppeteer (headless browser)
- **Barcode/QR:** qrcode.react + react-barcode
- **Templates:** HTML/CSS templates → PDF rendering
- **Print API:** Browser print API or direct printer integration

---

#### 4.1.4 Excel Export

**Technology:**
- **Library:** xlsx or ExcelJS
- **Use Case:** Export inventory reports, audit logs, transaction history
- **Format:** .xlsx with formulas, styling

---

#### 4.1.5 AI-Powered Features (Roadmap)

| Feature | Status | Timeline |
|---------|--------|----------|
| **Semantic Search** | ✅ POC Complete | Prod-ready |
| **Demand Forecasting** | 📋 Planned | Phase 1-2 (Month 1-4) |
| **Anomaly Detection** | 📋 Planned | Phase 3 (Month 5-6) |
| **QC Computer Vision** | 📋 Planned | Phase 3 (Month 5-6) |
| **LLM Chatbot** | 📋 Planned | Phase 4 (Month 7-8) |

**Estimated Investment:**
- Development: ~$93K (one-time)
- Infrastructure: $400-700/month
- ROI: 6-12 month payback (save $50K-100K/year)

### 4.2 Implementation Phases

#### Phase 1: Monitoring & Observability (Week 1-4)
- ✅ Deploy Prometheus + Grafana
- ✅ Configure OpenTelemetry + Jaeger
- ✅ Setup Fluentd → Elasticsearch logs
- ✅ Create core dashboards

#### Phase 2: AI Foundation (Month 1-2)
- ✅ Production deployment of semantic search
- ✅ Data pipeline for demand forecasting
- ✅ Prophet baseline model

#### Phase 3: Advanced AI (Month 3-6)
- ✅ LSTM demand forecasting
- ✅ Anomaly detection (Isolation Forest)
- ✅ Computer vision QC

#### Phase 4: Business Intelligence (Month 5-8)
- ✅ Metabase deployment
- ✅ Manager dashboards
- ✅ LLM chatbot (Claude API)

---

## 5. Unresolved Questions & Next Steps

### Questions Requiring Clarification

1. **Budget:** Confirm $100K development + $10-20K/year infrastructure OK?
2. **Team:** Do we have data scientist + ML engineer? Or need hire?
3. **Compliance:** Any GDPR/HIPAA requirements affecting data retention?
4. **Scale:** Expected growth (users, SKUs, transactions) by end 2026?
5. **Deployment:** Prefer Docker Compose (simple) or Kubernetes (enterprise)?
6. **AI Priority:** Which AI feature most valuable? (Forecast vs Anomaly vs Vision)

### Recommended Next Steps

1. **Week 1:** Review this architecture document with team
2. **Week 2-3:** Answer unresolved questions, finalize tech decisions
3. **Week 4:** Kickoff Phase 1 (monitoring stack deployment)
4. **Month 2:** Begin AI/ML pilot (semantic search production + forecast POC)

---

## 6. References

### Industry Research
- Modern IMS Architectures: [Research Report](plans/reports/researcher-260205-1541-modern-ims-architectures.md)
- Monitoring & Observability: [Research Report](plans/reports/researcher-260205-1540-monitoring-observability-stack.md)
- AI Capabilities: [Research Report](plans/reports/researcher-260205-1541-ai-capabilities-for-ims.md)

### Internal POCs
- Keycloak Integration POC: [06_Proof of Concept.md](01_Documents/06_Proof of Concept.md) - Section Keycloak
- Elasticsearch Semantic Search POC: [06_Proof of Concept.md](01_Documents/06_Proof of Concept.md) - Section Elasticsearch

### External Standards
- OAuth 2.0 / OIDC: [RFC 6749](https://tools.ietf.org/html/rfc6749)
- OpenTelemetry: [Official Docs](https://opentelemetry.io/)
- Prometheus: [Monitoring Guide](https://prometheus.io/docs/)
- Domain-Driven Design: [IBM Architecture](https://ibm-cloud-architecture.github.io/refarch-eda/methodology/domain-driven-design/)

---

**Document Version:** 2.0 (Updated 2026-02-05)
**Status:** ✅ Complete - Ready for Review & Implementation
**Next Review:** After Phase 1 completion (Month 1)
