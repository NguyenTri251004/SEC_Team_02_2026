# 06_Proof of Concept

## Keycloak

### 1. Tổng quan

#### 1.1. Mục đích

Tài liệu này trình bày quá trình Proof of Concept (POC) cho tính năng **xác thực và phân quyền (Authentication & Authorization)** bằng **Keycloak** - một thách thức kỹ thuật quan trọng trong hệ thống Inventory Management System.

#### 1.2. Tính năng POC

**Keycloak Integration với OAuth 2.0 / OIDC cho RBAC (Role-Based Access Control)**

Đây là tính năng khó về mặt kỹ thuật vì:

- Yêu cầu tích hợp Identity Provider (IdP) độc lập với cả frontend và backend
- Cần hiểu rõ flow OAuth 2.0 / OpenID Connect
- Xử lý JWT tokens, refresh tokens, và token validation
- Cấu hình phức tạp với Realm, Clients, Roles, Users
- Đảm bảo bảo mật end-to-end cho toàn bộ hệ thống

#### 1.3. Lý do chọn Keycloak

| Tiêu chí    | Keycloak                      | Giải pháp tự build           |
| ----------- | ----------------------------- | ---------------------------- |
| Chi phí     | Free (Open Source)            | Tốn thời gian phát triển     |
| Bảo mật     | Battle-tested, OIDC certified | Rủi ro lỗ hổng bảo mật       |
| Features    | SSO, MFA, RBAC, Social login  | Phải tự implement tất cả     |
| Độ phức tạp | Cấu hình trước, sử dụng sau   | Phải maintain code liên tục  |
| Learning    | Học chuẩn OAuth 2.0 / OIDC    | Giải pháp custom không chuẩn |

### 2. Yêu cầu kỹ thuật

#### 2.1. Yêu cầu chức năng

1. **Authentication (Xác thực):**
   - Đăng nhập bằng username/password qua Keycloak
   - Nhận JWT Access Token + Refresh Token
   - Auto-refresh token khi hết hạn

2. **Authorization (Phân quyền):**
   - 5 roles: `admin`, `inventory_manager`, `quality_control`, `production`, `viewer`
   - Mỗi role có quyền truy cập khác nhau vào API endpoints
   - Frontend hiển thị/ẩn UI components theo role

3. **Security:**
   - Tất cả API đều yêu cầu JWT token hợp lệ
   - Token được verify bằng Keycloak public key (JWKS)
   - Logout xóa session và tokens

#### 2.2. Use case demo: Receiving Inventory

**Kịch bản:** User với role `inventory_manager` đăng nhập và tạo InventoryLot mới (nhập kho nguyên vật liệu).

**Flow:**

1. User mở app → Redirect tới Keycloak login
2. Nhập credentials → Keycloak trả về JWT token chứa role
3. Frontend lưu token, hiển thị trang Receiving
4. User nhập thông tin lot (material, quantity, expiry date...)
5. Frontend gửi POST request với JWT token trong header
6. Backend verify token → Check role `inventory_manager` → Tạo lot trong DB
7. Response success → Frontend hiển thị thông báo thành công

**Điều kiện phân quyền:**

- `inventory_manager`, `admin`: Được tạo lot ✅
- `quality_control`, `production`, `viewer`: Không được tạo lot ❌

#### 2.3. Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                     POC ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Frontend: React 18 + TypeScript                          │   │
│  │  • keycloak-js 24.0 (Keycloak JS Adapter)                │   │
│  │  • @react-keycloak/web (React wrapper)                   │   │
│  │  • Axios (HTTP client with token interceptor)            │   │
│  │  • React Router v6 (Protected Routes)                    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            │ HTTP + JWT Bearer Token             │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Backend: Node.js + Express + TypeScript                 │   │
│  │  • express-jwt (JWT verification)                         │   │
│  │  • jwks-rsa (Keycloak public key fetch)                  │   │
│  │  • Sequelize (PostgreSQL ORM)                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                            │                                     │
│                            │ SQL                                 │
│                            ▼                                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  PostgreSQL 15                                            │   │
│  │  • inventory_db: Tables (Users, Materials, Lots...)      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Keycloak 24.0 (Self-hosted)                             │   │
│  │  • Realm: inventory-management                            │   │
│  │  • Database: PostgreSQL (keycloak_db)                    │   │
│  │  • Admin UI: http://localhost:8080/admin                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Quy trình thử nghiệm (POC Process)

