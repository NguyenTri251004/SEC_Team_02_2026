import { useState, useEffect } from "react";
import { Modal, Descriptions, Table, Button, Space, Tag, Divider, Empty } from "antd";
import { PlusOutlined, ExperimentOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import { QCTestFormModal } from "./QCTestFormModal";
import { QCResultModal } from "./QCResultModal";
import { QCApproveRejectButtons } from "./QCApproveRejectButtons";
import { useQCTests } from "@/hooks/useQCData";
import { QC_STATUS_TAG } from "@/constants/theme";
import type { QCQueueItem, QCTest } from "@/types";

interface LotQCDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  lot: QCQueueItem | null;
}

export function LotQCDetailModal({ isOpen, onClose, lot }: LotQCDetailModalProps) {
  const { data: allTests = [] } = useQCTests();
  const [testFormOpen, setTestFormOpen] = useState(false);
  const [selectedLot, setSelectedLot] = useState<string | null>(null);
  const [resultTest, setResultTest] = useState<QCTest | null>(null);

  // Filter tests for current lot
  const lotTests = lot ? allTests.filter(t => t.lot_id === lot.lot_id) : [];

  // Calculate test statistics
  const passCount = lotTests.filter(t => t.result_status === "Pass").length;
  const failCount = lotTests.filter(t => t.result_status === "Fail").length;
  const pendingCount = lotTests.filter(t => t.result_status === "Pending").length;
  const totalTests = lotTests.length;

  const canApprove = totalTests > 0 && pendingCount === 0 && failCount === 0;

  useEffect(() => {
    if (isOpen && lot) {
      setSelectedLot(lot.lot_id);
    }
  }, [isOpen, lot]);

  if (!lot) return null;

  const columns: ColumnsType<QCTest> = [
    {
      title: "Test Type",
      dataIndex: "test_type",
      key: "test_type",
      width: 140,
    },
    {
      title: "Method",
      dataIndex: "test_method",
      key: "test_method",
      ellipsis: true,
    },
    {
      title: "Criteria",
      dataIndex: "acceptance_criteria",
      key: "acceptance_criteria",
      width: 180,
      ellipsis: true,
      render: (v: string | null) => v ?? <span style={{ color: "#bbb" }}>-</span>,
    },
    {
      title: "Result",
      dataIndex: "test_result",
      key: "test_result",
      width: 150,
      render: (v: string | null) => v ?? <span style={{ color: "#bbb" }}>Awaiting</span>,
    },
    {
      title: "Status",
      dataIndex: "result_status",
      key: "result_status",
      width: 100,
      render: (status: string) => {
        const cfg = QC_STATUS_TAG[status];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : status;
      },
    },
    {
      title: "Test Date",
      dataIndex: "test_date",
      key: "test_date",
      width: 120,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD"),
    },
    {
      title: "Verified By",
      dataIndex: "verified_by",
      key: "verified_by",
      width: 120,
      render: (v: string | null) => v ?? <span style={{ color: "#bbb" }}>-</span>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        record.result_status === "Pending" && (
          <Button
            type="link"
            size="small"
            icon={<ExperimentOutlined />}
            onClick={() => setResultTest(record)}
          >
            Record
          </Button>
        )
      ),
    },
  ];

  const handleAddTest = () => {
    setTestFormOpen(true);
  };

  const handleCloseTestForm = () => {
    setTestFormOpen(false);
  };

  const handleCloseResultModal = () => {
    setResultTest(null);
  };

  return (
    <>
      <Modal
        title={`QC Testing - Lot ${lot.lot_id}`}
        open={isOpen}
        onCancel={onClose}
        width={1200}
        footer={null}
        destroyOnClose
      >
        {/* Lot Information */}
        <Descriptions column={3} bordered size="small" style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Lot ID" span={1}>{lot.lot_id}</Descriptions.Item>
          <Descriptions.Item label="Material" span={2}>{lot.material_name}</Descriptions.Item>
          <Descriptions.Item label="Manufacturer">{lot.manufacturer_name}</Descriptions.Item>
          <Descriptions.Item label="Manufacturer Lot">{lot.manufacturer_lot}</Descriptions.Item>
          <Descriptions.Item label="Received Date">
            {dayjs(lot.received_date).format("YYYY-MM-DD")}
          </Descriptions.Item>
          <Descriptions.Item label="Expiration Date">
            {dayjs(lot.expiration_date).format("YYYY-MM-DD")}
          </Descriptions.Item>
          <Descriptions.Item label="Quantity">
            {lot.quantity} {lot.unit_of_measure}
          </Descriptions.Item>
          <Descriptions.Item label="Storage Location">{lot.storage_location}</Descriptions.Item>
        </Descriptions>

        {/* Test Summary */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          padding: "12px 16px",
          background: "#fafafa",
          borderRadius: 6,
          marginBottom: 16
        }}>
          <Space size="large">
            <div>
              <span style={{ color: "#999", fontSize: 13 }}>Total Tests:</span>{" "}
              <strong style={{ fontSize: 16 }}>{totalTests}</strong>
            </div>
            <div>
              <Tag color="success" style={{ margin: 0 }}>
                {passCount} Pass
              </Tag>
            </div>
            <div>
              <Tag color="error" style={{ margin: 0 }}>
                {failCount} Fail
              </Tag>
            </div>
            <div>
              <Tag color="processing" style={{ margin: 0 }}>
                {pendingCount} Pending
              </Tag>
            </div>
          </Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddTest}
          >
            Add Test
          </Button>
        </div>

        {/* Tests Table */}
        <Table<QCTest>
          columns={columns}
          dataSource={lotTests}
          rowKey="test_id"
          size="small"
          pagination={false}
          scroll={{ x: 900 }}
          locale={{
            emptyText: (
              <Empty
                description="No tests created yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTest}>
                  Create First Test
                </Button>
              </Empty>
            ),
          }}
        />

        {/* Approval Section */}
        {totalTests > 0 && (
          <>
            <Divider />
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center" 
            }}>
              <div>
                {canApprove ? (
                  <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 13 }}>
                    Ready for Approval - All tests passed
                  </Tag>
                ) : pendingCount > 0 ? (
                  <Tag color="warning" icon={<CloseCircleOutlined />} style={{ fontSize: 13 }}>
                    {pendingCount} test(s) pending - Cannot approve yet
                  </Tag>
                ) : failCount > 0 ? (
                  <Tag color="error" icon={<CloseCircleOutlined />} style={{ fontSize: 13 }}>
                    {failCount} test(s) failed - Cannot approve
                  </Tag>
                ) : null}
              </div>
              <Space>
                <QCApproveRejectButtons lotId={lot.lot_id} showText />
              </Space>
            </div>
          </>
        )}
      </Modal>

      {/* Test Form Modal */}
      <QCTestFormModal
        isOpen={testFormOpen}
        onClose={handleCloseTestForm}
        prefilledLotId={selectedLot}
      />

      {/* Result Modal */}
      <QCResultModal
        isOpen={!!resultTest}
        onClose={handleCloseResultModal}
        test={resultTest}
      />
    </>
  );
}
