/**
 * Integration-style tests for Label Routes
 * Tests actual Express route handlers via supertest.
 * Mocks: auth middleware (bypass), label.service (DB layer).
 */
// @ts-nocheck
import express from "express";
import request from "supertest";
import { LabelType } from "../label.types";

// ─── Mock auth & rbac before importing routes ────────────────────────────────
jest.mock("../../../security/auth", () => ({
  authenticateJWT: (_req: any, _res: any, next: any) => {
    _req.user = { user_id: "u-1", username: "tester", roles: ["admin"] };
    next();
  },
}));
jest.mock("../../../security/rbac", () => ({
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
}));

// Mock service
jest.mock("../label.service");
import * as labelService from "../label.service";
const svc = labelService as jest.Mocked<typeof labelService>;

// Import routes AFTER mocks
import labelRouter from "../label.routes";

// ─── Setup Express app ───────────────────────────────────────────────────────
const app = express();
app.use(express.json());
app.use("/api/labels", labelRouter);

// ─── Fixtures ────────────────────────────────────────────────────────────────
const TEMPLATE = {
  template_id: "TMPL-001",
  template_name: "Raw Material Label",
  label_type: LabelType.RAW_MATERIAL,
  template_content: '{"fields":["material_name","lot_id"]}',
  width: 3.5,
  height: 2.0,
  created_date: new Date("2026-01-01"),
  modified_date: new Date("2026-01-01"),
};

beforeEach(() => jest.clearAllMocks());

// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/labels/templates", () => {
  it("200 — returns template list", async () => {
    svc.getAllTemplates.mockResolvedValueOnce([TEMPLATE]);

    const res = await request(app).get("/api/labels/templates");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it("200 — returns empty array when no templates", async () => {
    svc.getAllTemplates.mockResolvedValueOnce([]);

    const res = await request(app).get("/api/labels/templates");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("500 — on service error", async () => {
    svc.getAllTemplates.mockRejectedValueOnce(new Error("DB"));

    const res = await request(app).get("/api/labels/templates");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/labels/templates/:id", () => {
  it("200 — returns template by id", async () => {
    svc.getTemplateById.mockResolvedValueOnce(TEMPLATE);

    const res = await request(app).get("/api/labels/templates/TMPL-001");

    expect(res.status).toBe(200);
    expect(res.body.data.template_id).toBe("TMPL-001");
  });

  it("404 — template not found", async () => {
    svc.getTemplateById.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/labels/templates/NOPE");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("500 — on service error", async () => {
    svc.getTemplateById.mockRejectedValueOnce(new Error("DB"));

    const res = await request(app).get("/api/labels/templates/TMPL-001");

    expect(res.status).toBe(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/labels/templates", () => {
  const validBody = {
    template_name: "New Label",
    label_type: LabelType.API,
    template_content: "{}",
    width: 4,
    height: 2,
  };

  it("201 — creates template with auto-generated id", async () => {
    svc.createTemplate.mockResolvedValueOnce({ ...TEMPLATE, ...validBody });

    const res = await request(app)
      .post("/api/labels/templates")
      .send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // Service should have been called with a template_id (auto-generated)
    const arg = svc.createTemplate.mock.calls[0][0];
    expect(arg.template_id).toBeDefined();
  });

  it("201 — creates template with provided id", async () => {
    const body = { ...validBody, template_id: "MY-ID" };
    svc.createTemplate.mockResolvedValueOnce({ ...TEMPLATE, ...body });

    const res = await request(app)
      .post("/api/labels/templates")
      .send(body);

    expect(res.status).toBe(201);
    const arg = svc.createTemplate.mock.calls[0][0];
    expect(arg.template_id).toBe("MY-ID");
  });

  it("400 — missing template_name", async () => {
    const { template_name, ...body } = validBody;

    const res = await request(app)
      .post("/api/labels/templates")
      .send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("Missing required fields");
  });

  it("400 — missing width", async () => {
    const { width, ...body } = validBody;

    const res = await request(app)
      .post("/api/labels/templates")
      .send(body);

    expect(res.status).toBe(400);
  });

  it("409 — duplicate key", async () => {
    const err = new Error("dup") as any;
    err.code = "23505";
    svc.createTemplate.mockRejectedValueOnce(err);

    const res = await request(app)
      .post("/api/labels/templates")
      .send(validBody);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("already exists");
  });

  it("500 — generic service error", async () => {
    svc.createTemplate.mockRejectedValueOnce(new Error("unknown"));

    const res = await request(app)
      .post("/api/labels/templates")
      .send(validBody);

    expect(res.status).toBe(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("PUT /api/labels/templates/:id", () => {
  it("200 — updates template", async () => {
    const updated = { ...TEMPLATE, template_name: "Updated" };
    svc.updateTemplate.mockResolvedValueOnce(updated);

    const res = await request(app)
      .put("/api/labels/templates/TMPL-001")
      .send({ template_name: "Updated" });

    expect(res.status).toBe(200);
    expect(res.body.data.template_name).toBe("Updated");
    expect(svc.updateTemplate).toHaveBeenCalledWith(
      "TMPL-001",
      expect.objectContaining({ template_name: "Updated" }),
    );
  });

  it("404 — template not found", async () => {
    svc.updateTemplate.mockResolvedValueOnce(null);

    const res = await request(app)
      .put("/api/labels/templates/NOPE")
      .send({ template_name: "X" });

    expect(res.status).toBe(404);
  });

  it("500 — on service error", async () => {
    svc.updateTemplate.mockRejectedValueOnce(new Error("DB"));

    const res = await request(app)
      .put("/api/labels/templates/TMPL-001")
      .send({ template_name: "X" });

    expect(res.status).toBe(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("DELETE /api/labels/templates/:id", () => {
  it("200 — deletes template", async () => {
    svc.deleteTemplate.mockResolvedValueOnce(true);

    const res = await request(app).delete("/api/labels/templates/TMPL-001");

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("deleted");
  });

  it("404 — template not found", async () => {
    svc.deleteTemplate.mockResolvedValueOnce(false);

    const res = await request(app).delete("/api/labels/templates/NOPE");

    expect(res.status).toBe(404);
  });

  it("500 — on service error", async () => {
    svc.deleteTemplate.mockRejectedValueOnce(new Error("DB"));

    const res = await request(app).delete("/api/labels/templates/TMPL-001");

    expect(res.status).toBe(500);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/labels/generate", () => {
  it("200 — generates label for material with QR code", async () => {
    const generated = {
      label_id: "uuid-1",
      material_id: "MAT-001",
      material_name: "Test Material",
      part_number: "PART-001",
      material_type: "API",
      entity_type: "material" as any,
      entity_id: "MAT-001",
      code_type: "qrcode",
      code_data: "data:image/png;base64,xyz",
      label_content: JSON.parse('{"material_id": "MAT-001"}'),
      created_by: "u-1",
      created_date: new Date(),
    };
    svc.generateLabel.mockResolvedValueOnce(generated);

    const res = await request(app)
      .post("/api/labels/generate")
      .send({ material_id: "MAT-001", code_type: "qrcode" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.material_id).toBe("MAT-001");
  });

  it("200 — generates label for material with barcode", async () => {
    svc.generateLabel.mockResolvedValueOnce({
      label_id: "uuid-2",
      material_id: "MAT-002",
      material_name: "Material 2",
      part_number: "PART-002",
      material_type: "Raw Material",
      entity_type: "material" as any,
      entity_id: "MAT-002",
      code_type: "barcode",
      code_data: "data:image/png;base64,barcode",
      label_content: JSON.parse('{}'),
      created_by: "u-1",
      created_date: new Date(),
    });

    const res = await request(app)
      .post("/api/labels/generate")
      .send({ material_id: "MAT-002", code_type: "barcode" });

    expect(res.status).toBe(200);
  });

  it("400 — missing material_id", async () => {
    const res = await request(app)
      .post("/api/labels/generate")
      .send({ code_type: "qrcode" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("material_id");
  });

  it("400 — missing code_type", async () => {
    const res = await request(app)
      .post("/api/labels/generate")
      .send({ material_id: "MAT-001" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("code_type");
  });

  it("400 — invalid code_type", async () => {
    const res = await request(app)
      .post("/api/labels/generate")
      .send({ material_id: "MAT-001", code_type: "invalid" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("code_type");
  });

  it("400 — service throws descriptive error", async () => {
    svc.generateLabel.mockRejectedValueOnce(new Error("Material MAT-999 not found"));

    const res = await request(app)
      .post("/api/labels/generate")
      .send({ material_id: "MAT-999", code_type: "qrcode" });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Material MAT-999 not found");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("POST /api/labels/generate-from-template", () => {
  it("200 — generates label from template for lot entity", async () => {
    const generated = {
      label_id: "uuid-3",
      material_id: "MAT-001",
      material_name: "Acetaminophen API",
      part_number: "PART-001",
      material_type: "API",
      entity_type: "lot" as any,
      entity_id: "LOT-001",
      code_type: "qrcode",
      code_data: "data:image/png;base64,qr",
      label_content: JSON.parse('{"entity_type": "lot", "lot_id": "LOT-001"}'),
      created_by: "u-1",
      created_date: new Date(),
    };
    svc.generateLabelFromTemplate.mockResolvedValueOnce(generated);

    const res = await request(app)
      .post("/api/labels/generate-from-template")
      .send({ 
        template_id: "TMPL-001", 
        entity_type: "lot", 
        entity_id: "LOT-001",
        code_type: "qrcode" 
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.entity_type).toBe("lot");
    expect(res.body.data.entity_id).toBe("LOT-001");
  });

  it("200 — generates label from template for batch entity", async () => {
    svc.generateLabelFromTemplate.mockResolvedValueOnce({
      label_id: "uuid-4",
      material_id: "MAT-002",
      material_name: "Product",
      part_number: "PART-002",
      material_type: "Finished Product",
      entity_type: "batch" as any,
      entity_id: "BATCH-001",
      code_type: "barcode",
      code_data: "data:image/png;base64,bar",
      label_content: JSON.parse('{"entity_type": "batch"}'),
      created_by: "u-1",
      created_date: new Date(),
    });

    const res = await request(app)
      .post("/api/labels/generate-from-template")
      .send({ 
        template_id: "TMPL-002", 
        entity_type: "batch", 
        entity_id: "BATCH-001",
        code_type: "barcode" 
      });

    expect(res.status).toBe(200);
    expect(res.body.data.entity_type).toBe("batch");
  });

  it("200 — generates label from template for material entity", async () => {
    svc.generateLabelFromTemplate.mockResolvedValueOnce({
      label_id: "uuid-5",
      material_id: "MAT-003",
      material_name: "Material",
      part_number: "PART-003",
      material_type: "API",
      entity_type: "material" as any,
      entity_id: "MAT-003",
      code_type: "qrcode",
      code_data: "data:image/png;base64,qr",
      label_content: JSON.parse('{"entity_type": "material"}'),
      created_by: "u-1",
      created_date: new Date(),
    });

    const res = await request(app)
      .post("/api/labels/generate-from-template")
      .send({ 
        template_id: "TMPL-003", 
        entity_type: "material", 
        entity_id: "MAT-003",
        code_type: "qrcode" 
      });

    expect(res.status).toBe(200);
    expect(res.body.data.entity_type).toBe("material");
  });

  it("400 — missing template_id", async () => {
    const res = await request(app)
      .post("/api/labels/generate-from-template")
      .send({ entity_type: "lot", entity_id: "LOT-001", code_type: "qrcode" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("template_id");
  });

  it("400 — missing entity_type", async () => {
    const res = await request(app)
      .post("/api/labels/generate-from-template")
      .send({ template_id: "TMPL-001", entity_id: "LOT-001", code_type: "qrcode" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("entity_type");
  });

  it("400 — missing entity_id", async () => {
    const res = await request(app)
      .post("/api/labels/generate-from-template")
      .send({ template_id: "TMPL-001", entity_type: "lot", code_type: "qrcode" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("entity_id");
  });

  it("400 — invalid entity_type", async () => {
    const res = await request(app)
      .post("/api/labels/generate-from-template")
      .send({ 
        template_id: "TMPL-001", 
        entity_type: "invalid", 
        entity_id: "ID-001",
        code_type: "qrcode" 
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("entity_type");
  });

  it("400 — invalid code_type", async () => {
    const res = await request(app)
      .post("/api/labels/generate-from-template")
      .send({ 
        template_id: "TMPL-001", 
        entity_type: "lot", 
        entity_id: "LOT-001",
        code_type: "invalid" 
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("code_type");
  });

  it("400 — service throws descriptive error", async () => {
    svc.generateLabelFromTemplate.mockRejectedValueOnce(new Error("Template TMPL-999 not found"));

    const res = await request(app)
      .post("/api/labels/generate-from-template")
      .send({ 
        template_id: "TMPL-999", 
        entity_type: "lot", 
        entity_id: "LOT-001",
        code_type: "qrcode" 
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Template TMPL-999 not found");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/labels", () => {
  it("200 — returns all generated labels", async () => {
    const labels = [
      {
        label_id: "uuid-1",
        material_id: "MAT-001",
        material_name: "Material 1",
        part_number: "PART-001",
        material_type: "API",
        entity_type: "lot" as any,
        entity_id: "LOT-001",
        code_type: "qrcode",
        code_data: "data:image/png;base64,xyz",
        label_content: JSON.parse('{}'),
        created_by: "u-1",
        created_date: new Date(),
      },
    ];
    svc.getAllGeneratedLabels.mockResolvedValueOnce(labels);

    const res = await request(app).get("/api/labels");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it("200 — returns empty array when no labels", async () => {
    svc.getAllGeneratedLabels.mockResolvedValueOnce([]);

    const res = await request(app).get("/api/labels");

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  it("500 — on service error", async () => {
    svc.getAllGeneratedLabels.mockRejectedValueOnce(new Error("DB down"));

    const res = await request(app).get("/api/labels");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("GET /api/labels/:id", () => {
  it("200 — returns label by id", async () => {
    const label = {
      label_id: "uuid-1",
      material_id: "MAT-001",
      material_name: "Material",
      part_number: "PART-001",
      material_type: "API",
      entity_type: "lot" as any,
      entity_id: "LOT-001",
      code_type: "qrcode",
      code_data: "data:image/png;base64,xyz",
      label_content: JSON.parse('{}'),
      created_by: "u-1",
      created_date: new Date(),
    };
    svc.getGeneratedLabelById.mockResolvedValueOnce(label);

    const res = await request(app).get("/api/labels/uuid-1");

    expect(res.status).toBe(200);
    expect(res.body.data.label_id).toBe("uuid-1");
  });

  it("404 — label not found", async () => {
    svc.getGeneratedLabelById.mockResolvedValueOnce(null);

    const res = await request(app).get("/api/labels/NOPE");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("500 — on service error", async () => {
    svc.getGeneratedLabelById.mockRejectedValueOnce(new Error("DB"));

    const res = await request(app).get("/api/labels/uuid-1");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("DELETE /api/labels/:id", () => {
  it("200 — deletes label successfully", async () => {
    svc.deleteGeneratedLabel.mockResolvedValueOnce(true);

    const res = await request(app).delete("/api/labels/uuid-1");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("deleted");
  });

  it("404 — label not found", async () => {
    svc.deleteGeneratedLabel.mockResolvedValueOnce(false);

    const res = await request(app).delete("/api/labels/NOPE");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("500 — on service error", async () => {
    svc.deleteGeneratedLabel.mockRejectedValueOnce(new Error("DB"));

    const res = await request(app).delete("/api/labels/uuid-1");

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
