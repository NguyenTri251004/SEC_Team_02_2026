export type BatchStatus = "Planned" | "In Progress" | "Complete" | "Rejected";

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
  created_date: Date;
  modified_date: Date;
  product_name?: string;
  components?: BatchComponent[];
}

export interface BatchComponent {
  component_id: string;
  batch_id: string;
  lot_id: string;
  planned_quantity: number;
  actual_quantity: number | null;
  unit_of_measure: string;
  addition_date: Date | null;
  added_by: string | null;
  created_date: Date;
  modified_date: Date;
  material_id?: string;
  material_name?: string;
  manufacturer_lot?: string;
  lot_status?: string;
  lot_expiration_date?: string;
  lot_quantity?: number;
}

export interface CreateBatchInput {
  batch_id?: string;
  product_id: string;
  batch_number: string;
  batch_size: number;
  unit_of_measure: string;
  manufacture_date: string;
  expiration_date: string;
}

export interface AddComponentInput {
  component_id?: string;
  lot_id: string;
  planned_quantity: number;
  unit_of_measure: string;
  added_by?: string;
}

export interface BatchFilters {
  status?: BatchStatus;
  product_id?: string;
  batch_number?: string;
}

export interface ProductionTraceabilityItem {
  component_id: string;
  lot_id: string;
  planned_quantity: number;
  actual_quantity: number | null;
  unit_of_measure: string;
  addition_date: Date | null;
  material_id: string;
  material_name: string;
  manufacturer_lot: string;
  supplier_name: string;
  expiration_date: string;
  lot_status: string;
  transaction_id: string | null;
  transaction_quantity: number | null;
  transaction_date: Date | null;
  reference_id: string | null;
  notes: string | null;
}
