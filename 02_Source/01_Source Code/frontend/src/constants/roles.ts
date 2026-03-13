import type { UserRole } from "../types";

export const ROLE_TAG: Record<UserRole, { color: string; label: string }> = {
  admin: { color: "red", label: "Admin" },
  inventory_manager: { color: "blue", label: "Inventory Manager" },
  quality_control: { color: "green", label: "Quality Control" },
  production: { color: "orange", label: "Production" },
  viewer: { color: "default", label: "Viewer" },
};

export const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  ...Object.entries(ROLE_TAG).map(([value, { label }]) => ({
    value,
    label,
  })),
];

// test commit frontend 1