import { useState } from "react";
import { Button, Input, Tag } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import DashboardPage from "../dashboard/DashboardPage";
import { DataTableCard } from "../../components/dashboard";
import { useBatches } from "../../hooks/useBatchesData";
import { SECTION_GAP, BATCH_STATUS_TAG } from "../../constants/theme";
import type { ProductionBatch } from "../../types";

export default function BatchesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: batches = [], isLoading } = useBatches();

  const filteredData = batches.filter(
    (b) =>
      b.batch_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (b.product_name ?? "").toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const columns: ColumnsType<ProductionBatch> = [
    {
      title: "Batch ID",
      dataIndex: "batch_id",
      key: "batch_id",
      width: 120,
      sorter: (a, b) => a.batch_id.localeCompare(b.batch_id),
    },
    {
      title: "Batch Number",
      dataIndex: "batch_number",
      key: "batch_number",
      width: 140,
    },
    {
      title: "Product",
      dataIndex: "product_name",
      key: "product_name",
      ellipsis: true,
    },
    {
      title: "Batch Size",
      key: "batch_size",
      width: 140,
      render: (_, r) => `${r.batch_size.toLocaleString()} ${r.unit_of_measure}`,
      sorter: (a, b) => a.batch_size - b.batch_size,
    },
    {
      title: "Components",
      dataIndex: "component_count",
      key: "component_count",
      width: 110,
      render: (v?: number) => v ?? "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      filters: Object.entries(BATCH_STATUS_TAG).map(([value, { label }]) => ({
        text: label,
        value,
      })),
      onFilter: (value, record) => record.status === value,
      render: (status: string) => {
        const cfg = BATCH_STATUS_TAG[status];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : status;
      },
    },
    {
      title: "Manufacture Date",
      dataIndex: "manufacture_date",
      key: "manufacture_date",
      width: 140,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD"),
      sorter: (a, b) => dayjs(a.manufacture_date).unix() - dayjs(b.manufacture_date).unix(),
    },
    {
      title: "Expiration Date",
      dataIndex: "expiration_date",
      key: "expiration_date",
      width: 140,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD"),
      sorter: (a, b) => dayjs(a.expiration_date).unix() - dayjs(b.expiration_date).unix(),
    },
  ];

  return (
    <DashboardPage
      title="Production Batches"
      subtitle="Track manufacturing batches and their component materials"
      actions={
        <Button type="primary" icon={<PlusOutlined />}>
          Create Batch
        </Button>
      }
    >
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<ProductionBatch>
          title="Batch Registry"
          extra={
            <Input
              placeholder="Search by Batch ID, Number, or Product..."
              prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 340 }}
              allowClear
            />
          }
          columns={columns}
          dataSource={filteredData}
          rowKey="batch_id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1100 }}
        />
      </div>
    </DashboardPage>
  );
}
