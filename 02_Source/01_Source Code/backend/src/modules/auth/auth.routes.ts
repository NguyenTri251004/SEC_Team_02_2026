import crypto from "crypto";
import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import pool from "../../shared/db/pool";
import { DB_ROLE_TO_API } from "../admin/admin.types";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";

const hashPassword = (password: string): string =>
  crypto.createHash("sha256").update(password).digest("hex");

// POST /api/auth/login — Đăng nhập bằng username + password
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      res.status(400).json({
        success: false,
        error: "Vui lòng nhập tên đăng nhập và mật khẩu",
      });
      return;
    }

    const result = await pool.query(
      `SELECT user_id, username, email, role, is_active, password AS password_hash
       FROM users WHERE username = $1`,
      [username],
    );

    const user = result.rows[0];

    if (!user || user.password_hash !== hashPassword(password)) {
      res.status(401).json({
        success: false,
        error: "Tên đăng nhập hoặc mật khẩu không đúng",
      });
      return;
    }

    if (!user.is_active) {
      res.status(403).json({
        success: false,
        error: "Tài khoản đã bị vô hiệu hóa. Liên hệ quản trị viên",
      });
      return;
    }

    const role = DB_ROLE_TO_API[user.role] ?? user.role;

    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role,
      },
      JWT_SECRET,
      { expiresIn: "8h" },
    );

    // Cập nhật last_login (fire-and-forget)
    pool
      .query("UPDATE users SET last_login = NOW() WHERE user_id = $1", [
        user.user_id,
      ])
      .catch(() => {});

    res.json({
      success: true,
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Lỗi máy chủ" });
  }
});

export default router;
