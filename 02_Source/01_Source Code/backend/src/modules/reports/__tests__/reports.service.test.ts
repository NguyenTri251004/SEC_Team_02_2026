/**
 * Unit tests for Reports Service
 */
import * as reportsService from "../reports.service";
import pool from "../../../shared/db/pool";

jest.mock("../../../shared/db/pool", () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

const mockQuery = (pool as any).query as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockReset();
});

// ═════════════════════════════════════════════════════════════════════════════
describe("exportToCSV", () => {
  it("generates correct CSV header and rows", () => {
    const rows = [
      { lot_id: "LOT-001", status: "Accepted", qty: 100 },
      { lot_id: "LOT-002", status: "Quarantine", qty: 50 },
    ];
    const columns = [
      { key: "lot_id" as const, header: "Lot ID" },
      { key: "status" as const, header: "Status" },
      { key: "qty" as const, header: "Quantity" },
    ];

    const csv = reportsService.exportToCSV(rows, columns);
    const lines = csv.split("\n");

    expect(lines[0]).toBe("Lot ID,Status,Quantity");
    expect(lines[1]).toBe("LOT-001,Accepted,100");
    expect(lines[2]).toBe("LOT-002,Quarantine,50");
  });

  it("escapes values containing commas", () => {
    const rows = [{ name: "Widget, Large" }];
    const columns = [{ key: "name" as const, header: "Name" }];

    const csv = reportsService.exportToCSV(rows, columns);
    expect(csv).toContain('"Widget, Large"');
  });

  it("escapes values containing quotes", () => {
    const rows = [{ desc: 'Said "hello"' }];
    const columns = [{ key: "desc" as const, header: "Description" }];

    const csv = reportsService.exportToCSV(rows, columns);
    expect(csv).toContain('"Said ""hello"""');
  });

  it("handles null and undefined values", () => {
    const rows = [{ a: null, b: undefined }];
    const columns = [
      { key: "a" as const, header: "A" },
      { key: "b" as const, header: "B" },
    ];

    const csv = reportsService.exportToCSV(rows, columns);
    expect(csv).toBe("A,B\n,");
  });

  it("returns only header for empty rows", () => {
    const csv = reportsService.exportToCSV([], [{ key: "x" as const, header: "X" }]);
    expect(csv).toBe("X");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("getInventoryReport", () => {
  const sampleRow = {
    lot_id: "LOT-001",
    material_id: "MAT001",
    material_name: "Aspirin",
    status: "Accepted",
    quantity: 450,
  };

  it("returns all lots when no filters", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleRow] });

    const result = await reportsService.getInventoryReport();

    expect(result).toEqual([sampleRow]);
    const [sql] = mockQuery.mock.calls[0];
    expect(sql).not.toContain("WHERE");
  });

  it("filters by status", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleRow] });

    await reportsService.getInventoryReport({ status: "Quarantine" });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("l.status = $1");
    expect(params).toContain("Quarantine");
  });

  it("filters by material_id", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await reportsService.getInventoryReport({ material_id: "MAT001" });

    const [, params] = mockQuery.mock.calls[0];
    expect(params).toContain("MAT001");
  });

  it("filters by expiring_before", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await reportsService.getInventoryReport({ expiring_before: "2026-06-01" });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("l.expiration_date <=");
    expect(params).toContain("2026-06-01");
  });

  it("filters by received date range", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await reportsService.getInventoryReport({
      date_from: "2026-01-01",
      date_to: "2026-03-31",
    });

    const [sql, params] = mockQuery.mock.calls[0];
    expect(sql).toContain("DATE(l.received_date) >=");
    expect(sql).toContain("DATE(l.received_date) <=");
    expect(params).toContain("2026-01-01");
    expect(params).toContain("2026-03-31");
  });

  it("combines multiple filters", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await reportsService.getInventoryReport({
      status: "Accepted",
      material_id: "MAT001",
      date_from: "2026-01-01",
      date_to: "2026-12-31",
      expiring_before: "2026-12-31",
    });

    const [, params] = mockQuery.mock.calls[0];
    expect(params).toHaveLength(5);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("getTransactionReport", () => {
  const sampleTxn = {
    transaction_id: "TXN-001",
    lot_id: "LOT-001",
    transaction_type: "Receipt",
    quantity: 100,
  };

  it("returns all transactions when no filters", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleTxn] });

    const result = await reportsService.getTransactionReport();

    expect(result).toEqual([sampleTxn]);
  });

  it("filters by lot_id", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleTxn] });

    await reportsService.getTransactionReport({ lot_id: "LOT-001" });

    const [, params] = mockQuery.mock.calls[0];
    expect(params).toContain("LOT-001");
  });

  it("filters by transaction_type", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await reportsService.getTransactionReport({ transaction_type: "Usage" });

    const [, params] = mockQuery.mock.calls[0];
    expect(params).toContain("Usage");
  });

  it("filters by date range", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await reportsService.getTransactionReport({
      date_from: "2026-01-01",
      date_to: "2026-03-31",
    });

    const [, params] = mockQuery.mock.calls[0];
    expect(params).toContain("2026-01-01");
    expect(params).toContain("2026-03-31");
  });

  it("falls back to legacy table on 42P01 error", async () => {
    const pgError: any = new Error("relation not found");
    pgError.code = "42P01";
    mockQuery
      .mockRejectedValueOnce(pgError) // first attempt fails
      .mockResolvedValueOnce({ rows: [sampleTxn] }); // fallback succeeds

    const result = await reportsService.getTransactionReport();

    expect(result).toEqual([sampleTxn]);
    expect(mockQuery).toHaveBeenCalledTimes(2);
    // Verify fallback SQL uses legacy table name
    const [fallbackSql] = mockQuery.mock.calls[1];
    expect(fallbackSql).toContain("transactions");
    expect(fallbackSql).not.toContain("inventory_transactions");
  });

  it("throws on non-42P01 errors", async () => {
    mockQuery.mockRejectedValueOnce(new Error("Connection refused"));

    await expect(reportsService.getTransactionReport()).rejects.toThrow("Connection refused");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("getAuditLog", () => {
  it("combines transactions and lot status changes, sorted by date DESC", async () => {
    const txn = {
      transaction_id: "TXN-001",
      lot_id: "LOT-001",
      transaction_type: "Receipt",
      quantity: 100,
      unit_of_measure: "kg",
      reference_id: null,
      notes: null,
      performed_by: "user-1",
      transaction_date: "2026-03-09T10:00:00Z",
    };

    const statusChange = {
      lot_id: "LOT-001",
      status: "Accepted",
      modified_date: "2026-03-09T12:00:00Z",
    };

    // First call: getTransactionReport → queryInventoryTransactions
    mockQuery.mockResolvedValueOnce({ rows: [txn] });
    // Second call: lot status changes
    mockQuery.mockResolvedValueOnce({ rows: [statusChange] });

    const result = await reportsService.getAuditLog();

    expect(result).toHaveLength(2);
    // Status change is later, so it comes first (DESC)
    expect(result[0].event_type).toBe("lot_status_change");
    expect(result[0].event_date).toBe("2026-03-09T12:00:00Z");
    expect(result[1].event_type).toBe("transaction");
    expect(result[1].event_date).toBe("2026-03-09T10:00:00Z");
  });

  it("passes filters to sub-queries", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // transactions
      .mockResolvedValueOnce({ rows: [] }); // status changes

    await reportsService.getAuditLog({ lot_id: "LOT-001" });

    // Transaction query should filter by lot_id
    const [txnSql, txnParams] = mockQuery.mock.calls[0];
    expect(txnSql).toContain("lot_id = $1");
    expect(txnParams).toContain("LOT-001");

    // Status query should also filter
    const [statusSql, statusParams] = mockQuery.mock.calls[1];
    expect(statusSql).toContain("lot_id = $");
    expect(statusParams).toContain("LOT-001");
  });

  it("returns empty array when no events", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await reportsService.getAuditLog();

    expect(result).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("getReportData", () => {
  it("dispatches to getInventoryReport for 'inventory' type", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ lot_id: "L1" }] });

    const result = await reportsService.getReportData("inventory");

    expect(result).toEqual([{ lot_id: "L1" }]);
  });

  it("dispatches to getTransactionReport for 'transactions' type", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ transaction_id: "T1" }] });

    const result = await reportsService.getReportData("transactions");

    expect(result).toEqual([{ transaction_id: "T1" }]);
  });

  it("dispatches to getExpiringReport for 'expiring' type", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ lot_id: "L2", days_to_expiry: 5 }] });

    const result = await reportsService.getReportData("expiring", { days: 7 });

    expect(result).toEqual([{ lot_id: "L2", days_to_expiry: 5 }]);
  });

  it("dispatches to getAuditLog for other types", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await reportsService.getReportData("audit-log" as any);

    expect(result).toEqual([]);
  });
});
