# 05_Architecture — Vibe Coding

Tài liệu ghi lại **quá trình vibe coding** đã dẫn tới `05_Architecture.md` — từng góc nhìn (4+1 Views) được soạn và refine qua nhiều vòng prompt, mỗi ADR đều đi từ trade-off discussion với AI tới quyết định cuối.

## 0. Công cụ AI và mô hình tham chiếu đã sử dụng

| Công cụ | Vai trò |
|---------|---------|
| **Claude (Anthropic) — Claude Opus 4.x qua Claude Code CLI** | Soạn từng góc nhìn kiến trúc, viết ADR, verify consistency |
| **Mermaid Live Editor** | Render sequence, component, deployment diagram |
| **c4model.com** | Chuẩn hoá C4 (Context / Container / Component / Code) — Claude áp dụng quy ước này theo prompt |
| **4+1 Views Model** (Kruchten 1995) | Framework cho Logical / Process / Development / Physical / Scenarios |
| **draw.io (diagrams.net)** | Vẽ deployment diagram cho Fly.io + Vercel + Supabase |

---

## 1. Overview và Context

### 1.1. Vòng prompt 1 — brief kiến trúc tổng

**Prompt gốc:**
> "Thiết kế kiến trúc cho IMS với yêu cầu từ PRD:
> - ≥100 user đồng thời, ≥10.000 giao dịch/ngày, ≥1 triệu bản ghi
> - Response API < 2s, availability 99% (free tier constraint)
> - Audit trail 100% thao tác ghi
> Tech stack gợi ý: React 19 + Vite frontend, Node.js + Express backend, PostgreSQL, Redis cache, Elasticsearch, Keycloak IAM. Deploy multi-cloud (Fly.io backend, Vercel frontend, Supabase DB).
> Viết C4 Context diagram và Container diagram (Mermaid), giải thích lý do chọn stack."

**Output:** 2 diagram C4 + paragraph giải thích. **Vấn đề:** AI đề xuất thêm Kafka và gRPC — vượt scope đồ án 11 tuần.

**Prompt refine:**
> "Bỏ Kafka và gRPC khỏi kiến trúc — đồ án 11 tuần không đủ thời gian. REST + webhook là đủ. Viết lại Container diagram không có Kafka."

**Output:** gọn còn 7 container: Frontend, Backend API, AI Service, PostgreSQL, Redis, Elasticsearch, Keycloak. Khớp thực tế `docker-compose.yml`.

**Kết quả:** Section "1. Tổng quan và Context" Architecture.

---

## 2. Logical View

### 2.1. Vòng prompt — tầng module backend

**Prompt:**
> "Viết Logical View: chia backend thành layer theo Clean Architecture lite:
> - Presentation: Express routes (`*.routes.ts`)
> - Application: service layer (`*.service.ts`)
> - Domain: types + business rule (`*.types.ts` + constraint trong service)
> - Infrastructure: `shared/db/pool.ts`, `shared/cache/redis.ts`, `shared/elasticsearch/client.ts`
> Dependency rule: layer trên chỉ depend layer dưới, không ngược lại. Vẽ Mermaid component diagram."

**Output:** diagram đúng. **Vấn đề nhỏ:** AI gợi ý tạo `repository` layer riêng — team quyết định **không** để giảm boilerplate (repo sinh viên, không cần over-engineering).

**Prompt fix:**
> "Không tạo repository layer riêng. Service truy cập pool trực tiếp qua `shared/db/pool.ts`. Cập nhật diagram bỏ repository box."

**Output:** diagram gọn. Khớp với code thực tế `backend/src/modules/<domain>/<domain>.service.ts` gọi trực tiếp `pool.query`.

**Kết quả:** Section "Logical View" Architecture.

---

## 3. Development View

### 3.1. Vòng prompt — cấu trúc thư mục

**Prompt:**
> "Đọc cấu trúc thực tế `02_Source/01_Source Code/backend/src/` và `frontend/src/`. Viết Development View mô tả:
> - Cấu trúc thư mục theo module (modules/admin, modules/lots, modules/qc...)
> - Convention file naming: kebab-case cho utility, PascalCase cho React component
> - Pattern module backend: `<domain>.routes.ts / .service.ts / .types.ts / __tests__/`
> - Pattern hook frontend: `hooks/use<Domain>Data.ts(x)` dùng TanStack Query
> Đừng tự sinh — trích dẫn đúng file đang có."

**Output:** đúng 100% vì AI đọc được repo qua Claude Code CLI.

**Kết quả:** Section "Development View" Architecture — khớp chính xác repo thực tế.

---

## 4. Process View

### 4.1. Vòng prompt — sequence diagram luồng critical

**Prompt:**
> "Vẽ sequence diagram (Mermaid) cho 3 luồng critical:
> 1. **Nhập lô mới** (Operator → Backend → DB → Label Service): tạo lot Quarantine, ghi transaction RECEIPT, sinh label QR
> 2. **QC Approve Lot** (QC → Backend → DB): update status Quarantine → Accepted, ghi audit log
> 3. **Consume Material trong Batch** (Production → Backend → DB atomic): lock lot, trừ quantity, update component, ghi transaction USAGE, COMMIT
> Mỗi sequence có actor, system, DB. Bước atomic dùng `alt/opt` block."

