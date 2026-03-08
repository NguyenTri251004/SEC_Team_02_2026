import { Tag, Badge } from "antd";
import type { Key } from "react";
import {
  TXN_TYPE_TAG,
  LOT_STATUS_TAG,
  BATCH_STATUS_TAG,
} from "../../../constants/theme";
import { ROLE_TAG } from "../../../constants/roles";
import type { UserRole } from "../../../types";

/**
 * Reusable column factory functions for dashboard tables
 * Standardizes sorting, filtering, and rendering across all dashboards
 */

// ============================================================
// Transaction Columns
// ============================================================

export function createTransactionTypeColumn<
  T extends { transaction_type: string },
>() {
  return {
    title: "Type",
    dataIndex: "transaction_type" as keyof T,
    key: "type",
    sorter: (a: T, b: T) =>
      a.transaction_type.localeCompare(b.transaction_type),
    render: (v: string) => {
      const cfg = TXN_TYPE_TAG[v];
      return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{v}</Tag>;
    },
  };
}

export function createTransactionDateColumn<
  T extends { transaction_date: string },
>() {
  return {
    title: "Date",
    dataIndex: "transaction_date" as keyof T,
    key: "date",
    sorter: (a: T, b: T) =>
      new Date(a.transaction_date).getTime() -
      new Date(b.transaction_date).getTime(),
    defaultSortOrder: "descend" as const,
    render: (v: string) => new Date(v).toLocaleString(),
  };
}

export function createQuantityColumn<
  T extends { quantity: number; unit_of_measure: string },
>() {
  return {
    title: "Qty",
    dataIndex: "quantity" as keyof T,
    key: "qty",
    sorter: (a: T, b: T) => a.quantity - b.quantity,
    render: (v: number, r: T) => `${v > 0 ? "+" : ""}${v} ${r.unit_of_measure}`,
  };
}

export function createLotIdColumn<T extends { lot_id: string }>() {
  return {
    title: "Lot",
    dataIndex: "lot_id" as keyof T,
    key: "lot",
    sorter: (a: T, b: T) => a.lot_id.localeCompare(b.lot_id),
  };
}

export function createMaterialNameColumn<
  T extends { material_name?: string },
>() {
  return {
    title: "Material",
    dataIndex: "material_name" as keyof T,
    key: "material",
    sorter: (a: T, b: T) =>
      (a.material_name ?? "").localeCompare(b.material_name ?? ""),
  };
}

// ============================================================
// Lot Columns
// ============================================================

export function createLotStatusColumn<T extends { status: string }>() {
  return {
    title: "Status",
    dataIndex: "status" as keyof T,
    key: "status",
    filters: [
      { text: "Accepted", value: "Accepted" },
      { text: "Quarantine", value: "Quarantine" },
      { text: "Rejected", value: "Rejected" },
    ],
    onFilter: (value: boolean | Key, record: T) =>
      record.status === String(value),
    render: (v: string) => {
      const cfg = LOT_STATUS_TAG[v];
      return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{v}</Tag>;
    },
  };
}

export function createExpirationDateColumn<
  T extends { expiration_date: string },
>() {
  return {
    title: "Expiry",
    dataIndex: "expiration_date" as keyof T,
    key: "expiry",
    sorter: (a: T, b: T) =>
      new Date(a.expiration_date).getTime() -
      new Date(b.expiration_date).getTime(),
  };
}

export function createDaysToExpiryColumn<
  T extends { days_to_expiry: number },
>() {
  return {
    title: "Days",
    dataIndex: "days_to_expiry" as keyof T,
    key: "days",
    sorter: (a: T, b: T) => a.days_to_expiry - b.days_to_expiry,
    render: (v: number) => (
      <Tag color={v <= 7 ? "red" : v <= 30 ? "orange" : "default"}>{v}d</Tag>
    ),
  };
}

// ============================================================
// Production Batch Columns
// ============================================================

export function createBatchNumberColumn<T extends { batch_number: string }>() {
  return {
    title: "Batch #",
    dataIndex: "batch_number" as keyof T,
    key: "batch",
    sorter: (a: T, b: T) => a.batch_number.localeCompare(b.batch_number),
  };
}

