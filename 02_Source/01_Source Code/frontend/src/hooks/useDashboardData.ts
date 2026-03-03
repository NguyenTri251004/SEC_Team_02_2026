import { useQuery } from "@tanstack/react-query";
import {
  adminApi,
  dashboardApi,
  transactionApi,
  qcApi,
  lotApi,
  productionApi,
} from "../services/api";

// ── Admin ────────────────────────────────────────────────────────

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin", "stats"],
    queryFn: () => adminApi.getStats(),
    refetchInterval: 60_000,
  });
}

export function useAdminUsers(query = "sort=last_login_at:desc&limit=10") {
  return useQuery({
    queryKey: ["admin", "users", query],
    queryFn: () => adminApi.getUsers(query),
    refetchInterval: 60_000,
  });
}

// ── Inventory ────────────────────────────────────────────────────

export function useInventorySummary() {
  return useQuery({
    queryKey: ["dashboard", "inventory-summary"],
    queryFn: () => dashboardApi.getInventorySummary(),
    refetchInterval: 30_000,
  });
}

export function useTransactionSummary() {
  return useQuery({
    queryKey: ["dashboard", "transaction-summary"],
    queryFn: () => dashboardApi.getTransactionSummary(),
    refetchInterval: 30_000,
  });
}

// ── Transactions ─────────────────────────────────────────────────

export function useRecentTransactions(
  query = "limit=10&sort=transaction_date:desc",
) {
  return useQuery({
    queryKey: ["transactions", query],
    queryFn: () => transactionApi.list(query),
    refetchInterval: 30_000,
  });
}

// ── QC ───────────────────────────────────────────────────────────

export function useQCStats() {
  return useQuery({
    queryKey: ["qc", "stats"],
    queryFn: () => qcApi.getStats(),
    refetchInterval: 30_000,
  });
}

export function useQCQueue(query = "page=1&limit=20&sort=received_date:asc") {
  return useQuery({
    queryKey: ["qc", "queue", query],
    queryFn: () => qcApi.getQueue(query),
    refetchInterval: 60_000,
  });
}

// ── Lots ─────────────────────────────────────────────────────────

export function useExpiringLots(
  query = "days=30&sort=expiration_date:asc&limit=10",
) {
  return useQuery({
    queryKey: ["lots", "expiring", query],
    queryFn: () => lotApi.getExpiring(query),
    refetchInterval: 60_000,
  });
}

// ── Production ───────────────────────────────────────────────────

export function useProductionBatches(
  query = "status=In Progress,Planned&sort=manufacture_date:desc&limit=10",
) {
  return useQuery({
    queryKey: ["production", "batches", query],
    queryFn: () => productionApi.getBatches(query),
    refetchInterval: 60_000,
  });
}
