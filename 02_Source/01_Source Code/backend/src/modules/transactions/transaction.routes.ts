import crypto from "crypto";
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

// GET /api/transactions/lot/:lotId — Lấy giao dịch theo lô hàng
router.get(
  "/lot/:lotId",
  authenticateJWT,
  requirePermission("transactions", "read"),
  async (req: Request, res: Response) => {
    try {
      const transactions = await transactionService.getTransactionsByLot(
        req.params.lotId
      );
      res.json({ success: true, data: transactions, total: transactions.length });
    } catch (error) {
      console.error("Lỗi lấy giao dịch theo lô:", error);
      res.status(500).json({ success: false, error: "Không thể lấy giao dịch theo lô hàng" });
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
      const { transaction_type, lot_id, quantity } = req.body;
      // Auto-generate transaction_id if not provided
      const transaction_id = req.body.transaction_id || crypto.randomUUID();

      const validTypes = ["Receipt", "Usage", "Split", "Transfer", "Adjustment", "Disposal"];

      if (!transaction_type || !lot_id || quantity == null) {
        res.status(400).json({
          success: false,
          error: "Thiếu thông tin bắt buộc: transaction_type, lot_id, quantity",
        });
        return;
      }

      if (!validTypes.includes(transaction_type)) {
        res.status(400).json({
          success: false,
          error: `transaction_type phải là một trong: ${validTypes.join(", ")}`,
        });
        return;
      }

      if (quantity <= 0) {
        res.status(400).json({ success: false, error: "quantity phải lớn hơn 0" });
        return;
      }

      const transaction = await transactionService.createTransaction({ ...req.body, transaction_id });
      res.status(201).json({ success: true, data: transaction });
    } catch (error: unknown) {
      console.error("Lỗi tạo giao dịch:", error);
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "23503"
      ) {
        res.status(400).json({ success: false, error: "lot_id không tồn tại" });
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
