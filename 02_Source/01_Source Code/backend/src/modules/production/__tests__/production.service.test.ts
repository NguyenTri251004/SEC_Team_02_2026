import assert from "node:assert/strict";
import test from "node:test";
import { PoolClient, QueryResult, QueryResultRow } from "pg";
import pool from "../../../shared/db/pool";
import * as productionService from "../production.service";
import { BatchComponent, ProductionBatch } from "../production.types";

interface QueryCall {
  text: string;
  values?: readonly unknown[];
}

interface MockPoolClient {
  calls: QueryCall[];
  released: boolean;
  query: (text: string, values?: readonly unknown[]) => Promise<QueryResult<QueryResultRow>>;
  release: () => void;
}

type PoolQuery = typeof pool.query;
type PoolConnect = typeof pool.connect;

const originalQuery: PoolQuery = pool.query.bind(pool);
const originalConnect: PoolConnect = pool.connect.bind(pool);

const toQueryResult = <T extends QueryResultRow>(rows: T[]): QueryResult<T> => {
  return {
    command: "SELECT",
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows,
  };
};

const setPoolQuery = (
  implementation: (
    text: string,
    values?: readonly unknown[]
  ) => Promise<QueryResult<QueryResultRow>>
): void => {
  pool.query = implementation as unknown as PoolQuery;
};

const setPoolConnect = (client: MockPoolClient): void => {
  pool.connect = (async () => client as unknown as PoolClient) as unknown as PoolConnect;
};

const createMockClient = (
  implementation: (
    text: string,
    values?: readonly unknown[]
  ) => Promise<QueryResult<QueryResultRow>>
): MockPoolClient => {
  const calls: QueryCall[] = [];

  return {
    calls,
    released: false,
    async query(text: string, values?: readonly unknown[]): Promise<QueryResult<QueryResultRow>> {
      calls.push({ text, values });
      return implementation(text, values);
    },
    release(): void {
      this.released = true;
    },
  };
};

test.afterEach(() => {
  pool.query = originalQuery;
  pool.connect = originalConnect;
});

test("createBatch inserts Planned status and returns hydrated batch details", async () => {
  const calls: QueryCall[] = [];
  const insertedBatch: ProductionBatch = {
    batch_id: "batch-001",
    product_id: "MAT001",
    batch_number: "B-2026-010",
    batch_size: 100,
    unit_of_measure: "kg",
    manufacture_date: "2026-03-06",
    expiration_date: "2027-03-06",
    status: "Planned",
    created_date: new Date("2026-03-06T00:00:00.000Z"),
    modified_date: new Date("2026-03-06T00:00:00.000Z"),
    product_name: "Paracetamol Tablets",
  };

  const component: BatchComponent = {
    component_id: "comp-001",
    batch_id: "batch-001",
    lot_id: "lot-001",
    planned_quantity: 10,
    actual_quantity: null,
    unit_of_measure: "kg",
    addition_date: new Date("2026-03-06T01:00:00.000Z"),
    added_by: "USR-001",
    created_date: new Date("2026-03-06T01:00:00.000Z"),
    modified_date: new Date("2026-03-06T01:00:00.000Z"),
    material_id: "MAT002",
    material_name: "Microcrystalline Cellulose",
    manufacturer_lot: "MFG-LOT-1",
    lot_status: "Accepted",
    lot_expiration_date: "2026-12-31",
    lot_quantity: 500,
  };

  setPoolQuery(async (text, values) => {
    calls.push({ text, values });

    if (text.includes("INSERT INTO production_batches")) {
      return toQueryResult([{ ...insertedBatch }]);
    }

    if (text.includes("FROM production_batches pb") && text.includes("WHERE pb.batch_id = $1")) {
      return toQueryResult([{ ...insertedBatch }]);
    }

    if (text.includes("FROM batch_components bc")) {
      return toQueryResult([component]);
    }

    throw new Error(`Unexpected query: ${text}`);
  });

  const result = await productionService.createBatch({
    batch_id: "batch-001",
    product_id: "MAT001",
    batch_number: "B-2026-010",
    batch_size: 100,
    unit_of_measure: "kg",
    manufacture_date: "2026-03-06",
    expiration_date: "2027-03-06",
  });

  assert.equal(calls.length, 3);
  assert.match(calls[0].text, /INSERT INTO production_batches/);
  assert.deepEqual(calls[0].values, [
    "batch-001",
    "MAT001",
    "B-2026-010",
    100,
    "kg",
    "2026-03-06",
    "2027-03-06",
  ]);
  assert.equal(result.status, "Planned");
  assert.equal(result.product_name, "Paracetamol Tablets");
  assert.equal(result.components?.length, 1);
});

