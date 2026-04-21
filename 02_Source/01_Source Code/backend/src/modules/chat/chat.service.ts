import { createHmac, randomUUID } from "crypto";
import * as lotService from "../lots/lot.service";
import * as dashboardService from "../dashboard/dashboard.service";
import type {
  ChatAskRequest,
  ChatAnswerData,
  RagServiceAnswerRequest,
  RagServiceAnswerResponse,
} from "./chat.types";
import { logger } from "../../shared/observability/logger";

interface ChatGatewayConfig {
  ragServiceUrl: string;
  ragServiceSharedSecret: string;
  timeoutMs: number;
}

function getGatewayConfig(): ChatGatewayConfig {
  return {
    ragServiceUrl: process.env.RAG_SERVICE_URL || "http://localhost:8001",
    ragServiceSharedSecret: process.env.RAG_SERVICE_SHARED_SECRET || "",
    timeoutMs: Number(process.env.RAG_SERVICE_TIMEOUT_MS || 15000),
  };
}

const INTENT_PATTERNS: Array<{ intent: string; pattern: RegExp }> = [
  { intent: "lots_in_quarantine", pattern: /quarantine|cach ly|kiem dich/i },
  { intent: "lots_received_today", pattern: /received today|nhap hom nay|lo hang hom nay/i },
  { intent: "inventory_status", pattern: /inventory status|ton kho|stock status/i },
  { intent: "expiring_lots", pattern: /expir|het han|sap het han/i },
  { intent: "qc_pending", pattern: /qc pending|cho qc|pending qc/i },
];

function inferIntent(question: string): string {
  const matched = INTENT_PATTERNS.find((item) => item.pattern.test(question));
  return matched?.intent ?? "general_operational_question";
}

function signPayload(timestamp: string, body: string, sharedSecret: string): string {
  if (!sharedSecret) {
    throw new Error("RAG_SERVICE_SHARED_SECRET is not configured");
  }
  return createHmac("sha256", sharedSecret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

async function buildOperationalContext(intent: string): Promise<Record<string, unknown>> {
  if (intent === "lots_in_quarantine") {
    const lots = await lotService.getAllLots({ status: "Quarantine" });
    return {
      lots_in_quarantine: lots.length,
      sample_lots: lots.slice(0, 20),
    };
  }

  if (intent === "lots_received_today") {
    const lots = await lotService.getAllLots();
    const today = new Date().toISOString().slice(0, 10);
    const todayLots = lots.filter((lot) => String(lot.received_date).slice(0, 10) === today);
    return {
      lots_received_today: todayLots.length,
      sample_lots: todayLots.slice(0, 20),
      day: today,
    };
  }

  if (intent === "inventory_status") {
    const [inventorySummary, transactionSummary] = await Promise.all([
      dashboardService.getInventorySummary(),
      dashboardService.getTransactionSummary(),
    ]);
    return {
      inventory_summary: inventorySummary,
      transaction_summary: transactionSummary,
    };
  }

  return {
    hint: "No dedicated operational adapter for this intent yet.",
  };
}

export async function askChatbot(
  request: ChatAskRequest,
  user: { user_id: string; username: string; roles: string[] },
  correlationId?: string,
): Promise<ChatAnswerData> {
  const config = getGatewayConfig();
  const traceId = correlationId || randomUUID();
  const intent = inferIntent(request.question);
  const operationalContext = await buildOperationalContext(intent);

  const ragRequest: RagServiceAnswerRequest = {
    question: request.question,
    locale: request.locale || "vi-VN",
    correlation_id: traceId,
    role_context: user.roles,
    user_context: {
      user_id: user.user_id,
      username: user.username,
    },
    retrieval_hints: {
      top_k: 6,
      intent,
    },
    operational_context: {
      ...operationalContext,
      requested_context: request.context || {},
      generated_at: new Date().toISOString(),
    },
  };

  const body = JSON.stringify(ragRequest);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = signPayload(timestamp, body, config.ragServiceSharedSecret);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(`${config.ragServiceUrl}/v1/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-rag-timestamp": timestamp,
        "x-rag-signature": signature,
        "x-correlation-id": traceId,
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        { status: response.status, errorText, traceId },
        "chat.gateway.rag_request_failed",
      );
      throw new Error(`RAG service failed with status ${response.status}`);
    }

    const ragResult = (await response.json()) as RagServiceAnswerResponse;
    return {
      answer: ragResult.answer_text,
      confidence: ragResult.confidence,
      intent: ragResult.intent,
      citations: ragResult.citations || [],
      retrieval_trace_id: traceId,
      warnings: ragResult.warnings || [],
      generated_at: new Date().toISOString(),
    };
  } catch (error) {
    logger.error({ error, traceId }, "chat.gateway.failed");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
