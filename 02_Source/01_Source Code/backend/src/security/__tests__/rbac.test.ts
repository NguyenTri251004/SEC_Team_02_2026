/**
 * RBAC Permission Matrix Tests
 *
 * Verifies that each role has the correct permissions
 * for every resource × action combination.
 */
import {
  UserRole,
  PERMISSIONS,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  checkPermission,
} from "../rbac";

// ═════════════════════════════════════════════════════════════════════════════
describe("Role helper functions", () => {
  describe("hasRole", () => {
    it("returns true when user has the required role", () => {
      expect(hasRole(["admin", "viewer"], UserRole.ADMIN)).toBe(true);
    });

    it("returns false when user lacks the required role", () => {
      expect(hasRole(["viewer"], UserRole.ADMIN)).toBe(false);
    });

    it("returns false for empty roles array", () => {
      expect(hasRole([], UserRole.ADMIN)).toBe(false);
    });
  });

  describe("hasAnyRole", () => {
    it("returns true when user has at least one required role", () => {
      expect(
        hasAnyRole(["viewer"], [UserRole.ADMIN, UserRole.VIEWER])
      ).toBe(true);
    });

    it("returns false when user has none of the required roles", () => {
      expect(
        hasAnyRole(["viewer"], [UserRole.ADMIN, UserRole.INVENTORY_MANAGER])
      ).toBe(false);
    });
  });

  describe("hasAllRoles", () => {
    it("returns true when user has all required roles", () => {
      expect(
        hasAllRoles(["admin", "viewer"], [UserRole.ADMIN, UserRole.VIEWER])
      ).toBe(true);
    });

    it("returns false when user is missing one required role", () => {
      expect(
        hasAllRoles(["admin"], [UserRole.ADMIN, UserRole.VIEWER])
      ).toBe(false);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("Permission matrix — Admin has full access", () => {
  const resources = Object.keys(PERMISSIONS) as Array<keyof typeof PERMISSIONS>;

  for (const resource of resources) {
    const actions = Object.keys(PERMISSIONS[resource]) as string[];
    for (const action of actions) {
      it(`admin can ${action} ${resource}`, () => {
        expect(checkPermission(["admin"], resource, action as any)).toBe(true);
      });
    }
  }
});

// ═════════════════════════════════════════════════════════════════════════════
describe("Permission matrix — Viewer is read-only", () => {
  it("viewer can read materials", () => {
    expect(checkPermission(["viewer"], "materials", "read")).toBe(true);
  });

  it("viewer cannot create materials", () => {
    expect(checkPermission(["viewer"], "materials", "create")).toBe(false);
  });

  it("viewer cannot update materials", () => {
    expect(checkPermission(["viewer"], "materials", "update")).toBe(false);
  });

  it("viewer cannot delete materials", () => {
    expect(checkPermission(["viewer"], "materials", "delete")).toBe(false);
  });

  it("viewer can read lots", () => {
    expect(checkPermission(["viewer"], "lots", "read")).toBe(true);
  });

  it("viewer cannot create lots", () => {
    expect(checkPermission(["viewer"], "lots", "create")).toBe(false);
  });

  it("viewer can read reports", () => {
    expect(checkPermission(["viewer"], "reports", "read")).toBe(true);
  });

  it("viewer cannot export reports", () => {
    expect(checkPermission(["viewer"], "reports", "export")).toBe(false);
  });

  it("viewer cannot manage users", () => {
    expect(checkPermission(["viewer"], "users", "read")).toBe(false);
    expect(checkPermission(["viewer"], "users", "create")).toBe(false);
  });

  it("viewer cannot manage QC", () => {
    expect(checkPermission(["viewer"], "qc", "create")).toBe(false);
    expect(checkPermission(["viewer"], "qc", "approve")).toBe(false);
  });

  it("viewer cannot manage production", () => {
    expect(checkPermission(["viewer"], "production", "create")).toBe(false);
    expect(checkPermission(["viewer"], "production", "consume")).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("Permission matrix — InventoryManager", () => {
  const role = "inventory_manager";

  it("can CRUD materials", () => {
    expect(checkPermission([role], "materials", "read")).toBe(true);
    expect(checkPermission([role], "materials", "create")).toBe(true);
    expect(checkPermission([role], "materials", "update")).toBe(true);
  });

  it("cannot delete materials (admin only)", () => {
    expect(checkPermission([role], "materials", "delete")).toBe(false);
  });

  it("can CRUD lots", () => {
    expect(checkPermission([role], "lots", "read")).toBe(true);
    expect(checkPermission([role], "lots", "create")).toBe(true);
    expect(checkPermission([role], "lots", "update")).toBe(true);
    expect(checkPermission([role], "lots", "updateStatus")).toBe(true);
  });

  it("cannot delete lots", () => {
    expect(checkPermission([role], "lots", "delete")).toBe(false);
  });

  it("can create transactions", () => {
    expect(checkPermission([role], "transactions", "create")).toBe(true);
  });

  it("can read and export reports", () => {
    expect(checkPermission([role], "reports", "read")).toBe(true);
    expect(checkPermission([role], "reports", "export")).toBe(true);
  });

  it("cannot manage QC tests", () => {
    expect(checkPermission([role], "qc", "create")).toBe(false);
    expect(checkPermission([role], "qc", "approve")).toBe(false);
  });

  it("cannot manage users", () => {
    expect(checkPermission([role], "users", "read")).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("Permission matrix — QualityControl", () => {
  const role = "quality_control";

  it("can read materials and lots", () => {
    expect(checkPermission([role], "materials", "read")).toBe(true);
    expect(checkPermission([role], "lots", "read")).toBe(true);
  });

  it("cannot create/update materials", () => {
    expect(checkPermission([role], "materials", "create")).toBe(false);
    expect(checkPermission([role], "materials", "update")).toBe(false);
  });

  it("can update lot status (approve/reject)", () => {
    expect(checkPermission([role], "lots", "updateStatus")).toBe(true);
  });

  it("can CRUD QC tests", () => {
    expect(checkPermission([role], "qc", "read")).toBe(true);
    expect(checkPermission([role], "qc", "create")).toBe(true);
    expect(checkPermission([role], "qc", "update")).toBe(true);
    expect(checkPermission([role], "qc", "approve")).toBe(true);
    expect(checkPermission([role], "qc", "reject")).toBe(true);
  });

  it("cannot create transactions", () => {
    expect(checkPermission([role], "transactions", "create")).toBe(false);
  });

  it("cannot manage production", () => {
    expect(checkPermission([role], "production", "create")).toBe(false);
    expect(checkPermission([role], "production", "consume")).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("Permission matrix — Production", () => {
  const role = "production";

  it("can read materials and lots", () => {
    expect(checkPermission([role], "materials", "read")).toBe(true);
    expect(checkPermission([role], "lots", "read")).toBe(true);
  });

  it("cannot create/update materials", () => {
    expect(checkPermission([role], "materials", "create")).toBe(false);
    expect(checkPermission([role], "materials", "update")).toBe(false);
  });

  it("can CRUD production batches", () => {
    expect(checkPermission([role], "production", "read")).toBe(true);
    expect(checkPermission([role], "production", "create")).toBe(true);
    expect(checkPermission([role], "production", "update")).toBe(true);
    expect(checkPermission([role], "production", "consume")).toBe(true);
  });

  it("can create transactions", () => {
    expect(checkPermission([role], "transactions", "create")).toBe(true);
  });

  it("cannot manage QC tests", () => {
    expect(checkPermission([role], "qc", "create")).toBe(false);
    expect(checkPermission([role], "qc", "approve")).toBe(false);
  });

  it("cannot manage users", () => {
    expect(checkPermission([role], "users", "read")).toBe(false);
  });

  it("can generate labels", () => {
    expect(checkPermission([role], "labels", "generate")).toBe(true);
  });

  it("cannot create/delete label templates", () => {
    expect(checkPermission([role], "labels", "create")).toBe(false);
    expect(checkPermission([role], "labels", "delete")).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("Permission matrix — Cross-role flow validation", () => {
  it("only admin and inventory_manager can create materials", () => {
    const allowed = PERMISSIONS.materials.create;
    expect(allowed).toContain(UserRole.ADMIN);
    expect(allowed).toContain(UserRole.INVENTORY_MANAGER);
    expect(allowed).not.toContain(UserRole.QUALITY_CONTROL);
    expect(allowed).not.toContain(UserRole.PRODUCTION);
    expect(allowed).not.toContain(UserRole.VIEWER);
  });

  it("only admin and quality_control can approve/reject QC", () => {
    const approveAllowed = PERMISSIONS.qc.approve;
    expect(approveAllowed).toContain(UserRole.ADMIN);
    expect(approveAllowed).toContain(UserRole.QUALITY_CONTROL);
    expect(approveAllowed).toHaveLength(2);
  });

  it("only admin can manage users", () => {
    const userActions = Object.values(PERMISSIONS.users);
    userActions.forEach((roles) => {
      expect(roles).toEqual([UserRole.ADMIN]);
    });
  });

  it("only admin can delete materials", () => {
    expect(PERMISSIONS.materials.delete).toEqual([UserRole.ADMIN]);
  });

  it("only admin can update config", () => {
    expect(PERMISSIONS.config.update).toEqual([UserRole.ADMIN]);
  });

  it("production, admin, and inventory_manager can create transactions", () => {
    const allowed = PERMISSIONS.transactions.create;
    expect(allowed).toContain(UserRole.ADMIN);
    expect(allowed).toContain(UserRole.INVENTORY_MANAGER);
    expect(allowed).toContain(UserRole.PRODUCTION);
    expect(allowed).not.toContain(UserRole.QUALITY_CONTROL);
    expect(allowed).not.toContain(UserRole.VIEWER);
  });
});
