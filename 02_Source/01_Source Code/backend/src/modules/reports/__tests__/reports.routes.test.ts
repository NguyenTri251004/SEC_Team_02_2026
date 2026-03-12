/**
 * Route integration tests for Reports Module
 * Uses supertest against a minimal Express app.
 * Mocks: auth middleware, rbac, and the reports.service layer.
 */
import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import type {
  ExpiringReportRow,
  InventoryReportRow,
  TransactionReportRow,
  AuditLogRow,
} from "../reports.types";

// ─── Mock Auth & RBAC BEFORE importing the router ───────────────────────────
jest.mock("../../../security/auth", () => ({
  authenticateJWT: (_req: any, _res: any, next: any) => {
    _req.user = { user_id: "u-1", username: "tester", roles: ["admin"] };
    next();
  },
}));

jest.mock("../../../security/rbac", () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

// ─── Mock Reports Service ───────────────────────────────────────────────────
jest.mock("../reports.service");
import * as reportsService from "../reports.service";
const svc = reportsService as jest.Mocked<typeof reportsService>;

// ─── Import router AFTER mocks ─────────────────────────────────────────────
import reportsRouter from "../reports.routes";

// ─── Build minimal Express app ─────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/reports", reportsRouter);

// ─── Fixtures ───────────────────────────────────────────────────────────────
const sampleInventoryRow: InventoryReportRow = {
  lot_id: "LOT-001",
  material_id: "MAT-001",
  material_name: "Aspirin API",
  material_type: "API",
  manufacturer_name: "PharmaCorp",
  manufacturer_lot: "MFG-2026-001",
  supplier_name: "SupplierA",
  received_date: "2026-01-15",
  expiration_date: "2027-01-15",
  status: "Approved",
  quantity: 500,
  unit_of_measure: "kg",
  storage_location: "WH-A-01",
  po_number: "PO-2026-100",
  is_sample: false,
  created_date: "2026-01-15T08:00:00Z",
  modified_date: "2026-01-16T10:00:00Z",
};

const sampleTransactionRow: TransactionReportRow = {
  transaction_id: "TXN-001",
  lot_id: "LOT-001",
  transaction_type: "IN",
  quantity: 500,
  unit_of_measure: "kg",
  reference_id: "PO-2026-100",
  notes: "Initial receipt",
  performed_by: "user-inv-01",
  transaction_date: "2026-01-15T09:00:00Z",
  created_date: "2026-01-15T09:00:00Z",
};

const sampleExpiringRow: ExpiringReportRow = {
  lot_id: "LOT-002",
  material_id: "MAT-002",
  material_name: "Lactose",
  material_type: "Excipient",
  supplier_name: "SupplierB",
  expiration_date: "2026-03-25",
  days_to_expiry: 14,
  status: "Accepted",
  quantity: 250,
  unit_of_measure: "kg",
  storage_location: "WH-B-02",
};

const sampleAuditLogRow: AuditLogRow = {
  event_type: "transaction",
  event_date: "2026-01-15T09:00:00Z",
  lot_id: "LOT-001",
  reference_id: "PO-2026-100",
  performed_by: "user-inv-01",
  notes: "Initial receipt",
  details: {
    transaction_id: "TXN-001",
    transaction_type: "IN",
    quantity: 500,
    unit_of_measure: "kg",
  },
};

// ─── Reset mocks between tests ──────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// GET /api/reports/inventory
// =============================================================================
describe("GET /api/reports/inventory", () => {
  it("returns 200 with inventory data", async () => {
    svc.getInventoryReport.mockResolvedValue([sampleInventoryRow]);

    const res = await request(app).get("/api/reports/inventory");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].lot_id).toBe("LOT-001");
  });

  it("passes query filter params to the service", async () => {
    svc.getInventoryReport.mockResolvedValue([]);

    await request(app).get(
      "/api/reports/inventory?status=Approved&material_id=MAT-001"
    );

    expect(svc.getInventoryReport).toHaveBeenCalledWith(
      expect.objectContaining({ status: "Approved", material_id: "MAT-001" })
    );
  });

  it("returns 500 when service throws", async () => {
    svc.getInventoryReport.mockRejectedValue(new Error("DB failure"));

    const res = await request(app).get("/api/reports/inventory");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});

// =============================================================================
// GET /api/reports/transactions
// =============================================================================
describe("GET /api/reports/transactions", () => {
  it("returns 200 with transaction data", async () => {
    svc.getTransactionReport.mockResolvedValue([sampleTransactionRow]);

    const res = await request(app).get("/api/reports/transactions");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].transaction_id).toBe("TXN-001");
  });

  it("passes query filter params to the service", async () => {
    svc.getTransactionReport.mockResolvedValue([]);

    await request(app).get(
      "/api/reports/transactions?lot_id=LOT-001&transaction_type=IN"
    );

    expect(svc.getTransactionReport).toHaveBeenCalledWith(
      expect.objectContaining({ lot_id: "LOT-001", transaction_type: "IN" })
    );
  });

  it("returns 500 when service throws", async () => {
    svc.getTransactionReport.mockRejectedValue(new Error("DB failure"));

    const res = await request(app).get("/api/reports/transactions");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});

// =============================================================================
// GET /api/reports/audit-log
// =============================================================================
describe("GET /api/reports/audit-log", () => {
  it("returns 200 with audit log data", async () => {
    svc.getAuditLog.mockResolvedValue([sampleAuditLogRow]);

    const res = await request(app).get("/api/reports/audit-log");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].event_type).toBe("transaction");
  });

  it("passes query filter params to the service", async () => {
    svc.getAuditLog.mockResolvedValue([]);

    await request(app).get(
      "/api/reports/audit-log?lot_id=LOT-001&date_from=2026-01-01"
    );

    expect(svc.getAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ lot_id: "LOT-001", date_from: "2026-01-01" })
    );
  });

  it("returns 500 when service throws", async () => {
    svc.getAuditLog.mockRejectedValue(new Error("DB failure"));

    const res = await request(app).get("/api/reports/audit-log");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});

