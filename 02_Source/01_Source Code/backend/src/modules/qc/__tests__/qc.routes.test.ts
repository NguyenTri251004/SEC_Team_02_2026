/**
 * Route integration tests for QC Module
 * Uses supertest against a minimal Express app.
 * Mocks: auth middleware, rbac, and the qc.service layer.
 */
import request from "supertest";
import express, { Request, Response, NextFunction } from "express";
import type { QCTest, QCQueueItem, QCStats } from "../qc.types";

// ─── Mock Auth & RBAC BEFORE importing the router ───────────────────────────
jest.mock("../../../security/auth", () => ({
  authenticateJWT: (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & {
      user?: {
        user_id: string;
        username: string;
        roles: string[];
        sub: string;
      };
    }).user = {
      user_id: "user-qc-01",
      username: "test_qc",
      roles: ["admin", "quality_control"],
      sub: "user-qc-01",
    };
    next();
  },
}));

jest.mock("../../../security/rbac", () => ({
  requirePermission: () => (_req: Request, _res: Response, next: NextFunction) => next(),
  UserRole: {
    ADMIN: "admin",
    INVENTORY_MANAGER: "inventory_manager",
    QUALITY_CONTROL: "quality_control",
    PRODUCTION: "production",
    VIEWER: "viewer",
  },
  PERMISSIONS: {},
}));

// ─── Mock QC Service ─────────────────────────────────────────────────────────
jest.mock("../qc.service");
import * as qcService from "../qc.service";
const mockService = qcService as jest.Mocked<typeof qcService>;

// ─── Import router AFTER mocks ───────────────────────────────────────────────
import qcRouter from "../qc.routes";

// ─── Build minimal Express app ───────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/qc", qcRouter);

// ─── Fixtures ────────────────────────────────────────────────────────────────
const sampleTest: QCTest = {
  test_id: "test-001",
  lot_id: "lot-001",
  test_type: "Identity",
  result_status: "Pending",
  performed_by: "user-qc",
  test_date: new Date("2026-03-01T00:00:00.000Z"),
  created_date: new Date("2026-03-01T00:00:00.000Z"),
  modified_date: new Date("2026-03-01T00:00:00.000Z"),
  manufacturer_lot: "MFG-001",
  material_name: "Aspirin API",
  material_type: "API",
};

const sampleQueueItem: QCQueueItem = {
  lot_id: "lot-001",
  lot_number: "L-001",
  manufacturer_lot: "MFG-001",
  material_id: "MAT001",
  material_name: "Aspirin API",
  material_type: "API",
  received_date: new Date("2026-02-15"),
  quantity: 50,
  pending_tests: 2,
  total_tests: 3,
};

const sampleStats: QCStats = {
  pending_count: 5,
  pass_rate_30d: 80,
  total_tests_30d: 20,
  tests_by_type: [{ test_type: "Identity", count: 10, pass_count: 8 }],
};

// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/qc/tests", () => {
  it("returns 200 with list of tests", async () => {
    mockService.getAllTests.mockResolvedValue([sampleTest]);

    const res = await request(app).get("/api/qc/tests");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it("passes query filters to the service", async () => {
    mockService.getAllTests.mockResolvedValue([]);

    await request(app).get("/api/qc/tests?lot_id=lot-001&result_status=Pending");

    expect(mockService.getAllTests).toHaveBeenCalledWith(
      expect.objectContaining({ lot_id: "lot-001", result_status: "Pending" })
    );
  });

  it("returns 500 when service throws", async () => {
    mockService.getAllTests.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/qc/tests");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/qc/tests/:id", () => {
  it("returns 200 with test data when found", async () => {
    mockService.getTestById.mockResolvedValue(sampleTest);

    const res = await request(app).get("/api/qc/tests/test-001");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.test_id).toBe("test-001");
  });

  it("returns 404 when test is not found", async () => {
    mockService.getTestById.mockResolvedValue(null);

    const res = await request(app).get("/api/qc/tests/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("returns 500 when service throws", async () => {
    mockService.getTestById.mockRejectedValue(new Error("fail"));

    const res = await request(app).get("/api/qc/tests/test-001");

    expect(res.status).toBe(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/qc/tests", () => {
  const validBody = {
    lot_id: "lot-001",
    test_type: "Identity",
    performed_by: "user-qc",
  };

  it("returns 201 when test is created successfully", async () => {
    mockService.createTest.mockResolvedValue(sampleTest);

    const res = await request(app).post("/api/qc/tests").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ test_id: "test-001" });
  });

  it("returns 400 when lot_id is missing", async () => {
    const res = await request(app)
      .post("/api/qc/tests")
      .send({ test_type: "Identity", performed_by: "user-qc" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("lot_id");
  });

  it("returns 400 when test_type is missing", async () => {
    const res = await request(app)
      .post("/api/qc/tests")
      .send({ lot_id: "lot-001", performed_by: "user-qc" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("test_type");
  });

  it("returns 400 when performed_by is missing", async () => {
    const res = await request(app)
      .post("/api/qc/tests")
      .send({ lot_id: "lot-001", test_type: "Identity" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("performed_by");
  });

  it("returns 500 when service throws", async () => {
    mockService.createTest.mockRejectedValue(new Error("fail"));

    const res = await request(app).post("/api/qc/tests").send(validBody);

    expect(res.status).toBe(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("PUT /api/qc/tests/:id", () => {
  const validBody = {
    test_result: "Conforms",
    result_status: "Pass",
    verified_by: "supervisor",
  };

  it("returns 200 when result is updated", async () => {
    const updated: QCTest = { ...sampleTest, result_status: "Pass" };
    mockService.updateTestResult.mockResolvedValue(updated);

    const res = await request(app).put("/api/qc/tests/test-001").send(validBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("returns 404 when test not found", async () => {
    mockService.updateTestResult.mockResolvedValue(null);

    const res = await request(app).put("/api/qc/tests/no-test").send(validBody);

    expect(res.status).toBe(404);
  });

  it("returns 400 when result_status is invalid", async () => {
    const res = await request(app)
      .put("/api/qc/tests/test-001")
      .send({ ...validBody, result_status: "Unknown" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("result_status");
  });

  it("returns 400 when test_result is missing", async () => {
    const res = await request(app)
      .put("/api/qc/tests/test-001")
      .send({ result_status: "Pass", verified_by: "supervisor" });

    expect(res.status).toBe(400);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/qc/queue", () => {
  it("returns 200 with quarantine queue", async () => {
    mockService.getQCQueue.mockResolvedValue([sampleQueueItem]);

    const res = await request(app).get("/api/qc/queue");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it("returns 500 when service throws", async () => {
    mockService.getQCQueue.mockRejectedValue(new Error("fail"));

    const res = await request(app).get("/api/qc/queue");

    expect(res.status).toBe(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/qc/queue/count", () => {
  it("returns count of items in queue", async () => {
    mockService.getQCQueue.mockResolvedValue([sampleQueueItem, sampleQueueItem]);

    const res = await request(app).get("/api/qc/queue/count");

    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(2);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/qc/stats", () => {
  it("returns 200 with stats", async () => {
    mockService.getQCStats.mockResolvedValue(sampleStats);

    const res = await request(app).get("/api/qc/stats");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pending_count).toBe(5);
    expect(res.body.data.pass_rate_30d).toBe(80);
  });

  it("returns 500 when service throws", async () => {
    mockService.getQCStats.mockRejectedValue(new Error("fail"));

    const res = await request(app).get("/api/qc/stats");

    expect(res.status).toBe(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/qc/approve/:lotId", () => {
  it("returns 200 when lot is approved successfully", async () => {
    mockService.approveLot.mockResolvedValue({ success: true, message: "Lô hàng đã được phê duyệt thành công" });

    const res = await request(app).post("/api/qc/approve/lot-001");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockService.approveLot).toHaveBeenCalledWith("lot-001", "user-qc-01");
  });

  it("returns 400 when service returns failure", async () => {
    mockService.approveLot.mockResolvedValue({ success: false, message: "Còn 1 kiểm tra chưa có kết quả." });

    const res = await request(app).post("/api/qc/approve/lot-001");

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("kiểm tra");
  });

  it("returns 500 when service throws", async () => {
    mockService.approveLot.mockRejectedValue(new Error("DB fail"));

    const res = await request(app).post("/api/qc/approve/lot-001");

    expect(res.status).toBe(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/qc/reject/:lotId", () => {
  it("returns 200 when lot is rejected with a reason", async () => {
    mockService.rejectLot.mockResolvedValue({ success: true, message: "Lô hàng đã bị từ chối" });

    const res = await request(app)
      .post("/api/qc/reject/lot-001")
      .send({ reason: "Identity test failed" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockService.rejectLot).toHaveBeenCalledWith("lot-001", "user-qc-01", "Identity test failed");
  });

  it("returns 400 when reason is missing", async () => {
    const res = await request(app).post("/api/qc/reject/lot-001").send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Lý do từ chối là bắt buộc");
  });

  it("returns 400 when reason is empty string", async () => {
    const res = await request(app).post("/api/qc/reject/lot-001").send({ reason: "   " });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Lý do từ chối là bắt buộc");
  });

  it("returns 400 when service returns failure", async () => {
    mockService.rejectLot.mockResolvedValue({ success: false, message: "Không tìm thấy lô hàng" });

    const res = await request(app)
      .post("/api/qc/reject/lot-001")
      .send({ reason: "test" });

    expect(res.status).toBe(400);
  });

  it("returns 500 when service throws", async () => {
    mockService.rejectLot.mockRejectedValue(new Error("fail"));

    const res = await request(app)
      .post("/api/qc/reject/lot-001")
      .send({ reason: "some reason" });

    expect(res.status).toBe(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/qc/lot/:lotId/history", () => {
  it("returns 200 with test history for a lot", async () => {
    mockService.getTestsByLot.mockResolvedValue([sampleTest]);

    const res = await request(app).get("/api/qc/lot/lot-001/history");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(mockService.getTestsByLot).toHaveBeenCalledWith("lot-001");
  });

  it("returns empty array when lot has no history", async () => {
    mockService.getTestsByLot.mockResolvedValue([]);

    const res = await request(app).get("/api/qc/lot/lot-no-tests/history");

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it("returns 500 when service throws", async () => {
    mockService.getTestsByLot.mockRejectedValue(new Error("fail"));

    const res = await request(app).get("/api/qc/lot/lot-001/history");

    expect(res.status).toBe(500);
  });
});
