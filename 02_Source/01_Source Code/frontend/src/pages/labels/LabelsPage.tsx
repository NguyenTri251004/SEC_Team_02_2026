import { useState } from "react";
import { Button, Input, Tag, Space, Popconfirm, message, Modal, Image } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  QrcodeOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import DashboardPage from "../dashboard/DashboardPage";
import { DataTableCard } from "../../components/dashboard";
import { GenerateLabelModal } from "../../components/labels/GenerateLabelModal";
import {
  useGeneratedLabels,
  useDeleteLabel,
} from "../../hooks/useLabelsData";
import { SECTION_GAP } from "../../constants/theme";
import type { GeneratedLabel } from "../../types";

const CODE_TYPE_COLOR: Record<string, string> = {
  qrcode: "blue",
  barcode: "green",
};

export default function LabelsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: labels = [], isLoading } = useGeneratedLabels();

  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewingLabel, setViewingLabel] = useState<GeneratedLabel | null>(null);
  const { mutateAsync: deleteLabel } = useDeleteLabel();

  const handleGenerate = () => {
    setGenerateOpen(true);
  };

  const handleView = (label: GeneratedLabel) => {
    setViewingLabel(label);
  };

  const handleDelete = async (labelId: string) => {
    try {
      await deleteLabel(labelId);
      message.success("Label deleted successfully!");
    } catch {
      message.error("Failed to delete label.");
    }
  };

  const handleDownload = (label: GeneratedLabel) => {
    const link = document.createElement("a");
    link.href = label.code_data;
    link.download = `label-${label.material_id}-${label.code_type}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success("Label downloaded!");
  };

  const filteredData = labels.filter(
    (l) =>
      l.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.material_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: ColumnsType<GeneratedLabel> = [
    {
      title: "Material ID",
      dataIndex: "material_id",
      key: "material_id",
      width: 120,
      sorter: (a, b) => a.material_id.localeCompare(b.material_id),
    },
    {
      title: "Part Number",
      dataIndex: "part_number",
      key: "part_number",
      width: 130,
    },
    {
      title: "Material Name",
      dataIndex: "material_name",
      key: "material_name",
      ellipsis: true,
    },
    {
      title: "Material Type",
      dataIndex: "material_type",
      key: "material_type",
      width: 150,
    },
    {
      title: "Code Type",
      dataIndex: "code_type",
      key: "code_type",
      width: 100,
      render: (type: string) => (
        <Tag color={CODE_TYPE_COLOR[type] ?? "default"}>
          {type.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Created By",
      dataIndex: "created_by",
      key: "created_by",
      width: 120,
    },
    {
      title: "Created Date",
      dataIndex: "created_date",
      key: "created_date",
      width: 150,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
      sorter: (a, b) =>
        dayjs(a.created_date).unix() - dayjs(b.created_date).unix(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleView(record)}
            title="View Label"
          />
          <Button
            type="text"
            size="small"
            icon={<QrcodeOutlined />}
            onClick={() => handleDownload(record)}
            title="Download"
          />
          <Popconfirm
            title="Delete this label?"
            description="This action cannot be undone."
            onConfirm={() => handleDelete(record.label_id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} title="Delete" />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <DashboardPage
      title="Generated Labels"
      subtitle="View and manage generated barcode/QR code labels for materials"
      actions={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleGenerate}
        >
          Generate Label
        </Button>
      }
    >
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<GeneratedLabel>
          title="Label History"
          extra={
            <Input
              placeholder="Search by Material, Part Number..."
              prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          }
          columns={columns}
          dataSource={filteredData}
          rowKey="label_id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />
      </div>

      <GenerateLabelModal
        isOpen={generateOpen}
        onClose={() => setGenerateOpen(false)}
      />

      <Modal
        title="View Label"
        open={!!viewingLabel}
        onCancel={() => setViewingLabel(null)}
        footer={[
          <Button key="close" onClick={() => setViewingLabel(null)}>
            Close
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<QrcodeOutlined />}
            onClick={() => {
              if (viewingLabel) handleDownload(viewingLabel);
            }}
          >
            Download
          </Button>,
        ]}
        width={700}
      >
        {viewingLabel && (
          <div style={{ textAlign: "center" }}>
            <h3>{viewingLabel.material_name}</h3>
            <p>
              {viewingLabel.part_number} - {viewingLabel.material_type}
            </p>
            <div
              style={{
                margin: "24px auto",
                padding: "24px",
                background: "#f5f5f5",
                borderRadius: "8px",
                display: "inline-block",
              }}
            >
              <Image
                src={viewingLabel.code_data}
                alt="Label"
                style={{ maxWidth: "100%", height: "auto" }}
                preview={false}
              />
            </div>
            <div style={{ textAlign: "left", marginTop: "16px" }}>
              <strong>Label Content:</strong>
              <pre
                style={{
                  background: "#fafafa",
                  padding: "12px",
                  borderRadius: "4px",
                  marginTop: "8px",
                  maxHeight: "200px",
                  overflow: "auto",
                }}
              >
                {JSON.stringify(viewingLabel.label_content, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </DashboardPage>
  );
}
