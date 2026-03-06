import { useState } from "react";
import { Button, Input, Tag } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import DashboardPage from "../dashboard/DashboardPage";
import { DataTableCard } from "../../components/dashboard";
import { useLabelTemplates } from "../../hooks/useLabelsData";
import { SECTION_GAP } from "../../constants/theme";
import type { LabelTemplate } from "../../types";

const LABEL_TYPE_COLOR: Record<string, string> = {
  "QR Code": "blue",
  Barcode: "green",
};

export default function LabelsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: templates = [], isLoading } = useLabelTemplates();

  const filteredData = templates.filter(
    (t) =>
      t.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.label_type.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const columns: ColumnsType<LabelTemplate> = [
    {
      title: "Template ID",
      dataIndex: "template_id",
      key: "template_id",
      width: 120,
      sorter: (a, b) => a.template_id.localeCompare(b.template_id),
    },
    {
      title: "Template Name",
      dataIndex: "template_name",
      key: "template_name",
      ellipsis: true,
    },
    {
      title: "Label Type",
      dataIndex: "label_type",
      key: "label_type",
      width: 120,
      render: (type: string) => (
        <Tag color={LABEL_TYPE_COLOR[type] ?? "default"}>{type}</Tag>
      ),
    },
    {
      title: "Dimensions (mm)",
      key: "dimensions",
      width: 150,
      render: (_, r) => `${r.width} x ${r.height}`,
    },
    {
      title: "Fields",
      dataIndex: "template_content",
      key: "template_content",
      ellipsis: true,
      render: (content: string) => {
        try {
          const parsed = JSON.parse(content);
          return (parsed.fields as string[]).join(", ");
        } catch {
          return content;
        }
      },
    },
    {
      title: "Created",
      dataIndex: "created_date",
      key: "created_date",
      width: 120,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD"),
      sorter: (a, b) => dayjs(a.created_date).unix() - dayjs(b.created_date).unix(),
    },
    {
      title: "Modified",
      dataIndex: "modified_date",
      key: "modified_date",
      width: 120,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD"),
      sorter: (a, b) => dayjs(a.modified_date).unix() - dayjs(b.modified_date).unix(),
    },
  ];

  return (
    <DashboardPage
      title="Label Templates"
      subtitle="Manage QR code and barcode label templates for lot identification"
      actions={
        <Button type="primary" icon={<PlusOutlined />}>
          Create Template
        </Button>
      }
    >
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<LabelTemplate>
          title="Template Registry"
          extra={
            <Input
              placeholder="Search by Name or Type..."
              prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 280 }}
              allowClear
            />
          }
          columns={columns}
          dataSource={filteredData}
          rowKey="template_id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 900 }}
        />
      </div>
    </DashboardPage>
  );
}
