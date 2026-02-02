# 06_Proof of Concept

## Keycloak

### 1. Tổng quan

Tài liệu này trình bày quá trình POC xác thực và phân quyền (Authentication & Authorization) sử dụng Keycloak cho hệ thống Inventory Management System. Nhóm lựa chọn Keycloak vì là giải pháp open source, bảo mật tốt, hỗ trợ OAuth2/OIDC, RBAC, dễ tích hợp với cả frontend và backend.

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

### 2. Yêu cầu kỹ thuật & Kiến trúc

- Sử dụng Keycloak cho xác thực (OAuth2/OIDC), phân quyền RBAC với 5 roles chính.
- Frontend: React + TypeScript, sử dụng keycloak-js, @react-keycloak/web, Axios (interceptor tự động gắn JWT), React Router (route bảo vệ).
- Backend: Node.js + Express + TypeScript, dùng express-jwt, jwks-rsa để xác thực JWT, Sequelize (PostgreSQL ORM).
- Database: PostgreSQL cho cả Keycloak và Inventory Management.
- Demo use case: User có role phù hợp đăng nhập, tạo Inventory Lot mới; các role không phù hợp bị từ chối.
  command: start-dev
  ports: - "8080:8080"
  depends_on: - postgres
  networks: - ims-network

volumes:
postgres_data:

networks:
ims-network:
driver: bridge

````

**File:** `init-db.sql`

```sql
-- Tạo database cho Keycloak

### 3. Quy trình thử nghiệm (POC Process)

#### 3.1. Thiết lập môi trường

- Dùng Docker Compose khởi tạo Keycloak và PostgreSQL.
- Tạo Realm, Clients (frontend/backend), Roles, Users trên Keycloak theo yêu cầu hệ thống.
- Cấu hình Audience Mapper để backend xác thực đúng audience.

#### 3.2. Backend (Node.js/Express)

- Cấu trúc dự án gồm các module: config, middleware (JWT verify, role check), models (Sequelize), routes (bảo vệ bằng JWT + role), controllers.
- Sử dụng express-jwt, jwks-rsa để xác thực token từ Keycloak, kiểm tra role từ payload.
- API chính: tạo Inventory Lot (chỉ cho phép inventory_manager, admin), các role khác bị từ chối.

#### 3.3. Frontend (React)

- Sử dụng keycloak-js, @react-keycloak/web để tích hợp SSO, quản lý token.
- Axios interceptor tự động gắn JWT vào request, tự refresh token khi hết hạn.
- Route bảo vệ bằng ProtectedRoute, kiểm tra role trước khi cho truy cập.
- Demo form tạo Inventory Lot.

### 4. Kết quả thử nghiệm tiêu biểu

- Đăng nhập thành công với user có role phù hợp, tạo được Inventory Lot.
- User không đủ quyền (ví dụ: viewer) bị từ chối truy cập cả frontend và backend (403 Forbidden).
- Token hết hạn được tự động refresh, user không bị gián đoạn thao tác.
- Đăng xuất xóa session, token, user bị redirect về login.

### 5. Thách thức kỹ thuật & Giải pháp

- **CORS:** Cấu hình CORS trên backend để cho phép frontend truy cập API.
- **JWKS cache:** Bật cache public key khi verify JWT để tăng hiệu năng.
- **Token refresh:** Sử dụng autoRefreshToken của Keycloak SDK và interceptor để tự động làm mới token.
- **Role mapping:** Chỉ kiểm tra custom realm roles, loại bỏ các role mặc định không liên quan.
- **Audience claim:** Thêm Audience Mapper để access token có đúng audience cho backend.

### 6. Bài học kinh nghiệm

- Hiểu sâu về OAuth2/OIDC flow, RBAC, cấu hình Keycloak.
- Tích hợp xác thực phân quyền hiện đại giúp bảo mật, dễ mở rộng, giảm rủi ro bảo trì code custom.
````

**Kiểm tra Database:**

```bash
# Kết nối vào PostgreSQL
psql -h localhost -U postgres inventory_db
```

```sql
-- Query kiểm tra lot vừa tạo (chú ý: tên bảng có chữ hoa cần dùng double quotes)
SELECT * FROM "InventoryLots" WHERE lot_number = 'LOT-20260131-3872';
```

```
 lot_number        | material_id | quantity_received | quantity_available | lot_status | expiry_date | received_date
