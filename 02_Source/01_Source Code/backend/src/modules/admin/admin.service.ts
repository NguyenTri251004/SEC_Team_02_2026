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
} from "./admin.types";
import crypto from "crypto";

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
 * Simple password hashing (for development)
 * TODO: Use bcrypt in production
 */
const hashPassword = (password: string): string => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

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
  let query = `
    SELECT user_id, username, email, role, is_active, last_login, created_date, modified_date
    FROM users
    WHERE 1=1
  `;
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
    `SELECT user_id, username, email, role, is_active, last_login, created_date, modified_date
     FROM users
     WHERE user_id = $1`,
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
 * Create new user
 */
export const createUser = async (input: CreateUserInput): Promise<User> => {
  const hashedPassword = hashPassword(input.password);

  const result = await pool.query<User>(
    `INSERT INTO users (user_id, username, email, password, role, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING user_id, username, email, role, is_active, last_login, created_date, modified_date`,
    [
      input.user_id,
      input.username,
      input.email,
      hashedPassword,
      input.role,
      input.is_active ?? true,
    ]
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
     RETURNING user_id, username, email, role, is_active, last_login, created_date, modified_date`,
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
     RETURNING user_id, username, email, role, is_active, last_login, created_date, modified_date`,
    [id]
  );

  if (result.rows.length === 0) {
    return null;
  }

  await invalidateCache();
  return normalizeUserRole(result.rows[0]);
};

/**
 * Admin reset user password
 */
export const resetPassword = async (
  id: string,
  newPassword: string
): Promise<boolean> => {
  const hashedPassword = hashPassword(newPassword);

  const result = await pool.query(
    `UPDATE users
     SET password = $1,
         modified_date = CURRENT_TIMESTAMP
     WHERE user_id = $2`,
    [hashedPassword, id]
  );

  return result.rowCount ? result.rowCount > 0 : false;
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

  // Build stats object with normalized role names for frontend compatibility
  const usersByRole: AdminStats["usersByRole"] = {
    Admin: 0,
    InventoryManager: 0,
    QualityControl: 0,
    Production: 0,
    Viewer: 0,
  };

  usersByRoleResult.rows.forEach((row) => {
    const role = row.role as keyof typeof usersByRole;
    usersByRole[role] = parseInt(row.count);
  });

  // Convert usersByRole object to array format with normalized role names
  const users_by_role = Object.entries(usersByRole)
    .filter(([, count]) => count > 0)
    .map(([role, count]) => ({
      role: DB_ROLE_TO_API[role] ?? role,
      count,
    }));

  const stats: AdminStats = {
    totalUsers: parseInt(usersResult.rows[0].total_users),
    activeUsers: parseInt(usersResult.rows[0].active_users),
    usersByRole,
    users_by_role,
    todayTransactions: parseInt(transactionsResult.rows[0]?.count || "0"),
    totalLots: parseInt(lotsResult.rows[0]?.total_lots || "0"),
    quarantineLots: parseInt(lotsResult.rows[0]?.quarantine_lots || "0"),
  };

  // Cache stats for 5 minutes (shorter TTL for dashboard data)
  try {
    await redisClient.setEx(CACHE_KEY_STATS, 300, JSON.stringify(stats));
  } catch (error) {
    console.warn("Redis cache write failed:", error);
  }

  return stats;
};
