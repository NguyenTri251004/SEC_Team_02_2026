import { Router, Request, Response } from "express";
import * as qcService from "./qc.service";
import type { QCResultStatus } from "./qc.types";
import { authenticateJWT } from "../../security/auth";
import { requirePermission } from "../../security/rbac";

const router = Router();
const QC_RESULT_STATUSES: QCResultStatus[] = ["Pass", "Fail", "Pending"];

function isQCResultStatus(value: unknown): value is QCResultStatus {
  return typeof value === "string" && QC_RESULT_STATUSES.includes(value as QCResultStatus);
}

// ─── QC Tests ─────────────────────────────────────────────────────────────────

// GET /api/qc/tests — Lấy danh sách tất cả QC tests (có bộ lọc)
router.get(
  "/tests",
  authenticateJWT,
  requirePermission("qc", "read"),
  async (req: Request, res: Response) => {
    try {
      const { lot_id, test_type, result_status, performed_by, from_date, to_date } = req.query;
      const tests = await qcService.getAllTests({
        lot_id: lot_id as string | undefined,
        test_type: test_type as string | undefined,
        result_status: isQCResultStatus(result_status) ? result_status : undefined,
        performed_by: performed_by as string | undefined,
        from_date: from_date as string | undefined,
        to_date: to_date as string | undefined,
      });
      res.json({ success: true, data: tests, total: tests.length });
    } catch (error) {
      console.error("Lỗi lấy danh sách QC tests:", error);
      res.status(500).json({ success: false, error: "Không thể lấy danh sách QC tests" });
    }
  }
);

// GET /api/qc/tests/:id — Chi tiết một QC test
router.get(
  "/tests/:id",
  authenticateJWT,
  requirePermission("qc", "read"),
  async (req: Request, res: Response) => {
    try {
      const test = await qcService.getTestById(req.params.id);
      if (!test) {
        res.status(404).json({ success: false, error: "Không tìm thấy QC test" });
        return;
      }
      res.json({ success: true, data: test });
    } catch (error) {
      console.error("Lỗi lấy QC test:", error);
      res.status(500).json({ success: false, error: "Không thể lấy thông tin QC test" });
    }
  }
);

// POST /api/qc/tests — Tạo mới QC test
router.post(
  "/tests",
  authenticateJWT,
  requirePermission("qc", "create"),
  async (req: Request, res: Response) => {
    try {
      const { lot_id, test_type, test_method, performed_by } = req.body;

      if (!lot_id || !test_type || !test_method || !performed_by) {
        res.status(400).json({
          success: false,
          error: "Thiếu thông tin bắt buộc: lot_id, test_type, test_method, performed_by",
        });
        return;
      }

      const test = await qcService.createTest(req.body);
      res.status(201).json({ success: true, data: test });
    } catch (error) {
      console.error("Lỗi tạo QC test:", error);
      res.status(500).json({ success: false, error: "Không thể tạo QC test" });
    }
  }
);

// PUT /api/qc/tests/:id — Cập nhật kết quả QC test
router.put(
  "/tests/:id",
  authenticateJWT,
  requirePermission("qc", "update"),
  async (req: Request, res: Response) => {
    try {
      const { test_result, result_status, verified_by } = req.body;

      if (!test_result || !result_status || !verified_by) {
        res.status(400).json({
          success: false,
          error: "Thiếu thông tin bắt buộc: test_result, result_status, verified_by",
        });
        return;
      }

      const validStatuses = ["Pass", "Fail", "Pending"];
      if (!validStatuses.includes(result_status)) {
        res.status(400).json({
          success: false,
          error: `result_status không hợp lệ. Phải là một trong: ${validStatuses.join(", ")}`,
        });
        return;
      }

      const test = await qcService.updateTestResult(req.params.id, req.body);
      if (!test) {
        res.status(404).json({ success: false, error: "Không tìm thấy QC test" });
        return;
      }
      res.json({ success: true, data: test });
    } catch (error) {
      console.error("Lỗi cập nhật kết quả QC:", error);
      res.status(500).json({ success: false, error: "Không thể cập nhật kết quả QC test" });
    }
  }
);

