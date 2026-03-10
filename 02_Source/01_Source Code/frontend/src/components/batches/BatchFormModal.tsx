import { useEffect } from "react";
import { Modal, Form, Input, InputNumber, Select, DatePicker, message } from "antd";
import dayjs from "dayjs";

import { useMaterials } from "@/hooks/useMaterialsData";
import { useCreateBatch } from "@/hooks/useBatchesData";
import type { ProductionBatch } from "@/types";

interface BatchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BatchFormModal({ isOpen, onClose }: BatchFormModalProps) {
  const [form] = Form.useForm();
  const { mutateAsync: createBatch, isPending } = useCreateBatch();
  const { data: materials = [] } = useMaterials();

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      form.setFieldsValue({
        manufacture_date: dayjs(),
        unit_of_measure: "tablets",
      });
    }
  }, [isOpen, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload: Partial<ProductionBatch> = {
        ...values,
        manufacture_date: values.manufacture_date.format("YYYY-MM-DD"),
        expiration_date: values.expiration_date.format("YYYY-MM-DD"),
        status: "Planned",
      };
      await createBatch(payload);
      message.success("Batch created successfully!");
      onClose();
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error("Batch ID already exists!");
      } else if (error.response?.status === 400) {
        message.error(error.response?.data?.error || "Invalid data");
      } else if (error.name !== "ValidationError") {
        message.error("An error occurred while saving.");
      }
    }
  };

  return (
    <Modal
      title="Create Production Batch"
      open={isOpen}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={isPending}
      destroyOnClose
      width={640}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="product_id"
          label="Product"
          rules={[{ required: true, message: "Please select a product" }]}
        >
          <Select
            showSearch
            placeholder="Select product"
            optionFilterProp="label"
            options={materials.map((m) => ({
              value: m.material_id,
              label: `${m.material_name} (${m.material_id})`,
            }))}
          />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item
            name="batch_number"
            label="Batch Number"
            rules={[{ required: true, message: "Please enter batch number" }]}
          >
            <Input placeholder="Ex: B-2026-004" />
          </Form.Item>

          <Form.Item
            name="batch_size"
            label="Batch Size"
            rules={[
              { required: true, message: "Required" },
              { type: "number", min: 1, message: "Must be > 0" },
            ]}
          >
            <InputNumber style={{ width: "100%" }} placeholder="1000" />
          </Form.Item>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <Form.Item
            name="unit_of_measure"
            label="Unit"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select>
              <Select.Option value="tablets">tablets</Select.Option>
              <Select.Option value="capsules">capsules</Select.Option>
              <Select.Option value="kg">kg</Select.Option>
              <Select.Option value="L">L</Select.Option>
              <Select.Option value="units">units</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="manufacture_date"
            label="Manufacture Date"
            rules={[{ required: true, message: "Required" }]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            name="expiration_date"
            label="Expiration Date"
            rules={[
              { required: true, message: "Required" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || !getFieldValue("manufacture_date")) return Promise.resolve();
                  if (value.isAfter(getFieldValue("manufacture_date"))) return Promise.resolve();
                  return Promise.reject(new Error("Must be after manufacture date"));
                },
              }),
            ]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
