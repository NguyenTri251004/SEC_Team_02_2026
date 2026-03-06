import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import type { InventoryLot } from "../types";

const mockData: InventoryLot[] = [
  {
    lot_id: "LOT-001",
    material_id: "MAT-001",
    manufacturer_name: "PharmaChem Inc.",
    manufacturer_lot: "MFG-2026-001",
    supplier_name: "Global Suppliers Co.",
    received_date: "2026-01-15",
    expiration_date: "2027-01-15",
    in_use_expiration_date: null,
    status: "Accepted",
    quantity: 500,
    unit_of_measure: "kg",
    storage_location: "WH-A, Rack 3",
    is_sample: false,
    parent_lot_id: null,
    po_number: "PO-2026-0100",
    receiving_form_id: "RF-001",
    created_date: "2026-01-15",
    modified_date: "2026-01-20",
    material_name: "Acetaminophen API",
    material_type: "API",
  },
  {
    lot_id: "LOT-002",
    material_id: "MAT-002",
    manufacturer_name: "BioLab Corp.",
    manufacturer_lot: "MFG-2026-045",
    supplier_name: "MedSupply Ltd.",
    received_date: "2026-02-01",
    expiration_date: "2026-04-01",
    in_use_expiration_date: null,
    status: "Quarantine",
    quantity: 200,
    unit_of_measure: "L",
    storage_location: "WH-B, Cold Room",
    is_sample: false,
    parent_lot_id: null,
    po_number: "PO-2026-0112",
    receiving_form_id: "RF-002",
    created_date: "2026-02-01",
    modified_date: "2026-02-01",
    material_name: "Ethanol Solvent",
    material_type: "Excipient",
  },
  {
    lot_id: "LOT-003",
    material_id: "MAT-001",
    manufacturer_name: "PharmaChem Inc.",
    manufacturer_lot: "MFG-2026-078",
    supplier_name: "Global Suppliers Co.",
    received_date: "2026-02-20",
    expiration_date: "2026-03-10",
    in_use_expiration_date: null,
    status: "Rejected",
    quantity: 50,
    unit_of_measure: "kg",
    storage_location: "WH-A, Quarantine Zone",
    is_sample: true,
    parent_lot_id: "LOT-001",
    po_number: null,
    receiving_form_id: null,
    created_date: "2026-02-20",
    modified_date: "2026-02-25",
    material_name: "Acetaminophen API",
    material_type: "API",
  },
];

export const useLots = () => {
  return useQuery({
    queryKey: ["lots"],
    queryFn: async (): Promise<InventoryLot[]> => {
      try {
        const response = await api.get("/api/lots");
        const data = response.data?.data || response.data;
        if (!data || data.length === 0) return mockData;
        return data;
      } catch {
        return mockData;
      }
    },
  });
};
