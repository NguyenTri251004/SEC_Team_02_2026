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
