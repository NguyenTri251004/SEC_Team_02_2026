from __future__ import annotations

import hashlib
import hmac
import json
import logging
import math
import os
import re
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx
import psycopg
from psycopg.rows import dict_row
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from prometheus_client import CONTENT_TYPE_LATEST, Counter, Gauge, Histogram, generate_latest

try:
    from pymongo import MongoClient
except Exception:  # pragma: no cover - optional dependency
    MongoClient = None


ALLOWED_EMPLOYEE_ROLES = {
    "admin",
    "inventory_manager",
    "quality_control",
    "production",
    "viewer",
}

RAG_SERVICE_SHARED_SECRET = os.getenv("RAG_SERVICE_SHARED_SECRET", "")
RAG_BYPASS_S2S = os.getenv("RAG_BYPASS_S2S", "false").lower() == "true"
RAG_S2S_MAX_SKEW_SECONDS = int(os.getenv("RAG_S2S_MAX_SKEW_SECONDS", "300"))
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "6"))
RAG_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "900"))
RAG_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "150"))
RAG_EMBEDDING_DIM = int(os.getenv("RAG_EMBEDDING_DIM", "256"))
RAG_STORAGE_PATH = Path(os.getenv("RAG_STORAGE_PATH", "./data/vector_store.json"))
KB_DOCS_DIR = Path(os.getenv("KB_DOCS_DIR", "../01_Documents"))
MAX_DOCUMENTS_PER_INGEST = int(os.getenv("RAG_MAX_DOCUMENTS_PER_INGEST", "50"))
MAX_CHARS_PER_DOCUMENT = int(os.getenv("RAG_MAX_CHARS_PER_DOCUMENT", "100000"))
MAX_TOTAL_CHARS_PER_INGEST = int(os.getenv("RAG_MAX_TOTAL_CHARS_PER_INGEST", "2000000"))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
OPENAI_EMBEDDING_MODEL = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
RAG_FORCE_LLM_FOR_KPI = os.getenv("RAG_FORCE_LLM_FOR_KPI", "true").lower() == "true"
OPENAI_EMBEDDING_USE_DIMENSIONS = os.getenv("OPENAI_EMBEDDING_USE_DIMENSIONS", "auto").lower()

INDEX_NAMESPACE_IMS_INVENTORY = os.getenv("RAG_INDEX_NAMESPACE", "ims_inventory")
INDEX_VERSION = os.getenv("RAG_INDEX_VERSION", "v1")
RAG_SEED_ON_STARTUP = os.getenv("RAG_SEED_ON_STARTUP", "true").lower() == "true"
RAG_ENABLE_SCHEDULED_SYNC = os.getenv("RAG_ENABLE_SCHEDULED_SYNC", "true").lower() == "true"
RAG_SYNC_INTERVAL_SECONDS = int(os.getenv("RAG_SYNC_INTERVAL_SECONDS", "900"))
RAG_INCREMENTAL_LOOKBACK_SECONDS = int(os.getenv("RAG_INCREMENTAL_LOOKBACK_SECONDS", "1800"))
DATABASE_URL = os.getenv("DATABASE_URL", "")
RAG_MONGO_URI = os.getenv("RAG_MONGO_URI", "")
RAG_MONGO_DB = os.getenv("RAG_MONGO_DB", "ims")

logger = logging.getLogger("ims.rag")
if not logger.handlers:
    logging.basicConfig(
        level=getattr(logging, os.getenv("LOG_LEVEL", "INFO").upper(), logging.INFO),
        format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    )


ragRequestsTotal = Counter(
    "rag_requests_total",
    "Total RAG service HTTP requests",
    ["endpoint", "method", "status_code"],
)

ragRequestDurationSeconds = Histogram(
    "rag_request_duration_seconds",
    "RAG service request duration in seconds",
    ["endpoint", "method"],
    buckets=(0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10),
)

ragIngestedChunksTotal = Counter(
    "rag_ingested_chunks_total",
    "Number of chunks ingested into vector store",
    ["source_type"],
)

ragRetrievalHitsTotal = Counter(
    "rag_retrieval_hits_total",
    "Number of retrieved chunks returned",
)

ragOpenAiCallsTotal = Counter(
    "rag_openai_calls_total",
    "Total OpenAI API calls by operation",
    ["operation", "status"],
)

ragIndexJobsTotal = Counter(
    "rag_index_jobs_total",
    "Total indexing jobs by source and status",
    ["source", "mode", "status"],
)

ragIndexDurationSeconds = Histogram(
    "rag_index_duration_seconds",
    "Inventory indexing duration in seconds",
    ["source", "mode"],
    buckets=(0.1, 0.5, 1, 2, 5, 10, 20, 30, 60, 120),
)

ragLastIndexSuccessTimestamp = Gauge(
    "rag_last_index_success_timestamp",
    "Unix timestamp of last successful inventory index",
)

ragIndexedLotsTotal = Gauge(
    "rag_indexed_lots_total",
    "Number of lot records included in latest inventory index",
)

ragIndexedMaterialsTotal = Gauge(
    "rag_indexed_materials_total",
    "Number of material records included in latest inventory index",
)

openai_last_error: Dict[str, Any] = {}
openai_last_success_at: Optional[str] = None


def record_openai_error(operation: str, status_code: Optional[int], payload: Optional[Dict[str, Any]]) -> None:
    global openai_last_error
    error_payload = payload or {}
    error_detail = error_payload.get("error") if isinstance(error_payload, dict) else None
    openai_last_error = {
        "timestamp": utc_now_iso(),
        "operation": operation,
        "status_code": status_code,
        "type": (error_detail or {}).get("type"),
        "code": (error_detail or {}).get("code"),
        "message": (error_detail or {}).get("message") or "Unknown OpenAI error",
    }
    logger.error(
        "openai_call.failed operation=%s status=%s type=%s code=%s message=%s",
        operation,
        status_code,
        openai_last_error.get("type"),
        openai_last_error.get("code"),
        openai_last_error.get("message"),
    )


def record_openai_success() -> None:
    global openai_last_success_at
    openai_last_success_at = utc_now_iso()


def utc_now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def tokenize(text: str) -> List[str]:
    return re.findall(r"[a-zA-Z0-9_\-]+", text.lower())


def lexical_overlap_score(query: str, text: str) -> float:
    query_tokens = set(tokenize(query))
    text_tokens = set(tokenize(text))
    if not query_tokens or not text_tokens:
        return 0.0
    intersection = len(query_tokens.intersection(text_tokens))
    union = len(query_tokens.union(text_tokens))
    return intersection / max(1, union)


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = 0.0
    mag1 = 0.0
    mag2 = 0.0
    for a, b in zip(v1, v2):
        dot += a * b
        mag1 += a * a
        mag2 += b * b
    if mag1 == 0.0 or mag2 == 0.0:
        return 0.0
    return dot / (math.sqrt(mag1) * math.sqrt(mag2))


