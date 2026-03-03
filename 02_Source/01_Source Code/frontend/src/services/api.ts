import type {
  AdminStats,
  InventorySummary,
  TransactionSummary,
  QCStats,
  QCQueueItem,
  ExpiringLot,
  InventoryTransaction,
  ProductionBatch,
  User,
  PaginatedResponse,
  ApiResponse,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// ────────────────────────────────────────────────────────────
// Generic fetch helper
// ────────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

// ────────────────────────────────────────────────────────────
// Admin
// ────────────────────────────────────────────────────────────
export const adminApi = {
  getStats: () => apiFetch<ApiResponse<AdminStats>>("/api/admin/stats"),
  getUsers: (params?: string) =>
    apiFetch<PaginatedResponse<User>>(
      `/api/admin/users${params ? `?${params}` : ""}`,
    ),
};

// ────────────────────────────────────────────────────────────
// Dashboard (shared)
// ────────────────────────────────────────────────────────────
export const dashboardApi = {
  getInventorySummary: (params?: string) =>
    apiFetch<ApiResponse<InventorySummary>>(
      `/api/dashboard/inventory-summary${params ? `?${params}` : ""}`,
    ),
  getTransactionSummary: (params?: string) =>
    apiFetch<ApiResponse<TransactionSummary>>(
      `/api/dashboard/transaction-summary${params ? `?${params}` : ""}`,
    ),
};

// ────────────────────────────────────────────────────────────
// Transactions
// ────────────────────────────────────────────────────────────
export const transactionApi = {
  list: (params?: string) =>
    apiFetch<PaginatedResponse<InventoryTransaction>>(
      `/api/transactions${params ? `?${params}` : ""}`,
    ),
};

// ────────────────────────────────────────────────────────────
// QC
// ────────────────────────────────────────────────────────────
export const qcApi = {
  getStats: (params?: string) =>
    apiFetch<ApiResponse<QCStats>>(
      `/api/qc/stats${params ? `?${params}` : ""}`,
    ),
  getQueue: (params?: string) =>
    apiFetch<PaginatedResponse<QCQueueItem>>(
      `/api/qc/queue${params ? `?${params}` : ""}`,
    ),
  getQueueCount: () =>
    apiFetch<ApiResponse<{ count: number }>>("/api/qc/queue/count"),
};

// ────────────────────────────────────────────────────────────
// Lots
// ────────────────────────────────────────────────────────────
export const lotApi = {
  getExpiring: (params?: string) =>
    apiFetch<PaginatedResponse<ExpiringLot>>(
      `/api/lots/expiring${params ? `?${params}` : ""}`,
    ),
  list: (params?: string) =>
    apiFetch<PaginatedResponse<ExpiringLot>>(
      `/api/lots${params ? `?${params}` : ""}`,
    ),
};

// ────────────────────────────────────────────────────────────
// Production
// ────────────────────────────────────────────────────────────
export const productionApi = {
  getBatches: (params?: string) =>
    apiFetch<PaginatedResponse<ProductionBatch>>(
      `/api/production/batches${params ? `?${params}` : ""}`,
    ),
};

// ────────────────────────────────────────────────────────────
// Reports
// ────────────────────────────────────────────────────────────
export const reportApi = {
  exportReport: (body: { type: string; filters: Record<string, unknown> }) =>
    apiFetch<Blob>("/api/reports/export", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
