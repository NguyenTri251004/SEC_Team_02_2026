# 05_Architecture

## 1. Tổng quan kiến trúc

Hệ thống **Inventory Management System** được thiết kế theo mô hình **Hybrid Modular Architecture** kết hợp:

- **Lõi modular monolith**, có khả năng tách các dịch vụ khi cần
- **Triển khai trên nền tảng đám mây (cloud-native deployment)** với containerization
- **Năng lực AI/ML (AI/ML capabilities)** hỗ trợ các chức năng thông minh
- **Khả năng quan sát (observability)** với logs và metrics tập trung phục vụ giám sát và vận hành

### 1.1 Kiến trúc tổng thể

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                             IMS ARCHITECTURE                                  │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  CLIENT LAYER                                                            │  │
│  │  ──────────────────────────────────────────────────────────────────────  │  │
│  │  • Web Browser (React SPA)                                               │  │
│  │  • Mobile Browser (Responsive)                                           │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                 │
│                              │ HTTPS + JWT + REST                              │
│                              ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  API GATEWAY (Express.js)                                                │  │
│  │  • Routing, Auth Verification, Rate Limiting                             │  │
│  │  • Load Balancing, SSL Termination                                       │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                 │
│                              ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  APPLICATION LAYER (Modular Monolith)                                    │  │
│  │  ──────────────────────────────────────────────────────────────────────  │  │
│  │  CORE MODULES:                                                           │  │
│  │  ├─ Material Module (Material CRUD, Categories)                          │  │
│  │  ├─ Inventory Lot Module (Lot Tracking, Expiry, Location)                │  │
│  │  ├─ Transaction Module (Receive, Issue, Adjust, Transfer)                │  │
│  │  ├─ Labeling Module (QR/Barcode Generation, Printing)                    │  │
│  │  ├─ Stock Management Module (Real-time Levels, Reservations, Reorder)    │  │
│  │  ├─ QC Module (Quality Control, Approval/Reject)                         │  │
│  │  ├─ Production Module (Batches, Components)                              │  │
│  │  ├─ Reporting Module (Analytics, Audit Logs)                             │  │
│  │  └─ User Management (RBAC integration with Keycloak)                     │  │
│  │                                                                          │  │
│  │  AI/ML SERVICES (FastAPI):                                               │  │
│  │  ├─ Semantic Search (Elasticsearch + Vector Embeddings)                  │  │
│  │  ├─ Demand Forecasting (Prophet + LSTM)                                  │  │
│  │  ├─ Anomaly Detection (Isolation Forest)                                 │  │
│  │  ├─ QC Vision (YOLOv8 - Computer Vision)                                 │  │
│  │  └─ LLM Chatbot (Claude API)                                             │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                              │                                                 │
│                              │ Internal Event Emitter                          │
│                              ▼                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  DATA & INFRASTRUCTURE LAYER                                             │  │
│  │  ──────────────────────────────────────────────────────────────────────  │  │
│  │  PRIMARY STORAGE:                                                        │  │
│  │  ├─ PostgreSQL 16 (OLTP - inventory data)                                │  │
│  │  ├─ Redis (Cache - stock levels, sessions)                               │  │
│  │  └─ Elasticsearch 8.12+ (Search + Vectors)                               │  │
│  │                                                                          │  │
│  │  IDENTITY & ACCESS:                                                      │  │
│  │  └─ Keycloak 24+ (SSO, RBAC, OAuth2/OIDC)                                │  │
│  │                                                                          │  │
│  │  OBSERVABILITY STACK:                                                    │  │
│  │  ├─ Grafana Cloud (Metrics, Logs & Dashboards - Managed)                 │  │
│  │  └─ Fly.io Metrics (Built-in monitoring)                                 │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  DEPLOYMENT & ORCHESTRATION                                              │  │
│  │  ──────────────────────────────────────────────────────────────────────  │  │
│  │  • Docker Containers (All services)                                      │  │
│  │  • Docker Compose (Orchestration)                                        │  │
│  │  • GitHub Actions (CI/CD Pipeline)                                       │  │
│  │  • PostgreSQL Backups (Automated)                                        │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Các góc nhìn kiến trúc (4+1 View Model)

### 2.1 Góc nhìn nghiệp vụ (Business View)

- **Vai trò người dùng (User Roles):**
  - `Admin` - Quản trị hệ thống, cấu hình, quản lý người dùng
  - `InventoryManager` - Quản lý kho, nhập/xuất hàng, truy xuất, giám sát báo cáo
  - `QualityControl` - Kiểm tra chất lượng, duyệt/từ chối lô hàng
  - `Operator` - Nhân viên vận hành: nhập hàng, xuất hàng, kiểm kê, in nhãn
  - `Viewer` - Xem báo cáo, bảng điều khiển (dashboard) chỉ đọc
- **Quy trình chính:**
  - **Nhập kho (receiving):** Nhập kho → Tạo InventoryLot → Kiểm tra QC → Duyệt/từ chối
  - **Sản xuất (production):** Tạo ProductionBatch → Tiêu thụ vật tư → Theo dõi thành phần
  - **Dán nhãn (labeling):** Tạo nhãn (QR/Barcode) → In
  - **Vận hành với sự hỗ trợ của AI (AI-assisted operations):** Dự báo nhu cầu → Gợi ý đặt hàng lại → Cảnh báo bất thường

---

### 2.2 Góc nhìn logic (Logical View)

Logical View mô tả **các thành phần chính** của hệ thống, **mối quan hệ** giữa chúng, và **cách chúng tương tác** với nhau để thực hiện các chức năng nghiệp vụ.

#### 2.2.1 Component Diagram - Sơ đồ thành phần tổng thể