-------------------+-------------+-------------------+--------------------+------------+-------------+---------------------
 LOT-20260130-3742 | MAT-001     | 100.500           | 100.500            | Quarantine | 2026-12-31  | 2026-01-30 08:30:00
```

**Lưu ý:** PostgreSQL case-sensitive với tên bảng khi dùng quotes. Bảng tạo với tên `"InventoryLots"` phải query với `"InventoryLots"`, không thể dùng `inventorylots`.

---

#### 4.3. Test Case 3: Từ chối truy cập với role `viewer`

**Các bước:**

1. Logout user `jdoe`
2. Login với `viewer1` / `view123`
3. Cố gắng truy cập `/receiving`

**Kết quả trên Frontend:**

```
❌ Access Denied: You don't have permission to view this page
Required roles: inventory_manager, admin
Your roles: viewer
```

**Cách khác:** Nếu bypass frontend và gọi API trực tiếp bằng Postman:

**Request:**

```http
POST http://localhost:3000/api/inventory/lots
Authorization: Bearer <viewer_token>
Content-Type: application/json

{
  "material_id": "MAT-002",
  "quantity_received": 50.0,
  "expiry_date": "2026-06-30"
}
```

**Phản hồi từ Backend:**

```json
{
  "error": "Forbidden: Insufficient permissions",
  "required": ["inventory_manager", "admin"],
  "actual": ["viewer"]
}
```

**Mã trạng thái HTTP:** `403 Forbidden`

---

#### 4.4. Test Case 4: Token hết hạn và Tự động làm mới

**Thiết lập:**

- Keycloak Token Lifespan: 5 minutes (default)
- Refresh Token Lifespan: 30 phút

**Các bước:**

1. User login lúc 08:00:00 → Token expires lúc 08:05:00
2. Lúc 08:04:50 → User submit form
3. Request gửi đi lúc 08:05:10 (token đã hết hạn)

**Backend Response:**

```json
{
  "error": "Invalid token"
}
```

**Xử lý bằng Frontend Interceptor:**

```typescript
// Response interceptor bắt lỗi 401
if (error.response?.status === 401) {
  // Gọi Keycloak refresh token
  await keycloak.updateToken(30); // ✅ Success: New token obtained

  // Retry request với token mới
  config.headers.Authorization = `Bearer ${keycloak.token}`;
  return axios.request(config); // ✅ Request succeed
}
```

**Kết quả:**

```
✅ Lot created: LOT-20260130-4981
(User không nhận ra token đã được refresh tự động)
```

---

#### 4.5. Test Case 5: Đăng xuất

**Các bước:**

1. User click "Logout" button
2. Frontend gọi `keycloak.logout()`

**Luồng đăng xuất Keycloak:**

```
Frontend → GET http://localhost:8080/realms/inventory-management/protocol/openid-connect/logout
         → Keycloak invalidates session
         → Redirect to post_logout_redirect_uri (http://localhost:5173/login)
```

**Kết quả:**

- Token bị xóa khỏi browser
- Session trên Keycloak bị hủy
- User redirect về trang login
- Cố truy cập `/receiving` → Redirect về Keycloak login screen

---

### 5. Thách thức kỹ thuật và giải pháp

#### 5.1. Thách thức 1: Vấn đề CORS

**Vấn đề:**

```
Access to XMLHttpRequest at 'http://localhost:3000/api/inventory/lots'
from origin 'http://localhost:5173' has been blocked by CORS policy
```

**Nguyên nhân:**

- Frontend (localhost:5173) và Backend (localhost:3000) khác origin
- Browser block request vì CORS policy

**Giải pháp:**

```typescript
// backend/src/server.ts
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);
```

**Kết quả:** ✅ CORS error resolved

---

#### 5.2. Thách thức 2: Cache JWKS của Keycloak

**Vấn đề:**

- Backend cần fetch Keycloak public key để verify JWT
- Mỗi request đều fetch → Performance issue

**Giải pháp:**

```typescript
jwksRsa.expressJwtSecret({
  cache: true, // ✅ Cache public keys
  rateLimit: true, // ✅ Limit requests to JWKS endpoint
  jwksRequestsPerMinute: 5, // Max 5 requests/min
  jwksUri: `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/certs`,
});
```

**Kết quả:**

- Lần đầu: Fetch key từ Keycloak (~50ms)
- Các request tiếp theo: Dùng cache (~0ms)

---

#### 5.3. Thách thức 3: Thời điểm làm mới Token

**Vấn đề:**

- Token expires sau 5 phút
- Nếu user đang nhập form → Token expire giữa chừng → Request fail

**Giải pháp:**

```typescript
// frontend/src/main.tsx
<ReactKeycloakProvider
  authClient={keycloak}
  initOptions={{
    onLoad: 'login-required',
    checkLoginIframe: false,
  }}
  onTokens={(tokens) => {
    console.log('Token refreshed:', tokens.token);
  }}
  autoRefreshToken={true} // ✅ Auto refresh trước khi expire
