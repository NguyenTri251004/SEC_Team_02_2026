import express from "express";
import supertest from "supertest";
import lotRouter from "../lot.routes";
import * as lotService from "../lot.service";

const request = (supertest as any).default || supertest;

// Mock auth middleware - bypass authentication
jest.mock("../../../security/auth", () => ({
  authenticateJWT: (req: any, _res: any, next: any) => {
    req.user = {
      user_id: "test-user-001",
      username: "test_admin",
      email: "admin@test.com",
      roles: ["admin"],
    };
    next();
  },
}));

// Mock rbac middleware - bypass permission checks
jest.mock("../../../security/rbac", () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock lot service
jest.mock("../lot.service");
const mockedService = lotService as jest.Mocked<typeof lotService>;

// Build a minimal Express app for testing
function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/lots", lotRouter);
  return app;
}

const makeLot = (overrides: Record<string, unknown> = {}) => ({
  lot_id: "LOT-001",
  material_id: "MAT-001",
  manufacturer_name: "Pharma Corp",
  manufacturer_lot: "MFG-2026-001",
  supplier_name: "Supplier A",
  received_date: "2026-01-15",
  expiration_date: "2027-01-15",
  in_use_expiration_date: null,
  status: "Quarantine",
  quantity: 100,
  unit_of_measure: "kg",
  storage_location: "WH-A1",
  is_sample: false,
  parent_lot_id: null,
  po_number: "PO-001",
  receiving_form_id: null,
  created_date: new Date("2026-01-15"),
  modified_date: new Date("2026-01-15"),
  material_name: "Paracetamol API",
  material_type: "API",
  part_number: "PN-001",
  ...overrides,
});

