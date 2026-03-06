import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import type { QCTest } from "../types";

const mockData: QCTest[] = [
  {
    test_id: "QC-001",
    lot_id: "LOT-001",
    test_type: "Identity",
    test_method: "HPLC Analysis",
    test_date: "2026-01-16T10:00:00Z",
    test_result: "98.5% purity",
    acceptance_criteria: ">= 98.0% purity",
    result_status: "Pass",
    performed_by: "qc_analyst1",
    verified_by: "qc_supervisor",
    created_date: "2026-01-16T10:00:00Z",
    modified_date: "2026-01-16T15:00:00Z",
  },
  {
    test_id: "QC-002",
    lot_id: "LOT-002",
    test_type: "Microbial",
    test_method: "USP <61> Bioburden",
    test_date: "2026-02-02T09:00:00Z",
    test_result: null,
    acceptance_criteria: "< 100 CFU/mL",
    result_status: "Pending",
    performed_by: "qc_analyst2",
    verified_by: null,
    created_date: "2026-02-02T09:00:00Z",
    modified_date: "2026-02-02T09:00:00Z",
  },
  {
    test_id: "QC-003",
    lot_id: "LOT-003",
    test_type: "Potency",
    test_method: "UV Spectroscopy",
    test_date: "2026-02-21T11:30:00Z",
    test_result: "85.2% potency",
    acceptance_criteria: ">= 95.0% potency",
    result_status: "Fail",
    performed_by: "qc_analyst1",
    verified_by: "qc_supervisor",
    created_date: "2026-02-21T11:30:00Z",
    modified_date: "2026-02-22T09:00:00Z",
  },
  {
    test_id: "QC-004",
    lot_id: "LOT-001",
    test_type: "Dissolution",
    test_method: "USP Apparatus II",
    test_date: "2026-01-17T14:00:00Z",
    test_result: "99.1% in 30 min",
    acceptance_criteria: ">= 80% in 30 min",
    result_status: "Pass",
    performed_by: "qc_analyst2",
    verified_by: "qc_supervisor",
    created_date: "2026-01-17T14:00:00Z",
    modified_date: "2026-01-17T16:00:00Z",
  },
];

export const useQCTests = () => {
  return useQuery({
    queryKey: ["qc-tests"],
    queryFn: async (): Promise<QCTest[]> => {
      try {
        const response = await api.get("/api/qc/tests");
        const data = response.data?.data || response.data;
        if (!data || data.length === 0) return mockData;
        return data;
      } catch {
        return mockData;
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
      queryClient.invalidateQueries({ queryKey: ["qc-tests"] });
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
    },
  });
};
