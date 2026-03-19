import { useEffect } from "react";
import axios from "axios";
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

const LOT_FIELDS = [
  { value: "lot_id", label: "Lot ID" },
  { value: "material_name", label: "Material Name" },
  { value: "manufacturer_name", label: "Manufacturer" },
  { value: "manufacturer_lot", label: "Manufacturer Lot" },
  { value: "received_date", label: "Received Date" },
  { value: "expiration_date", label: "Expiration Date" },
  { value: "quantity", label: "Quantity" },
  { value: "unit_of_measure", label: "Unit of Measure" },
  { value: "storage_location", label: "Storage Location" },
  { value: "status", label: "Status" },
  { value: "storage_conditions", label: "Storage Conditions" },
];

const BATCH_FIELDS = [
  { value: "batch_id", label: "Batch ID" },
  { value: "batch_number", label: "Batch Number" },
  { value: "product_name", label: "Product Name" },
  { value: "batch_size", label: "Batch Size" },
  { value: "unit_of_measure", label: "Unit of Measure" },
  { value: "manufacture_date", label: "Manufacture Date" },
  { value: "expiration_date", label: "Expiration Date" },
  { value: "status", label: "Status" },
];

function getFieldsForLabelType(labelType: string | undefined) {
  if (!labelType) return MATERIAL_FIELDS;
  switch (labelType) {
    case "Raw Material":
    case "API":
    case "Sample":
      return LOT_FIELDS;
    case "Intermediate":
    case "Finished Product":
      return BATCH_FIELDS;
    case "Status":
      return [...LOT_FIELDS, ...BATCH_FIELDS.filter((f) => !LOT_FIELDS.some((lf) => lf.value === f.value))];
    default:
      return MATERIAL_FIELDS;
  }
}

function getFieldLabels(fields: { value: string; label: string }[]): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const f of fields) {
    labels[f.value] = f.label;
  }
  return labels;
}

export function LabelTemplateFormModal({ isOpen, onClose, initialData }: LabelTemplateFormModalProps) {
  const [form] = Form.useForm();
  const { mutateAsync: createTemplate, isPending: isCreating } = useCreateTemplate();
  const { mutateAsync: updateTemplate, isPending: isUpdating } = useUpdateTemplate();
  const isEditing = !!initialData;
  const isPending = isCreating || isUpdating;

  const watchedLabelType = Form.useWatch("label_type", form);
  const availableFields = getFieldsForLabelType(watchedLabelType);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const allFields = [...MATERIAL_FIELDS, ...LOT_FIELDS, ...BATCH_FIELDS];
        const selectedFields: string[] = [];
        allFields.forEach((field) => {
          if (initialData.template_content.includes(`{{${field.value}}}`)) {
            selectedFields.push(field.value);
          }
        });

        setTimeout(() => {
          form.resetFields();
          form.setFieldsValue({
            template_name: initialData.template_name,
            label_type: initialData.label_type,
            width: Number(initialData.width),
            height: Number(initialData.height),
            selected_fields:
              selectedFields.length > 0 ? selectedFields : ["material_name"],
          });
        }, 0);
      } else {
        form.resetFields();
        form.setFieldsValue({
          width: 4.0,
          height: 2.0,
          selected_fields: ["material_name"],
        });
      }
    }
  }, [isOpen, initialData, form]);

  // Reset selected_fields when label_type changes (only in create mode)
  useEffect(() => {
    if (isOpen && watchedLabelType && !initialData) {
      const defaultFields = getFieldsForLabelType(watchedLabelType);
      form.setFieldsValue({
        selected_fields: [defaultFields[0]?.value].filter(Boolean),
      });
    }
  }, [watchedLabelType, isOpen, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      const selectedFields = values.selected_fields || [];
      const fieldLabels = getFieldLabels(availableFields);

      const templateContent = selectedFields
        .map((field: string) => `${fieldLabels[field] || field}: {{${field}}}`)
        .join("\n");

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
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error) && error.response?.status === 409) {
        message.error("Template already exists!");
        return;
      }

      if (axios.isAxiosError<{ error?: string }>(error) && error.response?.status === 400) {
        message.error(error.response.data?.error ?? "Invalid data");
        return;
      }

      if (error instanceof Error && error.name === "ValidationError") {
        return;
      }

      message.error("An error occurred while saving template.");
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
          message="Select Label Fields"
          description="Choose which information fields to include in the label template. Available fields change based on label type."
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
          label="Fields to Include"
          rules={[
            {
              type: "array",
              min: 1,
              message: "Please select at least one field",
            },
          ]}
        >
          <Checkbox.Group
            options={availableFields}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
