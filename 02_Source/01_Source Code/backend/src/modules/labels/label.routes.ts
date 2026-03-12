import crypto from "crypto";
import { Router, Request, Response } from "express";
import * as labelService from "./label.service";
import { authenticateJWT } from "../../security/auth";
import { requirePermission } from "../../security/rbac";

const router = Router();

// ============================================================
// Template Management Routes (must come before /:id)
// ============================================================

// GET /api/labels/templates/type/:labelType — Get templates by label type
router.get(
  "/templates/type/:labelType",
  authenticateJWT,
  requirePermission("labels", "read"),
  async (req: Request, res: Response) => {
    try {
      const templates = await labelService.getTemplatesByLabelType(req.params.labelType as any);
      res.json({ success: true, data: templates, total: templates.length });
    } catch (error) {
      console.error("Error getting templates by type:", error);
      res.status(500).json({ success: false, error: "Cannot retrieve templates" });
    }
  }
);

// GET /api/labels/templates/:id — Get template detail
router.get(
  "/templates/:id",
  authenticateJWT,
  requirePermission("labels", "read"),
  async (req: Request, res: Response) => {
    try {
      const template = await labelService.getTemplateById(req.params.id);
      if (!template) {
        res.status(404).json({ success: false, error: "Template not found" });
        return;
      }
      res.json({ success: true, data: template });
    } catch (error) {
      console.error("Error getting template:", error);
      res.status(500).json({ success: false, error: "Cannot retrieve template" });
    }
  }
);

// GET /api/labels/templates — Get all label templates
router.get(
  "/templates",
  authenticateJWT,
  requirePermission("labels", "read"),
  async (_req: Request, res: Response) => {
    try {
      const templates = await labelService.getAllTemplates();
      res.json({ success: true, data: templates, total: templates.length });
    } catch (error) {
      console.error("Error getting templates:", error);
      res.status(500).json({ success: false, error: "Cannot retrieve templates" });
    }
  }
);

