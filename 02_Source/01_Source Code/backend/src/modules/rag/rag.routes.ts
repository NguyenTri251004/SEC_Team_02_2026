import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../security/auth";
import { requirePermission } from "../../security/rbac";
import { triggerFullInventoryReindex } from "./rag.service";

const router = Router();

router.post(
  "/reindex",
  authenticateJWT,
  requirePermission("chat", "reindex"),
  async (req: Request, res: Response) => {
    try {
      const triggeredBy = req.user?.username || "SYSTEM";
      const result = await triggerFullInventoryReindex(triggeredBy);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error("Loi trigger RAG reindex:", error);
      res.status(500).json({
        success: false,
        error: "Khong the trigger RAG full reindex",
      });
    }
  },
);

export default router;
