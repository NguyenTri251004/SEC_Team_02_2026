import { useEffect } from "react";
import { Modal, Form, Input, InputNumber, Select, message } from "antd";

import { useSaveTemplate } from "@/hooks/useLabelsData";
import type { LabelTemplate } from "@/types";

interface LabelTemplateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: LabelTemplate | null;
}

const LABEL_TYPE_OPTIONS = [
  { value: "Raw Material", label: "Raw Material" },
  { value: "API", label: "API" },
  { value: "Sample", label: "Sample" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Finished Product", label: "Finished Product" },
  { value: "Status", label: "Status" },
];

export function LabelTemplateFormModal({ isOpen, onClose, initialData }: LabelTemplateFormModalProps) {
  const [form] = Form.useForm();
  const { mutateAsync: saveTemplate, isPending } = useSaveTemplate();
  const isEditing = !!initialData;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.setFieldsValue({
          template_id: initialData.template_id,
          template_name: initialData.template_name,
          label_type: initialData.label_type,
          width: initialData.width,
          height: initialData.height,
          template_content: initialData.template_content,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ width: 100, height: 50 });
      }
    }
  }, [isOpen, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // Validate template_content is valid JSON
      try {
        JSON.parse(values.template_content);
      } catch {
        message.error("Template content must be valid JSON");
        return;
      }
      const data = isEditing ? { ...values, template_id: initialData!.template_id } : values;
      await saveTemplate({ isEditing, data });
      message.success(`Template ${isEditing ? "updated" : "created"} successfully!`);
      onClose();
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error("Template ID already exists!");
      } else if (error.response?.status === 400) {
        message.error(error.response?.data?.error || "Invalid data");
      } else if (error.name !== "ValidationError") {
        message.error("An error occurred while saving.");
      }
    }
  };

  return (
    <Modal
      title={isEditing ? "Edit Template" : "Create Template"}
      open={isOpen}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={isPending}
      destroyOnClose
      width={600}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="template_name"
          label="Template Name"
          rules={[{ required: true, message: "Please enter template name" }]}
        >
          <Input placeholder="Ex: Standard Lot Label" />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <Form.Item
            name="label_type"
            label="Label Type"
            rules={[{ required: true, message: "Please select a type" }]}
          >
            <Select placeholder="Select type" options={LABEL_TYPE_OPTIONS} />
          </Form.Item>

          <Form.Item
            name="width"
            label="Width (mm)"
            rules={[
              { required: true, message: "Required" },
              { type: "number", min: 1, message: "Must be > 0" },
            ]}
          >
            <InputNumber style={{ width: "100%" }} placeholder="100" />
          </Form.Item>

          <Form.Item
            name="height"
            label="Height (mm)"
            rules={[
              { required: true, message: "Required" },
              { type: "number", min: 1, message: "Must be > 0" },
            ]}
          >
            <InputNumber style={{ width: "100%" }} placeholder="50" />
          </Form.Item>
        </div>

        <Form.Item
          name="template_content"
          label="Template Content (JSON)"
          rules={[{ required: true, message: "Please enter template content" }]}
        >
          <Input.TextArea
            rows={4}
            placeholder='{"fields":["lot_id","material_name","expiration_date","quantity"]}'
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
