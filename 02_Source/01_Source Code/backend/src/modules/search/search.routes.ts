import { Router, Request, Response } from "express";
import * as searchService from "./search.service";
import { authenticateJWT } from "../../security/auth";
import { requirePermission } from "../../security/rbac";

const router = Router();

// GET /api/search — Full-text search materials
router.get(
  "/",
  authenticateJWT,
  requirePermission("search", "read"),
  async (req: Request, res: Response) => {
    try {
      const { q, limit, offset, material_type, storage_conditions } = req.query;

      const searchRequest = {
        query: (q as string) || "",
        limit: limit ? parseInt(limit as string, 10) : 20,
        offset: offset ? parseInt(offset as string, 10) : 0,
        filters: {
          material_type: material_type as string | undefined,
          storage_conditions: storage_conditions as string | undefined,
        },
      };

      const result = await searchService.searchMaterials(searchRequest);

      res.json({
        success: true,
        data: result.results,
        total: result.total,
        took: result.took,
        query: searchRequest.query,
      });
    } catch (error) {
      console.error("Lỗi search:", error);
      res.status(500).json({
        success: false,
        error: "Không thể thực hiện tìm kiếm",
      });
    }
  }
);

// POST /api/search/index — Index tất cả materials vào Elasticsearch
router.post(
  "/index",
  authenticateJWT,
  requirePermission("search", "index"),
  async (_req: Request, res: Response) => {
    try {
      const count = await searchService.indexAllMaterials();
      res.json({
        success: true,
        message: `Đã index ${count} materials vào Elasticsearch`,
        count,
      });
    } catch (error) {
      console.error("Lỗi index materials:", error);
      res.status(500).json({
        success: false,
        error: "Không thể index materials",
      });
    }
  }
);

// POST /api/search/index/:materialId — Index một material cụ thể
router.post(
  "/index/:materialId",
  authenticateJWT,
  requirePermission("search", "index"),
  async (req: Request, res: Response) => {
    try {
      const { materialId } = req.params;
      const material = req.body;

      if (!material.material_id) {
        material.material_id = materialId;
      }

      await searchService.indexMaterial(material);

      res.json({
        success: true,
        message: `Đã index material ${materialId}`,
      });
    } catch (error) {
      console.error("Lỗi index material:", error);
      res.status(500).json({
        success: false,
        error: "Không thể index material",
      });
    }
  }
);

// DELETE /api/search/index/:materialId — Xóa material khỏi index
router.delete(
  "/index/:materialId",
  authenticateJWT,
  requirePermission("search", "index"),
  async (req: Request, res: Response) => {
    try {
      const { materialId } = req.params;
      await searchService.deleteMaterialIndex(materialId);

      res.json({
        success: true,
        message: `Đã xóa material ${materialId} khỏi index`,
      });
    } catch (error) {
      console.error("Lỗi xóa material khỏi index:", error);
      res.status(500).json({
        success: false,
        error: "Không thể xóa material khỏi index",
      });
    }
  }
);

// POST /api/search/reindex — Xóa và tạo lại index từ đầu
router.post(
  "/reindex",
  authenticateJWT,
  requirePermission("search", "index"),
  async (_req: Request, res: Response) => {
    try {
      await searchService.deleteIndex();
      const count = await searchService.indexAllMaterials();

      res.json({
        success: true,
        message: `Đã reindex ${count} materials`,
        count,
      });
    } catch (error) {
      console.error("Lỗi reindex:", error);
      res.status(500).json({
        success: false,
        error: "Không thể reindex",
      });
    }
  }
);

export default router;
