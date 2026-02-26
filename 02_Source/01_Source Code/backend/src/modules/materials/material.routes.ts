import { Router, Request, Response } from "express";
import * as materialService from "./material.service";

const router = Router();

// GET /api/materials — Lấy danh sách tất cả vật tư (có Redis cache)
router.get("/", async (_req: Request, res: Response) => {
  try {
    const materials = await materialService.getAllMaterials();
    res.json({ success: true, data: materials, total: materials.length });
  } catch (error) {
    console.error("Lỗi lấy danh sách vật tư:", error);
    res.status(500).json({ success: false, error: "Không thể lấy danh sách vật tư" });
  }
});

// GET /api/materials/:id — Lấy chi tiết một vật tư
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const material = await materialService.getMaterialById(req.params.id);
    if (!material) {
      res.status(404).json({ success: false, error: "Không tìm thấy vật tư" });
      return;
    }
    res.json({ success: true, data: material });
  } catch (error) {
    console.error("Lỗi lấy vật tư:", error);
    res.status(500).json({ success: false, error: "Không thể lấy thông tin vật tư" });
  }
});

// POST /api/materials — Tạo vật tư mới
router.post("/", async (req: Request, res: Response) => {
  try {
    const { material_id, part_number, material_name, material_type } = req.body;

    if (!material_id || !part_number || !material_name || !material_type) {
      res.status(400).json({
        success: false,
        error: "Thiếu thông tin bắt buộc: material_id, part_number, material_name, material_type",
      });
      return;
    }

    const material = await materialService.createMaterial(req.body);
    res.status(201).json({ success: true, data: material });
  } catch (error: unknown) {
    console.error("Lỗi tạo vật tư:", error);
    // Lỗi duplicate key
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "23505"
    ) {
      res.status(409).json({ success: false, error: "material_id hoặc part_number đã tồn tại" });
      return;
    }
    res.status(500).json({ success: false, error: "Không thể tạo vật tư" });
  }
});

// PUT /api/materials/:id — Cập nhật vật tư
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const material = await materialService.updateMaterial(req.params.id, req.body);
    if (!material) {
      res.status(404).json({ success: false, error: "Không tìm thấy vật tư" });
      return;
    }
    res.json({ success: true, data: material });
  } catch (error) {
    console.error("Lỗi cập nhật vật tư:", error);
    res.status(500).json({ success: false, error: "Không thể cập nhật vật tư" });
  }
});

// DELETE /api/materials/:id — Xóa vật tư
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const deleted = await materialService.deleteMaterial(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, error: "Không tìm thấy vật tư" });
      return;
    }
    res.json({ success: true, message: "Đã xóa vật tư thành công" });
  } catch (error) {
    console.error("Lỗi xóa vật tư:", error);
    res.status(500).json({ success: false, error: "Không thể xóa vật tư" });
  }
});

export default router;
