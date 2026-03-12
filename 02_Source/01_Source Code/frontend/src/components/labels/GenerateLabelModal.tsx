import { useState, useEffect } from "react";
import { Modal, Form, Select, Radio, Button, message, Space, Image, Typography, Divider } from "antd";
import { DownloadOutlined, QrcodeOutlined } from "@ant-design/icons";

import { useGenerateLabelFromTemplate, useTemplates } from "@/hooks/useLabelsData";
import { useMaterials } from "@/hooks/useMaterialsData";
import type { CodeType, GeneratedLabel, LabelTemplate } from "@/types";

const { Text, Title } = Typography;

interface GenerateLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GenerateLabelModal({ isOpen, onClose }: GenerateLabelModalProps) {
  const [form] = Form.useForm();
  const [generatedLabel, setGeneratedLabel] = useState<GeneratedLabel | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<LabelTemplate | null>(null);

  const { data: materials = [], isLoading: materialsLoading } = useMaterials();
  const { data: templates = [], isLoading: templatesLoading } = useTemplates();
  const { mutateAsync: generateLabelFromTemplate, isPending } = useGenerateLabelFromTemplate();

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setGeneratedLabel(null);
      setSelectedTemplate(null);
    }
  }, [isOpen, form]);

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find((t) => t.template_id === templateId);
    setSelectedTemplate(template || null);
  };

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      
      if (!values.template_id) {
        message.error("Please select a template");
        return;
      }
      
      const input = {
        template_id: values.template_id,
        entity_id: values.material_id, // material_id is the entity
        code_type: values.code_type as CodeType,
      };

      const result = await generateLabelFromTemplate(input);
      setGeneratedLabel(result);
      message.success("Label generated successfully!");
    } catch (error: any) {
      if (error.name !== "ValidationError") {
        message.error(error.response?.data?.error || "Failed to generate label");
      }
    }
  };

  const handleDownload = () => {
    if (!generatedLabel) return;

    const link = document.createElement("a");
    link.href = generatedLabel.code_data;
    link.download = `label-${generatedLabel.material_id}-${generatedLabel.code_type}-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success("Label downloaded!");
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
            <div
              style={{
                padding: "12px",
                background: "#f5f5f5",
                borderRadius: "4px",
                marginBottom: "16px",
              }}
            >
              <Text strong>Template Preview:</Text>
              <pre style={{ margin: "8px 0 0 0", fontSize: "12px", whiteSpace: "pre-wrap" }}>
                {selectedTemplate.template_content}
              </pre>
              <Divider style={{ margin: "8px 0" }} />
              <Text type="secondary" style={{ fontSize: "12px" }}>
                Dimensions: {selectedTemplate.width}" × {selectedTemplate.height}"
              </Text>
            </div>
          )}

          <Form.Item
            name="material_id"
            label="Material"
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

          <Form.Item
            name="code_type"
            label="Code Type"
            initialValue="qrcode"
            rules={[{ required: true, message: "Please select a code type" }]}
          >
            <Radio.Group>
              <Radio.Button value="qrcode">QR Code</Radio.Button>
              <Radio.Button value="barcode">Barcode</Radio.Button>
            </Radio.Group>
          </Form.Item>
        </Form>
      ) : (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Title level={4}>{generatedLabel.material_name}</Title>
          <Text type="secondary">
            {generatedLabel.part_number} - {generatedLabel.code_type.toUpperCase()}
          </Text>

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