```
┌────────────────────────────────────────────────────────────────────────────┐
│                        LOGICAL ARCHITECTURE                                │
│                     (Component & Relationship View)                        │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  CLIENT TIER                                                         │  │
│  │  ──────────────────────────────────────────────────────────────────  │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Frontend Component (React SPA)                                │  │  │
│  │  │  ────────────────────────────────────────────────────────────  │  │  │
│  │  │  Responsibilities:                                             │  │  │
│  │  │  • User interface rendering                                    │  │  │
│  │  │  • Client-side routing & state management                      │  │  │
│  │  │  • Form validation & user input handling                       │  │  │
│  │  │                                                                │  │  │
│  │  │  Sub-components:                                               │  │  │
│  │  │  ├─ Material Management UI (CRUD, categories, search)          │  │  │
│  │  │  ├─ Inventory Lot UI (lot tracking, expiry alerts)             │  │  │
│  │  │  ├─ Transaction UI (receive, issue, adjust, transfer)          │  │  │
│  │  │  ├─ Labeling UI (generate QR/barcode, print labels)            │  │  │
│  │  │  ├─ Stock Dashboard (real-time levels, reservations)           │  │  │
│  │  │  ├─ QC Dashboard (quality control, approval workflow)          │  │  │
│  │  │  ├─ Production Tracking UI (batches, components)               │  │  │
│  │  │  ├─ Reporting & Analytics UI (KPIs, audit logs)                │  │  │
│  │  │  └─ Authentication UI (Keycloak integration)                   │  │  │
│  │  │                                                                │  │  │
│  │  │  Technologies:                                                 │  │  │
│  │  │  • React 19 + TypeScript                                       │  │  │
│  │  │  • Ant Design (UI components — planned)                        │  │  │
│  │  │  • React Query (server state)                                  │  │  │
│  │  │  • Zustand (client state)                                      │  │  │
│  │  │  • React Router v6                                             │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              │                                             │
│                              │ REST API (JSON) — CRUD operations           │
│                              │ OAuth2/OIDC (Auth via Keycloak)             │
│                              ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  APPLICATION TIER                                                    │  │
│  │  ──────────────────────────────────────────────────────────────────  │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  API Gateway Component (Express.js)                            │  │  │
│  │  │  ────────────────────────────────────────────────────────────  │  │  │
│  │  │  Responsibilities:                                             │  │  │
│  │  │  • Request routing & load balancing                            │  │  │
│  │  │  • SSL termination                                             │  │  │
│  │  │  • JWT validation (initial check)                              │  │  │
│  │  │  • Rate limiting & throttling                                  │  │  │
│  │  │  • CORS policy enforcement                                     │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                              ▼                                       │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Backend API Component (Node.js + Express)                     │  │  │
│  │  │  ────────────────────────────────────────────────────────────  │  │  │
│  │  │  Responsibilities:                                             │  │  │
│  │  │  • Business logic orchestration                                │  │  │
│  │  │  • API endpoint implementation                                 │  │  │
│  │  │  • Request/Response handling                                   │  │  │
│  │  │  • Event publishing/subscribing                                │  │  │
│  │  │                                                                │  │  │
│  │  │  Core Modules (Bounded Contexts):                              │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ MaterialModule                                           │  │  │  │
│  │  │  │ • MaterialService (CRUD, search, categorize)             │  │  │  │
│  │  │  │ • MaterialValidationService (business rules)             │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ InventoryLotModule                                       │  │  │  │
│  │  │  │ • LotService (create, track, update status)              │  │  │  │
│  │  │  │ • LotExpiryService (expiry tracking, alerts)             │  │  │  │
│  │  │  │ • LotLocationService (warehouse location)                │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ TransactionModule                                        │  │  │  │
│  │  │  │ • ReceiveService (goods receipt)                         │  │  │  │
│  │  │  │ • IssueService (goods issue)                             │  │  │  │
│  │  │  │ • AdjustmentService (stock adjustments)                  │  │  │  │
│  │  │  │ • TransferService (inter-warehouse transfers)            │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ LabelingModule                                           │  │  │  │
│  │  │  │ • LabelGenerationService (QR/Barcode)                    │  │  │  │
│  │  │  │ • PrintService (label printing)                          │  │  │  │
│  │  │  │ • TemplateService (label templates)                      │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ StockManagementModule                                    │  │  │  │
│  │  │  │ • StockLevelService (real-time stock tracking)           │  │  │  │
│  │  │  │ • ReservationService (reserve/release stock)             │  │  │  │
│  │  │  │ • ReorderService (auto-reorder alerts)                   │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ QualityControlModule                                     │  │  │  │
│  │  │  │ • QCTestService (create tests, record results)           │  │  │  │
│  │  │  │ • ApprovalWorkflowService (approve/reject lots)          │  │  │  │
│  │  │  │ • QuarantineService (quarantine enforcement)             │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ ProductionModule                                         │  │  │  │
│  │  │  │ • BatchService (batch creation, tracking)                │  │  │  │
│  │  │  │ • ComponentTrackingService (material → batch)            │  │  │  │
│  │  │  │ • ProductionHistoryService (audit trail)                 │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                │  │  │
│  │  │  ┌──────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ ReportingModule                                          │  │  │  │
│  │  │  │ • ReportService (generate reports)                       │  │  │  │
│  │  │  │ • AnalyticsService (KPI calculations)                    │  │  │  │
│  │  │  │ • AuditService (audit trail queries)                     │  │  │  │
│  │  │  │ • TraceabilityService (lot → batch → product)            │  │  │  │
│  │  │  └──────────────────────────────────────────────────────────┘  │  │  │
│  │  │                                                                │  │  │
│  │  │  Cross-Cutting Services:                                       │  │  │
│  │  │  • AuthService (JWT verification with Keycloak)                │  │  │
│  │  │  • ValidationService (request validation)                      │  │  │
│  │  │  • LoggingService (structured logging)                         │  │  │
│  │  │  • EventBusService (internal event pub/sub)                    │  │  │
│  │  │  • CacheService (Redis integration)                            │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  │                              ▼                                       │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  AI/ML Services Component (FastAPI)                            │  │  │
│  │  │  ────────────────────────────────────────────────────────────  │  │  │
│  │  │  Responsibilities:                                             │  │  │
│  │  │  • AI model inference & predictions                            │  │  │
│  │  │  • ML pipeline orchestration                                   │  │  │
│  │  │  • Semantic search processing                                  │  │  │
│  │  │                                                                │  │  │
│  │  │  Services:                                                     │  │  │
│  │  │  • SemanticSearchService (embeddings + kNN search)             │  │  │
│  │  │  • DemandForecastService (Prophet + LSTM)                      │  │  │
│  │  │  • AnomalyDetectionService (Isolation Forest)                  │  │  │
│  │  │  • ComputerVisionService (YOLOv8 QC)                           │  │  │
│  │  │  • ChatbotService (Claude API integration)                     │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                              │                                             │
│                              │ Database Queries (SQL)                      │
│                              │ Cache Operations (Redis)                    │
│                              │ Search Queries (Elasticsearch)              │
│                              ▼                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  DATA TIER                                                           │  │
│  │  ──────────────────────────────────────────────────────────────────  │  │
│  │                                                                      │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐  │  │
│  │  │ Auth Component │  │ Data Component │  │ Search Component       │  │  │
│  │  │ (Keycloak)     │  │ (PostgreSQL)   │  │ (Elasticsearch)        │  │  │
│  │  │                │  │                │  │                        │  │  │
│  │  │ • User mgmt    │  │ • Inventory    │  │ • Full-text search     │  │  │
│  │  │ • RBAC         │  │ • Transactions │  │ • Semantic search      │  │  │
│  │  │ • SSO/OIDC     │  │ • QC data      │  │ • Vector embeddings    │  │  │
│  │  │ • Token mgmt   │  │ • Production   │  │ • Log aggregation      │  │  │
│  │  └────────────────┘  │ • Audit logs   │  └────────────────────────┘  │  │
│  │                      └────────────────┘                              │  │
│  │                                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────────┐  │  │
│  │  │  Cache Component (Redis)                                       │  │  │
│  │  │  • Stock levels cache                                          │  │  │
│  │  │  • Session storage                                             │  │  │
│  │  │  • Rate limiting counters                                      │  │  │
│  │  └────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                            │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  EXTERNAL SERVICES                                                   │  │
│  │  ──────────────────────────────────────────────────────────────────  │  │
│  │  • Claude API (LLM for chatbot)                                      │  │
│  │  • Email Service (notifications)                                     │  │
│  │  • SMS Gateway (alerts - optional)                                   │  │
│  │  • Backup Storage (S3-compatible)                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
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
│     ────────────────────────────────────────────────────────────    │
│     Frontend → Keycloak: Request authorization                      │
│     Keycloak → Frontend: Redirect with code                         │
│     Frontend → Keycloak: Exchange code for tokens                   │
│     Keycloak → Frontend: JWT (access + refresh)                     │
│     Frontend → Backend API: Request with JWT                        │
│     Backend API → Keycloak: Validate JWT (JWKS)                     │
│     Backend API → Frontend: Protected resource                      │
│                                                                     │
│  2. Inventory Transaction Flow (Create Lot)                         │
│     ────────────────────────────────────────────────────────────    │
│     Frontend → Backend API: POST /api/inventory/lots                │
│     Backend API → ValidationService: Validate request               │
│     Backend API → InventoryModule.LotService: createLot()           │
│     LotService → PostgreSQL: INSERT inventory_lots                  │
│     LotService → EventBus: Emit 'lot.created' event                 │
│     EventBus → SearchService: Index lot in Elasticsearch            │
│     EventBus → CacheService: Invalidate stock cache                 │
│     Backend API → Frontend: Success response (201)                  │
│                                                                     │
│  3. QC Approval Workflow                                            │
│     ────────────────────────────────────────────────────────────    │
│     Frontend → Backend API: POST /api/qc/approve/{lotId}            │
│     Backend API → QCModule.ApprovalWorkflowService: approveLot()    │
│     ApprovalWorkflowService → PostgreSQL: UPDATE lot status         │
│     ApprovalWorkflowService → EventBus: Emit 'lot.approved'         │
│     EventBus → InventoryModule: Release from quarantine             │
│     EventBus → AI/ML Service: Trigger anomaly detection             │
│     EventBus → NotificationService: Send approval notification      │
│     Backend API → Frontend: Success response                        │
│                                                                     │
│  4. Semantic Search Flow                                            │
│     ────────────────────────────────────────────────────────────    │
│     Frontend → Backend API: GET /api/search?q=coffee                │
│     Backend API → AI/ML Service: POST /semantic-search              │
│     AI/ML Service → EmbeddingModel: Generate vector                 │
│     AI/ML Service → Elasticsearch: kNN vector search                │
│     Elasticsearch → AI/ML Service: Search results                   │
│     AI/ML Service → Backend API: Ranked results                     │
│     Backend API → PostgreSQL: Enrich with latest data               │
│     Backend API → Frontend: Search results (JSON)                   │
│                                                                     │
│  5. Demand Forecasting Flow (Batch Process)                         │
│     ────────────────────────────────────────────────────────────    │
│     Cron Job → Backend API: POST /api/forecast/run                  │
│     Backend API → AI/ML Service: POST /forecast/demand              │
│     AI/ML Service → PostgreSQL: Fetch historical data               │
│     AI/ML Service → Prophet Model: Generate baseline forecast       │
│     AI/ML Service → LSTM Model: Generate advanced forecast          │
│     AI/ML Service → PostgreSQL: Store predictions                   │
│     AI/ML Service → Backend API: Forecast results                   │
│     Backend API → EventBus: Emit 'forecast.completed'               │
│     EventBus → NotificationService: Alert inventory managers        │
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
  "inventory.lot.created": { lotNumber; materialId; quantity };
  "inventory.lot.updated": { lotNumber; changes };
  "inventory.stock.changed": { sku; oldQty; newQty; reason };
  "inventory.reservation.made": { reservationId; sku; quantity };

  // QC Events
  "qc.test.created": { testId; lotNumber };
  "qc.lot.approved": { lotNumber; approvedBy; timestamp };
  "qc.lot.rejected": { lotNumber; rejectedBy; reason };

  // Production Events
  "production.batch.created": { batchId; productCode };
  "production.material.consumed": { batchId; materialId; quantity };

  // System Events
  "system.cache.invalidate": { cacheKey };
  "system.notification.send": { userId; message; type };
}
```

