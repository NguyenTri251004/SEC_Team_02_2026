import { randomUUID } from "crypto";
import { PoolClient } from "pg";
import pool from "../../shared/db/pool";
import {
  AddComponentInput,
  BatchComponent,
  BatchFilters,
  BatchStatus,
  CreateBatchInput,
  ProductionBatch,
  ProductionTraceabilityItem,
} from "./production.types";

interface BatchRow extends ProductionBatch {
  product_name: string;
}

interface BatchComponentRow extends BatchComponent {
  material_id: string;
  material_name: string;
  manufacturer_lot: string;
  lot_status: string;
  lot_expiration_date: string;
  lot_quantity: number;
}

interface InventoryLotRow {
  lot_id: string;
  material_id: string;
  expiration_date: string;
  status: string;
  quantity: number;
  unit_of_measure: string;
  manufacturer_lot: string;
  supplier_name: string;
  material_name: string;
}

interface InventoryTransactionRow {
  transaction_id: string;
  lot_id: string;
  transaction_type: "Receipt" | "Usage" | "Split" | "Transfer" | "Adjustment" | "Disposal";
  quantity: number;
  unit_of_measure: string;
  reference_id: string | null;
  notes: string | null;
  performed_by: string;
  transaction_date: Date;
  created_date: Date;
}

const VALID_BATCH_TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  Planned: ["In Progress"],
  "In Progress": ["Complete", "Rejected"],
  Complete: [],
  Rejected: [],
};

const BATCH_SELECT = `
  SELECT pb.*,
         m.material_name AS product_name
  FROM production_batches pb
  INNER JOIN materials m ON pb.product_id = m.material_id
`;

const COMPONENT_SELECT = `
  SELECT bc.*,
         l.material_id,
         m.material_name,
         l.manufacturer_lot,
         l.status AS lot_status,
         l.expiration_date AS lot_expiration_date,
         l.quantity AS lot_quantity
  FROM batch_components bc
  INNER JOIN inventory_lots l ON bc.lot_id = l.lot_id
  INNER JOIN materials m ON l.material_id = m.material_id
`;

const getClient = async (): Promise<PoolClient> => {
  return pool.connect();
};

