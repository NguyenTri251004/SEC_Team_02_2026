/**
 * Integration tests for Dashboard Routes
 * Tests Express route handlers via supertest.
 */
import express from "express";
import request from "supertest";

jest.mock("../../../security/auth", () => ({
  authenticateJWT: (_req: any, _res: any, next: any) => {
    _req.user = { user_id: "u-1", username: "tester", roles: ["admin"] };
    next();
  },
}));

jest.mock("../dashboard.service");
import * as dashboardService from "../dashboard.service";
const svc = dashboardService as jest.Mocked<typeof dashboardService>;

import dashboardRouter from "../dashboard.routes";

const app = express();
app.use(express.json());
app.use("/api/dashboard", dashboardRouter);

beforeEach(() => jest.clearAllMocks());

// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/dashboard/inventory-summary", () => {
  const mockSummary = {
    by_status: [
      { status: "Quarantine", lot_count: 3, quantities_by_unit: [{ unit: "kg", total: 500 }] },
      { status: "Accepted", lot_count: 5, quantities_by_unit: [{ unit: "kg", total: 1200 }] },
    ],
    by_material_type: [
      { material_type: "API", lot_count: 4, quantities_by_unit: [{ unit: "kg", total: 800 }] },
    ],
  };

  it("200 — returns inventory summary", async () => {
    svc.getInventorySummary.mockResolvedValueOnce(mockSummary as any);

    const res = await request(app).get("/api/dashboard/inventory-summary");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.by_status).toHaveLength(2);
  });

  it("500 — on service error", async () => {
    svc.getInventorySummary.mockRejectedValueOnce(new Error("DB Error"));

    const res = await request(app).get("/api/dashboard/inventory-summary");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/dashboard/transaction-summary", () => {
  const mockSummary = {
    today: { receipts: 5, issues: 3 },
    trend: [
      { date: "2026-03-08", receipts: 4, issues: 2 },
      { date: "2026-03-09", receipts: 5, issues: 3 },
    ],
  };

  it("200 — returns transaction summary", async () => {
    svc.getTransactionSummary.mockResolvedValueOnce(mockSummary as any);

    const res = await request(app).get("/api/dashboard/transaction-summary");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.today).toBeDefined();
    expect(res.body.data.trend).toHaveLength(2);
  });

  it("500 — on service error", async () => {
    svc.getTransactionSummary.mockRejectedValueOnce(new Error("DB Error"));

    const res = await request(app).get("/api/dashboard/transaction-summary");

    expect(res.status).toBe(500);
  });
});
