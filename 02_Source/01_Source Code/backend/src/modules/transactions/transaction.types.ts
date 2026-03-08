export type TransactionType = "Receipt" | "Usage" | "Split" | "Transfer" | "Adjustment" | "Disposal";

export interface Transaction {
  transaction_id: string;
  transaction_type: TransactionType;
  lot_id: string;
  quantity: number;
  unit_of_measure?: string;
  reference_id?: string;
  notes?: string;
  performed_by?: string;
  transaction_date: Date;
  created_date: Date;
}

export interface CreateTransactionDto {
  transaction_id: string;
  transaction_type: TransactionType;
  lot_id: string;
  quantity: number;
  unit_of_measure?: string;
  reference_id?: string;
  notes?: string;
  performed_by?: string;
}