export const getAllBatches = async (
  filters?: BatchFilters
): Promise<ProductionBatch[]> => {
  const conditions: string[] = [];
  const params: Array<string | BatchStatus> = [];
  let paramIndex = 1;

  if (filters?.status) {
    conditions.push(`pb.status = $${paramIndex++}`);
    params.push(filters.status);
  }

  if (filters?.product_id) {
    conditions.push(`pb.product_id = $${paramIndex++}`);
    params.push(filters.product_id);
  }

  if (filters?.batch_number) {
    conditions.push(`pb.batch_number ILIKE $${paramIndex++}`);
    params.push(`%${filters.batch_number}%`);
  }

  const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(" AND ")}` : "";
  const result = await pool.query<BatchRow>(
    `SELECT pb.*,
            m.material_name AS product_name,
            COALESCE(COUNT(bc.component_id), 0)::int AS component_count
     FROM production_batches pb
     INNER JOIN materials m ON pb.product_id = m.material_id
     LEFT JOIN batch_components bc ON pb.batch_id = bc.batch_id
     ${whereClause}
     GROUP BY pb.batch_id, m.material_name
     ORDER BY pb.manufacture_date DESC, pb.created_date DESC`,
    params
  );

  return result.rows;
};

export const getComponents = async (batchId: string): Promise<BatchComponent[]> => {
  const result = await pool.query<BatchComponentRow>(
    `${COMPONENT_SELECT}
     WHERE bc.batch_id = $1
     ORDER BY bc.addition_date ASC NULLS LAST, bc.created_date ASC`,
    [batchId]
  );

  return result.rows;
};

export const getBatchById = async (id: string): Promise<ProductionBatch | null> => {
  const batchResult = await pool.query<BatchRow>(
    `${BATCH_SELECT}
     WHERE pb.batch_id = $1`,
    [id]
  );

  const batch = batchResult.rows[0];
  if (!batch) {
    return null;
  }

  const components = await getComponents(id);
  return {
    ...batch,
    components,
  };
};

export const createBatch = async (input: CreateBatchInput): Promise<ProductionBatch> => {
  if (input.batch_size <= 0) {
    throw new Error("Batch size must be greater than zero");
  }

  if (input.expiration_date < input.manufacture_date) {
    throw new Error("Expiration date must be on or after manufacture date");
  }

  // Generate BATCH-XXX formatted id if not provided
  let batchId = input.batch_id;
  if (!batchId) {
    const seqResult = await pool.query<{ max_id: string | null }>(
      `SELECT batch_id AS max_id FROM production_batches
       WHERE batch_id ~ '^BATCH-[0-9]+$'
       ORDER BY LENGTH(batch_id) DESC, batch_id DESC
       LIMIT 1`
    );
    const lastId = seqResult.rows[0]?.max_id;
    if (lastId) {
      const num = parseInt(lastId.replace(/^BATCH-/, ""), 10);
      batchId = `BATCH-${String(num + 1).padStart(3, "0")}`;
    } else {
      const cnt = await pool.query<{ cnt: string }>(`SELECT COUNT(*) AS cnt FROM production_batches`);
      batchId = `BATCH-${String(parseInt(cnt.rows[0]?.cnt ?? "0", 10) + 1).padStart(3, "0")}`;
    }
  }
  const result = await pool.query<BatchRow>(
    `INSERT INTO production_batches
       (batch_id, product_id, batch_number, batch_size, unit_of_measure, manufacture_date, expiration_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'Planned')
     RETURNING *`,
    [
      batchId,
      input.product_id,
      input.batch_number,
      input.batch_size,
      input.unit_of_measure,
      input.manufacture_date,
      input.expiration_date,
    ]
  );

  const createdBatch = result.rows[0];
  const batch = await getBatchById(createdBatch.batch_id);
  if (!batch) {
    throw new Error("Failed to load created batch");
  }

  return batch;
};

export const updateBatchStatus = async (
  id: string,
  status: BatchStatus
): Promise<ProductionBatch | null> => {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    const currentResult = await client.query<ProductionBatch>(
      "SELECT * FROM production_batches WHERE batch_id = $1 FOR UPDATE",
      [id]
    );

    const currentBatch = currentResult.rows[0];
    if (!currentBatch) {
      await client.query("ROLLBACK");
      return null;
    }

    const allowedStatuses = VALID_BATCH_TRANSITIONS[currentBatch.status];
    if (!allowedStatuses.includes(status)) {
      throw new Error(
        `Invalid status transition: ${currentBatch.status} -> ${status}. Allowed: ${allowedStatuses.join(", ") || "none"}`
      );
    }

    // When completing a batch, verify all components consumed and create finished product lot
    if (status === "Complete") {
      // Check all components have been consumed (no NULL actual_quantity)
      const uncomsumedResult = await client.query<{ cnt: string }>(
        `SELECT COUNT(*) AS cnt FROM batch_components
         WHERE batch_id = $1 AND actual_quantity IS NULL`,
        [id]
      );
      const uncomsumedCount = parseInt(uncomsumedResult.rows[0].cnt, 10);
      if (uncomsumedCount > 0) {
        throw new Error(
          "All components must be consumed before completing the batch"
        );
      }

      // Auto-generate lot_id using LOT-XXX sequence pattern
      const lotSeqResult = await client.query<{ max_id: string | null }>(
        `SELECT lot_id AS max_id FROM inventory_lots
         WHERE lot_id ~ '^LOT-[0-9]+$'
         ORDER BY LENGTH(lot_id) DESC, lot_id DESC
         LIMIT 1`
      );
      const lastLotId = lotSeqResult.rows[0]?.max_id;
      let newLotId: string;
      if (lastLotId) {
        const num = parseInt(lastLotId.replace(/^LOT-/, ""), 10);
        newLotId = `LOT-${String(num + 1).padStart(3, "0")}`;
      } else {
        newLotId = `LOT-001`;
      }

      // INSERT finished product into inventory_lots
      await client.query(
        `INSERT INTO inventory_lots
           (lot_id, material_id, quantity, status, manufacturer_name, manufacturer_lot, supplier_name, received_date, expiration_date, unit_of_measure)
         VALUES ($1, $2, $3, 'Quarantine', 'Internal Production', $4, 'Internal', CURRENT_DATE, $5, $6)`,
        [
          newLotId,
          currentBatch.product_id,
          currentBatch.batch_size,
          currentBatch.batch_number,
          currentBatch.expiration_date,
          currentBatch.unit_of_measure,
        ]
      );

      // INSERT receipt transaction for the finished product lot
      await client.query<InventoryTransactionRow>(
        `INSERT INTO inventory_transactions
           (transaction_id, lot_id, transaction_type, quantity, unit_of_measure, reference_id, notes, performed_by, transaction_date)
         VALUES ($1, $2, 'Receipt', $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
        [
          randomUUID(),
          newLotId,
          currentBatch.batch_size,
          currentBatch.unit_of_measure,
          currentBatch.batch_id,
          `Finished product output from batch ${currentBatch.batch_number}`,
          "system",
        ]
      );
    }

    await client.query(
      `UPDATE production_batches
       SET status = $1,
           modified_date = CURRENT_TIMESTAMP
       WHERE batch_id = $2`,
      [status, id]
    );

    await client.query("COMMIT");

    // Auto-generate Finished Product label (non-blocking)
    if (status === "Complete") {
      try {
        const { getTemplatesByLabelType, generateLabelFromTemplate } = await import("../labels/label.service");
        const { LabelType, EntityType, CodeType } = await import("../labels/label.types");
        const fpTemplates = await getTemplatesByLabelType(LabelType.FINISHED_PRODUCT);
        if (fpTemplates.length > 0) {
          await generateLabelFromTemplate(
            {
              template_id: fpTemplates[0].template_id,
              entity_type: EntityType.BATCH,
              entity_id: id,
              code_type: CodeType.QR_CODE,
            },
            "system"
          );
          console.log(`[Production] Auto-generated Finished Product label for batch ${id}`);
        }
      } catch (labelError) {
        console.warn(`[Production] Auto-label generation failed for batch ${id}:`, labelError);
      }
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return getBatchById(id);
};

