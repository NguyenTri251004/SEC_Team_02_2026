import { Router, Request, Response } from "express";
import * as adminService from "./admin.service";
import { CreateUserInput, UpdateUserInput, GetUsersFilters } from "./admin.types";
import { authenticateJWT } from "../../security/auth";
import { adminOnly } from "../../security/rbac";

const router = Router();

// All routes require Admin role
router.use(authenticateJWT, adminOnly);

/**
 * GET /api/admin/users
 * Get all users with optional filters
 */
router.get("/users", async (req: Request, res: Response) => {
  try {
    const filters: GetUsersFilters = {
      role: req.query.role as any,
      is_active: req.query.is_active === "true" ? true : req.query.is_active === "false" ? false : undefined,
      search: req.query.search as string,
    };

    const users = await adminService.getAllUsers(filters);
    res.json({
      success: true,
      data: users,
      total: users.length,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách users:", error);
    res.status(500).json({
      success: false,
      error: "Không thể lấy danh sách users",
    });
  }
});

/**
 * GET /api/admin/users/:id
 * Get single user detail
 */
router.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const user = await adminService.getUserById(req.params.id);
    
    if (!user) {
      res.status(404).json({
        success: false,
        error: "Không tìm thấy user",
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Lỗi lấy thông tin user:", error);
    res.status(500).json({
      success: false,
      error: "Không thể lấy thông tin user",
    });
  }
});

/**
 * POST /api/admin/users
 * Create new user
 */
router.post("/users", async (req: Request, res: Response) => {
  try {
    const input: CreateUserInput = req.body;

    // Validation
    if (!input.user_id || !input.username || !input.email || !input.password || !input.role) {
      res.status(400).json({
        success: false,
        error: "Thiếu thông tin bắt buộc: user_id, username, email, password, role",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.email)) {
      res.status(400).json({
        success: false,
        error: "Email không hợp lệ",
      });
      return;
    }

    const user = await adminService.createUser(input);
    res.status(201).json({
      success: true,
      data: user,
      message: "Tạo user thành công",
    });
  } catch (error: any) {
    console.error("Lỗi tạo user:", error);

    // Handle duplicate key errors
    if (error.code === "23505") {
      res.status(409).json({
        success: false,
        error: "Username hoặc email đã tồn tại",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Không thể tạo user",
    });
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user information (not password)
 */
router.put("/users/:id", async (req: Request, res: Response) => {
  try {
    const input: UpdateUserInput = req.body;

    // Email validation if provided
    if (input.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input.email)) {
        res.status(400).json({
          success: false,
          error: "Email không hợp lệ",
        });
        return;
      }
    }

    const user = await adminService.updateUser(req.params.id, input);

    if (!user) {
      res.status(404).json({
        success: false,
        error: "Không tìm thấy user",
      });
      return;
    }

    res.json({
      success: true,
      data: user,
      message: "Cập nhật user thành công",
    });
  } catch (error: any) {
    console.error("Lỗi cập nhật user:", error);

    // Handle duplicate key errors
    if (error.code === "23505") {
      res.status(409).json({
        success: false,
        error: "Username hoặc email đã tồn tại",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Không thể cập nhật user",
    });
  }
});

/**
 * PATCH /api/admin/users/:id/toggle-active
 * Lock/unlock user account
 */
router.patch("/users/:id/toggle-active", async (req: Request, res: Response) => {
  try {
    const user = await adminService.toggleUserActive(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        error: "Không tìm thấy user",
      });
      return;
    }

    res.json({
      success: true,
      data: user,
      message: user.is_active ? "Đã mở khóa tài khoản" : "Đã khóa tài khoản",
    });
  } catch (error) {
    console.error("Lỗi toggle user active:", error);
    res.status(500).json({
      success: false,
      error: "Không thể thay đổi trạng thái user",
    });
  }
});

/**
 * POST /api/admin/users/:id/reset-password
 * Admin reset user password
 */
router.post("/users/:id/reset-password", async (req: Request, res: Response) => {
  try {
    const { new_password } = req.body;

    if (!new_password) {
      res.status(400).json({
        success: false,
        error: "Thiếu new_password",
      });
      return;
    }

    // Password strength validation (basic)
    if (new_password.length < 6) {
      res.status(400).json({
        success: false,
        error: "Mật khẩu phải có ít nhất 6 ký tự",
      });
      return;
    }

    const success = await adminService.resetPassword(req.params.id, new_password);

    if (!success) {
      res.status(404).json({
        success: false,
        error: "Không tìm thấy user",
      });
      return;
    }

    res.json({
      success: true,
      message: "Đã reset mật khẩu thành công",
    });
  } catch (error) {
    console.error("Lỗi reset password:", error);
    res.status(500).json({
      success: false,
      error: "Không thể reset mật khẩu",
    });
  }
});

/**
 * GET /api/admin/stats
 * Get admin dashboard statistics
 */
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await adminService.getAdminStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Lỗi lấy admin stats:", error);
    res.status(500).json({
      success: false,
      error: "Không thể lấy thống kê admin",
    });
  }
});

export default router;
