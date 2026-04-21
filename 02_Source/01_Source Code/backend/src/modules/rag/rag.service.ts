import { createHmac } from "crypto";
import { logger } from "../../shared/observability/logger";

type InventorySyncPayload = {
  lot_ids?: string[];
  material_ids?: string[];
  reason?: string;
};

type RagGatewayConfig = {
  ragServiceUrl: string;
  ragServiceSharedSecret: string;
  timeoutMs: number;
};

function getConfig(): RagGatewayConfig {
  return {
    ragServiceUrl: process.env.RAG_SERVICE_URL || "http://localhost:8001",
    ragServiceSharedSecret: process.env.RAG_SERVICE_SHARED_SECRET || "",
    timeoutMs: Number(process.env.RAG_SERVICE_TIMEOUT_MS || 15000),
  };
}

function signPayload(timestamp: string, body: string, sharedSecret: string): string {
  if (!sharedSecret) {
    throw new Error("RAG_SERVICE_SHARED_SECRET is not configured");
  }

  return createHmac("sha256", sharedSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

async function signedPost(path: string, payload: Record<string, unknown>): Promise<unknown> {
  const config = getConfig();
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signPayload(timestamp, body, config.ragServiceSharedSecret);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.ragServiceUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rag-timestamp": timestamp,
        "x-rag-signature": signature,
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ path, status: response.status, errorText }, "rag.indexing.request_failed");
      throw new Error(`RAG indexing request failed with status ${response.status}`);
    }

    return (await response.json()) as unknown;
  } finally {
    clearTimeout(timeout);
  }
}

export async function triggerFullInventoryReindex(triggeredBy: string): Promise<unknown> {
  return signedPost("/v1/ingest/inventory/reindex", {
    source: "backend_manual",
    triggered_by: triggeredBy,
  });
}

export async function triggerIncrementalInventorySync(payload: InventorySyncPayload): Promise<void> {
  try {
    await signedPost("/v1/ingest/inventory/sync", {
      source: "backend_incremental",
      lot_ids: payload.lot_ids || [],
      material_ids: payload.material_ids || [],
      reason: payload.reason || "entity_updated",
    });
  } catch (error) {
    logger.warn({ error, payload }, "rag.indexing.incremental_sync_failed");
  }
}
