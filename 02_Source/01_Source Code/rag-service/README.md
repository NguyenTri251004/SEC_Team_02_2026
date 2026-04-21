# IMS RAG Service

FastAPI microservice for IMS operational RAG chatbot.

## Endpoints

- `GET /health`
- `GET /metrics`
- `POST /v1/retrieve`
- `POST /v1/answer`
- `POST /v1/ingest/documents`
- `POST /v1/ingest/reindex`
- `POST /v1/ingest/inventory/reindex`
- `POST /v1/ingest/inventory/sync`
- `POST /rag/reindex`
- `GET /v1/ingest/status/{job_id}`

## Security

All `/v1/*` endpoints require signed service-to-service requests:

- Header `x-rag-timestamp` (unix epoch seconds)
- Header `x-rag-signature` (hex HMAC-SHA256 over `timestamp.body`)

Use shared secret `RAG_SERVICE_SHARED_SECRET` in both backend and rag-service.

## Inventory ingestion pipeline

- Pulls inventory records from PostgreSQL (`materials`, `inventory_lots`) and optional Mongo collections.
- Builds semantic documents for:
	- global inventory summary
	- per-lot operational record
	- per-material inventory summary
- Generates embeddings and upserts vectors to namespace `ims_inventory`.
- Supports full/manual reindex and incremental sync.
- Scheduled sync is enabled by default (`RAG_ENABLE_SCHEDULED_SYNC=true`).

## Language support

`/v1/answer` supports Vietnamese (`vi-VN`) and will return localized prompts/fallbacks.

## Local run

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
