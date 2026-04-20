import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../security/auth";
import { requirePermission } from "../../security/rbac";
import type { ChatAskRequest } from "./chat.types";
import { askChatbot } from "./chat.service";
import { logger } from "../../shared/observability/logger";

const router = Router();

router.post(
  "/ask",
  authenticateJWT,
  requirePermission("chat", "ask"),
  async (req: Request, res: Response) => {
    try {
      const body = req.body as ChatAskRequest;
      const question = body.question?.trim();

      if (!question) {
        res.status(400).json({
          success: false,
          error: "question is required",
        });
        return;
      }

      if (question.length > 1000) {
        res.status(400).json({
          success: false,
          error: "question must be <= 1000 characters",
        });
        return;
      }

      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthorized" });
        return;
      }

      const data = await askChatbot(
        {
          ...body,
          question,
        },
        {
          user_id: req.user.user_id,
          username: req.user.username,
          roles: req.user.roles,
        },
        req.header("x-correlation-id") || undefined,
      );

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      logger.error({ error }, "chat.routes.ask.failed");
      res.status(500).json({
        success: false,
        error: "Failed to generate chatbot answer",
      });
    }
  },
);

export default router;
