import { useState } from "react";
import { Button, Input, Tag, Space, Popconfirm, message, Modal, Image } from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  DeleteOutlined,
  QrcodeOutlined,
  EditOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import DashboardPage from "../dashboard/DashboardPage";
import { DataTableCard } from "../../components/dashboard";
import { GenerateLabelModal } from "../../components/labels/GenerateLabelModal";
import { LabelTemplateFormModal } from "../../components/labels/LabelTemplateFormModal";
import {
  useGeneratedLabels,
  useDeleteLabel,
  useTemplates,
  useDeleteTemplate,
} from "../../hooks/useLabelsData";
import { SECTION_GAP } from "../../constants/theme";
import type { GeneratedLabel, LabelTemplate } from "../../types";

const CODE_TYPE_COLOR: Record<string, string> = {
  qrcode: "blue",
  barcode: "green",
};

const LABEL_TYPE_COLOR: Record<string, string> = {
  raw_material: "orange",
  api: "purple",
  sample: "cyan",
  intermediate: "geekblue",
  finished_product: "green",
  status: "blue",
};

const LABEL_TYPE_NAMES: Record<string, string> = {
  raw_material: "Raw Material",
  api: "API",
  sample: "Sample",
  intermediate: "Intermediate",
  finished_product: "Finished Product",
  status: "Status",
};

const DOWNLOAD_IMAGE_PADDING = 24;
const DOWNLOAD_INFO_GAP = 18;
const DOWNLOAD_LINE_HEIGHT = 20;
const DOWNLOAD_FONT = '14px "Segoe UI", sans-serif';

const normalizeJsonString = (value: string): string => {
  const trimmedValue = value.trim();
  const looksLikeJson =
    (trimmedValue.startsWith("{") && trimmedValue.endsWith("}")) ||
    (trimmedValue.startsWith("[") && trimmedValue.endsWith("]"));

  if (!looksLikeJson) {
    return value;
  }

  try {
    return JSON.stringify(JSON.parse(trimmedValue), null, 2);
  } catch {
    return value;
  }
};

const formatLabelContentValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "N/A";
  }

  if (typeof value === "string") {
    return normalizeJsonString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value, null, 2);
};

const buildDownloadInfoLines = (label: GeneratedLabel): string[] => {
  const baseLines = [
    `Material ID: ${label.material_id}`,
    `Part Number: ${label.part_number}`,
    `Material Name: ${label.material_name}`,
    `Material Type: ${label.material_type}`,
    `Entity: ${label.entity_type.toUpperCase()} - ${label.entity_id}`,
    `Code Type: ${label.code_type.toUpperCase()}`,
    `Created Date: ${dayjs(label.created_date).format("YYYY-MM-DD HH:mm")}`,
  ];

  const excludedKeys = new Set([
    "material_id",
    "part_number",
    "material_name",
    "material_type",
    "entity_type",
    "entity_id",
    "generated_date",
  ]);

  const extraLines = Object.entries(label.label_content)
    .filter(([key]) => !excludedKeys.has(key))
    .flatMap(([key, value]) => {
      const normalizedKey = key.replaceAll("_", " ");
      const valueLines = formatLabelContentValue(value).split("\n");

      return valueLines.map((line, index) =>
        index === 0 ? `${normalizedKey}: ${line}` : `  ${line}`
      );
    });

  return [...baseLines, ...extraLines];
};

const splitLongToken = (
  ctx: CanvasRenderingContext2D,
  token: string,
  maxWidth: number
): string[] => {
  const chunks: string[] = [];
  let currentChunk = "";

  for (const char of token) {
    const candidate = `${currentChunk}${char}`;
    if (ctx.measureText(candidate).width <= maxWidth || currentChunk.length === 0) {
      currentChunk = candidate;
    } else {
      chunks.push(currentChunk);
      currentChunk = char;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
};

const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
  const sourceLines = text.split("\n");
  const wrapped: string[] = [];

  sourceLines.forEach((sourceLine) => {
    if (!sourceLine) {
      wrapped.push("");
      return;
    }

    if (ctx.measureText(sourceLine).width <= maxWidth) {
      wrapped.push(sourceLine);
      return;
    }

    const words = sourceLine.split(" ");
    let currentLine = "";

    words.forEach((word) => {
      const wordParts =
        ctx.measureText(word).width > maxWidth ? splitLongToken(ctx, word, maxWidth) : [word];

      wordParts.forEach((part) => {
        const candidate = currentLine ? `${currentLine} ${part}` : part;

        if (ctx.measureText(candidate).width <= maxWidth) {
          currentLine = candidate;
          return;
        }

        if (currentLine) {
          wrapped.push(currentLine);
        }
        currentLine = part;
      });
    });

    if (currentLine) {
      wrapped.push(currentLine);
    }
  });

  return wrapped;
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load label image"));
    image.src = src;
  });

