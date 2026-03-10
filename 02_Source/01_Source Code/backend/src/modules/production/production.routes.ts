import { Request, Response, Router } from "express";
import { authenticateJWT } from "../../security/auth";
import { requirePermission } from "../../security/rbac";
import { BatchStatus } from "./production.types";
import * as productionService from "./production.service";

const router = Router();

const BATCH_STATUSES: readonly BatchStatus[] = [
  "Planned",
  "In Progress",
  "Complete",
  "Rejected",
];

const isBatchStatus = (value: unknown): value is BatchStatus => {
  return (
    typeof value === "string" &&
    BATCH_STATUSES.some((status) => status === value)
  );
};

router.get(
  "/batches",
  authenticateJWT,
  requirePermission("production", "read"),
  async (req: Request, res: Response) => {
    try {
      const filters = {
        status: isBatchStatus(req.query.status) ? req.query.status : undefined,
        product_id:
          typeof req.query.product_id === "string"
            ? req.query.product_id
            : undefined,
        batch_number:
          typeof req.query.batch_number === "string"
            ? req.query.batch_number
            : undefined,
      };

      const batches = await productionService.getAllBatches(filters);
      res.json({ success: true, data: batches, total: batches.length });
    } catch (error) {
      console.error("Error fetching production batches:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch production batches" });
    }
  },
);

router.get(
  "/batches/:id",
  authenticateJWT,
  requirePermission("production", "read"),
  async (req: Request, res: Response) => {
    try {
      const batch = await productionService.getBatchById(req.params.id);
      if (!batch) {
        res
          .status(404)
          .json({ success: false, error: "Production batch not found" });
        return;
      }

      res.json({ success: true, data: batch });
    } catch (error) {
      console.error("Error fetching production batch details:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch production batch details",
      });
    }
  },
);

router.post(
  "/batches",
  authenticateJWT,
  requirePermission("production", "create"),
  async (req: Request, res: Response) => {
    try {
      const {
        batch_id,
        product_id,
        batch_number,
        batch_size,
        unit_of_measure,
        manufacture_date,
        expiration_date,
      } = req.body;

      if (
        !product_id ||
        !batch_number ||
        batch_size === undefined ||
        !unit_of_measure ||
        !manufacture_date ||
        !expiration_date
      ) {
        res.status(400).json({
          success: false,
          error:
            "Missing required fields: product_id, batch_number, batch_size, unit_of_measure, manufacture_date, expiration_date",
        });
        return;
      }

      const batch = await productionService.createBatch({
        batch_id,
        product_id,
        batch_number,
        batch_size: Number(batch_size),
        unit_of_measure,
        manufacture_date,
        expiration_date,
      });

      res.status(201).json({ success: true, data: batch });
    } catch (error: unknown) {
      console.error("Error creating production batch:", error);
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "23505"
      ) {
        res.status(409).json({
          success: false,
          error: "batch_id or batch_number already exists",
        });
        return;
      }

      if (error instanceof Error) {
        res.status(400).json({ success: false, error: error.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: "Failed to create production batch" });
    }
  },
);

router.patch(
  "/batches/:id/status",
  authenticateJWT,
  requirePermission("production", "update"),
  async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!isBatchStatus(status)) {
        res.status(400).json({ success: false, error: "Invalid status value" });
        return;
      }

      const batch = await productionService.updateBatchStatus(
        req.params.id,
        status,
      );
      if (!batch) {
        res
          .status(404)
          .json({ success: false, error: "Production batch not found" });
        return;
      }

      res.json({ success: true, data: batch });
    } catch (error) {
      console.error("Error updating production batch status:", error);
      if (error instanceof Error) {
        res.status(400).json({ success: false, error: error.message });
        return;
      }

      res.status(500).json({
        success: false,
        error: "Failed to update production batch status",
      });
    }
  },
);

router.post(
  "/batches/:id/components",
  authenticateJWT,
  requirePermission("production", "update"),
  async (req: Request, res: Response) => {
    try {
      const { component_id, lot_id, planned_quantity, unit_of_measure } =
        req.body;
      if (!lot_id || planned_quantity === undefined || !unit_of_measure) {
        res.status(400).json({
          success: false,
          error:
            "Missing required fields: lot_id, planned_quantity, unit_of_measure",
        });
        return;
      }

      const component = await productionService.addComponent(req.params.id, {
        component_id,
        lot_id,
        planned_quantity: Number(planned_quantity),
        unit_of_measure,
        added_by: req.user?.username,
      });

      res.status(201).json({ success: true, data: component });
    } catch (error) {
      console.error("Error adding batch component:", error);
      if (error instanceof Error) {
        const statusCode =
          error.message === "Production batch not found" ? 404 : 400;
        res.status(statusCode).json({ success: false, error: error.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: "Failed to add batch component" });
    }
  },
);

router.get(
  "/batches/:id/components",
  authenticateJWT,
  requirePermission("production", "read"),
  async (req: Request, res: Response) => {
    try {
      const batch = await productionService.getBatchById(req.params.id);
      if (!batch) {
        res
          .status(404)
          .json({ success: false, error: "Production batch not found" });
        return;
      }

      const components = await productionService.getComponents(req.params.id);
      res.json({ success: true, data: components, total: components.length });
    } catch (error) {
      console.error("Error fetching batch components:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch batch components" });
    }
  },
);

router.post(
  "/consume",
  authenticateJWT,
  requirePermission("production", "consume"),
  async (req: Request, res: Response) => {
    try {
      const { batchId, componentId, actualQuantity } = req.body;
      if (!batchId || !componentId || actualQuantity === undefined) {
        res.status(400).json({
          success: false,
          error:
            "Missing required fields: batchId, componentId, actualQuantity",
        });
        return;
      }

      const component = await productionService.consumeMaterial(
        batchId,
        componentId,
        Number(actualQuantity),
      );

      res.json({ success: true, data: component });
    } catch (error) {
      console.error("Error consuming material:", error);
      if (error instanceof Error) {
        const notFoundErrors = new Set([
          "Production batch not found",
          "Batch component not found",
          "Inventory lot not found",
        ]);
        res.status(notFoundErrors.has(error.message) ? 404 : 400).json({
          success: false,
          error: error.message,
        });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: "Failed to consume material" });
    }
  },
);

router.get(
  "/traceability/:batchId",
  authenticateJWT,
  requirePermission("production", "read"),
  async (req: Request, res: Response) => {
    try {
      const batch = await productionService.getBatchById(req.params.batchId);
      if (!batch) {
        res
          .status(404)
          .json({ success: false, error: "Production batch not found" });
        return;
      }

      const traceability = await productionService.getTraceability(
        req.params.batchId,
      );
      res.json({
        success: true,
        data: traceability,
        total: traceability.length,
      });
    } catch (error) {
      console.error("Error fetching traceability:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to fetch traceability" });
    }
  },
);

export default router;
