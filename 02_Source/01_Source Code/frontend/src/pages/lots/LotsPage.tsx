import { useState } from "react";
import { Button, Input, Tag, Space } from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, EyeOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import DashboardPage from "../dashboard/DashboardPage";
import { DataTableCard } from "../../components/dashboard";
import { LotFormModal } from "../../components/lots/LotFormModal";
import { LotDetailDrawer } from "../../components/lots/LotDetailDrawer";
import { useLots } from "../../hooks/useLotsData";
import { SECTION_GAP, LOT_STATUS_TAG } from "../../constants/theme";
import type { InventoryLot } from "../../types";

export default function LotsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: lots = [], isLoading } = useLots();

  const [formOpen, setFormOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<InventoryLot | null>(null);
  const [detailLot, setDetailLot] = useState<InventoryLot | null>(null);

  const filteredData = lots.filter(
    (lot) =>
      lot.lot_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lot.material_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      lot.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleCreate = () => {
    setEditingLot(null);
    setFormOpen(true);
  };

  const handleEdit = (lot: InventoryLot) => {
    setEditingLot(lot);
    setFormOpen(true);
  };

  const columns: ColumnsType<InventoryLot> = [
    {
      title: "Lot ID",
      dataIndex: "lot_id",
      key: "lot_id",
      width: 120,
      sorter: (a, b) => a.lot_id.localeCompare(b.lot_id),
    },
    {
      title: "Material",
      dataIndex: "material_name",
      key: "material_name",
      ellipsis: true,
    },
    {
      title: "Type",
      dataIndex: "material_type",
      key: "material_type",
      width: 100,
    },
    {
      title: "Supplier",
      dataIndex: "supplier_name",
      key: "supplier_name",
      ellipsis: true,
    },
    {
      title: "Quantity",
      key: "quantity",
      width: 120,
      render: (_, r) => `${r.quantity} ${r.unit_of_measure}`,
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 120,
      filters: Object.entries(LOT_STATUS_TAG).map(([value, { label }]) => ({
        text: label,
        value,
      })),
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        const cfg = LOT_STATUS_TAG[status];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : status;
      },
    },
    {
      title: "Location",
      dataIndex: "storage_location",
      key: "storage_location",
      width: 150,
      ellipsis: true,
    },
    {
      title: "Received",
      dataIndex: "received_date",
      key: "received_date",
      width: 110,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD"),
      sorter: (a, b) => dayjs(a.received_date).unix() - dayjs(b.received_date).unix(),
    },
    {
      title: "Expires",
      dataIndex: "expiration_date",
      key: "expiration_date",
      width: 110,
      render: (v: string) => {
        const d = dayjs(v);
        const isExpiringSoon = d.diff(dayjs(), "day") <= 30;
        return (
          <span style={{ color: isExpiringSoon ? "#ff4d4f" : undefined, fontWeight: isExpiringSoon ? 600 : undefined }}>
            {d.format("YYYY-MM-DD")}
          </span>
        );
      },
      sorter: (a, b) => dayjs(a.expiration_date).unix() - dayjs(b.expiration_date).unix(),
    },
    {
      title: "Sample",
      dataIndex: "is_sample",
      key: "is_sample",
      width: 80,
      render: (v: boolean) => (v ? <Tag color="purple">Sample</Tag> : null),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => setDetailLot(record)}
          />
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <DashboardPage
      title="Inventory Lots"
      subtitle="Track lot lifecycle, expiry dates, and quality status"
      actions={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Receive New Lot
        </Button>
      }
    >
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<InventoryLot>
          title="Lot Registry"
          extra={
            <Input
              placeholder="Search by Lot ID, Material, or Supplier..."
              prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 340 }}
              allowClear
            />
          }
          columns={columns}
          dataSource={filteredData}
          rowKey="lot_id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1300 }}
        />
      </div>

      <LotFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={editingLot}
      />

      <LotDetailDrawer
        lot={detailLot}
        onClose={() => setDetailLot(null)}
      />
    </DashboardPage>
  );
}