export function createProductNameColumn<T extends { product_name?: string }>() {
  return {
    title: "Product",
    dataIndex: "product_name" as keyof T,
    key: "product",
    sorter: (a: T, b: T) =>
      (a.product_name ?? "").localeCompare(b.product_name ?? ""),
  };
}

export function createBatchStatusColumn<T extends { status: string }>() {
  return {
    title: "Status",
    dataIndex: "status" as keyof T,
    key: "status",
    filters: [
      { text: "Planned", value: "Planned" },
      { text: "In Progress", value: "In Progress" },
      { text: "Completed", value: "Completed" },
      { text: "Rejected", value: "Rejected" },
    ],
    onFilter: (value: boolean | Key, record: T) =>
      record.status === String(value),
    render: (v: string) => {
      const cfg = BATCH_STATUS_TAG[v];
      return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{v}</Tag>;
    },
  };
}

export function createManufactureDateColumn<
  T extends { manufacture_date: string },
>() {
  return {
    title: "Mfg Date",
    dataIndex: "manufacture_date" as keyof T,
    key: "mfg",
    sorter: (a: T, b: T) =>
      new Date(a.manufacture_date).getTime() -
      new Date(b.manufacture_date).getTime(),
    defaultSortOrder: "descend" as const,
  };
}

// ============================================================
// User Columns
// ============================================================

export function createUsernameColumn<T extends { username: string }>() {
  return {
    title: "Username",
    dataIndex: "username" as keyof T,
    key: "username",
    sorter: (a: T, b: T) => a.username.localeCompare(b.username),
  };
}

export function createUserRoleColumn<T extends { role: UserRole }>() {
  return {
    title: "Role",
    dataIndex: "role" as keyof T,
    key: "role",
    sorter: (a: T, b: T) => a.role.localeCompare(b.role),
    filters: [
      { text: "Admin", value: "admin" },
      { text: "Inventory Manager", value: "inventory_manager" },
      { text: "Quality Control", value: "quality_control" },
      { text: "Production", value: "production" },
      { text: "Viewer", value: "viewer" },
    ],
    onFilter: (value: boolean | Key, record: T) =>
      record.role === String(value),
    render: (v: UserRole) => {
      const cfg = ROLE_TAG[v];
      return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{v}</Tag>;
    },
  };
}

export function createLastLoginColumn<
  T extends { last_login_at: string | null },
>() {
  return {
    title: "Last Login",
    dataIndex: "last_login_at" as keyof T,
    key: "login",
    sorter: (a: T, b: T) => {
      if (!a.last_login_at) return -1;
      if (!b.last_login_at) return 1;
      return (
        new Date(a.last_login_at).getTime() -
        new Date(b.last_login_at).getTime()
      );
    },
    defaultSortOrder: "descend" as const,
    render: (v: string | null) => (v ? new Date(v).toLocaleString() : "—"),
  };
}

export function createUserStatusColumn<T extends { is_active: boolean }>() {
  return {
    title: "Status",
    dataIndex: "is_active" as keyof T,
    key: "status",
    filters: [
      { text: "Active", value: true },
      { text: "Inactive", value: false },
    ],
    onFilter: (value: boolean | Key, record: T) =>
      record.is_active === (value === true || value === "true"),
    render: (v: boolean) =>
      v ? (
        <Badge status="success" text="Active" />
      ) : (
        <Badge status="default" text="Inactive" />
      ),
  };
}

// ============================================================
// QC Queue Columns
// ============================================================

export function createSupplierNameColumn<
  T extends { supplier_name: string },
>() {
  return {
    title: "Supplier",
    dataIndex: "supplier_name" as keyof T,
    key: "supplier",
    sorter: (a: T, b: T) => a.supplier_name.localeCompare(b.supplier_name),
  };
}

export function createMaterialTypeColumn<
  T extends { material_type: string },
