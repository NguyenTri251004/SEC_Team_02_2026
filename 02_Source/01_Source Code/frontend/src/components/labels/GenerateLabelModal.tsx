import { useState, useEffect } from "react";
import { Modal, Form, Select, Radio, Button, message, Space, Image, Typography } from "antd";
import { DownloadOutlined, QrcodeOutlined } from "@ant-design/icons";

import { useGenerateLabel } from "@/hooks/useLabelsData";
import { useMaterials } from "@/hooks/useMaterialsData";
import type { CodeType, GeneratedLabel } from "@/types";

const { Text, Title } = Typography;

interface GenerateLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GenerateLabelModal({ isOpen, onClose }: GenerateLabelModalProps) {
  const [form] = Form.useForm();
  const [generatedLabel, setGeneratedLabel] = useState<GeneratedLabel | null>(null);

  const { data: materials = [], isLoading: materialsLoading } = useMaterials();
  const { mutateAsync: generateLabel, isPending } = useGenerateLabel();

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      setGeneratedLabel(null);
    }
  }, [isOpen, form]);

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      const input = {
        material_id: values.material_id,
        code_type: values.code_type as CodeType,
      };

      const result = await generateLabel(input);
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

    // Create a download link for the base64 image
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
          <span>Generate Label</span>
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
