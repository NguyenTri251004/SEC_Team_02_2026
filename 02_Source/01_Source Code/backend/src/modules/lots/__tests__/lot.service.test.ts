import * as lotService from "../lot.service";
import pool from "../../../shared/db/pool";

// Mock the database pool
jest.mock("../../../shared/db/pool", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const mockQuery = pool.query as jest.Mock;

// Helper to build a mock lot row
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

describe("lot.service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ========================================
  // getAllLots
  // ========================================
  describe("getAllLots", () => {
    it("should return all lots without filters", async () => {
      const lots = [makeLot(), makeLot({ lot_id: "LOT-002" })];
      mockQuery.mockResolvedValueOnce({ rows: lots, rowCount: 2 } as any);

      const result = await lotService.getAllLots();

      expect(mockQuery).toHaveBeenCalledTimes(1);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).not.toContain("WHERE");
      expect(sql).toContain("ORDER BY l.received_date DESC");
      expect(result).toHaveLength(2);
      expect(result[0].lot_id).toBe("LOT-001");
    });

    it("should filter by status", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeLot()], rowCount: 1 } as any);

      await lotService.getAllLots({ status: "Quarantine" });

      const sql = mockQuery.mock.calls[0][0] as string;
      const params = mockQuery.mock.calls[0][1] as unknown[];
      expect(sql).toContain("l.status = $1");
      expect(params).toEqual(["Quarantine"]);
    });

    it("should filter by material_id", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await lotService.getAllLots({ material_id: "MAT-003" });

      const params = mockQuery.mock.calls[0][1] as unknown[];
      expect(params).toEqual(["MAT-003"]);
    });

    it("should filter by expiring_before", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await lotService.getAllLots({ expiring_before: "2026-06-01" });

      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain("l.expiration_date <= $1");
    });

    it("should filter by is_sample", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await lotService.getAllLots({ is_sample: true });

      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain("l.is_sample = $1");
      const params = mockQuery.mock.calls[0][1] as unknown[];
      expect(params).toEqual([true]);
    });

    it("should combine multiple filters", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await lotService.getAllLots({
        status: "Accepted",
        material_id: "MAT-001",
        expiring_before: "2027-01-01",
      });

      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain("l.status = $1");
      expect(sql).toContain("l.material_id = $2");
      expect(sql).toContain("l.expiration_date <= $3");
      const params = mockQuery.mock.calls[0][1] as unknown[];
      expect(params).toEqual(["Accepted", "MAT-001", "2027-01-01"]);
    });

    it("should return empty array when no lots match", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await lotService.getAllLots({ status: "Depleted" });
      expect(result).toEqual([]);
    });
  });

  // ========================================
  // getLotById
  // ========================================
  describe("getLotById", () => {
    it("should return a lot when found", async () => {
      const lot = makeLot();
      mockQuery.mockResolvedValueOnce({ rows: [lot], rowCount: 1 } as any);

      const result = await lotService.getLotById("LOT-001");

      expect(result).toEqual(lot);
      const params = mockQuery.mock.calls[0][1];
      expect(params).toEqual(["LOT-001"]);
    });

    it("should return null when lot not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await lotService.getLotById("NONEXISTENT");
      expect(result).toBeNull();
    });
  });

  // ========================================
  // createLot
  // ========================================
  describe("createLot", () => {
    const createDto = {
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

    it("should create a lot with status Quarantine", async () => {
      const createdLot = makeLot({ ...createDto, status: "Quarantine" });
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // generateLotId
      mockQuery.mockResolvedValueOnce({ rows: [createdLot], rowCount: 1 } as any); // INSERT

      const result = await lotService.createLot(createDto);

      expect(result.status).toBe("Quarantine");
      const sql = mockQuery.mock.calls[1][0] as string;
      expect(sql).toContain("'Quarantine'");
      expect(sql).toContain("INSERT INTO inventory_lots");
    });

    it("should pass all DTO fields to the query", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // generateLotId
      mockQuery.mockResolvedValueOnce({ rows: [makeLot()], rowCount: 1 } as any); // INSERT

      await lotService.createLot(createDto);

      const params = mockQuery.mock.calls[1][1] as unknown[];
      expect(params[0]).toEqual(expect.any(String)); // lot_id (generated)
      expect(params[1]).toBe("MAT-001");          // material_id
      expect(params[2]).toBe("Pharma Corp");      // manufacturer_name
      expect(params[3]).toBe("MFG-2026-NEW");     // manufacturer_lot
      expect(params[4]).toBe("Supplier B");       // supplier_name
    });

    it("should default optional fields to null/false", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // generateLotId
      mockQuery.mockResolvedValueOnce({ rows: [makeLot()], rowCount: 1 } as any); // INSERT

      await lotService.createLot(createDto);

      const params = mockQuery.mock.calls[1][1] as unknown[];
      // in_use_expiration_date -> null
      expect(params[7]).toBeNull();
      // storage_location -> null
      expect(params[10]).toBeNull();
      // is_sample -> false
      expect(params[11]).toBe(false);
      // parent_lot_id -> null
      expect(params[12]).toBeNull();
      // po_number -> null
      expect(params[13]).toBeNull();
    });

    it("should pass optional fields when provided", async () => {
      const dtoWithOptionals = {
        ...createDto,
        in_use_expiration_date: "2026-09-01",
        storage_location: "WH-B2",
        is_sample: true,
        parent_lot_id: "LOT-PARENT",
        po_number: "PO-999",
        receiving_form_id: "RF-001",
      };
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // generateLotId
      mockQuery.mockResolvedValueOnce({ rows: [makeLot()], rowCount: 1 } as any); // INSERT

      await lotService.createLot(dtoWithOptionals);

      const params = mockQuery.mock.calls[1][1] as unknown[];
      expect(params[7]).toBe("2026-09-01");
      expect(params[10]).toBe("WH-B2");
      expect(params[11]).toBe(true);
      expect(params[12]).toBe("LOT-PARENT");
      expect(params[13]).toBe("PO-999");
      expect(params[14]).toBe("RF-001");
    });
  });

  // ========================================
  // updateLot
  // ========================================
  describe("updateLot", () => {
    it("should update lot and return updated record", async () => {
      const updated = makeLot({ storage_location: "WH-C3" });
      mockQuery.mockResolvedValueOnce({ rows: [updated], rowCount: 1 } as any);

      const result = await lotService.updateLot("LOT-001", {
        storage_location: "WH-C3",
      });

      expect(result).toEqual(updated);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain("UPDATE inventory_lots");
      expect(sql).toContain("COALESCE");
      expect(sql).toContain("RETURNING *");
    });

    it("should return null when lot not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await lotService.updateLot("NONEXISTENT", {
        storage_location: "WH-X",
      });

      expect(result).toBeNull();
    });

    it("should pass null for fields not in the DTO", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeLot()], rowCount: 1 } as any);

      await lotService.updateLot("LOT-001", {
        manufacturer_name: "New Corp",
      });

      const params = mockQuery.mock.calls[0][1] as unknown[];
      expect(params[0]).toBe("New Corp");     // manufacturer_name
      expect(params[1]).toBeNull();            // manufacturer_lot (not provided)
      expect(params[2]).toBeNull();            // supplier_name
      expect(params[9]).toBe("LOT-001");       // id is last param
    });
  });

  // ========================================
  // updateLotStatus - Business Rules
  // ========================================
  describe("updateLotStatus", () => {
    it("should allow Quarantine -> Accepted", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [makeLot({ status: "Quarantine" })], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [makeLot({ status: "Accepted" })], rowCount: 1 } as any);

      const result = await lotService.updateLotStatus("LOT-001", "Accepted");

      expect(result?.status).toBe("Accepted");
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it("should allow Quarantine -> Rejected", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [makeLot({ status: "Quarantine" })], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [makeLot({ status: "Rejected" })], rowCount: 1 } as any);

      const result = await lotService.updateLotStatus("LOT-001", "Rejected", "Failed QC");

      expect(result?.status).toBe("Rejected");
    });

    it("should allow Accepted -> Depleted", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [makeLot({ status: "Accepted" })], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [makeLot({ status: "Depleted" })], rowCount: 1 } as any);

      const result = await lotService.updateLotStatus("LOT-001", "Depleted");

      expect(result?.status).toBe("Depleted");
    });

    it("should allow Accepted -> Rejected", async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [makeLot({ status: "Accepted" })], rowCount: 1 } as any)
        .mockResolvedValueOnce({ rows: [makeLot({ status: "Rejected" })], rowCount: 1 } as any);

      const result = await lotService.updateLotStatus("LOT-001", "Rejected", "Contamination found");

      expect(result?.status).toBe("Rejected");
    });

    it("should reject invalid transition: Quarantine -> Depleted", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeLot({ status: "Quarantine" })], rowCount: 1 } as any);

      await expect(
        lotService.updateLotStatus("LOT-001", "Depleted")
      ).rejects.toThrow("Invalid status transition: Quarantine -> Depleted");
    });

    it("should reject invalid transition: Rejected -> Accepted", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeLot({ status: "Rejected" })], rowCount: 1 } as any);

      await expect(
        lotService.updateLotStatus("LOT-001", "Accepted")
      ).rejects.toThrow("Invalid status transition: Rejected -> Accepted");
    });

    it("should reject invalid transition: Rejected -> Quarantine", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeLot({ status: "Rejected" })], rowCount: 1 } as any);

      await expect(
        lotService.updateLotStatus("LOT-001", "Quarantine")
      ).rejects.toThrow("Invalid status transition: Rejected -> Quarantine");
    });

    it("should reject invalid transition: Depleted -> any", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeLot({ status: "Depleted" })], rowCount: 1 } as any);

      await expect(
        lotService.updateLotStatus("LOT-001", "Accepted")
      ).rejects.toThrow("Invalid status transition: Depleted -> Accepted. Allowed: none");
    });

    it("should reject invalid transition: Accepted -> Quarantine", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [makeLot({ status: "Accepted" })], rowCount: 1 } as any);

      await expect(
        lotService.updateLotStatus("LOT-001", "Quarantine")
      ).rejects.toThrow("Invalid status transition: Accepted -> Quarantine");
    });

    it("should return null when lot not found", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await lotService.updateLotStatus("NONEXISTENT", "Accepted");
      expect(result).toBeNull();
    });
  });

  // ========================================
  // getExpiringLots
  // ========================================
  describe("getExpiringLots", () => {
    it("should query lots expiring within N days", async () => {
      const lots = [makeLot({ expiration_date: "2026-04-01" })];
      mockQuery.mockResolvedValueOnce({ rows: lots, rowCount: 1 } as any);

      const result = await lotService.getExpiringLots(30);

      expect(result).toHaveLength(1);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain("CURRENT_DATE + $1 * INTERVAL '1 day'");
      expect(sql).toContain("l.status IN ('Quarantine', 'Accepted')");
      expect(sql).toContain("ORDER BY l.expiration_date ASC");
      const params = mockQuery.mock.calls[0][1];
      expect(params).toEqual([30]);
    });

    it("should return empty array when no lots are expiring soon", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await lotService.getExpiringLots(7);
      expect(result).toEqual([]);
    });
  });

  // ========================================
  // getLotsByMaterial
  // ========================================
  describe("getLotsByMaterial", () => {
    it("should return lots for a given material", async () => {
      const lots = [makeLot(), makeLot({ lot_id: "LOT-002" })];
      mockQuery.mockResolvedValueOnce({ rows: lots, rowCount: 2 } as any);

      const result = await lotService.getLotsByMaterial("MAT-001");

      expect(result).toHaveLength(2);
      const sql = mockQuery.mock.calls[0][0] as string;
      expect(sql).toContain("l.material_id = $1");
      expect(sql).toContain("ORDER BY l.received_date DESC");
      const params = mockQuery.mock.calls[0][1];
      expect(params).toEqual(["MAT-001"]);
    });

    it("should return empty array when material has no lots", async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await lotService.getLotsByMaterial("MAT-NONE");
      expect(result).toEqual([]);
    });
  });
});
