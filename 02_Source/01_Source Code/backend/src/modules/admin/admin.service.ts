import pool from "../../shared/db/pool";
import redisClient, { CACHE_TTL } from "../../shared/cache/redis";
import {
  User,
  CreateUserInput,
  UpdateUserInput,
  AdminStats,
  GetUsersFilters,
  UserRole,
  DB_ROLE_TO_API,
  API_ROLE_TO_DB,
  ServiceHealth,
  SystemHealth,
} from "./admin.types";

// ── Keycloak Admin API ──────────────────────────────────────────────────────────────────────────────
const KEYCLOAK_URL = process.env.KEYCLOAK_URL ?? "http://keycloak:8080";
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM ?? "inventory-management";
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET ?? "";

/** Obtain a short-lived admin token via the inventory-backend service account (client_credentials). */
async function getKeycloakAdminToken(): Promise<string> {
  const res = await fetch(
    `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: "inventory-backend",
        client_secret: KEYCLOAK_CLIENT_SECRET,
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Keycloak admin auth failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Create a user in Keycloak and return the new user's sub (UUID).
 * The Location response header contains the user URL; last path segment is the UUID.
 */
async function createKeycloakUser(input: {
  username: string;
  email: string;
  initial_password: string;
}): Promise<string> {
  const token = await getKeycloakAdminToken();
  const res = await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      username: input.username,
      email: input.email,
      enabled: true,
      emailVerified: true,
      credentials: [{ type: "password", value: input.initial_password, temporary: false }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 409) {
      throw Object.assign(
        new Error("Username or email already exists in Keycloak"),
        { code: "23505" }
      );
    }
    throw new Error(`Failed to create Keycloak user: ${res.status} ${body}`);
  }

  const location = res.headers.get("Location") ?? "";
  const keycloakSub = location.split("/").pop();
  if (!keycloakSub) throw new Error("Keycloak did not return a user ID in the Location header");
  return keycloakSub;
}

/** Reset a user's password directly in Keycloak. */
async function resetKeycloakPassword(keycloakSub: string, newPassword: string): Promise<void> {
  const token = await getKeycloakAdminToken();
  const res = await fetch(
    `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${keycloakSub}/reset-password`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: "password", value: newPassword, temporary: false }),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to reset Keycloak password: ${res.status} ${await res.text()}`);
  }
}

/**
 * Trigger a "reset password" email action via Keycloak.
 * The user receives a one-time link to set their own new password.
 */
async function triggerKeycloakResetEmail(keycloakSub: string): Promise<void> {
  const token = await getKeycloakAdminToken();
  const res = await fetch(
    `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${keycloakSub}/execute-actions-email`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(["UPDATE_PASSWORD"]),
    }
  );
  if (!res.ok) {
    throw new Error(
      `Failed to send reset-password email via Keycloak: ${res.status} ${await res.text()}`
    );
  }
}

