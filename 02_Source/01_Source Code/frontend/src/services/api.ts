import axios, { type AxiosRequestConfig } from "axios";
import keycloak from "../auth/keycloak";

import type {
  AdminStats,
  Material,
  InventorySummary,
  TransactionSummary,
  QCStats,
  QCQueueItem,
  ExpiringLot,
  InventoryLot,
  InventoryTransaction,
  ProductionBatch,
  User,
  PaginatedResponse,
  ApiResponse,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const api = axios.create({
  baseURL: BASE_URL,
});

// ────────────────────────────────────────────────────────────
// Request interceptor: attach Keycloak token
// ────────────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  if (keycloak.token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});

// ────────────────────────────────────────────────────────────
// Response interceptor: refresh token on 401 then retry once
// ────────────────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      keycloak.token &&
      !originalRequest._retry
    ) {
      try {
        originalRequest._retry = true;

        await keycloak.updateToken(30);
        originalRequest.headers.Authorization = `Bearer ${keycloak.token}`;

        return api.request(originalRequest); // use api instead of axios
      } catch {
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
};

// ────────────────────────────────────────────────────────────
// Reports
// ────────────────────────────────────────────────────────────
export const reportApi = {
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

export default api;
