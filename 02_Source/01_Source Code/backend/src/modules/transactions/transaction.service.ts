import { randomUUID } from "crypto";
import pool from "../../shared/db/pool";
import { Transaction, CreateTransactionDto } from "./transaction.types";
import { invalidateAdminStatsCache } from "../admin/admin.service";

export const getAllTransactions = async (): Promise<Transaction[]> => {
  const result = await pool.query(
    `SELECT it.transaction_id, it.transaction_type, it.lot_id,
            it.quantity, it.unit_of_measure, it.reference_id, it.notes,
            it.performed_by, it.transaction_date, it.created_date,
            il.lot_id AS lot_number, m.material_name
     FROM inventory_transactions it
     LEFT JOIN inventory_lots il ON it.lot_id = il.lot_id
     LEFT JOIN materials m ON il.material_id = m.material_id
     ORDER BY transaction_date DESC`
  );
  return result.rows as Transaction[];
};

export const getTransactionById = async (id: string): Promise<Transaction | null> => {
  const result = await pool.query(
    `SELECT transaction_id, transaction_type, lot_id,
            quantity, unit_of_measure, reference_id, notes,
            performed_by, transaction_date, created_date
     FROM inventory_transactions WHERE transaction_id = $1`,
    [id]
  );
  return (result.rows[0] as Transaction) ?? null;
};

export const getTransactionsByLot = async (
  lotId: string
): Promise<Transaction[]> => {
  const result = await pool.query(
    `SELECT transaction_id, transaction_type, lot_id,
            quantity, unit_of_measure, reference_id, notes,
            performed_by, transaction_date, created_date
     FROM inventory_transactions WHERE lot_id = $1 ORDER BY transaction_date DESC`,
    [lotId]
  );
  return result.rows as Transaction[];
};

async function generateTransactionId(): Promise<string> {
  const result = await pool.query<{ max_id: string | null }>(
    `SELECT transaction_id AS max_id FROM inventory_transactions
     WHERE transaction_id ~ '^TXN-[0-9]+$'
     ORDER BY LENGTH(transaction_id) DESC, transaction_id DESC
     LIMIT 1`
  );
  const last = result.rows[0]?.max_id;
  if (last) {
    const num = parseInt(last.replace(/^TXN-/, ""), 10);
    return `TXN-${String(num + 1).padStart(3, "0")}`;
  }
  // Fallback: count all rows + 1
  const countResult = await pool.query<{ cnt: string }>(
    `SELECT COUNT(*) AS cnt FROM inventory_transactions`
  );
  const cnt = parseInt(countResult.rows[0]?.cnt ?? "0", 10);
  return `TXN-${String(cnt + 1).padStart(3, "0")}`;
}

export const createTransaction = async (
  dto: CreateTransactionDto
): Promise<Transaction> => {
  const transaction_id = dto.transaction_id ?? (await generateTransactionId());
  const result = await pool.query(
    `INSERT INTO inventory_transactions
       (transaction_id, transaction_type, lot_id, quantity, unit_of_measure, reference_id, notes, performed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING transaction_id, transaction_type, lot_id,
               quantity, unit_of_measure, reference_id, notes,
               performed_by, transaction_date, created_date`,
    [
      transaction_id,
      dto.transaction_type,
      dto.lot_id,
      dto.quantity,
      dto.unit_of_measure ?? null,
      dto.reference_id ?? null,
      dto.notes ?? null,
      dto.performed_by ?? null,
    ]
  );
  await invalidateAdminStatsCache();
  return result.rows[0] as Transaction;
};