/** Enable or disable a user in Keycloak (best-effort — never throws). */
async function syncKeycloakEnabled(keycloakSub: string, enabled: boolean): Promise<void> {
  try {
    const token = await getKeycloakAdminToken();
    await fetch(`${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${keycloakSub}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ enabled }),
    });
  } catch (err) {
    console.warn("Keycloak enabled-sync failed — continuing:", err);
  }
}

/**
 * Assign a realm role to a Keycloak user.
 * `roleName` must be the Keycloak role name (snake_case: admin, inventory_manager, …).
 */
async function assignKeycloakRole(
  keycloakSub: string,
  roleName: string,
  token?: string
): Promise<void> {
  const adminToken = token ?? (await getKeycloakAdminToken());

  // 1. Fetch the role representation (we need the role id)
  const roleRes = await fetch(
    `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/${encodeURIComponent(roleName)}`,
    { headers: { Authorization: `Bearer ${adminToken}` } }
  );
  if (!roleRes.ok) {
    throw new Error(
      `Keycloak role "${roleName}" not found: ${roleRes.status} ${await roleRes.text()}`
    );
  }
  const role = (await roleRes.json()) as { id: string; name: string };

  // 2. Assign the role to the user
  const assignRes = await fetch(
    `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${keycloakSub}/role-mappings/realm`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify([{ id: role.id, name: role.name }]),
    }
  );
  if (!assignRes.ok) {
    throw new Error(
      `Failed to assign Keycloak role "${roleName}": ${assignRes.status} ${await assignRes.text()}`
    );
  }
}

// ── Shared SELECT/RETURNING column list ──────────────────────────────────────────────────
const USER_FIELDS = `user_id,
  user_id       AS keycloak_sub,
  username,
  email,
  role,
  is_active,
  last_login    AS last_login_at,
  created_date  AS created_at,
  modified_date AS updated_at`;

// ── Helpers ───────────────────────────────────────────────────────────────────────────────
/**
 * Normalize a user's role from DB format (PascalCase) to API format (snake_case)
 */
function normalizeUserRole<T extends { role: UserRole }>(user: T): T {
  return {
    ...user,
    role: (DB_ROLE_TO_API[user.role] ?? user.role) as UserRole,
  };
}

const CACHE_KEY_PREFIX = "users:";
const CACHE_KEY_ALL = "users:all";
const CACHE_KEY_STATS = "admin:stats";

/**
 * Invalidate user caches
 */
const invalidateCache = async (): Promise<void> => {
  try {
    const keys = await redisClient.keys(`${CACHE_KEY_PREFIX}*`);
    if (keys.length > 0) {
      // Delete each key individually
      for (const key of keys) {
        await redisClient.del(key);
      }
    }
    // Also invalidate stats cache
    await redisClient.del(CACHE_KEY_STATS);
  } catch (error) {
    console.warn("Redis cache invalidation failed:", error);
  }
};

/**
 * Get all users (never return password field)
 */
export const getAllUsers = async (
  filters?: GetUsersFilters
): Promise<User[]> => {
  let query = `SELECT ${USER_FIELDS} FROM users WHERE 1=1`;
  const params: any[] = [];
  let paramCount = 0;

  // Apply filters
  if (filters?.role) {
    paramCount++;
    query += ` AND role = $${paramCount}`;
    params.push(filters.role);
  }

  if (filters?.is_active !== undefined) {
    paramCount++;
    query += ` AND is_active = $${paramCount}`;
    params.push(filters.is_active);
  }

  if (filters?.search) {
    paramCount++;
    query += ` AND (username ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
    params.push(`%${filters.search}%`);
  }

  query += " ORDER BY created_date DESC";

  const result = await pool.query<User>(query, params);
  return result.rows.map(normalizeUserRole);
};

/**
 * Get single user by ID (without password)
 */
export const getUserById = async (id: string): Promise<User | null> => {
  const cacheKey = `${CACHE_KEY_PREFIX}${id}`;

  // Try cache
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`✓ Cache hit: user ${id}`);
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("Redis cache read failed:", error);
  }

  const result = await pool.query<User>(
    `SELECT ${USER_FIELDS} FROM users WHERE user_id = $1`,
    [id]
  );

  const user = result.rows[0] ? normalizeUserRole(result.rows[0]) : null;

  // Cache result
  if (user) {
    try {
      await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(user));
    } catch (error) {
      console.warn("Redis cache write failed:", error);
    }
  }

  return user;
};

/**
 * Create user: register in Keycloak first, then persist profile in local DB.
 * The Keycloak sub becomes the user_id in our database.
 */
