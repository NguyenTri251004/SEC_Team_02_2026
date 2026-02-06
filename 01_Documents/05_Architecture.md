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
│  │  ├─ Material Module (Material CRUD, Categories)                         │ │
│  │  ├─ Inventory Lot Module (Lot Tracking, Expiry, Location)               │ │
│  │  ├─ Transaction Module (Receive, Issue, Adjust, Transfer)               │ │
│  │  ├─ Labeling Module (QR/Barcode Generation, Printing)                   │ │
│  │  ├─ Stock Management Module (Real-time Levels, Reservations, Reorder)   │ │
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
│  │  • Docker Compose (Orchestration)                                        │ │
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

### 2.2 Góc nhìn logic (Logical View)

Logical View mô tả **các thành phần chính** của hệ thống, **mối quan hệ** giữa chúng, và **cách chúng tương tác** với nhau để thực hiện các chức năng nghiệp vụ.

#### 2.2.1 Component Diagram - Sơ đồ thành phần tổng thể

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        LOGICAL ARCHITECTURE                                 │
│                     (Component & Relationship View)                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  CLIENT TIER                                                          │ │
│  │  ──────────────────────────────────────────────────────────────────  │ │
│  │                                                                        │ │
│  │  ┌────────────────────────────────────────────────────────────────┐  │ │
│  │  │  Frontend Component (React SPA)                                 │  │ │
│  │  │  ────────────────────────────────────────────────────────────  │  │ │
│  │  │  Responsibilities:                                              │  │ │
│  │  │  • User interface rendering                                     │  │ │
│  │  │  • Client-side routing & state management                       │  │ │
│  │  │  • Form validation & user input handling                        │  │ │
│  │  │  • Real-time UI updates (WebSocket)                            │  │ │
│  │  │                                                                  │  │ │
│  │  │  Sub-components:                                                 │  │ │
│  │  │  ├─ Material Management UI (CRUD, categories, search)           │  │ │
│  │  │  ├─ Inventory Lot UI (lot tracking, expiry alerts)             │  │ │
│  │  │  ├─ Transaction UI (receive, issue, adjust, transfer)          │  │ │
│  │  │  ├─ Labeling UI (generate QR/barcode, print labels)            │  │ │
│  │  │  ├─ Stock Dashboard (real-time levels, reservations)           │  │ │
│  │  │  ├─ QC Dashboard (quality control, approval workflow)          │  │ │
│  │  │  ├─ Production Tracking UI (batches, components)               │  │ │
│  │  │  ├─ Reporting & Analytics UI (KPIs, audit logs)                │  │ │
│  │  │  └─ Authentication UI (Keycloak integration)                    │  │ │
│  │  │                                                                  │  │ │
│  │  │  Technologies:                                                   │  │ │
│  │  │  • React 18 + TypeScript                                        │  │ │
│  │  │  • Ant Design (UI components)                                   │  │ │
│  │  │  • React Query (server state)                                   │  │ │
│  │  │  • Zustand (client state)                                       │  │ │
│  │  │  • React Router v6                                              │  │ │
│  │  └────────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                              │                                             │
│                              │ REST API (JSON)                             │
│                              │ WebSocket (Real-time)                       │
│                              │ OAuth2/OIDC (Auth)                          │
│                              ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  APPLICATION TIER                                                     │ │
│  │  ──────────────────────────────────────────────────────────────────  │ │
│  │                                                                        │ │
│  │  ┌────────────────────────────────────────────────────────────────┐  │ │
│  │  │  API Gateway Component (NGINX/Kong)                             │  │ │
│  │  │  ────────────────────────────────────────────────────────────  │  │ │
│  │  │  Responsibilities:                                              │  │ │
│  │  │  • Request routing & load balancing                             │  │ │
│  │  │  • SSL termination                                              │  │ │
│  │  │  • JWT validation (initial check)                               │  │ │
│  │  │  • Rate limiting & throttling                                   │  │ │
│  │  │  • CORS policy enforcement                                      │  │ │
│  │  └────────────────────────────────────────────────────────────────┘  │ │
│  │                              ▼                                         │ │
│  │  ┌────────────────────────────────────────────────────────────────┐  │ │
│  │  │  Backend API Component (Node.js + Express)                      │  │ │
│  │  │  ────────────────────────────────────────────────────────────  │  │ │
│  │  │  Responsibilities:                                              │  │ │
│  │  │  • Business logic orchestration                                 │  │ │
│  │  │  • API endpoint implementation                                  │  │ │
│  │  │  • Request/Response handling                                    │  │ │
│  │  │  • WebSocket server (real-time events)                         │  │ │
│  │  │  • Event publishing/subscribing                                 │  │ │
│  │  │                                                                  │  │ │
│  │  │  Core Modules (Bounded Contexts):                               │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │ │
│  │  │  │ MaterialModule                                            │  │  │ │
│  │  │  │ • MaterialService (CRUD, search, categorize)             │  │  │ │
│  │  │  │ • MaterialValidationService (business rules)             │  │  │ │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │ │
│  │  │                                                                  │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │ │
│  │  │  │ InventoryLotModule                                        │  │  │ │
│  │  │  │ • LotService (create, track, update status)              │  │  │ │
│  │  │  │ • LotExpiryService (expiry tracking, alerts)             │  │  │ │
│  │  │  │ • LotLocationService (warehouse location)                │  │  │ │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │ │
│  │  │                                                                  │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │ │
│  │  │  │ TransactionModule                                         │  │  │ │
│  │  │  │ • ReceiveService (goods receipt)                         │  │  │ │
│  │  │  │ • IssueService (goods issue)                             │  │  │ │
│  │  │  │ • AdjustmentService (stock adjustments)                  │  │  │ │
│  │  │  │ • TransferService (inter-warehouse transfers)            │  │  │ │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │ │
│  │  │                                                                  │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │ │
│  │  │  │ LabelingModule                                            │  │  │ │
│  │  │  │ • LabelGenerationService (QR/Barcode)                    │  │  │ │
│  │  │  │ • PrintService (label printing)                          │  │  │ │
│  │  │  │ • TemplateService (label templates)                      │  │  │ │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │ │
│  │  │                                                                  │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │ │
│  │  │  │ StockManagementModule                                     │  │  │ │
│  │  │  │ • StockLevelService (real-time stock tracking)           │  │  │ │
│  │  │  │ • ReservationService (reserve/release stock)             │  │  │ │
│  │  │  │ • ReorderService (auto-reorder alerts)                   │  │  │ │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │ │
│  │  │                                                                  │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │ │
│  │  │  │ QualityControlModule                                      │  │  │ │
│  │  │  │ • QCTestService (create tests, record results)            │  │  │ │
│  │  │  │ • ApprovalWorkflowService (approve/reject lots)           │  │  │ │
│  │  │  │ • QuarantineService (quarantine enforcement)              │  │  │ │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │ │
│  │  │                                                                  │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │ │
│  │  │  │ ProductionModule                                          │  │  │ │
│  │  │  │ • BatchService (batch creation, tracking)                 │  │  │ │
│  │  │  │ • ComponentTrackingService (material → batch)            │  │  │ │
│  │  │  │ • ProductionHistoryService (audit trail)                  │  │  │ │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │ │
│  │  │                                                                  │  │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │ │
│  │  │  │ ReportingModule                                           │  │  │ │
│  │  │  │ • ReportService (generate reports)                        │  │  │ │
│  │  │  │ • AnalyticsService (KPI calculations)                     │  │  │ │
│  │  │  │ • AuditService (audit trail queries)                      │  │  │ │
│  │  │  │ • TraceabilityService (lot → batch → product)           │  │  │ │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │ │
│  │  │                                                                  │  │ │
│  │  │  Cross-Cutting Services:                                        │  │ │
│  │  │  • AuthService (JWT verification with Keycloak)                │  │ │
│  │  │  • ValidationService (request validation)                       │  │ │
│  │  │  • LoggingService (structured logging)                          │  │ │
│  │  │  • EventBusService (internal event pub/sub)                    │  │ │
│  │  │  • CacheService (Redis integration)                             │  │ │
│  │  └────────────────────────────────────────────────────────────────┘  │ │
│  │                              ▼                                         │ │
│  │  ┌────────────────────────────────────────────────────────────────┐  │ │
│  │  │  AI/ML Services Component (FastAPI)                            │  │ │
│  │  │  ────────────────────────────────────────────────────────────  │  │ │
│  │  │  Responsibilities:                                              │  │ │
│  │  │  • AI model inference & predictions                             │  │ │
│  │  │  • ML pipeline orchestration                                    │  │ │
│  │  │  • Semantic search processing                                   │  │ │
│  │  │                                                                  │  │ │
│  │  │  Services:                                                       │  │ │
│  │  │  • SemanticSearchService (embeddings + kNN search)             │  │ │
│  │  │  • DemandForecastService (Prophet + LSTM)                      │  │ │
│  │  │  • AnomalyDetectionService (Isolation Forest)                  │  │ │
│  │  │  • ComputerVisionService (YOLOv8 QC)                           │  │ │
│  │  │  • ChatbotService (Claude API integration)                     │  │ │
│  │  └────────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                              │                                             │
│                              │ Database Queries (SQL)                      │
│                              │ Cache Operations (Redis)                    │
│                              │ Search Queries (Elasticsearch)              │
│                              ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  DATA TIER                                                            │ │
│  │  ──────────────────────────────────────────────────────────────────  │ │
│  │                                                                        │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐ │ │
│  │  │ Auth Component │  │ Data Component │  │ Search Component       │ │ │
│  │  │ (Keycloak)     │  │ (PostgreSQL)   │  │ (Elasticsearch)        │ │ │
│  │  │                │  │                │  │                        │ │ │
│  │  │ • User mgmt    │  │ • Inventory    │  │ • Full-text search     │ │ │
│  │  │ • RBAC         │  │ • Transactions │  │ • Semantic search      │ │ │
│  │  │ • SSO/OIDC     │  │ • QC data      │  │ • Vector embeddings    │ │ │
│  │  │ • Token mgmt   │  │ • Production   │  │ • Log aggregation      │ │ │
│  │  └────────────────┘  │ • Audit logs   │  └────────────────────────┘ │ │
│  │                      └────────────────┘                              │ │
│  │                                                                        │ │
│  │  ┌────────────────────────────────────────────────────────────────┐  │ │
│  │  │  Cache Component (Redis)                                        │  │ │
│  │  │  • Stock levels cache                                           │  │ │
│  │  │  • Session storage                                              │  │ │
│  │  │  • Rate limiting counters                                       │  │ │
│  │  │  • WebSocket session management                                 │  │ │
│  │  └────────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  EXTERNAL SERVICES                                                    │ │
│  │  ──────────────────────────────────────────────────────────────────  │ │
│  │  • Claude API (LLM for chatbot)                                      │ │
│  │  • Email Service (notifications)                                     │ │
│  │  • SMS Gateway (alerts - optional)                                   │ │
│  │  • Backup Storage (S3-compatible)                                    │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

