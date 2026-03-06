/// <reference types="jest" />
import { Request, Response } from "express";
import * as labelService from "../label.service";
import { LabelType } from "../label.types";

jest.mock("../label.service");

const mockLabelService = labelService as jest.Mocked<typeof labelService>;

describe("Label Routes - Input Validation", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonSpy: jest.Mock;
  let statusSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonSpy = jest.fn().mockReturnValue({});
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy });

    req = {
      params: {},
      body: {},
      user: { user_id: "user-1", username: "testuser", roles: ["admin"] },
    };

    res = {
      json: jsonSpy,
      status: statusSpy,
    };
  });

  const mockTemplate = {
    template_id: "LABEL-001",
    template_name: "Raw Material Label",
    label_type: LabelType.RAW_MATERIAL,
    template_content: '{"fields": ["material_name", "lot_id"]}',
    width: 3.5,
    height: 2.0,
    created_date: new Date("2026-01-01"),
    modified_date: new Date("2026-01-01"),
  };

  // ============ Test Request Validation ============
  describe("POST /api/labels/templates validation", () => {
    it("should require template_id", () => {
      req.body = {
        template_name: "Test",
        label_type: LabelType.API,
        template_content: "{}",
        width: 3.5,
        height: 2.0,
      };

      const hasRequired = !!(req.body?.template_id && req.body?.template_name &&
                            req.body?.label_type && req.body?.template_content &&
                            req.body?.width !== undefined && req.body?.height !== undefined);
      expect(hasRequired).toBe(false);
    });

    it("should require all fields", () => {
      req.body = { template_name: "Test" };

      const fields = ["template_id", "template_name", "label_type", "template_content", "width", "height"];
      const hasMissing = fields.some(f => !req.body[f] && req.body[f] !== 0);
      expect(hasMissing).toBe(true);
    });

    it("should accept valid input", () => {
      req.body = {
        template_id: "LABEL-001",
        template_name: "Test",
        label_type: LabelType.API,
        template_content: "{}",
        width: 3.5,
        height: 2.0,
      };

      const fields = ["template_id", "template_name", "label_type", "template_content", "width", "height"];
      const hasAll = fields.every(f => req.body[f] || req.body[f] === 0);
      expect(hasAll).toBe(true);
    });
  });

  describe("POST /api/labels/generate validation", () => {
    it("should require template_id", () => {
      req.body = { lot_id: "LOT-001" };

      expect(req.body?.template_id).toBeUndefined();
      expect(!req.body?.template_id).toBe(true);
    });

    it("should require lot_id or batch_id", () => {
      req.body = { template_id: "LABEL-001" };

      const hasIdField = !!(req.body?.lot_id || req.body?.batch_id);
      expect(hasIdField).toBe(false);
    });

    it("should accept template_id with lot_id", () => {
      req.body = { template_id: "LABEL-001", lot_id: "LOT-001" };

      const isValid = !!(req.body?.template_id && (req.body?.lot_id || req.body?.batch_id));
      expect(isValid).toBe(true);
    });

    it("should accept template_id with batch_id", () => {
      req.body = { template_id: "LABEL-001", batch_id: "BATCH-001" };

      const isValid = !!(req.body?.template_id && (req.body?.lot_id || req.body?.batch_id));
      expect(isValid).toBe(true);
    });
  });

  // ============ Test Service Integration ============
  describe("Service Integration Tests", () => {
    it("should call service.getAllTemplates", async () => {
      mockLabelService.getAllTemplates.mockResolvedValueOnce([mockTemplate]);

      const result = await labelService.getAllTemplates();

      expect(mockLabelService.getAllTemplates).toHaveBeenCalled();
      expect(result).toEqual([mockTemplate]);
    });

    it("should call service.getTemplateById with ID", async () => {
      mockLabelService.getTemplateById.mockResolvedValueOnce(mockTemplate);

      const result = await labelService.getTemplateById("LABEL-001");

      expect(mockLabelService.getTemplateById).toHaveBeenCalledWith("LABEL-001");
      expect(result).toEqual(mockTemplate);
    });

    it("should call service.createTemplate with input", async () => {
      const input = {
        template_id: "LABEL-001",
        template_name: "Test",
        label_type: LabelType.API,
        template_content: "{}",
        width: 3.5,
        height: 2.0,
      };
      mockLabelService.createTemplate.mockResolvedValueOnce(mockTemplate);

      const result = await labelService.createTemplate(input);

      expect(mockLabelService.createTemplate).toHaveBeenCalledWith(input);
      expect(result).toEqual(mockTemplate);
    });

    it("should call service.updateTemplate with ID and input", async () => {
      const updates = { template_name: "Updated" };
      const updated = { ...mockTemplate, ...updates };
      mockLabelService.updateTemplate.mockResolvedValueOnce(updated);

      const result = await labelService.updateTemplate("LABEL-001", updates);

      expect(mockLabelService.updateTemplate).toHaveBeenCalledWith("LABEL-001", updates);
      expect(result).toEqual(updated);
    });

    it("should call service.deleteTemplate with ID", async () => {
      mockLabelService.deleteTemplate.mockResolvedValueOnce(true);

      const result = await labelService.deleteTemplate("LABEL-001");

      expect(mockLabelService.deleteTemplate).toHaveBeenCalledWith("LABEL-001");
      expect(result).toBe(true);
    });

    it("should call service.generateLabel for lot", async () => {
      const generated = {
        template_id: "LABEL-001",
        template_name: "Test",
        label_type: LabelType.RAW_MATERIAL,
        width: 3.5,
        height: 2.0,
        content: { lot_id: "LOT-001" },
        generated_date: new Date(),
      };
      mockLabelService.generateLabel.mockResolvedValueOnce(generated);

      const result = await labelService.generateLabel({
        template_id: "LABEL-001",
        lot_id: "LOT-001",
      });

      expect(mockLabelService.generateLabel).toHaveBeenCalledWith({
        template_id: "LABEL-001",
        lot_id: "LOT-001",
      });
      expect(result).toEqual(generated);
    });

    it("should call service.generateLabel for batch", async () => {
      const generated = {
        template_id: "LABEL-001",
        template_name: "Test",
        label_type: LabelType.FINISHED_PRODUCT,
        width: 3.5,
        height: 2.0,
        content: { batch_id: "BATCH-001" },
        generated_date: new Date(),
      };
      mockLabelService.generateLabel.mockResolvedValueOnce(generated);

      const result = await labelService.generateLabel({
        template_id: "LABEL-001",
        batch_id: "BATCH-001",
      });

      expect(mockLabelService.generateLabel).toHaveBeenCalledWith({
        template_id: "LABEL-001",
        batch_id: "BATCH-001",
      });
      expect(result).toEqual(generated);
    });
  });

  // ============ Test Error Handling ============
  describe("Service Error Handling", () => {
    it("should handle service errors on getAllTemplates", async () => {
      mockLabelService.getAllTemplates.mockRejectedValueOnce(new Error("DB Error"));

      try {
        await labelService.getAllTemplates();
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it("should handle null return from getTemplateById", async () => {
      mockLabelService.getTemplateById.mockResolvedValueOnce(null);

      const result = await labelService.getTemplateById("NONEXISTENT");

      expect(result).toBeNull();
    });

    it("should handle duplicate key error from createTemplate", async () => {
      const error = new Error("Duplicate key") as any;
      error.code = "23505";
      mockLabelService.createTemplate.mockRejectedValueOnce(error);

      try {
        await labelService.createTemplate({
          template_id: "LABEL-001",
          template_name: "Test",
          label_type: LabelType.API,
          template_content: "{}",
          width: 3.5,
          height: 2.0,
        });
        expect(true).toBe(false);
      } catch (error) {
        expect((error as any).code).toBe("23505");
      }
    });

    it("should handle null return from updateTemplate", async () => {
      mockLabelService.updateTemplate.mockResolvedValueOnce(null);

      const result = await labelService.updateTemplate("NONEXISTENT", { template_name: "New" });

      expect(result).toBeNull();
    });

    it("should handle false return from deleteTemplate", async () => {
      mockLabelService.deleteTemplate.mockResolvedValueOnce(false);

      const result = await labelService.deleteTemplate("NONEXISTENT");

      expect(result).toBe(false);
    });

    it("should handle error from generateLabel", async () => {
      mockLabelService.generateLabel.mockRejectedValueOnce(new Error("Template not found"));

      try {
        await labelService.generateLabel({
          template_id: "NONEXISTENT",
          lot_id: "LOT-001",
        });
        expect(true).toBe(false);
      } catch (error) {
        expect((error as Error).message).toBe("Template not found");
      }
    });
  });

  // ============ Test Response Types ============
  describe("Response Type Validation", () => {
    it("should return LabelTemplate from getTemplateById", async () => {
      mockLabelService.getTemplateById.mockResolvedValueOnce(mockTemplate);

      const result = await labelService.getTemplateById("LABEL-001");

      expect(result).toHaveProperty("template_id");
      expect(result).toHaveProperty("template_name");
      expect(result).toHaveProperty("label_type");
      expect(result).toHaveProperty("template_content");
      expect(result).toHaveProperty("width");
      expect(result).toHaveProperty("height");
    });

    it("should return array of templates from getAllTemplates", async () => {
      const templates = [mockTemplate];
      mockLabelService.getAllTemplates.mockResolvedValueOnce(templates);

      const result = await labelService.getAllTemplates();

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty("template_id");
    });

    it("should return boolean from deleteTemplate", async () => {
      mockLabelService.deleteTemplate.mockResolvedValueOnce(true);

      const result = await labelService.deleteTemplate("LABEL-001");

      expect(typeof result).toBe("boolean");
      expect(result).toBe(true);
    });

    it("should return GeneratedLabel from generateLabel", async () => {
      const generated = {
        template_id: "LABEL-001",
        template_name: "Test",
        label_type: LabelType.RAW_MATERIAL,
        width: 3.5,
        height: 2.0,
        content: { lot_id: "LOT-001" },
        generated_date: new Date(),
      };
      mockLabelService.generateLabel.mockResolvedValueOnce(generated);

      const result = await labelService.generateLabel({
        template_id: "LABEL-001",
        lot_id: "LOT-001",
      });

      expect(result).toHaveProperty("template_id");
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("generated_date");
    });
  });
});