**Output:** 3 diagram đầy đủ. Flow 3 (consume) chi tiết bước `SELECT FOR UPDATE` và rollback condition — khớp implementation thực tế trong `production.service.ts`.

**Kết quả:** Section "Process View" Architecture.

---

## 5. Physical / Deployment View

### 5.1. Vòng prompt — deployment diagram multi-cloud

**Prompt:**
> "Vẽ deployment diagram thể hiện:
> - **Vercel edge network** host frontend static (SPA `dist/`)
> - **Fly.io Singapore region** 1 machine shared-CPU 1x 1GB RAM cho backend — auto-stop khi idle
> - **Supabase** host PostgreSQL primary + connection pooler (pgBouncer)
> - **Cloud-IAM lemur-6** host Keycloak cho production
> - Communication: Frontend ↔ Backend qua HTTPS, Backend ↔ Supabase qua TLS port 6543 (pooler), Backend ↔ Keycloak qua HTTPS (fetch public key + verify token)
> Thêm annotation về SSL termination, health check endpoint, autoscale policy (min=0, max=1 free tier)."

**Output:** diagram đầy đủ + bảng mapping URL production.

**Kết quả:** Section "Physical View" Architecture — khớp `fly.toml`, Vercel config, và secrets đã set trên Fly.io.

---

## 6. Architecture Decision Records (ADR)

### 6.1. Vòng prompt — viết từng ADR

**Prompt:**
> "Viết 5 ADR cho các quyết định chính:
> - ADR-001: Chọn Express thay vì Nest.js
> - ADR-002: Chọn Fly.io thay vì AWS/GCP/Heroku
> - ADR-003: Chọn Keycloak thay vì Auth0/Firebase Auth
> - ADR-004: Chọn Modular Monolith thay vì Microservices
> - ADR-005: Chọn PostgreSQL (Supabase) thay vì MongoDB
> Mỗi ADR có 4 section: Context (bối cảnh), Decision (quyết định cụ thể), Consequences (hệ quả tích cực + tiêu cực), Status (Accepted/Superseded/Deprecated). Viết thật — không sugarcoat consequences tiêu cực."

**Output:** 5 ADR. **Vấn đề:** consequences section AI viết toàn điểm tích cực, ít tiêu cực.

**Prompt fix:**
> "ADR-002 Fly.io — ghi rõ hạn chế thật: free tier chỉ 1 machine shared-CPU, cold start 5-10s khi auto-stop, không có multi-region, không có managed backup. Các ADR khác tương tự: mỗi ADR phải có ≥2 hệ quả tiêu cực thật."

**Output:** ADR có balance. Ví dụ ADR-003 Keycloak ghi "learning curve cao, Cloud-IAM free tier giới hạn 5000 user/month".

**Kết quả:** Section "ADR" Architecture — honest, không aspirational.

---

## 7. NFR Mapping

### 7.1. Vòng prompt — trace NFR → component

**Prompt:**
> "Với mỗi NFR trong PRD (Performance, Scalability, Availability, Security, Maintainability), chỉ ra:
> - Component kiến trúc nào chịu trách nhiệm đáp ứng
> - Cơ chế kỹ thuật cụ thể (ví dụ: 'Performance API <2s' → Redis cache + PostgreSQL index + connection pool size 20)
> - Cách đo lường (endpoint metric, test case)
> Xuất ra bảng. NFR nào không có component đỡ thì flag rõ là gap."

**Output:** bảng 18 NFR × 3 column. 2 gap được flag: (1) NFR "backup dữ liệu tự động" chưa có component — Supabase có snapshot tự động nhưng chưa test restore, (2) NFR "rate limit 100 req/s" chưa implement middleware.

**Kết quả:** Section "NFR Mapping" Architecture + 2 gap được track thành task cho milestone tiếp.

---

## 8. Phương pháp review của con người

1. **Toàn nhóm review từng góc nhìn** trong buổi họp sprint planning — mỗi thành viên soi góc nhìn liên quan module mình
2. **Đối chiếu component ↔ code** — mỗi component trong diagram phải trỏ được tới file/directory thực tế trong `backend/src/modules/` hoặc `frontend/src/`. Nếu có component trên diagram mà chưa có code → tạo task tracking; nếu có code mà không có trên diagram → update diagram
3. **Thay đổi tech stack = update tài liệu** — ví dụ khi thêm OpenTelemetry observability, cả Architecture.md và Vibe Coding companion này phải cập nhật cùng lúc
4. **Cross-check deployment diagram với config thật** — `fly.toml`, `docker-compose.prod.yml`, GitHub Actions workflows phải khớp; nếu lệch thì sửa diagram theo config (config là source of truth đã chạy)
5. **ADR không sugarcoat** — bắt buộc mỗi ADR có consequences tiêu cực thật, không chỉ ghi điểm tốt
6. **Leader duyệt bản cuối** trước khi merge; thay đổi kiến trúc lớn (thêm/bỏ component) cần thảo luận Discord trước
