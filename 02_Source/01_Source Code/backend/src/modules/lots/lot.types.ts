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
  storage_location: string | null;
  is_sample: boolean;
  parent_lot_id: string | null;
  po_number: string | null;
  receiving_form_id: string | null;
  created_date: Date;
  modified_date: Date;
  // Joined fields
  material_name?: string;
  material_type?: string;
  part_number?: string;
}

export interface CreateLotDto {
  material_id: string;
  manufacturer_name: string;
  manufacturer_lot: string;
  supplier_name: string;
  received_date: string;
  expiration_date: string;
  in_use_expiration_date?: string;
  quantity: number;
  unit_of_measure: string;
  storage_location?: string;
  is_sample?: boolean;
  parent_lot_id?: string;
  po_number?: string;
  receiving_form_id?: string;
}

export interface UpdateLotDto {
  manufacturer_name?: string;
  manufacturer_lot?: string;
  supplier_name?: string;
  expiration_date?: string;
  in_use_expiration_date?: string;
  storage_location?: string;
  po_number?: string;
  receiving_form_id?: string;
}

export interface UpdateLotStatusDto {
  status: LotStatus;
  reason?: string;
}

export interface LotFilters {
  status?: LotStatus;
  material_id?: string;
  expiring_before?: string;
  is_sample?: boolean;
}
