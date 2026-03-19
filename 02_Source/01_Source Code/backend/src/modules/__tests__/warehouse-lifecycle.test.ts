/**
 * WAREHOUSE LIFECYCLE INTEGRATION TEST
 *
 * Test luan nghiep vu xuyen suot nhieu doi tuong:
 *   Material -> Lot -> QCTest -> ProductionBatch -> BatchComponent -> InventoryTransaction
 *
 * Luong chinh:
 *   1. Tao Material (catalog)                    -> chi tao record, khong anh huong gi
 *   2. Tao Lot (gan voi Material)                -> status = "Quarantine", chua dung duoc
 *   3. Tao QC Test cho Lot                       -> result_status = "Pending"
 *   4. Cap nhat QC Test -> Pass                  -> lot VAN chua doi status
 *   5. Phe duyet Lot (approveLot)                -> lot: Quarantine -> "Accepted"
 *   6. Tao Production Batch                      -> status = "Planned"
 *   7. Them Component (gan Lot vao Batch)         -> validate lot Accepted, chua het han
 *   8. Chuyen Batch sang "In Progress"           -> chi "In Progress" moi consume duoc
 *   9. Consume Material                          -> 3 bang thay doi trong 1 transaction:
 *        - batch_components.actual_quantity = X
 *        - inventory_lots.quantity giam, co the -> "Depleted"
 *        - inventory_transactions: +1 record (Usage, qty am)
 *
 * Negative tests:
 *   - Khong the them lot Quarantine vao batch
 *   - Khong the approve lot khi QC test con Pending
 *   - Khong the consume khi batch khong phai "In Progress"
 */

import pool from "../../shared/db/pool";
import * as materialService from "../materials/material.service";
import * as lotService from "../lots/lot.service";
import * as qcService from "../qc/qc.service";
import * as productionService from "../production/production.service";
import { QueryResult, QueryResultRow, PoolClient } from "pg";
import { QCTestType } from "../qc/qc.types";

// ── Mock setup ──────────────────────────────────────────────────