def deterministic_embedding(text: str, dim: int = RAG_EMBEDDING_DIM) -> List[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    values: List[float] = []
    idx = 0
    while len(values) < dim:
        byte = digest[idx % len(digest)]
        values.append((byte / 255.0) * 2.0 - 1.0)
        idx += 1
        if idx % len(digest) == 0:
            digest = hashlib.sha256(digest + text.encode("utf-8")).digest()
    return values


def normalize_embedding_dim(embedding: List[float], dim: int = RAG_EMBEDDING_DIM) -> List[float]:
    if len(embedding) == dim:
        return embedding
    if len(embedding) > dim:
        return embedding[:dim]
    return embedding + ([0.0] * (dim - len(embedding)))


@dataclass
class VectorChunk:
    chunk_id: str
    namespace: str
    content: str
    embedding: List[float]
    source_uri: str
    section_path: str
    source_type: str
    language: str
    role_visibility: List[str]
    checksum_sha256: str
    version: str
    created_at: str
    updated_at: str


class InMemoryVectorStore:
    def __init__(self, storage_path: Path):
        self.storage_path = storage_path
        self._chunks: Dict[str, VectorChunk] = {}

    def load(self) -> None:
        if not self.storage_path.exists():
            return
        raw = json.loads(self.storage_path.read_text(encoding="utf-8"))
        self._chunks = {}
        for item in raw.get("chunks", []):
            if "namespace" not in item:
                item["namespace"] = "kb"
            chunk = VectorChunk(**item)
            self._chunks[chunk.chunk_id] = chunk

    def persist(self) -> None:
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "chunks": [asdict(chunk) for chunk in self._chunks.values()],
            "updated_at": utc_now_iso(),
        }
        self.storage_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    def upsert(self, chunks: List[VectorChunk]) -> None:
        for chunk in chunks:
            self._chunks[chunk.chunk_id] = chunk
        self.persist()

    def count(self) -> int:
        return len(self._chunks)

    def search(
        self,
        query: str,
        query_embedding: List[float],
        top_k: int,
        role_context: List[str],
        namespaces: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        effective_roles = set(role_context or [])
        namespace_filter = set(namespaces or [])
        results: List[Dict[str, Any]] = []
        for chunk in self._chunks.values():
            if namespace_filter and chunk.namespace not in namespace_filter:
                continue
            if effective_roles and not effective_roles.intersection(set(chunk.role_visibility)):
                continue
            if len(chunk.embedding) != len(query_embedding):
                continue
            dense_score = cosine_similarity(query_embedding, chunk.embedding)
            sparse_score = lexical_overlap_score(query, chunk.content)
            score = (0.75 * dense_score) + (0.25 * sparse_score)
            results.append(
                {
                    "chunk": chunk,
                    "score": float(score),
                    "dense_score": float(dense_score),
                    "sparse_score": float(sparse_score),
                }
            )

        results.sort(key=lambda item: item["score"], reverse=True)
        top = results[: max(1, top_k)]
        ragRetrievalHitsTotal.inc(len(top))
        return top


class OpenAIClient:
    def __init__(self) -> None:
        self.enabled = bool(OPENAI_API_KEY)

    def _should_send_dimensions(self) -> bool:
        # OpenAI supports dimensions for text-embedding-3 models; some compatible APIs do not.
        if OPENAI_EMBEDDING_USE_DIMENSIONS in {"true", "1", "yes"}:
            return True
        if OPENAI_EMBEDDING_USE_DIMENSIONS in {"false", "0", "no"}:
            return False
        return "api.openai.com" in OPENAI_BASE_URL

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not self.enabled:
            return [deterministic_embedding(text) for text in texts]

        url = f"{OPENAI_BASE_URL}/embeddings"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload: Dict[str, Any] = {
            "model": OPENAI_EMBEDDING_MODEL,
            "input": texts,
        }
        if self._should_send_dimensions():
            payload["dimensions"] = RAG_EMBEDDING_DIM

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
            except Exception as exc:
                ragOpenAiCallsTotal.labels(operation="embeddings", status="error").inc()
                logger.exception("openai_call.exception operation=embeddings")
                record_openai_error(
                    operation="embeddings",
                    status_code=None,
                    payload={"error": {"message": str(exc), "type": "request_exception", "code": None}},
                )
                return [deterministic_embedding(text) for text in texts]

        if response.status_code >= 400:
            ragOpenAiCallsTotal.labels(operation="embeddings", status="error").inc()
            error_payload: Dict[str, Any]
            try:
                error_payload = response.json()
            except Exception:
                error_payload = {"error": {"message": response.text[:500], "type": "http_error", "code": None}}
            record_openai_error("embeddings", response.status_code, error_payload)
            return [deterministic_embedding(text) for text in texts]

        ragOpenAiCallsTotal.labels(operation="embeddings", status="success").inc()
        record_openai_success()

        data = response.json().get("data", [])
        if not data:
            return [deterministic_embedding(text) for text in texts]
        return [normalize_embedding_dim(item.get("embedding", [])) for item in data]

    async def answer(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        if not self.enabled:
            return None

        url = f"{OPENAI_BASE_URL}/chat/completions"
        headers = {
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": OPENAI_MODEL,
            "temperature": 0.1,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
            except Exception as exc:
                ragOpenAiCallsTotal.labels(operation="chat", status="error").inc()
                logger.exception("openai_call.exception operation=chat")
                record_openai_error(
                    operation="chat",
                    status_code=None,
                    payload={"error": {"message": str(exc), "type": "request_exception", "code": None}},
                )
                return None

        if response.status_code >= 400:
            ragOpenAiCallsTotal.labels(operation="chat", status="error").inc()
            error_payload: Dict[str, Any]
            try:
                error_payload = response.json()
            except Exception:
                error_payload = {"error": {"message": response.text[:500], "type": "http_error", "code": None}}
            record_openai_error("chat", response.status_code, error_payload)
            return None

        ragOpenAiCallsTotal.labels(operation="chat", status="success").inc()
        record_openai_success()

        choices = response.json().get("choices", [])
        if not choices:
            return None
        message = choices[0].get("message", {})
        return message.get("content")


def split_text(content: str, chunk_size: int = RAG_CHUNK_SIZE, overlap: int = RAG_CHUNK_OVERLAP) -> List[str]:
    text = content.strip()
    if not text:
        return []
    if len(text) <= chunk_size:
        return [text]

    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_size)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(text):
            break
        start = max(0, end - overlap)
    return chunks


def checksum(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def to_iso(value: Any) -> str:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    if value is None:
        return ""
    return str(value)


def build_global_summary_document(summary: Dict[str, Any]) -> IngestDocument:
    today = summary.get("today", datetime.now(timezone.utc).strftime("%Y-%m-%d"))
    content = (
        "IMS inventory operational summary\n"
        f"- total_lots: {summary.get('total_lots', 0)}\n"
        f"- lots_in_quarantine: {summary.get('lots_in_quarantine', 0)}\n"
        f"- lots_imported_today: {summary.get('lots_imported_today', 0)}\n"
        f"- today_transactions: {summary.get('today_transactions', 0)}\n"
        f"- total_materials: {summary.get('total_materials', 0)}\n"
        f"- accepted_lots: {summary.get('accepted_lots', 0)}\n"
        f"- rejected_lots: {summary.get('rejected_lots', 0)}\n"
        f"- depleted_lots: {summary.get('depleted_lots', 0)}\n"
        f"- total_available_quantity: {summary.get('total_available_quantity', 0)}\n"
        f"- day: {today}"
    )
    return IngestDocument(
        source_uri="db://postgres/inventory/summary/global",
        content=content,
        metadata={
            "section_path": "ims_inventory/global_summary",
            "language": "vi",
            "role_visibility": list(ALLOWED_EMPLOYEE_ROLES),
        },
    )


def build_lot_document(row: Dict[str, Any]) -> IngestDocument:
    source_uri = f"db://postgres/inventory_lots/{row['lot_id']}"
    content = (
        "IMS lot record\n"
        f"lot_id: {row.get('lot_id')}\n"
        f"material_id: {row.get('material_id')}\n"
        f"material_name: {row.get('material_name', '')}\n"
        f"material_type: {row.get('material_type', '')}\n"
        f"manufacturer_name: {row.get('manufacturer_name', '')}\n"
        f"manufacturer_lot: {row.get('manufacturer_lot', '')}\n"
        f"supplier_name: {row.get('supplier_name', '')}\n"
        f"status: {row.get('status', '')}\n"
        f"quantity: {row.get('quantity', 0)}\n"
        f"unit_of_measure: {row.get('unit_of_measure', '')}\n"
        f"storage_location: {row.get('storage_location', '')}\n"
        f"received_date: {to_iso(row.get('received_date'))}\n"
        f"expiration_date: {to_iso(row.get('expiration_date'))}\n"
        f"updated_at: {to_iso(row.get('modified_date'))}"
    )
    return IngestDocument(
        source_uri=source_uri,
        content=content,
        metadata={
            "section_path": f"ims_inventory/lots/{row['lot_id']}",
            "language": "vi",
            "role_visibility": list(ALLOWED_EMPLOYEE_ROLES),
        },
    )


def build_material_summary_document(row: Dict[str, Any]) -> IngestDocument:
    source_uri = f"db://postgres/materials/{row['material_id']}"
    content = (
        "IMS material inventory summary\n"
        f"material_id: {row.get('material_id')}\n"
        f"material_name: {row.get('material_name', '')}\n"
        f"part_number: {row.get('part_number', '')}\n"
        f"material_type: {row.get('material_type', '')}\n"
        f"lots_total: {row.get('lots_total', 0)}\n"
        f"lots_quarantine: {row.get('lots_quarantine', 0)}\n"
        f"lots_accepted: {row.get('lots_accepted', 0)}\n"
        f"lots_rejected: {row.get('lots_rejected', 0)}\n"
        f"quantity_total: {row.get('quantity_total', 0)}\n"
        f"last_received_date: {to_iso(row.get('last_received_date'))}\n"
        f"updated_at: {to_iso(row.get('modified_date'))}"
    )
    return IngestDocument(
        source_uri=source_uri,
        content=content,
        metadata={
            "section_path": f"ims_inventory/materials/{row['material_id']}",
            "language": "vi",
            "role_visibility": list(ALLOWED_EMPLOYEE_ROLES),
        },
    )


def fetch_postgres_inventory_snapshot(
    updated_since: Optional[datetime] = None,
    lot_ids: Optional[List[str]] = None,
    material_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL is required for inventory indexing")

    result: Dict[str, Any] = {
        "lots": [],
        "materials": [],
        "summary": {},
    }

    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            where_clauses: List[str] = []
            params: List[Any] = []

            if updated_since is not None:
                where_clauses.append("l.modified_date >= %s")
                params.append(updated_since)

            if lot_ids:
                where_clauses.append("l.lot_id = ANY(%s)")
                params.append(lot_ids)

            if material_ids:
                where_clauses.append("l.material_id = ANY(%s)")
                params.append(material_ids)

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            cur.execute(
                f"""
                SELECT
                    l.lot_id,
                    l.material_id,
                    l.manufacturer_name,
                    l.manufacturer_lot,
                    l.supplier_name,
                    l.received_date,
                    l.expiration_date,
                    l.status,
                    l.quantity,
                    l.unit_of_measure,
                    l.storage_location,
                    l.modified_date,
                    m.material_name,
                    m.material_type,
                    m.part_number
                FROM inventory_lots l
                LEFT JOIN materials m ON m.material_id = l.material_id
                {where_sql}
                ORDER BY l.modified_date DESC
                """,
                params,
            )
            lots = cur.fetchall()

            cur.execute(
                """
                SELECT
                    m.material_id,
                    m.material_name,
                    m.part_number,
                    m.material_type,
                    m.modified_date,
                    COUNT(l.lot_id) AS lots_total,
                    COUNT(*) FILTER (WHERE l.status = 'Quarantine') AS lots_quarantine,
                    COUNT(*) FILTER (WHERE l.status = 'Accepted') AS lots_accepted,
                    COUNT(*) FILTER (WHERE l.status = 'Rejected') AS lots_rejected,
                    COALESCE(SUM(l.quantity), 0) AS quantity_total,
                    MAX(l.received_date) AS last_received_date
                FROM materials m
                LEFT JOIN inventory_lots l ON l.material_id = m.material_id
                GROUP BY m.material_id, m.material_name, m.part_number, m.material_type, m.modified_date
                ORDER BY m.modified_date DESC
                """
            )
            materials = cur.fetchall()

            cur.execute(
                """
                SELECT
                    COUNT(*)::int AS total_lots,
                    COUNT(*) FILTER (WHERE status = 'Quarantine')::int AS lots_in_quarantine,
                    COUNT(*) FILTER (WHERE status = 'Accepted')::int AS accepted_lots,
                    COUNT(*) FILTER (WHERE status = 'Rejected')::int AS rejected_lots,
                    COUNT(*) FILTER (WHERE status = 'Depleted')::int AS depleted_lots,
                    COUNT(*) FILTER (WHERE received_date = CURRENT_DATE)::int AS lots_imported_today,
                    COALESCE(SUM(quantity) FILTER (WHERE status IN ('Quarantine','Accepted')), 0)::float AS total_available_quantity
                FROM inventory_lots
                """
            )
            summary = cur.fetchone() or {}

            cur.execute("SELECT COUNT(*)::int AS total_materials FROM materials")
            materials_count = cur.fetchone() or {"total_materials": 0}

            cur.execute(
                """
                SELECT
                    COUNT(*)::int AS today_transactions,
                    COUNT(*) FILTER (WHERE transaction_type = 'Receipt')::int AS today_receipts,
                    COUNT(*) FILTER (WHERE transaction_type = 'Usage')::int AS today_issues
                FROM inventory_transactions
                WHERE DATE(transaction_date) = CURRENT_DATE
                """
            )
            transactions_today = cur.fetchone() or {
                "today_transactions": 0,
                "today_receipts": 0,
                "today_issues": 0,
            }

    summary["total_materials"] = materials_count.get("total_materials", 0)
    summary["today_transactions"] = transactions_today.get("today_transactions", 0)
    summary["today_receipts"] = transactions_today.get("today_receipts", 0)
    summary["today_issues"] = transactions_today.get("today_issues", 0)
    summary["today"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    result["lots"] = lots
    result["materials"] = materials
    result["summary"] = summary
    return result


def fetch_mongo_inventory_documents(updated_since: Optional[datetime] = None) -> List[IngestDocument]:
    if not RAG_MONGO_URI or MongoClient is None:
        return []

    query: Dict[str, Any] = {}
    if updated_since is not None:
        query["updated_at"] = {"$gte": updated_since}

    documents: List[IngestDocument] = []
    client = MongoClient(RAG_MONGO_URI, serverSelectionTimeoutMS=3000)
    try:
        db = client[RAG_MONGO_DB]
        for collection_name in ["products", "lots", "warehouse_status"]:
            if collection_name not in db.list_collection_names():
                continue
            collection = db[collection_name]
            for item in collection.find(query).limit(500):
                docs = json.dumps(item, ensure_ascii=False, default=str)
                identifier = str(item.get("_id", uuid.uuid4()))
                documents.append(
                    IngestDocument(
                        source_uri=f"db://mongo/{collection_name}/{identifier}",
                        content=f"Mongo inventory document ({collection_name}):\n{docs}",
                        metadata={
                            "section_path": f"ims_inventory/mongo/{collection_name}/{identifier}",
                            "language": "vi",
                            "role_visibility": list(ALLOWED_EMPLOYEE_ROLES),
                        },
                    )
                )
    finally:
        client.close()

    return documents


def build_inventory_documents(
    updated_since: Optional[datetime] = None,
    lot_ids: Optional[List[str]] = None,
    material_ids: Optional[List[str]] = None,
) -> Dict[str, Any]:
    snapshot = fetch_postgres_inventory_snapshot(updated_since=updated_since, lot_ids=lot_ids, material_ids=material_ids)
    postgres_docs: List[IngestDocument] = [build_global_summary_document(snapshot["summary"])]
    postgres_docs.extend(build_lot_document(row) for row in snapshot["lots"])
    postgres_docs.extend(build_material_summary_document(row) for row in snapshot["materials"])
    mongo_docs = fetch_mongo_inventory_documents(updated_since=updated_since)

    return {
        "documents": postgres_docs + mongo_docs,
        "lots_count": len(snapshot["lots"]),
        "materials_count": len(snapshot["materials"]),
        "mongo_docs_count": len(mongo_docs),
        "summary": snapshot["summary"],
    }


class RetrieveRequest(BaseModel):
    query: str = Field(min_length=1, max_length=1000)
    top_k: int = Field(default=RAG_TOP_K, ge=1, le=20)
    role_context: List[str] = Field(default_factory=list)


class Citation(BaseModel):
    chunk_id: str
    source_uri: str
    section_path: str
    score: float


class RetrieveResponse(BaseModel):
    query: str
    chunks: List[Dict[str, Any]]


class IngestDocument(BaseModel):
    source_uri: str
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class IngestDocumentsRequest(BaseModel):
    documents: List[IngestDocument] = Field(default_factory=list)


class IngestStatusResponse(BaseModel):
    job_id: str
    status: str
    detail: str
    chunks_ingested: int = 0


class AnswerRequest(BaseModel):
    question: str = Field(min_length=1, max_length=1000)
    locale: str = "vi-VN"
    correlation_id: str
    role_context: List[str] = Field(default_factory=list)
    user_context: Dict[str, Any] = Field(default_factory=dict)
    retrieval_hints: Dict[str, Any] = Field(default_factory=dict)
    operational_context: Dict[str, Any] = Field(default_factory=dict)


class AnswerResponse(BaseModel):
    answer_text: str
    confidence: float
    intent: str
    citations: List[Citation]
    warnings: List[str] = Field(default_factory=list)
    grounded_facts: List[str] = Field(default_factory=list)
    policy_flags: List[str] = Field(default_factory=list)
    latency_breakdown: Dict[str, float] = Field(default_factory=dict)


class InventorySyncRequest(BaseModel):
    source: str = "manual"
    reason: str = "manual_trigger"
    triggered_by: str = "system"
    lot_ids: List[str] = Field(default_factory=list)
    material_ids: List[str] = Field(default_factory=list)
    updated_since: Optional[str] = None


async def run_inventory_index(
    mode: str,
    source: str,
    lot_ids: Optional[List[str]] = None,
    material_ids: Optional[List[str]] = None,
    updated_since: Optional[datetime] = None,
) -> Dict[str, Any]:
    global last_inventory_sync_at

    started_at = time.perf_counter()
    lot_ids = lot_ids or []
    material_ids = material_ids or []

    if mode == "incremental" and updated_since is None:
        if last_inventory_sync_at is not None:
            updated_since = last_inventory_sync_at - timedelta(seconds=30)
        else:
            updated_since = datetime.now(timezone.utc) - timedelta(seconds=RAG_INCREMENTAL_LOOKBACK_SECONDS)

    try:
        inventory_payload = build_inventory_documents(
            updated_since=updated_since,
            lot_ids=lot_ids,
            material_ids=material_ids,
        )
        documents = inventory_payload["documents"]
        chunks_ingested = await ingest_documents_internal(
            documents,
            source_type="ims_inventory",
            namespace=INDEX_NAMESPACE_IMS_INVENTORY,
        )
        elapsed = time.perf_counter() - started_at

        ragIndexJobsTotal.labels(source=source, mode=mode, status="success").inc()
        ragIndexDurationSeconds.labels(source=source, mode=mode).observe(elapsed)
        ragLastIndexSuccessTimestamp.set(time.time())
        ragIndexedLotsTotal.set(float(inventory_payload["lots_count"]))
        ragIndexedMaterialsTotal.set(float(inventory_payload["materials_count"]))
        last_inventory_sync_at = datetime.now(timezone.utc)

        logger.info(
            "inventory_index.success source=%s mode=%s docs=%s chunks=%s lots=%s materials=%s elapsed=%.3fs",
            source,
            mode,
            len(documents),
            chunks_ingested,
            inventory_payload["lots_count"],
            inventory_payload["materials_count"],
            elapsed,
        )

        return {
            "success": True,
            "mode": mode,
            "source": source,
            "documents_indexed": len(documents),
            "chunks_ingested": chunks_ingested,
            "lots_indexed": inventory_payload["lots_count"],
            "materials_indexed": inventory_payload["materials_count"],
            "mongo_docs_indexed": inventory_payload["mongo_docs_count"],
            "summary": inventory_payload["summary"],
            "updated_since": updated_since.isoformat() if updated_since else None,
            "finished_at": utc_now_iso(),
        }
    except Exception:
        elapsed = time.perf_counter() - started_at
        ragIndexJobsTotal.labels(source=source, mode=mode, status="error").inc()
        ragIndexDurationSeconds.labels(source=source, mode=mode).observe(elapsed)
        logger.exception("inventory_index.failed source=%s mode=%s", source, mode)
        raise


async def run_scheduled_inventory_sync() -> None:
    await run_inventory_index(mode="incremental", source="scheduler")


app = FastAPI(
    title="IMS RAG Service",
    description="RAG Chatbot service for IMS operational and knowledge-base Q&A",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

vector_store = InMemoryVectorStore(RAG_STORAGE_PATH)
openai_client = OpenAIClient()
ingest_jobs: Dict[str, IngestStatusResponse] = {}
scheduler: Optional[AsyncIOScheduler] = None
last_inventory_sync_at: Optional[datetime] = None


def parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except ValueError:
        return None


@app.on_event("startup")
async def startup_event() -> None:
    global scheduler

    if not RAG_BYPASS_S2S:
        if not RAG_SERVICE_SHARED_SECRET or RAG_SERVICE_SHARED_SECRET == "change-me-rag-shared-secret":
            raise RuntimeError("RAG_SERVICE_SHARED_SECRET must be configured with a strong value")
    vector_store.load()

    if RAG_SEED_ON_STARTUP:
        try:
            await run_inventory_index(mode="full", source="startup_seed")
        except Exception:
            logger.exception("inventory_seed_on_startup.failed")

    if RAG_ENABLE_SCHEDULED_SYNC:
        scheduler = AsyncIOScheduler(timezone="UTC")
        scheduler.add_job(
            run_scheduled_inventory_sync,
            trigger="interval",
            seconds=RAG_SYNC_INTERVAL_SECONDS,
            id="ims_inventory_incremental_sync",
            max_instances=1,
            coalesce=True,
            replace_existing=True,
        )
        scheduler.start()
        logger.info("inventory_scheduler.started interval_seconds=%s", RAG_SYNC_INTERVAL_SECONDS)


@app.on_event("shutdown")
async def shutdown_event() -> None:
    if scheduler is not None and scheduler.running:
        scheduler.shutdown(wait=False)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.perf_counter()
    path = request.url.path
    method = request.method

    if path.startswith("/v1") and not RAG_BYPASS_S2S:
        def fail(status_code: int, detail: str) -> JSONResponse:
            ragRequestsTotal.labels(endpoint=path, method=method, status_code=str(status_code)).inc()
            ragRequestDurationSeconds.labels(endpoint=path, method=method).observe(
                time.perf_counter() - start
            )
            return JSONResponse(status_code=status_code, content={"detail": detail})

        if not RAG_SERVICE_SHARED_SECRET:
            return fail(503, "RAG_SERVICE_SHARED_SECRET is not configured")

        signature = request.headers.get("x-rag-signature", "")
        timestamp = request.headers.get("x-rag-timestamp", "")
        if not signature or not timestamp:
            return fail(401, "Missing signature headers")

        try:
            ts = int(timestamp)
        except ValueError:
            return fail(401, "Invalid timestamp header")

        now = int(time.time())
        if abs(now - ts) > RAG_S2S_MAX_SKEW_SECONDS:
            return fail(401, "Signature timestamp outside allowed skew")

        raw_body = await request.body()
        expected = hmac.new(
            RAG_SERVICE_SHARED_SECRET.encode("utf-8"),
            f"{timestamp}.{raw_body.decode('utf-8')}".encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected):
            return fail(401, "Invalid request signature")

    response = await call_next(request)

    duration = time.perf_counter() - start
    ragRequestsTotal.labels(endpoint=path, method=method, status_code=str(response.status_code)).inc()
    ragRequestDurationSeconds.labels(endpoint=path, method=method).observe(duration)
    return response


@app.get("/")
async def root() -> Dict[str, Any]:
    return {
        "message": "IMS RAG Service",
        "version": "1.0.0",
        "vector_chunks": vector_store.count(),
    }


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "healthy",
        "service": "ims-rag-service",
        "vector_chunks": vector_store.count(),
        "openai_enabled": bool(OPENAI_API_KEY),
        "openai_model": OPENAI_MODEL,
        "openai_embedding_model": OPENAI_EMBEDDING_MODEL,
        "openai_last_success_at": openai_last_success_at,
        "openai_last_error": openai_last_error,
        "rag_force_llm_for_kpi": RAG_FORCE_LLM_FOR_KPI,
    }


@app.get("/metrics")
async def metrics() -> Response:
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


async def ingest_documents_internal(
    documents: List[IngestDocument],
    source_type: str,
    namespace: str,
    version: str = INDEX_VERSION,
) -> int:
    prepared: List[VectorChunk] = []
    for document in documents:
        chunks = split_text(document.content)
        if not chunks:
            continue

        embeddings = await openai_client.embed_texts(chunks)
        section_prefix = str(document.metadata.get("section_path", "document"))
        language = str(document.metadata.get("language", "vi"))
        role_visibility = document.metadata.get("role_visibility", list(ALLOWED_EMPLOYEE_ROLES))
        if not isinstance(role_visibility, list):
            role_visibility = list(ALLOWED_EMPLOYEE_ROLES)

        for idx, (chunk_text, embedding) in enumerate(zip(chunks, embeddings)):
            chunk_id = f"{checksum(document.source_uri)}-{idx}"
            now_iso = utc_now_iso()
            prepared.append(
                VectorChunk(
                    chunk_id=chunk_id,
                    namespace=namespace,
                    content=chunk_text,
                    embedding=embedding,
                    source_uri=document.source_uri,
                    section_path=f"{section_prefix}/{idx}",
                    source_type=source_type,
                    language=language,
                    role_visibility=[role for role in role_visibility if role in ALLOWED_EMPLOYEE_ROLES],
                    checksum_sha256=checksum(chunk_text),
                    version=version,
                    created_at=now_iso,
                    updated_at=now_iso,
                )
            )

    if prepared:
        vector_store.upsert(prepared)
        ragIngestedChunksTotal.labels(source_type=source_type).inc(len(prepared))
    return len(prepared)


@app.post("/v1/ingest/documents")
async def ingest_documents(request: IngestDocumentsRequest) -> Dict[str, Any]:
    if not request.documents:
        raise HTTPException(status_code=400, detail="documents must not be empty")
    if len(request.documents) > MAX_DOCUMENTS_PER_INGEST:
        raise HTTPException(
            status_code=413,
            detail=f"Too many documents. Maximum per request is {MAX_DOCUMENTS_PER_INGEST}",
        )

    total_chars = sum(len(document.content) for document in request.documents)
    if total_chars > MAX_TOTAL_CHARS_PER_INGEST:
        raise HTTPException(
            status_code=413,
            detail=f"Payload too large. Maximum total characters is {MAX_TOTAL_CHARS_PER_INGEST}",
        )

    job_id = str(uuid.uuid4())
    ingest_jobs[job_id] = IngestStatusResponse(
        job_id=job_id,
        status="running",
        detail="Ingestion in progress",
    )

    try:
        count = await ingest_documents_internal(
            request.documents,
            source_type="doc",
            namespace="ims_docs",
        )
        ingest_jobs[job_id] = IngestStatusResponse(
            job_id=job_id,
            status="completed",
            detail="Ingestion completed",
            chunks_ingested=count,
        )
    except Exception as exc:
        ingest_jobs[job_id] = IngestStatusResponse(
            job_id=job_id,
            status="failed",
            detail=str(exc),
            chunks_ingested=0,
        )
        raise

    return {
        "success": True,
        "job_id": job_id,
        "chunks_ingested": ingest_jobs[job_id].chunks_ingested,
        "vector_chunks_total": vector_store.count(),
    }


@app.post("/v1/ingest/reindex")
async def ingest_reindex() -> Dict[str, Any]:
    job_id = str(uuid.uuid4())
    ingest_jobs[job_id] = IngestStatusResponse(
        job_id=job_id,
        status="running",
        detail="Reindex in progress",
    )

    if not KB_DOCS_DIR.exists():
        ingest_jobs[job_id] = IngestStatusResponse(
            job_id=job_id,
            status="failed",
            detail=f"KB_DOCS_DIR does not exist: {KB_DOCS_DIR}",
            chunks_ingested=0,
        )
        raise HTTPException(status_code=400, detail=ingest_jobs[job_id].detail)

    docs: List[IngestDocument] = []
    for file_path in KB_DOCS_DIR.rglob("*.md"):
        content = file_path.read_text(encoding="utf-8", errors="ignore")
        docs.append(
            IngestDocument(
                source_uri=str(file_path),
                content=content,
                metadata={
                    "section_path": file_path.stem,
                    "language": "vi",
                    "role_visibility": list(ALLOWED_EMPLOYEE_ROLES),
                },
            )
        )

    ingested = await ingest_documents_internal(
        docs,
        source_type="kb",
        namespace="ims_kb",
    )
    ingest_jobs[job_id] = IngestStatusResponse(
        job_id=job_id,
        status="completed",
        detail="Reindex completed",
        chunks_ingested=ingested,
    )

    return {
        "success": True,
        "job_id": job_id,
        "files_indexed": len(docs),
        "chunks_ingested": ingested,
        "vector_chunks_total": vector_store.count(),
    }


@app.get("/v1/ingest/status/{job_id}")
async def ingest_status(job_id: str) -> Dict[str, Any]:
    status = ingest_jobs.get(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="job_id not found")
    return status.model_dump()


@app.post("/v1/ingest/inventory/reindex")
async def inventory_reindex(request: InventorySyncRequest) -> Dict[str, Any]:
    return await run_inventory_index(
        mode="full",
        source=request.source,
        lot_ids=request.lot_ids,
        material_ids=request.material_ids,
    )


@app.post("/v1/ingest/inventory/sync")
async def inventory_sync(request: InventorySyncRequest) -> Dict[str, Any]:
    requested_since = parse_iso_datetime(request.updated_since)
    return await run_inventory_index(
        mode="incremental",
        source=request.source,
        lot_ids=request.lot_ids,
        material_ids=request.material_ids,
        updated_since=requested_since,
    )


@app.post("/rag/reindex")
async def rag_reindex_alias(request: InventorySyncRequest) -> Dict[str, Any]:
    # Convenience alias required by API contract for manual trigger path.
    return await inventory_reindex(request)


@app.post("/v1/retrieve", response_model=RetrieveResponse)
async def retrieve(request: RetrieveRequest) -> RetrieveResponse:
    query_embedding = (await openai_client.embed_texts([request.query]))[0]
    matches = vector_store.search(
        query=request.query,
        query_embedding=query_embedding,
        top_k=request.top_k,
        role_context=request.role_context,
    )

    return RetrieveResponse(
        query=request.query,
        chunks=[
            {
                "chunk_id": item["chunk"].chunk_id,
                "source_uri": item["chunk"].source_uri,
                "section_path": item["chunk"].section_path,
                "content": item["chunk"].content,
                "score": item["score"],
            }
            for item in matches
        ],
    )


def is_vietnamese_locale(locale: str) -> bool:
    value = (locale or "").lower()
    return value.startswith("vi")


def build_system_prompt(locale: str) -> str:
    if is_vietnamese_locale(locale):
        return (
            "Bạn là trợ lý IMS RAG. Chỉ trả lời bằng dữ liệu có trong ngữ cảnh đã truy xuất. "
            "Nếu bằng chứng chưa đủ, phải nói rõ là chưa chắc chắn. "
            "Ưu tiên trả lời ngắn gọn, rõ số liệu, đúng ngữ cảnh vận hành kho."
        )
    return (
        "You are IMS RAG assistant. Answer only with grounded facts from provided context. "
        "If evidence is insufficient, clearly say you are not sure. "
        "Include concise operational answer first and preserve role-based confidentiality."
    )


def build_user_prompt(
    locale: str,
    question: str,
    context_blocks: List[Dict[str, Any]],
    operational_context: Dict[str, Any],
) -> str:
    context_text = "\n\n".join(
        [
            f"[source:{item['source_uri']}#{item['chunk_id']} score={item['score']:.3f}]\n{item['content']}"
            for item in context_blocks
        ]
    )
    operational_json = json.dumps(operational_context, ensure_ascii=False)
    if is_vietnamese_locale(locale):
        return (
            f"Câu hỏi:\n{question}\n\n"
            f"Ngữ cảnh vận hành:\n{operational_json}\n\n"
            f"Ngữ cảnh tri thức đã truy xuất:\n{context_text}\n\n"
            "Hãy trả lời bằng tiếng Việt, ngắn gọn, nêu rõ số liệu chính. "
            "KHÔNG liệt kê nguồn hay URL trong câu trả lời."
        )

    return (
        f"Question:\n{question}\n\n"
        f"Operational context:\n{operational_json}\n\n"
        f"Retrieved knowledge context:\n{context_text}\n\n"
        "Return a concise answer with clear facts and mention if uncertainty exists. "
        "DO NOT include source URLs or citation references in the answer text."
    )


def fallback_answer(
    locale: str,
    question: str,
    context_blocks: List[Dict[str, Any]],
    operational_context: Dict[str, Any],
) -> str:
    snippets = "\n".join(
        [f"- {item['content'][:180]}" for item in context_blocks[:3]]
    )
    op_summary = json.dumps(operational_context, ensure_ascii=False)
    if is_vietnamese_locale(locale):
        return (
            "OpenAI hiện không khả dụng, trả về câu trả lời fallback dựa trên dữ liệu đã truy xuất.\n"
            f"Câu hỏi: {question}\n"
            f"Tóm tắt vận hành: {op_summary}\n"
            "Các đoạn dữ liệu chính:\n"
            f"{snippets}"
        )

    return (
        "OpenAI is unavailable, returning retrieval-grounded fallback answer.\n"
        f"Question: {question}\n"
        f"Operational snapshot: {op_summary}\n"
        "Key retrieved snippets:\n"
        f"{snippets}"
    )


def detect_inventory_kpi_intent(question: str) -> Optional[str]:
    q = (question or "").lower()

    if any(token in q for token in ["transaction", "transactions", "giao dịch", "giao dich"]) and any(
        token in q for token in ["today", "hôm nay", "hom nay", "ngày hôm nay", "ngay hom nay"]
    ):
        return "today_transactions"
    if any(token in q for token in ["quarantine", "cách ly", "kiểm dịch"]):
        return "lots_in_quarantine"
    if any(token in q for token in ["import", "nhập", "nhập kho"]) and any(
        token in q for token in ["today", "hôm nay", "ngày hôm nay"]
    ):
        return "lots_imported_today"
    if any(token in q for token in ["inventory summary", "tóm tắt tồn kho", "tổng quan tồn kho"]):
        return "inventory_summary"
    if any(token in q for token in ["accepted", "accept", "đã duyệt", "da duyet", "chấp nhận", "chap nhan"]):
        return "accepted_lots"
    if any(token in q for token in ["rejected", "reject", "bị loại", "bi loai"]):
        return "rejected_lots"
    if any(
        token in q
        for token in [
            "depleted",
            "depleted lots",
            "lot depleted",
            "hết tồn",
            "het ton",
            "đã cạn",
            "da can",
        ]
    ):
        return "depleted_lots"
    if any(token in q for token in ["tổng", "total", "bao nhiêu", "how many"]) and "lot" in q:
        return "total_lots"

    return None


def detect_date_filter(question: str) -> Optional[str]:
    q = (question or "").lower()
    if any(token in q for token in ["hôm nay", "hom nay", "today"]):
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    date_match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", q)
    if date_match:
        return date_match.group(1)

    return None


def detect_material_filter(question: str, materials: List[Dict[str, Any]]) -> Optional[Dict[str, str]]:
    q = (question or "").lower()

    material_id_match = re.search(r"\bmat[\-_ ]?(\d{1,6})\b", q)
    if material_id_match:
        mat_id = f"MAT{material_id_match.group(1).zfill(3)}"
        return {"material_id": mat_id, "material_name": mat_id}

    for material in materials:
        material_name = str(material.get("material_name", "")).strip()
        material_id = str(material.get("material_id", "")).strip()
        if material_name and material_name.lower() in q:
            return {
                "material_id": material_id,
                "material_name": material_name,
            }

    return None


def count_lots_with_filters(
    lots: List[Dict[str, Any]],
    status: Optional[str],
    date_filter: Optional[str],
    material_filter: Optional[Dict[str, str]],
) -> int:
    filtered = lots

    if status:
        filtered = [lot for lot in filtered if str(lot.get("status", "")) == status]

    if date_filter:
        filtered = [
            lot
            for lot in filtered
            if to_iso(lot.get("received_date"))[:10] == date_filter
        ]

    if material_filter and material_filter.get("material_id"):
        material_id = material_filter["material_id"]
        filtered = [lot for lot in filtered if str(lot.get("material_id", "")) == material_id]

    return len(filtered)


def build_kpi_answer_from_summary(locale: str, summary: Dict[str, Any], intent: str) -> str:
    total_lots = int(summary.get("total_lots", 0) or 0)
    quarantine_lots = int(summary.get("lots_in_quarantine", 0) or 0)
    imported_today = int(summary.get("lots_imported_today", 0) or 0)
    today_transactions = int(summary.get("today_transactions", 0) or 0)
    today_receipts = int(summary.get("today_receipts", 0) or 0)
    today_issues = int(summary.get("today_issues", 0) or 0)
    total_materials = int(summary.get("total_materials", 0) or 0)
    accepted_lots = int(summary.get("accepted_lots", 0) or 0)
    rejected_lots = int(summary.get("rejected_lots", 0) or 0)
    depleted_lots = int(summary.get("depleted_lots", 0) or 0)
    total_available_quantity = float(summary.get("total_available_quantity", 0) or 0)

    if is_vietnamese_locale(locale):
        if intent == "total_lots":
            return f"Hiện tại có tổng cộng {total_lots} lots trong hệ thống."
        if intent == "lots_in_quarantine":
            return f"Hiện tại có {quarantine_lots} lots đang ở trạng thái Quarantine."
        if intent == "lots_imported_today":
            return f"Hôm nay có {imported_today} lots được nhập kho."
        if intent == "today_transactions":
            return (
                f"Hôm nay có {today_transactions} giao dịch "
                f"(Receipt: {today_receipts}, Usage: {today_issues})."
            )
        if intent == "accepted_lots":
            return f"Hiện tại có {accepted_lots} lots ở trạng thái Accepted."
        if intent == "rejected_lots":
            return f"Hiện tại có {rejected_lots} lots ở trạng thái Rejected."
        if intent == "depleted_lots":
            return f"Hiện tại có {depleted_lots} lots ở trạng thái Depleted."
        return (
            "Tóm tắt tồn kho hiện tại:\n"
            f"- Tổng lots: {total_lots}\n"
            f"- Lots Quarantine: {quarantine_lots}\n"
            f"- Lots Accepted: {accepted_lots}\n"
            f"- Lots Rejected: {rejected_lots}\n"
            f"- Lots Depleted: {depleted_lots}\n"
            f"- Lots nhập hôm nay: {imported_today}\n"
            f"- Tổng materials: {total_materials}\n"
            f"- Tổng quantity khả dụng: {total_available_quantity}"
        )

    if intent == "total_lots":
        return f"There are currently {total_lots} total lots in the system."
    if intent == "lots_in_quarantine":
        return f"There are currently {quarantine_lots} lots in Quarantine status."
    if intent == "lots_imported_today":
        return f"There are {imported_today} lots imported today."
    if intent == "today_transactions":
        return (
            f"There are {today_transactions} transactions today "
            f"(Receipt: {today_receipts}, Usage: {today_issues})."
        )
    if intent == "accepted_lots":
        return f"There are currently {accepted_lots} lots in Accepted status."
    if intent == "rejected_lots":
        return f"There are currently {rejected_lots} lots in Rejected status."
    if intent == "depleted_lots":
        return f"There are currently {depleted_lots} lots in Depleted status."
    return (
        "Current inventory summary:\n"
        f"- Total lots: {total_lots}\n"
        f"- Quarantine lots: {quarantine_lots}\n"
        f"- Accepted lots: {accepted_lots}\n"
        f"- Rejected lots: {rejected_lots}\n"
        f"- Depleted lots: {depleted_lots}\n"
        f"- Lots imported today: {imported_today}\n"
        f"- Total materials: {total_materials}\n"
        f"- Total available quantity: {total_available_quantity}"
    )


def try_answer_inventory_kpi(locale: str, question: str) -> Optional[AnswerResponse]:
    intent = detect_inventory_kpi_intent(question)
    if intent is None:
        return None

    try:
        snapshot = fetch_postgres_inventory_snapshot()
        summary = snapshot.get("summary", {})
        lots = snapshot.get("lots", [])
        materials = snapshot.get("materials", [])
        date_filter = detect_date_filter(question)
        material_filter = detect_material_filter(question, materials)

        status_for_intent = {
            "accepted_lots": "Accepted",
            "rejected_lots": "Rejected",
            "depleted_lots": "Depleted",
            "lots_in_quarantine": "Quarantine",
        }.get(intent)

        if status_for_intent or date_filter or material_filter:
            lots_count = count_lots_with_filters(
                lots=lots,
                status=status_for_intent,
                date_filter=date_filter,
                material_filter=material_filter,
            )

            material_text_vi = (
                f" cho material {material_filter['material_name']}" if material_filter else ""
            )
            material_text_en = (
                f" for material {material_filter['material_name']}" if material_filter else ""
            )
            date_text_vi = f" vào ngày {date_filter}" if date_filter else ""
            date_text_en = f" on {date_filter}" if date_filter else ""

            if is_vietnamese_locale(locale):
                if intent == "accepted_lots":
                    answer_text = f"Có {lots_count} lots ở trạng thái Accepted{material_text_vi}{date_text_vi}."
                elif intent == "rejected_lots":
                    answer_text = f"Có {lots_count} lots ở trạng thái Rejected{material_text_vi}{date_text_vi}."
                elif intent == "depleted_lots":
                    answer_text = f"Có {lots_count} lots ở trạng thái Depleted{material_text_vi}{date_text_vi}."
                elif intent == "lots_in_quarantine":
                    answer_text = f"Có {lots_count} lots ở trạng thái Quarantine{material_text_vi}{date_text_vi}."
                else:
                    answer_text = f"Có {lots_count} lots{material_text_vi}{date_text_vi}."
            else:
                if intent == "accepted_lots":
                    answer_text = f"There are {lots_count} Accepted lots{material_text_en}{date_text_en}."
                elif intent == "rejected_lots":
                    answer_text = f"There are {lots_count} Rejected lots{material_text_en}{date_text_en}."
                elif intent == "depleted_lots":
                    answer_text = f"There are {lots_count} Depleted lots{material_text_en}{date_text_en}."
                elif intent == "lots_in_quarantine":
                    answer_text = f"There are {lots_count} Quarantine lots{material_text_en}{date_text_en}."
                else:
                    answer_text = f"There are {lots_count} lots{material_text_en}{date_text_en}."
        else:
            answer_text = build_kpi_answer_from_summary(locale, summary, intent)
    except Exception:
        logger.exception("inventory_kpi_answer.failed")
        return None

    citation = Citation(
        chunk_id="inventory-summary-live",
        source_uri="ims://inventory/summary/live",
        section_path="ims_inventory/global_summary",
        score=1.0,
    )

    return AnswerResponse(
        answer_text=answer_text,
        confidence=0.95,
        intent=intent,
        citations=[citation],
        warnings=[],
        grounded_facts=[answer_text],
        policy_flags=[],
        latency_breakdown={},
    )


async def try_answer_inventory_kpi_with_llm(
    locale: str,
    question: str,
    operational_context: Dict[str, Any],
) -> Optional[AnswerResponse]:
    kpi_fallback = try_answer_inventory_kpi(locale, question)
    if kpi_fallback is None:
        return None

    if is_vietnamese_locale(locale):
        system_prompt = (
            "Bạn là trợ lý KPI IMS. Trả lời ngắn gọn, tự nhiên bằng tiếng Việt, "
            "chỉ dựa trên dữ liệu KPI live được cung cấp. Không bịa số liệu."
        )
        user_prompt = (
            f"Câu hỏi: {question}\n"
            f"Dữ liệu KPI live: {kpi_fallback.answer_text}\n"
            f"Ngữ cảnh vận hành: {json.dumps(operational_context, ensure_ascii=False)}\n"
            "Hãy trả lời trực tiếp 1-2 câu, nêu rõ con số chính."
        )
    else:
        system_prompt = (
            "You are IMS KPI assistant. Answer naturally in concise English "
            "using only provided live KPI facts. Do not invent numbers."
        )
        user_prompt = (
            f"Question: {question}\n"
            f"Live KPI fact: {kpi_fallback.answer_text}\n"
            f"Operational context: {json.dumps(operational_context, ensure_ascii=False)}\n"
            "Return a direct 1-2 sentence answer with the key number."
        )

    model_answer = await openai_client.answer(system_prompt, user_prompt)
    if model_answer is None:
        return None

    return AnswerResponse(
        answer_text=model_answer,
        confidence=min(0.99, kpi_fallback.confidence),
        intent=kpi_fallback.intent,
        citations=kpi_fallback.citations,
        warnings=kpi_fallback.warnings,
        grounded_facts=kpi_fallback.grounded_facts,
        policy_flags=kpi_fallback.policy_flags,
        latency_breakdown={},
    )


@app.post("/v1/answer", response_model=AnswerResponse)
async def answer(request: AnswerRequest) -> AnswerResponse:
    start = time.perf_counter()

    kpi_intent = detect_inventory_kpi_intent(request.question)
    if kpi_intent is not None:
        if RAG_FORCE_LLM_FOR_KPI and openai_client.enabled:
            kpi_llm_answer = await try_answer_inventory_kpi_with_llm(
                request.locale,
                request.question,
                request.operational_context,
            )
            if kpi_llm_answer is not None:
                kpi_llm_answer.latency_breakdown = {"total_seconds": time.perf_counter() - start}
                return kpi_llm_answer

        kpi_answer = try_answer_inventory_kpi(request.locale, request.question)
        if kpi_answer is not None:
            if RAG_FORCE_LLM_FOR_KPI and openai_client.enabled:
                kpi_answer.warnings.append("OpenAI unavailable for KPI. Returned deterministic fallback.")
            kpi_answer.latency_breakdown = {"total_seconds": time.perf_counter() - start}
            return kpi_answer

    if not request.role_context:
        raise HTTPException(status_code=400, detail="role_context is required")

    top_k = int(request.retrieval_hints.get("top_k", RAG_TOP_K))
    top_k = min(max(1, top_k), 20)
    query_embedding = (await openai_client.embed_texts([request.question]))[0]
    retrieval_start = time.perf_counter()
    matches = vector_store.search(
        query=request.question,
        query_embedding=query_embedding,
        top_k=top_k,
        role_context=request.role_context,
    )
    retrieval_elapsed = time.perf_counter() - retrieval_start

    if not matches:
        no_knowledge_message = (
            "Tôi chưa có đủ dữ liệu đã được lập chỉ mục để trả lời câu hỏi này. "
            "Vui lòng chạy reindex dữ liệu IMS hoặc thử lại với câu hỏi cụ thể hơn."
            if is_vietnamese_locale(request.locale)
            else "I do not have enough indexed knowledge to answer this question yet."
        )
        return AnswerResponse(
            answer_text=no_knowledge_message,
            confidence=0.2,
            intent=str(request.retrieval_hints.get("intent", "general_operational_question")),
            citations=[],
            warnings=["No indexed documents matched the query."],
            grounded_facts=[],
            policy_flags=[],
            latency_breakdown={"retrieval_seconds": retrieval_elapsed, "total_seconds": time.perf_counter() - start},
        )

    context_blocks = [
        {
            "chunk_id": item["chunk"].chunk_id,
            "source_uri": item["chunk"].source_uri,
            "section_path": item["chunk"].section_path,
            "content": item["chunk"].content,
            "score": item["score"],
        }
        for item in matches
    ]

    gen_start = time.perf_counter()
    system_prompt = build_system_prompt(request.locale)
    user_prompt = build_user_prompt(
        request.locale,
        request.question,
        context_blocks,
        request.operational_context,
    )
    model_answer = await openai_client.answer(system_prompt, user_prompt)
    generation_elapsed = time.perf_counter() - gen_start

    warnings: List[str] = []
    if model_answer is None:
        model_answer = fallback_answer(
            request.locale,
            request.question,
            context_blocks,
            request.operational_context,
        )
        warnings.append("OpenAI unavailable. Returned fallback answer.")

    citations = [
        Citation(
            chunk_id=item["chunk_id"],
            source_uri=item["source_uri"],
            section_path=item["section_path"],
            score=float(item["score"]),
        )
        for item in context_blocks
    ]

    confidence = max(0.2, min(0.99, context_blocks[0]["score"]))

    return AnswerResponse(
        answer_text=model_answer,
        confidence=confidence,
        intent=str(request.retrieval_hints.get("intent", "general_operational_question")),
        citations=citations,
        warnings=warnings,
        grounded_facts=[item["content"][:200] for item in context_blocks[:3]],
        policy_flags=[],
        latency_breakdown={
            "retrieval_seconds": retrieval_elapsed,
            "generation_seconds": generation_elapsed,
            "total_seconds": time.perf_counter() - start,
        },
    )