// POST /api/labels/templates — Create new template
router.post(
  "/templates",
  authenticateJWT,
  requirePermission("labels", "create"),
  async (req: Request, res: Response) => {
    try {
      const { template_name, label_type, template_content, width, height } = req.body;

      if (!template_name || !label_type || !template_content) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: template_name, label_type, template_content",
        });
        return;
      }

      // Generate template ID
      const template_id = `TPL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const template = await labelService.createTemplate({
        template_id,
        template_name,
        label_type,
        template_content,
        width: width || 4.0,
        height: height || 2.0,
      });
      
      res.status(201).json({ success: true, data: template });
    } catch (error: unknown) {
      console.error("Error creating template:", error);
      const errorMessage = error instanceof Error ? error.message : "Cannot create template";
      res.status(400).json({ success: false, error: errorMessage });
    }
  }
);

// PUT /api/labels/templates/:id — Update template
router.put(
  "/templates/:id",
  authenticateJWT,
  requirePermission("labels", "update"),
  async (req: Request, res: Response) => {
    try {
      const { template_name, label_type, template_content, width, height } = req.body;

      const template = await labelService.updateTemplate(req.params.id, {
        template_name,
        label_type,
        template_content,
        width,
        height,
      });

      if (!template) {
        res.status(404).json({ success: false, error: "Template not found" });
        return;
      }

      res.json({ success: true, data: template });
    } catch (error: unknown) {
      console.error("Error updating template:", error);
      const errorMessage = error instanceof Error ? error.message : "Cannot update template";
      res.status(400).json({ success: false, error: errorMessage });
    }
  }
);

// DELETE /api/labels/templates/:id — Delete template
router.delete(
  "/templates/:id",
  authenticateJWT,
  requirePermission("labels", "delete"),
  async (req: Request, res: Response) => {
    try {
      const deleted = await labelService.deleteTemplate(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, error: "Template not found" });
        return;
      }
      res.json({ success: true, message: "Template deleted successfully" });
    } catch (error) {
      console.error("Error deleting template:", error);
      res.status(500).json({ success: false, error: "Cannot delete template" });
    }
  }
);

// ============================================================
// Label Generation Routes
// ============================================================

// POST /api/labels/generate-from-template — Generate label from template
router.post(
  "/generate-from-template",
  authenticateJWT,
  requirePermission("labels", "generate"),
  async (req: Request, res: Response) => {
    try {
      const { template_id, entity_type, entity_id, code_type } = req.body;

      if (!template_id || !entity_type || !entity_id) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: template_id, entity_type, entity_id",
        });
        return;
      }

      if (!['material', 'lot', 'batch'].includes(entity_type)) {
        res.status(400).json({
          success: false,
          error: "Invalid entity_type. Must be 'material', 'lot', or 'batch'",
        });
        return;
      }

      if (!code_type || !['barcode', 'qrcode'].includes(code_type)) {
        res.status(400).json({
          success: false,
          error: "Invalid or missing code_type. Must be 'barcode' or 'qrcode'",
        });
        return;
      }

      const userId = (req as any).user?.user_id || 'system';
      const label = await labelService.generateLabelFromTemplate({
        template_id,
        entity_type,
        entity_id,
        code_type,
      }, userId);
      
      res.json({ success: true, data: label });
    } catch (error: unknown) {
      console.error("Error generating label from template:", error);
      const errorMessage = error instanceof Error ? error.message : "Cannot generate label from template";
      res.status(400).json({ success: false, error: errorMessage });
    }
  }
);

// POST /api/labels/generate — Generate new label for a material
router.post(
  "/generate",
  authenticateJWT,
  requirePermission("labels", "generate"),
  async (req: Request, res: Response) => {
    try {
      const { material_id, code_type } = req.body;

      if (!material_id) {
        res.status(400).json({
          success: false,
          error: "Missing required field: material_id",
        });
        return;
      }

      if (!code_type || !['barcode', 'qrcode'].includes(code_type)) {
        res.status(400).json({
          success: false,
          error: "Invalid or missing code_type. Must be 'barcode' or 'qrcode'",
        });
        return;
      }

      const userId = (req as any).user?.user_id || 'system';
      const label = await labelService.generateLabel({
        material_id,
        code_type,
      }, userId);
      res.json({ success: true, data: label });
    } catch (error: unknown) {
      console.error("Error generating label:", error);
      const errorMessage = error instanceof Error ? error.message : "Cannot generate label";
      res.status(400).json({ success: false, error: errorMessage });
    }
  }
);

// ============================================================
// Generated Labels Routes
// ============================================================

// GET /api/labels — Get all generated labels
router.get(
  "/",
  authenticateJWT,
  requirePermission("labels", "read"),
  async (_req: Request, res: Response) => {
    try {
      const labels = await labelService.getAllGeneratedLabels();
      res.json({ success: true, data: labels, total: labels.length });
    } catch (error) {
      console.error("Error getting generated labels:", error);
      res.status(500).json({ success: false, error: "Cannot retrieve generated labels" });
    }
  }
);

// GET /api/labels/:id — Get generated label detail
router.get(
  "/:id",
  authenticateJWT,
  requirePermission("labels", "read"),
  async (req: Request, res: Response) => {
    try {
      const label = await labelService.getGeneratedLabelById(req.params.id);
      if (!label) {
        res.status(404).json({ success: false, error: "Label not found" });
        return;
      }
      res.json({ success: true, data: label });
    } catch (error) {
      console.error("Error getting label:", error);
      res.status(500).json({ success: false, error: "Cannot retrieve label" });
    }
  }
);

// DELETE /api/labels/:id — Delete generated label
router.delete(
  "/:id",
  authenticateJWT,
  requirePermission("labels", "delete"),
  async (req: Request, res: Response) => {
    try {
      const deleted = await labelService.deleteGeneratedLabel(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, error: "Label not found" });
        return;
      }
      res.json({ success: true, message: "Label deleted successfully" });
    } catch (error) {
      console.error("Error deleting label:", error);
      res.status(500).json({ success: false, error: "Cannot delete label" });
    }
  }
);

export default router;
