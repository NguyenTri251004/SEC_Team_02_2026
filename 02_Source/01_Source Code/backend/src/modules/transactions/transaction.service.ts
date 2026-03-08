import pool from "../../shared/db/pool";
import { Transaction, CreateTransactionDto } from "./transaction.types";

export const getAllTransactions = async (): Promise<Transaction[]> => {
  const result = await pool.query(
    `SELECT transaction_id, transaction_type, lot_id,
            quantity, unit_of_measure, reference_id, notes,
            performed_by, transaction_date, created_date
     FROM inventory_transactions ORDER BY transaction_date DESC`
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

export const createTransaction = async (
  dto: CreateTransactionDto
): Promise<Transaction> => {
  const result = await pool.query(
    `INSERT INTO inventory_transactions
       (transaction_id, transaction_type, lot_id, quantity, unit_of_measure, reference_id, notes, performed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING transaction_id, transaction_type, lot_id,
               quantity, unit_of_measure, reference_id, notes,
               performed_by, transaction_date, created_date`,
    [
      dto.transaction_id,
      dto.transaction_type,
      dto.lot_id,
      dto.quantity,
      dto.unit_of_measure ?? null,
      dto.reference_id ?? null,
      dto.notes ?? null,
      dto.performed_by ?? null,
    ]
  );
  return result.rows[0] as Transaction;
};
