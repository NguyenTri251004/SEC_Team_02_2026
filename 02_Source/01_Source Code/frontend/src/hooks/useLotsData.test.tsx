import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/api";
import {
  useDeleteLot,
  useLots,
  useParentLots,
  useSaveLot,
  useUpdateLotStatus,
} from "./useLotsData";

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
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe("useLotsData hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to mock data when lots endpoint returns empty", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });

    const query = useLots();
    const lots = await query.queryFn();

    expect(Array.isArray(lots)).toBe(true);
    expect(lots.length).toBeGreaterThan(0);
    expect(lots[0].lot_id).toBe("LOT-001");
  });

  it("uses API data when available", async () => {
    const apiLots = [{ lot_id: "LOT-X" }];
    vi.mocked(api.get).mockResolvedValue({ data: { data: apiLots } });

    const query = useLots();
    const lots = await query.queryFn();
    expect(lots).toEqual(apiLots);

    vi.mocked(api.get).mockResolvedValue({ data: apiLots });
    const directDataQuery = useLots();
    const directDataLots = await directDataQuery.queryFn();
    expect(directDataLots).toEqual(apiLots);
  });

  it("save mutation switches between create and update and invalidates relevant caches", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.put).mockResolvedValue({ data: {} });

    const mutation = useSaveLot();

    await mutation.mutationFn({ isEditing: false, data: { lot_id: "LOT-9" } });
    expect(api.post).toHaveBeenCalledWith("/api/lots", { lot_id: "LOT-9" });

    await mutation.mutationFn({ isEditing: true, data: { lot_id: "LOT-9" } });
    expect(api.put).toHaveBeenCalledWith("/api/lots/LOT-9", { lot_id: "LOT-9" });

    mutation.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["lots"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["admin", "stats"] });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["dashboard", "inventory-summary"],
    });
  });

  it("updates and deletes lots with expected API calls", async () => {
    vi.mocked(api.patch).mockResolvedValue({ data: {} });
    vi.mocked(api.delete).mockResolvedValue({ data: {} });

    const updateMutation = useUpdateLotStatus();
    await updateMutation.mutationFn({
      lotId: "LOT-7",
      status: "Accepted",
      reason: "verified",
    });
    expect(api.patch).toHaveBeenCalledWith("/api/lots/LOT-7/status", {
      status: "Accepted",
      reason: "verified",
    });
    updateMutation.onSuccess();

    const deleteMutation = useDeleteLot();
    await deleteMutation.mutationFn("LOT-7");
    expect(api.delete).toHaveBeenCalledWith("/api/lots/LOT-7");
    deleteMutation.onSuccess();
  });

  it("parent lots query returns empty array on API failure", async () => {
    vi.mocked(api.get).mockRejectedValue(new Error("down"));

    const query = useParentLots();
    const data = await query.queryFn();

    expect(data).toEqual([]);
  });

  it("parent lots query returns empty array when payload is not an array", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: {} } });
    const query = useParentLots();
    const data = await query.queryFn();
    expect(data).toEqual([]);
  });
});