**C. Database Repository Interface (Backend ↔ PostgreSQL)**

```typescript
// Repository Pattern
interface IRepository<T> {
  findAll(filters?: object): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// Specific Repositories
interface IInventoryLotRepository extends IRepository<InventoryLot> {
  findByMaterial(materialId: string): Promise<InventoryLot[]>;
  findExpiringSoon(days: number): Promise<InventoryLot[]>;
  findByStatus(status: LotStatus): Promise<InventoryLot[]>;
  updateQuantity(lotId: string, delta: number): Promise<void>;
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

**Architecture — Multi-Protocol API:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  MULTI-PROTOCOL API ARCHITECTURE                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Frontend (React SPA)                                                   │
│      │                                                                  │
│      ├── REST API (/api/*)         → CRUD operations, simple queries    │
│                                                                         │
│  Backend (Node.js + Express)                                            │
│      │                                                                  │
│      ├── REST endpoints            → Express Router (existing)          │
│              │                                                          │
│              ▼                                                          │
│  AI/ML Service (Python + FastAPI)                                       │
│          ├── SemanticSearchService                                      │
│          ├── ForecastService                                            │
│          └── AnomalyService                                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
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

**1. Repository Pattern**

```typescript
// Abstraction over data access
class InventoryLotRepository implements IInventoryLotRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<InventoryLot | null> {
    return this.db.inventoryLots.findUnique({ where: { id } });
  }

  async updateQuantity(lotId: string, delta: number): Promise<void> {
    return this.db.$executeRaw`
      UPDATE inventory_lots
      SET current_quantity = current_quantity + ${delta}
      WHERE id = ${lotId}
    `;
  }
}
```

**2. Service Layer Pattern**

```typescript
// Business logic encapsulation
class LotService {
  constructor(
    private lotRepository: IInventoryLotRepository,
    private eventBus: IEventBus,
    private cacheService: ICacheService,
  ) {}

  async createLot(data: CreateLotDTO): Promise<InventoryLot> {
    // Business logic
    const lot = await this.lotRepository.create(data);
    await this.eventBus.emit("inventory.lot.created", lot);
    await this.cacheService.invalidate("stock-levels");
    return lot;
  }
}
```

**3. Event-Driven Architecture (EDA)**

```typescript
// Loose coupling via events
eventBus.on("qc.lot.approved", async (event) => {
  await inventoryService.releaseFromQuarantine(event.lotNumber);
  await searchService.updateIndex(event.lotNumber);
  await notificationService.notify(event);
});
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
    @Inject("LotService") private lotService: LotService,
    @Inject("AuthService") private authService: AuthService,
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


---

#### 2.2.6 Component Dependencies

