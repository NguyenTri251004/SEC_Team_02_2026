import { QueryResultRow } from "pg";
import pool from "../../shared/db/pool";
import type {
  AuditLogRow,
  ExpiringReportRow,
  InventoryReportRow,
  ReportType,
  TransactionReportRow,
} from "./reports.types";

type ReportDataRow =
  | InventoryReportRow
  | TransactionReportRow
  | ExpiringReportRow
  | AuditLogRow;

type PgError = { code?: string };

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportToCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; header: string }[]
): string {
  const headerLine = columns.map((c) => escapeCsv(c.header)).join(",");
  const lines = rows.map((r) =>
    columns.map((c) => escapeCsv(r[c.key])).join(",")
  );
  return [headerLine, ...lines].join("\n");
}

async function queryInventoryTransactions<T extends QueryResultRow>(
  sql: string,
  params: unknown[]
): Promise<T[]> {
  try {
    const res = await pool.query<T>(sql, params);
    return res.rows;
  } catch (err: unknown) {
    const code = (err as PgError)?.code;
    if (code === "42P01") {
      const fallbackSql = sql
        .replace(/\binventory_transactions\b/g, "transactions")
        .replace(/\btransaction_date\b/g, "created_date")
        .replace(/\bunit_of_measure\b/g, "unit")
        .replace(/\blot_id\b/g, "material_id")
        .replace(/\bperformed_by\b/g, "created_by");
      const res = await pool.query<T>(fallbackSql, params);
      return res.rows;
    }
    throw err;
  }
}

export async function getInventoryReport(filters?: {
  status?: string;
  material_id?: string;
  date_from?: string;
  date_to?: string;
  expiring_before?: string;
}): Promise<InventoryReportRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (filters?.status) {
    conditions.push(`l.status = $${i++}`);
    params.push(filters.status);
  }
  if (filters?.material_id) {
    conditions.push(`l.material_id = $${i++}`);
    params.push(filters.material_id);
  }
  if (filters?.date_from) {
    conditions.push(`DATE(l.received_date) >= $${i++}`);
    params.push(filters.date_from);
  }
  if (filters?.date_to) {
    conditions.push(`DATE(l.received_date) <= $${i++}`);
    params.push(filters.date_to);
  }
  if (filters?.expiring_before) {
    conditions.push(`l.expiration_date <= $${i++}`);
    params.push(filters.expiring_before);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await pool.query<InventoryReportRow>(
    `SELECT
        l.lot_id,
        l.material_id,
        m.material_name,
        m.material_type,
        l.manufacturer_name,
        l.manufacturer_lot,
        l.supplier_name,
        TO_CHAR(l.received_date, 'YYYY-MM-DD') AS received_date,
        TO_CHAR(l.expiration_date, 'YYYY-MM-DD') AS expiration_date,
        l.status,
        l.quantity::float8 AS quantity,
        l.unit_of_measure,
        l.storage_location,
        l.po_number,
        l.is_sample,
        TO_CHAR(l.created_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_date,
        TO_CHAR(l.modified_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS modified_date
     FROM inventory_lots l
     LEFT JOIN materials m ON l.material_id = m.material_id
     ${where}
     ORDER BY l.received_date DESC`,
    params
  );
  return result.rows;
}

