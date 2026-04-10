import axios, { type AxiosRequestConfig } from "axios";
import keycloak from "../auth/keycloak";
import { frontendLogger } from "@/lib/observability/logger";

import type {
  AdminStats,
  Material,
  InventorySummary,
  TransactionSummary,
  QCStats,
  QCTest,
  QCQueueItem,
  ExpiringLot,
  InventoryLot,
  InventoryTransaction,
  ProductionBatch,
  BatchComponent,
  ProductionTraceabilityItem,
  User,
  PaginatedResponse,
  ApiResponse,
  InventoryReportRow,
  TransactionReportRow,
  AuditLogRow,
  LabelTemplate,
  GenerateLabelInput,
  GenerateLabelFromTemplateInput,
  GeneratedLabel,
  SystemHealth,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const api = axios.create({
  baseURL: BASE_URL,
});

type RequestMetadata = {
  startedAt: number;
  traceId: string;
};

type InstrumentedConfig = AxiosRequestConfig & {
  _retry?: boolean;
  metadata?: RequestMetadata;
};

const createTraceId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 32);
  }

  return `${Date.now().toString(16)}${Math.random().toString(16).slice(2, 18)}`.slice(0, 32);
};

// ────────────────────────────────────────────────────────────
// Request interceptor: attach Keycloak access token
// ────────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const traceId = createTraceId();
  const spanId = traceId.slice(0, 16);

  const token = keycloak.token;
  config.headers = config.headers ?? {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  config.headers["traceparent"] = `00-${traceId}-${spanId}-01`;
  config.headers["x-correlation-id"] = traceId;
  (config as InstrumentedConfig).metadata = {
    startedAt: performance.now(),
    traceId,
  };

  return config;
});

