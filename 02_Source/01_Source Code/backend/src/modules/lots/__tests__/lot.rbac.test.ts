import {
  PERMISSIONS,
  UserRole,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  checkPermission,
} from "../../../security/rbac";

describe("RBAC - Lots Permissions", () => {
  // ========================================
  // Permission matrix validation
  // ========================================
  describe("Permission matrix for lots", () => {
    it("should have lots resource defined", () => {
      expect(PERMISSIONS.lots).toBeDefined();
    });

    it("should define read, create, update, updateStatus, delete actions", () => {
      expect(PERMISSIONS.lots.read).toBeDefined();
      expect(PERMISSIONS.lots.create).toBeDefined();
      expect(PERMISSIONS.lots.update).toBeDefined();
      expect(PERMISSIONS.lots.updateStatus).toBeDefined();
      expect(PERMISSIONS.lots.delete).toBeDefined();
    });

    // READ: all roles
    it("read should be allowed for all roles", () => {
      expect(PERMISSIONS.lots.read).toContain(UserRole.ADMIN);
      expect(PERMISSIONS.lots.read).toContain(UserRole.INVENTORY_MANAGER);
      expect(PERMISSIONS.lots.read).toContain(UserRole.QUALITY_CONTROL);
      expect(PERMISSIONS.lots.read).toContain(UserRole.PRODUCTION);
      expect(PERMISSIONS.lots.read).toContain(UserRole.VIEWER);
    });

    // CREATE: admin + inventory_manager
    it("create should be allowed for admin and inventory_manager only", () => {
      expect(PERMISSIONS.lots.create).toContain(UserRole.ADMIN);
      expect(PERMISSIONS.lots.create).toContain(UserRole.INVENTORY_MANAGER);
      expect(PERMISSIONS.lots.create).not.toContain(UserRole.QUALITY_CONTROL);
      expect(PERMISSIONS.lots.create).not.toContain(UserRole.PRODUCTION);
      expect(PERMISSIONS.lots.create).not.toContain(UserRole.VIEWER);
    });

    // UPDATE: admin + inventory_manager
    it("update should be allowed for admin and inventory_manager only", () => {
      expect(PERMISSIONS.lots.update).toContain(UserRole.ADMIN);
      expect(PERMISSIONS.lots.update).toContain(UserRole.INVENTORY_MANAGER);
      expect(PERMISSIONS.lots.update).not.toContain(UserRole.QUALITY_CONTROL);
      expect(PERMISSIONS.lots.update).not.toContain(UserRole.PRODUCTION);
      expect(PERMISSIONS.lots.update).not.toContain(UserRole.VIEWER);
    });

    // UPDATE STATUS: admin + inventory_manager + quality_control
    it("updateStatus should be allowed for admin, inventory_manager, and quality_control", () => {
      expect(PERMISSIONS.lots.updateStatus).toContain(UserRole.ADMIN);
      expect(PERMISSIONS.lots.updateStatus).toContain(
        UserRole.INVENTORY_MANAGER,
      );
      expect(PERMISSIONS.lots.updateStatus).toContain(UserRole.QUALITY_CONTROL);
      expect(PERMISSIONS.lots.updateStatus).not.toContain(UserRole.PRODUCTION);
      expect(PERMISSIONS.lots.updateStatus).not.toContain(UserRole.VIEWER);
    });

    // DELETE: admin only
    it("delete should be allowed for admin only", () => {
      expect(PERMISSIONS.lots.delete).toContain(UserRole.ADMIN);
      expect(PERMISSIONS.lots.delete).not.toContain(UserRole.INVENTORY_MANAGER);
      expect(PERMISSIONS.lots.delete).not.toContain(UserRole.QUALITY_CONTROL);
      expect(PERMISSIONS.lots.delete).not.toContain(UserRole.PRODUCTION);
      expect(PERMISSIONS.lots.delete).not.toContain(UserRole.VIEWER);
    });
  });

  // ========================================
  // Helper functions
  // ========================================
  describe("hasRole", () => {
    it("should return true when user has the role", () => {
      expect(hasRole(["admin", "viewer"], UserRole.ADMIN)).toBe(true);
    });

    it("should return false when user does not have the role", () => {
      expect(hasRole(["viewer"], UserRole.ADMIN)).toBe(false);
    });

    it("should return false for empty roles", () => {
      expect(hasRole([], UserRole.ADMIN)).toBe(false);
    });
  });

  describe("hasAnyRole", () => {
    it("should return true if user has at least one required role", () => {
      expect(hasAnyRole(["viewer"], [UserRole.VIEWER, UserRole.ADMIN])).toBe(
        true,
      );
    });

    it("should return false if user has none of the required roles", () => {
      expect(
        hasAnyRole(["viewer"], [UserRole.ADMIN, UserRole.INVENTORY_MANAGER]),
      ).toBe(false);
    });

    it("should return false for empty user roles", () => {
      expect(hasAnyRole([], [UserRole.ADMIN])).toBe(false);
    });
  });

  describe("hasAllRoles", () => {
    it("should return true if user has all required roles", () => {
      expect(
        hasAllRoles(
          ["admin", "inventory_manager"],
          [UserRole.ADMIN, UserRole.INVENTORY_MANAGER],
        ),
      ).toBe(true);
    });

    it("should return false if user is missing a required role", () => {
      expect(
        hasAllRoles(["admin"], [UserRole.ADMIN, UserRole.INVENTORY_MANAGER]),
      ).toBe(false);
    });
  });

  describe("checkPermission", () => {
    it("admin should have lots:read permission", () => {
      expect(checkPermission(["admin"], "lots", "read")).toBe(true);
    });

    it("viewer should have lots:read permission", () => {
      expect(checkPermission(["viewer"], "lots", "read")).toBe(true);
    });

    it("viewer should NOT have lots:create permission", () => {
      expect(checkPermission(["viewer"], "lots", "create")).toBe(false);
    });

    it("inventory_manager should have lots:create permission", () => {
      expect(checkPermission(["inventory_manager"], "lots", "create")).toBe(
        true,
      );
    });

    it("quality_control should have lots:updateStatus permission", () => {
      expect(checkPermission(["quality_control"], "lots", "updateStatus")).toBe(
        true,
      );
    });

    it("production should NOT have lots:updateStatus permission", () => {
      expect(checkPermission(["production"], "lots", "updateStatus")).toBe(
        false,
      );
    });

    it("production should NOT have lots:delete permission", () => {
      expect(checkPermission(["production"], "lots", "delete")).toBe(false);
    });

    it("admin should have lots:delete permission", () => {
      expect(checkPermission(["admin"], "lots", "delete")).toBe(true);
    });

    it("should return false for non-existent action", () => {
      expect(checkPermission(["admin"], "lots", "nonexistent" as never)).toBe(
        false,
      );
    });
  });
});
