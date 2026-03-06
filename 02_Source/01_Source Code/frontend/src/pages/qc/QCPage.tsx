import { useState } from "react";
import { Button, Input, Tag, Space } from "antd";
import { PlusOutlined, SearchOutlined, ExperimentOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import DashboardPage from "../dashboard/DashboardPage";
import { DataTableCard } from "../../components/dashboard";
import { QCTestFormModal } from "../../components/qc/QCTestFormModal";
import { QCResultModal } from "../../components/qc/QCResultModal";
import { QCApproveRejectButtons } from "../../components/qc/QCApproveRejectButtons";
import { useQCTests } from "../../hooks/useQCData";
import { useLots } from "../../hooks/useLotsData";
import { SECTION_GAP, QC_STATUS_TAG } from "../../constants/theme";
import type { QCTest } from "../../types";

export default function QCPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: tests = [], isLoading } = useQCTests();
  const { data: lots = [] } = useLots();

  const [formOpen, setFormOpen] = useState(false);
  const [resultTest, setResultTest] = useState<QCTest | null>(null);

  const filteredData = tests.filter(
    (t) =>
      t.test_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.lot_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.test_type.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const pendingCount = tests.filter((t) => t.result_status === "Pending").length;

  // Collect unique quarantine lot IDs from tests for showing approve/reject
  const quarantineLotIds = new Set(
    lots.filter((l) => l.status === "Quarantine").map((l) => l.lot_id),
  );

  const columns: ColumnsType<QCTest> = [
    {
      title: "Test ID",
      dataIndex: "test_id",
      key: "test_id",
      width: 100,
      sorter: (a, b) => a.test_id.localeCompare(b.test_id),
    },
    {
      title: "Lot ID",
      dataIndex: "lot_id",
      key: "lot_id",
      width: 100,
    },
    {
      title: "Test Type",
      dataIndex: "test_type",
      key: "test_type",
      width: 120,
    },
    {
      title: "Method",
      dataIndex: "test_method",
      key: "test_method",
      ellipsis: true,
    },
    {
      title: "Result",
      dataIndex: "test_result",
      key: "test_result",
      width: 150,
      render: (v: string | null) => v ?? <span style={{ color: "#bbb" }}>Awaiting</span>,
    },
    {
      title: "Criteria",
      dataIndex: "acceptance_criteria",
      key: "acceptance_criteria",
      width: 160,
      ellipsis: true,
    },
    {
      title: "Status",
      dataIndex: "result_status",
      key: "result_status",
      width: 100,
      filters: Object.entries(QC_STATUS_TAG).map(([value, { label }]) => ({
        text: label,
        value,
      })),
      onFilter: (value, record) => record.result_status === value,
      render: (status: string) => {
        const cfg = QC_STATUS_TAG[status];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : status;
      },
    },
    {
      title: "Tested By",
      dataIndex: "performed_by",
      key: "performed_by",
      width: 120,
    },
    {
      title: "Verified By",
      dataIndex: "verified_by",
      key: "verified_by",
      width: 120,
      render: (v: string | null) => v ?? <span style={{ color: "#bbb" }}>-</span>,
    },
    {
      title: "Test Date",
      dataIndex: "test_date",
      key: "test_date",
      width: 140,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD HH:mm"),
      sorter: (a, b) => dayjs(a.test_date).unix() - dayjs(b.test_date).unix(),
      defaultSortOrder: "descend",
    },
    {
      title: "Actions",
      key: "actions",
      width: 140,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          {record.result_status === "Pending" && (
            <Button
              type="text"
              size="small"
              icon={<ExperimentOutlined />}
              onClick={() => setResultTest(record)}
            >
              Record
            </Button>
          )}
          {quarantineLotIds.has(record.lot_id) && (
            <QCApproveRejectButtons lotId={record.lot_id} />
          )}
        </Space>
      ),
    },
  ];

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
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<QCTest>
          title="QC Test Registry"
          extra={
            <Input
              placeholder="Search by Test ID, Lot, or Type..."
              prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          }
          columns={columns}
          dataSource={filteredData}
          rowKey="test_id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1500 }}
        />
      </div>

      <QCTestFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
      />

      <QCResultModal
        isOpen={!!resultTest}
        onClose={() => setResultTest(null)}
        test={resultTest}
      />
    </DashboardPage>
  );
}