// ────────────────────────────────────────────────────────────
// Response interceptor: refresh token on 401 then retry once
// ────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = (error.config ?? {}) as InstrumentedConfig;
    const metadata = originalRequest.metadata;

    if (metadata) {
      frontendLogger.warn("frontend.api.request_failed", {
        method: originalRequest.method,
        url: originalRequest.url,
        status: error.response?.status,
        durationMs: Number((performance.now() - metadata.startedAt).toFixed(2)),
        traceId: metadata.traceId,
      });
    }

    if (
      error.response?.status === 401 &&
      keycloak.token &&
      !originalRequest._retry
    ) {
      try {
        originalRequest._retry = true;

        await keycloak.updateToken(30);
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${keycloak.token}`;

        return api.request(originalRequest); // use api instead of axios
      } catch {
        frontendLogger.error("frontend.auth.token_refresh_failed", {
          url: originalRequest.url,
        });
        keycloak.logout({ redirectUri: window.location.origin });
      }
    }

    return Promise.reject(error);
  },
);

// ────────────────────────────────────────────────────────────
// Generic request helper using axios (typed)
// ────────────────────────────────────────────────────────────
async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await api.request<T>(config);
  return res.data;
}

// ────────────────────────────────────────────────────────────
// Admin
// ────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () =>
    apiRequest<ApiResponse<AdminStats>>({
      url: "/api/admin/stats",
      method: "GET",
    }),

  getUsers: (params?: string) =>
    apiRequest<PaginatedResponse<User>>({
      url: `/api/admin/users${params ? `?${params}` : ""}`,
      method: "GET",
    }),

  getHealth: () =>
    apiRequest<ApiResponse<SystemHealth>>({
      url: "/api/admin/health",
      method: "GET",
    }),
};

// ────────────────────────────────────────────────────────────
// Dashboard (shared)
// ────────────────────────────────────────────────────────────
export const dashboardApi = {
  getInventorySummary: (params?: string) =>
    apiRequest<ApiResponse<InventorySummary>>({
      url: `/api/dashboard/inventory-summary${params ? `?${params}` : ""}`,
      method: "GET",
    }),

  getTransactionSummary: (params?: string) =>
    apiRequest<ApiResponse<TransactionSummary>>({
      url: `/api/dashboard/transaction-summary${params ? `?${params}` : ""}`,
      method: "GET",
    }),
};

// ────────────────────────────────────────────────────────────
// Transactions
// ────────────────────────────────────────────────────────────
export const transactionApi = {
  list: (params?: string) =>
    apiRequest<PaginatedResponse<InventoryTransaction>>({
      url: `/api/transactions${params ? `?${params}` : ""}`,
      method: "GET",
    }),
};

// ────────────────────────────────────────────────────────────
// Materials
// ────────────────────────────────────────────────────────────
export const materialApi = {
  list: (params?: string) =>
    apiRequest<PaginatedResponse<Material>>({
      url: `/api/materials${params ? `?${params}` : ""}`,
      method: "GET",
    }),
};

// ────────────────────────────────────────────────────────────
// QC
// ────────────────────────────────────────────────────────────
export const qcApi = {
  getStats: (params?: string) =>
    apiRequest<ApiResponse<QCStats>>({
      url: `/api/qc/stats${params ? `?${params}` : ""}`,
      method: "GET",
    }),

  listTests: (params?: string) =>
    apiRequest<PaginatedResponse<QCTest>>({
      url: `/api/qc/tests${params ? `?${params}` : ""}`,
      method: "GET",
    }),

  getQueue: (params?: string) =>
    apiRequest<PaginatedResponse<QCQueueItem>>({
      url: `/api/qc/queue${params ? `?${params}` : ""}`,
      method: "GET",
    }),

  getQueueCount: () =>
    apiRequest<ApiResponse<{ count: number }>>({
      url: "/api/qc/queue/count",
      method: "GET",
    }),
};

// ────────────────────────────────────────────────────────────
// Lots
// ────────────────────────────────────────────────────────────
export const lotApi = {
  getExpiring: (params?: string) =>
    apiRequest<PaginatedResponse<ExpiringLot>>({
      url: `/api/lots/expiring${params ? `?${params}` : ""}`,
      method: "GET",
    }),

  list: (params?: string) =>
    apiRequest<PaginatedResponse<InventoryLot>>({
      url: `/api/lots${params ? `?${params}` : ""}`,
      method: "GET",
    }),
};

// ────────────────────────────────────────────────────────────
// Production
// ────────────────────────────────────────────────────────────
export const productionApi = {
  getBatches: (params?: string) =>
    apiRequest<PaginatedResponse<ProductionBatch>>({
      url: `/api/production/batches${params ? `?${params}` : ""}`,
      method: "GET",
    }),

  getBatchById: (id: string) =>
    apiRequest<ApiResponse<ProductionBatch>>({
      url: `/api/production/batches/${id}`,
      method: "GET",
    }),

  updateBatchStatus: (id: string, status: string) =>
    apiRequest<ApiResponse<ProductionBatch>>({
      url: `/api/production/batches/${id}/status`,
      method: "PATCH",
      data: { status },
    }),

  consumeMaterial: (batchId: string, componentId: string, actualQuantity: number) =>
    apiRequest<ApiResponse<BatchComponent>>({
      url: `/api/production/batches/${batchId}/components/${componentId}/consume`,
      method: "POST",
      data: { actual_quantity: actualQuantity },
    }),

  getTraceability: (batchId: string) =>
    apiRequest<ApiResponse<ProductionTraceabilityItem[]>>({
      url: `/api/production/batches/${batchId}/traceability`,
      method: "GET",
    }),
};

// ────────────────────────────────────────────────────────────
// Reports
// ────────────────────────────────────────────────────────────
export const reportApi = {
  getInventoryReport: async (filters?: Record<string, string>) => {
    const res = await api.get("/api/reports/inventory", { params: filters });
    return res.data as { data: InventoryReportRow[] };
  },
  getTransactionReport: async (filters?: Record<string, string>) => {
    const res = await api.get("/api/reports/transactions", { params: filters });
    return res.data as { data: TransactionReportRow[] };
  },
  getAuditLog: async (filters?: Record<string, string>) => {
    const res = await api.get("/api/reports/audit-log", { params: filters });
    return res.data as { data: AuditLogRow[] };
  },
  exportReport: async (body: {
    type: string;
    filters: Record<string, unknown>;
  }) => {
    const res = await api.post("/api/reports/export", body, {
      responseType: "blob",
    });
    return res.data as Blob;
  },
};

// ────────────────────────────────────────────────────────────
// Labels
// ────────────────────────────────────────────────────────────
export const labelApi = {
  // Template operations
  getAllTemplates: () =>
    apiRequest<PaginatedResponse<LabelTemplate>>({
      url: "/api/labels/templates",
      method: "GET",
    }),

  getTemplateById: (id: string) =>
    apiRequest<ApiResponse<LabelTemplate>>({
      url: `/api/labels/templates/${id}`,
      method: "GET",
    }),

  getTemplatesByLabelType: (labelType: string) =>
    apiRequest<PaginatedResponse<LabelTemplate>>({
      url: `/api/labels/templates/type/${labelType}`,
      method: "GET",
    }),

  createTemplate: (data: {
    template_name: string;
    label_type: string;
    template_content: string;
    width?: number;
    height?: number;
  }) =>
    apiRequest<ApiResponse<LabelTemplate>>({
      url: "/api/labels/templates",
      method: "POST",
      data,
    }),

  updateTemplate: (id: string, data: Partial<LabelTemplate>) =>
    apiRequest<ApiResponse<LabelTemplate>>({
      url: `/api/labels/templates/${id}`,
      method: "PUT",
      data,
    }),

  deleteTemplate: (id: string) =>
    apiRequest<ApiResponse<{ message: string }>>({
      url: `/api/labels/templates/${id}`,
      method: "DELETE",
    }),

  // Label generation operations
  generateLabel: (data: GenerateLabelInput) =>
    apiRequest<ApiResponse<GeneratedLabel>>({
      url: "/api/labels/generate",
      method: "POST",
      data,
    }),

  generateLabelFromTemplate: (data: GenerateLabelFromTemplateInput) =>
    apiRequest<ApiResponse<GeneratedLabel>>({
      url: "/api/labels/generate-from-template",
      method: "POST",
      data,
    }),

  getAllLabels: () =>
    apiRequest<PaginatedResponse<GeneratedLabel>>({
      url: "/api/labels",
      method: "GET",
    }),

  getLabelById: (id: string) =>
    apiRequest<ApiResponse<GeneratedLabel>>({
      url: `/api/labels/${id}`,
      method: "GET",
    }),

  deleteLabel: (id: string) =>
    apiRequest<ApiResponse<{ message: string }>>({
      url: `/api/labels/${id}`,
      method: "DELETE",
    }),
};

export default api;
