import { Router, Request, Response } from "express";
import * as transactionService from "./transaction.service";
import { authenticateJWT } from "../../security/auth";
import { requirePermission } from "../../security/rbac";

const router = Router();

// GET /api/transactions — Lấy tất cả giao dịch
router.get(
  "/",
  authenticateJWT,
  requirePermission("transactions", "read"),
  async (_req: Request, res: Response) => {
    try {
      const transactions = await transactionService.getAllTransactions();
      res.json({ success: true, data: transactions, total: transactions.length });
    } catch (error) {
      console.error("Lỗi lấy danh sách giao dịch:", error);
      res.status(500).json({ success: false, error: "Không thể lấy danh sách giao dịch" });
    }
  }
);

// GET /api/transactions/:id — Lấy chi tiết giao dịch
router.get(
  "/:id",
  authenticateJWT,
  requirePermission("transactions", "read"),
  async (req: Request, res: Response) => {
    try {
      const transaction = await transactionService.getTransactionById(req.params.id);
      if (!transaction) {
        res.status(404).json({ success: false, error: "Không tìm thấy giao dịch" });
        return;
      }
      res.json({ success: true, data: transaction });
    } catch (error) {
      console.error("Lỗi lấy giao dịch:", error);
      res.status(500).json({ success: false, error: "Không thể lấy thông tin giao dịch" });
    }
  }
);

// GET /api/transactions/material/:materialId — Lấy giao dịch theo vật tư
router.get(
  "/material/:materialId",
  authenticateJWT,
  requirePermission("transactions", "read"),
  async (req: Request, res: Response) => {
    try {
      const transactions = await transactionService.getTransactionsByMaterial(
        req.params.materialId
      );
      res.json({ success: true, data: transactions, total: transactions.length });
    } catch (error) {
      console.error("Lỗi lấy giao dịch theo vật tư:", error);
      res.status(500).json({ success: false, error: "Không thể lấy giao dịch theo vật tư" });
    }
  }
);

// POST /api/transactions — Tạo giao dịch nhập/xuất kho
router.post(
  "/",
  authenticateJWT,
  requirePermission("transactions", "create"),
  async (req: Request, res: Response) => {
    try {
      const { transaction_id, transaction_type, material_id, quantity } = req.body;

      if (!transaction_id || !transaction_type || !material_id || quantity == null) {
        res.status(400).json({
          success: false,
          error: "Thiếu thông tin bắt buộc: transaction_id, transaction_type (IN/OUT), material_id, quantity",
        });
        return;
      }

      if (!["IN", "OUT"].includes(transaction_type)) {
        res.status(400).json({
          success: false,
          error: "transaction_type chỉ được là 'IN' (nhập kho) hoặc 'OUT' (xuất kho)",
        });
        return;
      }

      if (quantity <= 0) {
        res.status(400).json({ success: false, error: "quantity phải lớn hơn 0" });
        return;
      }

      const transaction = await transactionService.createTransaction(req.body);
      res.status(201).json({ success: true, data: transaction });
    } catch (error: unknown) {
      console.error("Lỗi tạo giao dịch:", error);
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "23503"
      ) {
        res.status(400).json({ success: false, error: "material_id không tồn tại" });
        return;
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "23505"
      ) {
        res.status(409).json({ success: false, error: "transaction_id đã tồn tại" });
        return;
      }
      res.status(500).json({ success: false, error: "Không thể tạo giao dịch" });
    }
  }
);

export default router;
