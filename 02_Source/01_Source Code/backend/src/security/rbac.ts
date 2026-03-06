import { Request, Response, NextFunction } from "express";

// Định nghĩa các role trong hệ thống
export enum UserRole {
  ADMIN = "admin",
  INVENTORY_MANAGER = "inventory_manager",
  QUALITY_CONTROL = "quality_control",
  PRODUCTION = "production",
  VIEWER = "viewer",
}

type PermissionActions = Record<string, UserRole[]>;

// Permission matrix - Định nghĩa quyền truy cập cho từng resource
export const PERMISSIONS = {
  materials: {
    read: [
      UserRole.ADMIN,
      UserRole.INVENTORY_MANAGER,
      UserRole.QUALITY_CONTROL,
      UserRole.PRODUCTION,
      UserRole.VIEWER,
    ],
    create: [UserRole.ADMIN, UserRole.INVENTORY_MANAGER],
    update: [UserRole.ADMIN, UserRole.INVENTORY_MANAGER],
    delete: [UserRole.ADMIN],
  },
  lots: {
    read: [
      UserRole.ADMIN,
      UserRole.INVENTORY_MANAGER,
      UserRole.QUALITY_CONTROL,
      UserRole.PRODUCTION,
      UserRole.VIEWER,
    ],
    create: [UserRole.ADMIN, UserRole.INVENTORY_MANAGER],
    update: [UserRole.ADMIN, UserRole.INVENTORY_MANAGER],
    updateStatus: [UserRole.ADMIN, UserRole.INVENTORY_MANAGER, UserRole.QUALITY_CONTROL],
    delete: [UserRole.ADMIN],
  },
  transactions: {
    read: [
      UserRole.ADMIN,
      UserRole.INVENTORY_MANAGER,
      UserRole.QUALITY_CONTROL,
      UserRole.PRODUCTION,
      UserRole.VIEWER,
    ],
    create: [
      UserRole.ADMIN,
      UserRole.INVENTORY_MANAGER,
      UserRole.PRODUCTION,
    ],
    update: [UserRole.ADMIN, UserRole.INVENTORY_MANAGER],
    delete: [UserRole.ADMIN],
  },
  search: {
    read: [
      UserRole.ADMIN,
      UserRole.INVENTORY_MANAGER,
      UserRole.QUALITY_CONTROL,
      UserRole.PRODUCTION,
      UserRole.VIEWER,
    ],
    index: [UserRole.ADMIN, UserRole.INVENTORY_MANAGER],
  },
  reports: {
    read: [
      UserRole.ADMIN,
      UserRole.INVENTORY_MANAGER,
      UserRole.QUALITY_CONTROL,
      UserRole.VIEWER,
    ],
    export: [UserRole.ADMIN, UserRole.INVENTORY_MANAGER],
  },
  users: {
    read: [UserRole.ADMIN],
    create: [UserRole.ADMIN],
    update: [UserRole.ADMIN],
    delete: [UserRole.ADMIN],
  },
  production: {
    read: [
      UserRole.ADMIN,
      UserRole.INVENTORY_MANAGER,
      UserRole.PRODUCTION,
      UserRole.VIEWER,
    ],
    create: [UserRole.ADMIN, UserRole.PRODUCTION],
    update: [UserRole.ADMIN, UserRole.PRODUCTION],
    consume: [UserRole.ADMIN, UserRole.PRODUCTION],
  },
  config: {
    read: [UserRole.ADMIN],
    update: [UserRole.ADMIN],
  },
} satisfies Record<string, PermissionActions>;

type PermissionResource = keyof typeof PERMISSIONS;
type PermissionAction<R extends PermissionResource> = Extract<
  keyof (typeof PERMISSIONS)[R],
  string
>;

const getAllowedRoles = (
  resource: PermissionResource,
  action: string
): UserRole[] => {
  const resourcePermissions = PERMISSIONS[resource] as PermissionActions;
  return resourcePermissions[action] ?? [];
};

/**
 * Kiểm tra xem user có role cụ thể không
 */
export const hasRole = (
  userRoles: string[],
  requiredRole: UserRole
): boolean => {
  return userRoles.includes(requiredRole);
};

/**
 * Kiểm tra xem user có ít nhất một trong các role yêu cầu không
 */
export const hasAnyRole = (
  userRoles: string[],
  requiredRoles: UserRole[]
): boolean => {
  return requiredRoles.some((role) => userRoles.includes(role));
};

/**
 * Kiểm tra xem user có tất cả các role yêu cầu không
 */
export const hasAllRoles = (
  userRoles: string[],
  requiredRoles: UserRole[]
): boolean => {
  return requiredRoles.every((role) => userRoles.includes(role));
};

/**
 * Middleware kiểm tra role - Yêu cầu ít nhất một role trong danh sách
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized - User not authenticated",
      });
      return;
    }

    const userRoles = req.user.roles || [];

    if (!hasAnyRole(userRoles, allowedRoles)) {
      res.status(403).json({
        success: false,
        error: "Forbidden - Insufficient permissions",
        required: allowedRoles,
        current: userRoles,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware kiểm tra quyền truy cập resource
 */
export const requirePermission = <R extends PermissionResource>(
  resource: R,
  action: PermissionAction<R>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthorized - User not authenticated",
      });
      return;
    }

    const userRoles = req.user.roles || [];
    const allowedRoles = getAllowedRoles(resource, String(action));

    if (!hasAnyRole(userRoles, allowedRoles)) {
      res.status(403).json({
        success: false,
        error: `Forbidden - No permission to ${String(action)} ${String(resource)}`,
        required_roles: allowedRoles,
        user_roles: userRoles,
      });
      return;
    }

    next();
  };
};

/**
 * Middleware chỉ admin mới được truy cập
 */
export const adminOnly = requireRole(UserRole.ADMIN);

/**
 * Middleware cho inventory managers và admins
 */
export const inventoryManagerOrAdmin = requireRole(
  UserRole.ADMIN,
  UserRole.INVENTORY_MANAGER
);

/**
 * Helper function: Kiểm tra user có permission không (không phải middleware)
 */
export const checkPermission = <R extends PermissionResource>(
  userRoles: string[],
  resource: R,
  action: PermissionAction<R>
): boolean => {
  const allowedRoles = getAllowedRoles(resource, String(action));
  return hasAnyRole(userRoles, allowedRoles);
};