```
┌────────────────────────────────────────────────────────────┐
│  DEPENDENCY GRAPH                                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Frontend Component                                        │
│      ↓ depends on                                          │
│      ├─→ Backend API Component (REST)            │
│      └─→ Keycloak Component (Auth)                         │
│                                                            │
│  Backend API Component                                     │
│      ↓ depends on                                          │
│      ├─→ PostgreSQL Component (OLTP data)                  │
│      ├─→ Redis Component (Cache)                           │
│      ├─→ Elasticsearch Component (Search)                  │
│      ├─→ Keycloak Component (JWT validation)               │
│      └─→ AI/ML Services Component (via REST)               │
│                                                            │
│  AI/ML Services Component                                  │
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

#### 2.3.1 Kiến trúc Modular Monolith

Hệ thống backend được tổ chức theo mô hình **Modular Monolith** — mỗi module là một bounded context độc lập, giao tiếp qua internal interfaces. Toàn bộ module nằm trong cùng một deployable unit (Express.js server) nhưng được tách biệt rõ ràng về mặt code.

```
┌────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React SPA)                                              │
│  ────────────────────────────────────────────────────────────────  │
│  • Pages & Components (React + Ant Design)                         │
│  • Routing (React Router v6)                                       │
│  • State (React Query + Zustand)                                   │
│  • Auth (Keycloak integration)                                     │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ REST (JSON)
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  BACKEND — MODULAR MONOLITH (Node.js + Express + TypeScript)       │
│  ────────────────────────────────────────────────────────────────  │
│                                                                    │
│  src/                                                              │
│  ├── server.ts                  ← Entry point, mount routes        │
│  │                                                                 │
│  ├── shared/                    ← Shared infrastructure            │
│  │   ├── db/pool.ts             (PostgreSQL connection pool)       │
│  │   └── cache/redis.ts         (Redis client, graceful fallback)  │
│  │                                                                 │
│  └── modules/                   ← Nghiệp vụ chia theo module       │
│      │                                                             │
│      ├── materials/             ← Quản lý nguyên vật liệu          │
│      │   ├── material.types.ts  (interfaces + DTOs)                │
│      │   ├── material.service.ts(DB queries + cache)               │
│      │   └── material.routes.ts (GET/POST/PUT/DELETE)              │
│      │                                                             │
│      ├── transactions/          ← Nhập/xuất kho                    │
│      │   ├── transaction.types.ts                                  │
│      │   ├── transaction.service.ts                                │
│      │   └── transaction.routes.ts                                 │
│      │                                                             │
│      ├── inventory-lots/        ← Quản lý lô hàng (planned)        │
│      ├── qc/                    ← Kiểm soát chất lượng (planned)   │
│      ├── labeling/              ← Tem nhãn QR/Barcode (planned)    │
│      ├── stock/                 ← Quản lý tồn kho (planned)        │
│      └── reporting/             ← Báo cáo nghiệp vụ (planned)      │
│                                                                    │
│  Mỗi module có 3 file chuẩn:                                       │
│  • *.types.ts   — TypeScript interfaces, DTOs                      │
│  • *.service.ts — Business logic, DB access, cache                 │
│  • *.routes.ts  — Express routes, validation, error handling       │
└────────────────────────────────────────────────────────────────────┘
                              │
                              │ SQL (pg driver) + Redis
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  DATA LAYER                                                        │
│  ────────────────────────────────────────────────────────────────  │
│  • PostgreSQL 16 (OLTP — Supabase managed)                         │
│  • Redis (Cache — stock levels, session, materials list)           │
│  • Elasticsearch (Search + Vectors — planned)                      │
└────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────────┐
│  AI/ML SERVICE (FastAPI — tách biệt, giao tiếp qua REST)           │
│  ────────────────────────────────────────────────────────────────  │
│  • Semantic Search (Elasticsearch + Embeddings)                    │
│  • Demand Forecasting (Prophet + LSTM)                             │
│  • Anomaly Detection (Isolation Forest)                            │
│  • LLM Chatbot (Claude API)                                        │
└────────────────────────────────────────────────────────────────────┘
```

**Nguyên tắc Modular Monolith:**

1. **Mỗi module là bounded context riêng** — materials không gọi trực tiếp DB query của transactions
2. **Giao tiếp qua public interface** — import service functions, không import internal logic
3. **Shared infrastructure dùng chung** — pool, redis, middleware nằm trong `shared/`
4. **Có thể tách thành microservice sau** — mỗi module đã có routes/service/types độc lập

#### 2.2.2 Modular Monolith Pattern (Recommended)

**Lý do chọn Modular Monolith:**

- Team nhỏ (<20 engineers) - phù hợp single deployable unit
- Giảm operational complexity (vs full microservices)
- 42% organizations đang consolidate microservices về modular monolith
- Dễ testing, debugging hơn microservices
- **Khả năng extract services sau:** Khi cần scale, extract "hot paths" thành độc lập

**Internal Module Communication:**

```javascript
// Internal event bus (in-process)
eventEmitter.emit("inventory.lot.created", { lotNumber, materialId });

// Module boundaries via interfaces
inventoryModule.reserveStock({ sku, quantity });
qcModule.approveL(lotNumber);
```

**Selective Service Extraction (Future):**

```
Monolith Core (95% traffic):
├─ Inventory, QC, Production, Reporting

Extracted Services (hot paths):
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
    Internal Event Emitter (Node.js EventEmitter)
          ↓
    Frontend Updates (React state)
```

**Performance Target:**

- API response: <200ms (p99)
- Database query: <50ms (p95)

**3. Task Distribution Patterns:**


| Operation             | Pattern                              | Rationale                             |
| --------------------- | ------------------------------------ | ------------------------------------- |
| **Stock Lookup**      | Direct DB query + Redis cache        | <100ms read, 80/20 rule (hot SKUs)    |
| **Lot Creation**      | Sync write + Async event             | Ensure data consistency, notify async |
| **QC Approval**       | Optimistic locking                   | Prevent concurrent approval conflicts |
| **Demand Forecast**   | Batch processing (daily)             | Non-realtime, GPU training            |
| **Anomaly Detection** | Batch processing (daily)             | Continuous monitoring                 |
| **Search**            | Elasticsearch hybrid (kNN + keyword) | Sub-second semantic search            |


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
│  Layer 1: Real-time Cache (Redis)                          │
│  • Stock levels by SKU (TTL: 5 min)                        │
│  • Top 1000 SKUs (80/20 rule)                              │
│  • Session data, rate limiting                             │
│  • Response time: <10ms                                    │
│                                                            │
│  Layer 2: Primary OLTP (PostgreSQL)                        │
│  • All inventory records                                   │
│  • Transactional data (ACID compliance)                    │
│  • Audit logs                                              │
│  • Response time: 10-100ms                                 │
│                                                            │
│  Layer 3: Search & Vectors (Elasticsearch)                 │
│  • Full-text search                                        │
│  • Semantic search (vector embeddings)                     │
│  • Log aggregation                                         │
│  • Response time: 50-200ms                                 │
│                                                            │
│  Layer 4: Analytics (Future - Optional)                    │
│  • Data warehouse (Snowflake/BigQuery)                     │
│  • Daily snapshots from PostgreSQL                         │
│  • Historical trends, ML features                          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Cache Invalidation Pattern:**

```
1. Write to PostgreSQL (definitive source)
2. Emit event via Internal Event Emitter (Node.js EventEmitter)
3. Cache handler invalidates/updates Redis (async, <1 second)
4. Search handler updates Elasticsearch index (async, <5 seconds)
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
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐   │
│  │ Frontend       │  │ Backend        │  │ AI/ML API     │   │
│  │ (React:5173)   │  │ (Node.js:3000) │  │ (FastAPI:8000)│   │
│  └────────────────┘  └────────────────┘  └───────────────┘   │
│          │                   │                    │          │
│          └───────────────────┴────────────────────┘          │
│                              │                               │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐   │
│  │ PostgreSQL     │  │ Redis          │  │ Elasticsearch │   │
│  │ (:5432)        │  │ (:6379)        │  │ (:9200)       │   │
│  └────────────────┘  └────────────────┘  └───────────────┘   │
│                                                              │
│  ┌────────────────┐                                          │
│  │ Keycloak       │                                          │
│  │ (:8080)        │                                          │
│  └────────────────┘                                          │
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
│     npm run build    # Vite builds to dist/                │
│     ↓                                                      │
│     Output: Static files (HTML, JS, CSS, assets)           │
│                                                            │
│  2. Deploy to Vercel:                                      │
│     vercel --prod                                          │
│     OR: Auto-deploy via Git push (GitHub integration)      │
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
│     - VITE_API_URL=https://api.yourdomain.com              │
│     - VITE_KEYCLOAK_URL=https://auth.yourdomain.com        │
│                   │
│                                                            │
│  4. Custom Domain:                                         │
│     app.yourdomain.com → Vercel                            │
│     (Add CNAME record in DNS: app → cname.vercel-dns.com)  │
│                                                            │
│  5. Features:                                              │
│     ✓ Global CDN (100+ locations)                          │
│     ✓ Auto SSL/TLS certificates                            │
│     ✓ Automatic deployments from Git                       │
│     ✓ Preview deployments for PRs                          │
│     ✓ Edge caching & compression                           │
│     ✓ DDoS protection included                             │
│                                                            │
│  6. Cost:                                                  │
│     • Hobby Plan: FREE (personal/small projects)           │
│     • Pro Plan: $20/month (commercial, custom domains)     │
│     • Bandwidth: 100GB/mo included                         │
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

