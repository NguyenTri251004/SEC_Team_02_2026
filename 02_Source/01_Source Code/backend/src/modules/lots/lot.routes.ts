import { Router, Request, Response } from "express";
import * as lotService from "./lot.service";
import * as transactionService from "../transactions/transaction.service";
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
      const { material_id, manufacturer_name, manufacturer_lot, supplier_name,
              received_date, expiration_date, quantity, unit_of_measure } = req.body;

      if (!material_id || !manufacturer_name || !manufacturer_lot ||
          !supplier_name || !received_date || !expiration_date || !quantity || !unit_of_measure) {
        res.status(400).json({
          success: false,
          error: "Thieu thong tin bat buoc: material_id, manufacturer_name, manufacturer_lot, supplier_name, received_date, expiration_date, quantity, unit_of_measure",
        });
        return;
      }

      const lot = await lotService.createLot(req.body);

      // Auto-log Receipt transaction
      try {
        await transactionService.createTransaction({
          transaction_type: "Receipt" as const,
          lot_id: lot.lot_id,
          quantity: lot.quantity,
          unit_of_measure: lot.unit_of_measure,
          reference_id: undefined,
          notes: `Lot received from ${lot.supplier_name}`,
          performed_by: req.user?.username ?? "SYSTEM",
        });
      } catch (e) {
        console.warn("Auto-log Receipt transaction failed:", e);
      }

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
      const oldLot = await lotService.getLotById(req.params.id);
      if (!oldLot) {
        res.status(404).json({ success: false, error: "Khong tim thay lot" });
        return;
      }

      const lot = await lotService.updateLot(req.params.id, req.body);
      if (!lot) {
        res.status(404).json({ success: false, error: "Khong tim thay lot" });
        return;
      }

      // Log Adjustment transaction if quantity changed
      const newQty = req.body.quantity;
      if (newQty !== undefined && Number(newQty) !== Number(oldLot.quantity)) {
        const delta = Number(newQty) - Number(oldLot.quantity);
        try {
          await transactionService.createTransaction({
            transaction_type: "Adjustment" as const,
            lot_id: lot.lot_id,
            quantity: delta,
            unit_of_measure: lot.unit_of_measure,
            reference_id: undefined,
            notes: req.body.notes ?? `Manual quantity adjustment: ${oldLot.quantity} -> ${newQty}`,
            performed_by: req.user?.username ?? "SYSTEM",
          });
        } catch (e) {
          console.warn("Auto-log Adjustment transaction failed:", e);
        }
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

      // Auto-log transaction based on new status
      const txnTypeMap: Partial<Record<LotStatus, string>> = {
        Accepted: "QC_Approved",
        Rejected: "QC_Rejected",
        Depleted: "Disposal",
      };
      const txnType = txnTypeMap[status as LotStatus];
      if (txnType) {
        try {
          await transactionService.createTransaction({
            transaction_type: txnType as import("../transactions/transaction.types").TransactionType,
          lot_id: lot.lot_id,
          quantity: lot.quantity,
          unit_of_measure: lot.unit_of_measure,
          reference_id: undefined,
            notes: reason ?? `Status changed to ${status}`,
            performed_by: req.user?.username ?? "SYSTEM",
          });
        } catch (e) {
          console.warn("Auto-log status transaction failed:", e);
        }
      }

      res.json({ success: true, data: lot });
    } catch (error) {
      console.error("Loi cap nhat trang thai lot:", error);
      const message = error instanceof Error ? error.message : "Khong the cap nhat trang thai";
      res.status(400).json({ success: false, error: message });
    }
  }
);

// DELETE /api/lots/:id — Xoa lot
router.delete(
  "/:id",
  authenticateJWT,
  requirePermission("lots", "delete"),
  async (req: Request, res: Response) => {
    try {
      const deleted = await lotService.deleteLot(req.params.id);
      if (!deleted) {
        res.status(404).json({ success: false, error: "Khong tim thay lot" });
        return;
      }
      res.json({ success: true, message: "Da xoa lot thanh cong" });
    } catch (error) {
      console.error("Loi xoa lot:", error);
      res.status(500).json({ success: false, error: "Khong the xoa lot" });
    }
  }
);

export default router;