test("addComponent rejects expired lots before inserting", async () => {
  setPoolQuery(async (text) => {
    if (text === "SELECT * FROM production_batches WHERE batch_id = $1") {
      return toQueryResult([
        {
          batch_id: "batch-002",
          product_id: "MAT001",
          batch_number: "B-2026-011",
          batch_size: 50,
          unit_of_measure: "kg",
          manufacture_date: "2026-03-06",
          expiration_date: "2027-03-06",
          status: "Planned",
          created_date: new Date("2026-03-06T00:00:00.000Z"),
          modified_date: new Date("2026-03-06T00:00:00.000Z"),
        },
      ]);
    }

    if (text.includes("FROM inventory_lots l")) {
      return toQueryResult([
        {
          lot_id: "lot-001",
          material_id: "MAT002",
          expiration_date: "2020-01-01",
          status: "Accepted",
          quantity: 200,
          unit_of_measure: "kg",
          manufacturer_lot: "MFG-LOT-1",
          supplier_name: "Supplier A",
          material_name: "MCC",
        },
      ]);
    }

    throw new Error(`Unexpected query: ${text}`);
  });

  await assert.rejects(
    () =>
      productionService.addComponent("batch-002", {
        lot_id: "lot-001",
        planned_quantity: 10,
        unit_of_measure: "kg",
        added_by: "USR-001",
      }),
    /Cannot add an expired lot as a batch component/
  );
});

test("consumeMaterial creates Usage transaction and depletes the lot when quantity reaches zero", async () => {
  const client = createMockClient(async (text) => {
    if (text === "BEGIN" || text === "COMMIT") {
      return toQueryResult([]);
    }

    if (text.includes("SELECT * FROM production_batches WHERE batch_id = $1 FOR UPDATE")) {
      return toQueryResult([
        {
          batch_id: "batch-003",
          product_id: "MAT001",
          batch_number: "B-2026-012",
          batch_size: 50,
          unit_of_measure: "kg",
          manufacture_date: "2026-03-06",
          expiration_date: "2027-03-06",
          status: "In Progress",
          created_date: new Date("2026-03-06T00:00:00.000Z"),
          modified_date: new Date("2026-03-06T00:00:00.000Z"),
        },
      ]);
    }

    if (text.includes("FROM batch_components bc") && text.includes("FOR UPDATE")) {
      return toQueryResult([
        {
          component_id: "comp-003",
          batch_id: "batch-003",
          lot_id: "lot-003",
          planned_quantity: 10,
          actual_quantity: null,
          unit_of_measure: "kg",
          addition_date: new Date("2026-03-06T01:00:00.000Z"),
          added_by: "USR-004",
          created_date: new Date("2026-03-06T01:00:00.000Z"),
          modified_date: new Date("2026-03-06T01:00:00.000Z"),
          material_id: "MAT002",
          material_name: "MCC",
          manufacturer_lot: "MFG-LOT-2",
          lot_status: "Accepted",
          lot_expiration_date: "2026-12-31",
          lot_quantity: 10,
        },
      ]);
    }

    if (text.includes("FROM inventory_lots l") && text.includes("FOR UPDATE")) {
      return toQueryResult([
        {
          lot_id: "lot-003",
          material_id: "MAT002",
          expiration_date: "2026-12-31",
          status: "Accepted",
          quantity: 10,
          unit_of_measure: "kg",
          manufacturer_lot: "MFG-LOT-2",
          supplier_name: "Supplier B",
          material_name: "MCC",
        },
      ]);
    }

    if (
      text.includes("UPDATE batch_components") ||
      text.includes("UPDATE inventory_lots") ||
      text.includes("INSERT INTO inventory_transactions")
    ) {
      return toQueryResult([]);
    }

    throw new Error(`Unexpected client query: ${text}`);
  });

  setPoolConnect(client);

  setPoolQuery(async (text) => {
    if (text.includes("FROM batch_components bc")) {
      return toQueryResult([
        {
          component_id: "comp-003",
          batch_id: "batch-003",
          lot_id: "lot-003",
          planned_quantity: 10,
          actual_quantity: 10,
          unit_of_measure: "kg",
          addition_date: new Date("2026-03-06T01:00:00.000Z"),
          added_by: "USR-004",
          created_date: new Date("2026-03-06T01:00:00.000Z"),
          modified_date: new Date("2026-03-06T02:00:00.000Z"),
          material_id: "MAT002",
          material_name: "MCC",
          manufacturer_lot: "MFG-LOT-2",
          lot_status: "Depleted",
          lot_expiration_date: "2026-12-31",
          lot_quantity: 0,
        },
      ]);
    }

    throw new Error(`Unexpected pool query after commit: ${text}`);
  });

  const result = await productionService.consumeMaterial("batch-003", "comp-003", 10);

  const lotUpdateCall = client.calls.find((call) => call.text.includes("UPDATE inventory_lots"));
  const transactionCall = client.calls.find((call) =>
    call.text.includes("INSERT INTO inventory_transactions")
  );

  assert.ok(lotUpdateCall);
  assert.deepEqual(lotUpdateCall.values, [0, "Depleted", "lot-003"]);
  assert.ok(transactionCall);
  assert.equal(transactionCall.values?.[1], "lot-003");
  assert.equal(transactionCall.values?.[2], -10);
  assert.equal(transactionCall.values?.[3], "kg");
  assert.equal(transactionCall.values?.[4], "batch-003");
  assert.equal(transactionCall.values?.[5], "Consumed for production batch B-2026-012");
  assert.equal(transactionCall.values?.[6], "USR-004");
  assert.match(String(transactionCall.values?.[0]), /.+/);
  assert.equal(client.released, true);
  assert.equal(result.actual_quantity, 10);
  assert.equal(result.lot_status, "Depleted");
});
