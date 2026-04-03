/**
 * Warehouse Lifecycle DB Integration Test
 *
 * This test runs against a real PostgreSQL database (defined by DATABASE_URL or DB_* env vars)
 * and executes service methods for the main warehouse workflow.
 *
 * Usage:
 *   set DATABASE_URL=postgres://myuser:mypassword@localhost:5432/mydatabase
 *   set BYPASS_AUTH=true
 *   npm run test:db-integration
 */

import pool from "../../shared/db/pool";
import * as materialService from "../materials/material.service";
import * as lotService from "../lots/lot.service";
import * as qcService from "../qc/qc.service";
import * as productionService from "../production/production.service";

const UNIQUE = Date.now();

const materialDto = {
  part_number: `PN-E2E-${UNIQUE}`,
  material_name: `Material E2E ${UNIQUE}`,
  material_type: "API",
  storage_conditions: "room temperature",
  specification_document: "SPEC-E2E",
};

const lotDto = {
  manufacturer_name: "E2E Manufacturer",
  manufacturer_lot: `MFG-E2E-${UNIQUE}`,
  supplier_name: "E2E Supplier",
  received_date: new Date().toISOString().slice(0, 10),
  expiration_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  quantity: 100,
  unit_of_measure: "kg",
  storage_location: "E2E Rack",
  po_number: `PO-E2E-${UNIQUE}`,
  receiving_form_id: `RF-E2E-${UNIQUE}`,
};

const batchDto = {
  product_id: "", // set later
  batch_number: `BATCH-E2E-${UNIQUE}`,
  batch_size: 1000,
  unit_of_measure: "tablets",
  manufacture_date: new Date().toISOString().slice(0, 10),
  expiration_date: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
};

describe("Warehouse Lifecycle DB Integration", () => {
  let material: any;
  let lot: any;
  let batch: any;
  let component: any;

  beforeAll(async () => {
    // Basic connection check
    const result = await pool.query("SELECT 1");
    expect(result.rowCount).toBe(1);
  });

  afterAll(async () => {
    try {
      if (component && component.component_id) {
        await pool.query("DELETE FROM batch_components WHERE component_id = $1", [component.component_id]);
      }
      if (batch && batch.batch_id) {
        await pool.query("DELETE FROM production_batches WHERE batch_id = $1", [batch.batch_id]);
      }
      if (lot && lot.lot_id) {
        await pool.query("DELETE FROM inventory_lots WHERE lot_id = $1", [lot.lot_id]);
      }
      if (material && material.material_id) {
        await pool.query("DELETE FROM materials WHERE material_id = $1", [material.material_id]);
      }
    } catch (error) {
      console.warn("Cleanup side effect failed:", error);
    } finally {
      await pool.end();
    }
  });

  it("runs from material to consume material", async () => {
    material = await materialService.createMaterial(materialDto);
    expect(material).toHaveProperty("material_id");

    lot = await lotService.createLot({
      ...lotDto,
      material_id: material.material_id,
    });
    expect(lot).toHaveProperty("lot_id");
    expect(lot.status).toBe("Quarantine");

    const qcTest = await qcService.createTest({
      lot_id: lot.lot_id,
      test_type: "Identity",
      test_method: "HPLC",
      test_date: new Date().toISOString().slice(0, 10),
      acceptance_criteria: ">=98%",
      performed_by: "e2e-user",
    });
    expect(qcTest.result_status).toBe("Pending");

    const updated = await qcService.updateTestResult(qcTest.test_id, {
      test_result: "98.6",
      result_status: "Pass",
      verified_by: "e2e-verifier",
    });
    expect(updated?.result_status).toBe("Pass");

    const approve = await qcService.approveLot(lot.lot_id, "e2e-user");
    expect(approve.success).toBe(true);

    batch = await productionService.createBatch({
      ...batchDto,
      product_id: material.material_id,
    });
    expect(batch).toHaveProperty("batch_id");
    expect(batch.status).toBe("Planned");

    component = await productionService.addComponent(batch.batch_id, {
      component_id: `COMP-E2E-${UNIQUE}`,
      lot_id: lot.lot_id,
      planned_quantity: 50,
      unit_of_measure: "kg",
      added_by: "e2e-user",
    });
    expect(component).toHaveProperty("component_id");

    const inProgress = await productionService.updateBatchStatus(batch.batch_id, "In Progress");
    expect(inProgress?.status).toBe("In Progress");

    const consumed = await productionService.consumeMaterial(batch.batch_id, component.component_id, 50);
    expect(consumed.actual_quantity).toBe(50);
    expect(consumed.lot_status).toBe("Depleted" || "Accepted"); // may be Depleted if exactly match
  });
});
