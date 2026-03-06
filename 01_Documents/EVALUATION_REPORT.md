# BÁO CÁO ĐÁNH GIÁ TỔNG THỂ ĐỒ ÁN INVENTORY MANAGEMENT SYSTEM

**Ngày đánh giá:** 2026-02-28
**Đồ án:** SEC_Team_02_2026 — Inventory Management System
**Nguồn yêu cầu:** https://nhbien.github.io/enterprise-project-artifacts/
**Phạm vi đánh giá:**
- Source code: `02_Source/`
- Tài liệu kiến trúc: `01_Documents/05_Architecture.md`
- So sánh với các hệ thống IMS thực tế trên thị trường

---

## MỤC LỤC

1. [Tổng quan yêu cầu đồ án](#1-tổng-quan-yêu-cầu-đồ-án)
2. [Đánh giá Source Code](#2-đánh-giá-source-code)
3. [Phân tích chi tiết Architecture Document](#3-phân-tích-chi-tiết-architecture-document)
4. [So sánh với hệ thống IMS thực tế](#4-so-sánh-với-hệ-thống-ims-thực-tế)
5. [Đối chiếu yêu cầu đồ án và hiện trạng](#5-đối-chiếu-yêu-cầu-đồ-án-và-hiện-trạng)
6. [Tổng hợp vấn đề và khuyến nghị](#6-tổng-hợp-vấn-đề-và-khuyến-nghị)

---

## 1. Tổng quan yêu cầu đồ án

### 1.1 Quy định chung

- Nhóm tạo GitHub repository tên `SEC_Team_XX_YYYY` gồm 3 thư mục bắt buộc: `01_Documents`, `02_Source`, `03_Deployment`
- Tài liệu viết bằng Markdown (.md), đơn giản, đủ ý, dễ hiểu
- Hệ thống online phải public, giảng viên được mời làm administrator
- Mã nguồn phải biên dịch được — giảng viên không giải quyết thắc mắc điểm nếu source không compile

### 1.2 Deliverables bắt buộc

#### 01_Documents (9 tài liệu)

| # | Tài liệu | Nội dung chính |
|---|----------|---------------|
| 01 | Product Requirements Document | Vai trò người dùng, vấn đề, mục tiêu, quy trình nghiệp vụ |
| 02 | Domain Model | Thực thể nghiệp vụ và mối quan hệ |
| 03 | Prototype | UI mockups cho các quy trình chính |
| 04 | Product Backlog | Danh sách tính năng đầy đủ |
| 05 | Architecture | Mô hình kiến trúc, công nghệ, công cụ |
| 06 | Proof of Concept | Prototype kỹ thuật cho các tính năng khó |
| 07 | Coding Standards | Chuẩn code, convention, công cụ kiểm tra |
| 08 | Project Management | Ước lượng, milestones, team info, Slack/Discord, Trello/Jira, bug tracking |
| 09 | System Evaluation and Validation | Testing, kết quả khảo sát, so sánh đối thủ, video YouTube |

#### 02_Source (4 thành phần)

| # | Thành phần | Nội dung |
|---|-----------|---------|
| 01 | Source Code | Toàn bộ mã nguồn + unit tests |
| 02 | Raw Data | Hình ảnh, video, audio gốc |
| 03 | Build Scripts | File cấu hình, script tự động hóa |
| 04 | Compilation Guide.md | Hướng dẫn cài đặt, biên dịch, cấu hình, chạy hệ thống + video YouTube |

#### 03_Deployment (3 thành phần)

| # | Thành phần | Nội dung |
|---|-----------|---------|
| 01 | Deployment Package | Artifacts, config files, deployment scripts |
| 02 | Deployment Guide.md | Hướng dẫn triển khai cho IT admin + video YouTube |
| 03 | User Guide.md | Hướng dẫn sử dụng cho end-user + video YouTube |

### 1.3 Yêu cầu kỹ thuật

Đây là danh sách yêu cầu kỹ thuật từ đề bài:

**Bắt buộc:**
1. **Pre-built UI libraries** (React, Bootstrap) — thư viện UI có sẵn
2. **RESTful, gRPC, and GraphQL APIs** — ba loại giao thức API
3. **Third-party identity management** (Keycloak, Okta, Microsoft Entra ID) — KHÔNG tự implement
4. **AI feature integration** — tích hợp tính năng AI
5. **Continuous deployment pipeline** — pipeline triển khai liên tục

**Khuyến nghị (không bắt buộc):**
6. **Microservices architecture** — kiến trúc vi dịch vụ (được phép dùng Monolith)
7. **Domain-driven design** — thiết kế hướng domain
8. **Event-driven architecture** — kiến trúc hướng sự kiện

### 1.4 Tiêu chí đánh giá

**Giữa kỳ (Tuần 7):** Demo 15 phút, trả lời câu hỏi
- Demo một business case được giải quyết bằng hệ thống
- Quy trình phát triển qua Kanban board
- Source code integration giữa các thành viên
- Giải thích Product Backlog
- Giải thích Development/Logical/Process/Deployment Views

**Cuối kỳ (Tuần 11):** Submit ZIP
- Hoàn thiện documentation, source code, deployed system
- Hoàn thành toàn bộ Product Backlog
- So sánh với hệ thống cạnh tranh

---

## 2. Đánh giá Source Code

### 2.1 Cấu trúc thư mục hiện tại

```
02_Source/
├── 01_Source Code/
│   ├── backend/                  # Express.js + TypeScript
│   │   ├── src/
│   │   │   ├── server.ts         # Entry point
│   │   │   ├── models/           # (Scaffolded — file rỗng)
│   │   │   │   ├── Material.ts
│   │   │   │   └── index.ts
│   │   │   ├── modules/
│   │   │   │   ├── materials/    # ✅ Đã implement
│   │   │   │   │   ├── material.types.ts
│   │   │   │   │   ├── material.service.ts
│   │   │   │   │   └── material.routes.ts
│   │   │   │   └── transactions/ # ✅ Đã implement
│   │   │   │       ├── transaction.types.ts
│   │   │   │       ├── transaction.service.ts
│   │   │   │       └── transaction.routes.ts
│   │   │   └── shared/
│   │   │       ├── db/pool.ts    # PostgreSQL connection
│   │   │       └── cache/redis.ts # Redis client
│   │   ├── Dockerfile            # Multi-stage build
│   │   ├── fly.toml              # Fly.io config
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   ├── frontend/                 # React + Vite + TypeScript
│   │   ├── src/
│   │   │   ├── App.tsx           # Demo component (counter + API fetch)
│   │   │   ├── main.tsx          # Entry point
│   │   │   ├── App.css
│   │   │   └── index.css
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   ├── eslint.config.js
│   │   └── .env.example
│   │
│   ├── db_schema/
│   │   ├── db-init.sql           # Schema: users, materials, transactions
│   │   └── docker-compose.yml    # PostgreSQL 16
│   │
│   ├── README.md
│   └── DEPLOYMENT.md
│
├── 02_Raw Data/                  # ❌ Trống
├── 03_Build Scripts/             # ❌ Trống
└── 04_Compilation Guide.md       # ✅ Có
```

### 2.2 Backend — Chi tiết implementation

#### Technologies đang sử dụng

| Công nghệ | Version | Ghi chú |
|-----------|---------|---------|
| TypeScript | 5.1.6 | Ngôn ngữ chính |
| Node.js | 22.15.0 (Docker) | Runtime |
| Express.js | ^4.18.2 | Web framework |
| pg | ^8.18.0 | PostgreSQL driver (raw queries, KHÔNG dùng ORM) |
| redis | ^5.11.0 | Redis client (optional) |
| dotenv | ^17.2.4 | Environment variables |
| ts-node | ^10.9.1 | Dev: chạy TypeScript trực tiếp |

#### API Endpoints đã implement

**Materials Module** (`/api/materials`):

| Method | Endpoint | Chức năng | Validation |
|--------|----------|-----------|-----------|
| GET | `/api/materials` | Lấy tất cả materials | Redis cache 60s |
| GET | `/api/materials/:id` | Lấy material theo ID | 404 nếu không tìm thấy |
| POST | `/api/materials` | Tạo material mới | 409 nếu trùng material_id/part_number |
| PUT | `/api/materials/:id` | Cập nhật material | 404 nếu không tìm thấy |
| DELETE | `/api/materials/:id` | Xóa material | 404 nếu không tìm thấy |

**Transactions Module** (`/api/transactions`):

| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/api/transactions` | Lấy tất cả transactions |
| GET | `/api/transactions/:id` | Lấy transaction theo ID |
| GET | `/api/transactions/material/:materialId` | Transactions theo material |
| POST | `/api/transactions` | Tạo transaction (IN/OUT) |

**Health/Info:**

| Method | Endpoint | Chức năng |
|--------|----------|-----------|
| GET | `/` | Thông tin API |
| GET | `/health` | Health check |

#### Backend features hoạt động

- ✅ Material CRUD đầy đủ với input validation
- ✅ Transaction management (IN/OUT) với foreign key constraint
- ✅ Redis caching (materials list, TTL 60s, auto-invalidation khi thay đổi data)
- ✅ Graceful degradation — app vẫn chạy khi Redis không khả dụng
- ✅ PostgreSQL connection pool — hỗ trợ cả local và remote (Supabase)
- ✅ SSL configuration cho remote database connections
- ✅ CORS enabled (wildcard)
- ✅ Error handling với mã lỗi cụ thể (409 duplicate, 404 not found)
- ✅ Automatic timestamps (created_date, modified_date)

### 2.3 Frontend — Chi tiết implementation

#### Technologies đang sử dụng

| Công nghệ | Version | Ghi chú |
|-----------|---------|---------|
| React | 19.2.0 | UI framework |
| TypeScript | ~5.9.3 | Ngôn ngữ |
| Vite | 7.3.1 | Build tool |
| ESLint | 9.39.1 | Code linting |

#### Trạng thái hiện tại

**Frontend chỉ là scaffold cơ bản:**
- App.tsx chứa demo component (counter + fetch `/api/users`)
- Fetch endpoint `/api/users` — **không tồn tại** trong backend (backend có `/api/materials`)
- Không có routing, không có pages, không có components thực tế
- Không cài Ant Design, React Query, Zustand, React Router (tất cả được ghi trong Architecture doc)
- Styling bằng CSS thuần, không có design system

### 2.4 Database — Chi tiết implementation

#### Schema hiện tại

```sql
-- Table 1: users (demo)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL
);

-- Table 2: materials (core)
CREATE TABLE materials (
    material_id VARCHAR(20) PRIMARY KEY,
    part_number VARCHAR(20) UNIQUE NOT NULL,
    material_name VARCHAR(100) NOT NULL,
    material_type VARCHAR(50) NOT NULL,
    storage_conditions VARCHAR(100),
    specification_document VARCHAR(50),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Indexes: part_number, material_type, created_date

-- Table 3: transactions (core)
CREATE TABLE transactions (
    transaction_id VARCHAR(20) PRIMARY KEY,
    transaction_type VARCHAR(10) CHECK (IN 'IN','OUT'),
    material_id VARCHAR(20) REFERENCES materials(material_id),
    quantity DECIMAL(10,2) CHECK (> 0),
    unit VARCHAR(20),
    notes TEXT,
    created_by VARCHAR(100),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Indexes: material_id, transaction_type, created_date
```

**Seed data:** 1 material (Acetaminophen API) + 2 transactions (1 IN, 1 OUT)

#### So sánh schema hiện tại vs schema cần có (theo Architecture doc)

| Table | Hiện tại | Cần có |
|-------|---------|--------|
| users | ✅ Có (demo) | Cần mở rộng hoặc dùng Keycloak |
| materials | ✅ Có | Cần thêm fields: sku, description, unit, minStockLevel, reorderPoint, isActive |
| transactions | ✅ Có | Cần thêm: lotId, reason, referenceNumber |
| inventory_lots | ❌ Thiếu | lotNumber, materialId, quantity, unitCost, expiryDate, status, warehouseLocation |
| qc_tests | ❌ Thiếu | lotNumber, testDate, testedBy, testType, results (JSONB), passed |
| production_batches | ❌ Thiếu | batchNumber, productCode, quantity, dates, status |
| batch_components | ❌ Thiếu | batchId, lotNumber, quantityUsed |
| labels | ❌ Thiếu | Labeling data cho QR/Barcode |
| stock_levels | ❌ Thiếu | Real-time stock tracking |
| reservations | ❌ Thiếu | Stock reservations |
| audit_logs | ❌ Thiếu | Audit trail |

### 2.5 Infrastructure — Chi tiết

| Thành phần | Trạng thái | Chi tiết |
|-----------|-----------|---------|
| Backend Dockerfile | ✅ Có | Multi-stage build, Node 22.15.0 slim, port 3000 |
| DB Docker Compose | ✅ Có | PostgreSQL 16-alpine, volume persistence, auto-init |
| Fly.io config | ✅ Có | Singapore region, shared CPU, 1GB RAM, auto-scaling |
| Frontend deploy | ⚠️ Docs only | Doc ghi Vercel nhưng chưa có vercel.json |
| CI/CD pipeline | ❌ Thiếu | Không có `.github/workflows/` |
| Keycloak setup | ❌ Thiếu | Không có Docker config cho Keycloak |
| Elasticsearch setup | ❌ Thiếu | Không có Docker config |
| Redis Docker | ❌ Thiếu | Chỉ có connection code, không có Docker container config |

### 2.6 Phần hoàn toàn THIẾU trong code

| Thành phần | Trạng thái |
|-----------|-----------|
| Unit tests | ❌ Không có test framework, không có test files |
| Integration tests | ❌ Không có |
| E2E tests | ❌ Không có |
| API documentation (Swagger/OpenAPI) | ❌ Không có |
| Logging framework (Winston) | ❌ Không có |
| Input validation middleware (Joi/Zod) | ❌ Không có |
| Authentication middleware | ❌ Không có |
| WebSocket server | ❌ Không có |
| Event bus / Message queue | ❌ Không có |
| Monitoring (prom-client, Grafana) | ❌ Không có |
| AI/ML service (FastAPI) | ❌ Không có thư mục `ai-ml-services/` |
| gRPC service | ❌ Không có |
| GraphQL endpoint | ❌ Không có |

### 2.7 Ước tính mức độ hoàn thành

| Lĩnh vực | % Hoàn thành | Giải thích |
|-----------|-------------|-----------|
| Backend modules | ~22% | 2/9 modules (Materials + Transactions) |
| Frontend | ~5% | Chỉ Vite scaffold, chưa có UI thực |
| Database schema | ~20% | 3 tables, thiếu ~10+ tables |
| Infrastructure | ~30% | Docker + Fly.io có, thiếu CI/CD, Keycloak, ES |
| AI/ML | ~0% | Chỉ có POC docs, không có code |
| Testing | 0% | Hoàn toàn không có tests |
| **TỔNG THỂ** | **~10-15%** | So với scope mô tả trong Architecture doc |

---

## 3. Phân tích chi tiết Architecture Document

### 3.1 Cấu trúc tài liệu

Architecture doc dài **1878 dòng**, sử dụng mô hình **4+1 View Model** (IEEE 1471) với cấu trúc:

```
1. Tổng quan kiến trúc (Solution Sketch)
2. Các góc nhìn kiến trúc (4+1 View Model)
   2.1 Business View — vai trò, quy trình
   2.2 Logical View — components, relationships, interfaces, domain models, patterns
   2.3 Development View — module structure, project organization
   2.4 Process View — concurrency, task distribution, CQRS
   2.5 Data View — polyglot persistence, cache strategy
   2.6 Deployment View — containers, cloud services, CI/CD
   2.7 Security View — authentication, authorization, data protection
3. Tech Stack (comprehensive)
4. Project Structure
5. Cost Analysis
6. Implementation Roadmap
7. Unresolved Questions
8. References
```

### 3.2 Điểm MẠNH

#### 3.2.1 Cấu trúc chuyên nghiệp

- Sử dụng 4+1 View Model — tiêu chuẩn mô tả kiến trúc phần mềm được công nhận rộng rãi
- Mỗi view có diagrams rõ ràng bằng ASCII art
- Có component diagram, dependency graph, data flow diagram, deployment diagram
- Phân tách rõ responsibilities từng component

#### 3.2.2 Business domain chính xác

- 5 roles (Admin, InventoryManager, QualityControl, Operator, Viewer) — phù hợp chuẩn warehouse management
- Quy trình chính (nhập kho → QC → duyệt → lưu kho → xuất kho) — đúng workflow IMS chuẩn
- Domain entities (Material, InventoryLot, Transaction, QCTest, ProductionBatch) — đầy đủ và chính xác

#### 3.2.3 Tech stack hợp lý

- PostgreSQL cho OLTP — đúng chuẩn cho inventory data cần ACID compliance
- Redis caching cho stock levels — pattern phổ biến, hiệu quả
- Keycloak cho identity management — enterprise-grade, miễn phí, đáp ứng yêu cầu đề bài
- Docker + Fly.io + Vercel + Supabase — stack cloud-native, phù hợp đồ án sinh viên (free tier)

#### 3.2.4 Design patterns phù hợp

- Repository Pattern — abstraction over data access, tốt cho testing
- Service Layer — tách biệt business logic khỏi routes
- Event-Driven Architecture — loose coupling giữa modules
- CQRS Light — tách read/write models, phù hợp inventory systems
- Strategy Pattern cho AI/ML models — extensible
- Observer Pattern cho WebSocket — real-time updates

#### 3.2.5 Security design tốt

- Zero Trust Architecture với 5 layers
- OAuth 2.0 / OIDC cho authentication
- RBAC cho authorization
- Parameterized queries (chống SQL injection)
- TLS 1.3, encryption at rest
- Audit trail immutable

#### 3.2.6 Cost analysis thực tế

- Free tier: $0/month — phù hợp đồ án
- Production: $35-60/month — chi phí hợp lý
- Phân tích chi tiết từng component

### 3.3 Điểm YẾU và SAI SÓT

#### 3.3.1 VẤN ĐỀ ĐÁNG CHÚ Ý

**Vấn đề 1: Thiếu hoàn toàn gRPC và GraphQL**

- **Đề bài yêu cầu:** "RESTful, gRPC, and GraphQL APIs" — cả 3 loại — BẮT BUỘC
- **Doc chỉ có:** REST API contracts (Section 2.2.3)
- **Không đề cập:** gRPC ở bất kỳ đâu trong 1878 dòng
- **Không đề cập:** GraphQL ở bất kỳ đâu trong 1878 dòng
- **Rủi ro:** Thiếu 2/3 yêu cầu API bắt buộc

**Vấn đề 2: CI/CD pipeline chưa thực tế**

- **Đề bài yêu cầu:** "Continuous deployment pipeline" — BẮT BUỘC
- **Doc có:** Mẫu YAML cho GitHub Actions (Section 2.5.2)
- **Code thực tế:** Không có file `.github/workflows/` nào
- **Rủi ro:** Pipeline chỉ tồn tại trên giấy

> **Lưu ý về kiến trúc:** Đề bài **không bắt buộc** Microservices, việc chọn Modular Monolith là **hợp lệ** và phù hợp với thực tế ngành (xem Section 4.4). Architecture doc giải thích lý do chọn Modular Monolith rất thuyết phục.

#### 3.3.2 KHÔNG NHẤT QUÁN giữa Document và Code

| Mục | Architecture doc ghi | Code thực tế |
|-----|---------------------|-------------|
| **Node.js version** | Node.js 20 LTS | Node 22.15.0 (Dockerfile) |
| **React version** | React 18 | React 19.2.0 (package.json) |
| **ORM** | Sequelize v6 | Raw `pg` driver (không ORM) |
| **UI Library** | Ant Design 5.x | Không cài đặt |
| **State Management** | React Query + Zustand | Không cài đặt |
| **Routing** | React Router v6 | Không cài đặt |
| **Logging** | Winston (structured JSON) | console.log |
| **Validation** | Joi / Zod | Không có validation library |
| **Auth middleware** | express-jwt + jwks-rsa | Không có auth middleware |
| **WebSocket** | ws / Socket.io | Không có WebSocket code |
| **Metrics** | prom-client (Prometheus) | Không có metrics endpoint |
| **API Docs** | Swagger / OpenAPI 3.0 | Không có API docs |
| **Testing** | Jest + React Testing Library | Không có test framework |
| **Load Testing** | k6 | Không cài đặt |
| **Code Quality** | ESLint + Prettier | Chỉ có ESLint (frontend), không có Prettier |

#### 3.3.3 Quá nhiều "planned" features

Architecture doc mô tả hệ thống **tương lai** thay vì hệ thống **hiện tại**:

| Module trong doc | Trạng thái |
|-----------------|-----------|
| Materials module | ✅ Implemented |
| Transactions module | ✅ Implemented |
| Inventory Lots module | ❌ "(planned)" |
| QC module | ❌ "(planned)" |
| Labeling module | ❌ "(planned)" |
| Stock Management module | ❌ "(planned)" |
| Production module | ❌ "(planned)" |
| Reporting module | ❌ "(planned)" |
| AI/ML Services (FastAPI) | ❌ "(planned)" |
| Elasticsearch | ❌ "(planned)" |
| Event Bus | ❌ "(planned)" |
| Grafana monitoring | ❌ "(planned)" |

Nghĩa là 7/9 backend modules chưa tồn tại, toàn bộ AI/ML chưa có code.

#### 3.3.4 Số liệu không có cơ sở

Các con số performance được ghi trong doc nhưng **chưa có benchmark hoặc test** nào chứng minh:

- "API response: <200ms (p99)" — chưa có load testing
- "WebSocket latency: <100ms" — chưa có WebSocket
- "Database query: <50ms (p95)" — chưa có query profiling
- "YOLOv8: 97% defect detection accuracy" — chưa train model
- "Semantic search: <500ms for 100K+ SKUs" — chưa test ở scale này
- "Development cost: ~$93K" — không rõ cơ sở tính toán

#### 3.3.5 AI/ML scope quá tham vọng

Doc liệt kê **5 AI/ML features** riêng biệt:

| Feature | Công nghệ | Độ khó | Thực tế cho đồ án |
|---------|-----------|--------|-------------------|
| Semantic Search | Elasticsearch + bge-m3 embeddings | Trung bình | ✅ Khả thi (đã có POC) |
| Demand Forecasting | Prophet + LSTM | Cao | ⚠️ Khó — cần data lớn, GPU training |
| Anomaly Detection | Isolation Forest | Trung bình | ⚠️ Cần data thực |
| Computer Vision QC | YOLOv8 | Rất cao | ❌ Không thực tế cho đồ án — cần GPU, labeled dataset lớn |
| LLM Chatbot | Claude API | Thấp | ✅ Khả thi — chỉ cần API key |

Trong thực tế doanh nghiệp, mỗi feature AI này thường do 1 team riêng phát triển trong nhiều tháng.

#### 3.3.6 Message Queue mâu thuẫn nội bộ

- Section 1 (Solution Sketch): "Event Bus (Kafka/RabbitMQ)" — vẽ trong diagram chính
- Section 2.3 (Process View): "Message Queue (Kafka/RabbitMQ)" — ghi trong data flow
- Section 3.1 (Tech Stack): "Message Queue (Future - Optional)" — ghi là tùy chọn tương lai
- Code thực tế: Không có event bus, message queue, hay bất kỳ async messaging nào

---

## 4. So sánh với hệ thống IMS thực tế

### 4.1 Các hệ thống IMS trên thị trường

#### Open-source IMS

| Hệ thống | Kiến trúc | Tech Stack | Đặc điểm chính |
|-----------|-----------|-----------|----------------|
| **InvenTree** | Monolith (Django) | Python, PostgreSQL, Redis | REST API, plugin system, barcode/QR, BOM management |
| **Odoo Inventory** | Modular Monolith | Python, PostgreSQL, XML views | Full ERP integration, reports, barcode, lot tracking |
| **ERPNext** | Monolith (Frappe) | Python, MariaDB, Redis | Full ERP, REST API, webhooks, comprehensive reporting |
| **Part-DB** | Monolith (Symfony) | PHP, MySQL/PostgreSQL | Electronic parts focus, barcode, data sheets |
| **PartKeepr** | Monolith (Symfony) | PHP, MySQL | Electronic components, statistics, barcode |

**Nhận xét:** Phần lớn open-source IMS sử dụng **monolith** hoặc **modular monolith**, không phải microservices. Điều này phù hợp với lập luận trong Architecture doc.

#### Enterprise IMS

| Hệ thống | Kiến trúc | Đặc điểm |
|-----------|-----------|----------|
| **SAP EWM** (Extended Warehouse Management) | SOA → dần chuyển Microservices (SAP BTP) | AI-powered, IoT, real-time tracking, RF/barcode |
| **Oracle WMS Cloud** | Cloud Microservices | Machine learning demand sensing, IoT integration |
| **Manhattan Associates** | Microservices (Active) | ML demand forecasting, real-time optimization |
| **Blue Yonder** (JDA) | Microservices + AI Platform | End-to-end supply chain AI, autonomous planning |
| **Zoho Inventory** | SaaS Microservices | REST API, webhooks, multi-channel selling |
| **Fishbowl Inventory** | Client-Server (legacy) | QuickBooks integration, barcode, manufacturing |
| **Cin7** | Cloud Microservices | Multi-location, B2B portal, EDI |

**Nhận xét:** Enterprise IMS hiện đại (SAP, Oracle, Manhattan) đang chuyển sang **microservices + AI**, nhưng mất nhiều năm và hàng trăm engineers.

### 4.2 So sánh modules của đồ án với chuẩn ngành

| Module trong Architecture doc | Có trong IMS thực tế? | Ví dụ cụ thể | Đánh giá |
|-------------------------------|----------------------|--------------|---------|
| **Material Management** (CRUD, categories, search) | ✅ Có trong MỌI IMS | InvenTree Parts, SAP MM, Odoo Products | **Core** — bắt buộc, thiết kế đúng |
| **Inventory Lot Tracking** (lot number, expiry, location) | ✅ Phổ biến | SAP Batch Management, Odoo Lot/Serial | **Core** — bắt buộc cho pharma/food |
| **Transaction Management** (receive, issue, adjust, transfer) | ✅ Có trong MỌI IMS | SAP MIGO, Odoo Operations | **Core** — bắt buộc, 4 loại giao dịch đúng chuẩn |
| **Labeling** (QR/Barcode generation, printing) | ✅ Phổ biến | InvenTree Labels, SAP Smart Forms | **Important** — cần cho warehouse operations |
| **Stock Management** (real-time levels, reservations, reorder) | ✅ Có trong MỌI IMS | SAP Inventory, Odoo Replenishment | **Core** — reorder point là feature chuẩn |
| **Quality Control** (test, approve/reject, quarantine) | ✅ Regulated industries | SAP QM, Oracle QMS | **Important** — bắt buộc cho GMP/FDA |
| **Production/BOM** (batches, components) | ✅ Manufacturing IMS | SAP PP, Odoo Manufacturing | **Optional** — MRP feature, mở rộng scope |
| **Reporting/Analytics** (KPIs, audit logs) | ✅ Có trong MỌI IMS | Mọi IMS đều có | **Core** — business intelligence |
| **Semantic Search** | ⚠️ Chỉ enterprise lớn | Manhattan, Blue Yonder | **Nice to have** — AI feature nâng cao |
| **Demand Forecasting** | ⚠️ Enterprise | SAP IBP, Blue Yonder, Manhattan | **Advanced** — cần lượng data lớn |
| **Anomaly Detection** | ⚠️ Ít IMS có | IBM Maximo (asset mgmt) | **Advanced** — industry 4.0 |
| **Computer Vision QC** | ⚠️ Rất ít | Nvidia Metropolis (manufacturing) | **Cutting-edge** — không thực tế cho đồ án |
| **LLM Chatbot** | ⚠️ Mới xuất hiện | SAP Joule, Manhattan Copilot | **Trending** — dễ implement với API |

**Kết luận:** Danh sách modules **khá chính xác** và phù hợp IMS thực tế. Vấn đề không phải thiết kế sai mà là **scope quá rộng** cho đồ án.

### 4.3 So sánh lựa chọn công nghệ

#### Database

| Lựa chọn | Đánh giá | IMS thực tế dùng |
|-----------|---------|------------------|
| **PostgreSQL cho OLTP** | ✅ Chính xác | InvenTree, Odoo, Zoho đều dùng PostgreSQL |
| **ACID compliance** | ✅ Bắt buộc | Inventory transactions PHẢI có ACID — tránh âm kho, mất giao dịch |
| **JSONB cho flexible data** | ✅ Tốt | QC test results, material metadata — chuẩn pattern |
| **UUID primary keys** | ✅ Best practice | Phù hợp distributed systems, tránh ID collision |

#### Caching

| Lựa chọn | Đánh giá | Thực tế |
|-----------|---------|---------|
| **Redis cho stock levels cache** | ✅ Đúng pattern | Amazon, Walmart, Target đều cache stock levels |
| **80/20 rule (hot SKUs)** | ✅ Đúng | 20% SKU chiếm 80% queries — caching top SKUs rất hiệu quả |
| **TTL 60s cho materials list** | ✅ Hợp lý | Materials thay đổi ít, 60s cache là an toàn |
| **Graceful degradation** | ✅ Best practice | App vẫn chạy khi Redis down — đúng cách implement |

#### Search

| Lựa chọn | Đánh giá | Thực tế |
|-----------|---------|---------|
| **Elasticsearch cho full-text search** | ⚠️ Quá nặng cho đồ án | Enterprise dùng ES, nhưng PostgreSQL tsvector đủ cho <100K records |
| **Vector embeddings (bge-m3)** | ⚠️ Nâng cao | Chỉ Manhattan, Blue Yonder có semantic search. Phù hợp cho POC |
| **Hybrid scoring (vector + keyword)** | ✅ Đúng kỹ thuật | State-of-the-art search approach |

#### Identity Management

| Lựa chọn | Đánh giá | Thực tế |
|-----------|---------|---------|
| **Keycloak** | ✅ Rất tốt | Open-source, enterprise-grade, đáp ứng yêu cầu đề bài |
| **OAuth 2.0 / OIDC** | ✅ Chuẩn ngành | Mọi enterprise system đều dùng |
| **RBAC với 5 roles** | ✅ Phù hợp | Admin, Manager, QC, Operator, Viewer — đúng chuẩn warehouse roles |
| **JWT (5 min access + 30 min refresh)** | ✅ Best practice | Token lifetime hợp lý |

#### Deployment

| Lựa chọn | Đánh giá | Nhận xét |
|-----------|---------|---------|
| **Vercel cho frontend** | ✅ Phù hợp | Free, CDN toàn cầu, auto SSL — tốt cho SPA |
| **Fly.io cho backend** | ✅ Phù hợp | Free tier, Singapore region — tốt cho đồ án |
| **Supabase cho PostgreSQL** | ✅ Phù hợp | Managed PostgreSQL miễn phí, built-in dashboard |
| **Docker containers** | ✅ Chuẩn | Mọi hệ thống hiện đại đều dùng containers |

### 4.4 Kiến trúc Modular Monolith — Phân tích và đánh giá

#### Lựa chọn Modular Monolith là HỢP LÝ

Đề bài **không bắt buộc** microservices (chỉ khuyến nghị), và việc chọn Modular Monolith có nhiều lý do chính đáng:

- ✅ **Phù hợp thực tế ngành:** InvenTree, Odoo, ERPNext — các IMS phổ biến nhất đều là monolith
- ✅ **Phù hợp team size:** Team nhỏ (<20 engineers) → modular monolith giảm operational complexity
- ✅ **Xu hướng ngành:** 42% organizations đang consolidate microservices về modular monolith (Gartner, ThoughtWorks)
- ✅ **Dễ phát triển:** Testing, debugging đơn giản hơn microservices
- ✅ **Khả năng mở rộng:** Mỗi module đã có routes/service/types độc lập → có thể extract thành microservice sau khi cần
- ✅ **Doc giải thích tốt:** Architecture doc trình bày lý do chọn kiến trúc này rất thuyết phục, có dẫn chứng

#### Điểm cần lưu ý

Dù Modular Monolith là lựa chọn hợp lệ, nhóm vẫn có thể **nâng điểm** bằng cách tách một vài services riêng (ví dụ: AI/ML FastAPI service đã được thiết kế tách biệt trong doc). Điều này thể hiện khả năng hiểu và áp dụng nhiều kiến trúc khác nhau.

---

## 5. Đối chiếu yêu cầu đồ án và hiện trạng

### 5.1 Yêu cầu kỹ thuật bắt buộc

**Yêu cầu bắt buộc:**

| # | Yêu cầu đề bài | Architecture doc | Code thực tế | Đánh giá |
|---|----------------|-----------------|-------------|---------|
| 1 | **Pre-built UI libraries** (React, Bootstrap) | ✅ Ghi Ant Design | ❌ Chưa cài Ant Design | **KHÔNG ĐÁP ỨNG** |
| 2 | **RESTful API** | ✅ Có contracts | ✅ Có 9 endpoints | **ĐÁP ỨNG MỘT PHẦN** |
| 3 | **gRPC API** | ❌ Không đề cập | ❌ Không có | **KHÔNG ĐÁP ỨNG** |
| 4 | **GraphQL API** | ❌ Không đề cập | ❌ Không có | **KHÔNG ĐÁP ỨNG** |
| 5 | **Third-party Identity Management** | ✅ Keycloak 24+ | ❌ Không có code | **CHỈ TRONG DOC** |
| 6 | **AI feature integration** | ✅ 5 features planned | ⚠️ Chỉ Semantic Search POC | **CHỈ TRONG DOC** |
| 7 | **Continuous deployment pipeline** | ✅ GitHub Actions YAML | ❌ Không có file thực | **CHỈ TRONG DOC** |

**Yêu cầu khuyến nghị (không bắt buộc):**

| # | Yêu cầu đề bài | Architecture doc | Code thực tế | Đánh giá |
|---|----------------|-----------------|-------------|---------|
| 8 | **Microservices architecture** | ✅ Chọn Modular Monolith (hợp lệ) | ✅ Modular Monolith | **ĐÁP ỨNG** (Monolith được phép) |
| 9 | **Domain-driven design** | ✅ Có bounded contexts | ⚠️ Code chưa phản ánh đầy đủ | **CHỈ TRONG DOC** |
| 10 | **Event-driven architecture** | ✅ Có Event Bus design | ❌ Không có code | **CHỈ TRONG DOC** |

**Kết quả: 0/7 yêu cầu bắt buộc được đáp ứng đầy đủ trong code. Yêu cầu kiến trúc (Monolith) được đáp ứng.**

### 5.2 Deliverables

| # | Deliverable | Trạng thái | Chi tiết |
|---|-----------|-----------|---------|
| 01 | 01_Documents/ (9 files) | ⚠️ Cần kiểm tra | 05_Architecture.md đã có, cần kiểm tra các file khác |
| 02 | 02_Source/01_Source Code | ⚠️ Thiếu nhiều | Chỉ có scaffold cơ bản + 2 modules |
| 03 | 02_Source/02_Raw Data | ❌ Trống | Không có data |
| 04 | 02_Source/03_Build Scripts | ❌ Trống | Không có scripts |
| 05 | 02_Source/04_Compilation Guide.md | ✅ Có | Cần kiểm tra nội dung |
| 06 | 03_Deployment/ | ⚠️ Cần kiểm tra | Cần Deployment Package, Guide, User Guide |

### 5.3 Đánh giá cho demo giữa kỳ

Giảng viên sẽ hỏi:

| Câu hỏi | Khả năng trả lời | Rủi ro |
|---------|------------------|--------|
| "Demo một business case" | ⚠️ Chỉ demo được CRUD materials + transactions | Chưa đủ business flow hoàn chỉnh |
| "Quy trình phát triển (Kanban)" | Cần kiểm tra Trello/Jira | — |
| "Source code integration" | ✅ Git commits có | — |
| "Giải thích Product Backlog" | Cần kiểm tra file 04 | — |
| "Development View (directory structure)" | ✅ Có thể giải thích | — |
| "Logical/Process View (completed story)" | ⚠️ Chỉ có Materials story | Thiếu QC flow, stock flow |
| "Deployment View (deployed system)" | ⚠️ Backend trên Fly.io | Frontend chưa deploy? |

---

## 6. Tổng hợp vấn đề và khuyến nghị

### 6.1 Bảng đánh giá tổng quan

| Khía cạnh | Điểm (1-10) | Nhận xét |
|-----------|------------|---------|
| Architecture doc — chất lượng viết | **8/10** | Rất chi tiết, 4+1 views, diagrams đẹp, professional |
| Architecture doc — tính chính xác | **5.5/10** | Nhiều mâu thuẫn với code, số liệu không có cơ sở, thiếu gRPC/GraphQL |
| Architecture doc — phù hợp ngành IMS | **7.5/10** | Modules, tech stack đúng chuẩn, Modular Monolith phù hợp, scope rộng |
| Architecture doc — đáp ứng yêu cầu đề bài | **5/10** | Kiến trúc Monolith hợp lệ, nhưng thiếu gRPC, GraphQL — 2 yêu cầu bắt buộc |
| Source code — mức độ hoàn thành | **3/10** | ~10-15% so với Architecture doc |
| Source code — chất lượng code | **6/10** | Code clean, TypeScript tốt, nhưng thiếu tests, validation, auth |
| Source code — đáp ứng yêu cầu đề bài | **2.5/10** | 0/7 yêu cầu kỹ thuật bắt buộc đáp ứng đầy đủ, kiến trúc Monolith hợp lệ |

### 6.2 Vấn đề theo mức độ nghiêm trọng

#### MỨC ĐỘ NGHIÊM TRỌNG — Phải sửa ngay

| # | Vấn đề | Ảnh hưởng | Giải pháp đề xuất |
|---|--------|-----------|-------------------|
| 1 | **Thiếu gRPC** | Không đáp ứng yêu cầu bắt buộc API | Thêm gRPC giữa Backend ↔ AI/ML Service (internal communication) |
| 2 | **Thiếu GraphQL** | Không đáp ứng yêu cầu bắt buộc API | Thêm GraphQL endpoint cho frontend queries (Apollo Server) |
| 3 | **Thiếu CI/CD pipeline thực tế** | Không đáp ứng yêu cầu bắt buộc | Tạo `.github/workflows/` với deploy pipeline |
| 4 | **Keycloak chưa tích hợp** | Không đáp ứng yêu cầu bắt buộc Identity Management | Setup Keycloak Docker + auth middleware trong backend |
| 5 | **Frontend chưa có UI thực** | Không demo được business case | Cài Ant Design, tạo pages cho Materials, Transactions |

#### MỨC ĐỘ CAO — Cần hoàn thành sớm

| # | Vấn đề | Giải pháp |
|---|--------|-----------|
| 7 | Thiếu unit tests | Setup Jest, viết tests cho services |
| 8 | Doc ↔ Code không nhất quán | Cập nhật doc: Node version, React version, ORM, libraries |
| 9 | Database schema thiếu | Thêm tables: inventory_lots, qc_tests, stock_levels, audit_logs |
| 10 | Thiếu validation middleware | Cài Zod, validate request body cho mọi POST/PUT endpoints |
| 11 | 02_Raw Data trống | Thêm assets (images, icons, sample data) |
| 12 | 03_Build Scripts trống | Thêm scripts (setup.sh, seed-db.sh, build-all.sh) |

#### MỨC ĐỘ TRUNG BÌNH — Nâng cao chất lượng

| # | Vấn đề | Giải pháp |
|---|--------|-----------|
| 13 | Thiếu API documentation | Setup Swagger/OpenAPI cho backend |
| 14 | Thiếu logging framework | Cài Winston, structured JSON logging |
| 15 | Thiếu monitoring | Cài prom-client, expose /metrics |
| 16 | AI feature chưa implement | Tối thiểu: LLM Chatbot (Claude API) + Semantic Search |
| 17 | WebSocket chưa có | Implement real-time stock updates |
| 18 | Số liệu performance không có cơ sở | Chạy load test (k6), ghi nhận kết quả thực tế |

### 6.3 Gợi ý bổ sung gRPC + GraphQL vào kiến trúc Modular Monolith hiện tại

Kiến trúc Modular Monolith hiện tại là **hợp lệ**. Chỉ cần bổ sung gRPC và GraphQL để đáp ứng yêu cầu API:

```
┌──────────────────────────────────────────────────────────────┐
│  MODULAR MONOLITH + MULTI-PROTOCOL API (Đề xuất)             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                                            │
│  │  Frontend     │  Vercel (React SPA + Ant Design)          │
│  │  (React)      │  GraphQL queries + REST calls             │
│  └──────┬───────┘                                            │
│         │ GraphQL + REST + WebSocket                         │
│         ▼                                                    │
│  ┌──────────────────────────────────────────────────┐        │
│  │  BACKEND (Modular Monolith — Node.js + Express)   │        │
│  │                                                    │        │
│  │  API Layer:                                        │        │
│  │  ├─ REST API    (/api/materials, /api/transactions)│        │
│  │  ├─ GraphQL     (/graphql — Apollo Server)         │        │
│  │  └─ gRPC client (gọi sang AI/ML Service)          │        │
│  │                                                    │        │
│  │  Modules:                                          │        │
│  │  ├─ Materials   ├─ Inventory Lots  ├─ Transactions │        │
│  │  ├─ Stock Mgmt  ├─ QC             ├─ Labeling     │        │
│  │  ├─ Production  └─ Reporting                       │        │
│  │                                                    │        │
│  │  Shared: DB Pool, Redis Cache, Auth Middleware     │        │
│  └──────────┬───────────────────────────────┘        │
│             │ gRPC (internal)                         │
│             ▼                                         │
│  ┌──────────────────┐                                 │
│  │  AI/ML Service    │  FastAPI (tách riêng)           │
│  │  (gRPC server)    │                                │
│  │  ├─ Semantic Search                                │
│  │  ├─ LLM Chatbot (Claude API)                      │
│  │  └─ Demand Forecast (optional)                    │
│  └──────────────────┘                                 │
│                                                       │
│  ┌──────────────┐  ┌──────────┐  ┌──────────────┐    │
│  │  PostgreSQL   │  │  Redis    │  │  Keycloak     │   │
│  │  (Supabase)   │  │ (Cache)   │  │  (Auth/RBAC)  │   │
│  └──────────────┘  └──────────┘  └──────────────┘    │
│                                                       │
│  API Protocols:                                       │
│  • REST    — Frontend ↔ Backend (CRUD operations)    │
│  • GraphQL — Frontend ↔ Backend (complex queries)    │
│  • gRPC    — Backend ↔ AI/ML Service (internal)      │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**Lưu ý:** Kiến trúc này giữ nguyên Modular Monolith làm core, chỉ bổ sung:
- **GraphQL endpoint** (Apollo Server) trong backend để frontend query linh hoạt
- **gRPC communication** giữa backend và AI/ML FastAPI service
- AI/ML Service vẫn tách riêng như thiết kế ban đầu trong Architecture doc

### 6.4 Thứ tự ưu tiên triển khai (đề xuất)

Giả sử còn **3-4 tuần** trước khi demo:

#### Tuần 1: Frontend + Đồng bộ doc
- [ ] Cập nhật Architecture doc: thêm gRPC, GraphQL vào API contracts
- [ ] Đồng bộ doc ↔ code (versions, libraries)
- [ ] Cài Ant Design + React Router + React Query vào frontend
- [ ] Tạo pages: Dashboard, Materials (list + form), Transactions (list + form)
- [ ] Kết nối frontend với backend API

#### Tuần 2: Auth + Database + Modules
- [ ] Setup Keycloak Docker container + realm + roles
- [ ] Thêm auth middleware vào backend (express-jwt + jwks-rsa)
- [ ] Mở rộng database schema (inventory_lots, qc_tests, stock_levels)
- [ ] Implement thêm 2-3 modules (Inventory Lots, Stock Management)
- [ ] Tạo AI/ML service (FastAPI) — tối thiểu 1 endpoint (chatbot hoặc search)

#### Tuần 3: gRPC + GraphQL + CI/CD
- [ ] Thêm gRPC giữa backend ↔ AI/ML service (internal communication)
- [ ] Thêm GraphQL endpoint (Apollo Server) cho frontend queries
- [ ] Tạo GitHub Actions CI/CD pipeline
- [ ] Viết unit tests (Jest) cho services chính
- [ ] Deploy frontend lên Vercel

#### Tuần 4: Polish + Testing + Documentation
- [ ] Hoàn thiện UI, fix bugs
- [ ] Thêm Swagger API docs
- [ ] Chạy load test, ghi nhận performance metrics
- [ ] Chuẩn bị demo giữa kỳ
- [ ] Hoàn thiện 02_Raw Data, 03_Build Scripts
- [ ] Quay video YouTube (compilation, deployment, system demo)

---

**Kết luận:** Architecture doc được viết **rất tốt về mặt hình thức** (4+1 views, diagrams chi tiết, tech analysis) và lựa chọn kiến trúc **Modular Monolith là hợp lệ**, phù hợp với thực tế ngành IMS. Tuy nhiên còn **2 vấn đề cần xử lý**: (1) thiếu gRPC và GraphQL trong cả doc lẫn code (yêu cầu bắt buộc), (2) nhiều mâu thuẫn giữa doc và code thực tế (versions, libraries, planned features). Source code mới hoàn thành ~10-15% và cần đẩy nhanh tiến độ đáng kể để kịp demo.

---

*Báo cáo được tạo tự động bởi Claude Code — 2026-02-28*