#### 2.2.2 Component Relationships & Data Flow

**Primary Component Interactions:**

```
┌─────────────────────────────────────────────────────────────────────┐
│  COMPONENT INTERACTION PATTERNS                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Authentication Flow (OAuth2/OIDC)                               │
│     ────────────────────────────────────────────────────────────   │
│     Frontend → Keycloak: Request authorization                     │
│     Keycloak → Frontend: Redirect with code                        │
│     Frontend → Keycloak: Exchange code for tokens                  │
│     Keycloak → Frontend: JWT (access + refresh)                    │
│     Frontend → Backend API: Request with JWT                       │
│     Backend API → Keycloak: Validate JWT (JWKS)                    │
│     Backend API → Frontend: Protected resource                     │
│                                                                     │
│  2. Inventory Transaction Flow (Create Lot)                        │
│     ────────────────────────────────────────────────────────────   │
│     Frontend → Backend API: POST /api/inventory/lots               │
│     Backend API → ValidationService: Validate request              │
│     Backend API → InventoryModule.LotService: createLot()          │
│     LotService → PostgreSQL: INSERT inventory_lots                 │
│     LotService → EventBus: Emit 'lot.created' event                │
│     EventBus → SearchService: Index lot in Elasticsearch           │
│     EventBus → CacheService: Invalidate stock cache                │
│     EventBus → WebSocketService: Broadcast update                  │
│     WebSocketService → Frontend: Real-time notification            │
│     Backend API → Frontend: Success response (201)                 │
│                                                                     │
│  3. QC Approval Workflow                                            │
│     ────────────────────────────────────────────────────────────   │
│     Frontend → Backend API: POST /api/qc/approve/{lotId}           │
│     Backend API → QCModule.ApprovalWorkflowService: approveLot()   │
│     ApprovalWorkflowService → PostgreSQL: UPDATE lot status        │
│     ApprovalWorkflowService → EventBus: Emit 'lot.approved'        │
│     EventBus → InventoryModule: Release from quarantine            │
│     EventBus → AI/ML Service: Trigger anomaly detection            │
│     EventBus → NotificationService: Send approval notification     │
│     Backend API → Frontend: Success response                       │
│                                                                     │
│  4. Semantic Search Flow                                            │
│     ────────────────────────────────────────────────────────────   │
│     Frontend → Backend API: GET /api/search?q=coffee               │
│     Backend API → AI/ML Service: POST /semantic-search             │
│     AI/ML Service → EmbeddingModel: Generate vector                │
│     AI/ML Service → Elasticsearch: kNN vector search               │
│     Elasticsearch → AI/ML Service: Search results                  │
│     AI/ML Service → Backend API: Ranked results                    │
│     Backend API → PostgreSQL: Enrich with latest data              │
│     Backend API → Frontend: Search results (JSON)                  │
│                                                                     │
│  5. Demand Forecasting Flow (Batch Process)                        │
│     ────────────────────────────────────────────────────────────   │
│     Cron Job → Backend API: POST /api/forecast/run                 │
│     Backend API → AI/ML Service: POST /forecast/demand             │
│     AI/ML Service → PostgreSQL: Fetch historical data              │
│     AI/ML Service → Prophet Model: Generate baseline forecast      │
│     AI/ML Service → LSTM Model: Generate advanced forecast         │
│     AI/ML Service → PostgreSQL: Store predictions                  │
│     AI/ML Service → Backend API: Forecast results                  │
│     Backend API → EventBus: Emit 'forecast.completed'              │
│     EventBus → NotificationService: Alert inventory managers       │
│                                                                     │
│  6. Real-time Stock Update Flow (WebSocket)                        │
│     ────────────────────────────────────────────────────────────   │
│     Frontend → Backend API: Establish WebSocket connection         │
│     Backend API → WebSocketService: Register client                │
│     [Stock change occurs via API]                                  │
│     InventoryModule → EventBus: Emit 'stock.updated' event         │
│     EventBus → WebSocketService: Receive event                     │
│     WebSocketService → Frontend: Broadcast to all clients          │
│     Frontend → React State: Update UI optimistically               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

#### 2.2.3 Key Interfaces & APIs

**A. REST API Contracts (Backend ↔ Frontend)**

```typescript
// Material Module API
interface MaterialAPI {
  GET    /api/materials                 // List materials
  POST   /api/materials                 // Create material
  GET    /api/materials/:id             // Get material details
  PUT    /api/materials/:id             // Update material
  DELETE /api/materials/:id             // Delete material
  GET    /api/materials/categories      // List categories
  GET    /api/materials/search          // Search materials
}

