import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Extend Express Request để thêm user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: string;
        username: string;
        email?: string;
        roles: string[];
        realm_access?: {
          roles: string[];
        };
      };
    }
  }
}

// Keycloak public key hoặc JWT secret (từ environment)
const KEYCLOAK_PUBLIC_KEY = process.env.KEYCLOAK_PUBLIC_KEY || "";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key";
const BYPASS_AUTH = process.env.BYPASS_AUTH === "true"; // Development mode

/**
 * Middleware xác thực JWT từ header Authorization
 */
export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Bypass auth trong development mode
  if (BYPASS_AUTH) {
    console.log("⚠️  Auth bypassed (BYPASS_AUTH=true)");
    req.user = {
      user_id: "dev-user-001",
      username: "dev_user",
      email: "dev@example.com",
      roles: ["admin", "inventory_manager", "quality_control", "production"],
    };
    next();
    return;
  }

  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: "Unauthorized - No token provided",
    });
    return;
  }

  const token = authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    res.status(401).json({
      success: false,
      error: "Unauthorized - Invalid token format",
    });
    return;
  }

  try {
    // Verify JWT token
    let publicKey = KEYCLOAK_PUBLIC_KEY;

    // Nếu không có public key, dùng secret (cho testing)
    if (!publicKey) {
      publicKey = JWT_SECRET;
    }

    const decoded = jwt.verify(token, publicKey) as any;

    // Extract user info từ JWT payload
    const roles = decoded.realm_access?.roles || decoded.roles || [];

    req.user = {
      user_id: decoded.sub || decoded.user_id || "unknown",
      username: decoded.preferred_username || decoded.username || "unknown",
      email: decoded.email,
      roles: roles,
      realm_access: decoded.realm_access,
    };

    next();
  } catch (error) {
    console.error("JWT verification failed:", error);
    res.status(403).json({
      success: false,
      error: "Forbidden - Invalid token",
    });
  }
};

/**
 * Middleware tùy chọn - Không bắt buộc auth nhưng parse JWT nếu có
 */
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    next();
    return;
  }

  try {
    const publicKey = KEYCLOAK_PUBLIC_KEY || JWT_SECRET;
    const decoded = jwt.verify(token, publicKey) as any;

    const roles = decoded.realm_access?.roles || decoded.roles || [];

    req.user = {
      user_id: decoded.sub || decoded.user_id || "unknown",
      username: decoded.preferred_username || decoded.username || "unknown",
      email: decoded.email,
      roles: roles,
      realm_access: decoded.realm_access,
    };
  } catch (error) {
    // Token invalid, nhưng không reject request
    console.warn("Optional auth: Invalid token, continuing without user");
  }

  next();
};

/**
 * Extract user từ token (helper function)
 */
export const extractUserFromToken = (token: string): any | null => {
  try {
    const publicKey = KEYCLOAK_PUBLIC_KEY || JWT_SECRET;
    const decoded = jwt.verify(token, publicKey);
    return decoded;
  } catch (error) {
    console.error("Failed to extract user from token:", error);
    return null;
  }
};
