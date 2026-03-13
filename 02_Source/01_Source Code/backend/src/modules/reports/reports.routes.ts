import { Router, Request, Response } from "express";
import { authenticateJWT } from "../../security/auth";
import { requirePermission } from "../../security/rbac";
import * as reportsService from "./reports.service";
import type { ReportExportInput, ReportType } from "./reports.types";

const router = Router();

function pickFiltersFromQuery(query: Request["query"]) {
  const filters: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (typeof v === "string" && v.trim() !== "") filters[k] = v;
  }
  return filters;
}

// GET /api/reports/inventory
router.get(
  "/inventory",
  authenticateJWT,
  requirePermission("reports", "read"),
  async (req: Request, res: Response) => {
    try {
      const filters = pickFiltersFromQuery(req.query);
      const rows = await reportsService.getInventoryReport(filters as any);
      res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
      console.error("Lỗi reports/inventory:", error);
      res.status(500).json({ success: false, error: "Không thể lấy inventory report" });
    }
  }
);

// GET /api/reports/transactions
router.get(
  "/transactions",
  authenticateJWT,
  requirePermission("reports", "read"),
  async (req: Request, res: Response) => {
    try {
      const filters = pickFiltersFromQuery(req.query);
      const rows = await reportsService.getTransactionReport(filters as any);
      res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
      console.error("Lỗi reports/transactions:", error);
      res.status(500).json({ success: false, error: "Không thể lấy transaction report" });
    }
  }
);

// GET /api/reports/audit-log
router.get(
  "/audit-log",
  authenticateJWT,
  requirePermission("reports", "read"),
  async (req: Request, res: Response) => {
    try {
      const filters = pickFiltersFromQuery(req.query);
      const rows = await reportsService.getAuditLog(filters as any);
      res.json({ success: true, data: rows, total: rows.length });
    } catch (error) {
      console.error("Lỗi reports/audit-log:", error);
      res.status(500).json({ success: false, error: "Không thể lấy audit log" });
    }
  }
);

// POST /api/reports/export (CSV)
router.post(
  "/export",
  authenticateJWT,
  requirePermission("reports", "export"),
  async (req: Request, res: Response) => {
    try {
      const body = (req.body ?? {}) as ReportExportInput;
      const type = body.type as ReportType;
      if (
        !type ||
        !["inventory", "transactions", "audit-log", "expiring"].includes(type)
      ) {
        res.status(400).json({ success: false, error: "type không hợp lệ" });
        return;
      }

      const rows = await reportsService.getReportData(type, body.filters ?? {});
      const columns =
        type === "inventory"
          ? [
              { key: "lot_id", header: "Lot ID" },
              { key: "material_id", header: "Material ID" },
              { key: "material_name", header: "Material Name" },
              { key: "material_type", header: "Material Type" },
              { key: "supplier_name", header: "Supplier" },
              { key: "received_date", header: "Received Date" },
              { key: "expiration_date", header: "Expiration Date" },
              { key: "status", header: "Status" },
              { key: "quantity", header: "Quantity" },
              { key: "unit_of_measure", header: "UOM" },
              { key: "storage_location", header: "Location" },
              { key: "po_number", header: "PO Number" },
              { key: "is_sample", header: "Is Sample" },
            ]
          : type === "expiring"
            ? [
                { key: "lot_id", header: "Lot ID" },
                { key: "material_id", header: "Material ID" },
                { key: "material_name", header: "Material Name" },
                { key: "material_type", header: "Material Type" },
                { key: "supplier_name", header: "Supplier" },
                { key: "expiration_date", header: "Expiration Date" },
                { key: "days_to_expiry", header: "Days to Expiry" },
                { key: "status", header: "Status" },
                { key: "quantity", header: "Quantity" },
                { key: "unit_of_measure", header: "UOM" },
                { key: "storage_location", header: "Location" },
              ]
          : type === "transactions"
            ? [
                { key: "transaction_id", header: "Transaction ID" },
                { key: "lot_id", header: "Lot ID" },
                { key: "transaction_type", header: "Type" },
                { key: "quantity", header: "Quantity" },
                { key: "unit_of_measure", header: "UOM" },
                { key: "reference_id", header: "Reference ID" },
                { key: "performed_by", header: "Performed By" },
                { key: "transaction_date", header: "Transaction Date" },
                { key: "notes", header: "Notes" },
              ]
            : [
                { key: "event_type", header: "Event Type" },
                { key: "event_date", header: "Event Date" },
                { key: "lot_id", header: "Lot ID" },
                { key: "reference_id", header: "Reference ID" },
                { key: "performed_by", header: "Performed By" },
                { key: "notes", header: "Notes" },
                { key: "details", header: "Details" },
              ];

      const csv = reportsService.exportToCSV(rows as any, columns as any);

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${type}-report.csv"`
      );
      res.send(csv);
    } catch (error) {
      console.error("Lỗi reports/export:", error);
      res.status(500).json({ success: false, error: "Không thể export report" });
    }
  }
);

export default router;