jest.mock("../../shared/db/pool", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

// Redis + Elasticsearch mocks (material.service imports them)
jest.mock("../../shared/cache/redis", () => ({
  __esModule: true,
  default: { del: jest.fn(), get: jest.fn(), setEx: jest.fn() },
  CACHE_TTL: 300,
}));

jest.mock("../search/search.service", () => ({
  indexMaterial: jest.fn(),
  deleteMaterialIndex: jest.fn(),
}));

const mockQuery = pool.query as jest.Mock;
const mockConnect = pool.connect as jest.Mock;

const toResult = <T extends QueryResultRow>(rows: T[]): QueryResult<T> => ({
  command: "SELECT",
  rowCount: rows.length,
  oid: 0,
  fields: [],
  rows,
});

// Mock PoolClient for transaction-based operations (consumeMaterial, approveLot)
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

// ── Test data ───────────────────────────────────────────────────

const MATERIAL = {
  material_id: "MAT-TEST-001",
  part_number: "PN-TEST-001",
  material_name: "Acetaminophen API Test",
  material_type: "API",
  storage_conditions: "15-25C, dry place",
  specification_document: "SPEC-TEST-001",
  created_date: new Date("2026-01-01"),
  modified_date: new Date("2026-01-01"),
};

const LOT = {
  lot_id: "LOT-TEST-001",
  material_id: "MAT-TEST-001",
  manufacturer_name: "PharmaChem Inc.",
  manufacturer_lot: "MFG-2026-TEST",
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
  po_number: "PO-TEST-001",
  receiving_form_id: "RF-TEST-001",
  created_date: new Date("2026-01-15"),
  modified_date: new Date("2026-01-15"),
  material_name: "Acetaminophen API Test",
  material_type: "API",
  part_number: "PN-TEST-001",
};

const QC_TEST = {
  test_id: "QC-TEST-001",
  lot_id: "LOT-TEST-001",
  test_type: "Identity" as QCTestType,
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

const BATCH = {
  batch_id: "BATCH-TEST-001",
  product_id: "MAT-TEST-001",
  batch_number: "B-2026-TEST-001",
  batch_size: 1000,
  unit_of_measure: "tablets",
  manufacture_date: "2026-02-01",
  expiration_date: "2028-02-01",
  status: "Planned" as const,
  created_date: new Date("2026-02-01"),
  modified_date: new Date("2026-02-01"),
  product_name: "Acetaminophen API Test",
};

const COMPONENT = {
  component_id: "COMP-TEST-001",
  batch_id: "BATCH-TEST-001",
  lot_id: "LOT-TEST-001",
  planned_quantity: 500,
  actual_quantity: null,
  unit_of_measure: "kg",
  addition_date: new Date("2026-02-01"),
  added_by: "USR-004",
  created_date: new Date("2026-02-01"),
  modified_date: new Date("2026-02-01"),
  material_id: "MAT-TEST-001",
  material_name: "Acetaminophen API Test",
  manufacturer_lot: "MFG-2026-TEST",
  lot_status: "Accepted",
  lot_expiration_date: "2027-06-15",
  lot_quantity: 500,
};

// ── Tests ───────────────────────────────────────────────────────

describe("Warehouse Lifecycle Integration", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ================================================================
  // BUOC 1: Tao Material -> chi INSERT vao bang materials
  // ================================================================
  describe("Buoc 1: Tao Material", () => {
    it("tao material chi tac dong bang materials, khong anh huong lot hay transaction", async () => {
      mockQuery.mockResolvedValueOnce(toResult([])); // generateMaterialId
      mockQuery.mockResolvedValueOnce(toResult([MATERIAL])); // INSERT

      const result = await materialService.createMaterial({
        part_number: MATERIAL.part_number,
        material_name: MATERIAL.material_name,
        material_type: MATERIAL.material_type,
        storage_conditions: MATERIAL.storage_conditions,
        specification_document: MATERIAL.specification_document,
      });

      // Co 2 query: generateMaterialId SELECT + INSERT vao materials
      expect(mockQuery).toHaveBeenCalledTimes(2);
      const sql = mockQuery.mock.calls[1][0] as string;
      expect(sql).toContain("INSERT INTO materials");
      // Khong co query nao toi inventory_lots hoac inventory_transactions
      expect(sql).not.toContain("inventory_lots");
      expect(sql).not.toContain("inventory_transactions");

      expect(result.material_id).toBe("MAT-TEST-001");
      expect(result.material_name).toBe("Acetaminophen API Test");
    });
  });

  // ================================================================
  // BUOC 2: Tao Lot -> status = Quarantine, gan voi Material
  // ================================================================
  describe("Buoc 2: Tao Lot (gan voi Material)", () => {
    it("lot moi luon co status Quarantine, khong tu tao Transaction", async () => {
      mockQuery.mockResolvedValueOnce(toResult([])); // generateLotId
      mockQuery.mockResolvedValueOnce(toResult([LOT])); // INSERT

      const result = await lotService.createLot({
        material_id: LOT.material_id,
        manufacturer_name: LOT.manufacturer_name,
        manufacturer_lot: LOT.manufacturer_lot,
        supplier_name: LOT.supplier_name,
        received_date: LOT.received_date,
        expiration_date: LOT.expiration_date,
        quantity: LOT.quantity,
        unit_of_measure: LOT.unit_of_measure,
        storage_location: LOT.storage_location,
        po_number: LOT.po_number,
        receiving_form_id: LOT.receiving_form_id,
      });

      // Co 2 query: generateLotId SELECT + INSERT lot
      expect(mockQuery).toHaveBeenCalledTimes(2);
      const sql = mockQuery.mock.calls[1][0] as string;
      expect(sql).toContain("INSERT INTO inventory_lots");
      expect(sql).toContain("'Quarantine'");
      // Khong tu dong tao transaction
      expect(sql).not.toContain("inventory_transactions");

      expect(result.status).toBe("Quarantine");
      expect(result.material_id).toBe("MAT-TEST-001");
      expect(result.quantity).toBe(500);
    });
  });

  // ================================================================
  // BUOC 3 + 4: QC Test Pending -> Pass (lot CHUA doi status)
  // ================================================================
  describe("Buoc 3-4: QC Test lifecycle", () => {
    it("tao QC test voi status Pending, cap nhat Pass -> lot van khong tu doi status", async () => {
      // Buoc 3: Tao QC test -> Pending
      mockQuery.mockResolvedValueOnce(toResult([{ max_id: 'QC-015' }])); // MAX test_id
      mockQuery.mockResolvedValueOnce(toResult([QC_TEST])); // INSERT

      const test = await qcService.createTest({
        lot_id: QC_TEST.lot_id,
        test_type: QC_TEST.test_type,
        test_method: QC_TEST.test_method,
        test_date: QC_TEST.test_date,
        acceptance_criteria: QC_TEST.acceptance_criteria,
        performed_by: QC_TEST.performed_by,
      });

      expect(test.result_status).toBe("Pending");
      expect(test.lot_id).toBe("LOT-TEST-001");

      // Verify: chi INSERT vao qc_tests, KHONG UPDATE inventory_lots
      const createSql = mockQuery.mock.calls[1][0] as string;
      expect(createSql).toContain("INSERT INTO qc_tests");
      expect(createSql).not.toContain("inventory_lots");

      jest.clearAllMocks();

      // Buoc 4: Update test result -> Pass
      const passedTest = { ...QC_TEST, test_result: "98.5% purity", result_status: "Pass", verified_by: "USR-001" };
      mockQuery.mockResolvedValueOnce(toResult([passedTest]));

      const updated = await qcService.updateTestResult(QC_TEST.test_id, {
        test_result: "98.5% purity",
        result_status: "Pass",
        verified_by: "USR-001",
      });

      expect(updated?.result_status).toBe("Pass");
      // QUAN TRONG: update test KHONG tu dong doi status cua lot
      const updateSql = mockQuery.mock.calls[0][0] as string;
      expect(updateSql).toContain("UPDATE qc_tests");
      expect(updateSql).not.toContain("inventory_lots");
    });
  });

  // ================================================================
  // BUOC 5: Approve Lot -> Quarantine -> Accepted
  //   Dieu kien: tat ca QC tests deu Pass
  //   Thay doi: inventory_lots.status = "Accepted"
  // ================================================================
  describe("Buoc 5: Approve Lot (QC duyet)", () => {
    it("tat ca tests Pass -> lot chuyen tu Quarantine sang Accepted", async () => {
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "COMMIT") return toResult([]);
        // Kiem tra lot status
        if (text.includes("SELECT status FROM inventory_lots")) {
          return toResult([{ status: "Quarantine" }]);
        }
        // Kiem tra tat ca tests
        if (text.includes("FROM qc_tests") && text.includes("COUNT")) {
          return toResult([{ total: "1", pending_count: "0", fail_count: "0" }]);
        }
        // Update lot status -> Accepted
        if (text.includes("UPDATE inventory_lots") && text.includes("Accepted")) {
          return toResult([]);
        }
        throw new Error(`Unexpected: ${text}`);
      });
      mockConnect.mockResolvedValueOnce(client);

      const result = await qcService.approveLot("LOT-TEST-001", "USR-001");

      expect(result.success).toBe(true);
      expect(result.message).toContain("thành công");

      // Verify: da UPDATE inventory_lots SET status = 'Accepted'
      const updateCall = client.calls.find(
        (c) => c.text.includes("UPDATE inventory_lots") && c.text.includes("Accepted")
      );
      expect(updateCall).toBeDefined();
      expect(updateCall!.values).toContain("LOT-TEST-001");

      // Verify: su dung DB transaction (BEGIN + COMMIT)
      expect(client.calls[0].text).toBe("BEGIN");
      expect(client.calls[client.calls.length - 1].text).toBe("COMMIT");
      expect(client.released).toBe(true);
    });
  });

  // ================================================================
  // BUOC 6: Tao Production Batch -> status = "Planned"
  // ================================================================
  describe("Buoc 6: Tao Production Batch", () => {
    it("batch moi co status Planned, chua co component nao", async () => {
      mockQuery
        // INSERT batch
        .mockResolvedValueOnce(toResult([BATCH]))
        // getBatchById -> SELECT batch
        .mockResolvedValueOnce(toResult([BATCH]))
        // getComponents -> SELECT components (chua co)
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
      expect(result.product_name).toBe("Acetaminophen API Test");
      expect(result.components).toEqual([]);

      // Verify: chi tac dong production_batches
      const insertSql = mockQuery.mock.calls[0][0] as string;
      expect(insertSql).toContain("INSERT INTO production_batches");
      expect(insertSql).not.toContain("inventory_lots");
      expect(insertSql).not.toContain("inventory_transactions");
    });
  });

  // ================================================================
  // BUOC 7: Them Component (gan Lot Accepted vao Batch)
  //   Validate: lot.status == Accepted, chua het han, du so luong
  // ================================================================
  describe("Buoc 7: Them Component vao Batch", () => {
    it("lot Accepted duoc them thanh cong vao batch", async () => {
      const acceptedLot = { ...LOT, status: "Accepted" };
      mockQuery
        // SELECT batch
        .mockResolvedValueOnce(toResult([BATCH]))
        // SELECT lot (Accepted)
        .mockResolvedValueOnce(
          toResult([
            {
              lot_id: acceptedLot.lot_id,
              material_id: acceptedLot.material_id,
              expiration_date: acceptedLot.expiration_date,
              status: acceptedLot.status,
              quantity: acceptedLot.quantity,
              unit_of_measure: acceptedLot.unit_of_measure,
              manufacturer_lot: acceptedLot.manufacturer_lot,
              supplier_name: acceptedLot.supplier_name,
              material_name: acceptedLot.material_name,
            },
          ])
        )
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

      expect(result.lot_id).toBe("LOT-TEST-001");
      expect(result.planned_quantity).toBe(500);
      expect(result.batch_id).toBe("BATCH-TEST-001");
    });
  });

  // ================================================================
  // BUOC 8: Chuyen Batch sang "In Progress"
  // ================================================================
  describe("Buoc 8: Batch Planned -> In Progress", () => {
    it("chuyen status thanh cong tu Planned sang In Progress", async () => {
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
      mockConnect.mockResolvedValueOnce(client);

      // After commit, getBatchById uses pool.query
      mockQuery
        .mockResolvedValueOnce(toResult([inProgressBatch])) // SELECT batch
        .mockResolvedValueOnce(toResult([COMPONENT]));       // getComponents

      const result = await productionService.updateBatchStatus(
        BATCH.batch_id,
        "In Progress"
      );

      expect(result?.status).toBe("In Progress");

      // Verify: chi UPDATE production_batches, khong dong den lot hay transaction
      const updateCall = client.calls.find((c) => c.text.includes("UPDATE production_batches"));
      expect(updateCall).toBeDefined();
      expect(updateCall!.text).not.toContain("inventory_lots");
      expect(client.released).toBe(true);
    });
  });

  // ================================================================
  // BUOC 9: Consume Material
  //   DAY LA BUOC QUAN TRONG NHAT - 3 BANG THAY DOI TRONG 1 TRANSACTION:
  //   1. batch_components.actual_quantity = 500
  //   2. inventory_lots: quantity 500 -> 0, status -> "Depleted"
  //   3. inventory_transactions: +1 (type=Usage, qty=-500, ref=batch_id)
  // ================================================================
  describe("Buoc 9: Consume Material (3 bang thay doi)", () => {
    it("consume het lot -> lot Depleted, transaction Usage duoc tao", async () => {
      const inProgressBatch = { ...BATCH, status: "In Progress", batch_number: "B-2026-TEST-001" };

      const client = createMockClient((text, values) => {
        if (text === "BEGIN" || text === "COMMIT") return toResult([]);

        // SELECT batch FOR UPDATE
        if (text.includes("FROM production_batches") && text.includes("FOR UPDATE")) {
          return toResult([inProgressBatch]);
        }

        // SELECT component FOR UPDATE
        if (text.includes("FROM batch_components bc") && text.includes("FOR UPDATE")) {
          return toResult([
            {
              ...COMPONENT,
              lot_status: "Accepted",
              lot_quantity: 500,
            },
          ]);
        }

        // SELECT lot FOR UPDATE
        if (text.includes("FROM inventory_lots l") && text.includes("FOR UPDATE")) {
          return toResult([
            {
              lot_id: "LOT-TEST-001",
              material_id: "MAT-TEST-001",
              expiration_date: "2027-06-15",
              status: "Accepted",
              quantity: 500,
              unit_of_measure: "kg",
              manufacturer_lot: "MFG-2026-TEST",
              supplier_name: "Global Suppliers Co.",
              material_name: "Acetaminophen API Test",
            },
          ]);
        }

        // UPDATE batch_components SET actual_quantity
        if (text.includes("UPDATE batch_components")) return toResult([]);

        // UPDATE inventory_lots SET quantity, status
        if (text.includes("UPDATE inventory_lots")) return toResult([]);

        // INSERT inventory_transactions (Usage)
        if (text.includes("INSERT INTO inventory_transactions")) return toResult([]);

        throw new Error(`Unexpected client query: ${text}`);
      });

      mockConnect.mockResolvedValueOnce(client);

      // Pool query for reload after commit
      const depletedComponent = {
        ...COMPONENT,
        actual_quantity: 500,
        lot_status: "Depleted",
        lot_quantity: 0,
      };
      mockQuery.mockResolvedValueOnce(toResult([depletedComponent]));

      const result = await productionService.consumeMaterial(
        "BATCH-TEST-001",
        "COMP-TEST-001",
        500 // consume het 500kg
      );

      // ── Verify: batch_components cap nhat actual_quantity ──
      const componentUpdate = client.calls.find((c) =>
        c.text.includes("UPDATE batch_components")
      );
      expect(componentUpdate).toBeDefined();
      expect(componentUpdate!.values).toContain(500); // actual_quantity = 500
      expect(componentUpdate!.values).toContain("COMP-TEST-001");

      // ── Verify: inventory_lots quantity = 0, status = "Depleted" ──
      const lotUpdate = client.calls.find((c) =>
        c.text.includes("UPDATE inventory_lots")
      );
      expect(lotUpdate).toBeDefined();
      expect(lotUpdate!.values).toEqual([0, "Depleted", "LOT-TEST-001"]);

      // ── Verify: inventory_transactions INSERT (Usage, -500) ──
      const txnInsert = client.calls.find((c) =>
        c.text.includes("INSERT INTO inventory_transactions")
      );
      expect(txnInsert).toBeDefined();
      expect(txnInsert!.values![1]).toBe("LOT-TEST-001");       // lot_id
      expect(txnInsert!.values![2]).toBe(-500);                  // quantity (am)
      expect(txnInsert!.values![3]).toBe("kg");                  // unit
      expect(txnInsert!.values![4]).toBe("BATCH-TEST-001");      // reference_id = batch_id
      expect(txnInsert!.values![5]).toBe(                        // notes
        "Consumed for production batch B-2026-TEST-001"
      );

      // ── Verify: ket qua tra ve phan anh trang thai moi ──
      expect(result.actual_quantity).toBe(500);
      expect(result.lot_status).toBe("Depleted");
      expect(result.lot_quantity).toBe(0);

      // ── Verify: DB transaction duoc su dung (BEGIN/COMMIT) ──
      expect(client.calls[0].text).toBe("BEGIN");
      const lastCall = client.calls[client.calls.length - 1];
      expect(lastCall.text).toBe("COMMIT");
      expect(client.released).toBe(true);
    });

    it("consume 1 phan -> lot van Accepted, quantity giam", async () => {
      const inProgressBatch = { ...BATCH, status: "In Progress", batch_number: "B-2026-TEST-001" };

      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "COMMIT") return toResult([]);

        if (text.includes("FROM production_batches") && text.includes("FOR UPDATE")) {
          return toResult([inProgressBatch]);
        }

        if (text.includes("FROM batch_components bc") && text.includes("FOR UPDATE")) {
          return toResult([{ ...COMPONENT, lot_status: "Accepted", lot_quantity: 500 }]);
        }

        if (text.includes("FROM inventory_lots l") && text.includes("FOR UPDATE")) {
          return toResult([
            {
              lot_id: "LOT-TEST-001",
              material_id: "MAT-TEST-001",
              expiration_date: "2027-06-15",
              status: "Accepted",
              quantity: 500,
              unit_of_measure: "kg",
              manufacturer_lot: "MFG-2026-TEST",
              supplier_name: "Global Suppliers Co.",
              material_name: "Acetaminophen API Test",
            },
          ]);
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

      mockConnect.mockResolvedValueOnce(client);
      mockQuery.mockResolvedValueOnce(
        toResult([
          { ...COMPONENT, actual_quantity: 200, lot_status: "Accepted", lot_quantity: 300 },
        ])
      );

      const result = await productionService.consumeMaterial(
        "BATCH-TEST-001",
        "COMP-TEST-001",
        200 // chi consume 200/500kg
      );

      // Lot van Accepted vi con 300kg
      const lotUpdate = client.calls.find((c) => c.text.includes("UPDATE inventory_lots"));
      expect(lotUpdate!.values).toEqual([300, "Accepted", "LOT-TEST-001"]);

      // Transaction ghi -200
      const txn = client.calls.find((c) => c.text.includes("INSERT INTO inventory_transactions"));
      expect(txn!.values![2]).toBe(-200);

      expect(result.lot_status).toBe("Accepted");
      expect(result.lot_quantity).toBe(300);
    });
  });

  // ================================================================
  // NEGATIVE: Khong the them lot Quarantine vao batch
  // ================================================================
  describe("Negative: Lot Quarantine khong the dung cho san xuat", () => {
    it("addComponent tu choi lot Quarantine", async () => {
      mockQuery
        // SELECT batch (Planned - valid)
        .mockResolvedValueOnce(toResult([BATCH]))
        // SELECT lot (Quarantine - INVALID for production)
        .mockResolvedValueOnce(
          toResult([
            {
              lot_id: "LOT-TEST-001",
              material_id: "MAT-TEST-001",
              expiration_date: "2027-06-15",
              status: "Quarantine", // <-- chua duoc QC duyet
              quantity: 500,
              unit_of_measure: "kg",
              manufacturer_lot: "MFG-2026-TEST",
              supplier_name: "Global Suppliers Co.",
              material_name: "Acetaminophen API Test",
            },
          ])
        );

      await expect(
        productionService.addComponent(BATCH.batch_id, {
          lot_id: "LOT-TEST-001",
          planned_quantity: 100,
          unit_of_measure: "kg",
          added_by: "USR-004",
        })
      ).rejects.toThrow("Only accepted lots can be added as components");
    });
  });

  // ================================================================
  // NEGATIVE: Khong the approve lot khi QC test con Pending
  // ================================================================
  describe("Negative: Khong the approve lot khi QC con Pending", () => {
    it("approveLot tu choi khi con test Pending", async () => {
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "ROLLBACK") return toResult([]);
        if (text.includes("SELECT status FROM inventory_lots")) {
          return toResult([{ status: "Quarantine" }]);
        }
        if (text.includes("FROM qc_tests") && text.includes("COUNT")) {
          // 2 tests, 1 con Pending
          return toResult([{ total: "2", pending_count: "1", fail_count: "0" }]);
        }
        if (text.includes("result_status = 'Pending'")) {
          return toResult([{ test_id: "QC-TEST-001", test_type: "Identity", test_date: "2026-01-16", result_status: "Pending" }]);
        }
        throw new Error(`Unexpected: ${text}`);
      });
      mockConnect.mockResolvedValueOnce(client);

      const result = await qcService.approveLot("LOT-TEST-001", "USR-001");

      expect(result.success).toBe(false);
      expect(result.message).toContain("1");
      expect(result.message).toContain("kết quả");
      expect(client.released).toBe(true);
    });
  });

  // ================================================================
  // NEGATIVE: Khong the approve lot khi QC test Fail
  // ================================================================
  describe("Negative: Khong the approve lot khi co test Fail", () => {
    it("approveLot tu choi khi co test Fail", async () => {
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "ROLLBACK") return toResult([]);
        if (text.includes("SELECT status FROM inventory_lots")) {
          return toResult([{ status: "Quarantine" }]);
        }
        if (text.includes("FROM qc_tests") && text.includes("COUNT")) {
          return toResult([{ total: "2", pending_count: "0", fail_count: "1" }]);
        }
        if (text.includes("result_status = 'Fail'")) {
          return toResult([{ test_id: "QC-TEST-001", test_type: "Identity", test_date: "2026-01-16", result_status: "Fail" }]);
        }
        throw new Error(`Unexpected: ${text}`);
      });
      mockConnect.mockResolvedValueOnce(client);

      const result = await qcService.approveLot("LOT-TEST-001", "USR-001");

      expect(result.success).toBe(false);
      expect(result.message).toContain("1");
      expect(client.released).toBe(true);
    });
  });

  // ================================================================
  // NEGATIVE: Khong the consume khi batch khong phai "In Progress"
  // ================================================================
  describe("Negative: Consume chi khi batch In Progress", () => {
    it("consumeMaterial tu choi khi batch la Planned", async () => {
      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "ROLLBACK") return toResult([]);
        if (text.includes("FROM production_batches") && text.includes("FOR UPDATE")) {
          return toResult([{ ...BATCH, status: "Planned" }]);
        }
        throw new Error(`Unexpected: ${text}`);
      });
      mockConnect.mockResolvedValueOnce(client);

      await expect(
        productionService.consumeMaterial("BATCH-TEST-001", "COMP-TEST-001", 100)
      ).rejects.toThrow("Materials can only be consumed when the batch is In Progress");

      expect(client.released).toBe(true);
    });
  });

  // ================================================================
  // NEGATIVE: Khong the consume vuot qua so luong ton kho
  // ================================================================
  describe("Negative: Consume vuot qua ton kho", () => {
    it("consumeMaterial tu choi khi actual_quantity > lot.quantity", async () => {
      const inProgressBatch = { ...BATCH, status: "In Progress" };

      const client = createMockClient((text) => {
        if (text === "BEGIN" || text === "ROLLBACK") return toResult([]);

        if (text.includes("FROM production_batches") && text.includes("FOR UPDATE")) {
          return toResult([inProgressBatch]);
        }

        if (text.includes("FROM batch_components bc") && text.includes("FOR UPDATE")) {
          return toResult([{ ...COMPONENT, lot_status: "Accepted", lot_quantity: 500 }]);
        }

        if (text.includes("FROM inventory_lots l") && text.includes("FOR UPDATE")) {
          return toResult([
            {
              lot_id: "LOT-TEST-001",
              material_id: "MAT-TEST-001",
              expiration_date: "2027-06-15",
              status: "Accepted",
              quantity: 500,
              unit_of_measure: "kg",
              manufacturer_lot: "MFG-2026-TEST",
              supplier_name: "Global Suppliers Co.",
              material_name: "Acetaminophen API Test",
            },
          ]);
        }

        throw new Error(`Unexpected: ${text}`);
      });
      mockConnect.mockResolvedValueOnce(client);

      await expect(
        productionService.consumeMaterial("BATCH-TEST-001", "COMP-TEST-001", 999)
      ).rejects.toThrow("Actual quantity exceeds available lot quantity");

      expect(client.released).toBe(true);
    });
  });

  // ================================================================
  // LOT STATUS TRANSITIONS - Ma tran chuyen trang thai
  // ================================================================
  describe("Lot Status Transitions (anh huong boi nhieu module)", () => {
    it.each([
      ["Quarantine", "Accepted", true],
      ["Quarantine", "Rejected", true],
      ["Accepted", "Depleted", true],
      ["Accepted", "Rejected", true],
      ["Quarantine", "Depleted", false],
      ["Rejected", "Accepted", false],
      ["Rejected", "Quarantine", false],
      ["Depleted", "Accepted", false],
      ["Depleted", "Quarantine", false],
    ])(
      "%s -> %s: %s",
      async (from, to, shouldSucceed) => {
        mockQuery.mockResolvedValueOnce(
          toResult([{ ...LOT, status: from }])
        );

        if (shouldSucceed) {
          mockQuery.mockResolvedValueOnce(
            toResult([{ ...LOT, status: to }])
          );
          const result = await lotService.updateLotStatus(
            "LOT-TEST-001",
            to as any
          );
          expect(result?.status).toBe(to);
        } else {
          await expect(
            lotService.updateLotStatus("LOT-TEST-001", to as any)
          ).rejects.toThrow("Invalid status transition");
        }
      }
    );
  });
});
