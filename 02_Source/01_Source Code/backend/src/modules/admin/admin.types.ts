/**
 * User entity (without password for security)
 */
export interface User {
  user_id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login: Date | null;
  created_date: Date;
  modified_date: Date;
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
 * Input for creating a new user
 */
export interface CreateUserInput {
  user_id: string;
  username: string;
  email: string;
  password: string;
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
  totalUsers: number;
  activeUsers: number;
  usersByRole: {
    Admin: number;
    InventoryManager: number;
    QualityControl: number;
    Production: number;
    Viewer: number;
  };
  todayTransactions: number;
  totalLots: number;
  quarantineLots: number;
}

/**
 * Filters for getting users list
 */
export interface GetUsersFilters {
  role?: UserRole;
  is_active?: boolean;
  search?: string; // Search by username or email
}
