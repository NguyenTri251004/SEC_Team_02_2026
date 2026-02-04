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

### 1. Tổng quan & Mục tiêu
Tài liệu này cung cấp toàn bộ mã nguồn và cấu hình để triển khai tính năng **Tìm kiếm ngữ nghĩa (Semantic Search)**. Hệ thống giải quyết vấn đề chênh lệch ngôn ngữ (tìm 'Cà phê' ra 'Coffee') và lọc nhiễu thông minh.

### 2. Kiến trúc hệ thống
Chúng ta sẽ xây dựng 3 thành phần chính:
1.  **Database (PostgreSQL):** Lưu dữ liệu gốc (Master Data).
2.  **Search Engine (Elasticsearch):** Lưu Vector và thực hiện tìm kiếm.
3.  **Application (Node.js):** Chuyển đổi văn bản thành Vector (Embedding) và điều phối tìm kiếm.

---

### 3. Thiết lập Môi trường (Infrastructure)

#### 3.1. Elasticsearch với ICU Plugin
Mặc định Elasticsearch không xử lý tốt tiếng Việt. Chúng ta cần build image riêng.
**File:** `elasticsearch/Dockerfile`
```dockerfile
FROM docker.elastic.co/elasticsearch/elasticsearch:8.12.0
# Cài đặt plugin ICU để xử lý token tiếng Việt chính xác
RUN bin/elasticsearch-plugin install analysis-icu
```

#### 3.2. Docker Compose
Khởi tạo PostgreSQL và Elasticsearch.
**File:** `docker-compose.yml`
```yaml
version: "3.8"

services:
  postgres:
    image: postgres:15
    container_name: postgres_poc
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: inventory_db
    ports:
      - "5432:5432"
    volumes:
      - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql

  elasticsearch:
    build: ./elasticsearch
    container_name: elasticsearch_poc
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
    ports:
      - "9200:9200"
```

---

### 4. Dữ liệu Giả lập (Database Generation)

Script này sẽ tự động chạy khi Docker khởi động để tạo bảng và dữ liệu mẫu. Lưu ý các trường hợp biên: Coffee (thực phẩm), Battery (điện tử), Solvent (hóa chất).

**File:** `init-db.sql`
```sql
-- 1. Tạo bảng Materials (Sản phẩm gốc)
CREATE TABLE materials (
    material_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    group_id VARCHAR(50)
);

-- 2. Tạo bảng Lots (Lô hàng nhập kho - chứa ngày hết hạn)
CREATE TABLE lots (
    lot_number VARCHAR(100) PRIMARY KEY,
    material_id VARCHAR(50) REFERENCES materials(material_id),
    expiration_date DATE
);

-- 3. Insert Dữ liệu mẫu (Data Seeding)
-- Case 1: Cà phê
INSERT INTO materials (material_id, name, description, group_id) VALUES 
('MAT-FOOD-01', 'Organic Coffee Beans (Robusta)', 'High quality roasted beans from Vietnam highlands.', 'FOOD');

-- Case 2: Pin năng lượng
INSERT INTO materials (material_id, name, description, group_id) VALUES 
('MAT-ELEC-01', 'Li-Ion Battery 5000mAh', 'Rechargeable battery pack for industrial use.', 'ELECTRONICS');

-- Case 3: Dung môi
INSERT INTO materials (material_id, name, description, group_id) VALUES 
('MAT-CHEM-01', 'Ethanol Solvent 99%', 'Industrial grade cleaning solvent. Highly flammable.', 'CHEMICALS');

-- 4. Tạo các Lô hàng
INSERT INTO lots (lot_number, material_id, expiration_date) VALUES 
('LOT-COFFEE-OLD', 'MAT-FOOD-01', '2024-01-01'), -- Đã hết hạn
('LOT-BATTERY-NEW', 'MAT-ELEC-01', '2027-12-31'), -- Còn hạn xa
('LOT-CHEM-2026', 'MAT-CHEM-01', '2026-06-15');   -- Hết hạn năm 2026
```

---