// Inventory Lot Module API
interface InventoryLotAPI {
  GET    /api/lots                      // List lots (with filters)
  POST   /api/lots                      // Create lot
  GET    /api/lots/:id                  // Get lot details
  PUT    /api/lots/:id                  // Update lot
  PATCH  /api/lots/:id/status           // Update status only
  GET    /api/lots/expiring             // Get expiring lots
  GET    /api/lots/by-material/:materialId  // Lots by material
}

// Transaction Module API
interface TransactionAPI {
  POST   /api/transactions              // Record transaction
  GET    /api/transactions              // Transaction history
  POST   /api/transactions/receive      // Receive goods
  POST   /api/transactions/issue        // Issue goods
  POST   /api/transactions/adjust       // Adjust stock
  POST   /api/transactions/transfer     // Transfer between warehouses
}

// Labeling Module API
interface LabelingAPI {
  POST   /api/labels/generate           // Generate label (QR/Barcode)
  GET    /api/labels/templates          // List templates
  POST   /api/labels/print              // Print label
  GET    /api/labels/:id                // Get label data
}

// Stock Management Module API
interface StockManagementAPI {
  GET    /api/stock/levels              // Current stock levels
  GET    /api/stock/by-material/:id     // Stock by material
  POST   /api/stock/reserve             // Reserve stock
  POST   /api/stock/release             // Release reservation
  GET    /api/stock/low-stock           // Low stock alerts
  GET    /api/stock/reorder-suggestions // Auto-reorder suggestions
}

