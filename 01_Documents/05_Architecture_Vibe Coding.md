# 05_Architecture — Vibe Coding

Tài liệu ghi lại công cụ AI và các prompt chính mà nhóm đã dùng để tạo và cập nhật `05_Architecture.md`.

## 1. Công cụ AI đã sử dụng

| Công cụ | Mục đích |
|---------|----------|
| **Claude (Anthropic) — Opus 4.x qua Claude Code CLI** | Soạn thảo từng góc nhìn kiến trúc (Logical, Development, Process, Physical, Scenarios) |
| **Mermaid Live Editor** | Render sequence diagram, component diagram, deployment diagram |
| **C4 Model references** (c4model.com) | Chuẩn hóa cách vẽ Context / Container / Component |
| **draw.io (diagrams.net)** | Vẽ deployment diagram cho môi trường Fly.io + Vercel + Supabase |

## 2. Các prompt chính đã dùng

### 2.1. Prompt tổng quan
> "Thiết kế kiến trúc cho hệ thống IMS với yêu cầu: ≥100 user đồng thời, ≥10.000 giao dịch/ngày, response < 2s. Tech stack gợi ý: React (frontend), Express/Node (backend REST), PostgreSQL, Redis cache, Elasticsearch full-text, Keycloak IAM, Docker container, deploy multi-cloud (Fly.io + Vercel + Supabase). Viết theo 5 góc nhìn của 4+1 Views Model."

### 2.2. Prompt cho từng góc nhìn
> "Viết phần **Development View** — mô tả cấu trúc thư mục, module, dependency giữa các layer (controller/service/repository). Dùng sơ đồ Mermaid để thể hiện dependencies. Giải thích pattern Modular Monolith được áp dụng cho backend."

> "Viết phần **Process View** — mô tả các process chạy đồng thời (Express worker, Redis subscribe, OpenTelemetry collector), các critical path (receipt → quarantine → QC → accept) bằng sequence diagram."

> "Viết phần **Physical/Deployment View** — sơ đồ triển khai trên Fly.io (Singapore region), Vercel CDN edge, Supabase PostgreSQL. Bao gồm health check, auto-scale, SSL termination."

### 2.3. Prompt về lựa chọn công nghệ (ADR)
> "Viết Architecture Decision Records (ADR) cho các quyết định sau: (1) Chọn Express thay vì Nest.js, (2) Chọn Fly.io thay vì AWS/GCP, (3) Chọn Keycloak thay vì Auth0. Mỗi ADR có: Context, Decision, Consequences."

### 2.4. Prompt về NFR mapping
> "Với mỗi NFR trong PRD (performance, security, availability), hãy chỉ ra thành phần nào trong kiến trúc chịu trách nhiệm đáp ứng, và cơ chế kỹ thuật cụ thể (ví dụ: Redis cache cho performance, rate limit middleware cho security)."

## 3. Phương pháp review của con người

1. Toàn nhóm review từng góc nhìn trong buổi họp sprint planning
2. Đối chiếu từng component trong sơ đồ với code thực tế trong `backend/src/modules/` — thành phần nào có trên diagram mà chưa có code thì tạo issue
3. Review bởi Leader trước khi merge
4. Mỗi lần thay đổi tech stack (ví dụ: thêm OpenTelemetry) phải cập nhật Architecture.md và Vibe Coding companion
5. Cross-check deployment diagram với `fly.toml`, `docker-compose.prod.yml`, và GitHub Actions workflows
