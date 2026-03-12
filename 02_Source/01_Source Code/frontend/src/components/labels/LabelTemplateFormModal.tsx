import { useEffect } from "react";
import { Modal, Form, Input, InputNumber, Select, message, Alert, Checkbox } from "antd";

import { useCreateTemplate, useUpdateTemplate } from "@/hooks/useLabelsData";
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

const MATERIAL_FIELDS = [
  { value: "material_id", label: "Material ID" },
  { value: "part_number", label: "Part Number" },
  { value: "material_name", label: "Material Name" },
  { value: "material_type", label: "Material Type" },
  { value: "storage_conditions", label: "Storage Conditions" },
  { value: "specification_document", label: "Specification Document" },
  { value: "created_date", label: "Created Date" },
];

export function LabelTemplateFormModal({ isOpen, onClose, initialData }: LabelTemplateFormModalProps) {
  const [form] = Form.useForm();
  const { mutateAsync: createTemplate, isPending: isCreating } = useCreateTemplate();
  const { mutateAsync: updateTemplate, isPending: isUpdating } = useUpdateTemplate();
  const isEditing = !!initialData;
  const isPending = isCreating || isUpdating;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Parse template_content to extract selected fields
        const selectedFields: string[] = [];
        MATERIAL_FIELDS.forEach(field => {
          if (initialData.template_content.includes(`{{${field.value}}}`)) {
            selectedFields.push(field.value);
          }
        });
        
        form.setFieldsValue({
          template_name: initialData.template_name,
          label_type: initialData.label_type,
          width: initialData.width,
          height: initialData.height,
          selected_fields: selectedFields,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ 
          width: 4.0, 
          height: 2.0,
          selected_fields: ['material_name', 'part_number', 'material_type']
        });
      }
    }
  }, [isOpen, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      
      // Generate template_content from selected fields
      const selectedFields = values.selected_fields || [];
      const fieldLabels: Record<string, string> = {
        material_id: "Material ID",
        part_number: "Part Number",
        material_name: "Material Name",
        material_type: "Material Type",
        storage_conditions: "Storage Conditions",
        specification_document: "Specification",
        created_date: "Created Date",
      };
      
      const templateContent = selectedFields
        .map((field: string) => `${fieldLabels[field]}: {{${field}}}`)
        .join('\n');
      
      const templateData = {
        template_name: values.template_name,
        label_type: values.label_type,
        template_content: templateContent,
        width: values.width,
        height: values.height,
      };
      
      if (isEditing && initialData) {
        await updateTemplate({
          id: initialData.template_id,
          data: templateData,
        });
        message.success("Template updated successfully!");
      } else {
        await createTemplate(templateData);
        message.success("Template created successfully!");
      }
      
      onClose();
      form.resetFields();
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error("Template already exists!");
      } else if (error.response?.status === 400) {
        message.error(error.response?.data?.error || "Invalid data");
      } else if (error.name !== "ValidationError") {
        message.error("An error occurred while saving template.");
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
      width={700}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Alert
          message="Select Material Fields"
          description="Choose which material information fields to include in the label template. The selected fields will be displayed when generating labels."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          name="template_name"
          label="Template Name"
          rules={[{ required: true, message: "Please enter template name" }]}
        >
          <Input placeholder="Ex: Standard Material Label" />
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
            label="Width (inches)"
            rules={[
              { required: true, message: "Required" },
              { type: "number", min: 0.1, message: "Must be > 0" },
            ]}
          >
            <InputNumber style={{ width: "100%" }} placeholder="4.0" step={0.1} />
          </Form.Item>

          <Form.Item
            name="height"
            label="Height (inches)"
            rules={[
              { required: true, message: "Required" },
              { type: "number", min: 0.1, message: "Must be > 0" },
            ]}
          >
            <InputNumber style={{ width: "100%" }} placeholder="2.0" step={0.1} />
          </Form.Item>
        </div>

        <Form.Item
          name="selected_fields"
          label="Material Fields to Include"
          rules={[
            { required: true, message: "Please select at least one field" },
            {
              type: "array",
              min: 1,
              message: "Please select at least one field",
            },
          ]}
        >
          <Checkbox.Group
            options={MATERIAL_FIELDS}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