// QC Module API
interface QualityControlAPI {
  GET    /api/qc/tests                  // List QC tests
  POST   /api/qc/tests                  // Create QC test
  GET    /api/qc/tests/:id              // Get test details
  POST   /api/qc/approve/:lotId         // Approve lot
  POST   /api/qc/reject/:lotId          // Reject lot
  GET    /api/qc/pending                // Get pending tests
}

// Production Module API
interface ProductionAPI {
  GET    /api/production/batches        // List batches
  POST   /api/production/batches        // Create batch
  GET    /api/production/batches/:id    // Get batch details
  POST   /api/production/consume        // Consume materials
  GET    /api/production/traceability/:batchId  // Traceability
}

// Reporting Module API
interface ReportingAPI {
  GET    /api/reports/inventory         // Inventory report
  GET    /api/reports/transactions      // Transaction report
  GET    /api/reports/audit-log         // Audit log
  GET    /api/reports/kpi               // KPI dashboard data
  POST   /api/reports/export            // Export to Excel/PDF
}

// Search API
interface SearchAPI {
  GET    /api/search                    // Semantic search
  GET    /api/search/suggestions        // Auto-complete
}
```

**B. Event Bus Interface (Internal Communication)**

```typescript
// Internal Event Schema
interface EventBusInterface {
  // Inventory Events
  'inventory.lot.created':       { lotNumber, materialId, quantity }
  'inventory.lot.updated':       { lotNumber, changes }
  'inventory.stock.changed':     { sku, oldQty, newQty, reason }
  'inventory.reservation.made':  { reservationId, sku, quantity }

  // QC Events
  'qc.test.created':             { testId, lotNumber }
  'qc.lot.approved':             { lotNumber, approvedBy, timestamp }
  'qc.lot.rejected':             { lotNumber, rejectedBy, reason }

  // Production Events
  'production.batch.created':    { batchId, productCode }
  'production.material.consumed': { batchId, materialId, quantity }

  // System Events
  'system.cache.invalidate':     { cacheKey }
  'system.notification.send':    { userId, message, type }
}
```

**C. Database Repository Interface (Backend ↔ PostgreSQL)**

```typescript
// Repository Pattern
interface IRepository<T> {
  findAll(filters?: object): Promise<T[]>
  findById(id: string): Promise<T | null>
  create(data: Partial<T>): Promise<T>
  update(id: string, data: Partial<T>): Promise<T>
  delete(id: string): Promise<boolean>
}

// Specific Repositories
interface IInventoryLotRepository extends IRepository<InventoryLot> {
  findByMaterial(materialId: string): Promise<InventoryLot[]>
  findExpiringSoon(days: number): Promise<InventoryLot[]>
  findByStatus(status: LotStatus): Promise<InventoryLot[]>
  updateQuantity(lotId: string, delta: number): Promise<void>
}
```

**D. AI/ML Service Interface (Backend ↔ FastAPI)**

```python
# FastAPI Endpoints
class AIServiceInterface:
    # Semantic Search
    POST /semantic-search
    {
      "query": "coffee beans",
      "limit": 10,
      "filters": {...}
    }

    # Demand Forecast
    POST /forecast/demand
    {
      "sku": "SKU-001",
      "horizon_days": 30,
      "model": "prophet|lstm"
    }

    # Anomaly Detection
    POST /anomaly/detect
    {
      "data": [...],
      "threshold": 0.95
    }

    # Computer Vision QC
    POST /vision/qc
    {
      "image_url": "...",
      "model": "yolov8"
    }

    # LLM Chatbot
    POST /chatbot/query
    {
      "message": "What is current stock of SKU-001?",
      "context": {...}
    }
