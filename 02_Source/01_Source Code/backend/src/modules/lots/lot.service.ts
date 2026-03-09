import pool from "../../shared/db/pool";
import {
  InventoryLot,
  CreateLotDto,
  UpdateLotDto,
  LotStatus,
  LotFilters,
} from "./lot.types";

// Valid status transitions
const VALID_TRANSITIONS: Record<LotStatus, LotStatus[]> = {
  Quarantine: ["Accepted", "Rejected"],
  Accepted: ["Depleted", "Rejected"],
  Rejected: [],
  Depleted: [],
};

const BASE_SELECT = `
  SELECT l.*,
         m.material_name,
         m.material_type,
         m.part_number
  FROM inventory_lots l
  LEFT JOIN materials m ON l.material_id = m.material_id
`;

export const getAllLots = async (filters?: LotFilters): Promise<InventoryLot[]> => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters?.status) {
    conditions.push(`l.status = $${paramIndex++}`);
    params.push(filters.status);
  }
  if (filters?.material_id) {
    conditions.push(`l.material_id = $${paramIndex++}`);
    params.push(filters.material_id);
  }
  if (filters?.expiring_before) {
    conditions.push(`l.expiration_date <= $${paramIndex++}`);
    params.push(filters.expiring_before);
  }
  if (filters?.is_sample !== undefined) {
    conditions.push(`l.is_sample = $${paramIndex++}`);
    params.push(filters.is_sample);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const query = `${BASE_SELECT} ${where} ORDER BY l.received_date DESC`;

  const result = await pool.query<InventoryLot>(query, params);
  return result.rows;
};

export const getLotById = async (id: string): Promise<InventoryLot | null> => {
  const result = await pool.query<InventoryLot>(
    `${BASE_SELECT} WHERE l.lot_id = $1`,
    [id]
  );
  return result.rows[0] ?? null;
};

export const createLot = async (dto: CreateLotDto): Promise<InventoryLot> => {
  const result = await pool.query<InventoryLot>(
    `INSERT INTO inventory_lots
       (lot_id, material_id, manufacturer_name, manufacturer_lot, supplier_name,
        received_date, expiration_date, in_use_expiration_date, status, quantity,
        unit_of_measure, storage_location, is_sample, parent_lot_id, po_number, receiving_form_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Quarantine',$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      dto.lot_id,
      dto.material_id,
      dto.manufacturer_name,
      dto.manufacturer_lot,
      dto.supplier_name,
      dto.received_date,
      dto.expiration_date,
      dto.in_use_expiration_date ?? null,
      dto.quantity,
      dto.unit_of_measure,
      dto.storage_location ?? null,
      dto.is_sample ?? false,
      dto.parent_lot_id ?? null,
      dto.po_number ?? null,
      dto.receiving_form_id ?? null,
    ]
  );
  return result.rows[0];
};

export const updateLot = async (
  id: string,
  dto: UpdateLotDto
): Promise<InventoryLot | null> => {
  const result = await pool.query<InventoryLot>(
    `UPDATE inventory_lots
     SET manufacturer_name     = COALESCE($1, manufacturer_name),
         manufacturer_lot      = COALESCE($2, manufacturer_lot),
         supplier_name         = COALESCE($3, supplier_name),
         expiration_date       = COALESCE($4, expiration_date),
         in_use_expiration_date = COALESCE($5, in_use_expiration_date),
         storage_location      = COALESCE($6, storage_location),
         po_number             = COALESCE($7, po_number),
         receiving_form_id     = COALESCE($8, receiving_form_id),
         modified_date         = CURRENT_TIMESTAMP
     WHERE lot_id = $9
     RETURNING *`,
    [
      dto.manufacturer_name ?? null,
      dto.manufacturer_lot ?? null,
      dto.supplier_name ?? null,
      dto.expiration_date ?? null,
      dto.in_use_expiration_date ?? null,
      dto.storage_location ?? null,
      dto.po_number ?? null,
      dto.receiving_form_id ?? null,
      id,
    ]
  );
  return result.rows[0] ?? null;
};

export const updateLotStatus = async (
  id: string,
  newStatus: LotStatus,
  _reason?: string
): Promise<InventoryLot | null> => {
  // Get current lot
  const current = await pool.query<InventoryLot>(
    "SELECT * FROM inventory_lots WHERE lot_id = $1",
    [id]
  );
  if (current.rows.length === 0) return null;

  const currentStatus = current.rows[0].status as LotStatus;
  const allowed = VALID_TRANSITIONS[currentStatus];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid status transition: ${currentStatus} -> ${newStatus}. Allowed: ${allowed.join(", ") || "none"}`
    );
  }

  const result = await pool.query<InventoryLot>(
    `UPDATE inventory_lots
     SET status = $1, modified_date = CURRENT_TIMESTAMP
     WHERE lot_id = $2
     RETURNING *`,
    [newStatus, id]
  );
  return result.rows[0] ?? null;
};

export const getExpiringLots = async (days: number): Promise<InventoryLot[]> => {
  const result = await pool.query<InventoryLot>(
    `${BASE_SELECT}
     WHERE l.expiration_date <= CURRENT_DATE + $1 * INTERVAL '1 day'
       AND l.status IN ('Quarantine', 'Accepted')
     ORDER BY l.expiration_date ASC`,
    [days]
  );
  return result.rows;
};

export const getLotsByMaterial = async (materialId: string): Promise<InventoryLot[]> => {
  const result = await pool.query<InventoryLot>(
    `${BASE_SELECT} WHERE l.material_id = $1 ORDER BY l.received_date DESC`,
    [materialId]
  );
  return result.rows;
};

export const deleteLot = async (id: string): Promise<boolean> => {
  const result = await pool.query(
    `DELETE FROM inventory_lots WHERE lot_id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
};
