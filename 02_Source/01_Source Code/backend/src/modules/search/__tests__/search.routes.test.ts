/**
 * Route integration tests for Search Module
 * Uses supertest against a minimal Express app.
 * Mocks: auth middleware, rbac, and the search.service layer.
 */
import request from "supertest";
import express, { Request, Response, NextFunction } from "express";

// ─── Mock Auth & RBAC BEFORE importing the router ───────────────────────────
jest.mock("../../../security/auth", () => ({
  authenticateJWT: (req: Request, _res: Response, next: NextFunction) => {
    (req as any).user = {
      user_id: "user-admin-01",
      username: "test_admin",
      roles: ["admin"],
      sub: "user-admin-01",
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

// ─── Mock Search Service ─────────────────────────────────────────────────────
jest.mock("../search.service");
import * as searchService from "../search.service";
const mockService = searchService as jest.Mocked<typeof searchService>;

// ─── Import router AFTER mocks ───────────────────────────────────────────────
import searchRouter from "../search.routes";

// ─── Build minimal Express app ───────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/search", searchRouter);

// ─── Fixtures ────────────────────────────────────────────────────────────────
const sampleResult = {
  id: "MAT-001",
  material_id: "MAT-001",
  part_number: "PN-001",
  material_name: "Acetaminophen API",
  material_type: "API",
  storage_conditions: "15-25C, dry place",
  specification_document: "SPEC-001",
  score: 2.5,
};

const sampleMaterial = {
  material_id: "MAT-001",
  part_number: "PN-001",
  material_name: "Acetaminophen API",
  material_type: "API",
};

// ─── Reset mocks between tests ───────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});

// =============================================================================
// GET /api/search
// =============================================================================
describe("GET /api/search", () => {
  it("trả về 200 với kết quả search", async () => {
    mockService.searchMaterials.mockResolvedValue({
      results: [sampleResult],
      total: 1,
      took: 3,
    });

    const res = await request(app).get("/api/search?q=Acetaminophen");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.took).toBe(3);
    expect(res.body.query).toBe("Acetaminophen");
  });

  it("truyền đúng params vào searchMaterials", async () => {
    mockService.searchMaterials.mockResolvedValue({ results: [], total: 0, took: 1 });

    await request(app).get("/api/search?q=aspirin&material_type=API&limit=10&offset=20");

    expect(mockService.searchMaterials).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "aspirin",
        limit: 10,
        offset: 20,
        filters: expect.objectContaining({ material_type: "API" }),
      })
    );
  });

  it("dùng query rỗng khi không truyền q", async () => {
    mockService.searchMaterials.mockResolvedValue({ results: [], total: 0, took: 1 });

    await request(app).get("/api/search");

    expect(mockService.searchMaterials).toHaveBeenCalledWith(
      expect.objectContaining({ query: "" })
    );
  });

  it("dùng limit=20 và offset=0 làm mặc định", async () => {
    mockService.searchMaterials.mockResolvedValue({ results: [], total: 0, took: 1 });

    await request(app).get("/api/search?q=test");

    expect(mockService.searchMaterials).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 })
    );
  });

  it("trả về 500 khi service ném lỗi", async () => {
    mockService.searchMaterials.mockRejectedValueOnce(new Error("ES down"));

    const res = await request(app).get("/api/search?q=test");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// =============================================================================
// POST /api/search/index  (bulk index tất cả materials)
// =============================================================================
describe("POST /api/search/index", () => {
  it("trả về 200 với số lượng đã index", async () => {
    mockService.indexAllMaterials.mockResolvedValue(42);

    const res = await request(app).post("/api/search/index");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(42);
    expect(res.body.message).toContain("42");
  });

  it("trả về 500 khi service ném lỗi", async () => {
    mockService.indexAllMaterials.mockRejectedValueOnce(new Error("Bulk failed"));

    const res = await request(app).post("/api/search/index");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// =============================================================================
// POST /api/search/index/:materialId  (index một material cụ thể)
// =============================================================================
describe("POST /api/search/index/:materialId", () => {
  it("trả về 200 khi index thành công", async () => {
    mockService.indexMaterial.mockResolvedValue(undefined);

    const res = await request(app)
      .post("/api/search/index/MAT-001")
      .send(sampleMaterial);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("MAT-001");
  });

  it("tự điền material_id từ URL param khi body thiếu material_id", async () => {
    mockService.indexMaterial.mockResolvedValue(undefined);

    await request(app)
      .post("/api/search/index/MAT-999")
      .send({ part_number: "PN-999", material_name: "Test Mat", material_type: "API" });

    const calledWith = mockService.indexMaterial.mock.calls[0][0];
    expect(calledWith.material_id).toBe("MAT-999");
  });

  it("trả về 500 khi service ném lỗi", async () => {
    mockService.indexMaterial.mockRejectedValueOnce(new Error("Index error"));

    const res = await request(app)
      .post("/api/search/index/MAT-001")
      .send(sampleMaterial);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// =============================================================================
// DELETE /api/search/index/:materialId
// =============================================================================
describe("DELETE /api/search/index/:materialId", () => {
  it("trả về 200 khi xóa thành công", async () => {
    mockService.deleteMaterialIndex.mockResolvedValue(undefined);

    const res = await request(app).delete("/api/search/index/MAT-001");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("MAT-001");
    expect(mockService.deleteMaterialIndex).toHaveBeenCalledWith("MAT-001");
  });

  it("trả về 500 khi service ném lỗi", async () => {
    mockService.deleteMaterialIndex.mockRejectedValueOnce(new Error("Delete error"));

    const res = await request(app).delete("/api/search/index/MAT-001");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// =============================================================================
// POST /api/search/reindex
// =============================================================================
describe("POST /api/search/reindex", () => {
  it("trả về 200 với số lượng sau reindex", async () => {
    mockService.deleteIndex.mockResolvedValue(undefined);
    mockService.indexAllMaterials.mockResolvedValue(15);

    const res = await request(app).post("/api/search/reindex");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(15);
    expect(res.body.message).toContain("15");
    expect(mockService.deleteIndex).toHaveBeenCalledTimes(1);
    expect(mockService.indexAllMaterials).toHaveBeenCalledTimes(1);
  });

  it("gọi deleteIndex trước indexAllMaterials", async () => {
    const callOrder: string[] = [];
    mockService.deleteIndex.mockImplementation(async () => { callOrder.push("delete"); });
    mockService.indexAllMaterials.mockImplementation(async () => { callOrder.push("index"); return 0; });

    await request(app).post("/api/search/reindex");

    expect(callOrder).toEqual(["delete", "index"]);
  });

  it("trả về 500 khi deleteIndex ném lỗi", async () => {
    mockService.deleteIndex.mockRejectedValueOnce(new Error("Delete failed"));

    const res = await request(app).post("/api/search/reindex");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  it("trả về 500 khi indexAllMaterials ném lỗi", async () => {
    mockService.deleteIndex.mockResolvedValue(undefined);
    mockService.indexAllMaterials.mockRejectedValueOnce(new Error("Bulk failed"));

    const res = await request(app).post("/api/search/reindex");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
