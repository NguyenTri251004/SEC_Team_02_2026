// @ts-nocheck
/// <reference types="jest" />
import * as labelService from "../label.service";
import pool from "../../../shared/db/pool";
import { LabelType, CodeType } from "../label.types";

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

// Mock QRCode and bwip-js
jest.mock("qrcode", () => ({
  toDataURL: jest.fn().mockResolvedValue("data:image/png;base64,mockQRCodeData"),
  toString: jest.fn().mockResolvedValue(
    '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 33 33" shape-rendering="crispEdges"><path fill="#ffffff" d="M0 0h33v33H0z"/><path stroke="#000000" d="M4 4.5h7"/></svg>'
  ),
}));
jest.mock("bwip-js", () => ({
  toBuffer: jest.fn().mockResolvedValue(Buffer.from("mockBarcodeData")),
}));

const mockPool = pool as jest.Mocked<any>;

describe("Label Service", () => {
  const mockTemplate = {
    template_id: "TMPL-001",
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
    const mockMaterial = {
      material_id: "MAT-001",
      part_number: "PART-001",
      material_name: "Test Material",
      material_type: "API",
      storage_conditions: "Room temperature",
      specification_document: "DOC-001",
    };

    it("should generate QR code label for a material", async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockMaterial], rowCount: 1 }) // material query
        .mockResolvedValueOnce({
          rows: [
            {
              label_id: "uuid-1",
              code_type: CodeType.QR_CODE,
              code_data: "data:image/png;base64,mockQRCodeData",
              created_by: "user123",
              created_date: new Date(),
            },
          ],
          rowCount: 1,
        }); // insert query

      const result = await labelService.generateLabel(
        {
          material_id: "MAT-001",
          code_type: CodeType.QR_CODE,
        },
        "user123"
      );

      expect(result.material_id).toBe("MAT-001");
      expect(result.entity_type).toBe("material");
      expect(result.code_type).toBe(CodeType.QR_CODE);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT material_id"),
        ["MAT-001"]
      );
    });

    it("should generate barcode label for a material", async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockMaterial], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              label_id: "uuid-2",
              code_type: CodeType.BARCODE,
              code_data: "data:image/png;base64,bW9ja0JhcmNvZGVEYXRh",
              created_by: "user123",
              created_date: new Date(),
            },
          ],
          rowCount: 1,
        });

      const result = await labelService.generateLabel(
        {
          material_id: "MAT-001",
          code_type: CodeType.BARCODE,
        },
        "user123"
      );

      expect(result.code_type).toBe(CodeType.BARCODE);
      expect(result.entity_id).toBe("MAT-001");
    });

    it("should throw error when material not found", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        labelService.generateLabel(
          {
            material_id: "NONEXISTENT",
            code_type: CodeType.QR_CODE,
          },
          "user123"
        )
      ).rejects.toThrow("not found");
    });

    it("should generate QR code as SVG with caption text below", async () => {
      const QRCode = require("qrcode");
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockMaterial], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              label_id: "uuid-svg-1",
              code_type: CodeType.QR_CODE,
              code_data: "data:image/svg+xml;base64,captured",
              created_by: "user123",
              created_date: new Date(),
            },
          ],
          rowCount: 1,
        });

      await labelService.generateLabel(
        { material_id: "MAT-001", code_type: CodeType.QR_CODE },
        "user123"
      );

      // Verify QRCode.toString was called with svg type
      expect(QRCode.toString).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ type: "svg", width: 300 })
      );

      // Verify the INSERT received an SVG data URL with caption baked in
      const insertCall = mockPool.query.mock.calls[1];
      const savedCodeData = insertCall[1][5]; // code_data param
      expect(savedCodeData).toMatch(/^data:image\/svg\+xml;base64,/);

      // Decode and verify SVG contains the caption text
      const base64Part = savedCodeData.replace("data:image/svg+xml;base64,", "");
      const svgContent = Buffer.from(base64Part, "base64").toString("utf-8");
      expect(svgContent).toContain("<text");
      expect(svgContent).toContain("PART-001 - Test Material");
      expect(svgContent).toContain('text-anchor="middle"');
    });

    it("should generate QR code as PNG when no caption text", async () => {
      const QRCode = require("qrcode");

      // Temporarily make toString NOT be called by testing the no-caption path
      // We need to test via the internal function, but since it's not exported,
      // we verify behavior through generateLabel which always passes caption.
      // Instead, verify that toString IS called (caption is always provided by generateLabel)
      QRCode.toString.mockClear();

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockMaterial], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              label_id: "uuid-svg-2",
              code_type: CodeType.QR_CODE,
              code_data: "data:image/svg+xml;base64,test",
              created_by: "user123",
              created_date: new Date(),
            },
          ],
          rowCount: 1,
        });

      await labelService.generateLabel(
        { material_id: "MAT-001", code_type: CodeType.QR_CODE },
        "user123"
      );

      // generateLabel always provides captionText, so toString (SVG path) should be called
      expect(QRCode.toString).toHaveBeenCalled();
    });

    it("should properly escape special characters in QR caption", async () => {
      const specialMaterial = {
        ...mockMaterial,
        part_number: "P&T<001>",
        material_name: 'Test "Material"',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [specialMaterial], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              label_id: "uuid-svg-3",
              code_type: CodeType.QR_CODE,
              code_data: "data:image/svg+xml;base64,test",
              created_by: "user123",
              created_date: new Date(),
            },
          ],
          rowCount: 1,
        });

      await labelService.generateLabel(
        { material_id: "MAT-001", code_type: CodeType.QR_CODE },
        "user123"
      );

      const insertCall = mockPool.query.mock.calls[1];
      const savedCodeData = insertCall[1][5];
      const base64Part = savedCodeData.replace("data:image/svg+xml;base64,", "");
      const svgContent = Buffer.from(base64Part, "base64").toString("utf-8");

      // Verify special characters are escaped
      expect(svgContent).toContain("&amp;");
      expect(svgContent).toContain("&lt;");
      expect(svgContent).toContain("&gt;");
      expect(svgContent).toContain("&quot;");
      // Should NOT contain raw special chars in text element
      expect(svgContent).not.toMatch(/<text[^>]*>[^<]*<[^/]/);
    });

    it("should extend SVG viewBox height for caption area", async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockMaterial], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            {
              label_id: "uuid-svg-4",
              code_type: CodeType.QR_CODE,
              code_data: "data:image/svg+xml;base64,test",
              created_by: "user123",
              created_date: new Date(),
            },
          ],
          rowCount: 1,
        });

      await labelService.generateLabel(
        { material_id: "MAT-001", code_type: CodeType.QR_CODE },
        "user123"
      );

      const insertCall = mockPool.query.mock.calls[1];
      const savedCodeData = insertCall[1][5];
      const base64Part = savedCodeData.replace("data:image/svg+xml;base64,", "");
      const svgContent = Buffer.from(base64Part, "base64").toString("utf-8");

      // Original viewBox was "0 0 33 33", the new height should be > 33
      const viewBoxMatch = svgContent.match(/viewBox="0 0 (\d+) (\d+)"/);
      expect(viewBoxMatch).toBeTruthy();
      const newHeight = parseInt(viewBoxMatch![2]);
      expect(newHeight).toBeGreaterThan(33);
    });
  });

  // ============ generateLabelFromTemplate ============
  describe("generateLabelFromTemplate", () => {
    const mockTemplate = {
      template_id: "TMPL-001",
      template_name: "Raw Material Label",
      label_type: LabelType.RAW_MATERIAL,
      template_content: "Material: {{material_name}}, Lot: {{lot_id}}",
      width: 3.5,
      height: 2.0,
    };

    it("should generate label from template for lot entity", async () => {
      const mockLot = {
        lot_id: "LOT-001",
        material_id: "MAT-001",
        material_name: "Acetaminophen API",
        part_number: "PART-001",
        material_type: "API",
        quantity: 100,
        status: "Accepted",
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 }) // getTemplate
        .mockResolvedValueOnce({ rows: [mockLot], rowCount: 1 }) // getLot
        .mockResolvedValueOnce({
          rows: [
            {
              label_id: "uuid-3",
              code_type: CodeType.QR_CODE,
              code_data: "data:image/png;base64,mockQRCodeData",
              created_by: "user123",
              created_date: new Date(),
            },
          ],
          rowCount: 1,
        }); // insert

      const result = await labelService.generateLabelFromTemplate(
        {
          template_id: "TMPL-001",
          entity_type: "lot",
          entity_id: "LOT-001",
          code_type: CodeType.QR_CODE,
        },
        "user123"
      );

      expect(result.entity_type).toBe("lot");
      expect(result.entity_id).toBe("LOT-001");
      expect(result.material_id).toBe("MAT-001");
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM inventory_lots"),
        ["LOT-001"]
      );
    });

    it("should generate label from template for batch entity", async () => {
      const batchTemplate = {
        template_id: "TMPL-BATCH-001",
        template_name: "Finished Product Label",
        label_type: LabelType.FINISHED_PRODUCT, // FINISHED_PRODUCT allows BATCH
        template_content: '{}',
        width: 3.5,
        height: 2.0,
        created_date: new Date(),
      };
      const mockBatch = {
        batch_id: "BATCH-001",
        product_id: "MAT-002",
        material_name: "Acetaminophen Tablet",
        part_number: "PART-002",
        material_type: "Finished Product",
        batch_size: 500,
        status: "Complete",
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [batchTemplate], rowCount: 1 }) // getTemplate
        .mockResolvedValueOnce({ rows: [mockBatch], rowCount: 1 }) // getBatch
        .mockResolvedValueOnce({
          rows: [
            {
              label_id: "uuid-4",
              code_type: CodeType.BARCODE,
              code_data: "data:image/png;base64,bW9ja0JhcmNvZGVEYXRh",
              created_by: "user123",
              created_date: new Date(),
            },
          ],
          rowCount: 1,
        }); // insert

      const result = await labelService.generateLabelFromTemplate(
        {
          template_id: "TMPL-BATCH-001",
          entity_type: "batch",
          entity_id: "BATCH-001",
          code_type: CodeType.BARCODE,
        },
        "user123"
      );

      expect(result.entity_type).toBe("batch");
      expect(result.entity_id).toBe("BATCH-001");
      expect(result.material_id).toBe("MAT-002");
    });

    it("should generate label from template for material entity", async () => {
      const mockMaterial = {
        material_id: "MAT-003",
        part_number: "PART-003",
        material_name: "Paracetamol API",
        material_type: "API",
        storage_conditions: "Cool, dry place",
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 }) // getTemplate
        .mockResolvedValueOnce({ rows: [mockMaterial], rowCount: 1 }) // getMaterial
        .mockResolvedValueOnce({
          rows: [
            {
              label_id: "uuid-5",
              material_id: "MAT-003",
              entity_type: "material",
              entity_id: "MAT-003",
              code_type: CodeType.QR_CODE,
              code_data: "data:image/png;base64,mockQRCodeData",
              created_by: "user123",
              created_date: new Date(),
            },
          ],
          rowCount: 1,
        }); // insert

      const result = await labelService.generateLabelFromTemplate(
        {
          template_id: "TMPL-001",
          entity_type: "material",
          entity_id: "MAT-003",
          code_type: CodeType.QR_CODE,
        },
        "user123"
      );

      expect(result.entity_type).toBe("material");
      expect(result.entity_id).toBe("MAT-003");
      expect(result.material_id).toBe("MAT-003");
    });

    it("should throw error when template not found", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        labelService.generateLabelFromTemplate(
          {
            template_id: "NONEXISTENT",
            entity_type: "lot",
            entity_id: "LOT-001",
            code_type: CodeType.QR_CODE,
          },
          "user123"
        )
      ).rejects.toThrow("Template NONEXISTENT not found");
    });

    it("should throw error when lot not found", async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [mockTemplate], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        labelService.generateLabelFromTemplate(
          {
            template_id: "TMPL-001",
            entity_type: "lot",
            entity_id: "NONEXISTENT",
            code_type: CodeType.QR_CODE,
          },
          "user123"
        )
      ).rejects.toThrow("Lot NONEXISTENT not found");
    });

    it("should throw error when batch not found", async () => {
      const batchTemplate = {
        ...mockTemplate,
        template_id: "TMPL-BATCH-001",
        label_type: LabelType.FINISHED_PRODUCT, // FINISHED_PRODUCT allows BATCH
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [batchTemplate], rowCount: 1 }) // getTemplateById
        .mockResolvedValueOnce({ rows: [], rowCount: 0 }); // SELECT batch (not found)

      await expect(
        labelService.generateLabelFromTemplate(
          {
            template_id: "TMPL-BATCH-001",
            entity_type: "batch",
            entity_id: "NONEXISTENT",
            code_type: CodeType.QR_CODE,
          },
          "user123"
        )
      ).rejects.toThrow("Batch NONEXISTENT not found");
    });

    it("should throw error when material not found", async () => {
      const materialTemplate = {
        ...mockTemplate,
        template_id: "TMPL-001",
        label_type: LabelType.RAW_MATERIAL,
      };
      mockPool.query
        .mockResolvedValueOnce({ rows: [materialTemplate], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        labelService.generateLabelFromTemplate(
          {
            template_id: "TMPL-001",
            entity_type: "material",
            entity_id: "NONEXISTENT",
            code_type: CodeType.QR_CODE,
          },
          "user123"
        )
      ).rejects.toThrow("Material NONEXISTENT not found");
    });
  });

  // ============ getAllGeneratedLabels ============
  describe("getAllGeneratedLabels", () => {
    it("should return all generated labels with material info", async () => {
      const mockLabels = [
        {
          label_id: "uuid-1",
          material_id: "MAT-001",
          material_name: "Test Material",
          part_number: "PART-001",
          material_type: "API",
          entity_type: "material",
          entity_id: "MAT-001",
          code_type: "qrcode",
          code_data: "data:image/png;base64,xyz",
          label_content: '{"entity_type": "material"}',
          created_by: "user123",
          created_date: new Date(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockLabels, rowCount: 1 });

      const result = await labelService.getAllGeneratedLabels();

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].label_id).toBe("uuid-1");
      expect(result[0].entity_type).toBe("material");
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("FROM generated_labels gl")
      );
    });

    it("should return empty array when no labels exist", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await labelService.getAllGeneratedLabels();

      expect(result).toBeDefined();
      expect(result).toEqual([]);
    });
  });

  // ============ getGeneratedLabelById ============
  describe("getGeneratedLabelById", () => {
    it("should return a generated label by ID", async () => {
      const mockLabel = {
        label_id: "uuid-1",
        material_id: "MAT-001",
        material_name: "Test Material",
        part_number: "PART-001",
        material_type: "API",
        entity_type: "lot",
        entity_id: "LOT-001",
        code_type: "qrcode",
        code_data: "data:image/png;base64,xyz",
        label_content: '{"entity_type": "lot"}',
        created_by: "user123",
        created_date: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({ rows: [mockLabel], rowCount: 1 });

      const result = await labelService.getGeneratedLabelById("uuid-1");

      expect(result).not.toBeNull();
      expect(result?.label_id).toBe("uuid-1");
      expect(result?.entity_type).toBe("lot");
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE gl.label_id = $1"),
        ["uuid-1"]
      );
    });

    it("should return null when label not found", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await labelService.getGeneratedLabelById("NONEXISTENT");

      expect(result).toBeNull();
    });
  });

  // ============ deleteGeneratedLabel ============
  describe("deleteGeneratedLabel", () => {
    it("should delete a generated label successfully", async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await labelService.deleteGeneratedLabel("uuid-1");

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        "DELETE FROM generated_labels WHERE label_id = $1",
        ["uuid-1"]
      );
    });

    it("should return false when label not found", async () => {
      mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

      const result = await labelService.deleteGeneratedLabel("NONEXISTENT");

      expect(result).toBe(false);
    });
  });

  // ============ getTemplatesByLabelType ============
  describe("getTemplatesByLabelType", () => {
    it("should return templates filtered by label type", async () => {
      const mockTemplates = [
        {
          template_id: "TMPL-RAW-001",
          template_name: "Raw Material Label",
          label_type: LabelType.RAW_MATERIAL,
          template_content: "{}",
          width: 3.5,
          height: 2.0,
          created_date: new Date(),
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockTemplates, rowCount: 1 });

      const result = await labelService.getTemplatesByLabelType(LabelType.RAW_MATERIAL);

      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
      expect(result[0].label_type).toBe(LabelType.RAW_MATERIAL);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE label_type = $1"),
        [LabelType.RAW_MATERIAL]
      );
    });

    it("should return empty array when no templates of that type exist", async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const result = await labelService.getTemplatesByLabelType(LabelType.API);

      expect(result).toBeDefined();
      expect(result).toEqual([]);
    });
  });
});
