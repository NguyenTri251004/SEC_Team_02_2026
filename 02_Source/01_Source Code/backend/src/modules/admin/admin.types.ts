/**
 * User entity — no password field; authentication is handled by Keycloak.
 * `user_id` equals the Keycloak subject (sub) claim.
 */
export interface User {
  user_id: string;
  keycloak_sub: string; // alias for user_id — same value
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * User role enum matching database CHECK constraint
 */
export enum UserRole {
  ADMIN = "Admin",
  INVENTORY_MANAGER = "InventoryManager",
  QUALITY_CONTROL = "QualityControl",
  PRODUCTION = "Production",
  VIEWER = "Viewer",
}

/**
 * Map DB role (PascalCase) → API role (snake_case) for frontend compatibility
 */
export const DB_ROLE_TO_API: Record<string, string> = {
  Admin: "admin",
  InventoryManager: "inventory_manager",
  QualityControl: "quality_control",
  Production: "production",
  Viewer: "viewer",
};

/**
 * Map API role (snake_case) → DB role (PascalCase) for writes
 */
export const API_ROLE_TO_DB: Record<string, string> = {
  admin: "Admin",
  inventory_manager: "InventoryManager",
  quality_control: "QualityControl",
  production: "Production",
  viewer: "Viewer",
};

/**
 * Input for creating a new user.
 * `user_id` is NOT accepted from the caller — it comes from Keycloak after registration.
 */
export interface CreateUserInput {
  username: string;
  email: string;
  /** Initial password forwarded to Keycloak; never stored in our database. */
  initial_password: string;
  role: UserRole;
  is_active?: boolean;
}

/**
 * Input for updating an existing user
 */
export interface UpdateUserInput {
  username?: string;
  email?: string;
  role?: UserRole;
  is_active?: boolean;
}

/**
 * Admin dashboard statistics
 */
export interface AdminStats {
  total_active_users: number;
  today_transactions: number;
  total_lots: number;
  lots_in_quarantine: number;
  users_by_role: { role: string; count: number }[];
}

/**
 * Filters for getting users list
 */
export interface GetUsersFilters {
  role?: UserRole;
  is_active?: boolean;
  search?: string; // Search by username or email
}
