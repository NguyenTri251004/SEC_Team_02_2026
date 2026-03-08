/**
 * Integration-style route tests for Material routes.
 *
 * Auth and RBAC middleware are mocked so every request is treated as an
 * authenticated admin.  The material.service module is fully mocked so
 * no real database connection is needed.
 */

/* ---------- mock auth + rbac BEFORE imports ---------- */
jest.mock("../../../security/auth", () => ({
  authenticateJWT: (_req: any, _res: any, next: any) => {
    _req.user = { user_id: "u-1", username: "tester", roles: ["admin"] };
    next();
  },
}));

jest.mock("../../../security/rbac", () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

jest.mock("../material.service");

/* ---------- imports ---------- */
import express from "express";
import request from "supertest";
import * as materialService from "../material.service";
import materialRouter from "../material.routes";

const svc = materialService as jest.Mocked<typeof materialService>;

/* ---------- test app ---------- */
const app = express();
app.use(express.json());
app.use("/api/materials", materialRouter);

/* ---------- sample data ---------- */
const MATERIAL = {
  material_id: "MAT-001",
  part_number: "PN-001",
  material_name: "Acetaminophen API",
  material_type: "API",
  storage_conditions: "15-25C",
  specification_document: "SPEC-001",
  created_date: new Date("2026-01-01"),
  modified_date: new Date("2026-01-01"),
};

/* ---------- reset between tests ---------- */
afterEach(() => {
  jest.clearAllMocks();
});

// =============================================================
// GET /api/materials
// =============================================================
describe("GET /api/materials", () => {
  it("200 - returns list of materials", async () => {
    svc.getAllMaterials.mockResolvedValueOnce([MATERIAL]);

    const res = await request(app).get("/api/materials");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].material_id).toBe("MAT-001");
  });

  it("500 - returns error when service throws", async () => {
    svc.getAllMaterials.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).get("/api/materials");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});

// =============================================================
// GET /api/materials/:id
// =============================================================
describe("GET /api/materials/:id", () => {
  it("200 - returns material when found", async () => {
    svc.getMaterialById.mockResolvedValueOnce(MATERIAL);

    const res = await request(app).get("/api/materials/MAT-001");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.material_id).toBe("MAT-001");
  });

  it("404 - returns not found when material does not exist", async () => {
    svc.getMaterialById.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/materials/NONEXISTENT");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it("500 - returns error when service throws", async () => {
    svc.getMaterialById.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).get("/api/materials/MAT-001");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});

// =============================================================
// POST /api/materials
// =============================================================
describe("POST /api/materials", () => {
  const validBody = {
    material_id: "MAT-002",
    part_number: "PN-002",
    material_name: "Ibuprofen",
    material_type: "API",
  };

  it("201 - creates material with valid body", async () => {
    const created = { ...MATERIAL, ...validBody };
    svc.createMaterial.mockResolvedValueOnce(created);

    const res = await request(app).post("/api/materials").send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.material_id).toBe("MAT-002");
    expect(svc.createMaterial).toHaveBeenCalledWith(validBody);
  });

  it.each([
    { field: "material_id", body: { part_number: "PN", material_name: "N", material_type: "T" } },
    { field: "part_number", body: { material_id: "M", material_name: "N", material_type: "T" } },
    { field: "material_name", body: { material_id: "M", part_number: "PN", material_type: "T" } },
    { field: "material_type", body: { material_id: "M", part_number: "PN", material_name: "N" } },
  ])("400 - rejects when $field is missing", async ({ body }) => {
    const res = await request(app).post("/api/materials").send(body);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(svc.createMaterial).not.toHaveBeenCalled();
  });

  it("409 - returns conflict on duplicate key (error.code 23505)", async () => {
    const dupError: any = new Error("duplicate key");
    dupError.code = "23505";
    svc.createMaterial.mockRejectedValueOnce(dupError);

    const res = await request(app).post("/api/materials").send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it("500 - returns error when service throws generic error", async () => {
    svc.createMaterial.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).post("/api/materials").send(validBody);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});

// =============================================================
// PUT /api/materials/:id
// =============================================================
describe("PUT /api/materials/:id", () => {
  const updateBody = { material_name: "Updated Name" };

  it("200 - updates material when found", async () => {
    const updated = { ...MATERIAL, material_name: "Updated Name" };
    svc.updateMaterial.mockResolvedValueOnce(updated);

    const res = await request(app)
      .put("/api/materials/MAT-001")
      .send(updateBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.material_name).toBe("Updated Name");
    expect(svc.updateMaterial).toHaveBeenCalledWith("MAT-001", updateBody);
  });

  it("404 - returns not found when material does not exist", async () => {
    svc.updateMaterial.mockResolvedValueOnce(null);

    const res = await request(app)
      .put("/api/materials/NONEXISTENT")
      .send(updateBody);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it("500 - returns error when service throws", async () => {
    svc.updateMaterial.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app)
      .put("/api/materials/MAT-001")
      .send(updateBody);

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});

// =============================================================
// DELETE /api/materials/:id
// =============================================================
describe("DELETE /api/materials/:id", () => {
  it("200 - deletes material when found", async () => {
    svc.deleteMaterial.mockResolvedValueOnce(true);

    const res = await request(app).delete("/api/materials/MAT-001");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeDefined();
    expect(svc.deleteMaterial).toHaveBeenCalledWith("MAT-001");
  });

  it("404 - returns not found when material does not exist", async () => {
    svc.deleteMaterial.mockResolvedValueOnce(false);

    const res = await request(app).delete("/api/materials/NONEXISTENT");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });

  it("500 - returns error when service throws", async () => {
    svc.deleteMaterial.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).delete("/api/materials/MAT-001");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});