```

---

#### 2.2.4 Key Domain Models & Abstractions

**Core Domain Entities:**

```typescript
// Inventory Domain
interface Material {
  id: uuid
  sku: string                    // Unique identifier
  name: string
  description?: string
  category: string
  unit: string                   // kg, liters, pieces
  minStockLevel: number
  reorderPoint: number
  isActive: boolean
}

interface InventoryLot {
  id: uuid
  lotNumber: string              // LOT-YYYYMMDD-XXX
  materialId: uuid
  quantity: number
  unitCost: decimal(10,3)
  receivedDate: datetime
  expiryDate?: datetime
  status: 'quarantine' | 'approved' | 'rejected' | 'in_use' | 'depleted'
  warehouseLocation: string
  supplierInfo?: object
}

interface InventoryTransaction {
  id: uuid
  lotId: uuid
  type: 'receive' | 'issue' | 'adjust' | 'transfer'
  quantity: number
  reason: string
  performedBy: uuid              // User ID
  timestamp: datetime
  referenceNumber?: string
}

// QC Domain
interface QCTest {
  id: uuid
  lotNumber: string
  testDate: datetime
  testedBy: uuid
  testType: string
  results: jsonb                 // Flexible test data
  passed: boolean
  notes?: string
}

// Production Domain
interface ProductionBatch {
  id: uuid
  batchNumber: string            // BATCH-YYYYMMDD-XXX
  productCode: string
  plannedQuantity: number
  actualQuantity: number
  startDate: datetime
  completionDate?: datetime
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled'
}

interface BatchComponent {
  id: uuid
  batchId: uuid
  lotNumber: string              // Material used
  quantityUsed: number
  timestamp: datetime
}
```

---

#### 2.2.5 Design Patterns Used

**1. Layered Architecture**
```
Presentation → Application → Domain → Data Access → Database
• Clear separation of concerns
• Each layer depends only on layer below
• Easier testing via layer isolation
```

**2. Repository Pattern**
```typescript
// Abstraction over data access
class InventoryLotRepository implements IInventoryLotRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<InventoryLot | null> {
    return this.db.inventoryLots.findUnique({ where: { id } })
  }

  async updateQuantity(lotId: string, delta: number): Promise<void> {
    return this.db.$executeRaw`
      UPDATE inventory_lots
      SET current_quantity = current_quantity + ${delta}
      WHERE id = ${lotId}
    `
  }
}
```

**3. Service Layer Pattern**
```typescript
// Business logic encapsulation
class LotService {
  constructor(
    private lotRepository: IInventoryLotRepository,
    private eventBus: IEventBus,
    private cacheService: ICacheService
  ) {}

  async createLot(data: CreateLotDTO): Promise<InventoryLot> {
    // Business logic
    const lot = await this.lotRepository.create(data)
    await this.eventBus.emit('inventory.lot.created', lot)
    await this.cacheService.invalidate('stock-levels')
    return lot
  }
}
```

**4. Event-Driven Architecture (EDA)**
```typescript
// Loose coupling via events
eventBus.on('qc.lot.approved', async (event) => {
  await inventoryService.releaseFromQuarantine(event.lotNumber)
  await searchService.updateIndex(event.lotNumber)
  await notificationService.notify(event)
})
```

**5. CQRS Light (Command Query Responsibility Segregation)**
```
Write Model (Commands):        Read Model (Queries):
• PostgreSQL (ACID)            • Elasticsearch (search)
• Transactional updates        • Redis (cache)
• Eventual consistency         • Materialized views
```

**6. Dependency Injection**
```typescript
// Inversion of Control
class InventoryController {
  constructor(
    @Inject('LotService') private lotService: LotService,
    @Inject('AuthService') private authService: AuthService
  ) {}
}
```

**7. Strategy Pattern (AI/ML Models)**
```python
class ForecastStrategy(ABC):
    @abstractmethod
    def predict(self, data): pass

class ProphetForecast(ForecastStrategy):
    def predict(self, data): ...

class LSTMForecast(ForecastStrategy):
    def predict(self, data): ...

# Usage
forecaster = ProphetForecast() if simple else LSTMForecast()
result = forecaster.predict(data)
```

**8. Observer Pattern (WebSocket)**
```typescript
// Real-time updates
class WebSocketService {
  private clients: Set<WebSocket> = new Set()

  subscribe(client: WebSocket) {
    this.clients.add(client)
  }

  broadcast(event: any) {
    this.clients.forEach(client => client.send(JSON.stringify(event)))
  }
}
```

---

#### 2.2.6 Component Dependencies

```
┌────────────────────────────────────────────────────────────┐
│  DEPENDENCY GRAPH                                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Frontend Component                                         │
│      ↓ depends on                                          │
│      ├─→ Backend API Component (REST/WebSocket)            │
│      └─→ Keycloak Component (Auth)                         │
│                                                            │
│  Backend API Component                                      │
│      ↓ depends on                                          │
│      ├─→ PostgreSQL Component (OLTP data)                  │
│      ├─→ Redis Component (Cache)                           │
│      ├─→ Elasticsearch Component (Search)                  │
│      ├─→ Keycloak Component (JWT validation)               │
│      └─→ AI/ML Services Component (Optional)               │
│                                                            │
│  AI/ML Services Component                                   │
│      ↓ depends on                                          │
│      ├─→ PostgreSQL Component (Read historical data)       │
│      ├─→ Elasticsearch Component (Vector storage)          │
│      └─→ Claude API (External LLM)                         │
│                                                            │
│  Keycloak Component (Independent)                          │
│      ↓ depends on                                          │
│      └─→ PostgreSQL Component (User/realm storage)         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Dependency Rules:**
- ✅ Frontend → Backend (allowed)
- ✅ Backend → Database/Cache (allowed)
- ✅ Backend → AI/ML (allowed)
- ❌ Database → Backend (not allowed)
- ❌ AI/ML → Backend (not allowed, use events)
- ❌ Frontend → Database (not allowed, always via Backend)

