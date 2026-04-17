import { beforeEach, describe, expect, it, vi } from "vitest";
import api, { qcApi } from "../services/api";
import {
  useApproveLot,
  useCreateQCTest,
  useQCQueue,
  useQCTests,
  useRejectLot,
  useUpdateTestResult,
} from "./useQCData";

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
  },
  qcApi: {
    getQueue: vi.fn(),
  },
}));

describe("useQCData hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns test list and fallback empty array on failure", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [{ test_id: "T-1" }] } });
    const query = useQCTests();
    expect(await query.queryFn()).toEqual([{ test_id: "T-1" }]);

    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: { test_id: "bad-shape" } } });
    const nonArrayQuery = useQCTests();
    expect(await nonArrayQuery.queryFn()).toEqual([]);

    vi.mocked(api.get).mockRejectedValueOnce(new Error("down"));
    const failedQuery = useQCTests();
    expect(await failedQuery.queryFn()).toEqual([]);
  });

  it("calls mutation endpoints and invalidates related keys", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.put).mockResolvedValue({ data: {} });

    const create = useCreateQCTest();
    await create.mutationFn({ lot_id: "LOT-1" });
    expect(api.post).toHaveBeenCalledWith("/api/qc/tests", { lot_id: "LOT-1" });
    create.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["qc-tests"] });

    const update = useUpdateTestResult();
    await update.mutationFn({
      testId: "T-1",
      data: { test_result: "Pass", result_status: "Completed", verified_by: "u1" },
    });
    expect(api.put).toHaveBeenCalledWith("/api/qc/tests/T-1", {
      test_result: "Pass",
      result_status: "Completed",
      verified_by: "u1",
    });
    update.onSuccess();

    const approve = useApproveLot();
    await approve.mutationFn({ lotId: "LOT-1" });
    expect(api.post).toHaveBeenCalledWith("/api/qc/approve/LOT-1");
    approve.onSuccess();

    const reject = useRejectLot();
    await reject.mutationFn({ lotId: "LOT-1", reason: "fail spec" });
    expect(api.post).toHaveBeenCalledWith("/api/qc/reject/LOT-1", { reason: "fail spec" });
    reject.onSuccess();
  });

  it("queries qc queue with optional status parameter", async () => {
    vi.mocked(qcApi.getQueue).mockResolvedValue({ data: [{ lot_id: "L-1" }] } as never);
    const query = useQCQueue("Quarantine");
    expect(await query.queryFn()).toEqual([{ lot_id: "L-1" }]);
    expect(qcApi.getQueue).toHaveBeenCalledWith("status=Quarantine");

    const queryWithoutStatus = useQCQueue();
    expect(await queryWithoutStatus.queryFn()).toEqual([{ lot_id: "L-1" }]);
    expect(qcApi.getQueue).toHaveBeenCalledWith(undefined);
  });
});
