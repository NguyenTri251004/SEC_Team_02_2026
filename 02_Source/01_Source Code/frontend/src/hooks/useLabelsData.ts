import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import type { LabelTemplate } from "../types";

const mockData: LabelTemplate[] = [
  {
    template_id: "TPL-001",
    template_name: "Standard Lot Label",
    label_type: "QR Code",
    template_content: '{"fields":["lot_id","material_name","expiration_date","quantity"]}',
    width: 100,
    height: 50,
    created_date: "2026-01-10",
    modified_date: "2026-01-10",
  },
  {
    template_id: "TPL-002",
    template_name: "Shipping Barcode",
    label_type: "Barcode",
    template_content: '{"fields":["lot_id","po_number","supplier_name"]}',
    width: 150,
    height: 30,
    created_date: "2026-01-12",
    modified_date: "2026-02-01",
  },
  {
    template_id: "TPL-003",
    template_name: "QC Sample Label",
    label_type: "QR Code",
    template_content: '{"fields":["lot_id","test_type","test_date","performed_by"]}',
    width: 80,
    height: 40,
    created_date: "2026-02-05",
    modified_date: "2026-02-05",
  },
];

export const useLabelTemplates = () => {
  return useQuery({
    queryKey: ["label-templates"],
    queryFn: async (): Promise<LabelTemplate[]> => {
      try {
        const response = await api.get("/api/labels/templates");
        const data = response.data?.data || response.data;
        if (!data || data.length === 0) return mockData;
        return data;
      } catch {
        return mockData;
      }
    },
  });
};

export const useSaveTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ isEditing, data }: { isEditing: boolean; data: Partial<LabelTemplate> }) => {
      if (isEditing) {
        return api.put(`/api/labels/templates/${data.template_id}`, data);
      }
      return api.post("/api/labels/templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["label-templates"] });
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      return api.delete(`/api/labels/templates/${templateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["label-templates"] });
    },
  });
};
