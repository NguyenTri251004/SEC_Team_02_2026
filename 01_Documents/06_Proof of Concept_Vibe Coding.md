# 06_Proof of Concept — Vibe Coding

Tài liệu này **không liệt kê prompt** theo kiểu danh mục. Thay vào đó, ghi lại **quá trình vibe coding thực tế** — các vòng đối thoại với AI đã dẫn đến hai PoC trong `06_Proof of Concept.md`: **Keycloak Integration** và **Elasticsearch Full-text Search**.

Mỗi mục bên dưới mô tả: prompt ban đầu → output AI → vấn đề gặp phải → prompt refine → code thực tế đã commit vào repo.

## 0. Công cụ AI dùng trong giai đoạn PoC

| Công cụ | Vai trò |
|---------|---------|
| **Claude (Anthropic) — Claude Opus 4.x qua Claude Code CLI** | Chạy trong terminal, đọc trực tiếp code repo, sinh + refactor code |
| **ChatGPT (GPT-4)** | Hỏi nhanh khi offline IDE, check thuật ngữ OAuth/OIDC |
| **Stack Overflow + GitHub Issues** | Tham khảo cho các lỗi thư viện cụ thể (keycloak-js token refresh, ES client v8 migration) |
| **Keycloak docs + Elastic docs** | Source of truth — AI có thể đoán sai version, nên đối chiếu docs chính thức |

---

## 1. PoC Keycloak (OAuth2/OIDC + RBAC)

### 1.1. Vòng prompt 1 — dựng hạ tầng Docker

**Mục tiêu:** chạy Keycloak + PostgreSQL local để thử nghiệm login flow.

**Prompt gốc (Claude):**
> "Tôi cần dựng Keycloak 24 self-hosted với PostgreSQL làm DB. Viết `docker-compose.yml` có 2 service `postgres` và `keycloak`, cùng network `ims-network`, expose port 8080 cho Keycloak. Thêm `init-db.sql` tạo 2 database: `keycloak_db` và `inventory_db`. Dùng `command: start-dev` cho Keycloak để dev mode."

**Output AI lần 1:** file `docker-compose.yml` đúng nhưng thiếu 2 thứ — (1) không có `depends_on` cho Keycloak chờ Postgres, (2) không set `KC_HOSTNAME_STRICT=false` nên Keycloak từ chối redirect về `http://localhost:5173`.

**Prompt refine 1:**
> "Keycloak startup fail với lỗi `Connection refused` tới postgres, và khi frontend redirect sang `http://localhost:5173/*` thì Keycloak báo `Invalid parameter: redirect_uri`. Fix giúp."

**Output sau refine:** thêm `depends_on: postgres`, env vars `KC_HOSTNAME_STRICT=false` + `KC_HTTP_ENABLED=true`. Chạy được.

**Code cuối cùng:** `02_Source/01_Source Code/docker-compose.yml` (service `keycloak` dòng tương ứng).

### 1.2. Vòng prompt 2 — realm, clients, roles, users

**Vấn đề:** Cấu hình Keycloak qua Admin UI thủ công thì không reproducible — mỗi lần `docker compose down -v` là mất sạch.

**Prompt:**
> "Viết file `inventory-realm.json` để Keycloak import khi startup (dùng flag `--import-realm`). Realm name `inventory-management`, có 2 client: `inventory-frontend` (public, standard flow + direct access grants, valid redirect `http://localhost:5173/*` và prod `https://ims-frontend-sec02.vercel.app/*`), `inventory-backend` (confidential, không flow). 5 realm role: `admin`, `inventory_manager`, `quality_control`, `production`, `viewer`. 5 user với password plaintext (dev): admin/admin123, inv_manager/manager123, qc_user/qc123, prod_user/prod123, viewer/viewer123."

**Output:** `inventory-realm.json` ~600 dòng. Import thành công, nhưng **token chưa có audience** nên backend verify fail với `invalid audience`.