### 5. Mã Nguồn Core (Implementation)

#### 5.1. Worker Đồng bộ dữ liệu (`sync.js`)
File này thực hiện 'Data Purification' (Làm sạch dữ liệu) và đẩy vào Elasticsearch. Nó sử dụng thư viện `@xenova/transformers` để tạo Vector.

**File:** `src/sync.js`
```javascript
const { Client } = require('@elastic/elasticsearch');
const { Pool } = require('pg');

// 1. Kết nối Database & ES
const pgPool = new Pool({
    user: 'postgres', password: 'password', host: 'localhost', database: 'inventory_db', port: 5432
});
const esClient = new Client({ node: 'http://localhost:9200' });

async function runSync() {
    console.log("🚀 Bắt đầu đồng bộ...");
    try {
        // 2. Load AI Model (BGE-M3)
        const { pipeline } = await import('@xenova/transformers');
        const generateEmbedding = await pipeline('feature-extraction', 'Xenova/bge-m3');

        // 3. Cấu hình Index với ICU Tokenizer (Quan trọng cho tiếng Việt)
        const indexName = 'warehouse_vectors';
        if (await esClient.indices.exists({ index: indexName })) {
            await esClient.indices.delete({ index: indexName });
        }

        await esClient.indices.create({
            index: indexName,
            settings: {
                analysis: {
                    analyzer: {
                        vietnamese_analyzer: {
                            type: "custom",
                            tokenizer: "icu_tokenizer",
                            filter: ["lowercase", "icu_folding"]
                        }
                    }
                }
            },
            mappings: {
                properties: {
                    name: { type: 'text', analyzer: 'vietnamese_analyzer' },
                    // Vector 1024 chiều
                    description_vector: { type: 'dense_vector', dims: 1024, index: true, similarity: 'cosine' } 
                }
            }
        });

        // 4. Lấy dữ liệu từ PostgreSQL
        const res = await pgPool.query(`
            SELECT m.material_id, m.name, m.description, m.group_id, l.expiration_date, l.lot_number
            FROM materials m JOIN lots l ON m.material_id = l.material_id
        `);

        // 5. Tạo Vector và Index
        const dataset = [];
        for (const row of res.rows) {
            // Data Purification: Chỉ ghép các trường quan trọng, bỏ qua ngày tháng để tránh nhiễu vector
            const textToEmbed = [row.group_id, row.name, row.description]
                .filter(Boolean)
                .join('. ')
                .normalize('NFC'); // Chuẩn hóa Unicode

            const output = await generateEmbedding(textToEmbed, { pooling: 'cls', normalize: true });

            dataset.push({ index: { _index: indexName, _id: row.lot_number } });
            dataset.push({
                ...row,
                // Lưu vector vào ES
                description_vector: Array.from(output.data) 
            });
            console.log(`Processed: ${row.name}`);
        }

        if (dataset.length > 0) {
            await esClient.bulk({ refresh: true, body: dataset });
        }
        console.log("✅ Đồng bộ hoàn tất!");

    } catch (err) {
        console.error(err);
    } finally {
        await pgPool.end();
    }
}

runSync();
```

#### 5.2. API Tìm kiếm Thông minh (`server.js`)
File này xử lý logic Hybrid Search và Date Parsing (phân tích ngày tháng từ ngôn ngữ tự nhiên).

