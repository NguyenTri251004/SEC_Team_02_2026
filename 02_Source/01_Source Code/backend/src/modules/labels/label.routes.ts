import crypto from "crypto";
import { Router, Request, Response } from "express";
import * as labelService from "./label.service";
import { authenticateJWT } from "../../security/auth";
import { requirePermission } from "../../security/rbac";

const router = Router();

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