const downloadFromUrl = (url: string, filename: string) => {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function LabelsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [templateSearchTerm, setTemplateSearchTerm] = useState("");
  const { data: labels = [], isLoading } = useGeneratedLabels();
  const { data: templates = [], isLoading: templatesLoading } = useTemplates();

  const [generateOpen, setGenerateOpen] = useState(false);
  const [viewingLabel, setViewingLabel] = useState<GeneratedLabel | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<LabelTemplate | undefined>(undefined);
  
  const { mutateAsync: deleteLabel } = useDeleteLabel();
  const { mutateAsync: deleteTemplate } = useDeleteTemplate();

  const handleGenerate = () => {
    setGenerateOpen(true);
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(undefined);
    setTemplateModalOpen(true);
  };

  const handleEditTemplate = (template: LabelTemplate) => {
    setEditingTemplate(template);
    setTemplateModalOpen(true);
  };

  const handleCloseTemplateModal = () => {
    setTemplateModalOpen(false);
    setEditingTemplate(undefined);
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      await deleteTemplate(templateId);
      message.success("Template deleted successfully!");
    } catch {
      message.error("Failed to delete template.");
    }
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

  const handleDownload = async (label: GeneratedLabel) => {
    const filename = `label-${label.material_id}-${label.code_type}-${Date.now()}.png`;

    try {
      const codeImage = await loadImage(label.code_data);
      const infoLines = buildDownloadInfoLines(label);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Unable to initialize canvas");
      }

      ctx.font = DOWNLOAD_FONT;
      const contentWidth = Math.max(codeImage.width, 420);
      const textMaxWidth = contentWidth;
      const wrappedLines = infoLines.flatMap((line) => wrapText(ctx, line, textMaxWidth));

      canvas.width = contentWidth + DOWNLOAD_IMAGE_PADDING * 2;
      canvas.height =
        DOWNLOAD_IMAGE_PADDING +
        codeImage.height +
        DOWNLOAD_INFO_GAP +
        wrappedLines.length * DOWNLOAD_LINE_HEIGHT +
        DOWNLOAD_IMAGE_PADDING;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const imageX = (canvas.width - codeImage.width) / 2;
      ctx.drawImage(codeImage, imageX, DOWNLOAD_IMAGE_PADDING);

      ctx.fillStyle = "#111111";
      ctx.font = DOWNLOAD_FONT;
      ctx.textBaseline = "top";

      const textStartY = DOWNLOAD_IMAGE_PADDING + codeImage.height + DOWNLOAD_INFO_GAP;
      wrappedLines.forEach((line, index) => {
        ctx.fillText(line, DOWNLOAD_IMAGE_PADDING, textStartY + index * DOWNLOAD_LINE_HEIGHT);
      });

      const outputDataUrl = canvas.toDataURL("image/png");
      downloadFromUrl(outputDataUrl, filename);
      message.success("Label downloaded with details!");
    } catch {
      downloadFromUrl(label.code_data, filename);
      message.warning("Downloaded original label image (without extra details).");
    }
  };

  const filteredData = labels.filter(
    (l) =>
      l.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.material_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTemplates = templates.filter(
    (t) =>
      t.template_name.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
      t.template_id.toLowerCase().includes(templateSearchTerm.toLowerCase()) ||
      t.label_type.toLowerCase().includes(templateSearchTerm.toLowerCase())
  );

  const templateColumns: ColumnsType<LabelTemplate> = [
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
      width: 150,
      render: (type: string) => (
        <Tag color={LABEL_TYPE_COLOR[type] ?? "default"}>
          {LABEL_TYPE_NAMES[type] ?? type}
        </Tag>
      ),
    },
    {
      title: "Dimensions",
      key: "dimensions",
      width: 120,
      render: (_, record) => `${record.width}" × ${record.height}"`,
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
            icon={<EditOutlined />}
            onClick={() => handleEditTemplate(record)}
            title="Edit Template"
          />
          <Popconfirm
            title="Delete this template?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteTemplate(record.template_id)}
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

  const columns: ColumnsType<GeneratedLabel> = [
    {
      title: "Material ID",
      dataIndex: "material_id",
      key: "material_id",
      width: 120,
      sorter: (a, b) => a.material_id.localeCompare(b.material_id),
    },
    {
      title: "Entity Type",
      dataIndex: "entity_type",
      key: "entity_type",
      width: 120,
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          material: "blue",
          lot: "orange",
          batch: "purple",
        };
        return (
          <Tag color={colorMap[type] || "default"}>
            {type.toUpperCase()}
          </Tag>
        );
      },
      filters: [
        { text: "Material", value: "material" },
        { text: "Lot", value: "lot" },
        { text: "Batch", value: "batch" },
      ],
      onFilter: (value, record) => record.entity_type === value,
    },
    {
      title: "Entity ID",
      dataIndex: "entity_id",
      key: "entity_id",
      width: 150,
      ellipsis: true,
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
        <Space>
          <Button
            type="default"
            icon={<FileTextOutlined />}
            onClick={handleCreateTemplate}
          >
            Create Template
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleGenerate}
          >
            Generate Label
          </Button>
        </Space>
      }
    >
      {/* Template Management Section */}
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<LabelTemplate>
          title="Label Templates"
          extra={
            <Input
              placeholder="Search templates..."
              prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
              value={templateSearchTerm}
              onChange={(e) => setTemplateSearchTerm(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          }
          columns={templateColumns}
          dataSource={filteredTemplates}
          rowKey="template_id"
          loading={templatesLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1200 }}
        />
      </div>

      {/* Generated Labels Section */}
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

      <LabelTemplateFormModal
        isOpen={templateModalOpen}
        onClose={handleCloseTemplateModal}
        initialData={editingTemplate || null}
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