---

### 2.3 Góc nhìn phát triển (Development View)

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
│  │ Material Module                                              │  │
│  │ • Material CRUD operations                                   │  │
│  │ • Category management                                        │  │
│  │ • Material search & filtering                               │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Inventory Lot Module                                         │  │
│  │ • Lot creation & tracking                                    │  │
│  │ • Expiry date monitoring                                     │  │
│  │ • Warehouse location management                              │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Transaction Module                                           │  │
│  │ • Goods receipt processing                                   │  │
│  │ • Goods issue tracking                                       │  │
│  │ • Stock adjustments                                          │  │
│  │ • Inter-warehouse transfers                                  │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Labeling Module                                              │  │
│  │ • QR/Barcode generation                                      │  │
│  │ • Label template management                                  │  │
│  │ • Print queue handling                                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Stock Management Module                                      │  │
│  │ • Real-time stock level tracking                            │  │
│  │ • Stock reservation system                                   │  │
│  │ • Auto-reorder point alerts                                  │  │
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

#### 2.5.1 Container Architecture - Modular Monolith

```
┌──────────────────────────────────────────────────────────────┐
│  DOCKER COMPOSE STACK (All Environments)                     │
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

#### 2.5.2 Chi tiết Deployment theo thành phần

##### A. FRONTEND DEPLOYMENT - Vercel CDN

**Phương án deployment: Vercel (Global CDN)**

```
┌────────────────────────────────────────────────────────────┐
│  FRONTEND - VERCEL CDN ARCHITECTURE                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. Build Process:                                         │
│     cd frontend                                            │
│     npm install                                            │
│     npm run build    # Vite builds to dist/               │
│     ↓                                                      │
│     Output: Static files (HTML, JS, CSS, assets)          │
│                                                            │
│  2. Deploy to Vercel:                                      │
│     vercel --prod                                          │
│     OR: Auto-deploy via Git push (GitHub integration)     │
│                                                            │
│  3. Configuration:                                         │
│     vercel.json:                                           │
│     {                                                      │
│       "buildCommand": "npm run build",                     │
│       "outputDirectory": "dist",                           │
│       "framework": "vite"                                  │
│     }                                                      │
│                                                            │
│     Environment Variables (via Vercel Dashboard):          │
│     - VITE_API_URL=https://api.yourdomain.com             │
│     - VITE_KEYCLOAK_URL=https://auth.yourdomain.com       │
│     - VITE_WS_URL=wss://api.yourdomain.com/ws             │
│                                                            │
│  4. Custom Domain:                                         │
│     app.yourdomain.com → Vercel                           │
│     (Add CNAME record in DNS: app → cname.vercel-dns.com) │
│                                                            │
│  5. Features:                                              │
│     ✓ Global CDN (100+ locations)                         │
│     ✓ Auto SSL/TLS certificates                           │
│     ✓ Automatic deployments from Git                      │
│     ✓ Preview deployments for PRs                         │
│     ✓ Edge caching & compression                          │
│     ✓ DDoS protection included                            │
│                                                            │
│  6. Cost:                                                  │
│     • Hobby Plan: FREE (personal/small projects)          │
│     • Pro Plan: $20/month (commercial, custom domains)    │
│     • Bandwidth: 100GB/mo included                        │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Deployment Commands:**
```bash
# One-time setup
cd frontend
npm install -g vercel
vercel login

# Deploy to production
vercel --prod

# Deploy to preview (staging)
vercel
```

---

##### B. BACKEND DEPLOYMENT - Docker on VPS

**Phương án deployment: Docker Containers on VPS (Hetzner/DigitalOcean)**

