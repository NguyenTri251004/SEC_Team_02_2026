/// <reference types="jest" />
import * as labelService from "../label.service";
import pool from "../../../shared/db/pool";
import { LabelType } from "../label.types";

// Mock the database pool with proper typing
jest.mock("../../../shared/db/pool");
jest.mock("../../../shared/cache/redis", () => ({
  default: {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
  },
  CACHE_TTL: 3600,
}));

const mockPool = pool as jest.Mocked<any>;

describe("Label Service", () => {
  const mockTemplate = {
    template_id: "LABEL-001",
    template_name: "Raw Material Label",
    label_type: LabelType.RAW_MATERIAL,
    template_content: '{"fields": ["material_name", "lot_id", "expiration_date"]}',
    width: 3.5,
    height: 2.0,
    created_date: new Date("2026-01-01"),
    modified_date: new Date("2026-01-01"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============ getAllTemplates ============
  describe("getAllTemplates", () => {
    it("should return all templates from database", async () => {
      const templates = [mockTemplate];
      mockPool.query.mockResolvedValueOnce({ rows: templates, rowCount: 1 });

      const result = await labelService.getAllTemplates();

      expect(result).toEqual(templates);
      expect(mockPool.query).toHaveBeenCalledWith(
        "SELECT * FROM label_templates ORDER BY created_date DESC"
      );
    });

    it("should return empty array when no templates exist", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await labelService.getAllTemplates();

      expect(result).toEqual([]);
    });

    it("should handle database errors gracefully", async () => {
      mockPool.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(labelService.getAllTemplates()).rejects.toThrow("Database error");
    });
  });

  // ============ getTemplateById ============
  describe("getTemplateById", () => {
    it("should return a template by ID", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 });

      const result = await labelService.getTemplateById("LABEL-001");

      expect(result).toEqual(mockTemplate);
      expect(mockPool.query).toHaveBeenCalledWith(
        "SELECT * FROM label_templates WHERE template_id = $1",
        ["LABEL-001"]
      );
    });

    it("should return null when template not found", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await labelService.getTemplateById("NONEXISTENT");

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      mockPool.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(labelService.getTemplateById("LABEL-001")).rejects.toThrow();
    });
  });

  // ============ createTemplate ============
  describe("createTemplate", () => {
    it("should create a new template", async () => {
      const input = {
        template_id: "LABEL-001",
        template_name: "Raw Material Label",
        label_type: LabelType.RAW_MATERIAL,
        template_content: '{"fields": ["material_name"]}',
        width: 3.5,
        height: 2.0,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 });

      const result = await labelService.createTemplate(input);

      expect(result).toEqual(mockTemplate);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO label_templates"),
        [
          input.template_id,
          input.template_name,
          input.label_type,
          input.template_content,
          input.width,
          input.height,
        ]
      );
    });

    it("should handle duplicate key error", async () => {
      const input = {
        template_id: "LABEL-001",
        template_name: "Raw Material Label",
        label_type: LabelType.RAW_MATERIAL,
        template_content: '{"fields": []}',
        width: 3.5,
        height: 2.0,
      };

      const error = new Error("Duplicate") as any;
      error.code = "23505";
      mockPool.query.mockRejectedValueOnce(error);

      await expect(labelService.createTemplate(input)).rejects.toEqual(expect.any(Error));
    });

    it("should handle database errors", async () => {
      const input = {
        template_id: "LABEL-001",
        template_name: "Test",
        label_type: LabelType.API,
        template_content: "{}",
        width: 3.5,
        height: 2.0,
      };

      mockPool.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(labelService.createTemplate(input)).rejects.toThrow();
    });
  });

  // ============ updateTemplate ============
  describe("updateTemplate", () => {
    it("should update an existing template", async () => {
      const updates = {
        template_name: "Updated Label",
        width: 4.0,
      };

      const updatedTemplate = { ...mockTemplate, ...updates };
      mockPool.query.mockResolvedValueOnce({ rows: [updatedTemplate], rowCount: 1 });

      const result = await labelService.updateTemplate("LABEL-001", updates);

      expect(result).toEqual(updatedTemplate);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE label_templates"),
        expect.arrayContaining(["LABEL-001"])
      );
    });

    it("should return null when template not found", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await labelService.updateTemplate("NONEXISTENT", { template_name: "New Name" });

      expect(result).toBeNull();
    });

    it("should update only provided fields", async () => {
      const partialUpdate = { template_name: "New Name" };
      const updatedTemplate = { ...mockTemplate, template_name: "New Name" };
      mockPool.query.mockResolvedValueOnce({ rows: [updatedTemplate], rowCount: 1 });

      const result = await labelService.updateTemplate("LABEL-001", partialUpdate);

      expect(result?.template_name).toBe("New Name");
      expect(result?.width).toBe(mockTemplate.width);
    });
  });

  // ============ deleteTemplate ============
  describe("deleteTemplate", () => {
    it("should delete a template successfully", async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await labelService.deleteTemplate("LABEL-001");

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        "DELETE FROM label_templates WHERE template_id = $1",
        ["LABEL-001"]
      );
    });

    it("should return false when template not found", async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await labelService.deleteTemplate("NONEXISTENT");

      expect(result).toBe(false);
    });

    it("should handle database errors", async () => {
      mockPool.query.mockRejectedValueOnce(new Error("Database error"));

      await expect(labelService.deleteTemplate("LABEL-001")).rejects.toThrow();
    });
  });

  // ============ generateLabel ============
  describe("generateLabel", () => {
    it("should generate label for a lot", async () => {
      const mockLot = {
        lot_id: "LOT-001",
        material_name: "Test Material",
        material_type: "API",
        part_number: "PART-001",
        manufacturer_name: "Manufacturer Inc",
        manufacturer_lot: "MFG-LOT-001",
        supplier_name: "Supplier Co",
        received_date: "2026-01-01",
        expiration_date: "2027-01-01",
        quantity: 100,
        unit_of_measure: "kg",
        storage_location: "A1-B2",
        status: "Accepted",
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockLot], rowCount: 1 });

      const result = await labelService.generateLabel({
        template_id: "LABEL-001",
        lot_id: "LOT-001",
      });

      expect(result.template_id).toBe("LABEL-001");
      expect(result.content.lot_id).toBe("LOT-001");
      expect(result.content.material_name).toBe("Test Material");
      expect(result.content.quantity).toBe(100);
    });

    it("should generate label for a batch", async () => {
      const mockBatch = {
        batch_id: "BATCH-001",
        batch_number: "BATCH-2026-001",
        material_name: "Test Product",
        material_type: "API",
        batch_size: 500,
        unit_of_measure: "kg",
        manufacture_date: "2026-01-01",
        expiration_date: "2027-01-01",
        status: "Complete",
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [mockBatch], rowCount: 1 });

      const result = await labelService.generateLabel({
        template_id: "LABEL-001",
        batch_id: "BATCH-001",
      });

      expect(result.template_id).toBe("LABEL-001");
      expect(result.content.batch_id).toBe("BATCH-001");
      expect(result.content.batch_size).toBe(500);
    });

    it("should throw error when template not found", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        labelService.generateLabel({
          template_id: "NONEXISTENT",
          lot_id: "LOT-001",
        })
      ).rejects.toThrow("not found");
    });

    it("should throw error when lot not found", async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        labelService.generateLabel({
          template_id: "LABEL-001",
          lot_id: "NONEXISTENT",
        })
      ).rejects.toThrow("not found");
    });

    it("should throw error when batch not found", async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        labelService.generateLabel({
          template_id: "LABEL-001",
          batch_id: "NONEXISTENT",
        })
      ).rejects.toThrow("not found");
    });
  });
});
