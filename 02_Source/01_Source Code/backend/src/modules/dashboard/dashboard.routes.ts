import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../security/auth";
import * as dashboardService from "./dashboard.service";

const router = Router();

// GET /api/dashboard/inventory-summary
router.get(
  "/inventory-summary",
  authenticateJWT,
  async (_req: Request, res: Response) => {
    try {
      const data = await dashboardService.getInventorySummary();
      res.json({ success: true, data });
    } catch (error) {
      console.error("Lỗi inventory-summary:", error);
      res.status(500).json({ success: false, error: "Không thể lấy inventory summary" });
    }
  }
);

// GET /api/dashboard/transaction-summary
router.get(
  "/transaction-summary",
  authenticateJWT,
  async (_req: Request, res: Response) => {
    try {
      const data = await dashboardService.getTransactionSummary();
      res.json({ success: true, data });
    } catch (error) {
      console.error("Lỗi transaction-summary:", error);
      res.status(500).json({ success: false, error: "Không thể lấy transaction summary" });
    }
  }
);

export default router;

