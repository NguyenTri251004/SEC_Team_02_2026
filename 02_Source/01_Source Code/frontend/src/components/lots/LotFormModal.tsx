import { useEffect } from "react";
import { Modal, Form, Input, InputNumber, Select, DatePicker, Switch, message } from "antd";
import dayjs from "dayjs";

import { useMaterials } from "@/hooks/useMaterialsData";
import { useSaveLot } from "@/hooks/useLotsData";
import type { InventoryLot } from "@/types";

interface LotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: InventoryLot | null;
}

export function LotFormModal({ isOpen, onClose, initialData }: LotFormModalProps) {
  const [form] = Form.useForm();
  const { mutateAsync: saveLot, isPending } = useSaveLot();
  const { data: materials = [] } = useMaterials();
  const isEditing = !!initialData;

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      if (initialData) {
        form.setFieldsValue({
          ...initialData,
          received_date: dayjs(initialData.received_date),
          expiration_date: dayjs(initialData.expiration_date),
          in_use_expiration_date: initialData.in_use_expiration_date
            ? dayjs(initialData.in_use_expiration_date)
            : null,
        });
      } else {
        form.setFieldsValue({
          received_date: dayjs(),
          is_sample: false,
          unit_of_measure: "kg",
        });
      }
    }
  }, [isOpen, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        ...(isEditing && { lot_id: initialData!.lot_id }),
        received_date: values.received_date.format("YYYY-MM-DD"),
        expiration_date: values.expiration_date.format("YYYY-MM-DD"),
        in_use_expiration_date: values.in_use_expiration_date?.format("YYYY-MM-DD") ?? null,
      };
      await saveLot({ isEditing, data: payload });
      message.success(`Lot ${isEditing ? "updated" : "created"} successfully!`);
      onClose();
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error("Lot ID already exists!");
      } else if (error.response?.status === 400) {
        message.error(error.response?.data?.error || "Invalid data");
      } else if (error.name !== "ValidationError") {
        message.error("An error occurred while saving.");
      }
    }
  };

  return (
    <Modal
      title={isEditing ? "Edit Lot" : "Receive New Lot"}
      open={isOpen}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={isPending}
      forceRender
      width={640}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="material_id"
          label="Material"
          rules={[{ required: true, message: "Please select a material" }]}
        >
          <Select
            showSearch
            placeholder="Select material"
            optionFilterProp="label"
            options={materials.map((m) => ({
              value: m.material_id,
              label: `${m.material_name} (${m.material_id})`,
            }))}
          />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item
            name="manufacturer_name"
            label="Manufacturer"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="Ex: PharmaChem Inc." />
          </Form.Item>

          <Form.Item
            name="manufacturer_lot"
            label="Manufacturer Lot"
            rules={[{ required: true, message: "Required" }]}
          >
            <Input placeholder="Ex: MFG-2026-001" />
          </Form.Item>
        </div>

        <Form.Item
          name="supplier_name"
          label="Supplier"
          rules={[{ required: true, message: "Required" }]}
        >
          <Input placeholder="Ex: Global Suppliers Co." />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[
              { required: true, message: "Required" },
              { type: "number", min: 0.001, message: "Must be > 0" },
            ]}
          >
            <InputNumber style={{ width: "100%" }} placeholder="500" />
          </Form.Item>

          <Form.Item
            name="unit_of_measure"
            label="Unit"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select>
              <Select.Option value="kg">kg</Select.Option>
              <Select.Option value="L">L</Select.Option>
              <Select.Option value="each">each</Select.Option>
              <Select.Option value="units">units</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="storage_location" label="Storage Location">
            <Input placeholder="Ex: WH-A, Rack 3" />
          </Form.Item>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <Form.Item
            name="received_date"
            label="Received Date"
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
                  if (!value || !getFieldValue("received_date")) return Promise.resolve();
                  if (value.isAfter(getFieldValue("received_date"))) return Promise.resolve();
                  return Promise.reject(new Error("Must be after received date"));
                },
              }),
            ]}
          >
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item name="in_use_expiration_date" label="In-Use Expiry">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <Form.Item name="po_number" label="PO Number">
            <Input placeholder="Ex: PO-2026-0100" />
          </Form.Item>

          <Form.Item name="receiving_form_id" label="Receiving Form">
            <Input placeholder="Ex: RF-001" />
          </Form.Item>

          <Form.Item name="is_sample" label="Sample Lot" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>

        {form.getFieldValue("is_sample") && (
          <Form.Item name="parent_lot_id" label="Parent Lot ID">
            <Input placeholder="Ex: LOT-001" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