```
┌────────────────────────────────────────────────────────────┐
│  BACKEND - DOCKER ON VPS ARCHITECTURE                      │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  VPS Specifications:                                       │
│  • Provider: Hetzner CPX41 (recommended for cost)         │
│  • Specs: 16GB RAM, 8 vCPU, 240GB NVMe SSD                │
│  • Cost: ~$80/month                                        │
│  • OS: Ubuntu 22.04 LTS                                    │
│  • Location: Choose closest to users (EU/US/Asia)         │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  VPS Server (IP: 123.456.789.0)                       │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐│ │
│  │  │ NGINX Reverse Proxy (:80, :443)                  ││ │
│  │  │ • SSL/TLS termination (Let's Encrypt)            ││ │
│  │  │ • Load balancing across backend instances        ││ │
│  │  │ • Rate limiting (10K req/min per IP)             ││ │
│  │  │ • CORS & security headers                        ││ │
│  │  └──────────────────────────────────────────────────┘│ │
│  │                       ↓                                │ │
│  │  ┌──────────────────────────────────────────────────┐│ │
│  │  │ Backend Containers (Docker Compose)              ││ │
│  │  │ ├─ backend-1 (:3000) ─┐                          ││ │
│  │  │ ├─ backend-2 (:3001)  │ Load balanced            ││ │
│  │  │ └─ backend-3 (:3002) ─┘                          ││ │
│  │  │                                                   ││ │
│  │  │ ├─ ai-ml-service (:8000) FastAPI                 ││ │
│  │  │ ├─ redis (:6379) Cache                           ││ │
│  │  │ └─ elasticsearch (:9200) Search                  ││ │
│  │  └──────────────────────────────────────────────────┘│ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐│ │
│  │  │ Monitoring Stack                                  ││ │
│  │  │ ├─ prometheus (:9090) Metrics                    ││ │
│  │  │ ├─ grafana (:3001) Dashboards                    ││ │
│  │  │ └─ jaeger (:16686) Tracing                       ││ │
│  │  └──────────────────────────────────────────────────┘│ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  Docker Compose Configuration:                             │
│  ──────────────────────────────────────────────────────── │
│  services:                                                 │
│    backend:                                                │
│      build: ./backend                                      │
│      image: ims-backend:latest                            │
│      deploy:                                               │
│        replicas: 3                                         │
│        resources:                                          │
│          limits:                                           │
│            cpus: '2'                                       │
│            memory: 4G                                      │
│      environment:                                          │
│        - NODE_ENV=production                               │
│        - DATABASE_URL=${DATABASE_URL}                      │
│        - REDIS_URL=redis://redis:6379                     │
│        - KEYCLOAK_URL=${KEYCLOAK_URL}                     │
│      ports:                                                │
│        - "3000-3002:3000"                                  │
│      restart: always                                       │
│      healthcheck:                                          │
│        test: ["CMD", "curl", "-f", "http://localhost:3000/health"]│
│        interval: 30s                                       │
│        timeout: 10s                                        │
│        retries: 3                                          │
│      depends_on:                                           │
│        - redis                                             │
│        - elasticsearch                                     │
│                                                            │
│    ai-ml-service:                                          │
│      build: ./ai-ml-services                              │
│      image: ims-ai-ml:latest                              │
│      ports:                                                │
│        - "8000:8000"                                       │
│      environment:                                          │
│        - PYTHONUNBUFFERED=1                                │
│        - ES_URL=http://elasticsearch:9200                 │
│      restart: always                                       │
│                                                            │
│    redis:                                                  │
│      image: redis:7-alpine                                │
│      ports:                                                │
│        - "6379:6379"                                       │
│      volumes:                                              │
│        - redis-data:/data                                  │
│      command: redis-server --appendonly yes               │
│                                                            │
│    elasticsearch:                                          │
│      image: docker.elastic.co/elasticsearch/elasticsearch:8.12.0│
│      environment:                                          │
│        - discovery.type=single-node                       │
│        - "ES_JAVA_OPTS=-Xms2g -Xmx2g"                     │
│      ports:                                                │
│        - "9200:9200"                                       │
│      volumes:                                              │
│        - es-data:/usr/share/elasticsearch/data            │
│                                                            │
│  volumes:                                                  │
│    redis-data:                                             │
│    es-data:                                                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**NGINX Configuration:**
```nginx
# /etc/nginx/sites-available/ims-api
upstream backend {
    least_conn;
    server localhost:3000 max_fails=3 fail_timeout=30s;
    server localhost:3001 max_fails=3 fail_timeout=30s;
    server localhost:3002 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
    limit_req zone=api burst=200 nodelay;

    # API Proxy
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket Support
    location /ws/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }

    # Health Check
    location /health {
        proxy_pass http://backend/health;
        access_log off;
    }
}
```

**Deployment Script:**
```bash
#!/bin/bash
# /opt/ims/deploy.sh

set -e  # Exit on error

echo "🚀 Deploying IMS Backend..."

# Navigate to project directory
cd /opt/ims

# Pull latest code
echo "📥 Pulling latest code from Git..."
git pull origin master

# Build Docker images
echo "🏗️  Building Docker images..."
docker-compose build --no-cache

# Stop old containers
echo "🛑 Stopping old containers..."
docker-compose down

# Start new containers
echo "✅ Starting new containers..."
docker-compose up -d --scale backend=3

# Wait for health checks
echo "⏳ Waiting for services to be healthy..."
sleep 30

# Check health
echo "🏥 Checking service health..."
curl -f http://localhost:3000/health || exit 1

# Reload NGINX
echo "🔄 Reloading NGINX..."
sudo systemctl reload nginx

echo "✅ Deployment completed successfully!"
```

**CI/CD Pipeline (GitHub Actions):**
```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend to VPS

on:
  push:
    branches: [master]
    paths:
      - 'backend/**'
      - 'ai-ml-services/**'
      - 'docker-compose.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/ims
            bash deploy.sh