export const createUser = async (input: CreateUserInput): Promise<User> => {
  // 1. Create user in Keycloak → get back the keycloak_sub (UUID)
  const keycloakSub = await createKeycloakUser({
    username: input.username,
    email: input.email,
    initial_password: input.initial_password,
  });

  // 2. Assign the realm role in Keycloak
  // DB role is PascalCase (e.g. "InventoryManager"); Keycloak role is snake_case (e.g. "inventory_manager")
  const keycloakRoleName = DB_ROLE_TO_API[input.role] ?? input.role;
  await assignKeycloakRole(keycloakSub, keycloakRoleName);

  // 3. Persist user profile in local DB using keycloak_sub as user_id
  const result = await pool.query<User>(
    `INSERT INTO users (user_id, username, email, role, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${USER_FIELDS}`,
    [keycloakSub, input.username, input.email, input.role, input.is_active ?? true]
  );

  await invalidateCache();
  return normalizeUserRole(result.rows[0]);
};

/**
 * Update user information (NOT password)
 */
export const updateUser = async (
  id: string,
  input: UpdateUserInput
): Promise<User | null> => {
  // Check existence
  const existing = await getUserById(id);
  if (!existing) {
    return null;
  }

  // Build dynamic update query
  const updates: string[] = [];
  const params: any[] = [];
  let paramCount = 0;

  const fields = ["username", "email", "role", "is_active"];

  for (const field of fields) {
    if (input[field as keyof UpdateUserInput] !== undefined) {
      paramCount++;
      updates.push(`${field} = $${paramCount}`);
      params.push(input[field as keyof UpdateUserInput]);
    }
  }

  if (updates.length === 0) {
    return existing; // No changes
  }

  updates.push("modified_date = CURRENT_TIMESTAMP");

  paramCount++;
  params.push(id);

  const result = await pool.query<User>(
    `UPDATE users
     SET ${updates.join(", ")}
     WHERE user_id = $${paramCount}
     RETURNING ${USER_FIELDS}`,
    params
  );

  await invalidateCache();
  return normalizeUserRole(result.rows[0]);
};

/**
 * Toggle user active status (lock/unlock account)
 */