#### 3.1. Phase 1: Môi trường và cấu hình (Environment Setup)

##### Bước 1.1: Cài đặt Docker Compose

**Mục tiêu:** Khởi chạy Keycloak + PostgreSQL bằng Docker

**File:** `docker-compose.yml`

```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    container_name: postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql
    ports:
      - "5432:5432"
    networks:
      - ims-network

  keycloak:
    image: quay.io/keycloak/keycloak:24.0
    container_name: keycloak
    environment:
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/keycloak_db
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloak
    command: start-dev
    ports:
      - "8080:8080"
    depends_on:
      - postgres
    networks:
      - ims-network

volumes:
  postgres_data:

networks:
  ims-network:
    driver: bridge
```

**File:** `init-db.sql`

```sql
-- Tạo database cho Keycloak
CREATE DATABASE keycloak_db;
CREATE USER keycloak WITH PASSWORD 'keycloak';
GRANT ALL PRIVILEGES ON DATABASE keycloak_db TO keycloak;

-- Tạo database cho Inventory Management System
CREATE DATABASE inventory_db;
GRANT ALL PRIVILEGES ON DATABASE inventory_db TO postgres;
```

**Khởi chạy:**
```bash
$ docker-compose up -d
```

**Xác nhận:**
- ✅ Keycloak Admin Console: http://localhost:8080/admin (admin/admin)
- ✅ PostgreSQL databases: `keycloak_db` và `inventory_db` đã được tạo

---

##### Bước 1.2: Cấu hình Keycloak Realm

**Mục tiêu:** Tạo Realm và cấu hình Clients, Roles, Users

**Cấu hình thủ công qua Keycloak Admin UI:**

1. **Tạo Realm:**
   - Tên Realm: `inventory-management`
   - Trạng thái: Bật (ON)

2. **Tạo Client cho Frontend:**
   - Client ID: `inventory-frontend`
   - Client authentication: **OFF** (vì là public SPA client)
   - Authorization: OFF
   - Authentication flow:
     - ✅ Standard flow (Authorization Code Flow)
     - ✅ Direct access grants (Resource Owner Password)
   - Valid redirect URIs: `http://localhost:5173/*`
   - Web origins: `http://localhost:5173`

2a. **Cấu hình Audience Mapper cho Frontend Client:**

Để backend có thể verify token, cần thêm audience claim vào token:

- Vào client `inventory-frontend` → Tab **Client scopes**
- Click vào scope **inventory-frontend-dedicated**
- Tab **Mappers** → Click **Add mapper** → **Configure a new mapper** / **By configuration**
- Chọn **Audience**
- Cấu hình mapper:
  - Name: `backend-audience`
  - Included Client Audience: `inventory-backend`
  - Add to ID token: OFF
  - Add to access token: **ON**
  - Add to lightweight access token: **ON**
  - Add to token introspection **ON**
- Click **Save**

✅ Sau bước này, access token sẽ có `"aud": "inventory-backend"` và backend có thể verify audience.

3. **Tạo Client cho Backend:**
   - Client ID: `inventory-backend`
   - Client authentication: **ON** (confidential client)
   - Authorization: OFF
   - Authentication flow: **Bỏ chọn tất cả** (backend chỉ verify token, không initiate login)
   - Sau khi tạo → Tab **Credentials**: Copy **Client secret** để dùng cho backend config (nếu cần)

4. **Tạo Realm Roles:**
   - `admin`
   - `inventory_manager`
   - `quality_control`
   - `production`
   - `viewer`

5. **Tạo Users:**