describe("lot.routes", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ========================================
  // GET /api/lots
  // ========================================
  describe("GET /api/lots", () => {
    it("should return 200 with list of lots", async () => {
      const lots = [makeLot(), makeLot({ lot_id: "LOT-002" })];
      mockedService.getAllLots.mockResolvedValue(lots as any);

      const res = await request(app).get("/api/lots");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it("should pass query filters to service", async () => {
      mockedService.getAllLots.mockResolvedValue([]);

      await request(app).get("/api/lots?status=Accepted&material_id=MAT-001&is_sample=true");

      expect(mockedService.getAllLots).toHaveBeenCalledWith({
        status: "Accepted",
        material_id: "MAT-001",
        expiring_before: undefined,
        is_sample: true,
      });
    });

    it("should return 500 on service error", async () => {
      mockedService.getAllLots.mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/api/lots");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================
  // GET /api/lots/expiring
  // ========================================
  describe("GET /api/lots/expiring", () => {
    it("should return expiring lots with default 30 days", async () => {
      mockedService.getExpiringLots.mockResolvedValue([makeLot()] as any);

      const res = await request(app).get("/api/lots/expiring");

      expect(res.status).toBe(200);
      expect(mockedService.getExpiringLots).toHaveBeenCalledWith(30);
    });

    it("should accept custom days parameter", async () => {
      mockedService.getExpiringLots.mockResolvedValue([]);

      await request(app).get("/api/lots/expiring?days=7");

      expect(mockedService.getExpiringLots).toHaveBeenCalledWith(7);
    });

    it("should return 500 on service error", async () => {
      mockedService.getExpiringLots.mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/api/lots/expiring");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================
  // GET /api/lots/by-material/:materialId
  // ========================================
  describe("GET /api/lots/by-material/:materialId", () => {
    it("should return lots for a specific material", async () => {
      const lots = [makeLot()];
      mockedService.getLotsByMaterial.mockResolvedValue(lots as any);

      const res = await request(app).get("/api/lots/by-material/MAT-001");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockedService.getLotsByMaterial).toHaveBeenCalledWith("MAT-001");
    });

    it("should return 500 on service error", async () => {
      mockedService.getLotsByMaterial.mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/api/lots/by-material/MAT-001");

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // GET /api/lots/:id
  // ========================================
  describe("GET /api/lots/:id", () => {
    it("should return 200 with lot detail", async () => {
      mockedService.getLotById.mockResolvedValue(makeLot() as any);

      const res = await request(app).get("/api/lots/LOT-001");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lot_id).toBe("LOT-001");
    });

    it("should return 404 when lot not found", async () => {
      mockedService.getLotById.mockResolvedValue(null);

      const res = await request(app).get("/api/lots/NONEXISTENT");

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 500 on service error", async () => {
      mockedService.getLotById.mockRejectedValue(new Error("DB error"));

      const res = await request(app).get("/api/lots/LOT-001");

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ========================================
  // POST /api/lots
  // ========================================
  describe("POST /api/lots", () => {
    const validBody = {
      lot_id: "LOT-NEW",
      material_id: "MAT-001",
      manufacturer_name: "Pharma Corp",
      manufacturer_lot: "MFG-2026-NEW",
      supplier_name: "Supplier B",
      received_date: "2026-03-01",
      expiration_date: "2027-03-01",
      quantity: 50,
      unit_of_measure: "kg",
    };

    it("should return 201 on successful creation", async () => {
      const createdLot = makeLot({ ...validBody, status: "Quarantine" });
      mockedService.createLot.mockResolvedValue(createdLot as any);

      const res = await request(app).post("/api/lots").send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.lot_id).toBe("LOT-NEW");
    });

    it("should return 400 when required fields are missing", async () => {
      const res = await request(app).post("/api/lots").send({
        lot_id: "LOT-INCOMPLETE",
        // missing other required fields
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain("Thieu thong tin bat buoc");
    });

    it("should return 400 when material_id is missing", async () => {
      const { material_id, ...bodyWithout } = validBody;
      const res = await request(app).post("/api/lots").send(bodyWithout);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should return 400 when quantity is missing", async () => {
      const { quantity, ...bodyWithout } = validBody;
      const res = await request(app).post("/api/lots").send(bodyWithout);

      expect(res.status).toBe(400);
    });

    it("should return 409 on duplicate lot_id", async () => {
      const dbError = { code: "23505", message: "duplicate key" };
      mockedService.createLot.mockRejectedValue(dbError);

      const res = await request(app).post("/api/lots").send(validBody);

      expect(res.status).toBe(409);
      expect(res.body.error).toContain("lot_id da ton tai");
    });

    it("should return 400 on invalid FK (material_id not found)", async () => {
      const dbError = { code: "23503", message: "foreign key violation" };
      mockedService.createLot.mockRejectedValue(dbError);

      const res = await request(app).post("/api/lots").send(validBody);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("material_id khong ton tai");
    });

    it("should return 500 on unexpected error", async () => {
      mockedService.createLot.mockRejectedValue(new Error("Unexpected"));

      const res = await request(app).post("/api/lots").send(validBody);

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // PUT /api/lots/:id
  // ========================================
  describe("PUT /api/lots/:id", () => {
    it("should return 200 on successful update", async () => {
      const updated = makeLot({ storage_location: "WH-NEW" });
      mockedService.updateLot.mockResolvedValue(updated as any);

      const res = await request(app)
        .put("/api/lots/LOT-001")
        .send({ storage_location: "WH-NEW" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockedService.updateLot).toHaveBeenCalledWith("LOT-001", { storage_location: "WH-NEW" });
    });

    it("should return 404 when lot not found", async () => {
      mockedService.updateLot.mockResolvedValue(null);

      const res = await request(app)
        .put("/api/lots/NONEXISTENT")
        .send({ storage_location: "WH-X" });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("should return 500 on service error", async () => {
      mockedService.updateLot.mockRejectedValue(new Error("DB error"));

      const res = await request(app)
        .put("/api/lots/LOT-001")
        .send({ storage_location: "WH-X" });

      expect(res.status).toBe(500);
    });
  });

  // ========================================
  // PATCH /api/lots/:id/status
  // ========================================
  describe("PATCH /api/lots/:id/status", () => {
    it("should return 200 on valid status update", async () => {
      const updated = makeLot({ status: "Accepted" });
      mockedService.updateLotStatus.mockResolvedValue(updated as any);

      const res = await request(app)
        .patch("/api/lots/LOT-001/status")
        .send({ status: "Accepted" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockedService.updateLotStatus).toHaveBeenCalledWith("LOT-001", "Accepted", undefined);
    });

    it("should pass reason when provided", async () => {
      mockedService.updateLotStatus.mockResolvedValue(makeLot({ status: "Rejected" }) as any);

      await request(app)
        .patch("/api/lots/LOT-001/status")
        .send({ status: "Rejected", reason: "Failed QC test" });

      expect(mockedService.updateLotStatus).toHaveBeenCalledWith("LOT-001", "Rejected", "Failed QC test");
    });

    it("should return 400 when status field is missing", async () => {
      const res = await request(app)
        .patch("/api/lots/LOT-001/status")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Thieu truong status");
    });

    it("should return 404 when lot not found", async () => {
      mockedService.updateLotStatus.mockResolvedValue(null);

      const res = await request(app)
        .patch("/api/lots/NONEXISTENT/status")
        .send({ status: "Accepted" });

      expect(res.status).toBe(404);
    });

    it("should return 400 on invalid status transition", async () => {
      mockedService.updateLotStatus.mockRejectedValue(
        new Error("Invalid status transition: Quarantine -> Depleted")
      );

      const res = await request(app)
        .patch("/api/lots/LOT-001/status")
        .send({ status: "Depleted" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid status transition");
    });
  });
});
