# 05_Architecture

## 1. Tổng quan kiến trúc
Hệ thống **Inventory Management System** được thiết kế theo mô hình nhiều lớp (multi‑layer) kết hợp hướng dịch vụ (service‑oriented) để đảm bảo:
- Dễ mở rộng và bảo trì
- Phân tách rõ ràng trách nhiệm
- Hỗ trợ tích hợp và mở rộng tính năng trong tương lai

## 2. Các mô hình và góc nhìn kiến trúc

### 2.1. Góc nhìn nghiệp vụ (Business View)
- **Tác nhân chính (User Roles):**
  - `Admin` - Quản trị toàn bộ hệ thống
  - `InventoryManager` - Quản lý kho, nhập/xuất hàng
  - `QualityControl` - Kiểm tra chất lượng, approve/reject lots
  - `Production` - Tạo và quản lý lô sản xuất
  - `Viewer` - Chỉ xem báo cáo

- **Quy trình chính:**
  - Receiving: Nhập kho nguyên vật liệu → Tạo InventoryLot
  - QC Testing: Kiểm tra chất lượng → Approve/Reject lots
  - Production: Tạo lô sản xuất → Sử dụng nguyên liệu
  - Labeling: In nhãn cho lots và batches
  - Reporting: Báo cáo tồn kho, truy xuất nguồn gốc

- **Mục tiêu:** Kiểm soát chất lượng nguyên liệu, truy xuất nguồn gốc (traceability), quản lý sản xuất.

### 2.2. Góc nhìn logic (Logical View)
- **Mô hình phân lớp (Layered Architecture):**
  - **Presentation/UI:** Giao diện người dùng, nhập liệu, hiển thị báo cáo.
  - **Application/Service:** Xử lý nghiệp vụ (nhập/xuất, tồn kho, báo cáo).
  - **Domain/Business Logic:** Quy tắc nghiệp vụ, kiểm tra dữ liệu.
  - **Data Access:** Giao tiếp với cơ sở dữ liệu.
- **Mô hình MVC/MVVM** (tùy công nghệ frontend): tách giao diện và xử lý dữ liệu.

### 2.3. Góc nhìn dữ liệu (Data View)

