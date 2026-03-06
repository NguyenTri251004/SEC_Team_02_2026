// Loại kiểm tra QC
export type QCTestType =
  | "Identity"
  | "Potency"
  | "Microbial"
  | "GrowthPromotion"
  | "Physical"
  | "Chemical";

// Trạng thái kết quả QC
export type QCResultStatus = "Pass" | "Fail" | "Pending";

// Entity QCTest đầy đủ
export interface QCTest {
  test_id: string;
  lot_id: string;
  test_type: QCTestType;
  test_method?: string;
  test_date: Date;
  acceptance_criteria?: string;
  test_result?: string;
  result_status: QCResultStatus;
  performed_by: string;
  verified_by?: string;
  notes?: string;
  created_date: Date;
  modified_date: Date;
  // JOIN fields từ inventory_lots + materials
  lot_number?: string;
  manufacturer_lot?: string;
  material_name?: string;
  material_type?: string;
}

// Input để tạo mới một QC test
export interface CreateQCTestInput {
  lot_id: string;
  test_type: QCTestType;
  test_method?: string;
  test_date?: string; // ISO date string, default today
  acceptance_criteria?: string;
  performed_by: string;
  notes?: string;
}

// Input để cập nhật kết quả QC test
export interface UpdateQCTestInput {
  test_result: string;
  result_status: QCResultStatus;
  verified_by: string;
  notes?: string;
}

// Thống kê QC tổng hợp
export interface QCStats {
  pending_count: number;
  pass_rate_30d: number;       // Tỷ lệ Pass trong 30 ngày gần nhất (0-100)
  total_tests_30d: number;
  tests_by_type: {
    test_type: QCTestType;
    count: number;
    pass_count: number;
  }[];
}

// Lot đang chờ QC (status='Quarantine')
export interface QCQueueItem {
  lot_id: string;
  lot_number?: string;
  manufacturer_lot: string;
  manufacturer_name?: string;
  material_id: string;
  material_name: string;
  material_type: string;
  received_date: Date;
  expiration_date?: Date;
  quantity: number;
  unit_of_measure?: string;
  storage_location?: string;
  pending_tests: number;
  total_tests: number;
}
