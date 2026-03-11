import { useQuery } from "@tanstack/react-query";
import { reportApi } from "../services/api";

export function useInventoryReport(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ["reports", "inventory", filters],
    queryFn: () => reportApi.getInventoryReport(filters),
    select: (res) => res.data,
  });
}

export function useTransactionReport(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ["reports", "transactions", filters],
    queryFn: () => reportApi.getTransactionReport(filters),
    select: (res) => res.data,
  });
}

export function useAuditLog(filters?: Record<string, string>) {
  return useQuery({
    queryKey: ["reports", "audit-log", filters],
    queryFn: () => reportApi.getAuditLog(filters),
    select: (res) => res.data,
  });
}