**File:** `src/server.js`
```javascript
const express = require('express');
const { Client } = require('@elastic/elasticsearch');
const app = express();
app.use(express.json());

const esClient = new Client({ node: 'http://localhost:9200' });
let embedder = null;

// Khởi tạo Model 1 lần duy nhất khi server start
(async () => {
    const { pipeline } = await import('@xenova/transformers');
    embedder = await pipeline('feature-extraction', 'Xenova/bge-m3');
    console.log("🧠 AI Model đã sẵn sàng!");
})();

app.get('/search', async (req, res) => {
    let { q } = req.query;
    if (!q) return res.send([]);

    try {
        // --- BƯỚC 1: Xử lý Lọc Ngày (NLP Rule-based) ---
        // Ví dụ input: "Expires in 2026"
        let dateFilters = [];
        const dateRegex = /(expire|expires|expired)s+(?:in|on|before|after)?s*(d{4})/i;
        const match = q.match(dateRegex);
        
        if (match) {
            const year = parseInt(match[2]);
            const start = `${year}-01-01`;
            const end = `${year + 1}-01-01`;
            
            // Tạo filter range cho Elasticsearch
            dateFilters.push({ range: { expiration_date: { gte: start, lt: end } } });
            
            // Xóa phần ngày tháng khỏi query text để không làm nhiễu vector
            q = q.replace(dateRegex, '').trim();
        }

        // --- BƯỚC 2: Tạo Embedding Vector ---
        // Nếu query rỗng (chỉ tìm ngày), bỏ qua bước embedding
        let queryVector = null;
        if (q.length > 0) {
            const cleanQuery = `Represent this sentence for searching relevant passages: ${q.normalize('NFC')}`;
            const output = await embedder(cleanQuery, { pooling: 'cls', normalize: true });
            queryVector = Array.from(output.data);
        }

        // --- BƯỚC 3: Cấu hình Hybrid Search ---
        const searchBody = {
            index: 'warehouse_vectors',
            min_score: 0.0,
            query: {
                bool: {
                    must: [],
                    should: [],
                    filter: dateFilters // Áp dụng filter ngày
                }
            }
        };

        if (queryVector) {
            // Chiến lược Hybrid: Kết hợp Vector (Meaning) và Text (Keyword)
            searchBody.query.bool.should.push(
                // Keyword Search: Tie-breaker (Boost thấp)
                { multi_match: { query: q, fields: ['name', 'group_id'], boost: 0.2 } }
            );
            
            // Semantic Search: Main driver (Boost cao)
            searchBody.knn = {
                field: 'description_vector',
                query_vector: queryVector,
                k: 10,
                num_candidates: 100,
                boost: 10.0,
                filter: dateFilters.length > 0 ? { bool: { filter: dateFilters } } : undefined
            };
        } else {
            // Nếu chỉ tìm theo ngày, dùng match_all
            searchBody.query.bool.must.push({ match_all: {} });
        }

        // --- BƯỚC 4: Thực thi và Trả kết quả ---
        const result = await esClient.search(searchBody);
        
        const hits = result.hits.hits.map(hit => ({
            id: hit._id,
            score: hit._score,
            source: {
                name: hit._source.name,
                lot: hit._source.lot_number,
                expiry: hit._source.expiration_date
            }
        }));

        res.json(hits);

    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

app.listen(3001, () => console.log('Server running on port 3001'));
```

---

### 6. Kết quả Kiểm thử (Test Cases)

#### 6.1. Test Case 1: Tìm kiếm chính xác (English)
- Input: `q=Coffee`
- Result: Score 7.59 (Hybrid Strong Match) compared to Batteries: 6.4 and Ethanol Solvent: 6.78

#### 6.2. Test Case 2: Tìm kiếm ngữ nghĩa đa ngôn ngữ (Vietnamese)
- Input: `q=Cà phê`
- Result: Score 7.35 (Hybrid Strong Match) compared to Batteries: 6.26 and Ethanol Solvent: 6.62

#### 6.3. Test Case 3: Metadata Filtering
- Input: `q=Expires in 2026`
- Logic: NLP parses "2026" -> Creates Date Range Filter.
- Result: Found "Ethanol Solvent" (Expires 2026-07). Excluded Battery (2027) and Coffee (2024).

### 7. Kết luận
POC này chứng minh khả năng tích hợp tìm kiếm Semantic Search vào hệ thống hiện tại mà không cần thay đổi cấu trúc dữ liệu chính. Mã nguồn trên đã sẵn sàng để tích hợp vào `backend` service.

**Ngày hoàn thành POC:** 4 tháng 2, 2026  
**Team:** SEC_Team_02  
**Trạng thái:** ✅ ĐẠT - Sẵn sàng triển khai production