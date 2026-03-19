import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api, { qcApi } from "../services/api";
import type { QCTest, QCQueueItem } from "../types";

export const useQCTests = () => {
  return useQuery({
    queryKey: ["qc-tests"],
    queryFn: async (): Promise<QCTest[]> => {
      try {
        const response = await api.get("/api/qc/tests");
        const data = response.data?.data || response.data;
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
  });
};

export const useCreateQCTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<QCTest>) => {
      return api.post("/api/qc/tests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qc-tests"] });
      queryClient.invalidateQueries({ queryKey: ["qc-queue"] });
      queryClient.invalidateQueries({ queryKey: ["qc", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["qc", "stats"] });
    },
  });
};

export const useUpdateTestResult = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      testId,
      data,
    }: {
      testId: string;
      data: { test_result: string; result_status: string; verified_by: string | null };
    }) => {
      return api.put(`/api/qc/tests/${testId}`, data);
    },
    onSuccess: () => {
      // Invalidate QCPage hooks
      queryClient.invalidateQueries({ queryKey: ["qc-tests"] });
      queryClient.invalidateQueries({ queryKey: ["qc-queue"] });

      // Invalidate dashboard hooks
      queryClient.invalidateQueries({ queryKey: ["qc", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["qc", "stats"] });
    },
  });
};

export const useApproveLot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lotId }: { lotId: string }) => {
      return api.post(`/api/qc/approve/${lotId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qc-tests"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["qc-queue"] });
      queryClient.invalidateQueries({ queryKey: ["qc", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["qc", "stats"] });
    },
  });
};

export const useRejectLot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lotId, reason }: { lotId: string; reason: string }) => {
      return api.post(`/api/qc/reject/${lotId}`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qc-tests"] });
      queryClient.invalidateQueries({ queryKey: ["lots"] });
      queryClient.invalidateQueries({ queryKey: ["qc-queue"] });
      queryClient.invalidateQueries({ queryKey: ["qc", "queue"] });
      queryClient.invalidateQueries({ queryKey: ["qc", "stats"] });
    },
  });
};

export const useQCQueue = (status?: string) => {
  return useQuery({
    queryKey: ["qc-queue", status],
    queryFn: async (): Promise<QCQueueItem[]> => {
      const params = status ? `status=${encodeURIComponent(status)}` : undefined;
      const response = await qcApi.getQueue(params);
      return response.data || [];
    },
  });
};
