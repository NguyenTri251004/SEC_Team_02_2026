import { beforeEach, describe, expect, it, vi } from "vitest";

const { keycloakMock, mockApi, axiosCreate, getInterceptors } = vi.hoisted(() => {
  let requestInterceptor: ((config: Record<string, unknown>) => Record<string, unknown>) | undefined;
  let responseErrorInterceptor: ((error: Record<string, any>) => Promise<unknown>) | undefined;

  const hoistedApi = {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    interceptors: {
      request: {
        use: vi.fn((handler: (config: Record<string, unknown>) => Record<string, unknown>) => {
          requestInterceptor = handler;
        }),
      },
      response: {
        use: vi.fn((_: unknown, errorHandler: (error: Record<string, any>) => Promise<unknown>) => {
          responseErrorInterceptor = errorHandler;
        }),
      },
    },
  };

  return {
    keycloakMock: {
      token: "token-123",
      updateToken: vi.fn(),
      logout: vi.fn(),
    },
    mockApi: hoistedApi,
    axiosCreate: vi.fn(() => hoistedApi),
    getInterceptors: () => ({ requestInterceptor, responseErrorInterceptor }),
  };
});

vi.mock("axios", () => ({
  default: { create: axiosCreate },
  create: axiosCreate,
}));

vi.mock("../auth/keycloak", () => ({
  default: keycloakMock,
}));

import api, {
  adminApi,
  dashboardApi,
  labelApi,
  lotApi,
  materialApi,
  productionApi,
  qcApi,
  reportApi,
  transactionApi,
} from "./api";

