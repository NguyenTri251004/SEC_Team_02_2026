import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { labelApi } from "../services/api";
import type { GenerateLabelInput, GenerateLabelFromTemplateInput, GeneratedLabel, LabelTemplate } from "../types";

// ============================================================
// Template Hooks
// ============================================================

// Get all label templates
export const useTemplates = () => {
  return useQuery({
    queryKey: ["label-templates"],
    queryFn: async (): Promise<LabelTemplate[]> => {
      const response = await labelApi.getAllTemplates();
      return response.data || [];
    },
  });
};

// Get template by ID
export const useTemplate = (id: string | undefined) => {
  return useQuery({
    queryKey: ["label-template", id],
    queryFn: async (): Promise<LabelTemplate> => {
      if (!id) throw new Error("Template ID is required");
      const response = await labelApi.getTemplateById(id);
      return response.data;
    },
    enabled: !!id,
  });
};

// Create new template
export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      template_name: string;
      label_type: string;
      template_content: string;
      width?: number;
      height?: number;
    }): Promise<LabelTemplate> => {
      const response = await labelApi.createTemplate(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["label-templates"] });
    },
  });
};

// Update template
export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<LabelTemplate>;
    }): Promise<LabelTemplate> => {
      const response = await labelApi.updateTemplate(id, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["label-templates"] });
      queryClient.invalidateQueries({ queryKey: ["label-template", variables.id] });
    },
  });
};

// Delete template
export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return labelApi.deleteTemplate(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["label-templates"] });
    },
  });
};

// ============================================================
// Label Generation Hooks
// ============================================================

// Get all generated labels
export const useGeneratedLabels = () => {
  return useQuery({
    queryKey: ["generated-labels"],
    queryFn: async (): Promise<GeneratedLabel[]> => {
      const response = await labelApi.getAllLabels();
      return response.data || [];
    },
  });
};

// Generate new label (simple material-based)
export const useGenerateLabel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateLabelInput): Promise<GeneratedLabel> => {
      const response = await labelApi.generateLabel(input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated-labels"] });
    },
  });
};

// Generate label from template
export const useGenerateLabelFromTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateLabelFromTemplateInput): Promise<GeneratedLabel> => {
      const response = await labelApi.generateLabelFromTemplate(input);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated-labels"] });
    },
  });
};

// Delete generated label
export const useDeleteLabel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (labelId: string) => {
      return labelApi.deleteLabel(labelId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated-labels"] });
    },
  });
};
