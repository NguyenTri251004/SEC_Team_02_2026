import crypto from "crypto";
import { Router, Request, Response } from "express";
import * as labelService from "./label.service";
import { authenticateJWT } from "../../security/auth";
import { requirePermission } from "../../security/rbac";

const router = Router();

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
      console.error("Error getting label templates:", error);
      res.status(500).json({ success: false, error: "Cannot retrieve label templates" });
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

// POST /api/labels/templates — Create new template
router.post(
  "/templates",
  authenticateJWT,
  requirePermission("labels", "create"),
  async (req: Request, res: Response) => {
    try {
      const { template_name, label_type, template_content, width, height } = req.body;
      // Auto-generate template_id if not provided
      const template_id = req.body.template_id || crypto.randomUUID();

      if (!template_name || !label_type || !template_content || width === undefined || height === undefined) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: template_name, label_type, template_content, width, height",
        });
        return;
      }

      const template = await labelService.createTemplate({ ...req.body, template_id });
      res.status(201).json({ success: true, data: template });
    } catch (error: unknown) {
      console.error("Error creating template:", error);
      // Duplicate key error
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "23505"
      ) {
        res.status(409).json({ success: false, error: "Template ID already exists" });
        return;
      }
      res.status(500).json({ success: false, error: "Cannot create template" });
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
      const template = await labelService.updateTemplate(req.params.id, req.body);
      if (!template) {
        res.status(404).json({ success: false, error: "Template not found" });
        return;
      }
      res.json({ success: true, data: template });
    } catch (error) {
      console.error("Error updating template:", error);
      res.status(500).json({ success: false, error: "Cannot update template" });
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

// POST /api/labels/generate — Generate label data for a lot or batch
router.post(
  "/generate",
  authenticateJWT,
  requirePermission("labels", "generate"),
  async (req: Request, res: Response) => {
    try {
      const { template_id, lot_id, batch_id } = req.body;

      if (!template_id || (!lot_id && !batch_id)) {
        res.status(400).json({
          success: false,
          error: "Missing required fields: template_id and (lot_id or batch_id)",
        });
        return;
      }

      const label = await labelService.generateLabel({
        template_id,
        lot_id,
        batch_id,
      });
      res.json({ success: true, data: label });
    } catch (error: unknown) {
      console.error("Error generating label:", error);
      const errorMessage = error instanceof Error ? error.message : "Cannot generate label";
      res.status(400).json({ success: false, error: errorMessage });
    }
  }
);

export default router;
