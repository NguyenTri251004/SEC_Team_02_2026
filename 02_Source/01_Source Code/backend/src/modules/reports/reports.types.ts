export type ReportType = "inventory" | "transactions" | "audit-log";

export interface ReportExportInput {
  type: ReportType;
  filters?: Record<string, unknown>;
}

export interface InventoryReportRow {
  lot_id: string;
  material_id: string;
  material_name: string | null;
  material_type: string | null;
  manufacturer_name: string;
  manufacturer_lot: string;
  supplier_name: string | null;
  received_date: string;
  expiration_date: string;
  status: string;
  quantity: number;
  unit_of_measure: string;
  storage_location: string | null;
  po_number: string | null;
  is_sample: boolean;
  created_date: string;
  modified_date: string;
}

export interface TransactionReportRow {
  transaction_id: string;
  lot_id: string;
  transaction_type: string;
  quantity: number;
  unit_of_measure: string;
  reference_id: string | null;
  notes: string | null;
  performed_by: string | null;
  transaction_date: string;
  created_date: string;
  material_id?: string | null;
  material_name?: string | null;
}

export interface AuditLogRow {
  event_type: "transaction" | "lot_status_change";
  event_date: string;
  lot_id: string | null;
  reference_id: string | null;
  performed_by: string | null;
  notes: string | null;
  details: Record<string, unknown>;
}

