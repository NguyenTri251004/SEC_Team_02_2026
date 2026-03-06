import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import type { InventoryTransaction } from "../types";

const mockData: InventoryTransaction[] = [
  {
    transaction_id: "TXN-001",
    lot_id: "LOT-001",
    transaction_type: "Receipt",
    quantity: 500,
    unit_of_measure: "kg",
    reference_id: "PO-2026-0100",
    notes: "Initial receipt from supplier",
    performed_by: "operator1",
    transaction_date: "2026-01-15T09:30:00Z",
    created_date: "2026-01-15T09:30:00Z",
    lot_number: "LOT-001",
    material_name: "Acetaminophen API",
  },
  {
    transaction_id: "TXN-002",
    lot_id: "LOT-001",
    transaction_type: "Usage",
    quantity: 100,
    unit_of_measure: "kg",
    reference_id: "BATCH-001",
    notes: "Consumed for production batch",
    performed_by: "operator2",
    transaction_date: "2026-01-20T14:00:00Z",
    created_date: "2026-01-20T14:00:00Z",
    lot_number: "LOT-001",
    material_name: "Acetaminophen API",
  },
  {
    transaction_id: "TXN-003",
    lot_id: "LOT-002",
    transaction_type: "Receipt",
    quantity: 200,
    unit_of_measure: "L",
    reference_id: "PO-2026-0112",
    notes: "New solvent delivery",
    performed_by: "operator1",
    transaction_date: "2026-02-01T10:15:00Z",
    created_date: "2026-02-01T10:15:00Z",
    lot_number: "LOT-002",
    material_name: "Ethanol Solvent",
  },
  {
    transaction_id: "TXN-004",
    lot_id: "LOT-001",
    transaction_type: "Adjustment",
    quantity: -5,
    unit_of_measure: "kg",
    reference_id: null,
    notes: "Inventory count adjustment",
    performed_by: "admin",
    transaction_date: "2026-02-10T11:00:00Z",
    created_date: "2026-02-10T11:00:00Z",
    lot_number: "LOT-001",
    material_name: "Acetaminophen API",
  },
  {
    transaction_id: "TXN-005",
    lot_id: "LOT-003",
    transaction_type: "Transfer",
    quantity: 50,
    unit_of_measure: "kg",
    reference_id: "TRF-001",
    notes: "Transfer to quarantine zone",
    performed_by: "operator1",
    transaction_date: "2026-02-20T16:30:00Z",
    created_date: "2026-02-20T16:30:00Z",
    lot_number: "LOT-003",
    material_name: "Acetaminophen API",
  },
];

export const useTransactions = () => {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async (): Promise<InventoryTransaction[]> => {
      try {
        const response = await api.get("/api/transactions");
        const data = response.data?.data || response.data;
        if (!data || data.length === 0) return mockData;
        return data;
      } catch {
        return mockData;
      }
    },
  });
};
