import { useState } from "react";
import { Button, Input, Tag } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import DashboardPage from "../dashboard/DashboardPage";
import { DataTableCard } from "../../components/dashboard";
import { useTransactions } from "../../hooks/useTransactionsData";
import { SECTION_GAP, TXN_TYPE_TAG } from "../../constants/theme";
import type { InventoryTransaction } from "../../types";

export default function TransactionsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: transactions = [], isLoading } = useTransactions();

  const filteredData = transactions.filter(
    (t) =>
      t.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.lot_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.material_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const columns: ColumnsType<InventoryTransaction> = [
    {
      title: "Transaction ID",
      dataIndex: "transaction_id",
      key: "transaction_id",
      width: 130,
      sorter: (a, b) => a.transaction_id.localeCompare(b.transaction_id),
    },
    {
      title: "Type",
      dataIndex: "transaction_type",
      key: "transaction_type",
      width: 120,
      filters: Object.entries(TXN_TYPE_TAG).map(([value, { label }]) => ({
        text: label,
        value,
      })),
      onFilter: (value, record) => record.transaction_type === value,
      render: (type: string) => {
        const cfg = TXN_TYPE_TAG[type];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : type;
      },
    },
    {
      title: "Lot ID",
      dataIndex: "lot_id",
      key: "lot_id",
      width: 110,
    },
    {
      title: "Material",
      dataIndex: "material_name",
      key: "material_name",
      ellipsis: true,
    },
    {
      title: "Quantity",
      key: "quantity",
      width: 120,
      render: (_, r) => (
        <span style={{ color: r.quantity < 0 ? "#ff4d4f" : "#52c41a", fontWeight: 500 }}>
          {r.quantity > 0 ? "+" : ""}
          {r.quantity} {r.unit_of_measure}
        </span>
      ),
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: "Reference",
      dataIndex: "reference_id",
      key: "reference_id",
      width: 140,
      render: (v: string | null) => v ?? <span style={{ color: "#bbb" }}>-</span>,
    },
    {
      title: "Performed By",
      dataIndex: "performed_by",
      key: "performed_by",
      width: 130,
    },
    {
      title: "Date",
      dataIndex: "transaction_date",
      key: "transaction_date",
      width: 160,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
      sorter: (a, b) => dayjs(a.transaction_date).unix() - dayjs(b.transaction_date).unix(),
      defaultSortOrder: "descend",
    },
    {
      title: "Notes",
      dataIndex: "notes",
      key: "notes",
      ellipsis: true,
    },
  ];

  return (
    <DashboardPage
      title="Transaction History"
      subtitle="View all inventory movements: receipts, usage, adjustments, and transfers"
      actions={
        <Button type="primary" icon={<PlusOutlined />}>
          Record Transaction
        </Button>
      }
    >
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<InventoryTransaction>
          title="All Transactions"
          extra={
            <Input
              placeholder="Search by ID, Lot, or Material..."
              prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 320 }}
              allowClear
            />
          }
          columns={columns}
          dataSource={filteredData}
          rowKey="transaction_id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />
      </div>
    </DashboardPage>
  );
}