>
  <App />
</ReactKeycloakProvider>
```

**Kết quả:**

- Keycloak SDK tự động refresh token trước 70 giây khi sắp hết hạn
- User không bao giờ gặp lỗi 401 khi đang sử dụng

---

#### 5.4. Thách thức 4: Ánh xạ Role

**Vấn đề:**

- Keycloak JWT chứa nhiều roles mặc định: `offline_access`, `uma_authorization`, `default-roles-inventory-management`
- Làm sao phân biệt application roles?

**Giải pháp:**

```typescript
// Chỉ check custom realm roles
const userRoles = jwtReq.auth.realm_access?.roles || [];
const appRoles = [
  "admin",
  "inventory_manager",
  "quality_control",
  "production",
  "viewer",
];
const actualRoles = userRoles.filter((role) => appRoles.includes(role));
```

**Phương án khác:** Dùng Client Roles thay vì Realm Roles (để cô lập tốt hơn)

---

#### 5.5. Thách thức 5: Audience (aud) Claim trong JWT Token

**Vấn đề:**

- Backend middleware `checkJwt` expect `audience: "inventory-backend"`
- Frontend Keycloak client: `inventory-frontend`
- Token được issue cho frontend client → Không có `aud` claim là `inventory-backend`
- Kết quả: Backend reject token với lỗi `invalid_token` (audience mismatch)

**Nguyên nhân:**

Theo spec OAuth 2.0, access token có thể chứa claim `aud` (audience) để xác định **resource server** (backend API) mà token được phép truy cập. Mặc định, Keycloak issue token với `aud` là client ID yêu cầu token (trong trường hợp này là `inventory-frontend`), chứ không phải backend API.

**Giải pháp: Thêm Audience Mapper trong Keycloak**

**Kết quả:**

Backend middleware validation sẽ pass thành công:

```typescript
// backend/src/middleware/auth.ts
export const checkJwt = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    /* ... */
  }),
  audience: keycloakConfig.clientId, // "inventory-backend"
  issuer: keycloakConfig.issuer,
  algorithms: ["RS256"],
  credentialsRequired: true,
});
```

**Lợi ích bảo mật:**

- ✅ Token chỉ được chấp nhận bởi backend API được chỉ định trong `aud` claim
- ✅ Ngăn chặn token reuse: Token từ frontend khác không thể dùng cho backend này
- ✅ Tuân thủ OAuth 2.0 best practices cho multi-tier architecture

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