export const addComponent = async (
  batchId: string,
  input: AddComponentInput
): Promise<BatchComponent> => {
  const batchResult = await pool.query<ProductionBatch>(
    "SELECT * FROM production_batches WHERE batch_id = $1",
    [batchId]
  );
  const batch = batchResult.rows[0];

  if (!batch) {
    throw new Error("Production batch not found");
  }

  if (batch.status === "Complete" || batch.status === "Rejected") {
    throw new Error("Cannot add components to a completed or rejected batch");
  }

  const lotResult = await pool.query<InventoryLotRow>(
    `SELECT l.*,
            m.material_name
     FROM inventory_lots l
     INNER JOIN materials m ON l.material_id = m.material_id
     WHERE l.lot_id = $1`,
    [input.lot_id]
  );
  const lot = lotResult.rows[0];

  if (!lot) {
    throw new Error("Inventory lot not found");
  }

  if (lot.status !== "Accepted") {
    throw new Error("Only accepted lots can be added as components");
  }

  const today = new Date().toISOString().slice(0, 10);
  if (lot.expiration_date < today) {
    throw new Error("Cannot add an expired lot as a batch component");
  }

  if (input.planned_quantity <= 0) {
    throw new Error("Planned quantity must be greater than zero");
  }

  if (input.planned_quantity > lot.quantity) {
    throw new Error("Planned quantity exceeds available lot quantity");
  }

  if (input.unit_of_measure !== lot.unit_of_measure) {
    throw new Error("Component unit of measure must match the inventory lot unit");
  }

  const componentId = input.component_id ?? randomUUID();
  const result = await pool.query<BatchComponent>(
    `INSERT INTO batch_components
       (component_id, batch_id, lot_id, planned_quantity, unit_of_measure, addition_date, added_by)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
     RETURNING *`,
    [
      componentId,
      batchId,
      input.lot_id,
      input.planned_quantity,
      input.unit_of_measure,
      input.added_by ?? null,
    ]
  );

  const component = result.rows[0];
  const components = await getComponents(batchId);
  const createdComponent = components.find(
    (batchComponent) => batchComponent.component_id === component.component_id
  );

  if (!createdComponent) {
    throw new Error("Failed to load created component");
  }

  return createdComponent;
};