describe("api service", () => {
  beforeEach(() => {
    mockApi.request.mockReset();
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    keycloakMock.updateToken.mockReset();
    keycloakMock.logout.mockReset();
    keycloakMock.token = "token-123";
  });

  it("exports the created axios instance", () => {
    expect(api).toBe(mockApi);
    expect(axiosCreate).toHaveBeenCalledOnce();
  });

  it("request interceptor attaches bearer token", () => {
    const { requestInterceptor } = getInterceptors();
    expect(requestInterceptor).toBeDefined();

    const config = requestInterceptor?.({ headers: {} }) as {
      headers: Record<string, string>;
    };

    expect(config.headers.Authorization).toBe("Bearer token-123");
  });

  it("response interceptor refreshes token and retries once on 401", async () => {
    const { responseErrorInterceptor } = getInterceptors();
    keycloakMock.updateToken.mockResolvedValue(undefined);
    keycloakMock.token = "new-token";
    mockApi.request.mockResolvedValue({ data: { ok: true } });

    const originalRequest: { headers: Record<string, string>; _retry?: boolean } = { headers: {} };
    const error = { response: { status: 401 }, config: originalRequest };

    const result = await responseErrorInterceptor?.(error);

    expect(keycloakMock.updateToken).toHaveBeenCalledWith(30);
    expect(originalRequest._retry).toBe(true);
    expect(originalRequest.headers.Authorization).toBe("Bearer new-token");
    expect(mockApi.request).toHaveBeenCalledWith(originalRequest);
    expect(result).toEqual({ data: { ok: true } });
  });

  it("logs out and rejects when token refresh fails", async () => {
    const { responseErrorInterceptor } = getInterceptors();
    keycloakMock.updateToken.mockRejectedValue(new Error("expired"));

    const error = {
      response: { status: 401 },
      config: { headers: {} },
    };

    await expect(responseErrorInterceptor?.(error)).rejects.toBe(error);
    expect(keycloakMock.logout).toHaveBeenCalledWith({
      redirectUri: window.location.origin,
    });
  });

  it("rejects immediately for non-401 responses", async () => {
    const { responseErrorInterceptor } = getInterceptors();
    const error = { response: { status: 500 }, config: {} };
    await expect(responseErrorInterceptor?.(error)).rejects.toBe(error);
    expect(keycloakMock.updateToken).not.toHaveBeenCalled();
  });

  it("builds request config for core APIs", async () => {
    mockApi.request.mockResolvedValue({ data: { ok: true } });

    await adminApi.getStats();
    await adminApi.getUsers("page=1");
    await adminApi.getUsers();
    await adminApi.getHealth();
    await dashboardApi.getInventorySummary();
    await dashboardApi.getInventorySummary("site=A");
    await dashboardApi.getTransactionSummary("limit=10");
    await dashboardApi.getTransactionSummary();
    await transactionApi.list();
    await transactionApi.list("limit=5");
    await materialApi.list("page=2");
    await materialApi.list();
    await qcApi.getStats("range=30d");
    await qcApi.getStats();
    await qcApi.listTests("sort=test_date:desc");
    await qcApi.listTests();
    await qcApi.getQueue();
    await qcApi.getQueue("limit=2");
    await qcApi.getQueueCount();
    await lotApi.getExpiring("days=30");
    await lotApi.getExpiring();
    await lotApi.list();
    await lotApi.list("status=Accepted");
    await productionApi.getBatches("limit=5");
    await productionApi.getBatches();
    await productionApi.getBatchById("batch-1");
    await productionApi.updateBatchStatus("batch-1", "Completed");
    await productionApi.consumeMaterial("batch-1", "cmp-1", 25);
    await productionApi.getTraceability("batch-1");
    await labelApi.getAllTemplates();
    await labelApi.getTemplateById("tpl-1");
    await labelApi.getTemplatesByLabelType("lot");
    await labelApi.createTemplate({
      template_name: "Lot Label",
      label_type: "lot",
      template_content: "<xml />",
    });
    await labelApi.updateTemplate("tpl-1", { template_name: "Updated" });
    await labelApi.deleteTemplate("tpl-1");
    await labelApi.generateLabel({} as never);
    await labelApi.generateLabelFromTemplate({} as never);
    await labelApi.getAllLabels();
    await labelApi.getLabelById("lbl-1");
    await labelApi.deleteLabel("lbl-1");

    expect(mockApi.request).toHaveBeenCalledWith({
      url: "/api/admin/stats",
      method: "GET",
    });
    expect(mockApi.request).toHaveBeenCalledWith({
      url: "/api/admin/users?page=1",
      method: "GET",
    });
    expect(mockApi.request).toHaveBeenCalledWith({
      url: "/api/admin/users",
      method: "GET",
    });
    expect(mockApi.request).toHaveBeenCalledWith({
      url: "/api/dashboard/inventory-summary",
      method: "GET",
    });
    expect(mockApi.request).toHaveBeenCalledWith({
      url: "/api/dashboard/inventory-summary?site=A",
      method: "GET",
    });
    expect(mockApi.request).toHaveBeenCalledWith({
      url: "/api/dashboard/transaction-summary",
      method: "GET",
    });
    expect(mockApi.request).toHaveBeenCalledWith({
      url: "/api/qc/stats?range=30d",
      method: "GET",
    });
    expect(mockApi.request).toHaveBeenCalledWith({
      url: "/api/qc/stats",
      method: "GET",
    });
    expect(mockApi.request).toHaveBeenCalledWith({
      url: "/api/production/batches/batch-1/components/cmp-1/consume",
      method: "POST",
      data: { actual_quantity: 25 },
    });
    expect(mockApi.request).toHaveBeenCalledWith({
      url: "/api/labels/lbl-1",
      method: "DELETE",
    });
  });

  it("uses direct get/post methods for report APIs", async () => {
    mockApi.get.mockResolvedValue({ data: { data: [{ row: 1 }] } });
    mockApi.post.mockResolvedValue({ data: new Blob(["a"]) });

    const inventory = await reportApi.getInventoryReport({ site: "A" });
    const transactions = await reportApi.getTransactionReport();
    const audit = await reportApi.getAuditLog({ actor: "alice" });
    const exported = await reportApi.exportReport({
      type: "inventory",
      filters: { site: "A" },
    });

    expect(mockApi.get).toHaveBeenCalledWith("/api/reports/inventory", {
      params: { site: "A" },
    });
    expect(mockApi.get).toHaveBeenCalledWith("/api/reports/transactions", {
      params: undefined,
    });
    expect(mockApi.get).toHaveBeenCalledWith("/api/reports/audit-log", {
      params: { actor: "alice" },
    });
    expect(mockApi.post).toHaveBeenCalledWith(
      "/api/reports/export",
      { type: "inventory", filters: { site: "A" } },
      { responseType: "blob" },
    );
    expect(inventory).toEqual({ data: [{ row: 1 }] });
    expect(transactions).toEqual({ data: [{ row: 1 }] });
    expect(audit).toEqual({ data: [{ row: 1 }] });
    expect(exported).toBeInstanceOf(Blob);
  });
});