export async function getTransactionReport(filters?: {
  lot_id?: string;
  material_id?: string;
  date_from?: string;
  date_to?: string;
  transaction_type?: string;
}): Promise<TransactionReportRow[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (filters?.lot_id) {
    conditions.push(`t.lot_id = $${i++}`);
    params.push(filters.lot_id);
  }
  if (filters?.transaction_type) {
    conditions.push(`t.transaction_type = $${i++}`);
    params.push(filters.transaction_type);
  }
  if (filters?.date_from) {
    conditions.push(`DATE(t.transaction_date) >= $${i++}`);
    params.push(filters.date_from);
  }
  if (filters?.date_to) {
    conditions.push(`DATE(t.transaction_date) <= $${i++}`);
    params.push(filters.date_to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await queryInventoryTransactions<TransactionReportRow & { quantity: number }>(
    `SELECT
        t.transaction_id,
        t.lot_id,
        t.transaction_type,
        t.quantity::float8 AS quantity,
        t.unit_of_measure,
        t.reference_id,
        t.notes,
        t.performed_by,
        TO_CHAR(t.transaction_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS transaction_date,
        TO_CHAR(t.created_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_date
     FROM inventory_transactions t
     ${where}
     ORDER BY t.transaction_date DESC`,
    params
  );

  // If we are on legacy table, "lot_id" is actually "material_id".
  // Optionally enrich with materials if material_id filter is provided.
  if (filters?.material_id) {
    return rows.filter((row) => row.lot_id === filters.material_id);
  }

  return rows;
}

export async function getExpiringReport(filters?: {
  days?: number | string;
}): Promise<ExpiringReportRow[]> {
  const parsedDays =
    typeof filters?.days === "number"
      ? filters.days
      : Number.parseInt(String(filters?.days ?? "30"), 10);
  const days = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 30;

  const result = await pool.query<ExpiringReportRow>(
    `SELECT
        l.lot_id,
        l.material_id,
        m.material_name,
        m.material_type,
        l.supplier_name,
        TO_CHAR(l.expiration_date, 'YYYY-MM-DD') AS expiration_date,
        (l.expiration_date::date - CURRENT_DATE)::integer AS days_to_expiry,
        l.status,
        l.quantity::float8 AS quantity,
        l.unit_of_measure,
        l.storage_location
     FROM inventory_lots l
     LEFT JOIN materials m ON l.material_id = m.material_id
     WHERE l.expiration_date >= CURRENT_DATE
       AND l.expiration_date <= CURRENT_DATE + $1 * INTERVAL '1 day'
       AND l.status IN ('Quarantine', 'Accepted')
     ORDER BY l.expiration_date ASC, l.lot_id ASC`,
    [days]
  );

  return result.rows;
}

export async function getAuditLog(filters?: {
  lot_id?: string;
  date_from?: string;
  date_to?: string;
}): Promise<AuditLogRow[]> {
  const txns = await getTransactionReport({
    lot_id: filters?.lot_id,
    date_from: filters?.date_from,
    date_to: filters?.date_to,
  });

  const statusConditions: string[] = ["l.modified_date <> l.created_date"];
  const params: unknown[] = [];
  let i = 1;

  if (filters?.lot_id) {
    statusConditions.push(`l.lot_id = $${i++}`);
    params.push(filters.lot_id);
  }
  if (filters?.date_from) {
    statusConditions.push(`DATE(l.modified_date) >= $${i++}`);
    params.push(filters.date_from);
  }
  if (filters?.date_to) {
    statusConditions.push(`DATE(l.modified_date) <= $${i++}`);
    params.push(filters.date_to);
  }

  const statusRows = await pool.query<{
    lot_id: string;
    status: string;
    modified_date: string;
  }>(
    `SELECT
        l.lot_id,
        l.status,
        TO_CHAR(l.modified_date, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS modified_date
     FROM inventory_lots l
     WHERE ${statusConditions.join(" AND ")}
     ORDER BY l.modified_date DESC`,
    params
  );

  const audit: AuditLogRow[] = [
    ...txns.map((t) => ({
      event_type: "transaction" as const,
      event_date: t.transaction_date,
      lot_id: t.lot_id,
      reference_id: t.reference_id,
      performed_by: t.performed_by ?? null,
      notes: t.notes ?? null,
      details: {
        transaction_id: t.transaction_id,
        transaction_type: t.transaction_type,
        quantity: t.quantity,
        unit_of_measure: t.unit_of_measure,
      },
    })),
    ...statusRows.rows.map((r) => ({
      event_type: "lot_status_change" as const,
      event_date: r.modified_date,
      lot_id: r.lot_id,
      reference_id: null,
      performed_by: null,
      notes: null,
      details: { status: r.status },
    })),
  ];

  audit.sort((a, b) => (a.event_date < b.event_date ? 1 : a.event_date > b.event_date ? -1 : 0));
  return audit;
}

export async function getReportData(
  type: ReportType,
  filters?: Record<string, unknown>
): Promise<ReportDataRow[]> {
  if (type === "inventory") {
    return await getInventoryReport(filters as {
      status?: string;
      material_id?: string;
      expiring_before?: string;
    });
  }
  if (type === "transactions") {
    return await getTransactionReport(filters as {
      lot_id?: string;
      material_id?: string;
      date_from?: string;
      date_to?: string;
      transaction_type?: string;
    });
  }
  if (type === "expiring") {
    return await getExpiringReport(filters as { days?: number | string });
  }
  return await getAuditLog(filters as {
    lot_id?: string;
    date_from?: string;
    date_to?: string;
  });
}