export const consumeMaterial = async (
  batchId: string,
  componentId: string,
  actualQuantity: number
): Promise<BatchComponent> => {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    const batchResult = await client.query<ProductionBatch>(
      "SELECT * FROM production_batches WHERE batch_id = $1 FOR UPDATE",
      [batchId]
    );
    const batch = batchResult.rows[0];
    if (!batch) {
      throw new Error("Production batch not found");
    }

    if (batch.status !== "In Progress") {
      throw new Error("Materials can only be consumed when the batch is In Progress");
    }

    const componentResult = await client.query<BatchComponentRow>(
      `${COMPONENT_SELECT}
       WHERE bc.batch_id = $1 AND bc.component_id = $2
       FOR UPDATE`,
      [batchId, componentId]
    );
    const component = componentResult.rows[0];
    if (!component) {
      throw new Error("Batch component not found");
    }

    const lotResult = await client.query<InventoryLotRow>(
      `SELECT l.*,
              m.material_name
       FROM inventory_lots l
       INNER JOIN materials m ON l.material_id = m.material_id
       WHERE l.lot_id = $1
       FOR UPDATE`,
      [component.lot_id]
    );
    const lot = lotResult.rows[0];
    if (!lot) {
      throw new Error("Inventory lot not found");
    }

    if (lot.status !== "Accepted") {
      throw new Error("Only accepted lots can be consumed");
    }

    if (actualQuantity <= 0) {
      throw new Error("Actual quantity must be greater than zero");
    }

    if (actualQuantity > lot.quantity) {
      throw new Error("Actual quantity exceeds available lot quantity");
    }

    const remainingQuantity = Number((lot.quantity - actualQuantity).toFixed(3));
    const nextLotStatus = remainingQuantity === 0 ? "Depleted" : lot.status;

    await client.query(
      `UPDATE batch_components
       SET actual_quantity = $1,
           modified_date = CURRENT_TIMESTAMP
       WHERE component_id = $2`,
      [actualQuantity, componentId]
    );

    await client.query(
      `UPDATE inventory_lots
       SET quantity = $1,
           status = $2,
           modified_date = CURRENT_TIMESTAMP
       WHERE lot_id = $3`,
      [remainingQuantity, nextLotStatus, lot.lot_id]
    );

    await client.query<InventoryTransactionRow>(
      `INSERT INTO inventory_transactions
         (transaction_id, lot_id, transaction_type, quantity, unit_of_measure, reference_id, notes, performed_by, transaction_date)
       VALUES ($1, $2, 'Usage', $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [
        randomUUID(),
        lot.lot_id,
        -actualQuantity,
        component.unit_of_measure,
        batchId,
        `Consumed for production batch ${batch.batch_number}`,
        component.added_by ?? "system",
      ]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const components = await getComponents(batchId);
  const updatedComponent = components.find(
    (component) => component.component_id === componentId
  );

  if (!updatedComponent) {
    throw new Error("Failed to load updated component");
  }

  return updatedComponent;
};

export const getTraceability = async (
  batchId: string
): Promise<ProductionTraceabilityItem[]> => {
  const result = await pool.query<ProductionTraceabilityItem>(
    `SELECT bc.component_id,
            bc.lot_id,
            bc.planned_quantity,
            bc.actual_quantity,
            bc.unit_of_measure,
            bc.addition_date,
            l.material_id,
            m.material_name,
            l.manufacturer_lot,
            l.supplier_name,
            l.expiration_date,
            l.status AS lot_status,
            it.transaction_id,
            it.quantity AS transaction_quantity,
            it.transaction_date,
            it.reference_id,
            it.notes
     FROM batch_components bc
     INNER JOIN inventory_lots l ON bc.lot_id = l.lot_id
     INNER JOIN materials m ON l.material_id = m.material_id
     LEFT JOIN inventory_transactions it
       ON it.lot_id = bc.lot_id
      AND it.transaction_type = 'Usage'
      AND it.reference_id = $1
     WHERE bc.batch_id = $1
     ORDER BY bc.addition_date ASC NULLS LAST, it.transaction_date ASC NULLS LAST`,
    [batchId]
  );

  return result.rows;
};