##### B. BACKEND DEPLOYMENT - Fly.io

**Phương án deployment: Fly.io (PaaS — Managed Container Platform)**

```
┌────────────────────────────────────────────────────────────┐
│  BACKEND - FLY.IO ARCHITECTURE                             │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Platform: Fly.io                                          │
│  • Region: Singapore (sin) — gần nhất với người dùng       │
│  • Auto SSL/TLS, Force HTTPS                               │
│  • Auto-scaling (min 0 → scale up khi có request)          │
│  • Built-in health checks, metrics, logs                   │
│                                                            │
│  App: backend-bitter-wildflower-4393                       │
│  URL: https://backend-bitter-wildflower-4393.fly.dev       │
│                                                            │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Fly.io Machine (Shared CPU, 1GB RAM)                 │ │
│  │                                                       │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ Docker Container                                 │ │ │
│  │  │ ├─ Node.js + Express (:3000)                     │ │ │
│  │  │ │  ├─ /api/materials (CRUD + Redis cache)        │ │ │
│  │  │ │  ├─ /api/transactions (nhập/xuất kho)          │ │ │
│  │  │ │  └─ /health (health check)                     │ │ │
│  │  │ └─ Multi-stage Dockerfile (build → run)          │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  │  Fly.io tự quản lý:                                   │ │
│  │  • SSL termination                                    │ │
│  │  • Load balancing                                     │ │
│  │  • Auto-restart on crash                              │ │
│  │  • Rolling deploys                                    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                            │
│  fly.toml:                                                 │
│  ────────────────────────────────────────────────────────  │
│  app = 'backend-bitter-wildflower-4393'                    │
│  primary_region = 'sin'                                    │
│  [http_service]                                            │
│    internal_port = 3000                                    │
│    force_https = true                                      │
│    auto_stop_machines = 'stop'                             │
│    auto_start_machines = true                              │
│    min_machines_running = 0                                │
│  [[vm]]                                                    │
│    memory = '1gb'                                          │
│    cpu_kind = 'shared'                                     │
│                                                            │
│  Deploy Commands:                                          │
│  ────────────────────────────────────────────────────────  │
│  flyctl auth login                                         │
│  flyctl deploy                   # Deploy mới              │
│  flyctl logs                     # Xem logs                │
│  flyctl secrets set KEY=VALUE    # Set env vars            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**CI/CD Pipeline (GitHub Actions):**

```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend to Fly.io

on:
  push:
    branches: [master]
    paths:
      - "02_Source/01_Source Code/backend/**"

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --remote-only
        working-directory: "02_Source/01_Source Code/backend"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

---

##### C. DATABASE DEPLOYMENT - Supabase (Managed PostgreSQL)

**Phương án deployment: Supabase — PostgreSQL Managed + Built-in Auth (tùy chọn)**

```
┌────────────────────────────────────────────────────────────┐
│  DATABASE - SUPABASE ARCHITECTURE                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  1. PostgreSQL (Supabase Managed)                          │
│     ─────────────────────────────────────────────────────  │
│     • Plan: Free tier (500MB) → Pro ($25/mo, 8GB)          │
│     • Region: Singapore (ap-southeast-1)                   │
│     • Features:                                            │
│       - Automated daily backups (7 days retention)         │
│       - SSL connections enforced                           │
│       - Connection pooling (PgBouncer built-in)            │
│       - Dashboard + SQL Editor                             │
│     • Connection:                                          │
│       postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres│
│                                                            │
│  2. Redis (Docker local dev / Fly.io Upstash production)   │
│     ─────────────────────────────────────────────────────  │
│     • Local: docker run -d -p 6379:6379 redis:alpine       │
│     • Production: Upstash Redis (serverless, free tier)    │
│     • Use Cases:                                           │
│       - Materials list cache (TTL: 60s)                    │
│       - Session storage                                    │
│       - Rate limiting counters                             │
│                                                            │
│  3. Elasticsearch (Docker local dev)                       │
│     ─────────────────────────────────────────────────────  │
│     • Local: Docker container                              │
│     • Production: Elastic Cloud / Bonsai (managed)         │
│     • Use Cases:                                           │
│       - Full-text search (materials, lots)                 │
│       - Semantic search (vector embeddings)                │
│                                                            │
│  4. Backup Strategy                                        │
│     ─────────────────────────────────────────────────────  │
│     PostgreSQL: Supabase tự động backup hàng ngày          │
│     Redis: Dữ liệu cache — không cần backup                │
│     Elasticsearch: Rebuild từ PostgreSQL khi cần           │
│                                                            │
│  5. Monitoring                                             │
│     ─────────────────────────────────────────────────────  │
│     • Fly.io: Built-in metrics + logs (flyctl logs)        │
│     • Supabase: Dashboard metrics, query performance       │
│     • Grafana Cloud: Custom dashboards (optional)          │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

#### 2.5.3 Tổng hợp Chi phí & Khuyến nghị Deployment

**RECOMMENDED ARCHITECTURE (Cloud-native, Cost-Optimized):**

```
┌────────────────────────────────────────────────────────────┐
│  PRODUCTION DEPLOYMENT ARCHITECTURE                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────┐                                      │
│  │  FRONTEND        │  Vercel (FREE — Hobby Plan)          │
│  │  React SPA       │  • Global CDN                        │
│  │  (Vercel CDN)    │  • Auto SSL + Git deploy             │
│  └──────────────────┘                                      │
│          │                                                 │
│          │ HTTPS                                           │
│          ▼                                                 │
│  ┌──────────────────┐                                      │
│  │  BACKEND         │  Fly.io (FREE tier → $5-10/mo)       │
│  │  Node.js Express │  • Singapore region                  │
│  │  (Fly.io)        │  • Auto SSL, auto-scaling            │
│  └──────────────────┘  • Shared CPU, 1GB RAM               │
│          │                                                 │
│          ▼                                                 │
│  ┌──────────────────┐                                      │
│  │  DATABASE        │                                      │
│  │                  │                                      │
│  │  PostgreSQL      │  Supabase (FREE → $25/mo Pro)        │
│  │  (Supabase)      │  • Auto backups, SSL                 │
│  │                  │                                      │
│  │  Redis           │  Upstash (FREE tier)                 │
│  │  (Upstash)       │  • Serverless Redis                  │
│  │                  │                                      │
│  │  Elasticsearch   │  Elastic Cloud / Bonsai              │
│  │  (Managed)       │  • Search indexing                   │
│  └──────────────────┘                                      │
│                                                            │
│  TOTAL COST (Student/MVP): $0/month (all free tiers)       │
│  TOTAL COST (Production):  ~$35-60/month                   │
│  • Frontend: $0 (Vercel Hobby)                             │
│  • Backend: $5-10 (Fly.io)                                 │
│  • PostgreSQL: $25 (Supabase Pro)                          │
│  • Redis: $0 (Upstash Free)                                │
│  • Elasticsearch: $0-25 (Bonsai/Elastic free tier)         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**So sánh chi phí:**


