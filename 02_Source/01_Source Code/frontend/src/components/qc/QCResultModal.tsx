import { useEffect } from "react";
import { Modal, Form, Input, Select, Descriptions, Tag, message } from "antd";
import dayjs from "dayjs";

import { useUpdateTestResult } from "@/hooks/useQCData";
import { QC_STATUS_TAG } from "@/constants/theme";
import type { QCTest, QCResultStatus } from "@/types";

interface QCResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  test: QCTest | null;
}

export function QCResultModal({ isOpen, onClose, test }: QCResultModalProps) {
  const [form] = Form.useForm();
  const { mutateAsync: updateResult, isPending } = useUpdateTestResult();

  useEffect(() => {
    if (isOpen && test) {
      form.resetFields();
      form.setFieldsValue({
        test_result: test.test_result ?? "",
        result_status: test.result_status !== "Pending" ? test.result_status : undefined,
        verified_by: test.verified_by ?? "",
      });
    }
  }, [isOpen, test, form]);

  if (!test) return null;

  const statusCfg = QC_STATUS_TAG[test.result_status];

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await updateResult({
        testId: test.test_id,
        data: {
          test_result: values.test_result,
          result_status: values.result_status as QCResultStatus,
          verified_by: values.verified_by || null,
        },
      });
      message.success("Test result recorded successfully!");
      onClose();
    } catch (error: any) {
      if (error.response?.status === 400) {
        message.error(error.response?.data?.error || "Invalid data");
      } else if (error.name !== "ValidationError") {
        message.error("An error occurred while saving.");
      }
    }
  };

  return (
    <Modal
      title="Record QC Test Result"
      open={isOpen}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={isPending}
      destroyOnClose
      width={640}
    >
      <Descriptions column={2} bordered size="small" style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Test ID">{test.test_id}</Descriptions.Item>
        <Descriptions.Item label="Lot ID">{test.lot_id}</Descriptions.Item>
        <Descriptions.Item label="Test Type">{test.test_type}</Descriptions.Item>
        <Descriptions.Item label="Method">{test.test_method}</Descriptions.Item>
        <Descriptions.Item label="Criteria">{test.acceptance_criteria ?? "-"}</Descriptions.Item>
        <Descriptions.Item label="Current Status">
          {statusCfg ? <Tag color={statusCfg.color}>{statusCfg.label}</Tag> : test.result_status}
        </Descriptions.Item>
        <Descriptions.Item label="Test Date">
          {dayjs(test.test_date).format("YYYY-MM-DD HH:mm")}
        </Descriptions.Item>
        <Descriptions.Item label="Performed By">{test.performed_by}</Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item
          name="test_result"
          label="Test Result"
          rules={[{ required: true, message: "Please enter test result" }]}
        >
          <Input placeholder="Ex: 98.5% purity" />
        </Form.Item>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item
            name="result_status"
            label="Result Status"
            rules={[{ required: true, message: "Please select result status" }]}
          >
            <Select
              placeholder="Select status"
              options={[
                { value: "Pass", label: "Pass" },
                { value: "Fail", label: "Fail" },
              ]}
            />
          </Form.Item>

          <Form.Item name="verified_by" label="Verified By">
            <Input placeholder="Ex: qc_supervisor" />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
