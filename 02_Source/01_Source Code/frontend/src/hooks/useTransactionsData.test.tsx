import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/api";
import { useRecordTransaction, useTransactions } from "./useTransactionsData";

const invalidateQueries = vi.fn();
const useQueryMock = vi.fn((options: unknown) => options);
const useMutationMock = vi.fn((options: unknown) => options);

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock("../services/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("useTransactionsData hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to mock transactions when API fails or returns empty", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [] } });
    let query = useTransactions() as any;
    let result = await query.queryFn();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].transaction_id).toBe("TXN-001");

    vi.mocked(api.get).mockRejectedValueOnce(new Error("network"));
    query = useTransactions() as any;
    result = await query.queryFn();
    expect(result.length).toBeGreaterThan(0);
  });

  it("records transaction and invalidates related dashboard caches", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    const mutation = useRecordTransaction() as any;

    await mutation.mutationFn({ lot_id: "LOT-1", quantity: 10 });
    expect(api.post).toHaveBeenCalledWith("/api/transactions", {
      lot_id: "LOT-1",
      quantity: 10,
    });

    mutation.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["transactions"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["lots"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin", "stats"] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard", "transaction-summary"],
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard", "inventory-summary"],
    });
  });
});
