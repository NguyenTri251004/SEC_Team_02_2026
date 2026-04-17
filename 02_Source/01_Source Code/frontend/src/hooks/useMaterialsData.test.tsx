import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/api";
import { useDeleteMaterial, useMaterials, useSaveMaterial } from "./useMaterialsData";

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
    delete: vi.fn(),
  },
}));

describe("useMaterialsData hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to mock data on empty response and on error", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ data: { data: [] } });
    let query = useMaterials() as any;
    let result = await query.queryFn();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].material_id).toBe("MAT-001");

    vi.mocked(api.get).mockRejectedValueOnce(new Error("backend down"));
    query = useMaterials() as any;
    result = await query.queryFn();
    expect(result.length).toBeGreaterThan(0);
  });

  it("returns API materials when available", async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [{ material_id: "MAT-9", material_name: "X" }] },
    });

    const query = useMaterials() as any;
    const result = await query.queryFn();
    expect(result[0].material_id).toBe("MAT-9");
  });

  it("save and delete mutations call the correct endpoints and invalidate cache", async () => {
    vi.mocked(api.post).mockResolvedValue({ data: {} });
    vi.mocked(api.put).mockResolvedValue({ data: {} });
    vi.mocked(api.delete).mockResolvedValue({ data: {} });

    const saveMutation = useSaveMaterial() as any;
    await saveMutation.mutationFn({ isEditing: false, data: { material_id: "MAT-1" } });
    expect(api.post).toHaveBeenCalledWith("/api/materials", { material_id: "MAT-1" });
    await saveMutation.mutationFn({ isEditing: true, data: { material_id: "MAT-1" } });
    expect(api.put).toHaveBeenCalledWith("/api/materials/MAT-1", { material_id: "MAT-1" });
    saveMutation.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["materials"] });

    const deleteMutation = useDeleteMaterial() as any;
    await deleteMutation.mutationFn("MAT-1");
    expect(api.delete).toHaveBeenCalledWith("/api/materials/MAT-1");
    deleteMutation.onSuccess();
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["materials"] });
  });
});
