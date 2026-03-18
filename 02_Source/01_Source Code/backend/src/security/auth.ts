import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { updateLastLogin } from "../modules/admin/admin.service";

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

// Keycloak public key (from environment or fetched dynamically)
const KEYCLOAK_PUBLIC_KEY = process.env.KEYCLOAK_PUBLIC_KEY || "";
const KEYCLOAK_URL = process.env.KEYCLOAK_URL || "http://localhost:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || "inventory-management";

function parseBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer ([^\s]+)$/);
  return match?.[1] ?? null;
}

/** Throttle map for last_login updates (userId → last update timestamp) */
const loginTrackThrottle = new Map<string, number>();
const LOGIN_TRACK_INTERVAL_MS = 5 * 60_000; // update at most once per 5 min per user

function trackLogin(userId: string): void {
  const now = Date.now();
  const lastTracked = loginTrackThrottle.get(userId) ?? 0;
  if (now - lastTracked < LOGIN_TRACK_INTERVAL_MS) return;
  loginTrackThrottle.set(userId, now);
  // Fire-and-forget — don't block the request
  updateLastLogin(userId).catch(() => {});
}

/** Cached Keycloak public key (fetched dynamically) */
let cachedPublicKey: string | null = null;
let lastKeyFetch = 0;
const KEY_FETCH_COOLDOWN_MS = 60_000; // min 60s between fetches

/**
 * Fetch the Keycloak realm public key and cache it.
 */
async function fetchKeycloakPublicKey(): Promise<string | null> {
  const now = Date.now();
  if (cachedPublicKey && now - lastKeyFetch < KEY_FETCH_COOLDOWN_MS) {
    return cachedPublicKey;
  }
  try {
    const url = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return cachedPublicKey;
    const data = (await res.json()) as { public_key?: string };
    if (data.public_key) {
      cachedPublicKey = `-----BEGIN PUBLIC KEY-----\n${data.public_key}\n-----END PUBLIC KEY-----`;
      lastKeyFetch = now;
    }
    return cachedPublicKey;
  } catch {
    return null; // Keycloak unreachable
  }
}

/**
 * Resolve the verification key: static env → dynamic Keycloak fetch.
 * Throws if no key is available so auth fails closed.
 */
async function getVerificationKey(): Promise<string> {
  if (KEYCLOAK_PUBLIC_KEY) return KEYCLOAK_PUBLIC_KEY;
  const dynamic = await fetchKeycloakPublicKey();
  if (!dynamic)
    throw new Error("Keycloak public key unavailable — cannot verify token");
  return dynamic;
}

/**
 * Middleware xác thực JWT từ header Authorization
 */
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // Bypass authentication in development if BYPASS_AUTH is set
  if (process.env.BYPASS_AUTH === 'true') {
    req.user = {
      user_id: 'USR-001',
      username: 'admin123',
      email: 'admin@ims.local',
      roles: ['admin', 'inventory_manager', 'quality_control', 'production', 'viewer'],
      realm_access: {
        roles: ['admin', 'inventory_manager', 'quality_control', 'production', 'viewer'],
      },
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

  const token = parseBearerToken(authHeader);

  if (!token) {
    res.status(401).json({
      success: false,
      error: "Unauthorized - Invalid token format",
    });
    return;
  }

  try {
    // Resolve verification key (static env → dynamic Keycloak)
    const verifyKey = await getVerificationKey();

    const decoded = jwt.verify(token, verifyKey) as any;

    // Extract user info từ JWT payload
    const roles = decoded.realm_access?.roles || decoded.roles || [];

    const userId = decoded.sub || decoded.user_id || "unknown";

    req.user = {
      user_id: userId,
      username: decoded.preferred_username || decoded.username || "unknown",
      email: decoded.email,
      roles: roles,
      realm_access: decoded.realm_access,
    };

    // Track login time (throttled, fire-and-forget)
    trackLogin(userId);

    next();
  } catch (error) {
    // If verification failed and we used a cached key, invalidate and retry once
    if (cachedPublicKey) {
      cachedPublicKey = null;
      lastKeyFetch = 0;
    }
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
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const token = parseBearerToken(authHeader);

  if (!token) {
    next();
    return;
  }

  try {
    const verifyKey = await getVerificationKey();
    const decoded = jwt.verify(token, verifyKey) as any;

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
export const extractUserFromToken = async (
  token: string,
): Promise<any | null> => {
  try {
    const verifyKey = await getVerificationKey();
    const decoded = jwt.verify(token, verifyKey);
    return decoded;
  } catch (error) {
    console.error("Failed to extract user from token:", error);
    return null;
  }
};
