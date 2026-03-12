// ============================================================
// Roles & Auth
// ============================================================
export type UserRole =
  | "admin"
  | "inventory_manager"
  | "quality_control"
  | "production"
  | "viewer";

export interface CurrentUser {
  user_id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
}

// ============================================================
// Entities
// ============================================================
export interface Material {
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: string;
  storage_conditions: string;
  specification_document: string | null;
  created_date: string;
  modified_date: string;
}

export type LotStatus = "Quarantine" | "Accepted" | "Rejected" | "Depleted";

export interface InventoryLot {
  lot_id: string;
  material_id: string;
  manufacturer_name: string;
  manufacturer_lot: string;
  supplier_name: string;
  received_date: string;
  expiration_date: string;
  in_use_expiration_date: string | null;
  status: LotStatus;
  quantity: number;
  unit_of_measure: string;
  storage_location: string;
  is_sample: boolean;
  parent_lot_id: string | null;
  po_number: string | null;
  receiving_form_id: string | null;
  created_date: string;
  modified_date: string;
  // joined fields
  material_name?: string;
  material_type?: string;
}

export type TransactionType = "Receipt" | "Usage" | "Adjustment" | "Transfer" | "Split" | "Disposal" | "QC_Approved" | "QC_Rejected";

export interface InventoryTransaction {
  transaction_id: string;
  lot_id: string;
  transaction_type: TransactionType;
  quantity: number;
  unit_of_measure: string;
  reference_id: string | null;
  notes: string | null;
  performed_by: string;
  transaction_date: string;
  created_date: string;
  // joined fields
  lot_number?: string;
  material_name?: string;
}

export type QCResultStatus = "Pending" | "Pass" | "Fail";

export interface QCTest {
  test_id: string;
  lot_id: string;
  test_type: string;
  test_method: string;
  test_date: string;
  test_result: string | null;
  acceptance_criteria: string | null;
  result_status: QCResultStatus;
  performed_by: string;
  verified_by: string | null;
  created_date: string;
  modified_date: string;
}

export type BatchStatus = "Planned" | "In Progress" | "Completed" | "Rejected";

export interface ProductionBatch {
  batch_id: string;
  product_id: string;
  batch_number: string;
  batch_size: number;
  component_count?: number;
  unit_of_measure: string;
  manufacture_date: string;
  expiration_date: string;
  status: BatchStatus;
  created_date: string;
  modified_date: string;
  // joined fields
  product_name?: string;
}

export interface LabelTemplate {
  template_id: string;
  template_name: string;
  label_type: string;
  template_content: string;
  width: number;
  height: number;
  created_date: string;
  modified_date: string;
}

export type CodeType = "barcode" | "qrcode";
export type EntityType = "material" | "lot" | "batch";

export interface GenerateLabelInput {
  material_id: string;
  code_type: CodeType;
}

export interface GenerateLabelFromTemplateInput {
  template_id: string;
  entity_type: EntityType;
  entity_id: string;
  code_type: CodeType;
}

export interface GeneratedLabel {
  label_id: string;
  material_id: string;
  material_name: string;
  part_number: string;
  material_type: string;
  entity_type: EntityType;
  entity_id: string;
  code_type: CodeType;
  code_data: string; // base64 encoded image
  label_content: Record<string, unknown>;
  created_by: string;
  created_date: string;
}

export interface User {
  user_id: string;
  keycloak_sub: string;
  email: string;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

// ============================================================
// API Response
// ============================================================
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ============================================================
// Dashboard KPI DTOs
// ============================================================
export interface AdminStats {
  total_active_users: number;
  today_transactions: number;
  total_lots: number;
  lots_in_quarantine: number;
  users_by_role: { role: string; count: number }[];
}

export interface InventorySummary {
  by_status: {
    status: LotStatus;
    lot_count: number;
    quantities_by_unit?: {
      unit_of_measure: string;
      total_quantity: number;
    }[];
  }[];
  by_material_type?: {
    material_type: string;
    unit_of_measure: string;
    total_quantity: number;
  }[];
}

export interface TransactionSummary {
  today_receipts: number;
  today_issues: number;
  trend?: {
    date: string;
    receipts: number;
    issues: number;
  }[];
}

export interface QCStats {
  pending_qc_lots: number;
  tests_pending_review: number;
  tests_unverified: number;
  pass_rate_30d: number;
  rejected_lots_active: number;
  by_test_type?: {
    test_type: string;
    pass_count: number;
    fail_count: number;
    total: number;
  }[];
  activity_trend?: {
    date: string;
    test_count: number;
  }[];
}

export interface QCQueueItem {
  lot_id: string;
  lot_number?: string;
  manufacturer_lot: string;
  manufacturer_name: string;
  material_id: string;
  material_name: string;
  material_type: string;
  status: string;
  received_date: string;
  expiration_date: string;
  quantity: number;
  unit_of_measure: string;
  storage_location: string;
  pending_tests: number;
  total_tests: number;
}

export interface ExpiringLot {
  lot_id: string;
  material_name: string;
  status: LotStatus;
  quantity: number;
  unit_of_measure: string;
  expiration_date: string;
  days_to_expiry: number;
  storage_location: string;
}

// ============================================================
// Reports
// ============================================================
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

export interface AlertItem {
  id: string;
  severity: "critical" | "high" | "warning";
  message: string;
  count: number;
  link: string;
}

// ============================================================
// Reports
// ============================================================
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
