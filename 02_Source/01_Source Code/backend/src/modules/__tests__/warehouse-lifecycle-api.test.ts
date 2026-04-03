/**
 * WAREHOUSE LIFECYCLE API INTEGRATION TEST (route-level with mocked services)
 *
 * This file exercises the same domain flow as warehouse-lifecycle.test.ts,
 * but targets HTTP layer / API routes one step closer to frontend behavior.
 *
 * It mocks auth/RBAC and module services so tests are deterministic.
 */

/* ---------- mock auth + rbac BEFORE imports ---------- */
jest.mock("../../security/auth", () => ({
  authenticateJWT: (_req: any, _res: any, next: any) => {
    _req.user = {
      user_id: "USR-001",
      username: "admin",
      roles: ["admin", "inventory_manager", "quality_control", "production", "viewer"],
    };
    next();
  },
}));

jest.mock("../../security/rbac", () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../materials/material.service");
jest.mock("../lots/lot.service");
jest.mock("../qc/qc.service");
jest.mock("../production/production.service");
jest.mock("../transactions/transaction.service");

/* ---------- imports ---------- */
import express from "express";
import request from "supertest";
import materialRouter from "../materials/material.routes";
import lotRouter from "../lots/lot.routes";
import qcRouter from "../qc/qc.routes";
import productionRouter from "../production/production.routes";

import * as materialService from "../materials/material.service";
import * as lotService from "../lots/lot.service";
import * as qcService from "../qc/qc.service";
import * as productionService from "../production/production.service";
import * as transactionService from "../transactions/transaction.service";

const materialSvc = materialService as jest.Mocked<typeof materialService>;
const lotSvc = lotService as jest.Mocked<typeof lotService>;
const qcSvc = qcService as jest.Mocked<typeof qcService>;
const productionSvc = productionService as jest.Mocked<typeof productionService>;
const txnSvc = transactionService as jest.Mocked<typeof transactionService>;

const app = express();
app.use(express.json());
app.use("/api/materials", materialRouter);
app.use("/api/lots", lotRouter);
app.use("/api/qc", qcRouter);
app.use("/api/production", productionRouter);

const MATERIAL = {
  material_id: "MAT-TEST-001",
  part_number: "PN-TEST-001",
  material_name: "Test API",
  material_type: "API",
  storage_conditions: "15-25C",
  specification_document: "SPEC-001",
};

const LOT = {
  lot_id: "LOT-TEST-001",
  material_id: "MAT-TEST-001",
  manufacturer_name: "PharmaChem",
  manufacturer_lot: "MFG-001",
  supplier_name: "SupplierA",
  received_date: "2026-01-15",
  expiration_date: "2027-01-15",
  status: "Quarantine",
  quantity: 500,
  unit_of_measure: "kg",
  storage_location: "WH1",
  po_number: "PO-001",
  receiving_form_id: "RF-001",
};

const QC_TEST = {
  test_id: "QC-TEST-001",
  lot_id: LOT.lot_id,
  test_type: "Identity",
  test_method: "HPLC",
  test_date: "2026-01-16",
  test_result: null,
  acceptance_criteria: ">=98%",
  result_status: "Pending",
  performed_by: "QC-USER",
  verified_by: null,
};

const BATCH = {
  batch_id: "BATCH-TEST-001",
  product_id: "MAT-TEST-001",
  batch_number: "B-2026-TEST-001",
  batch_size: 1000,
  unit_of_measure: "tablets",
  manufacture_date: "2026-02-01",
  expiration_date: "2028-02-01",
  status: "Planned",
};

const COMPONENT = {
  component_id: "COMP-TEST-001",
  batch_id: BATCH.batch_id,
  lot_id: LOT.lot_id,
  planned_quantity: 500,
  actual_quantity: null,
  unit_of_measure: "kg",
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("Warehouse lifecycle API integration", () => {
  it("full happy path through material/lot/qc/production routes", async () => {
    materialSvc.createMaterial.mockResolvedValueOnce(MATERIAL as any);
    lotSvc.createLot.mockResolvedValueOnce(LOT as any);
    txnSvc.createTransaction.mockResolvedValueOnce({ transaction_id: "TXN-1" } as any);
    qcSvc.createTest.mockResolvedValueOnce(QC_TEST as any);
    qcSvc.updateTestResult.mockResolvedValueOnce({ ...QC_TEST, result_status: "Pass", test_result: "98.5" } as any);
    qcSvc.approveLot.mockResolvedValueOnce({ success: true, message: "approved" });
    productionSvc.createBatch.mockResolvedValueOnce(BATCH as any);
    productionSvc.addComponent.mockResolvedValueOnce({ ...COMPONENT, lot_status: "Accepted" } as any);
    productionSvc.updateBatchStatus.mockResolvedValueOnce({ ...BATCH, status: "In Progress" } as any);
    productionSvc.consumeMaterial.mockResolvedValueOnce({ ...COMPONENT, actual_quantity: 200, lot_status: "Accepted", lot_quantity: 300 } as any);

    const mRes = await request(app).post("/api/materials").send({
      part_number: MATERIAL.part_number,
      material_name: MATERIAL.material_name,
      material_type: MATERIAL.material_type,
    });
    expect(mRes.status).toBe(201);
    expect(mRes.body.data.material_id).toBe(MATERIAL.material_id);

    const lRes = await request(app).post("/api/lots").send({
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
    expect(lRes.status).toBe(201);

    const qcCreateRes = await request(app).post("/api/qc/tests").send({
      lot_id: QC_TEST.lot_id,
      test_type: QC_TEST.test_type,
      test_method: QC_TEST.test_method,
      performed_by: QC_TEST.performed_by,
    });
    expect(qcCreateRes.status).toBe(201);

    const qcUpdateRes = await request(app).put(`/api/qc/tests/${QC_TEST.test_id}`).send({
      test_result: "98.5",
      result_status: "Pass",
      verified_by: "QC-USER",
    });
    expect(qcUpdateRes.status).toBe(200);

    const approveRes = await request(app).post(`/api/qc/approve/${LOT.lot_id}`);
    expect(approveRes.status).toBe(200);

    const batchRes = await request(app).post("/api/production/batches").send({
      product_id: BATCH.product_id,
      batch_number: BATCH.batch_number,
      batch_size: BATCH.batch_size,
      unit_of_measure: BATCH.unit_of_measure,
      manufacture_date: BATCH.manufacture_date,
      expiration_date: BATCH.expiration_date,
    });
    expect(batchRes.status).toBe(201);

    const addCompRes = await request(app).post(`/api/production/batches/${BATCH.batch_id}/components`).send({
      component_id: COMPONENT.component_id,
      lot_id: COMPONENT.lot_id,
      planned_quantity: COMPONENT.planned_quantity,
      unit_of_measure: COMPONENT.unit_of_measure,
    });
    expect(addCompRes.status).toBe(201);

    const statusRes = await request(app).patch(`/api/production/batches/${BATCH.batch_id}/status`).send({
      status: "In Progress",
    });
    expect(statusRes.status).toBe(200);

    const consumeRes = await request(app)
      .post(`/api/production/batches/${BATCH.batch_id}/components/${COMPONENT.component_id}/consume`)
      .send({ actual_quantity: 200 });
    expect(consumeRes.status).toBe(200);
    expect(consumeRes.body.data.actual_quantity).toBe(200);
  });

  it("rejects adding a quarantine lot to batch via production endpoint", async () => {
    productionSvc.addComponent.mockRejectedValueOnce(new Error("Only accepted lots can be added as components"));

    const res = await request(app)
      .post(`/api/production/batches/${BATCH.batch_id}/components`)
      .send({
        component_id: COMPONENT.component_id,
        lot_id: COMPONENT.lot_id,
        planned_quantity: 100,
        unit_of_measure: COMPONENT.unit_of_measure,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Only accepted lots");
  });

  it("rejects consuming material when batch not in progress", async () => {
    productionSvc.consumeMaterial.mockRejectedValueOnce(new Error("Materials can only be consumed when the batch is In Progress"));

    const res = await request(app)
      .post(`/api/production/batches/${BATCH.batch_id}/components/${COMPONENT.component_id}/consume`)
      .send({ actual_quantity: 100 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("In Progress");
  });
});