| Deployment Model              | Monthly Cost | Max Users | Reliability | Complexity |
| ----------------------------- | ------------ | --------- | ----------- | ---------- |
| **Free tier (Student/MVP)**   | $0           | ~100      | Medium      | Low        |
| **Production (Cloud-native)** | $35-60       | ~5,000    | High        | Low        |


**Note:** Kiến trúc cloud-native này có thể scale bằng cách:

- Fly.io: tăng VM size hoặc thêm machines
- Supabase: nâng plan Pro/Team
- Thêm Upstash Redis Pro nếu cần throughput cao
- CDN cho static assets (Vercel đã có sẵn)

---

### 2.6 Góc nhìn bảo mật (Security View)

```
┌────────────────────────────────────────────────────────────┐
│             CÁC LỚP BẢO MẬT (SECURITY LAYERS)              │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  LAYER 1: IDENTITY & AUTHENTICATION                        │
│  (Xác thực danh tính - Identity Provider)                  │
│                                                            │
│  • Identity Provider: Keycloak                             │
│  • Giao thức: OpenID Connect (OIDC)                        │
│    - Authorization Code Flow + PKCE                        │
│  • Token phát hành:                                        │
│    - Access Token (JWT, 5 phút)                            │
│    - Refresh Token (30 phút)                               │
│  • Public Key cung cấp qua JWKS endpoint                   │
│                                                            │
│  Nơi chặn (Enforcement Point):                             │
│    - Keycloak xác thực username/password                   │
│    - Chỉ phát hành token khi xác thực thành công           │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  LAYER 2: API GATEWAY SECURITY                             │
│  (Bảo vệ lớp biên hệ thống)                               │
│                                                            │
│  • Rate Limiting                                           │
│  • CORS Policy (allowed origins)                           │
│  • Security Headers (CSP, X-Content-Type-Options, ...)     │
│                                                            │
│  Nơi chặn (Enforcement Point): API Gateway (Express.js)   │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  LAYER 3: APPLICATION SECURITY                             │
│  (Bảo mật trong tầng ứng dụng)                             │
│                                                            │
│  • Kiểm tra JWT tại Backend                                │
│  • Phân quyền theo vai trò (RBAC):                         │
│    admin, inventory_manager, quality_control,              │
│    operator, viewer                                        │
│  • Role lấy từ JWT claim, middleware requireRole           │
│  • Phân quyền chi tiết theo tài nguyên (resource-level)   │
│  • Input validation (Zod)                                  │
│  • Chống SQL injection (pg parameterized queries)          │
│  • Logging chuẩn hóa (structured logging)                  │
│                                                            │
│  Nơi chặn (Enforcement Point): Backend API (Express       │
│  Middleware + Controllers)                                  │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  LAYER 4: DATA PROTECTION                                  │
│  (Bảo vệ dữ liệu và thông tin nhạy cảm)                   │
│                                                            │
│  • TLS 1.3 (mã hóa toàn bộ traffic)                       │
│  • Encryption at Rest (disk-level encryption)              │
│  • Secrets Management: .env files + Fly.io secrets         │
│  • Không hardcode mật khẩu                                 │
│  • Masking dữ liệu nhạy cảm trong logs (PII masking)      │
│                                                            │
│  Nơi chặn (Enforcement Point): Infrastructure & Database  │
│  Layer                                                     │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  LAYER 5: AUDIT & MONITORING                               │
│  (Giám sát và kiểm toán bảo mật)                           │
│                                                            │
│  • Ghi log mọi thay đổi dữ liệu (who, what, when)        │
│  • Audit trail dạng append-only                            │
│  • Centralized logging (Grafana Loki)                      │
│  • Theo dõi bất thường và truy vết sự cố                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Công nghệ và công cụ (Tech Stack)

### 3.1 Technology Stack (Comprehensive)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           COMPLETE TECHNOLOGY STACK                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  FRONTEND (Client)                                                      │    │
│  │  ────────────────────────────────────────────────────────────────────── │    │
│  │  • Framework:       React 19 + TypeScript                               │    │
│  │  • UI Library:      Ant Design 5.x (planned)                            │    │
│  │  • State:           React Query (server) + Zustand (client)             │    │
│  │  • Routing:         React Router v6                                     │    │
│  │  • Build Tool:      Vite 6                                              │    │
│  │  • Auth Client:     @react-keycloak/web (planned)                       │    │
│  │  • Charts:          Recharts / Chart.js (planned)                       │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                              │                                                  │
│                              │ REST (JSON) + JWT                   │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  BACKEND (Server)                                                       │    │
│  │  ────────────────────────────────────────────────────────────────────── │    │
│  │  • Runtime:         Node.js 22 LTS                                      │    │
│  │  • Framework:       Express.js + TypeScript                             │    │
│  │  • Database:        pg (raw SQL queries, no ORM)                        │    │
│  │  • Cache:           redis (npm package v5)                              │    │
│  │  • Validation:      Manual (planned: Zod)                               │    │
│  │  • Auth:            Keycloak JWT Verify (planned: express-jwt)          │    │
│  │  • API Protocols:   REST   │    │
│  │  • API Docs:        Swagger / OpenAPI 3.0 (planned)                     │    │
│  │  • Logging:         console (planned: Winston structured JSON logs)     │    │
│  │  • Tracing:         OpenTelemetry SDK (planned)                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                              │                                                  │
│                              │ Raw SQL (pg driver) + Redis commands             │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  DATABASE & STORAGE                                                     │    │
│  │  ────────────────────────────────────────────────────────────────────── │    │
│  │  PRIMARY OLTP:                                                          │    │
│  │  • PostgreSQL 16    UUID, ENUM, DECIMAL(10,3), JSONB                    │    │
│  │  • Hosting:         Supabase (managed, free tier)                       │    │
│  │  • Backup:          Supabase automated daily + pg_dump                  │    │
│  │                                                                         │    │
│  │  CACHE:                                                                 │    │
│  │  • Redis            Stock levels, sessions, rate limiting               │    │
│  │  • Hosting:         Upstash Redis (managed, free tier) / local Docker   │    │ 
│  │  • TTL:             60 seconds default (per use case)                   │    │
│  │  • Fallback:        App runs without Redis (graceful degradation)       │    │ 
│  │                                                                         │    │
│  │  SEARCH & VECTORS (planned):                                            │    │
│  │  • Elasticsearch 8.12+  Full-text search, semantic search (vectors)     │    │
│  │  • Hosting:         Elastic Cloud (managed)                             │    │
│  │  • Vector Model:    BAAI/bge-m3 (1024 dims, multilingual)               │    │
│  │  • Analyzer:        ICU tokenizer (Vietnamese support)                  │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  IDENTITY & ACCESS MANAGEMENT (planned)                                 │    │
│  │  ────────────────────────────────────────────────────────────────────── │    │
│  │  • Provider:        Keycloak 24+ (Self-hosted on Fly.io)                │    │
│  │  • Protocol:        OAuth 2.0 / OpenID Connect (OIDC)                   │    │
│  │  • Features:        SSO, RBAC, MFA, Social Login, User Federation       │    │
│  │  • Database:        PostgreSQL (shared or dedicated)                    │    │
│  │  • Admin UI:        http://localhost:8080/admin                         │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  AI/ML SERVICES (planned)                                               │    │
│  │  ────────────────────────────────────────────────────────────────────── │    │
│  │  SEMANTIC SEARCH (POC completed):                                       │    │
│  │  • Embeddings:      @xenova/transformers (BAAI/bge-m3)                  │    │
│  │  • Storage:         Elasticsearch vectors                               │    │
│  │                                                                         │    │
│  │  DEMAND FORECASTING:                                                    │    │
│  │  • Baseline:        Prophet (Facebook)                                  │    │
│  │  • Advanced:        TensorFlow LSTM (GPU)                               │    │
│  │  • Serving:         FastAPI + Uvicorn                                   │    │
│  │                                                                         │    │
│  │  ANOMALY DETECTION:                                                     │    │
│  │  • Algorithm:       Isolation Forest (scikit-learn)                     │    │
│  │  • Use Case:        Theft, data errors, unusual patterns                │    │
│  │                                                                         │    │
│  │  COMPUTER VISION QC:                                                    │    │
│  │  • Model:           YOLOv8 (lightweight)                                │    │
│  │                                                                         │    │
│  │  LLM CHATBOT:                                                           │    │
│  │  • Provider:        Anthropic Claude 4.5/4.6 API                        │    │
│  │  • SDK:             @anthropic-ai/sdk                                   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  OBSERVABILITY & MONITORING                                             │    │
│  │  ────────────────────────────────────────────────────────────────────── │    │
│  │  METRICS:                                                               │    │
│  │  • Fly.io Metrics    Built-in monitoring (CPU, memory, network)         │    │
│  │  • Grafana Cloud     Dashboards & visualization (free tier)             │    │
│  │  • Retention:        14 days metrics (free tier)                        │    │
│  │                                                                         │    │
│  │  LOGS:                                                                  │    │
│  │  • Fly.io Logs       Built-in log streaming                             │    │
│  │  • Grafana Loki      Log aggregation (Fly.io → Loki integration)        │    │
│  │  • Retention:        7 days logs (free tier)                            │    │
│  │                                                                         │    │
│  │  ALERTING:                                                              │    │
│  │  • Grafana Alerts    Slack, Email webhook integrations                  │    │
│  │  • SLOs:             99.5% availability, p99 latency <200ms             │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │  DEVOPS & TOOLS                                                         │    │
│  │  ────────────────────────────────────────────────────────────────────── │    │
│  │  • Version Control:     Git + GitHub                                    │    │
│  │  • CI/CD:               GitHub Actions                                  │    │
│  │  • Container:           Docker + Docker Compose                         │    │
│  │  • Backend Hosting:     Fly.io (free tier)                              │    │
│  │  • Frontend Hosting:    Vercel (free tier)                              │    │
│  │  • Database Hosting:    Supabase (free tier)                            │    │
│  │  • API Testing:         Postman / Thunder Client / curl                 │    │
│  │  • Code Quality:        ESLint (planned)                                │    │
│  │  • Testing:             Vitest + React Testing Library (planned)        │    │
│  │  • Secret Management:   .env files + Fly.io secrets                     │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3.2 Kiến trúc tổ chức thư mục (Project Structure)

Cấu trúc theo **Modular Monolith** — backend chia module theo nghiệp vụ, mỗi module chứa routes/service/types riêng.

```
SEC_Team_02_2026/
├── 01_Documents/                          # Tài liệu dự án
│   ├── 01_Product Requirements Document.md
│   ├── 02_Domain Model.md
│   ├── 03_Prototype.md
│   ├── 04_Product Backlog.md
│   ├── 05_Architecture.md
│   └── ...
│
├── 02_Source/01_Source Code/
│   ├── frontend/                          # React + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── components/                # UI components
│   │   │   │   ├── common/                # Button, Table, Modal, ...
│   │   │   │   ├── materials/             # Material-specific components
│   │   │   │   └── layout/                # Header, Sidebar, ...
│   │   │   ├── pages/                     # Route pages
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Materials/
│   │   │   │   ├── Transactions/
│   │   │   │   ├── QualityControl/
│   │   │   │   └── Reports/
│   │   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── services/                  # API calls (fetch/axios)
│   │   │   ├── store/                     # State management (Zustand)
│   │   │   ├── types/                     # TypeScript interfaces
│   │   │   ├── auth/                      # Keycloak configuration
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   └── tsconfig.json
│   │
│   ├── backend/                           # Express + TypeScript (Modular Monolith)
│   │   ├── src/
│   │   │   ├── server.ts                  # Entry point — mount routes
│   │   │   │
│   │   │   ├── shared/                    # Shared infrastructure
│   │   │   │   ├── db/pool.ts             # PostgreSQL connection pool
│   │   │   │   └── cache/redis.ts         # Redis client (graceful fallback)
│   │   │   │
│   │   │   └── modules/                   # Nghiệp vụ chia theo module
│   │   │       ├── materials/             # Quản lý nguyên vật liệu
│   │   │       │   ├── material.types.ts  # Interfaces + DTOs
│   │   │       │   ├── material.service.ts# DB queries + cache logic
│   │   │       │   └── material.routes.ts # GET/POST/PUT/DELETE
│   │   │       │
│   │   │       ├── transactions/          # Nhập/xuất kho
│   │   │       │   ├── transaction.types.ts
│   │   │       │   ├── transaction.service.ts
│   │   │       │   └── transaction.routes.ts
│   │   │       │
│   │   │       ├── inventory-lots/        # Quản lý lô hàng (planned)
│   │   │       ├── qc/                    # Kiểm soát chất lượng (planned)
│   │   │       ├── labeling/              # QR/Barcode (planned)
│   │   │       ├── stock/                 # Quản lý tồn kho (planned)
│   │   │       └── reporting/             # Báo cáo nghiệp vụ (planned)
│   │   │
│   │   ├── Dockerfile                     # Multi-stage build
│   │   ├── fly.toml                       # Fly.io deployment config
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   ├── db_schema/                         # PostgreSQL schema + Docker
│   │   ├── db-init.sql                    # Tables: users, materials, transactions
│   │   └── docker-compose.yml             # PostgreSQL + Redis (local dev)
│   │
│   ├── ai-ml-services/                    # AI/ML FastAPI Services (planned)
│   │   ├── src/
│   │   │   ├── semantic_search/           # Elasticsearch + Embeddings
│   │   │   ├── forecasting/               # Demand forecasting (Prophet)
│   │   │   ├── anomaly_detection/         # Isolation Forest
│   │   │   ├── chatbot/                   # Claude API integration
│   │   │   └── main.py                    # FastAPI entry point
│   │   ├── requirements.txt
│   │   └── Dockerfile
│   │
│   ├── README.md                          # Hướng dẫn development
│   └── DEPLOYMENT.md                      # Hướng dẫn triển khai
│
├── 03_Deployment/                         # Deployment guides & scripts
└── README.md
```

**Nguyên tắc tổ chức:**

1. **Modular Monolith (Backend):**
  - Mỗi module = 1 folder trong `modules/` với 3 file: `types.ts`, `service.ts`, `routes.ts`
  - Module giao tiếp qua public interface (import service), không truy cập trực tiếp DB của module khác
  - plannedShared infrastructure (`db/`, `cache/`) dùng chung
2. **Feature-based (Frontend):**
  - `pages/` tổ chức theo route
  - `components/` chia theo domain (materials, layout, common)
  - `services/` là API client layer
3. **Tách biệt deployment:**
  - Frontend → Vercel (tự deploy từ Git)
  - Backend → Fly.io (Docker container)
  - Database → Supabase (managed PostgreSQL)
  - AI/ML → Fly.io hoặc Docker riêng
4. **Monitoring & Observability:**
  - Dedicated `monitoring/` directory
  - Pre-configured dashboards và alert rules

---

### 3.3 Cost Analysis (Infrastructure)

#### Option A: Cloud-native Free Tier (RECOMMENDED — Student/MVP)


| Component              | Monthly Cost | Notes                            |
| ---------------------- | ------------ | -------------------------------- |
| Frontend (Vercel)      | $0           | Hobby plan, auto SSL + CDN       |
| Backend (Fly.io)       | $0-10        | Free tier, shared CPU, 1GB RAM   |
| PostgreSQL (Supabase)  | $0-25        | Free 500MB → Pro $25/mo          |
| Redis (Upstash)        | $0           | Serverless Redis free tier       |
| Elasticsearch (Bonsai) | $0-25        | Free tier hoặc Bonsai sandbox    |
| Monitoring             | $0           | Fly.io logs + Supabase dashboard |
| **TOTAL**              | **$0-60**    | Phù hợp MVP, dễ scale lên        |


#### Option B: Production Scale


| Component                     | Monthly Cost | Notes                      |
| ----------------------------- | ------------ | -------------------------- |
| Frontend (Vercel Pro)         | $20          | Custom domains, analytics  |
| Backend (Fly.io scaled)       | $20-50       | Dedicated CPU, 2GB+ RAM    |
| PostgreSQL (Supabase Pro)     | $25          | 8GB storage, daily backups |
| Redis (Upstash Pro)           | $10-30       | Higher throughput          |
| Elasticsearch (Elastic Cloud) | $50-150      | Managed cluster            |
| Claude API (LLM chatbot)      | $50-200      | Pay-per-use                |
| **TOTAL**                     | **$175-475** | Production-ready           |


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

#### 4.1.2 Label Printing

**Technology:**

- **PDF Generation:** jsPDF or Puppeteer (headless browser)
- **Barcode/QR:** qrcode.react + react-barcode
- **Templates:** HTML/CSS templates → PDF rendering
- **Print API:** Browser print API or direct printer integration

---

#### 4.1.3 Excel Export

**Technology:**

- **Library:** xlsx or ExcelJS
- **Use Case:** Export inventory reports, audit logs, transaction history
- **Format:** .xlsx with formulas, styling

---

#### 4.1.4 AI-Powered Features (Roadmap)


| Feature                | Status         | Timeline              |
| ---------------------- | -------------- | --------------------- |
| **Semantic Search**    | ✅ POC Complete| Prod-ready            |
| **Demand Forecasting** | 📋 Planned     | Phase 1-2 (Month 1-4) |
| **Anomaly Detection**  | 📋 Planned     | Phase 3 (Month 5-6)   |
| **QC Computer Vision** | 📋 Planned     | Phase 3 (Month 5-6)   |
| **LLM Chatbot**        | 📋 Planned     | Phase 4 (Month 7-8)   |


**Estimated Investment:**

- Development: Student project (no budget)
- Infrastructure: $0-60/month (free tier services)
- Fly.io: $0 (free tier — 3 shared VMs, 256MB)
- Supabase: $0 (free tier — 500MB, 50K rows)
- Vercel: $0 (free tier)
- Grafana Cloud: $0 (free tier — 14d metrics, 7d logs)

### 4.2 Implementation Phases

#### Phase 1: Monitoring & Observability (Week 1-2)

- ✅ Setup Grafana Cloud Free account
- ✅ Integrate Fly.io metrics with Grafana Cloud
- ✅ Integrate Fly.io logs with Grafana Loki
- ✅ Import core dashboards (Node.js, PostgreSQL)
- ✅ Setup alerts (Slack integration)

#### Phase 2: AI Foundation (Month 1-2)

- ✅ Production deployment of semantic search
- ✅ Data pipeline for demand forecasting
- ✅ Prophet baseline model

#### Phase 3: Advanced AI (Month 3-6)

- ✅ LSTM demand forecasting
- ✅ Anomaly detection (Isolation Forest)
- ✅ Computer vision QC

#### Phase 4: Business Intelligence (Month 5-8)

- ✅ Manager dashboards
- ✅ LLM chatbot (Claude API)

---

## 5. Next Steps & Priorities

### Immediate Priorities

1. **Keycloak Integration:** Deploy Keycloak on Fly.io, implement RBAC with 5 roles (Admin, InventoryManager, QualityControl, Operator, Viewer)
2. **Frontend Implementation:** Build core pages — Dashboard, Material CRUD, Transaction history
3. **Remaining Backend Modules:** Implement inventory-lots, qc, labeling, stock, reporting modules

### Open Questions

1. **Elasticsearch hosting:** Elastic Cloud free tier vs self-hosted on Fly.io?
2. **AI/ML priority:** Which AI feature to implement first for demo? (Semantic Search is POC-ready)

---

## 6. References

### Industry Research

Nhóm đã tham khảo các chủ đề sau trong quá trình thiết kế kiến trúc (research notes nội bộ, không commit):

- Modern IMS Architectures (microservices, event-driven patterns trong ngành warehouse/pharma)
- Monitoring & Observability stack (OpenTelemetry, Prometheus, Grafana, Loki, Tempo)
- AI Capabilities cho IMS (demand forecasting, anomaly detection)

### Internal POCs

- Keycloak Integration POC: [06_Proof of Concept.md](06_Proof%20of%20Concept.md) — mục Keycloak
- Elasticsearch Semantic Search POC: [06_Proof of Concept.md](06_Proof%20of%20Concept.md) — mục Elasticsearch

### External Standards

- OAuth 2.0 / OIDC: [RFC 6749](https://tools.ietf.org/html/rfc6749)
- OpenTelemetry: [Official Docs](https://opentelemetry.io/)
- Grafana Cloud: [Documentation](https://grafana.com/docs/grafana-cloud/)
- Domain-Driven Design: [IBM Architecture](https://ibm-cloud-architecture.github.io/refarch-eda/methodology/domain-driven-design/)

---

**Document Version:** 3.0 (Updated 2026-02-28)
**Status:** ✅ Updated - Aligned with current source code & deployment
**Next Review:** After Keycloak integration