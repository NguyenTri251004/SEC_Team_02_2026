import { beforeEach, describe, expect, it, vi } from "vitest";
import { labelApi } from "../services/api";
import {
  useCreateTemplate,
  useDeleteLabel,
  useDeleteTemplate,
  useGenerateLabel,
  useGenerateLabelFromTemplate,
  useGeneratedLabels,
  useTemplate,
  useTemplates,
  useUpdateTemplate,
} from "./useLabelsData";

const invalidateQueries = vi.fn();
const useQueryMock = vi.fn((options: unknown) => options);
const useMutationMock = vi.fn((options: unknown) => options);

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: unknown) => useQueryMock(options),
  useMutation: (options: unknown) => useMutationMock(options),
  useQueryClient: () => ({ invalidateQueries }),
}));

vi.mock("../services/api", () => ({
  labelApi: {
    getAllTemplates: vi.fn(),
    getTemplateById: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    getAllLabels: vi.fn(),
    generateLabel: vi.fn(),
    generateLabelFromTemplate: vi.fn(),
    deleteLabel: vi.fn(),
  },
}));

describe("useLabelsData hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries templates, single template, and generated labels", async () => {
    vi.mocked(labelApi.getAllTemplates).mockResolvedValue({ data: [{ template_id: "T-1" }] } as never);
    vi.mocked(labelApi.getTemplateById).mockResolvedValue({ data: { template_id: "T-1" } } as never);
    vi.mocked(labelApi.getAllLabels).mockResolvedValue({ data: [{ label_id: "L-1" }] } as never);

    const templates = useTemplates() as any;
    expect(await templates.queryFn()).toEqual([{ template_id: "T-1" }]);

    const template = useTemplate("T-1") as any;
    expect(await template.queryFn()).toEqual({ template_id: "T-1" });
    expect(template.enabled).toBe(true);

    const labels = useGeneratedLabels() as any;
    expect(await labels.queryFn()).toEqual([{ label_id: "L-1" }]);
  });

  it("falls back to empty arrays when API omits list payloads", async () => {
    vi.mocked(labelApi.getAllTemplates).mockResolvedValue({ data: undefined } as never);
    vi.mocked(labelApi.getAllLabels).mockResolvedValue({ data: undefined } as never);

    const templates = useTemplates() as any;
    expect(await templates.queryFn()).toEqual([]);

    const labels = useGeneratedLabels() as any;
    expect(await labels.queryFn()).toEqual([]);
  });

  it("throws for missing template id", async () => {
    const template = useTemplate(undefined) as any;
    await expect(template.queryFn()).rejects.toThrow("Template ID is required");
    expect(template.enabled).toBe(false);
  });

  it("runs template and label mutations with invalidations", async () => {
    vi.mocked(labelApi.createTemplate).mockResolvedValue({ data: { template_id: "T-1" } } as never);
    vi.mocked(labelApi.updateTemplate).mockResolvedValue({ data: { template_id: "T-1" } } as never);
    vi.mocked(labelApi.deleteTemplate).mockResolvedValue({ data: {} } as never);
    vi.mocked(labelApi.generateLabel).mockResolvedValue({ data: { label_id: "L-1" } } as never);
    vi.mocked(labelApi.generateLabelFromTemplate).mockResolvedValue({ data: { label_id: "L-2" } } as never);
    vi.mocked(labelApi.deleteLabel).mockResolvedValue({ data: {} } as never);

    const createTemplate = useCreateTemplate() as any;
    await createTemplate.mutationFn({
      template_name: "Lot",
      label_type: "lot",
      template_content: "<xml/>",
    });
    createTemplate.onSuccess();

    const updateTemplate = useUpdateTemplate() as any;
    await updateTemplate.mutationFn({
      id: "T-1",
      data: { template_name: "Updated" },
    });
    updateTemplate.onSuccess(undefined, { id: "T-1", data: {} });

    const deleteTemplate = useDeleteTemplate() as any;
    await deleteTemplate.mutationFn("T-1");
    deleteTemplate.onSuccess();

    const generate = useGenerateLabel() as any;
    await generate.mutationFn({} as never);
    generate.onSuccess();

    const generateFromTemplate = useGenerateLabelFromTemplate() as any;
    await generateFromTemplate.mutationFn({} as never);
    generateFromTemplate.onSuccess();

    const deleteLabel = useDeleteLabel() as any;
    await deleteLabel.mutationFn("L-1");
    deleteLabel.onSuccess();

    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["label-templates"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["label-template", "T-1"] });
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: ["generated-labels"] });
  });
});
