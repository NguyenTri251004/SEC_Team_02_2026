export type LotStatus = "Quarantine" | "Accepted" | "Rejected" | "Depleted";

export interface InventorySummaryByUnit {
  unit_of_measure: string;
  total_quantity: number;
}

export interface InventorySummaryByStatus {
  status: LotStatus;
  lot_count: number;
  quantities_by_unit?: InventorySummaryByUnit[];
}

export interface InventorySummaryByMaterialType {
  material_type: string;
  unit_of_measure: string;
  total_quantity: number;
}

export interface InventorySummary {
  by_status: InventorySummaryByStatus[];
  by_material_type?: InventorySummaryByMaterialType[];
}

export interface TransactionTrendPoint {
  date: string; // YYYY-MM-DD
  receipts: number;
  issues: number;
}

export interface TransactionSummary {
  today_receipts: number;
  today_issues: number;
  trend?: TransactionTrendPoint[];
}

