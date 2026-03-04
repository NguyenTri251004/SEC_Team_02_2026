import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  adminApi,
  dashboardApi,
  transactionApi,
  materialApi,
  qcApi,
  lotApi,
  productionApi,
} from "../services/api";
import type { InventorySummary, LotStatus } from "../types";
import { formatQuantitiesByUnit } from "../pages/dashboard/utils/formatters";

export interface StockByStatus {
  status: LotStatus;
  lotCount: number;
  quantitiesFormatted: string | null;
}

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

export function useMaterials(query = "page=1&limit=1") {
  return useQuery({
    queryKey: ["materials", query],
    queryFn: () => materialApi.list(query),
    refetchInterval: 60_000,
  });
}

// ── QC ───────────────────────────────────────────────────────────

export function useQCStats(query = "") {
  return useQuery({
    queryKey: ["qc", "stats", query],
    queryFn: () => qcApi.getStats(query.length > 0 ? query : undefined),
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

export function useLots(
  query = "status=Accepted,Quarantine&sort=expiration_date:asc&limit=100",
) {
  return useQuery({
    queryKey: ["lots", query],
    queryFn: () => lotApi.list(query),
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

// ── Derived Data Helpers ─────────────────────────────────────────

/**
 * Extract and format stock information for a specific status from inventory summary.
 * Returns lot count and formatted unit breakdown.
 *
 * @example
 * const acceptedStock = useStockByStatus(invSummary, "Accepted");
 * // { status: "Accepted", lotCount: 5240, quantitiesFormatted: "420 kg, 200 ea" }
 */
export function useStockByStatus(
  invSummary: InventorySummary,
  status: LotStatus,
): StockByStatus | null {
  return useMemo(() => {
    const stockData = invSummary.by_status.find((s) => s.status === status);

    if (!stockData) {
      return null;
    }

    return {
      status: stockData.status,
      lotCount: stockData.lot_count,
      quantitiesFormatted: formatQuantitiesByUnit(stockData.quantities_by_unit),
    };
  }, [invSummary, status]);
}
