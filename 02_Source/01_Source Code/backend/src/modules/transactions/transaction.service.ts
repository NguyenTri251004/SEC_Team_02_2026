import pool from "../../shared/db/pool";
import { Transaction, CreateTransactionDto } from "./transaction.types";

export const getAllTransactions = async (): Promise<Transaction[]> => {
  const result = await pool.query<Transaction>(
    "SELECT * FROM transactions ORDER BY created_date DESC"
  );
  return result.rows;
};

export const getTransactionById = async (id: string): Promise<Transaction | null> => {
  const result = await pool.query<Transaction>(
    "SELECT * FROM transactions WHERE transaction_id = $1",
    [id]
  );
  return result.rows[0] ?? null;
};

export const getTransactionsByMaterial = async (
  materialId: string
): Promise<Transaction[]> => {
  const result = await pool.query<Transaction>(
    "SELECT * FROM transactions WHERE material_id = $1 ORDER BY created_date DESC",
    [materialId]
  );
  return result.rows;
};

export const createTransaction = async (
  dto: CreateTransactionDto
): Promise<Transaction> => {
  const result = await pool.query<Transaction>(
    `INSERT INTO transactions
       (transaction_id, transaction_type, material_id, quantity, unit, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      dto.transaction_id,
      dto.transaction_type,
      dto.material_id,
      dto.quantity,
      dto.unit ?? null,
      dto.notes ?? null,
      dto.created_by ?? null,
    ]
  );
  return result.rows[0];
};
