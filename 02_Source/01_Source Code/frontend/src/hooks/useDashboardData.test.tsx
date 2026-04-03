import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  useAdminHealth,
  useAdminStats,
  useAdminUsers,
  useExpiringLots,
  useInventorySummary,
  useLots,
  useMaterials,
  useProductionBatches,
  useQCQueue,
  useQCStats,
  useRecentQCTests,
  useRecentTransactions,
  useStockByStatus,
  useTransactionSummary,
} from "./useDashboardData";
import {
  adminApi,
  dashboardApi,
  lotApi,
  materialApi,
  productionApi,
  qcApi,
  transactionApi,
} from "../services/api";

const useQueryMock = vi.fn((options: unknown) => options);

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
}));

vi.mock("../services/api", () => ({
  adminApi: {
    getStats: vi.fn(),
    getUsers: vi.fn(),
    getHealth: vi.fn(),
  },
  dashboardApi: {
    getInventorySummary: vi.fn(),
    getTransactionSummary: vi.fn(),
  },
  transactionApi: {
    list: vi.fn(),
  },
  materialApi: {
    list: vi.fn(),
  },
  qcApi: {
    getStats: vi.fn(),
    getQueue: vi.fn(),
    listTests: vi.fn(),
  },
  lotApi: {
    getExpiring: vi.fn(),
    list: vi.fn(),
  },
  productionApi: {
    getBatches: vi.fn(),
  },
}));

describe("useDashboardData hooks", () => {
  it("binds query keys and functions for dashboard API hooks", async () => {
    vi.mocked(adminApi.getStats).mockResolvedValue({ data: {} });
    vi.mocked(adminApi.getUsers).mockResolvedValue({ data: [] });
    vi.mocked(adminApi.getHealth).mockResolvedValue({ data: {} });
    vi.mocked(dashboardApi.getInventorySummary).mockResolvedValue({ data: {} });
    vi.mocked(dashboardApi.getTransactionSummary).mockResolvedValue({ data: {} });
    vi.mocked(transactionApi.list).mockResolvedValue({ data: [] });
    vi.mocked(materialApi.list).mockResolvedValue({ data: [] });
    vi.mocked(qcApi.getStats).mockResolvedValue({ data: {} });
    vi.mocked(qcApi.getQueue).mockResolvedValue({ data: [] });
    vi.mocked(qcApi.listTests).mockResolvedValue({ data: [] });
    vi.mocked(lotApi.getExpiring).mockResolvedValue({ data: [] });
    vi.mocked(lotApi.list).mockResolvedValue({ data: [] });
    vi.mocked(productionApi.getBatches).mockResolvedValue({ data: [] });

    const adminStats = useAdminStats();
    await adminStats.queryFn();
    expect(adminApi.getStats).toHaveBeenCalled();
    expect(adminStats.refetchInterval).toBe(15000);

    const adminUsers = useAdminUsers();
    await adminUsers.queryFn();
    expect(adminApi.getUsers).toHaveBeenCalledWith("sort=last_login_at:desc&limit=10");

    const adminHealth = useAdminHealth();
    await adminHealth.queryFn();
    expect(adminApi.getHealth).toHaveBeenCalled();

    const inventorySummary = useInventorySummary();
    await inventorySummary.queryFn();
    expect(dashboardApi.getInventorySummary).toHaveBeenCalled();

    const transactionSummary = useTransactionSummary();
    await transactionSummary.queryFn();
    expect(dashboardApi.getTransactionSummary).toHaveBeenCalled();

    const recentTransactions = useRecentTransactions();
    await recentTransactions.queryFn();
    expect(transactionApi.list).toHaveBeenCalledWith("limit=10&sort=transaction_date:desc");

    const materials = useMaterials();
    await materials.queryFn();
    expect(materialApi.list).toHaveBeenCalledWith("page=1&limit=1");

    const qcStats = useQCStats();
    await qcStats.queryFn();
    expect(qcApi.getStats).toHaveBeenCalledWith(undefined);

    const qcQueue = useQCQueue();
    await qcQueue.queryFn();
    expect(qcApi.getQueue).toHaveBeenCalledWith("page=1&limit=20&sort=received_date:asc");

    const tests = useRecentQCTests();
    await tests.queryFn();
    expect(qcApi.listTests).toHaveBeenCalledWith("limit=10&sort=test_date:desc");

    const expiring = useExpiringLots();
    await expiring.queryFn();
    expect(lotApi.getExpiring).toHaveBeenCalledWith("days=30&sort=expiration_date:asc&limit=10");

    const lots = useLots();
    await lots.queryFn();
    expect(lotApi.list).toHaveBeenCalledWith("status=Accepted,Quarantine&sort=expiration_date:asc&limit=100");

    const batches = useProductionBatches();
    await batches.queryFn();
    expect(productionApi.getBatches).toHaveBeenCalledWith(
      "status=In Progress,Planned&sort=manufacture_date:desc&limit=10",
    );
  });

  it("returns status summary for existing stock and null when not found", () => {
    const inventorySummary = {
      by_status: [
        {
          status: "Accepted",
          lot_count: 12,
          quantities_by_unit: [
            { unit_of_measure: "kg", total_quantity: 420 },
            { unit_of_measure: "ea", total_quantity: 5 },
          ],
        },
      ],
    } as any;

    const { result, rerender } = renderHook(
      ({ status }) => useStockByStatus(inventorySummary, status),
      { initialProps: { status: "Accepted" as any } },
    );

    expect(result.current).toEqual({
      status: "Accepted",
      lotCount: 12,
      quantitiesFormatted: "420 kg, 5 ea",
    });

    rerender({ status: "Rejected" as any });
    expect(result.current).toBeNull();
  });
});
