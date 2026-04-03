import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/api";
import {
  useAddComponent,
  useBatchComponents,
  useBatches,
  useConsumeMaterial,
  useCreateBatch,
  useTraceability,
  useUpdateBatchStatus,
} from "./useBatchesData";

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
    patch: vi.fn(),
  },
}));

describe("useBatchesData hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed arrays and handles batchId conditions", async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [{ batch_id: "B-1" }] } });
    const batches = useBatches();
    expect(await batches.queryFn()).toEqual([{ batch_id: "B-1" }]);

    const componentsWithoutId = useBatchComponents(null);
    expect(await componentsWithoutId.queryFn()).toEqual([]);
    expect(componentsWithoutId.enabled).toBe(false);

    vi.mocked(api.get).mockResolvedValue({ data: { data: [{ component_id: "C-1" }] } });
    const componentsWithId = useBatchComponents("B-1");
    expect(await componentsWithId.queryFn()).toEqual([{ component_id: "C-1" }]);

    const traceability = useTraceability("B-1");
    vi.mocked(api.get).mockResolvedValue({ data: { data: [{ lot_id: "L-1" }] } });
    expect(await traceability.queryFn()).toEqual([{ lot_id: "L-1" }]);

    vi.mocked(api.get).mockResolvedValue({ data: { data: { invalid: true } } });
    const nonArrayBatches = useBatches();
    expect(await nonArrayBatches.queryFn()).toEqual([]);

    vi.mocked(api.get).mockRejectedValue(new Error("network"));
    const failedBatches = useBatches();
    expect(await failedBatches.queryFn()).toEqual([]);

    const failedComponents = useBatchComponents("B-1");
    expect(await failedComponents.queryFn()).toEqual([]);

    const failedTraceability = useTraceability("B-1");
    expect(await failedTraceability.queryFn()).toEqual([]);
  });

  it("handles mutation endpoints and invalidation", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.patch).mockResolvedValue({ data: {} });

    const createBatch = useCreateBatch();
    await createBatch.mutationFn({ batch_number: "B-1" });
    expect(api.post).toHaveBeenCalledWith("/api/production/batches", { batch_number: "B-1" });
    createBatch.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["batches"] });

    const addComponent = useAddComponent();
    await addComponent.mutationFn({
      batchId: "B-1",
      data: { lot_id: "L-1", planned_quantity: 2, unit_of_measure: "kg" },
    });
    expect(api.post).toHaveBeenCalledWith("/api/production/batches/B-1/components", {
      lot_id: "L-1",
      planned_quantity: 2,
      unit_of_measure: "kg",
    });
    addComponent.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["batch-components"] });

    const updateStatus = useUpdateBatchStatus();
    await updateStatus.mutationFn({ batchId: "B-1", status: "Completed" });
    expect(api.patch).toHaveBeenCalledWith("/api/production/batches/B-1/status", {
      status: "Completed",
    });
    updateStatus.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["production", "batches"] });

    const consume = useConsumeMaterial();
    await consume.mutationFn({
      batchId: "B-1",
      componentId: "C-1",
      actualQuantity: 10,
    });
    expect(api.post).toHaveBeenCalledWith(
      "/api/production/batches/B-1/components/C-1/consume",
      { actual_quantity: 10 },
    );
    consume.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["transactions"] });
  });
});
