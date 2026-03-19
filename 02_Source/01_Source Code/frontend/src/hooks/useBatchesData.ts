import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import type { ProductionBatch, BatchComponent } from "../types";

export const useBatches = () => {
  return useQuery({
    queryKey: ["batches"],
    queryFn: async (): Promise<ProductionBatch[]> => {
      try {
        const response = await api.get("/api/production/batches");
        const data = response.data?.data || response.data;
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });
};

export const useBatchComponents = (batchId: string | null) => {
  return useQuery({
    queryKey: ["batch-components", batchId],
    queryFn: async (): Promise<BatchComponent[]> => {
      if (!batchId) return [];
      try {
        const response = await api.get(`/api/production/batches/${batchId}/components`);
        const data = response.data?.data || response.data;
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: !!batchId,
  });
};

export const useCreateBatch = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<ProductionBatch>) => {
      return api.post("/api/production/batches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
  });
};

export const useAddComponent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      data,
    }: {
      batchId: string;
      data: { lot_id: string; planned_quantity: number; unit_of_measure: string };
    }) => {
      return api.post(`/api/production/batches/${batchId}/components`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-components"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
  });
};

export const useUpdateBatchStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ batchId, status }: { batchId: string; status: string }) => {
      return api.patch(`/api/production/batches/${batchId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["batch-components"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["production", "batches"] });
    },
  });
};

export const useConsumeMaterial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      batchId,
      componentId,
      actualQuantity,
    }: {
      batchId: string;
      componentId: string;
      actualQuantity: number;
    }) => {
      return api.post(`/api/production/batches/${batchId}/components/${componentId}/consume`, {
        actual_quantity: actualQuantity,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["batch-components"] });
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
};

export const useTraceability = (batchId: string | null) => {
  return useQuery({
    queryKey: ["traceability", batchId],
    queryFn: async () => {
      if (!batchId) return [];
      try {
        const response = await api.get(`/api/production/batches/${batchId}/traceability`);
        const data = response.data?.data || response.data;
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: !!batchId,
  });
};