| Username | Email             | First name | Last name | Password | Roles             |
| -------- | ----------------- | ---------- | --------- | -------- | ----------------- |
| admin1   | admin1@ims.local  | Admin      | User      | admin123 | admin             |
| jdoe     | jdoe@ims.local    | John       | Doe       | jdoe123  | inventory_manager |
| qc1      | qc1@ims.local     | QC         | Inspector | qc123    | quality_control   |
| prod1    | prod1@ims.local   | Production | Staff     | prod123  | production        |
| viewer1  | viewer1@ims.local | View       | Only      | view123  | viewer            |

**Các bước tạo user:**
- Tạo user với thông tin trong bảng (username, email, first/last name)
- Set password (tắt Temporary để không phải đổi lần đầu)
- Assign realm role tương ứng
- Bật Email verified

✅ Lặp lại cho tất cả 5 users trong bảng.

**Kết quả:**

- Truy cập: http://localhost:8080/realms/inventory-management/.well-known/openid-configuration
- Response: JSON chứa endpoints (authorization_endpoint, token_endpoint, jwks_uri...)
- Confirm JWKS URI: http://localhost:8080/realms/inventory-management/protocol/openid-connect/certs

---

#### 3.2. Giai đoạn 2: Triển khai Backend (Express API)

##### Bước 2.1: Cấu trúc dự án

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # Sequelize config
│   │   └── keycloak.config.ts   # Keycloak endpoints
│   ├── middleware/
│   │   ├── auth.ts              # JWT verify + role check
│   │   └── errorHandler.ts
│   ├── models/
│   │   ├── index.ts
│   │   ├── Material.ts
│   │   └── InventoryLot.ts
│   ├── routes/
│   │   └── inventory.routes.ts
│   ├── controllers/
│   │   └── inventory.controller.ts
│   └── server.ts
├── package.json
└── tsconfig.json
```

##### Bước 2.2: Dependencies chính
- `express` - Web framework
- `express-jwt` + `jwks-rsa` - JWT verification với Keycloak
- `sequelize` + `pg` - PostgreSQL ORM
- `cors` - Cross-origin resource sharing

##### Bước 2.3: Auth Middleware

**Cốt lõi JWT verification:**
```typescript
export const checkJwt = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    jwksUri: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`,
  }),
  audience: "inventory-backend",
  issuer: `${KEYCLOAK_URL}/realms/${REALM}`,
  algorithms: ["RS256"],
});
```

**Role-based access control:**
```typescript
export const requireRole = (allowedRoles: string[]) => {
  return (req, res, next) => {
    const userRoles = req.auth.realm_access?.roles || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    if (!hasRole) return res.status(403).json({ error: "Forbidden" });
    next();
  };
};
```

**Chức năng:**
- `checkJwt`: Verify JWT signature bằng Keycloak public key (JWKS)
- `requireRole`: Check user roles từ token payload

##### Bước 2.4: Database Model

**InventoryLot model:** Sequelize ORM với các fields: `lot_number`, `material_id`, `quantity_received`, `lot_status`, `expiry_date`, `received_date`.

##### Bước 2.5: Protected API Routes

**Ví dụ route với role-based authorization:**
```typescript
router.use(checkJwt); // Tất cả routes yêu cầu JWT

// POST /api/inventory/lots - Chỉ inventory_manager và admin
router.post("/lots",
  requireRole(["inventory_manager", "admin"]),
  inventoryController.createLot
);

// PATCH /api/inventory/lots/:id/status - Chỉ quality_control và admin
router.patch("/lots/:id/status",
  requireRole(["quality_control", "admin"]),
  inventoryController.updateLotStatus
);
```

##### Bước 2.6: Controller Logic

**Ví dụ createLot:**
```typescript
export const createLot = async (req, res) => {
  const { material_id, quantity_received, expiry_date } = req.body;
  const lot_number = `LOT-${new Date().toISOString().slice(0,10)}-${Math.random()}`;
  
  const newLot = await InventoryLot.create({
    lot_number, material_id, quantity_received, expiry_date,
    lot_status: "Quarantine"
  });
  
  res.status(201).json({ success: true, data: newLot });
};
```

##### Bước 2.7: Server Setup

```typescript
app.use(cors({ origin: "http://localhost:5173" }));
app.use("/api/inventory", inventoryRoutes);
app.listen(3000);
```

✅ Backend chạy tại http://localhost:3000

---

