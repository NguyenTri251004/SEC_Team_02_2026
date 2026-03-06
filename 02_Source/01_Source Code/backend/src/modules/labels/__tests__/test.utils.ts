/**
 * Test utilities and mocks for label module tests
 */

export const mockLabelTemplate = {
  template_id: "LABEL-001",
  template_name: "Raw Material Label",
  label_type: "Raw Material" as const,
  template_content: '{"fields": ["material_name", "lot_id", "expiration_date"]}',
  width: 3.5,
  height: 2.0,
  created_date: new Date("2026-01-01"),
  modified_date: new Date("2026-01-01"),
};

export const mockLot = {
  lot_id: "LOT-001",
  material_id: "MAT-001",
  material_name: "Test Material",
  material_type: "API",
  part_number: "PART-001",
  manufacturer_name: "Manufacturer Inc",
  manufacturer_lot: "MFG-LOT-001",
  supplier_name: "Supplier Co",
  received_date: "2026-01-01",
  expiration_date: "2027-01-01",
  in_use_expiration_date: null,
  quantity: 100,
  unit_of_measure: "kg",
  storage_location: "A1-B2",
  status: "Accepted",
  is_sample: false,
  parent_lot_id: null,
  po_number: "PO-2026-001",
  receiving_form_id: "RF-001",
  created_date: new Date("2026-01-01"),
  modified_date: new Date("2026-01-01"),
};

export const mockBatch = {
  batch_id: "BATCH-001",
  product_id: "MAT-001",
  batch_number: "BATCH-2026-001",
  material_name: "Test Product",
  material_type: "API",
  batch_size: 500,
  unit_of_measure: "kg",
  manufacture_date: "2026-01-01",
  expiration_date: "2027-01-01",
  status: "Complete",
  created_date: new Date("2026-01-01"),
  modified_date: new Date("2026-01-01"),
};

/**
 * Mock Express request object
 */
export const createMockRequest = (overrides = {}) => {
  return {
    params: {},
    body: {},
    query: {},
    headers: {},
    user: { id: "test-user", roles: ["admin"] },
    ...overrides,
  };
};

/**
 * Mock Express response object
 */
export const createMockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    statusCode: 200,
  };
  return res;
};

/**
 * Create test templates for different label types
 */
export const createTestTemplates = () => {
  return {
    rawMaterial: {
      template_id: "LABEL-RM-001",
      template_name: "Raw Material Label",
      label_type: "Raw Material" as const,
      template_content: '{"fields": ["material_name", "lot_id"]}',
      width: 3.5,
      height: 2.0,
    },
    api: {
      template_id: "LABEL-API-001",
      template_name: "API Label",
      label_type: "API" as const,
      template_content: '{"fields": ["material_name", "batch_number"]}',
      width: 4.0,
      height: 2.5,
    },
    finished: {
      template_id: "LABEL-FP-001",
      template_name: "Finished Product Label",
      label_type: "Finished Product" as const,
      template_content: '{"fields": ["material_name", "batch_number", "expiration_date"]}',
      width: 5.0,
      height: 3.0,
    },
  };
};