// =============================================================================
// POST /api/reports/export
// =============================================================================
describe("POST /api/reports/export", () => {
  const inventoryCsv =
    "Lot ID,Material ID,Material Name,Material Type,Supplier,Received Date,Expiration Date,Status,Quantity,UOM,Location,PO Number,Is Sample\n" +
    "LOT-001,MAT-001,Aspirin API,API,SupplierA,2026-01-15,2027-01-15,Approved,500,kg,WH-A-01,PO-2026-100,false";

  const transactionsCsv =
    "Transaction ID,Lot ID,Type,Quantity,UOM,Reference ID,Performed By,Transaction Date,Notes\n" +
    "TXN-001,LOT-001,IN,500,kg,PO-2026-100,user-inv-01,2026-01-15T09:00:00Z,Initial receipt";

  const expiringCsv =
    "Lot ID,Material ID,Material Name,Material Type,Supplier,Expiration Date,Days to Expiry,Status,Quantity,UOM,Location\n" +
    "LOT-002,MAT-002,Lactose,Excipient,SupplierB,2026-03-25,14,Accepted,250,kg,WH-B-02";

  const auditLogCsv =
    "Event Type,Event Date,Lot ID,Reference ID,Performed By,Notes,Details\n" +
    'transaction,2026-01-15T09:00:00Z,LOT-001,PO-2026-100,user-inv-01,Initial receipt,[object Object]';

  it("returns 200 CSV for inventory type", async () => {
    svc.getReportData.mockResolvedValue([sampleInventoryRow as any]);
    svc.exportToCSV.mockReturnValue(inventoryCsv);

    const res = await request(app)
      .post("/api/reports/export")
      .send({ type: "inventory" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain(
      "inventory-report.csv"
    );
    expect(res.text).toContain("Lot ID");
    expect(res.text).toContain("LOT-001");
  });

  it("returns 200 CSV for transactions type", async () => {
    svc.getReportData.mockResolvedValue([sampleTransactionRow as any]);
    svc.exportToCSV.mockReturnValue(transactionsCsv);

    const res = await request(app)
      .post("/api/reports/export")
      .send({ type: "transactions" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain(
      "transactions-report.csv"
    );
    expect(res.text).toContain("Transaction ID");
    expect(res.text).toContain("TXN-001");
  });

  it("returns 200 CSV for expiring type", async () => {
    svc.getReportData.mockResolvedValue([sampleExpiringRow]);
    svc.exportToCSV.mockReturnValue(expiringCsv);

    const res = await request(app)
      .post("/api/reports/export")
      .send({ type: "expiring", filters: { days: 30 } });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain(
      "expiring-report.csv"
    );
    expect(res.text).toContain("Days to Expiry");
    expect(res.text).toContain("LOT-002");
  });

  it("returns 200 CSV for audit-log type", async () => {
    svc.getReportData.mockResolvedValue([sampleAuditLogRow as any]);
    svc.exportToCSV.mockReturnValue(auditLogCsv);

    const res = await request(app)
      .post("/api/reports/export")
      .send({ type: "audit-log" });

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/csv");
    expect(res.headers["content-disposition"]).toContain(
      "audit-log-report.csv"
    );
    expect(res.text).toContain("Event Type");
    expect(res.text).toContain("transaction");
  });

  it("returns 400 when type is invalid", async () => {
    const res = await request(app)
      .post("/api/reports/export")
      .send({ type: "invalid-type" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it("returns 400 when type is missing", async () => {
    const res = await request(app).post("/api/reports/export").send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it("returns 500 when service throws", async () => {
    svc.getReportData.mockRejectedValue(new Error("DB failure"));

    const res = await request(app)
      .post("/api/reports/export")
      .send({ type: "inventory" });

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});