#### 3.3. Giai đoạn 3: Triển khai Frontend (React)

##### Bước 3.1: Cấu trúc dự án

```
frontend/
├── src/
│   ├── auth/
│   │   └── keycloak.ts          # Keycloak instance
│   ├── components/
│   │   ├── ProtectedRoute.tsx   # Route guard
│   │   └── ReceivingForm.tsx    # Demo form
│   ├── services/
│   │   └── api.ts               # Axios instance with interceptor
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

##### Bước 3.2: Dependencies chính
- `react` + `react-router-dom` - UI framework và routing
- `@react-keycloak/web` + `keycloak-js` - Keycloak integration
- `axios` - HTTP client với interceptors

##### Bước 3.3: Cấu hình Keycloak

**File:** `frontend/src/auth/keycloak.ts`

```typescript
import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "http://localhost:8080",
  realm: "inventory-management",
  clientId: "inventory-frontend",
});

export default keycloak;
```

##### Bước 3.4: Axios Interceptor

**Request interceptor - Auto attach JWT:**
```typescript
api.interceptors.request.use(config => {
  if (keycloak.token) {
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});
```

**Response interceptor - Auto refresh token:**
```typescript
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      await keycloak.updateToken(30);
      return axios.request(error.config); // Retry
    }
  }
);
```

##### Bước 3.5: Protected Route Component

```typescript
const ProtectedRoute = ({ children, roles }) => {
  const { keycloak } = useKeycloak();
  
  if (!keycloak.authenticated) return <Navigate to="/login" />;
  
  const userRoles = keycloak.tokenParsed?.realm_access?.roles || [];
  const hasRole = roles.some(role => userRoles.includes(role));
  
  if (!hasRole) return <div>❌ Access Denied</div>;
  
  return <>{children}</>;
};
```

##### Bước 3.6: Receiving Form Component

**Form gửi POST request:**
```typescript
const handleSubmit = async (values) => {
  const response = await api.post('/inventory/lots', {
    material_id: values.material_id,
    quantity_received: values.quantity,
    expiry_date: values.expiry_date
  });
  message.success(`Lot created: ${response.data.data.lot_number}`);
};
```

##### Bước 3.7: App Entry Point

```typescript
const App = () => (
  <ReactKeycloakProvider authClient={keycloak}>
    <BrowserRouter>
      <Routes>
        <Route path="/receiving" element={
          <ProtectedRoute roles={['inventory_manager', 'admin']}>
            <ReceivingForm />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  </ReactKeycloakProvider>
);
```

✅ Frontend chạy tại http://localhost:5173

---

### 4. Kết quả thử nghiệm

#### 4.1. Test Case 1: Đăng nhập thành công

**Flow:**
1. Truy cập http://localhost:5173/receiving → Redirect tới Keycloak
2. Login với `jdoe` / `jdoe123`
3. Keycloak redirect về app với authorization code
4. App exchange code → Nhận Access Token

**Kết quả:**
```
✅ Login successful
👤 User: jdoe
🎭 Roles: ['inventory_manager']
🔑 Token payload chứa: sub, preferred_username, realm_access.roles
```

---

#### 4.2. Test Case 2: Tạo Inventory Lot thành công

**Input:**
- Material ID: `MAT-001`, Quantity: `100.500`, Expiry: `2026-12-31`

**Backend processing:**
1. `checkJwt`: Verify JWT signature với Keycloak JWKS → ✅ Valid
2. `requireRole`: Check `inventory_manager` in token roles → ✅ Authorized
3. `createLot`: Generate lot number → Insert database → Return response

**Kết quả:**
```json
{ "success": true, "data": { "lot_number": "LOT-20260130-3742", ... } }
```

✅ Lot được tạo trong database với status "Quarantine"

---

#### 4.3. Test Case 3: Từ chối truy cập với role `viewer`

**Kịch bản:** Login với `viewer1` / `view123` → Cố truy cập `/receiving`

**Kết quả:**
- Frontend: `❌ Access Denied` (ProtectedRoute blocked)
- Backend (nếu bypass): `403 Forbidden - Insufficient permissions`

✅ Role-based authorization hoạt động đúng

---

#### 4.4. Test Case 4: Auto Token Refresh

**Kịch bản:** Token expires (5 min) → User submit form sau expiry

**Xử lý:**
1. Backend reject với 401 (Invalid token)
2. Frontend interceptor bắt lỗi → Call `keycloak.updateToken(30)`
3. Retry request với token mới → ✅ Success

**Kết quả:** User không nhận ra token đã được refresh tự động

---

#### 4.5. Test Case 5: Logout Flow

**Flow:** User click Logout → `keycloak.logout()` → Keycloak invalidates session → Redirect to login

**Kết quả:**
- ✅ Token cleared từ browser
- ✅ Keycloak session terminated
- ✅ Truy cập protected routes → Redirect to Keycloak login

---

### 5. Thách thức kỹ thuật và giải pháp

| Thách thức | Vấn đề | Giải pháp |
|-----------|--------|----------|
| **CORS** | Frontend (5173) và Backend (3000) khác origin | Cấu hình `cors({ origin: "http://localhost:5173" })` |
| **JWKS Cache** | Mỗi request fetch Keycloak public key → Chậm | Bật `cache: true` và `rateLimit: true` trong jwks-rsa |
| **Token Refresh** | Token expires giữa chừng → Request fail | Dùng `autoRefreshToken: true` trong ReactKeycloakProvider |
| **Role Mapping** | JWT chứa nhiều default roles | Filter chỉ application roles: `admin`, `inventory_manager`, etc. |
| **Audience Claim** | Backend expect `aud: "inventory-backend"` nhưng token có `aud: "inventory-frontend"` | Thêm Audience Mapper trong Keycloak Client Scopes để inject backend audience |

**Lợi ích Audience Mapper:**
- ✅ Token chỉ dùng cho backend API được chỉ định
- ✅ Ngăn token reuse từ frontend khác
- ✅ Tuân thủ OAuth 2.0 best practices

---

### 6. Bài học kinh nghiệm

#### 6.1. Kiến thức kỹ thuật thu được

1. **OAuth 2.0 / OIDC Flow:**
   - Authorization Code Flow (cho web apps)
   - JWT structure: Header (algorithm) + Payload (claims) + Signature
   - Token types: Access Token (short-lived, 5 min) vs Refresh Token (long-lived, 30 min)

2. **Keycloak Architecture:**
   - Realm: Isolated namespace
   - Client: Application đăng ký với Keycloak
   - Roles: Realm-level vs Client-level
   - JWKS endpoint: Public keys để verify JWT

3. **Phương pháp tốt nhất về Bảo mật:**
   - Không lưu mật khẩu dạng plaintext (dùng bcrypt)
   - Token chỉ gửi qua HTTPS (môi trường production)
   - Xác thực token ở backend (không tin frontend)
   - Rate limiting để chống brute-force
   - **Audience claim validation**: Luôn validate `aud` claim trong JWT để đảm bảo token được issue cho đúng backend API (tránh token reuse từ client khác)

4. **Keycloak Audience Mapper:**
   - Mặc định token chỉ có `aud` là client ID (inventory-frontend)
   - Backend cần check token có `aud` là backend identifier (inventory-backend)
   - **Giải pháp:** Thêm Audience Mapper trong Client Scopes để inject backend audience vào access token
   - **Lợi ích**: Tăng bảo mật multi-tier architecture (token cho frontend không dùng được cho backend khác)
   - **POC hiện tại**: Đã cấu hình audience mapper, backend đang validate `audience: "inventory-backend"` thành công

#### 6.2. Công cụ hữu ích

| Công cụ                  | Mục đích                    | Link                        |
| ------------------------ | --------------------------- | --------------------------- |
| jwt.io                   | Giải mã và debug JWT tokens | https://jwt.io              |
| Keycloak Admin Console   | Quản lý Realm, Users, Roles | http://localhost:8080/admin |
| Thunder Client (VS Code) | Test API với JWT token      | Extension marketplace       |
| Docker Desktop           | Giám sát containers         | Application                 |

#### 6.3. Cần cải thiện

1. **Unit Tests:**
   - Viết tests cho middleware `checkJwt` và `requireRole`
   - Mock Keycloak JWKS endpoint để test

2. **Xử lý lỗi:**
   - Cải thiện hiển thị thông báo lỗi trên frontend
   - Thêm logging lỗi chi tiết ở backend (Winston logger)

3. **Hiệu suất:**
   - Cân nhắc dùng Redis cache cho roles (tránh decode JWT mỗi request)
   - Tối ưu hóa Sequelize queries (triển khai eager loading)

4. **Sẵn sàng cho Production:**
   - Bật HTTPS cho tất cả services
   - Triển khai biến môi trường cho secrets (file `.env`)
   - Export và backup cấu hình Keycloak realm (realm JSON)

---

### 7. Kết luận

#### 7.1. Các tính năng hoàn thành

✅ Keycloak setup với Docker Compose  
✅ Realm configuration (Clients, Roles, Users)  
✅ Backend JWT verification middleware  
✅ Role-based access control (RBAC)  
✅ Frontend Keycloak integration  
✅ Protected routes và API endpoints  
✅ Demo Receiving Inventory feature  
✅ Auto token refresh  
✅ Logout flow

#### 7.2. Đánh giá POC

**Thành công:** Đã chứng minh thành công rằng Keycloak có thể tích hợp vào hệ thống Inventory Management System với đầy đủ khả năng xác thực và phân quyền.

**Rủi ro đã giảm thiểu:**

- ~~JWT verification uncertainty~~ → ✅ Successfully implemented JWKS and express-jwt
- ~~CORS issues~~ → ✅ Configured CORS middleware properly
- ~~Token expiry errors~~ → ✅ Implemented automatic token refresh

**Tình trạng sẵn sàng cho Production:**

- Cần triển khai HTTPS
- Cần thiết lập giám sát (Keycloak metrics)
- Cần chiến lược sao lưu database Keycloak

#### 7.3. Recommendations

1. **Áp dụng vào dự án chính:** Kiến trúc đã được xác thực và có thể mở rộng cho toàn bộ hệ thống
2. **Đào tạo team:** Tài liệu hóa luồng OAuth 2.0 để toàn team hiểu
3. **Mở rộng hệ thống role:** Triển khai quyền chi tiết hơn (view_reports, edit_materials, v.v.)
4. **Xác thực đa yếu tố (MFA):** Bật Keycloak OTP cho role Admin

---

### 8. Tài liệu tham khảo

1. Keycloak Documentation: https://www.keycloak.org/documentation
2. OAuth 2.0 RFC: https://tools.ietf.org/html/rfc6749
3. OpenID Connect Spec: https://openid.net/specs/openid-connect-core-1_0.html
4. express-jwt GitHub: https://github.com/auth0/express-jwt
5. @react-keycloak/web: https://github.com/react-keycloak/react-keycloak

---

### Phụ lục: Kho mã nguồn

**Cấu trúc thư mục trong repository:**

```
02_Source Code/
├── 01_Source Code/
│   ├── backend/                 # Express API với Keycloak integration
│   ├── frontend/                # React SPA với Keycloak JS adapter
│   ├── docker-compose.yml       # Keycloak + PostgreSQL setup
│   ├── init-db.sql              # Database initialization
│   └── README.md                # Hướng dẫn thiết lập POC
```

**Hướng dẫn thiết lập POC:**

```bash
# 1. Khởi chạy Keycloak + PostgreSQL
docker-compose up -d

# 2. Cấu hình Keycloak (thủ công qua Admin Console)
- Tạo realm: inventory-management
- Tạo clients, roles, users (theo Phần 3.1.2)

# 3. Khởi chạy Backend
cd backend
npm install
npm run dev

# 4. Khởi chạy Frontend
cd frontend
npm install
npm run dev

# 5. Kiểm tra
- Mở http://localhost:5173
- Đăng nhập với jdoe/jdoe123
- Tạo Inventory Lot
```

---

**Ngày hoàn thành POC:** 30 tháng 1, 2026  
**Team:** SEC_Team_02  
**Trạng thái:** ✅ ĐẠT - Sẵn sàng triển khai production

## Elasticsearch
