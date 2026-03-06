import { Router, Request, Response } from "express";
import * as lotService from "./lot.service";
import { authenticateJWT } from "../../security/auth";
import { requirePermission } from "../../security/rbac";
import { LotStatus } from "./lot.types";

const router = Router();

// GET /api/lots — Danh sach lot (co filter)
router.get(
  "/",
  authenticateJWT,
  requirePermission("lots", "read"),
  async (req: Request, res: Response) => {
    try {
      const filters = {
        status: req.query.status as LotStatus | undefined,
        material_id: req.query.material_id as string | undefined,
        expiring_before: req.query.expiring_before as string | undefined,
        is_sample: req.query.is_sample !== undefined
          ? req.query.is_sample === "true"
          : undefined,
      };
      const lots = await lotService.getAllLots(filters);
      res.json({ success: true, data: lots, total: lots.length });
    } catch (error) {
      console.error("Loi lay danh sach lot:", error);
      res.status(500).json({ success: false, error: "Khong the lay danh sach lot" });
    }
  }
);

// GET /api/lots/expiring — Lot sap het han
router.get(
  "/expiring",
  authenticateJWT,
  requirePermission("lots", "read"),
  async (req: Request, res: Response) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const lots = await lotService.getExpiringLots(days);
      res.json({ success: true, data: lots, total: lots.length });
    } catch (error) {
      console.error("Loi lay lot sap het han:", error);
      res.status(500).json({ success: false, error: "Khong the lay lot sap het han" });
    }
  }
);

// GET /api/lots/by-material/:materialId — Lot theo material
router.get(
  "/by-material/:materialId",
  authenticateJWT,
  requirePermission("lots", "read"),
  async (req: Request, res: Response) => {
    try {
      const lots = await lotService.getLotsByMaterial(req.params.materialId);
      res.json({ success: true, data: lots, total: lots.length });
    } catch (error) {
      console.error("Loi lay lot theo material:", error);
      res.status(500).json({ success: false, error: "Khong the lay lot theo material" });
    }
  }
);

// GET /api/lots/:id — Chi tiet lot
router.get(
  "/:id",
  authenticateJWT,
  requirePermission("lots", "read"),
  async (req: Request, res: Response) => {
    try {
      const lot = await lotService.getLotById(req.params.id);
      if (!lot) {
        res.status(404).json({ success: false, error: "Khong tim thay lot" });
        return;
      }
      res.json({ success: true, data: lot });
    } catch (error) {
      console.error("Loi lay lot:", error);
      res.status(500).json({ success: false, error: "Khong the lay thong tin lot" });
    }
  }
);

// POST /api/lots — Tao lot moi (auto Quarantine)
router.post(
  "/",
  authenticateJWT,
  requirePermission("lots", "create"),
  async (req: Request, res: Response) => {
    try {
      const { lot_id, material_id, manufacturer_name, manufacturer_lot, supplier_name,
              received_date, expiration_date, quantity, unit_of_measure } = req.body;

      if (!lot_id || !material_id || !manufacturer_name || !manufacturer_lot ||
          !supplier_name || !received_date || !expiration_date || !quantity || !unit_of_measure) {
        res.status(400).json({
          success: false,
          error: "Thieu thong tin bat buoc: lot_id, material_id, manufacturer_name, manufacturer_lot, supplier_name, received_date, expiration_date, quantity, unit_of_measure",
        });
        return;
      }

      const lot = await lotService.createLot(req.body);
      res.status(201).json({ success: true, data: lot });
    } catch (error: unknown) {
      console.error("Loi tao lot:", error);
      if (typeof error === "object" && error !== null && "code" in error &&
          (error as { code: string }).code === "23505") {
        res.status(409).json({ success: false, error: "lot_id da ton tai" });
        return;
      }
      if (typeof error === "object" && error !== null && "code" in error &&
          (error as { code: string }).code === "23503") {
        res.status(400).json({ success: false, error: "material_id khong ton tai" });
        return;
      }
      res.status(500).json({ success: false, error: "Khong the tao lot" });
    }
  }
);

// PUT /api/lots/:id — Cap nhat lot (khong thay doi status)
router.put(
  "/:id",
  authenticateJWT,
  requirePermission("lots", "update"),
  async (req: Request, res: Response) => {
    try {
      const lot = await lotService.updateLot(req.params.id, req.body);
      if (!lot) {
        res.status(404).json({ success: false, error: "Khong tim thay lot" });
        return;
      }
      res.json({ success: true, data: lot });
    } catch (error) {
      console.error("Loi cap nhat lot:", error);
      res.status(500).json({ success: false, error: "Khong the cap nhat lot" });
    }
  }
);

// PATCH /api/lots/:id/status — Cap nhat trang thai lot
router.patch(
  "/:id/status",
  authenticateJWT,
  requirePermission("lots", "updateStatus"),
  async (req: Request, res: Response) => {
    try {
      const { status, reason } = req.body;
      if (!status) {
        res.status(400).json({ success: false, error: "Thieu truong status" });
        return;
      }

      const lot = await lotService.updateLotStatus(req.params.id, status, reason);
      if (!lot) {
        res.status(404).json({ success: false, error: "Khong tim thay lot" });
        return;
      }
      res.json({ success: true, data: lot });
    } catch (error) {
      console.error("Loi cap nhat trang thai lot:", error);
      const message = error instanceof Error ? error.message : "Khong the cap nhat trang thai";
      res.status(400).json({ success: false, error: message });
    }
  }
);

export default router;
