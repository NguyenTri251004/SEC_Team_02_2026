import { useEffect } from "react";
import { Modal, Form, Input, InputNumber, Select, DatePicker, message } from "antd";
import dayjs from "dayjs";

import { useLots } from "@/hooks/useLotsData";
import { useRecordTransaction } from "@/hooks/useTransactionsData";

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TRANSACTION_TYPES = [
  { value: "Receipt", label: "Receipt" },
  { value: "Usage", label: "Usage" },
  { value: "Split", label: "Split" },
  { value: "Transfer", label: "Transfer" },
  { value: "Adjustment", label: "Adjustment" },
  { value: "Disposal", label: "Disposal" },
];

export function TransactionFormModal({ isOpen, onClose }: TransactionFormModalProps) {
  const [form] = Form.useForm();
  const { mutateAsync: recordTransaction, isPending } = useRecordTransaction();
  const { data: lots = [] } = useLots();

  const transactionType = Form.useWatch("transaction_type", form);

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      form.setFieldsValue({
        transaction_date: dayjs(),
        unit_of_measure: "kg",
      });
    }
  }, [isOpen, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        transaction_date: values.transaction_date.format("YYYY-MM-DDTHH:mm:ss"),
      };
      await recordTransaction(payload);
      message.success("Transaction recorded successfully!");
      onClose();
    } catch (error: any) {
      if (error.response?.data?.error) {
        message.error(error.response.data.error);
      } else if (error.name !== "ValidationError") {
        message.error("An error occurred while recording transaction.");
      }
    }
  };

  return (
    <Modal
      title="Record Transaction"
      open={isOpen}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={isPending}
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item
            name="transaction_type"
            label="Transaction Type"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select options={TRANSACTION_TYPES} placeholder="Select type" />
          </Form.Item>

          <Form.Item
            name="lot_id"
            label="Lot"
            rules={[{ required: true, message: "Required" }]}
          >
            <Select
              showSearch
              placeholder="Select lot"
              optionFilterProp="label"
              options={lots.map((l) => ({
                value: l.lot_id,
                label: `${l.lot_id} - ${l.material_name ?? l.material_id}`,
              }))}
            />
          </Form.Item>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          <Form.Item
            name="quantity"
            label="Quantity"
            rules={[
              { required: true, message: "Required" },
              { type: "number", min: 0.001, message: "Must be > 0" },
            ]}
          >
            <InputNumber style={{ width: "100%" }} placeholder="100" />
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

          <Form.Item
            name="transaction_date"
            label="Date"
            rules={[{ required: true, message: "Required" }]}
          >
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        </div>

        <Form.Item name="reference_id" label="Reference ID">
          <Input
            placeholder={
              transactionType === "Transfer"
                ? "Destination location"
                : transactionType === "Usage"
                  ? "Batch ID (e.g. BATCH-001)"
                  : "PO or reference number"
            }
          />
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <Input.TextArea rows={2} placeholder="Additional notes..." />
        </Form.Item>
      </Form>
    </Modal>
  );
}