```

---

##### C. DATABASE DEPLOYMENT - Hybrid Approach

**Phương án deployment: PostgreSQL Managed + Redis/ES Self-hosted**

```
┌────────────────────────────────────────────────────────────┐
│  DATABASE ARCHITECTURE (Hybrid)                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. PostgreSQL (DigitalOcean Managed Database)            │
│     ─────────────────────────────────────────────────────  │
│     • Plan: Basic ($120/mo)                                │
│     • Specs: 4GB RAM, 2 vCPU, 115GB storage               │
│     • Features:                                            │
│       - Automated daily backups (7 days retention)        │
│       - Standby node for HA                                │
│       - Point-in-time recovery                             │
│       - SSL connections required                           │
│       - Connection pooling built-in                        │
│     • Connection:                                          │
│       postgresql://user:pass@db-postgresql-sgp1-12345.db.ondigitalocean.com:25060/ims?sslmode=require│
│                                                            │
│  2. Redis (Self-hosted on VPS)                            │
│     ─────────────────────────────────────────────────────  │
│     • Deployment: Docker container on same VPS as backend │
│     • Memory: 4GB allocated                                │
│     • Persistence: RDB + AOF enabled                       │
│     • Use Cases:                                           │
│       - Stock levels cache (TTL: 5 min)                   │
│       - Session storage                                    │
│       - Rate limiting counters                             │
│       - WebSocket connection tracking                      │
│     • Configuration:                                       │
│       maxmemory 4gb                                        │
│       maxmemory-policy allkeys-lru                         │
│       save 900 1     # RDB snapshot every 15min           │
│       appendonly yes # AOF for durability                 │
│                                                            │
│  3. Elasticsearch (Self-hosted on VPS)                    │
│     ─────────────────────────────────────────────────────  │
│     • Deployment: Docker container on same VPS            │
│     • Heap: 4GB (50% of allocated 8GB)                    │
│     • Storage: 50GB dedicated                              │
│     • Use Cases:                                           │
│       - Semantic search (vector embeddings)               │
│       - Full-text search (materials, lots)                │
│       - Log aggregation (via Fluentd)                     │
│     • Configuration:                                       │
│       cluster.name: ims-search                             │
│       discovery.type: single-node                          │
│       xpack.security.enabled: false (internal network)    │
│                                                            │
│  4. Backup Strategy                                        │
│     ─────────────────────────────────────────────────────  │
│     PostgreSQL:                                            │
│     • Automated by DigitalOcean (daily backups)           │
│     • Manual exports: pg_dump weekly to S3                │
│                                                            │
│     Redis:                                                 │
│     • RDB snapshots (automatic)                           │
│     • AOF logs (continuous)                               │
│     • Daily backup RDB to S3 via cron                     │
│                                                            │
│     Elasticsearch:                                         │
│     • Snapshot repository to S3 (weekly)                  │
│     • Can rebuild index from PostgreSQL if needed         │
│                                                            │
│  5. Monitoring                                             │
│     ─────────────────────────────────────────────────────  │
│     • Prometheus exporters:                                │
│       - postgres_exporter (connects to DO managed DB)     │
│       - redis_exporter                                     │
│       - elasticsearch_exporter                             │
│     • Grafana dashboards for all databases                │
│     • Alerts:                                              │
│       - PostgreSQL connections >80%                        │
│       - Redis memory >90%                                  │
│       - Elasticsearch disk >85%                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Why Hybrid Approach?**

| Database | Deployment | Reason |
|----------|-----------|--------|
| **PostgreSQL** | Managed (DO) | • Critical data needs HA & backups<br>• Automatic failover<br>• Professional support<br>• Worth $120/mo for peace of mind |
| **Redis** | Self-hosted | • Cache layer, acceptable data loss<br>• Easy to restore<br>• Save $40-100/mo |
| **Elasticsearch** | Self-hosted | • Search index, can rebuild from PG<br>• Non-critical data<br>• Save $150-300/mo |

---
#### 2.5.3 Tổng hợp Chi phí & Khuyến nghị Deployment

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

**Cost Comparison:**

| Deployment Model | Monthly Cost | Max Users | Reliability | Complexity |
|------------------|--------------|-----------|-------------|------------|
| **Budget (All-in-One VPS)** | $110 | ~500 | Medium | Low |
| **Recommended (Hybrid)** | $220 | ~5,000 | High | Medium |

**Note:** Kiến trúc monolith này có thể scale đến 10,000+ users bằng cách:
- Tăng VPS resources (vertical scaling)
- Thêm Read replicas cho PostgreSQL
- Sử dụng CDN cho static assets
- Optimize database queries và caching

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
│  • Secrets management (.env files + Docker secrets)      │
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
│  │  • Orchestration:       Docker Compose (all environments)                │   │
│  │  • API Testing:         Postman / Thunder Client                         │   │
│  │  • Code Quality:        ESLint + Prettier                                │   │
│  │  • Testing:             Jest + React Testing Library                     │   │
│  │  • Load Testing:        k6                                               │   │
│  │  • Secret Management:   .env files + Docker secrets                     │   │
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
│   │   └── docker-compose.yml         # All environments
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
   - Docker Compose cho tất cả môi trường (dev, staging, production)

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
5. **AI Priority:** Which AI feature most valuable? (Forecast vs Anomaly vs Vision)

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