export const toggleUserActive = async (id: string): Promise<User | null> => {
  const result = await pool.query<User>(
    `UPDATE users
     SET is_active = NOT is_active,
         modified_date = CURRENT_TIMESTAMP
     WHERE user_id = $1
     RETURNING ${USER_FIELDS}`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const user = normalizeUserRole(result.rows[0]);
  // Best-effort: keep Keycloak in sync with local is_active state
  await syncKeycloakEnabled(id, user.is_active);

  await invalidateCache();
  return user;
};

/**
 * Reset a user's password via Keycloak Admin API.
 * No password is ever stored in our database.
 */
export const resetPassword = async (
  id: string,
  newPassword: string
): Promise<boolean> => {
  const existing = await getUserById(id);
  if (!existing) return false;

  await resetKeycloakPassword(id, newPassword);
  return true;
};

/**
 * Trigger a "reset password" email for a user via Keycloak.
 * The user receives a one-time link to choose their own new password.
 */
export const sendResetPasswordEmail = async (id: string): Promise<boolean> => {
  const existing = await getUserById(id);
  if (!existing) return false;

  await triggerKeycloakResetEmail(id);
  return true;
};

/**
 * Update last_login timestamp for a user
 */
export const updateLastLogin = async (userId: string): Promise<void> => {
  try {
    await pool.query(
      `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1`,
      [userId]
    );
    await invalidateCache();
  } catch (error) {
    console.warn("Failed to update last_login:", error);
  }
};

/**
 * Get admin dashboard statistics
 */
export const getAdminStats = async (): Promise<AdminStats> => {
  // Try cache first
  try {
    const cached = await redisClient.get(CACHE_KEY_STATS);
    if (cached) {
      console.log("✓ Cache hit: admin stats");
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("Redis cache read failed:", error);
  }

  // Get user statistics
  const usersResult = await pool.query<{
    total_users: string;
    active_users: string;
  }>(
    `SELECT 
       COUNT(*) as total_users,
       COUNT(*) FILTER (WHERE is_active = true) as active_users
     FROM users`
  );

  const usersByRoleResult = await pool.query<{ role: string; count: string }>(
    `SELECT role, COUNT(*) as count
     FROM users
     GROUP BY role`
  );

  // Get today's transactions count
  const transactionsResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM inventory_transactions
     WHERE DATE(transaction_date) = CURRENT_DATE`
  );

  // Get lots statistics
  const lotsResult = await pool.query<{
    total_lots: string;
    quarantine_lots: string;
  }>(
    `SELECT 
       COUNT(*) as total_lots,
       COUNT(*) FILTER (WHERE status = 'Quarantine') as quarantine_lots
     FROM inventory_lots`
  );

  // Convert to array format with normalized role names for frontend
  const users_by_role = usersByRoleResult.rows
    .filter((row) => parseInt(row.count) > 0)
    .map((row) => ({
      role: DB_ROLE_TO_API[row.role] ?? row.role,
      count: parseInt(row.count),
    }));

  const stats: AdminStats = {
    total_active_users: parseInt(usersResult.rows[0].active_users),
    today_transactions: parseInt(transactionsResult.rows[0]?.count || "0"),
    total_lots: parseInt(lotsResult.rows[0]?.total_lots || "0"),
    lots_in_quarantine: parseInt(lotsResult.rows[0]?.quarantine_lots || "0"),
    users_by_role,
  };

  // Cache stats for 5 minutes (shorter TTL for dashboard data)
  try {
    await redisClient.setEx(CACHE_KEY_STATS, 300, JSON.stringify(stats));
  } catch (error) {
    console.warn("Redis cache write failed:", error);
  }

  return stats;
};

/**
 * Get system health: ping DB, Redis, Elasticsearch with latency
 */
export const getSystemHealth = async (): Promise<SystemHealth> => {
  const services: ServiceHealth[] = [];

  // Check PostgreSQL
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    services.push({
      name: "PostgreSQL",
      status: "healthy",
      latency_ms: Date.now() - start,
    });
  } catch (error) {
    services.push({
      name: "PostgreSQL",
      status: "unhealthy",
      latency_ms: null,
      message: error instanceof Error ? error.message : "Connection failed",
    });
  }

  // Check Redis
  try {
    const start = Date.now();
    await redisClient.ping();
    services.push({
      name: "Redis",
      status: "healthy",
      latency_ms: Date.now() - start,
    });
  } catch (error) {
    services.push({
      name: "Redis",
      status: "unhealthy",
      latency_ms: null,
      message: error instanceof Error ? error.message : "Connection failed",
    });
  }

  // Check Elasticsearch
  try {
    const esUrl = process.env.ELASTICSEARCH_URL ?? "http://localhost:9200";
    const start = Date.now();
    const res = await fetch(`${esUrl}/_cluster/health`, {
      signal: AbortSignal.timeout(3000),
    });
    const latency = Date.now() - start;
    if (res.ok) {
      const data = (await res.json()) as { status: string };
      services.push({
        name: "Elasticsearch",
        status: data.status === "red" ? "degraded" : "healthy",
        latency_ms: latency,
        message: `Cluster status: ${data.status}`,
      });
    } else {
      services.push({
        name: "Elasticsearch",
        status: "unhealthy",
        latency_ms: latency,
        message: `HTTP ${res.status}`,
      });
    }
  } catch (error) {
    services.push({
      name: "Elasticsearch",
      status: "unhealthy",
      latency_ms: null,
      message: error instanceof Error ? error.message : "Connection failed",
    });
  }

  // Determine overall status
  const hasUnhealthy = services.some((s) => s.status === "unhealthy");
  const hasDegraded = services.some((s) => s.status === "degraded");
  // PostgreSQL is critical - if it's down, overall is unhealthy
  const dbService = services.find((s) => s.name === "PostgreSQL");
  const overall =
    dbService?.status === "unhealthy"
      ? "unhealthy"
      : hasUnhealthy
        ? "degraded"
        : hasDegraded
          ? "degraded"
          : "healthy";

  return {
    overall,
    services,
    timestamp: new Date().toISOString(),
  };
};