// ─── QC Queue ─────────────────────────────────────────────────────────────────

// GET /api/qc/queue — Danh sách lô đang chờ QC (có thể filter theo status)
router.get(
  "/queue",
  authenticateJWT,
  requirePermission("qc", "read"),
  async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const queue = await qcService.getQCQueue(status);
      res.json({ success: true, data: queue, total: queue.length });
    } catch (error) {
      console.error("Lỗi lấy QC queue:", error);
      res.status(500).json({ success: false, error: "Không thể lấy danh sách hàng đợi QC" });
    }
  }
);

// GET /api/qc/queue/count — Số lượng lô đang chờ QC
router.get(
  "/queue/count",
  authenticateJWT,
  requirePermission("qc", "read"),
  async (_req: Request, res: Response) => {
    try {
      const queue = await qcService.getQCQueue();
      res.json({ success: true, data: { count: queue.length } });
    } catch (error) {
      console.error("Lỗi lấy số lượng QC queue:", error);
      res.status(500).json({ success: false, error: "Không thể lấy số lượng hàng đợi QC" });
    }
  }
);

// ─── QC Stats ─────────────────────────────────────────────────────────────────

// GET /api/qc/stats — Thống kê QC tổng hợp
router.get(
  "/stats",
  authenticateJWT,
  requirePermission("qc", "read"),
  async (req: Request, res: Response) => {
    try {
      const periodRaw = req.query.period;
      const periodValue =
        typeof periodRaw === "string" && /^(\d+)d$/.test(periodRaw)
          ? Number.parseInt(periodRaw.slice(0, -1), 10)
          : undefined;

      const stats = await qcService.getQCStats({
        periodDays: periodValue,
        groupBy: "day",
      });
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error("Lỗi lấy thống kê QC:", error);
      res.status(500).json({ success: false, error: "Không thể lấy thống kê QC" });
    }
  }
);

// ─── Lot Approval / Rejection ─────────────────────────────────────────────────

// POST /api/qc/approve/:lotId — Phê duyệt lô hàng
router.post(
  "/approve/:lotId",
  authenticateJWT,
  requirePermission("qc", "approve"),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user?.user_id ?? "unknown";
      const result = await qcService.approveLot(req.params.lotId, userId);

      if (!result.success) {
        res.status(400).json({ success: false, error: result.message });
        return;
      }

      res.json({ success: true, message: result.message });
    } catch (error) {
      console.error("Lỗi phê duyệt lô hàng:", error);
      res.status(500).json({ success: false, error: "Không thể phê duyệt lô hàng" });
    }
  }
);

// POST /api/qc/reject/:lotId — Từ chối lô hàng
router.post(
  "/reject/:lotId",
  authenticateJWT,
  requirePermission("qc", "reject"),
  async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        res.status(400).json({ success: false, error: "Lý do từ chối là bắt buộc" });
        return;
      }

      const userId = req.user?.user_id ?? "unknown";
      const result = await qcService.rejectLot(req.params.lotId, userId, reason.trim());

      if (!result.success) {
        res.status(400).json({ success: false, error: result.message });
        return;
      }

      res.json({ success: true, message: result.message });
    } catch (error) {
      console.error("Lỗi từ chối lô hàng:", error);
      res.status(500).json({ success: false, error: "Không thể từ chối lô hàng" });
    }
  }
);

// ─── Lot QC History ───────────────────────────────────────────────────────────

// GET /api/qc/lot/:lotId/history — Lịch sử QC tests của một lô
router.get(
  "/lot/:lotId/history",
  authenticateJWT,
  requirePermission("qc", "read"),
  async (req: Request, res: Response) => {
    try {
      const tests = await qcService.getTestsByLot(req.params.lotId);
      res.json({ success: true, data: tests, total: tests.length });
    } catch (error) {
      console.error("Lỗi lấy lịch sử QC của lô:", error);
      res.status(500).json({ success: false, error: "Không thể lấy lịch sử QC" });
    }
  }
);

export default router;