>() {
  return {
    title: "Type",
    dataIndex: "material_type" as keyof T,
    key: "type",
    filters: [
      { text: "API", value: "API" },
      { text: "Excipient", value: "Excipient" },
      { text: "Container", value: "Container" },
      { text: "Label", value: "Label" },
    ],
    onFilter: (value: boolean | Key, record: T) =>
      record.material_type === String(value),
  };
}

export function createWaitTimeColumn<T extends { wait_time_hours: number }>() {
  return {
    title: "Wait",
    dataIndex: "wait_time_hours" as keyof T,
    key: "wait",
    sorter: (a: T, b: T) => a.wait_time_hours - b.wait_time_hours,
    defaultSortOrder: "descend" as const,
    render: (v: number) => {
      const days = Math.floor(v / 24);
      return (
        <Tag color={v >= 48 ? "red" : v >= 24 ? "orange" : "default"}>
          {days}d {v % 24}h
        </Tag>
      );
    },
  };
}

export function createReceivedDateColumn<
  T extends { received_date: string },
>() {
  return {
    title: "Received",
    dataIndex: "received_date" as keyof T,
    key: "received",
    sorter: (a: T, b: T) =>
      new Date(a.received_date).getTime() - new Date(b.received_date).getTime(),
  };
}

// ============================================================
// Generic Columns
// ============================================================

export function createPerformedByColumn<T extends { performed_by: string }>() {
  return {
    title: "By",
    dataIndex: "performed_by" as keyof T,
    key: "by",
  };
}

export function createStorageLocationColumn<
  T extends { storage_location: string },
>() {
  return {
    title: "Location",
    dataIndex: "storage_location" as keyof T,
    key: "loc",
  };
}

// ============================================================
// Materials Columns
// ============================================================

export function createMaterialIdColumn<T extends { material_id: string }>() {
  return {
    title: "ID",
    dataIndex: "material_id" as keyof T,
    key: "material_id",
    sorter: (a: T, b: T) => a.material_id.localeCompare(b.material_id),
    render: (v: string) => <span style={{ fontFamily: "monospace", fontSize: "12px" }}>{v}</span>,
  };
}

export function createPartNumberColumn<T extends { part_number: string }>() {
  return {
    title: "Part Number",
    dataIndex: "part_number" as keyof T,
    key: "part_number",
    sorter: (a: T, b: T) => a.part_number.localeCompare(b.part_number),
    render: (v: string) => <strong>{v}</strong>,
  };
}

export function createMasterMaterialTypeColumn<T extends { material_type: string }>() {
  return {
    title: "Type",
    dataIndex: "material_type" as keyof T,
    key: "material_type",
    filters: [
      { text: "API", value: "API" },
      { text: "Excipient", value: "Excipient" },
      { text: "Dietary Supplement", value: "Dietary Supplement" },
      { text: "Container", value: "Container" },
      { text: "Closure", value: "Closure" },
      { text: "Process Chemical", value: "Process Chemical" },
      { text: "Testing Material", value: "Testing Material" },
    ],
    onFilter: (value: boolean | Key, record: T) => record.material_type === String(value),
    render: (type: string) => {
      const colorMap: Record<string, string> = {
        "API": "red",
        "Excipient": "blue",
        "Dietary Supplement": "green",
        "Container": "orange",
        "Closure": "purple",
        "Process Chemical": "cyan",
        "Testing Material": "magenta",
      };
      return <Tag color={colorMap[type] ?? "default"}>{type}</Tag>;
    },
  };
}

export function createStorageConditionsColumn<T extends { storage_conditions: string | null }>() {
  return {
    title: "Storage",
    dataIndex: "storage_conditions" as keyof T,
    key: "storage_conditions",
    render: (v: string | null) => v ? v : <span style={{ color: "#999", fontStyle: "italic" }}>N/A</span>,
  };
}

export function createCreatedDateColumn<T extends { created_date: string }>() {
  return {
    title: "Created",
    dataIndex: "created_date" as keyof T,
    key: "created_date",
    sorter: (a: T, b: T) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime(),
    render: (v: string) => new Date(v).toLocaleDateString(),
  };
}