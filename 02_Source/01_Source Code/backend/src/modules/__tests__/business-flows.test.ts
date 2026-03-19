/**
 * CROSS-MODULE BUSINESS FLOW TESTS
 *
 * Simulates complete IMS business flows by mocking the DB pool at the lowest
 * level and calling actual service functions. Covers:
 *
 *   Flow 1: Material Receipt -> QC -> Approval
 *   Flow 2: Material Receipt -> QC -> Rejection
 *   Flow 3: QC Business Rules (edge cases)
 *   Flow 4: Production Batch Lifecycle
 *   Flow 5: Production Material Consumption
 *   Flow 6: Lot Status Transitions (full matrix)
 */

import pool from "../../shared/db/pool";
import * as lotService from "../lots/lot.service";
import * as qcService from "../qc/qc.service";
import * as productionService from "../production/production.service";
import { QueryResult, QueryResultRow } from "pg";

// ── Mock setup ──────────────────────────────────────────────────────────────

jest.mock("../../shared/db/pool", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

const mockPool = pool as any;

const toResult = <T extends QueryResultRow>(rows: T[]): QueryResult<T> => ({
  command: "SELECT",
  rowCount: rows.length,
  oid: 0,
  fields: [],
  rows,
});

/**
 * Create a mock PoolClient for transactional functions (approveLot, rejectLot,
 * consumeMaterial). The handler receives each SQL query and returns the
 * appropriate result.
 */
const createMockClient = (
  handler: (text: string, values?: readonly unknown[]) => QueryResult<QueryResultRow>
) => {
  const calls: { text: string; values?: readonly unknown[] }[] = [];
  const client = {
    calls,
    released: false,
    query: jest.fn(async (text: string, values?: readonly unknown[]) => {
      calls.push({ text, values });
      return handler(text, values);
    }),
    release: jest.fn(function (this: { released: boolean }) {
      this.released = true;
    }),
  };
  return client;
};

// ── Test data ───────────────────────────────────────────────────────────────

const LOT = {
  lot_id: "LOT-BF-001",
  material_id: "MAT-BF-001",
  manufacturer_name: "PharmaChem Inc.",
  manufacturer_lot: "MFG-2026-BF",
  supplier_name: "Global Suppliers Co.",
  received_date: "2026-01-15",
  expiration_date: "2027-06-15",
  in_use_expiration_date: null,
  status: "Quarantine" as const,
  quantity: 500,
  unit_of_measure: "kg",
  storage_location: "WH-A, Rack 3",
  is_sample: false,
  parent_lot_id: null,
  po_number: "PO-BF-001",
  receiving_form_id: "RF-BF-001",
  created_date: new Date("2026-01-15"),
  modified_date: new Date("2026-01-15"),
  material_name: "Acetaminophen API",
  material_type: "API",
  part_number: "PN-BF-001",
};

const QC_TEST_IDENTITY = {
  test_id: "QC-BF-001",
  lot_id: "LOT-BF-001",
  test_type: "Identity" as const,
  test_method: "HPLC Analysis",
  test_date: "2026-01-16",
  test_result: null,
  acceptance_criteria: ">= 98.0% purity",
  result_status: "Pending" as const,
  performed_by: "USR-003",
  verified_by: null,
  notes: null,
  created_date: new Date("2026-01-16"),
  modified_date: new Date("2026-01-16"),
};

const QC_TEST_POTENCY = {
  test_id: "QC-BF-002",
  lot_id: "LOT-BF-001",
  test_type: "Potency" as const,
  test_method: "Assay",
  test_date: "2026-01-16",
  test_result: null,
  acceptance_criteria: "95-105%",
  result_status: "Pending" as const,
  performed_by: "USR-003",
  verified_by: null,
  notes: null,
  created_date: new Date("2026-01-16"),
  modified_date: new Date("2026-01-16"),
};

const BATCH = {
  batch_id: "BATCH-BF-001",
  product_id: "MAT-BF-001",
  batch_number: "B-2026-BF-001",
  batch_size: 1000,
  unit_of_measure: "tablets",
  manufacture_date: "2026-02-01",
  expiration_date: "2028-02-01",
  status: "Planned" as const,
  created_date: new Date("2026-02-01"),
  modified_date: new Date("2026-02-01"),
  product_name: "Acetaminophen API",
};

const COMPONENT = {
  component_id: "COMP-BF-001",
  batch_id: "BATCH-BF-001",
  lot_id: "LOT-BF-001",
  planned_quantity: 500,
  actual_quantity: null,
  unit_of_measure: "kg",
  addition_date: new Date("2026-02-01"),
  added_by: "USR-004",
  created_date: new Date("2026-02-01"),
  modified_date: new Date("2026-02-01"),
  material_id: "MAT-BF-001",
  material_name: "Acetaminophen API",
  manufacturer_lot: "MFG-2026-BF",
  lot_status: "Accepted",
  lot_expiration_date: "2027-06-15",
  lot_quantity: 500,
};

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Cross-Module Business Flows", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // FLOW 1: Material Receipt -> QC -> Approval
  // ==========================================================================
  describe("Flow 1: Material Receipt -> QC -> Approval", () => {
    it("Step 1: Create a lot - starts as Quarantine", async () => {
      mockPool.query.mockResolvedValueOnce(toResult([])); // generateLotId
      mockPool.query.mockResolvedValueOnce(toResult([LOT])); // INSERT

      const result = await lotService.createLot({
        material_id: LOT.material_id,
        manufacturer_name: LOT.manufacturer_name,
        manufacturer_lot: LOT.manufacturer_lot,
        supplier_name: LOT.supplier_name,
        received_date: LOT.received_date,
        expiration_date: LOT.expiration_date,
        quantity: LOT.quantity,
        unit_of_measure: LOT.unit_of_measure,
        storage_location: LOT.storage_location ?? undefined,
        po_number: LOT.po_number ?? undefined,
        receiving_form_id: LOT.receiving_form_id ?? undefined,
      });

      expect(result.status).toBe("Quarantine");
      expect(result.lot_id).toBe("LOT-BF-001");

      const sql = mockPool.query.mock.calls[1][0] as string;
      expect(sql).toContain("'Quarantine'");
    });

    it("Step 2: Create QC tests for the lot - start as Pending", async () => {
      mockPool.query.mockResolvedValueOnce(toResult([{ max_id: 'QC-015' }])); // MAX test_id
      mockPool.query.mockResolvedValueOnce(toResult([QC_TEST_IDENTITY])); // INSERT

      const test1 = await qcService.createTest({
        lot_id: QC_TEST_IDENTITY.lot_id,
        test_type: QC_TEST_IDENTITY.test_type,
        test_method: QC_TEST_IDENTITY.test_method,
        test_date: QC_TEST_IDENTITY.test_date,
        acceptance_criteria: QC_TEST_IDENTITY.acceptance_criteria ?? undefined,
        performed_by: QC_TEST_IDENTITY.performed_by,
      });

      expect(test1.result_status).toBe("Pending");
      expect(test1.lot_id).toBe("LOT-BF-001");

      const sql = mockPool.query.mock.calls[1][0] as string;
      expect(sql).toContain("INSERT INTO qc_tests");
      expect(sql).toContain("'Pending'");
    });

    it("Step 3: Update all test results to Pass", async () => {
      const passedTest = {
        ...QC_TEST_IDENTITY,
        test_result: "98.5% purity",
        result_status: "Pass" as const,
        verified_by: "USR-001",
      };
      mockPool.query.mockResolvedValueOnce(toResult([passedTest]));

      const updated = await qcService.updateTestResult(QC_TEST_IDENTITY.test_id, {
        test_result: "98.5% purity",
        result_status: "Pass",
        verified_by: "USR-001",
      });

      expect(updated?.result_status).toBe("Pass");

      const sql = mockPool.query.mock.calls[0][0] as string;
      expect(sql).toContain("UPDATE qc_tests");
      // Updating test does NOT change lot status
      expect(sql).not.toContain("inventory_lots");
    });

    it("Step 4: Approve lot - status becomes Accepted", async () => {
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "COMMIT") return toResult([]);
        if (text.includes("SELECT status FROM inventory_lots")) {
          return toResult([{ status: "Quarantine" }]);
        }
        if (text.includes("FROM qc_tests") && text.includes("COUNT")) {
          return toResult([{ total: "2", pending_count: "0", fail_count: "0" }]);
        }
        if (text.includes("UPDATE inventory_lots") && text.includes("Accepted")) {
          return toResult([]);
        }
        throw new Error(`Unexpected query: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);

      const result = await qcService.approveLot("LOT-BF-001", "USR-001");

      expect(result.success).toBe(true);
      expect(result.message).toContain("thành công");

      // Verify the UPDATE changed lot to Accepted
      const updateCall = client.calls.find(
        (c) => c.text.includes("UPDATE inventory_lots") && c.text.includes("Accepted")
      );
      expect(updateCall).toBeDefined();
      expect(updateCall!.values).toContain("LOT-BF-001");

      // Verify transaction flow: BEGIN ... COMMIT
      expect(client.calls[0].text).toBe("BEGIN");
      expect(client.calls[client.calls.length - 1].text).toBe("COMMIT");
      expect(client.released).toBe(true);
    });
  });

  // ==========================================================================
  // FLOW 2: Material Receipt -> QC -> Rejection
  // ==========================================================================
  describe("Flow 2: Material Receipt -> QC -> Rejection", () => {
    it("Step 1: Create a lot (Quarantine)", async () => {
      mockPool.query.mockResolvedValueOnce(toResult([])); // generateLotId
      mockPool.query.mockResolvedValueOnce(toResult([LOT])); // INSERT

      const result = await lotService.createLot({
        material_id: LOT.material_id,
        manufacturer_name: LOT.manufacturer_name,
        manufacturer_lot: LOT.manufacturer_lot,
        supplier_name: LOT.supplier_name,
        received_date: LOT.received_date,
        expiration_date: LOT.expiration_date,
        quantity: LOT.quantity,
        unit_of_measure: LOT.unit_of_measure,
      });

      expect(result.status).toBe("Quarantine");
    });

    it("Step 2: Create QC tests", async () => {
      mockPool.query.mockResolvedValueOnce(toResult([{ max_id: 'QC-015' }])); // MAX test_id
      mockPool.query.mockResolvedValueOnce(toResult([QC_TEST_IDENTITY])); // INSERT

      const test = await qcService.createTest({
        lot_id: QC_TEST_IDENTITY.lot_id,
        test_type: QC_TEST_IDENTITY.test_type,
        test_method: QC_TEST_IDENTITY.test_method,
        performed_by: QC_TEST_IDENTITY.performed_by,
      });

      expect(test.result_status).toBe("Pending");
    });

    it("Step 3: One test Fails", async () => {
      const failedTest = {
        ...QC_TEST_POTENCY,
        test_result: "88% - below threshold",
        result_status: "Fail" as const,
        verified_by: "USR-001",
      };
      mockPool.query.mockResolvedValueOnce(toResult([failedTest]));

      const updated = await qcService.updateTestResult(QC_TEST_POTENCY.test_id, {
        test_result: "88% - below threshold",
        result_status: "Fail",
        verified_by: "USR-001",
      });

      expect(updated?.result_status).toBe("Fail");
    });

    it("Step 4: Try to approve - fails (has failures)", async () => {
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "ROLLBACK") return toResult([]);
        if (text.includes("SELECT status FROM inventory_lots")) {
          return toResult([{ status: "Quarantine" }]);
        }
        if (text.includes("FROM qc_tests") && text.includes("COUNT")) {
          return toResult([{ total: "2", pending_count: "0", fail_count: "1" }]);
        }
        if (text.includes("result_status = 'Fail'")) {
          return toResult([{ test_id: "QC-BF-002", test_type: "Potency", test_date: "2026-01-16", result_status: "Fail" }]);
        }
        throw new Error(`Unexpected query: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);

      const result = await qcService.approveLot("LOT-BF-001", "USR-001");

      expect(result.success).toBe(false);
      expect(result.message).toContain("1");
      expect(client.released).toBe(true);
    });

    it("Step 5: Reject lot - status becomes Rejected", async () => {
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "COMMIT") return toResult([]);
        if (text.includes("SELECT status FROM inventory_lots")) {
          return toResult([{ status: "Quarantine" }]);
        }
        if (text.includes("UPDATE inventory_lots") && text.includes("Rejected")) {
          return toResult([]);
        }
        throw new Error(`Unexpected query: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);

      const result = await qcService.rejectLot("LOT-BF-001", "USR-001", "Failed potency test");

      expect(result.success).toBe(true);
      expect(result.message).toContain("từ chối");

      const updateCall = client.calls.find(
        (c) => c.text.includes("UPDATE inventory_lots") && c.text.includes("Rejected")
      );
      expect(updateCall).toBeDefined();
      expect(client.released).toBe(true);
    });
  });

  // ==========================================================================
  // FLOW 3: QC Business Rules
  // ==========================================================================
  describe("Flow 3: QC Business Rules", () => {
    it("Cannot approve lot with no tests", async () => {
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "ROLLBACK") return toResult([]);
        if (text.includes("SELECT status FROM inventory_lots")) {
          return toResult([{ status: "Quarantine" }]);
        }
        if (text.includes("FROM qc_tests") && text.includes("COUNT")) {
          return toResult([{ total: "0", pending_count: "0", fail_count: "0" }]);
        }
        throw new Error(`Unexpected query: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);

      const result = await qcService.approveLot("LOT-BF-001", "USR-001");

      expect(result.success).toBe(false);
      expect(result.message).toContain("chưa có kết quả kiểm tra");
      expect(client.released).toBe(true);
    });

    it("Cannot approve lot with pending tests", async () => {
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "ROLLBACK") return toResult([]);
        if (text.includes("SELECT status FROM inventory_lots")) {
          return toResult([{ status: "Quarantine" }]);
        }
        if (text.includes("FROM qc_tests") && text.includes("COUNT")) {
          return toResult([{ total: "3", pending_count: "2", fail_count: "0" }]);
        }
        if (text.includes("result_status = 'Pending'")) {
          return toResult([{ test_id: "QC-BF-001", test_type: "Identity", test_date: "2026-01-16", result_status: "Pending" }]);
        }
        throw new Error(`Unexpected query: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);

      const result = await qcService.approveLot("LOT-BF-001", "USR-001");

      expect(result.success).toBe(false);
      expect(result.message).toContain("2");
      expect(result.message).toContain("kết quả");
      expect(client.released).toBe(true);
    });

    it("Cannot approve lot that is not Quarantine", async () => {
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "ROLLBACK") return toResult([]);
        if (text.includes("SELECT status FROM inventory_lots")) {
          return toResult([{ status: "Accepted" }]);
        }
        throw new Error(`Unexpected query: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);

      const result = await qcService.approveLot("LOT-BF-001", "USR-001");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Accepted");
      expect(client.released).toBe(true);
    });

    it("Cannot reject already Rejected lot", async () => {
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "ROLLBACK") return toResult([]);
        if (text.includes("SELECT status FROM inventory_lots")) {
          return toResult([{ status: "Rejected" }]);
        }
        throw new Error(`Unexpected query: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);

      const result = await qcService.rejectLot("LOT-BF-001", "USR-001", "Duplicate rejection");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Rejected");
      expect(client.released).toBe(true);
    });

    it("Cannot reject Depleted lot", async () => {
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "ROLLBACK") return toResult([]);
        if (text.includes("SELECT status FROM inventory_lots")) {
          return toResult([{ status: "Depleted" }]);
        }
        throw new Error(`Unexpected query: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);

      const result = await qcService.rejectLot("LOT-BF-001", "USR-001", "Try to reject depleted");

      expect(result.success).toBe(false);
      expect(result.message).toContain("Depleted");
      expect(client.released).toBe(true);
    });
  });

  // ==========================================================================
  // FLOW 4: Production Batch Lifecycle
  // ==========================================================================
  describe("Flow 4: Production Batch Lifecycle", () => {
    it("Create batch - starts as Planned", async () => {
      mockPool.query
        // INSERT batch
        .mockResolvedValueOnce(toResult([BATCH]))
        // getBatchById -> SELECT batch
        .mockResolvedValueOnce(toResult([BATCH]))
        // getComponents -> empty
        .mockResolvedValueOnce(toResult([]));

      const result = await productionService.createBatch({
        batch_id: BATCH.batch_id,
        product_id: BATCH.product_id,
        batch_number: BATCH.batch_number,
        batch_size: BATCH.batch_size,
        unit_of_measure: BATCH.unit_of_measure,
        manufacture_date: BATCH.manufacture_date,
        expiration_date: BATCH.expiration_date,
      });

      expect(result.status).toBe("Planned");
      expect(result.batch_size).toBe(1000);
    });

    it("Validate: batch_size must be > 0", async () => {
      await expect(
        productionService.createBatch({
          product_id: "MAT-BF-001",
          batch_number: "B-INVALID",
          batch_size: 0,
          unit_of_measure: "tablets",
          manufacture_date: "2026-02-01",
          expiration_date: "2028-02-01",
        })
      ).rejects.toThrow("Batch size must be greater than zero");

      await expect(
        productionService.createBatch({
          product_id: "MAT-BF-001",
          batch_number: "B-INVALID",
          batch_size: -10,
          unit_of_measure: "tablets",
          manufacture_date: "2026-02-01",
          expiration_date: "2028-02-01",
        })
      ).rejects.toThrow("Batch size must be greater than zero");
    });

    it("Validate: expiration_date >= manufacture_date", async () => {
      await expect(
        productionService.createBatch({
          product_id: "MAT-BF-001",
          batch_number: "B-INVALID",
          batch_size: 100,
          unit_of_measure: "tablets",
          manufacture_date: "2026-06-01",
          expiration_date: "2026-01-01", // before manufacture
        })
      ).rejects.toThrow("Expiration date must be on or after manufacture date");
    });

    it("Transition Planned -> In Progress", async () => {
      const inProgressBatch = { ...BATCH, status: "In Progress" };

      // updateBatchStatus uses pool.connect() for transaction
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "COMMIT") return toResult([]);
        if (text.includes("SELECT") && text.includes("FOR UPDATE")) {
          return toResult([BATCH]); // current batch (Planned)
        }
        if (text.includes("UPDATE production_batches")) return toResult([]);
        throw new Error(`Unexpected client query: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);

      // After commit, getBatchById uses pool.query
      mockPool.query
        .mockResolvedValueOnce(toResult([inProgressBatch])) // SELECT batch
        .mockResolvedValueOnce(toResult([COMPONENT]));       // getComponents

      const result = await productionService.updateBatchStatus(BATCH.batch_id, "In Progress");

      expect(result?.status).toBe("In Progress");
    });

    it("Validate: cannot go Planned -> Complete (skip)", async () => {
      // updateBatchStatus uses pool.connect() for transaction
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "ROLLBACK") return toResult([]);
        if (text.includes("SELECT") && text.includes("FOR UPDATE")) {
          return toResult([BATCH]); // current batch (Planned)
        }
        throw new Error(`Unexpected client query: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);

      await expect(
        productionService.updateBatchStatus(BATCH.batch_id, "Complete")
      ).rejects.toThrow("Invalid status transition: Planned -> Complete");
    });

    it("Transition In Progress -> Complete", async () => {
      const inProgressBatch = { ...BATCH, status: "In Progress" };
      const completeBatch = { ...BATCH, status: "Complete" };

      // updateBatchStatus uses pool.connect() for transaction
      // For Complete status: checks unconsumed components, creates lot + transaction
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "COMMIT") return toResult([]);
        if (text.includes("SELECT") && text.includes("FOR UPDATE")) {
          return toResult([inProgressBatch]); // current batch (In Progress)
        }
        // Check unconsumed components (all consumed)
        if (text.includes("batch_components") && text.includes("actual_quantity IS NULL")) {
          return toResult([{ cnt: "0" }]);
        }
        // Lot ID sequence
        if (text.includes("lot_id AS max_id")) {
          return toResult([{ max_id: "LOT-050" }]);
        }
        // INSERT finished product lot
        if (text.includes("INSERT INTO inventory_lots")) return toResult([]);
        // INSERT receipt transaction
        if (text.includes("INSERT INTO inventory_transactions")) return toResult([]);
        // UPDATE batch status
        if (text.includes("UPDATE production_batches")) return toResult([]);
        throw new Error(`Unexpected client query: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);

      // After commit, getBatchById uses pool.query
      mockPool.query
        .mockResolvedValueOnce(toResult([completeBatch])) // SELECT batch
        .mockResolvedValueOnce(toResult([COMPONENT]));     // getComponents

      const result = await productionService.updateBatchStatus(BATCH.batch_id, "Complete");

      expect(result?.status).toBe("Complete");
    });
  });

  // ==========================================================================
  // FLOW 5: Production Material Consumption
  // ==========================================================================
  describe("Flow 5: Production Material Consumption", () => {
    const ACCEPTED_LOT_ROW = {
      lot_id: "LOT-BF-001",
      material_id: "MAT-BF-001",
      expiration_date: "2027-06-15",
      status: "Accepted",
      quantity: 500,
      unit_of_measure: "kg",
      manufacturer_lot: "MFG-2026-BF",
      supplier_name: "Global Suppliers Co.",
      material_name: "Acetaminophen API",
    };

    it("Add component to batch - validates lot is Accepted, not expired, sufficient qty", async () => {
      mockPool.query
        // SELECT batch (Planned)
        .mockResolvedValueOnce(toResult([BATCH]))
        // SELECT lot (Accepted, not expired, qty=500)
        .mockResolvedValueOnce(toResult([ACCEPTED_LOT_ROW]))
        // INSERT component
        .mockResolvedValueOnce(toResult([COMPONENT]))
        // getComponents (reload)
        .mockResolvedValueOnce(toResult([COMPONENT]));

      const result = await productionService.addComponent(BATCH.batch_id, {
        component_id: COMPONENT.component_id,
        lot_id: LOT.lot_id,
        planned_quantity: 500,
        unit_of_measure: "kg",
        added_by: "USR-004",
      });

      expect(result.lot_id).toBe("LOT-BF-001");
      expect(result.planned_quantity).toBe(500);
    });

    it("Cannot add component from Quarantine lot", async () => {
      mockPool.query
        .mockResolvedValueOnce(toResult([BATCH]))
        .mockResolvedValueOnce(toResult([{ ...ACCEPTED_LOT_ROW, status: "Quarantine" }]));

      await expect(
        productionService.addComponent(BATCH.batch_id, {
          lot_id: LOT.lot_id,
          planned_quantity: 100,
          unit_of_measure: "kg",
        })
      ).rejects.toThrow("Only accepted lots can be added as components");
    });

    it("Cannot add component from Rejected lot", async () => {
      mockPool.query
        .mockResolvedValueOnce(toResult([BATCH]))
        .mockResolvedValueOnce(toResult([{ ...ACCEPTED_LOT_ROW, status: "Rejected" }]));

      await expect(
        productionService.addComponent(BATCH.batch_id, {
          lot_id: LOT.lot_id,
          planned_quantity: 100,
          unit_of_measure: "kg",
        })
      ).rejects.toThrow("Only accepted lots can be added as components");
    });

    it("Cannot add expired lot", async () => {
      mockPool.query
        .mockResolvedValueOnce(toResult([BATCH]))
        .mockResolvedValueOnce(
          toResult([{ ...ACCEPTED_LOT_ROW, expiration_date: "2020-01-01" }])
        );

      await expect(
        productionService.addComponent(BATCH.batch_id, {
          lot_id: LOT.lot_id,
          planned_quantity: 100,
          unit_of_measure: "kg",
        })
      ).rejects.toThrow("Cannot add an expired lot as a batch component");
    });

    it("Cannot add more than available quantity", async () => {
      mockPool.query
        .mockResolvedValueOnce(toResult([BATCH]))
        .mockResolvedValueOnce(toResult([{ ...ACCEPTED_LOT_ROW, quantity: 50 }]));

      await expect(
        productionService.addComponent(BATCH.batch_id, {
          lot_id: LOT.lot_id,
          planned_quantity: 100,
          unit_of_measure: "kg",
        })
      ).rejects.toThrow("Planned quantity exceeds available lot quantity");
    });

    it("Consume material - lot qty decreases (partial)", async () => {
      const inProgressBatch = { ...BATCH, status: "In Progress", batch_number: "B-2026-BF-001" };

      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "COMMIT") return toResult([]);
        if (text.includes("FROM production_batches") && text.includes("FOR UPDATE")) {
          return toResult([inProgressBatch]);
        }
        if (text.includes("FROM batch_components bc") && text.includes("FOR UPDATE")) {
          return toResult([{ ...COMPONENT, lot_status: "Accepted", lot_quantity: 500 }]);
        }
        if (text.includes("FROM inventory_lots l") && text.includes("FOR UPDATE")) {
          return toResult([ACCEPTED_LOT_ROW]);
        }
        if (
          text.includes("UPDATE batch_components") ||
          text.includes("UPDATE inventory_lots") ||
          text.includes("INSERT INTO inventory_transactions")
        ) {
          return toResult([]);
        }
        throw new Error(`Unexpected: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);

      // After commit, getComponents reload
      mockPool.query.mockResolvedValueOnce(
        toResult([{ ...COMPONENT, actual_quantity: 200, lot_status: "Accepted", lot_quantity: 300 }])
      );

      const result = await productionService.consumeMaterial("BATCH-BF-001", "COMP-BF-001", 200);

      // Lot remains Accepted because 300kg remains
      const lotUpdate = client.calls.find((c) => c.text.includes("UPDATE inventory_lots"));
      expect(lotUpdate).toBeDefined();
      expect(lotUpdate!.values).toEqual([300, "Accepted", "LOT-BF-001"]);

      // Transaction with -200
      const txn = client.calls.find((c) => c.text.includes("INSERT INTO inventory_transactions"));
      expect(txn).toBeDefined();
      expect(txn!.values![2]).toBe(-200);

      expect(result.actual_quantity).toBe(200);
    });

    it("Consume all - lot becomes Depleted", async () => {
      const inProgressBatch = { ...BATCH, status: "In Progress", batch_number: "B-2026-BF-001" };

      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "COMMIT") return toResult([]);
        if (text.includes("FROM production_batches") && text.includes("FOR UPDATE")) {
          return toResult([inProgressBatch]);
        }
        if (text.includes("FROM batch_components bc") && text.includes("FOR UPDATE")) {
          return toResult([{ ...COMPONENT, lot_status: "Accepted", lot_quantity: 500 }]);
        }
        if (text.includes("FROM inventory_lots l") && text.includes("FOR UPDATE")) {
          return toResult([ACCEPTED_LOT_ROW]);
        }
        if (
          text.includes("UPDATE batch_components") ||
          text.includes("UPDATE inventory_lots") ||
          text.includes("INSERT INTO inventory_transactions")
        ) {
          return toResult([]);
        }
        throw new Error(`Unexpected: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);

      // After commit, getComponents reload with Depleted status
      mockPool.query.mockResolvedValueOnce(
        toResult([{ ...COMPONENT, actual_quantity: 500, lot_status: "Depleted", lot_quantity: 0 }])
      );

      const result = await productionService.consumeMaterial("BATCH-BF-001", "COMP-BF-001", 500);

      // Lot becomes Depleted
      const lotUpdate = client.calls.find((c) => c.text.includes("UPDATE inventory_lots"));
      expect(lotUpdate).toBeDefined();
      expect(lotUpdate!.values).toEqual([0, "Depleted", "LOT-BF-001"]);

      expect(result.actual_quantity).toBe(500);
      expect(result.lot_status).toBe("Depleted");
      expect(result.lot_quantity).toBe(0);
    });

    it("Usage transaction is created automatically on consume", async () => {
      const inProgressBatch = { ...BATCH, status: "In Progress", batch_number: "B-2026-BF-001" };

      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "COMMIT") return toResult([]);
        if (text.includes("FROM production_batches") && text.includes("FOR UPDATE")) {
          return toResult([inProgressBatch]);
        }
        if (text.includes("FROM batch_components bc") && text.includes("FOR UPDATE")) {
          return toResult([{ ...COMPONENT, lot_status: "Accepted", lot_quantity: 500 }]);
        }
        if (text.includes("FROM inventory_lots l") && text.includes("FOR UPDATE")) {
          return toResult([ACCEPTED_LOT_ROW]);
        }
        if (
          text.includes("UPDATE batch_components") ||
          text.includes("UPDATE inventory_lots") ||
          text.includes("INSERT INTO inventory_transactions")
        ) {
          return toResult([]);
        }
        throw new Error(`Unexpected: ${text}`);
      });
      mockPool.connect.mockResolvedValueOnce(client);
      mockPool.query.mockResolvedValueOnce(
        toResult([{ ...COMPONENT, actual_quantity: 300, lot_status: "Accepted", lot_quantity: 200 }])
      );

      await productionService.consumeMaterial("BATCH-BF-001", "COMP-BF-001", 300);

      // Verify that an inventory_transactions INSERT was made
      const txnInsert = client.calls.find((c) =>
        c.text.includes("INSERT INTO inventory_transactions")
      );
      expect(txnInsert).toBeDefined();
      expect(txnInsert!.values![1]).toBe("LOT-BF-001");        // lot_id
      expect(txnInsert!.values![2]).toBe(-300);                  // negative qty (Usage)
      expect(txnInsert!.values![3]).toBe("kg");                  // unit
      expect(txnInsert!.values![4]).toBe("BATCH-BF-001");        // reference_id = batchId
      expect(txnInsert!.values![5]).toBe("Consumed for production batch B-2026-BF-001");
    });
  });

  // ==========================================================================
  // FLOW 6: Lot Status Transitions
  // ==========================================================================
  describe("Flow 6: Lot Status Transitions", () => {
    it("Quarantine -> Accepted (valid)", async () => {
      mockPool.query
        .mockResolvedValueOnce(toResult([{ ...LOT, status: "Quarantine" }]))
        .mockResolvedValueOnce(toResult([{ ...LOT, status: "Accepted" }]));

      const result = await lotService.updateLotStatus("LOT-BF-001", "Accepted");
      expect(result?.status).toBe("Accepted");
    });

    it("Quarantine -> Rejected (valid)", async () => {
      mockPool.query
        .mockResolvedValueOnce(toResult([{ ...LOT, status: "Quarantine" }]))
        .mockResolvedValueOnce(toResult([{ ...LOT, status: "Rejected" }]));

      const result = await lotService.updateLotStatus("LOT-BF-001", "Rejected");
      expect(result?.status).toBe("Rejected");
    });

    it("Accepted -> Depleted (valid)", async () => {
      mockPool.query
        .mockResolvedValueOnce(toResult([{ ...LOT, status: "Accepted" }]))
        .mockResolvedValueOnce(toResult([{ ...LOT, status: "Depleted" }]));

      const result = await lotService.updateLotStatus("LOT-BF-001", "Depleted");
      expect(result?.status).toBe("Depleted");
    });

    it("Accepted -> Rejected (valid)", async () => {
      mockPool.query
        .mockResolvedValueOnce(toResult([{ ...LOT, status: "Accepted" }]))
        .mockResolvedValueOnce(toResult([{ ...LOT, status: "Rejected" }]));

      const result = await lotService.updateLotStatus("LOT-BF-001", "Rejected");
      expect(result?.status).toBe("Rejected");
    });

    it("Rejected -> anything (invalid, throw error)", async () => {
      // Rejected -> Accepted
      mockPool.query.mockResolvedValueOnce(toResult([{ ...LOT, status: "Rejected" }]));
      await expect(
        lotService.updateLotStatus("LOT-BF-001", "Accepted")
      ).rejects.toThrow("Invalid status transition: Rejected -> Accepted. Allowed: none");

      // Rejected -> Quarantine
      mockPool.query.mockResolvedValueOnce(toResult([{ ...LOT, status: "Rejected" }]));
      await expect(
        lotService.updateLotStatus("LOT-BF-001", "Quarantine" as any)
      ).rejects.toThrow("Invalid status transition: Rejected -> Quarantine. Allowed: none");

      // Rejected -> Depleted
      mockPool.query.mockResolvedValueOnce(toResult([{ ...LOT, status: "Rejected" }]));
      await expect(
        lotService.updateLotStatus("LOT-BF-001", "Depleted")
      ).rejects.toThrow("Invalid status transition: Rejected -> Depleted. Allowed: none");
    });

    it("Depleted -> anything (invalid, throw error)", async () => {
      // Depleted -> Accepted
      mockPool.query.mockResolvedValueOnce(toResult([{ ...LOT, status: "Depleted" }]));
      await expect(
        lotService.updateLotStatus("LOT-BF-001", "Accepted")
      ).rejects.toThrow("Invalid status transition: Depleted -> Accepted. Allowed: none");

      // Depleted -> Quarantine
      mockPool.query.mockResolvedValueOnce(toResult([{ ...LOT, status: "Depleted" }]));
      await expect(
        lotService.updateLotStatus("LOT-BF-001", "Quarantine" as any)
      ).rejects.toThrow("Invalid status transition: Depleted -> Quarantine. Allowed: none");

      // Depleted -> Rejected
      mockPool.query.mockResolvedValueOnce(toResult([{ ...LOT, status: "Depleted" }]));
      await expect(
        lotService.updateLotStatus("LOT-BF-001", "Rejected")
      ).rejects.toThrow("Invalid status transition: Depleted -> Rejected. Allowed: none");
    });
  });
});