**Prompt fix:**
> "Access token từ `inventory-frontend` đang có `aud: \"account\"`, nhưng backend cần `aud: \"inventory-backend\"`. Thêm Audience Mapper vào `inventory-frontend-dedicated` client scope trong realm JSON."

**Output:** thêm `protocolMappers` với `oidc-audience-mapper` type, gắn vào dedicated scope. Token decode ra có `aud: ["account", "inventory-backend"]` — backend verify OK.

**Code cuối cùng:** `02_Source/01_Source Code/keycloak/inventory-realm.json` (5 user dòng 150-300, audience mapper dòng ~450).

### 1.3. Vòng prompt 3 — Backend JWT verify middleware

**Mục tiêu:** Middleware Express verify JWT từ Keycloak, extract role vào `req.user`.

**Prompt gốc:**
> "Viết middleware `authenticateJWT` cho Express. Verify JWT bằng Keycloak realm public key fetch từ `GET /realms/{realm}` (field `public_key`). Cache public key 60 giây. Nếu verify OK, set `req.user = { user_id, username, email, roles, realm_access }`. Fail 401 khi thiếu header, 403 khi token expired/invalid."

**Output:** `auth.ts` gần hoàn chỉnh, nhưng AI dùng `jsonwebtoken.verify` blocking mode không handle async public key fetch đúng — nếu Keycloak down thì middleware crash thay vì trả 401.

**Prompt fix:**
> "`getVerificationKey()` đang throw khi Keycloak không reachable, khiến Express error handler trả 500. Yêu cầu: fail closed nhưng với status 401 kèm message rõ ràng, log warning, không crash process."

**Output:** wrap try/catch, return `401 { error: 'Keycloak unreachable' }`, log qua `logger.warn`.

**Prompt thêm cho dev mode:**
> "Trong dev local, team không muốn chạy Keycloak mỗi lần test. Thêm check `if (process.env.BYPASS_AUTH === 'true')` ngay đầu middleware — set `req.user` mock với đủ 5 role, skip verify. Khi deploy production thì set `BYPASS_AUTH=false`."

**Code cuối cùng:** `backend/src/security/auth.ts` — lines 91-109 là bypass block, lines 56-86 là key fetch, cached qua `cachedPublicKey`.

### 1.4. Vòng prompt 4 — RBAC permission matrix

**Prompt:**
> "Viết module `rbac.ts` với: (1) enum `UserRole` liệt kê 5 role, (2) const `PERMISSIONS` kiểu `{ resource: { action: UserRole[] } }` — ví dụ `lots.create = [ADMIN, INVENTORY_MANAGER]`. (3) Middleware factory `requirePermission(resource, action)` check `req.user.roles` có intersect với allowed roles không. Fail 403 nếu không đủ quyền."

**Output:** `rbac.ts` đúng ngay lần đầu. Điều duy nhất team chỉnh thủ công sau đó là **thêm action `updateStatus` riêng cho lots** — chỉ QC được approve/reject, tách khỏi `update` chung.

**Code cuối cùng:** `backend/src/security/rbac.ts` — `PERMISSIONS.lots.updateStatus = [ADMIN, INVENTORY_MANAGER, QUALITY_CONTROL]` (line ~38).

### 1.5. Vòng prompt 5 — Frontend Keycloak adapter

**Prompt:**
> "Tích hợp `keycloak-js` vào React 19. Tạo `keycloak.ts` export singleton instance. Tạo `AuthProvider` dùng Context API: trên mount gọi `keycloak.init({ onLoad: 'check-sso', silentCheckSsoRedirectUri: ... })`, lưu token vào state. Khi token sắp expire (còn 30s) gọi `keycloak.updateToken(30)`. Expose `{ authenticated, user, logout, roles }` qua context."

