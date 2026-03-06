import { useEffect } from "react";
import { Modal, Form, Input, Select, DatePicker, message } from "antd";
import dayjs from "dayjs";

import { useLots } from "@/hooks/useLotsData";
import { useCreateQCTest } from "@/hooks/useQCData";
import type { QCTest } from "@/types";

interface QCTestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TEST_TYPES = [
  "Identity",
  "Potency",
  "Microbial",
  "Growth Promotion",
  "Physical",
  "Chemical",
];

export function QCTestFormModal({ isOpen, onClose }: QCTestFormModalProps) {
  const [form] = Form.useForm();
  const { mutateAsync: createTest, isPending } = useCreateQCTest();
  const { data: lots = [] } = useLots();

  const quarantineLots = lots.filter((l) => l.status === "Quarantine");

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      form.setFieldsValue({
        test_date: dayjs(),
        performed_by: "current_user",
      });
    }
  }, [isOpen, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload: Partial<QCTest> = {
        ...values,
        test_date: values.test_date.format("YYYY-MM-DDTHH:mm:ss[Z]"),
        result_status: "Pending",
      };
      await createTest(payload);
      message.success("QC test created successfully!");
      onClose();
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error("Test ID already exists!");
      } else if (error.response?.status === 400) {
        message.error(error.response?.data?.error || "Invalid data");
      } else if (error.name !== "ValidationError") {
        message.error("An error occurred while saving.");
      }
    }
  };

  return (
    <Modal
      title="Create QC Test"
      open={isOpen}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={isPending}
      destroyOnClose
      width={640}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item
            name="lot_id"
            label="Lot"
            rules={[{ required: true, message: "Please select a lot" }]}
          >
            <Select
              showSearch
              placeholder="Select quarantine lot"
              optionFilterProp="label"
              options={quarantineLots.map((l) => ({
                value: l.lot_id,
                label: `${l.lot_id} — ${l.material_name ?? l.material_id}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="test_type"
            label="Test Type"
            rules={[{ required: true, message: "Please select a test type" }]}
          >
            <Select
              placeholder="Select test type"
              options={TEST_TYPES.map((t) => ({ value: t, label: t }))}
            />
          </Form.Item>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item
            name="test_method"
            label="Test Method"
            rules={[{ required: true, message: "Please enter test method" }]}
          >
            <Input placeholder="Ex: HPLC Analysis" />
          </Form.Item>

          <Form.Item
            name="test_date"
            label="Test Date"
            rules={[{ required: true, message: "Required" }]}
          >
            <DatePicker style={{ width: "100%" }} showTime />
          </Form.Item>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item name="acceptance_criteria" label="Acceptance Criteria">
            <Input placeholder="Ex: >= 98.0% purity" />
          </Form.Item>

          <Form.Item name="performed_by" label="Performed By">
            <Input disabled />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
