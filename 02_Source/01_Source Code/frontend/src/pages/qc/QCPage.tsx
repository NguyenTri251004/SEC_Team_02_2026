import { useState } from "react";
import { Button, Tag, Space, Progress, Alert, Tooltip, Table, Empty, Tabs } from "antd";
import { PlusOutlined, ExperimentOutlined, ClockCircleOutlined, CheckCircleOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import DashboardPage from "../dashboard/DashboardPage";
import { DataTableCard } from "../../components/dashboard";
import { QCTestFormModal } from "../../components/qc/QCTestFormModal";
import { QCResultModal } from "../../components/qc/QCResultModal";
import { QCApproveRejectButtons } from "../../components/qc/QCApproveRejectButtons";
import { useQCTests, useQCQueue } from "../../hooks/useQCData";
import { SECTION_GAP, QC_STATUS_TAG } from "../../constants/theme";
import type { QCTest, QCQueueItem } from "../../types";

const LOT_STATUS_TAG: Record<string, { label: string; color: string }> = {
  Quarantine: { label: "Quarantine", color: "orange" },
  Accepted: { label: "Accepted", color: "green" },
  Rejected: { label: "Rejected", color: "red" },
  Depleted: { label: "Depleted", color: "default" },
};

export default function QCPage() {
  const { data: tests = [], isLoading: testsLoading } = useQCTests();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: queueData = [], isLoading: queueLoading } = useQCQueue(statusFilter === "all" ? undefined : statusFilter);

  const [formOpen, setFormOpen] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null);
  const [resultTest, setResultTest] = useState<QCTest | null>(null);

  const pendingCount = tests.filter((t) => t.result_status === "Pending").length;

  // Check how many lots are ready for approval (all tests completed and passed)
  const readyForApprovalCount = queueData.filter(
    (item) => item.total_tests > 0 && item.pending_tests === 0
  ).length;

  // Get tests for a specific lot
  const getTestsForLot = (lotId: string): QCTest[] => {
    return tests.filter(t => t.lot_id === lotId);
  };

  // Test columns for expandable section
  const testColumns: ColumnsType<QCTest> = [
    {
      title: "Test Type",
      dataIndex: "test_type",
      key: "test_type",
      width: 130,
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

  // Lot columns (parent rows)
  const lotColumns: ColumnsType<QCQueueItem> = [
    {
      title: "Lot ID",
      dataIndex: "lot_id",
      key: "lot_id",
      width: 90,
      sorter: (a, b) => a.lot_id.localeCompare(b.lot_id),
    },
    {
      title: "Material",
      dataIndex: "material_name",
      key: "material_name",
      width: 140,
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 90,
      render: (status: string) => {
        const cfg = LOT_STATUS_TAG[status];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : status;
      },
    },
    {
      title: "Received Date",
      dataIndex: "received_date",
      key: "received_date",
      width: 110,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD"),
      sorter: (a, b) => dayjs(a.received_date).unix() - dayjs(b.received_date).unix(),
      defaultSortOrder: "ascend",
    },
    {
      title: "Test Progress",
      key: "test_progress",
      width: 140,
      render: (_, record) => {
        const completed = record.total_tests - record.pending_tests;
        const percent = record.total_tests > 0 
          ? Math.round((completed / record.total_tests) * 100) 
          : 0;
        const statusIcon = record.total_tests === 0 
          ? <ClockCircleOutlined style={{ color: "#faad14" }} />
          : completed === record.total_tests
          ? <CheckCircleOutlined style={{ color: "#52c41a" }} />
          : <ClockCircleOutlined style={{ color: "#1890ff" }} />;
        
        return (
          <Space direction="vertical" size={4} style={{ width: "100%" }}>
            <Tooltip title={`${completed} of ${record.total_tests} tests completed`}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {statusIcon}
                <span style={{ fontSize: 12 }}>
                  {completed}/{record.total_tests} tests
                </span>
              </div>
            </Tooltip>
            {record.total_tests > 0 && (
              <Progress 
                percent={percent} 
                size="small" 
                status={completed === record.total_tests ? "success" : "active"}
                showInfo={false}
              />
            )}
          </Space>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space size="small">
          {record.status === "Quarantine" && (
            <Button
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedLotId(record.lot_id);
                setFormOpen(true);
              }}
            >
              Add Test
            </Button>
          )}
          {record.status === "Quarantine" && record.total_tests > 0 && record.pending_tests === 0 && (
            <QCApproveRejectButtons lotId={record.lot_id} showText />
          )}
        </Space>
      ),
    },
  ];

  // Render expandable row with tests table
  const expandedRowRender = (lot: QCQueueItem) => {
    const lotTests = getTestsForLot(lot.lot_id);

    if (lotTests.length === 0) {
      return (
        <div style={{ padding: "24px", textAlign: "center" }}>
          <Empty
            description="No tests created for this lot yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => {
                setSelectedLotId(lot.lot_id);
                setFormOpen(true);
              }}
            >
              Create First Test
            </Button>
          </Empty>
        </div>
      );
    }

    return (
      <Table
        columns={testColumns}
        dataSource={lotTests}
        rowKey="test_id"
        size="small"
        pagination={false}
        showHeader={true}
      />
    );
  };

  return (
    <DashboardPage
      title="Quality Control"
      subtitle="Manage QC tests, approve or reject lot quality"
      actions={
        <Space>
          {pendingCount > 0 && (
            <Tag color="processing" style={{ fontSize: 13, padding: "2px 10px" }}>
              {pendingCount} Pending
            </Tag>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setFormOpen(true)}>
            Create QC Test
          </Button>
        </Space>
      }
    >
      {/* Alert for lots ready for approval */}
      {(statusFilter === "all" || statusFilter === "Quarantine") && readyForApprovalCount > 0 && (
        <Alert
          message={`${readyForApprovalCount} lot(s) ready for approval`}
          description="All tests completed. Review test results and approve or reject the lot(s)."
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          closable
          style={{ marginBottom: SECTION_GAP }}
        />
      )}

      {/* QC Queue with Expandable Tests */}
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<QCQueueItem>
          title="QC Testing - Lot Management"
          extra={
            <Tabs
              activeKey={statusFilter}
              onChange={setStatusFilter}
              size="small"
              items={[
                { key: "all", label: "All Lots" },
                { key: "Quarantine", label: "🟠 Quarantine" },
                { key: "Accepted", label: "✅ Accepted" },
                { key: "Rejected", label: "❌ Rejected" },
              ]}
            />
          }
          columns={lotColumns}
          dataSource={queueData}
          rowKey="lot_id"
          loading={queueLoading || testsLoading}
          pagination={{ pageSize: 10 }}
          expandable={{
            expandedRowRender,
            rowExpandable: () => true,
          }}
        />
      </div>

      <QCTestFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setSelectedLotId(null);
        }}
        prefilledLotId={selectedLotId}
      />

      <QCResultModal
        isOpen={!!resultTest}
        onClose={() => setResultTest(null)}
        test={resultTest}
      />
    </DashboardPage>
  );
}