Dựa trên [Database Schema](https://nhbien.github.io/inventory-mangement-system-database-schema/)

- **Thực thể chính (8 bảng):**
  - `Users` - Người dùng và phân quyền
  - `Materials` - Master data nguyên vật liệu
  - `LabelTemplates` - Mẫu nhãn in
  - `InventoryLots` - Lô hàng nhập kho
  - `InventoryTransactions` - Lịch sử giao dịch
  - `QCTests` - Kết quả kiểm tra chất lượng
  - `ProductionBatches` - Lô sản xuất
  - `BatchComponents` - Thành phần lô sản xuất

- **Quan hệ chính:**
  - Materials → InventoryLots (1:N)
  - InventoryLots → InventoryTransactions (1:N)
  - InventoryLots → QCTests (1:N)
  - ProductionBatches → BatchComponents (1:N)
  - InventoryLots → BatchComponents (1:N)
  - Materials → ProductionBatches (1:N, product_id)

- **Lưu trữ:** PostgreSQL với UUID primary keys, ENUM types, DECIMAL(10,3) cho quantity.

### 2.4. Góc nhìn triển khai (Deployment/Physical View)
- **Client:** Trình duyệt Web hoặc ứng dụng desktop/mobile.
- **Application Server:** Xử lý API và nghiệp vụ.
- **Database Server:** Lưu trữ dữ liệu hệ thống.
- **Các môi trường:** Dev, Test, Production.

### 2.5. Góc nhìn bảo mật (Security View)
- **Identity Provider:** Keycloak (Self-hosted, Open Source)
- **Xác thực:** OAuth 2.0 / OpenID Connect (OIDC)
- **Phân quyền:** RBAC (Role‑Based Access Control) - 5 roles được quản lý trong Keycloak
- **Token:** JWT Access Token + Refresh Token
- **Bảo vệ dữ liệu:** HTTPS, mã hóa dữ liệu nhạy cảm, sao lưu định kỳ
- **Audit:** Ghi log thao tác quan trọng (nhập/xuất, chỉnh sửa dữ liệu)

## 3. Công nghệ và công cụ lựa chọn

### 3.1. Technology Stack (Recommended)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              TECHNOLOGY STACK                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  FRONTEND (Client)                                                       │   │
│  │  ────────────────────────────────────────────────────────────────────── │   │
│  │  • Framework:    React 18 + TypeScript                                   │   │
│  │  • UI Library:   Ant Design 5.x (tables, forms, dashboard)              │   │
│  │  • State:        React Query (server state) + Zustand (client state)    │   │
│  │  • Routing:      React Router v6                                         │   │
│  │  • Build Tool:   Vite                                                    │   │
│  │  • Auth Client:  @react-keycloak/web                                     │   │
│  │  • Charts:       Recharts hoặc Chart.js                                  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│                              │ REST API (JSON) + JWT Token                      │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  BACKEND (Server)                                                        │   │
│  │  ────────────────────────────────────────────────────────────────────── │   │
│  │  • Runtime:      Node.js 20 LTS                                          │   │
│  │  • Framework:    Express.js + TypeScript                                 │   │
│  │  • ORM:          Sequelize v6 (match với database schema)               │   │
│  │  • Validation:   Joi / Zod                                               │   │
│  │  • Auth:         Keycloak JWT Verify (keycloak-connect)                 │   │
│  │  • API Docs:     Swagger / OpenAPI 3.0                                   │   │
│  │  • Logging:      Winston                                                 │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                              │                                                  │
│                              │ Sequelize ORM                                    │
│                              ▼                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  DATABASE                                                                │   │
│  │  ────────────────────────────────────────────────────────────────────── │   │
│  │  • RDBMS:        PostgreSQL 15+                                          │   │
│  │  • Features:     UUID, ENUM, DECIMAL(10,3), JSONB                       │   │
│  │  • Migration:    Sequelize CLI                                           │   │
│  │  • Backup:       pg_dump (automated)                                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  IDENTITY & ACCESS MANAGEMENT                                            │   │
│  │  ────────────────────────────────────────────────────────────────────── │   │
│  │  • Provider:     Keycloak 24+ (Self-hosted, Open Source)                │   │
│  │  • Protocol:     OAuth 2.0 / OpenID Connect (OIDC)                      │   │
│  │  • Features:     SSO, RBAC, User Federation, Social Login               │   │
│  │  • Database:     PostgreSQL (shared or separate)                        │   │
│  │  • Admin UI:     http://localhost:8080/admin                            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  DEVOPS & TOOLS                                                          │   │
│  │  ────────────────────────────────────────────────────────────────────── │   │
│  │  • Version Control:    Git + GitHub                                      │   │
│  │  • CI/CD:              GitHub Actions                                    │   │
│  │  • Container:          Docker + Docker Compose                           │   │
│  │  • API Testing:        Postman / Thunder Client                          │   │
│  │  • Code Quality:       ESLint + Prettier                                 │   │
│  │  • Testing:            Jest + React Testing Library                      │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2. Lý do lựa chọn

| Component | Choice | Lý do |
|-----------|--------|-------|
| **React + TypeScript** | Frontend | Type-safe, component reusable, ecosystem lớn, phổ biến nhất |
| **Ant Design** | UI Library | Có sẵn Table, Form, Modal, DatePicker - phù hợp inventory management |
| **Node.js + Express** | Backend | Cùng ngôn ngữ TypeScript với FE, async I/O, NPM ecosystem |
| **Sequelize** | ORM | Database schema đã thiết kế theo Sequelize syntax, dễ migration |
| **PostgreSQL** | Database | Hỗ trợ UUID native, ENUM, DECIMAL precision cao, JSON queries |
| **Keycloak** | Identity Provider | Free, Open Source, RBAC đầy đủ, Docker-ready, OAuth2/OIDC |
| **Docker** | Container | Đồng nhất môi trường dev/test/prod |

### 3.3. Keycloak Configuration

#### Tại sao chọn Keycloak thay vì Okta?

| Tiêu chí | Keycloak | Okta |
|----------|----------|------|
| Chi phí | **Free** (Open Source) | Trả phí (Free: 15k MAU) |
| Hosting | Self-hosted (Docker) | Cloud-managed |
| Customization | **Cao** (full control) | Hạn chế |
| Learning | **Nhiều hơn** | Ít hands-on |
| Data Privacy | **Full control** | Cloud vendor |
| Docker Support | **Official image** | Không cần |

#### Keycloak Realm Setup

```
Realm: inventory-management
├── Clients
│   ├── inventory-frontend (public, SPA)
│   └── inventory-backend (confidential, bearer-only)
│
├── Roles (Realm Roles)
│   ├── admin
│   ├── inventory_manager
│   ├── quality_control
│   ├── production
│   └── viewer
│
├── Users
│   ├── admin1 → [admin]
│   ├── jdoe → [inventory_manager]
│   ├── qc1 → [quality_control]
│   ├── qc_super → [quality_control]
│   └── prod1 → [production]
│
└── Authentication
    ├── Browser flow (for frontend)
    └── Direct Grant flow (for API testing)
```

#### Docker Compose cho Keycloak

```yaml
# docker-compose.yml
services:
  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    container_name: keycloak
    environment:
      - KEYCLOAK_ADMIN=admin
      - KEYCLOAK_ADMIN_PASSWORD=admin
      - KC_DB=postgres
      - KC_DB_URL=jdbc:postgresql://postgres:5432/keycloak
      - KC_DB_USERNAME=keycloak
      - KC_DB_PASSWORD=keycloak
    command: start-dev
    ports:
      - "8080:8080"
    depends_on:
      - postgres

  postgres:
    image: postgres:15
    container_name: postgres
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

#### Frontend Integration (React)

```typescript
// keycloak.ts
import Keycloak from 'keycloak-js';

const keycloak = new Keycloak({
  url: 'http://localhost:8080',
  realm: 'inventory-management',
  clientId: 'inventory-frontend',
});

export default keycloak;
```

#### Backend Integration (Express)

```typescript
// middleware/auth.ts
import { expressjwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

export const checkJwt = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    jwksUri: 'http://localhost:8080/realms/inventory-management/protocol/openid-connect/certs',
  }),
  audience: 'inventory-backend',
  issuer: 'http://localhost:8080/realms/inventory-management',
  algorithms: ['RS256'],
});

