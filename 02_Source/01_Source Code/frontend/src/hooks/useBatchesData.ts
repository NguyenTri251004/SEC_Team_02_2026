import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import type { ProductionBatch } from "../types";

const mockData: ProductionBatch[] = [
  {
    batch_id: "BATCH-001",
    product_id: "PROD-001",
    batch_number: "B-2026-001",
    batch_size: 1000,
    component_count: 3,
    unit_of_measure: "tablets",
    manufacture_date: "2026-01-20",
    expiration_date: "2028-01-20",
    status: "Completed",
    created_date: "2026-01-20",
    modified_date: "2026-01-25",
    product_name: "Acetaminophen 500mg Tablets",
  },
  {
    batch_id: "BATCH-002",
    product_id: "PROD-002",
    batch_number: "B-2026-002",
    batch_size: 500,
    component_count: 5,
    unit_of_measure: "capsules",
    manufacture_date: "2026-02-15",
    expiration_date: "2028-02-15",
    status: "In Progress",
    created_date: "2026-02-15",
    modified_date: "2026-02-28",
    product_name: "Ibuprofen 200mg Capsules",
  },
  {
    batch_id: "BATCH-003",
    product_id: "PROD-001",
    batch_number: "B-2026-003",
    batch_size: 2000,
    component_count: 3,
    unit_of_measure: "tablets",
    manufacture_date: "2026-03-01",
    expiration_date: "2028-03-01",
    status: "Planned",
    created_date: "2026-03-01",
    modified_date: "2026-03-01",
    product_name: "Acetaminophen 500mg Tablets",
  },
];

export const useBatches = () => {
  return useQuery({
    queryKey: ["batches"],
    queryFn: async (): Promise<ProductionBatch[]> => {
      try {
        const response = await api.get("/api/production/batches");
        const data = response.data?.data || response.data;
        if (!data || data.length === 0) return mockData;
        return data;
      } catch {
        return mockData;
      }
    },
  });
};
