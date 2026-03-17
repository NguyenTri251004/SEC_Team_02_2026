import { useState, useEffect } from "react";
import { Modal, Form, Select, Radio, Button, message, Space, Image, Typography, Divider, Alert } from "antd";
import { DownloadOutlined, QrcodeOutlined } from "@ant-design/icons";
import axios from "axios";

import { useGenerateLabelFromTemplate, useTemplates } from "@/hooks/useLabelsData";
import { useMaterials } from "@/hooks/useMaterialsData";
import { useLots } from "@/hooks/useLotsData";
import { useBatches } from "@/hooks/useBatchesData";
import { BATCH_STATUS_TAG } from "@/constants/theme";
import type { CodeType, EntityType, GeneratedLabel, LabelTemplate } from "@/types";

const { Text, Title } = Typography;

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

interface GenerateLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GenerateLabelModal({ isOpen, onClose }: GenerateLabelModalProps) {
  const [form] = Form.useForm();
  const [generatedLabel, setGeneratedLabel] = useState<GeneratedLabel | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate | null>(null);
  const [entityType, setEntityType] = useState<EntityType>("material");

  const { data: materials = [], isLoading: materialsLoading } = useMaterials();
  const { data: lots = [], isLoading: lotsLoading } = useLots();
  const { data: batches = [], isLoading: batchesLoading } = useBatches();
  const { data: templates = [], isLoading: templatesLoading } = useTemplates();
  const { mutateAsync: generateLabelFromTemplate, isPending } = useGenerateLabelFromTemplate();

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setGeneratedLabel(null);
      setSelectedTemplate(null);
      setEntityType("material");
    }
  }, [isOpen, form]);

  const completedBatches = batches.filter((batch) => batch.status === "Complete");

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.template_id === templateId);
    setSelectedTemplate(template || null);
  };

  const handleEntityTypeChange = (type: EntityType) => {
    setEntityType(type);
    form.setFieldsValue({ entity_id: undefined }); // Reset entity selection
  };

  const getSuggestedEntityType = (labelType: string): string => {
    const type = labelType.toLowerCase();
    if (type.includes("raw material") || type.includes("api")) return "Inventory Lot";
    if (type.includes("finished product")) return "Production Batch";
    return "Material";
  };

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      
      if (!values.template_id) {
        message.error("Please select a template");
        return;
      }

      if (entityType === "batch") {
        const selectedBatch = batches.find((batch) => batch.batch_id === values.entity_id);
        if (!selectedBatch || selectedBatch.status !== "Complete") {
          message.error("Only Completed batches are allowed for label generation.");
          return;
        }
      }
      
      const input = {
        template_id: values.template_id,
        entity_type: entityType,
        entity_id: values.entity_id,
        code_type: values.code_type as CodeType,
      };

      const result = await generateLabelFromTemplate(input);
      setGeneratedLabel(result);
      message.success("Label generated successfully!");
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "ValidationError") {
        return;
      }

      if (axios.isAxiosError<{ error?: string }>(error)) {
        message.error(error.response?.data?.error || "Failed to generate label");
        return;
      }

      message.error("Failed to generate label");
    }
  };

  const handleDownload = async () => {
    if (!generatedLabel) return;

    const filename = `label-${generatedLabel.entity_type}-${generatedLabel.entity_id}-${generatedLabel.code_type}-${Date.now()}.png`;

    try {
      const codeImage = await loadImage(generatedLabel.code_data);
      const infoLines = buildDownloadInfoLines(generatedLabel);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Unable to initialize canvas");
      }

      ctx.font = DOWNLOAD_FONT;
      const contentWidth = Math.max(codeImage.width, 420);
      const wrappedLines = infoLines.flatMap((line) => wrapText(ctx, line, contentWidth));

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
      downloadFromUrl(generatedLabel.code_data, filename);
      message.warning("Downloaded original label image (without extra details).");
    }
  };

  const handleClose = () => {
    setGeneratedLabel(null);
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <Space>
          <QrcodeOutlined />
          <span>Generate Label from Template</span>
        </Space>
      }
      open={isOpen}
      onCancel={handleClose}
      footer={
        generatedLabel ? (
          <Space>
            <Button onClick={handleClose}>Close</Button>
            <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
              Download Label
            </Button>
          </Space>
        ) : (
          <Space>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" onClick={handleGenerate} loading={isPending}>
              Generate
            </Button>
          </Space>
        )
      }
      width={700}
      destroyOnClose
    >
      {!generatedLabel ? (
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            name="template_id"
            label="Label Template"
            rules={[{ required: true, message: "Please select a template" }]}
          >
            <Select
              placeholder="Select template"
              loading={templatesLoading}
              onChange={handleTemplateChange}
              options={templates.map((t) => ({
                value: t.template_id,
                label: `${t.template_name} (${t.label_type})`,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          {selectedTemplate && (
            <>
              <Alert
                type="info"
                message={`Suggested for: ${getSuggestedEntityType(selectedTemplate.label_type)}`}
                description={`Dimensions: ${selectedTemplate.width}" × ${selectedTemplate.height}"`}
                style={{ marginBottom: "16px" }}
              />
              <div
                style={{
                  padding: "12px",
                  background: "#f5f5f5",
                  borderRadius: "4px",
                  marginBottom: "16px",
                }}
              >
                <Text strong>Template Content:</Text>
                <pre style={{ margin: "8px 0 0 0", fontSize: "12px", whiteSpace: "pre-wrap" }}>
                  {selectedTemplate.template_content}
                </pre>
              </div>
            </>
          )}

          <Form.Item label="Entity Type" required>
            <Radio.Group value={entityType} onChange={(e) => handleEntityTypeChange(e.target.value)}>
              <Radio.Button value="material">Material</Radio.Button>
              <Radio.Button value="lot">Inventory Lot</Radio.Button>
              <Radio.Button value="batch">Production Batch</Radio.Button>
            </Radio.Group>
          </Form.Item>

          {entityType === "material" && (
            <Form.Item
              name="entity_id"
              label="Select Material"
              rules={[{ required: true, message: "Please select a material" }]}
            >
              <Select
                placeholder="Select material"
                loading={materialsLoading}
                options={materials.map((m) => ({
                  value: m.material_id,
                  label: `${m.part_number} - ${m.material_name} (${m.material_type})`,
                }))}
                showSearch
                filterOption={(input, option) =>
                  (option?.label?.toString() || "").toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          )}

          {entityType === "lot" && (
            <Form.Item
              name="entity_id"
              label="Select Inventory Lot"
              rules={[{ required: true, message: "Please select a lot" }]}
            >
              <Select
                placeholder="Select inventory lot"
                loading={lotsLoading}
                options={lots.map((l) => ({
                  value: l.lot_id,
                  label: `${l.lot_id} - ${l.material_name || 'Unknown'} (${l.status})`,
                }))}
                showSearch
                filterOption={(input, option) =>
                  (option?.label?.toString() || "").toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          )}

          {entityType === "batch" && (
            <Form.Item
              name="entity_id"
              label="Select Production Batch"
              rules={[{ required: true, message: "Please select a batch" }]}
              extra="Only batches with Completed status are available."
            >
              <Select
                placeholder={
                  completedBatches.length > 0
                    ? "Select completed production batch"
                    : "No completed batches available"
                }
                loading={batchesLoading}
                options={completedBatches.map((b) => ({
                  value: b.batch_id,
                  label: `${b.batch_number} - ${BATCH_STATUS_TAG[b.status]?.label ?? b.status}`,
                }))}
                notFoundContent={batchesLoading ? "Loading..." : "No completed batches"}
                showSearch
                filterOption={(input, option) =>
                  (option?.label?.toString() || "").toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          )}

          <Form.Item
            name="code_type"
            label="Code Type"
            initialValue="qrcode"
            rules={[{ required: true, message: "Please select a code type" }]}
          >
            <Radio.Group>
              <Radio.Button value="qrcode">QR Code (Full JSON)</Radio.Button>
              <Radio.Button value="barcode">Barcode (ID only)</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Form>
      ) : (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Title level={4}>{generatedLabel.material_name}</Title>
          <Space>
            <Text type="secondary">
              Entity: {generatedLabel.entity_type.toUpperCase()}
            </Text>
            <Text type="secondary">|</Text>
            <Text type="secondary">
              Type: {generatedLabel.code_type.toUpperCase()}
            </Text>
          </Space>

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
              src={generatedLabel.code_data}
              alt="Generated Label"
              style={{ maxWidth: "100%", height: "auto" }}
              preview={false}
            />
          </div>

          <div style={{ textAlign: "left", marginTop: "16px" }}>
            <Text strong>Entity ID:</Text> <Text code>{generatedLabel.entity_id}</Text>
            <Divider style={{ margin: "8px 0" }} />
          </div>

          <div style={{ textAlign: "left",  }}>
            <Text strong>Label Content:</Text>
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
              {JSON.stringify(generatedLabel.label_content, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </Modal>
  );
}

