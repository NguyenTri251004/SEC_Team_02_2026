import { useState } from "react";
import {
  Drawer,
  Descriptions,
  Tag,
  Button,
  Space,
  Select,
  Input,
  message,
  Divider,
  Table,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { useUpdateLotStatus } from "@/hooks/useLotsData";
import { useTransactions } from "@/hooks/useTransactionsData";
import { LOT_STATUS_TAG, TXN_TYPE_TAG } from "@/constants/theme";
import type { InventoryLot, InventoryTransaction, LotStatus } from "@/types";

interface LotDetailDrawerProps {
  lot: InventoryLot | null;
  onClose: () => void;
}

export function LotDetailDrawer({ lot, onClose }: LotDetailDrawerProps) {
  const { mutateAsync: updateStatus, isPending } = useUpdateLotStatus();
  const { data: allTransactions = [] } = useTransactions();
  const [newStatus, setNewStatus] = useState<LotStatus | null>(null);
  const [reason, setReason] = useState("");

  if (!lot) return null;

  const lotTransactions = allTransactions.filter((t) => t.lot_id === lot.lot_id);

  const statusCfg = LOT_STATUS_TAG[lot.status];

  const availableStatuses: LotStatus[] =
    lot.status === "Quarantine"
      ? ["Accepted", "Rejected"]
      : lot.status === "Accepted"
        ? ["Depleted", "Rejected"]
        : [];

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    try {
      await updateStatus({ lotId: lot.lot_id, status: newStatus, reason });
      message.success(`Lot status updated to ${newStatus}`);
      setNewStatus(null);
      setReason("");
    } catch (error: any) {
      message.error(error.response?.data?.error || error.message || "Failed to update status");
    }
  };

  const txnColumns: ColumnsType<InventoryTransaction> = [
    { title: "ID", dataIndex: "transaction_id", key: "id", width: 100 },
    {
      title: "Type",
      dataIndex: "transaction_type",
      key: "type",
      width: 100,
      render: (type: string) => {
        const cfg = TXN_TYPE_TAG[type];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : type;
      },
    },
    {
      title: "Qty",
      key: "qty",
      width: 100,
      render: (_, r) => (
        <span style={{ color: r.quantity < 0 ? "#ff4d4f" : "#52c41a" }}>
          {r.quantity > 0 ? "+" : ""}
          {r.quantity} {r.unit_of_measure}
        </span>
      ),
    },
    {
      title: "Date",
      dataIndex: "transaction_date",
      key: "date",
      width: 130,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
    },
    { title: "Notes", dataIndex: "notes", key: "notes", ellipsis: true },
  ];

  return (
    <Drawer
      title={`Lot Detail: ${lot.lot_id}`}
      open={!!lot}
      onClose={onClose}
      width={640}
    >
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="Lot ID">{lot.lot_id}</Descriptions.Item>
        <Descriptions.Item label="Status">
          {statusCfg ? <Tag color={statusCfg.color}>{statusCfg.label}</Tag> : lot.status}
        </Descriptions.Item>
        <Descriptions.Item label="Material">{lot.material_name ?? lot.material_id}</Descriptions.Item>
        <Descriptions.Item label="Type">{lot.material_type}</Descriptions.Item>
        <Descriptions.Item label="Manufacturer">{lot.manufacturer_name}</Descriptions.Item>
        <Descriptions.Item label="Mfg Lot">{lot.manufacturer_lot}</Descriptions.Item>
        <Descriptions.Item label="Supplier">{lot.supplier_name}</Descriptions.Item>
        <Descriptions.Item label="Quantity">
          {lot.quantity} {lot.unit_of_measure}
        </Descriptions.Item>
        <Descriptions.Item label="Received">{dayjs(lot.received_date).format("YYYY-MM-DD")}</Descriptions.Item>
        <Descriptions.Item label="Expires">{dayjs(lot.expiration_date).format("YYYY-MM-DD")}</Descriptions.Item>
        <Descriptions.Item label="Location">{lot.storage_location || "-"}</Descriptions.Item>
        <Descriptions.Item label="PO">{lot.po_number || "-"}</Descriptions.Item>
        <Descriptions.Item label="Sample">{lot.is_sample ? "Yes" : "No"}</Descriptions.Item>
        <Descriptions.Item label="Parent Lot">{lot.parent_lot_id || "-"}</Descriptions.Item>
      </Descriptions>

      {availableStatuses.length > 0 && (
        <>
          <Divider>Update Status</Divider>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Select
              placeholder="Select new status"
              value={newStatus}
              onChange={setNewStatus}
              style={{ width: "100%" }}
              options={availableStatuses.map((s) => ({ value: s, label: s }))}
            />
            {newStatus === "Rejected" && (
              <Input.TextArea
                placeholder="Reason for rejection (required)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
              />
            )}
            <Button
              type="primary"
              onClick={handleStatusUpdate}
              loading={isPending}
              disabled={!newStatus || (newStatus === "Rejected" && !reason.trim())}
            >
              Update to {newStatus || "..."}
            </Button>
          </Space>
        </>
      )}

      <Divider>Transaction History</Divider>
      <Table<InventoryTransaction>
        columns={txnColumns}
        dataSource={lotTransactions}
        rowKey="transaction_id"
        size="small"
        pagination={false}
        scroll={{ x: 500 }}
      />
    </Drawer>
  );
}
