import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import type { GenerateLabelInput, GeneratedLabel } from "../types";

// Get all generated labels
export const useGeneratedLabels = () => {
  return useQuery({
    queryKey: ["generated-labels"],
    queryFn: async (): Promise<GeneratedLabel[]> => {
      const response = await api.get("/api/labels");
      return response.data?.data || response.data || [];
    },
  });
};

// Generate new label
export const useGenerateLabel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerateLabelInput): Promise<GeneratedLabel> => {
      const response = await api.post("/api/labels/generate", input);
      return response.data?.data || response.data;
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
      return api.delete(`/api/labels/${labelId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["generated-labels"] });
    },
  });
};
