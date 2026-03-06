import pool from "../../shared/db/pool";
import type {
  InventorySummary,
  InventorySummaryByMaterialType,
  InventorySummaryByStatus,
  TransactionSummary,
  TransactionTrendPoint,
} from "./dashboard.types";

type PgError = { code?: string };

async function queryInventoryTransactions<T>(
  sql: string,
  params: unknown[]
): Promise<T[]> {
  try {
    const res = await pool.query<T>(sql, params);
    return res.rows;
  } catch (err: unknown) {
    const code = (err as PgError)?.code;
    // 42P01 = undefined_table
    if (code === "42P01") {
      const fallbackSql = sql
        .replace(/\binventory_transactions\b/g, "transactions")
        // legacy schema: transaction_type is IN/OUT
        .replace(/\btransaction_date\b/g, "created_date")
        .replace(/\bunit_of_measure\b/g, "unit")
        .replace(/\blot_id\b/g, "material_id");

      const res = await pool.query<T>(fallbackSql, params);
      return res.rows;
    }
    throw err;
  }
}

export async function getInventorySummary(): Promise<InventorySummary> {
  const byStatusCountRows = await pool.query<{
    status: string;
    lot_count: string;
  }>(
    `SELECT status, COUNT(*)::text AS lot_count
     FROM inventory_lots
     GROUP BY status
     ORDER BY status`
  );

  const byStatusQtyRows = await pool.query<{
    status: string;
    unit_of_measure: string;
    total_quantity: string;
  }>(
    `SELECT status, unit_of_measure, COALESCE(SUM(quantity), 0)::text AS total_quantity
     FROM inventory_lots
     GROUP BY status, unit_of_measure
     ORDER BY status, unit_of_measure`
  );

  const statusMap = new Map<string, InventorySummaryByStatus>();
  for (const r of byStatusCountRows.rows) {
    statusMap.set(r.status, {
      status: r.status as any,
      lot_count: Number(r.lot_count),
      quantities_by_unit: [],
    });
  }
  for (const r of byStatusQtyRows.rows) {
    const entry =
      statusMap.get(r.status) ??
      ({
        status: r.status as any,
        lot_count: 0,
        quantities_by_unit: [],
      } satisfies InventorySummaryByStatus);
    entry.quantities_by_unit?.push({
      unit_of_measure: r.unit_of_measure,
      total_quantity: Number(r.total_quantity),
    });
    statusMap.set(r.status, entry);
  }

  const byMaterialTypeRows = await pool.query<{
    material_type: string;
    unit_of_measure: string;
    total_quantity: string;
  }>(
    `SELECT m.material_type,
            l.unit_of_measure,
            COALESCE(SUM(l.quantity), 0)::text AS total_quantity
     FROM inventory_lots l
     LEFT JOIN materials m ON l.material_id = m.material_id
     GROUP BY m.material_type, l.unit_of_measure
     ORDER BY m.material_type, l.unit_of_measure`
  );

  const by_material_type: InventorySummaryByMaterialType[] = byMaterialTypeRows.rows
    .filter((r) => r.material_type != null)
    .map((r) => ({
      material_type: r.material_type,
      unit_of_measure: r.unit_of_measure,
      total_quantity: Number(r.total_quantity),
    }));

  return {
    by_status: Array.from(statusMap.values()).map((s) => ({
      ...s,
      quantities_by_unit: s.quantities_by_unit?.length ? s.quantities_by_unit : undefined,
    })),
    by_material_type: by_material_type.length ? by_material_type : undefined,
  };
}

export async function getTransactionSummary(): Promise<TransactionSummary> {
  const todayRows = await queryInventoryTransactions<{
    receipts: string;
    issues: string;
  }>(
    `SELECT
        SUM(CASE WHEN transaction_type = 'Receipt' OR transaction_type = 'IN' THEN 1 ELSE 0 END)::text AS receipts,
        SUM(CASE
              WHEN transaction_type IN ('Usage', 'Disposal') OR transaction_type = 'OUT' THEN 1
              ELSE 0
            END)::text AS issues
     FROM inventory_transactions
     WHERE DATE(transaction_date) = CURRENT_DATE`,
    []
  );

  const trendRows = await queryInventoryTransactions<TransactionTrendPoint & { receipts: string; issues: string }>(
    `SELECT
        TO_CHAR(DATE(transaction_date), 'YYYY-MM-DD') AS date,
        SUM(CASE WHEN transaction_type = 'Receipt' OR transaction_type = 'IN' THEN 1 ELSE 0 END)::text AS receipts,
        SUM(CASE
              WHEN transaction_type IN ('Usage', 'Disposal') OR transaction_type = 'OUT' THEN 1
              ELSE 0
            END)::text AS issues
     FROM inventory_transactions
     WHERE DATE(transaction_date) >= CURRENT_DATE - INTERVAL '6 day'
     GROUP BY DATE(transaction_date)
     ORDER BY DATE(transaction_date) ASC`,
    []
  );

  const today = todayRows[0] ?? { receipts: "0", issues: "0" };

  const trend: TransactionTrendPoint[] = trendRows.map((r: any) => ({
    date: r.date,
    receipts: Number(r.receipts),
    issues: Number(r.issues),
  }));

  return {
    today_receipts: Number(today.receipts ?? 0),
    today_issues: Number(today.issues ?? 0),
    trend: trend.length ? trend : undefined,
  };
}