// Role-based middleware
export const requireRole = (roles: string[]) => {
  return (req, res, next) => {
    const userRoles = req.auth?.realm_access?.roles || [];
    if (roles.some(role => userRoles.includes(role))) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  };
};
```

### 3.4. Alternative Options

| Layer | Option A (Recommended) | Option B | Option C |
|-------|------------------------|----------|----------|
| Frontend | React + Ant Design | Angular + Material | Vue.js + Vuetify |
| Backend | Node.js + Express | Spring Boot (Java) | FastAPI (Python) |
| ORM | Sequelize | TypeORM | Prisma |
| Database | PostgreSQL | MySQL 8.0 | SQL Server |
| Auth/IAM | **Keycloak** | Okta | Auth0 |

### 3.5. Special Features Implementation

| Feature | Technology | Notes |
|---------|------------|-------|
| **Label Printing** | react-to-print + jsPDF | Generate PDF labels from templates |
| **Barcode/QR** | qrcode.react + react-barcode | Display và print barcodes |
| **Excel Export** | xlsx / ExcelJS | Export reports to Excel |
| **Real-time Updates** | Socket.io (optional) | Inventory quantity changes |
| **Scheduled Jobs** | node-cron | Expiration date checking |

### 3.6. Project Structure

```
inventory-management-system/
├── frontend/                    # React Application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components (routes)
│   │   ├── hooks/               # Custom React hooks
│   │   ├── services/            # API calls
│   │   ├── store/               # State management
│   │   ├── types/               # TypeScript interfaces
│   │   ├── utils/               # Helper functions
│   │   └── auth/                # Keycloak configuration
│   │       └── keycloak.ts
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Express Application
│   ├── src/
│   │   ├── controllers/         # Route handlers
│   │   ├── models/              # Sequelize models
│   │   ├── routes/              # API routes
│   │   ├── middleware/          # Auth (Keycloak), validation, error handling
│   │   │   └── auth.ts          # JWT verify + role check
│   │   ├── services/            # Business logic
│   │   ├── utils/               # Helpers
│   │   └── config/              # DB config, Keycloak config, env
│   ├── migrations/              # Database migrations
│   ├── seeders/                 # Test data
│   └── package.json
│
├── keycloak/                    # Keycloak Configuration
│   ├── realm-export.json        # Realm config (import on startup)
│   └── themes/                  # Custom login themes (optional)
│
├── docker-compose.yml           # PostgreSQL + Keycloak + pgAdmin
├── init-db.sql                  # Initialize databases
├── .github/workflows/           # CI/CD
└── README.md
```

## 4. Diễn giải kiến trúc theo các mô hình phổ biến

### 4.1. Mô hình Client‑Server
- Client gửi yêu cầu (API/HTTP) đến server.
- Server xử lý và trả kết quả.
- Phù hợp cho hệ thống quản lý tập trung.

### 4.2. Mô hình Layered
- Tăng khả năng bảo trì và kiểm thử.
- Dễ thay đổi một lớp mà không ảnh hưởng lớp khác.

### 4.3. Mô hình Service‑Oriented (mở rộng)
- Tách các dịch vụ theo chức năng chính (Inventory, Report, User).
- Có thể mở rộng thành microservices trong tương lai.

## 5. Kết luận
Kiến trúc hệ thống được thiết kế theo mô hình nhiều lớp kết hợp client‑server, đảm bảo khả năng mở rộng, an toàn và phù hợp với yêu cầu quản lý kho. Các lựa chọn công nghệ sẽ được chốt và cập nhật vào tài liệu khi nhóm thống nhất triển khai.