**Output lần 1:** chạy được nhưng **mỗi lần refresh page trigger full redirect về Keycloak login** — không dùng silent check-sso vì thiếu file `silent-check-sso.html`.

**Prompt fix:**
> "Tạo file `silent-check-sso.html` trong `public/` đúng template Keycloak yêu cầu (postMessage ra parent). Update `keycloak.init` reference tới file này qua `silentCheckSsoRedirectUri`."

**Output:** file HTML ~10 dòng chuẩn template, ref trong init option. Refresh page không còn redirect loop.

**Code cuối cùng:**
- `frontend/src/auth/keycloak.ts` (singleton)
- `frontend/src/auth/AuthProvider.tsx` (context + token refresh)
- `frontend/public/silent-check-sso.html`

### 1.6. Vòng prompt 6 — Axios interceptor auto-refresh

**Prompt:**
> "Axios interceptor: (1) request — attach `Authorization: Bearer ${keycloak.token}`; (2) response — nếu 401 và chưa retry, gọi `keycloak.updateToken(5)` rồi retry request 1 lần với token mới. Nếu refresh fail → `keycloak.login()`."

**Output:** chạy OK, nhưng gặp **race condition** khi nhiều request song song cùng expire — mỗi request tự gọi `updateToken` → 5 refresh token request đồng thời đến Keycloak.

**Prompt fix (sau này):**
> "Race condition khi 5 request song song hết hạn: chia sẻ 1 promise refresh duy nhất qua `let refreshPromise: Promise<boolean> | null = null`. Nếu `refreshPromise` != null thì các request khác await cùng promise này."

**Output:** `refreshPromise` singleton. Từ 5 refresh call → 1 call.

**Code cuối cùng:** `frontend/src/services/api.ts` — request interceptor lines 59-78, response interceptor (tiếp theo).

### 1.7. Tổng kết PoC Keycloak

Kết quả (tại thời điểm 2026-04-20):
- 5/5 account login OK trên production `https://lemur-6.cloud-iam.com/auth`
- Backend verify token với Keycloak public key cache → latency JWT verify ~3ms
- Frontend auto-refresh token, zero user-facing logout trong session 2h

**Bài học vibe coding:** AI sinh code đúng **cấu trúc** từ prompt đầu, nhưng **edge case** (audience mapper, race condition, silent check-sso, dev bypass) đều phát sinh từ prompt refine. Không có vòng prompt nào "1 lần xong".

---

## 2. PoC Elasticsearch Full-text Search

### 2.1. Vòng prompt 1 — dựng Elasticsearch local

**Prompt:**
> "Thêm service `elasticsearch` vào docker-compose, image `elasticsearch:8.11.0`, single-node mode (`discovery.type=single-node`), tắt security (`xpack.security.enabled=false`) cho dev. Expose 9200. Healthcheck `curl -s http://localhost:9200/_cluster/health`."

**Output:** đúng ngay lần đầu. ES up trong ~30s.

**Code cuối cùng:** service `elasticsearch` trong `02_Source/01_Source Code/docker-compose.yml`.

### 2.2. Vòng prompt 2 — ES client + index materials

**Prompt:**
> "Dùng `@elastic/elasticsearch` v8 client. Tạo `shared/elasticsearch/client.ts` export singleton. Trong `modules/search/search.service.ts`:
> - `createIndexIfNotExists()` — tạo index `materials` với mapping: material_id (keyword), part_number/material_name/storage_conditions/specification_document (text + standard analyzer), material_type (keyword), created_date/modified_date (date).
> - `indexMaterial(material)` — upsert.
> - `searchMaterials(query, filters, pagination)` — multi_match trên 3 field text, filter material_type, paginate."

**Output:** chạy nhưng lỗi `TypeError: esClient.indices.exists is not a function` — AI nhớ API client v7 thay vì v8.

