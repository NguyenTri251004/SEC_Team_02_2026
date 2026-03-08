/**
 * Route integration tests for Transaction Module
 * Uses supertest against a minimal Express app.
 * Mocks: auth middleware, rbac, and the transaction.service layer.
 */
import express from "express";
import supertest from "supertest";
import { Transaction } from "../transaction.types";

const request = (supertest as any).default || supertest;

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

// ─── Mock Transaction Service ───────────────────────────────────────────────
jest.mock("../transaction.service");
import * as transactionService from "../transaction.service";
const svc = transactionService as jest.Mocked<typeof transactionService>;

// ─── Import router AFTER mocks ─────────────────────────────────────────────
import transactionRouter from "../transaction.routes";

// ─── Build minimal Express app ─────────────────────────────────────────────
function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/transactions", transactionRouter);
  return app;
}

// ─── Fixtures ───────────────────────────────────────────────────────────────
const now = new Date("2026-03-01T00:00:00.000Z");

const makeTxn = (overrides: Partial<Transaction> = {}): Transaction => ({
  transaction_id: "txn-001",
  transaction_type: "Receipt",
  lot_id: "lot-001",
  quantity: 100,
  unit_of_measure: "kg",
  reference_id: "ref-001",
  notes: "Initial receipt",
  performed_by: "user-inv",
  transaction_date: now,
  created_date: now,
  ...overrides,
});

// ═════════════════════════════════════════════════════════════════════════════
describe("transaction.routes", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ========================================
  // GET /api/transactions
  // ========================================
  describe("GET /api/transactions", () => {
    it("should return 200 with list of transactions", async () => {
      const txns = [makeTxn(), makeTxn({ transaction_id: "txn-002" })];
      svc.getAllTransactions.mockResolvedValue(txns);

      const res = await request(app).get("/api/transactions");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it("should return 500 on service error", async () => {
      svc.getAllTransactions.mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/api/transactions");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================
  // GET /api/transactions/:id
  // ========================================
  describe("GET /api/transactions/:id", () => {
    it("should return 200 with transaction detail when found", async () => {
      svc.getTransactionById.mockResolvedValue(makeTxn());

      const res = await request(app).get("/api/transactions/txn-001");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transaction_id).toBe("txn-001");
    });

    it("should return 404 when transaction not found", async () => {
      svc.getTransactionById.mockResolvedValue(null);

      const res = await request(app).get("/api/transactions/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 500 on service error", async () => {
      svc.getTransactionById.mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/api/transactions/txn-001");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================
  // GET /api/transactions/lot/:lotId
  // ========================================
  describe("GET /api/transactions/lot/:lotId", () => {
    it("should return 200 with transactions for a lot", async () => {
      const txns = [makeTxn(), makeTxn({ transaction_id: "txn-002" })];
      svc.getTransactionsByLot.mockResolvedValue(txns);

      const res = await request(app).get("/api/transactions/lot/lot-001");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
      expect(svc.getTransactionsByLot).toHaveBeenCalledWith("lot-001");
    });

    it("should return 500 on service error", async () => {
      svc.getTransactionsByLot.mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/api/transactions/lot/lot-001");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================
  // POST /api/transactions
  // ========================================
  describe("POST /api/transactions", () => {
    const validBody = {
      transaction_type: "Receipt",
      lot_id: "lot-001",
      quantity: 50,
      unit_of_measure: "kg",
      notes: "New receipt",
      performed_by: "user-inv",
    };

    it("should return 201 with auto-generated id when transaction_id not provided", async () => {
      svc.createTransaction.mockResolvedValue(makeTxn());

      const res = await request(app).post("/api/transactions").send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Verify service was called with an auto-generated UUID
      const callArg = svc.createTransaction.mock.calls[0][0];
      expect(callArg.transaction_id).toBeDefined();
      expect(typeof callArg.transaction_id).toBe("string");
      expect(callArg.transaction_id.length).toBeGreaterThan(0);
    });

    it("should return 201 using provided transaction_id when given", async () => {
      const created = makeTxn({ transaction_id: "txn-custom" });
      svc.createTransaction.mockResolvedValue(created);

      const res = await request(app)
        .post("/api/transactions")
        .send({ ...validBody, transaction_id: "txn-custom" });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const callArg = svc.createTransaction.mock.calls[0][0];
      expect(callArg.transaction_id).toBe("txn-custom");
    });

    it("should return 400 when transaction_type is missing", async () => {
      const { transaction_type, ...body } = validBody;

      const res = await request(app).post("/api/transactions").send(body);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("transaction_type");
      expect(svc.createTransaction).not.toHaveBeenCalled();
    });

    it("should return 400 when lot_id is missing", async () => {
      const { lot_id, ...body } = validBody;

      const res = await request(app).post("/api/transactions").send(body);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("lot_id");
      expect(svc.createTransaction).not.toHaveBeenCalled();
    });

    it("should return 400 when quantity is missing", async () => {
      const { quantity, ...body } = validBody;

      const res = await request(app).post("/api/transactions").send(body);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("quantity");
      expect(svc.createTransaction).not.toHaveBeenCalled();
    });

    it("should return 400 when transaction_type is invalid", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .send({ ...validBody, transaction_type: "InvalidType" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("transaction_type");
      expect(svc.createTransaction).not.toHaveBeenCalled();
    });

    it("should accept all valid transaction_types", async () => {
      const validTypes = ["Receipt", "Usage", "Split", "Transfer", "Adjustment", "Disposal"];

      for (const txnType of validTypes) {
        svc.createTransaction.mockReset();
        svc.createTransaction.mockResolvedValue(
          makeTxn({ transaction_type: txnType as any })
        );

        const res = await request(app)
          .post("/api/transactions")
          .send({ ...validBody, transaction_type: txnType });

        expect(res.status).toBe(201);
      }
    });

    it("should return 400 when quantity is zero", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .send({ ...validBody, quantity: 0 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("quantity");
      expect(svc.createTransaction).not.toHaveBeenCalled();
    });

    it("should return 400 when quantity is negative", async () => {
      const res = await request(app)
        .post("/api/transactions")
        .send({ ...validBody, quantity: -5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("quantity");
      expect(svc.createTransaction).not.toHaveBeenCalled();
    });

    it("should return 400 on FK violation (error.code === '23503')", async () => {
      const dbError = { code: "23503", message: "foreign key violation" };
      svc.createTransaction.mockRejectedValue(dbError);

      const res = await request(app).post("/api/transactions").send(validBody);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("lot_id");
    });

    it("should return 409 on duplicate key (error.code === '23505')", async () => {
      const dbError = { code: "23505", message: "duplicate key value" };
      svc.createTransaction.mockRejectedValue(dbError);

      const res = await request(app)
        .post("/api/transactions")
        .send({ ...validBody, transaction_id: "txn-dup" });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("transaction_id");
    });

    it("should return 500 on unexpected service error", async () => {
      svc.createTransaction.mockRejectedValue(new Error("Unexpected"));

      const res = await request(app).post("/api/transactions").send(validBody);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
