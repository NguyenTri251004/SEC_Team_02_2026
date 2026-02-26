export type TransactionType = "IN" | "OUT";

export interface Transaction {
  transaction_id: string;
  transaction_type: TransactionType;
  material_id: string;
  quantity: number;
  unit?: string;
  notes?: string;
  created_by?: string;
  created_date: Date;
}

export interface CreateTransactionDto {
  transaction_id: string;
  transaction_type: TransactionType;
  material_id: string;
  quantity: number;
  unit?: string;
  notes?: string;
  created_by?: string;
}