**Prompt fix:**
> "Dùng `@elastic/elasticsearch@8.x`. API v8 đổi: `client.indices.exists` giờ return `boolean` trực tiếp thay vì `{ body: boolean }`. `client.index` không cần `{ body: doc }` nữa — doc ở top level. Update code cho đúng v8."

**Output:** fix đúng. `await esClient.indices.exists({ index })` return boolean; `esClient.index({ index, id, document })` không wrap `body`.

**Code cuối cùng:** `backend/src/modules/search/search.service.ts` — `createIndexIfNotExists` lines 13-52, `indexMaterial` lines 55-75.

### 2.3. Vòng prompt 3 — query với multi_match + highlight

**Prompt:**
> "Viết `searchMaterials(query, filters, pagination)`: dùng `multi_match` query với fields `part_number^3, material_name^2, storage_conditions, specification_document` (boost part_number x3). Thêm `highlight` cho 3 field text. Filter `material_type` dùng bool.must term. Trả về `SearchResponse<SearchResult>` với total, hits, took_ms."

**Output:** đúng ~90%, thiếu mỗi điều **query rỗng** (`q=""`) — ES trả về `match_none` thay vì `match_all`. User muốn query rỗng = liệt kê tất cả có filter.

**Prompt fix:**
> "Nếu `query` rỗng hoặc chỉ whitespace, dùng `match_all` thay vì `multi_match` (vẫn áp filter). Thêm unit test case này."

**Output:** thêm `if (!query?.trim()) body.query = { match_all: {} }` branch. Test pass.

### 2.4. Vòng prompt 4 — fallback khi ES down

**Vấn đề:** trong production free tier, Elasticsearch không luôn có (Fly.io không deploy kèm). Backend phải **không crash** khi ES unavailable.

**Prompt:**
> "Wrap mọi call ES trong `shared/elasticsearch/client.ts`: nếu env `ELASTICSEARCH_URL` không set hoặc connect fail, log warning và return `null` client. Trong `search.service.ts` check nếu `esClient == null` thì fallback sang PostgreSQL query `ILIKE '%query%'` trên `materials.material_name` và `materials.part_number`."

**Output:** client null-safe, service có fallback branch. Unit test cover cả 2 case.

**Code cuối cùng:** `backend/src/shared/elasticsearch/client.ts` + fallback branch trong `search.service.ts`.

### 2.5. Tổng kết PoC Elasticsearch

- Index 500 material mẫu, query `<part_number>` trả kết quả < 50ms
- Fuzzy match hoạt động (gõ sai 1 ký tự vẫn ra)
- Production không deploy ES → fallback PostgreSQL ILIKE, chậm hơn nhưng vẫn chạy
- Test coverage module `search`: **100%**

**Bài học vibe coding:** AI **nhớ sai version API** là lỗi phổ biến (ES v7 vs v8, Keycloak JS adapter 18 vs 24). Luôn phải verify với docs chính thức hoặc `npm ls <package>` trước khi trust output.

---

## 3. Phương pháp review của con người (áp dụng cho cả 2 PoC)

1. **Không merge blind AI code** — mỗi PoC có branch riêng (`poc/keycloak`, `poc/elasticsearch`), code AI sinh phải chạy test pass trước khi Leader review và merge vào master
2. **Reproducible:** mỗi PoC phải chạy được từ zero qua `docker compose up` — nếu cần config thủ công qua Admin UI thì fail (PoC Keycloak ban đầu fail tiêu chí này, phải viết `inventory-realm.json` để import tự động)
3. **Benchmark có số:** đo thời gian xử lý cho mỗi PoC (JWT verify ~3ms, ES query ~50ms, fallback PG ILIKE ~200ms)
4. **Edge case có test:** mọi prompt refine (audience mapper, token race, query rỗng, ES down) đều có unit test tương ứng trong `__tests__/`
5. **Git commit message kể story:** dùng Conventional Commits có scope (`feat(auth):`, `fix(search):`) để truy vết được commit nào giải quyết vấn đề gì
