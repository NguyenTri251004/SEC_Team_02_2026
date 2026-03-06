import { useState } from "react";
import { Card, Row, Col, Select, Button, Space, Statistic, Table, Tag } from "antd";
import {
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  BarChartOutlined,
  InboxOutlined,
  SwapOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import DashboardPage from "../dashboard/DashboardPage";
import { SECTION_GAP, CARD_GAP, LOT_STATUS_TAG, TXN_TYPE_TAG } from "../../constants/theme";

interface ReportSummaryItem {
  key: string;
  category: string;
  count: number;
  status: string;
}

const inventorySummary: ReportSummaryItem[] = [
  { key: "1", category: "API", count: 1250, status: "Accepted" },
  { key: "2", category: "Excipient", count: 830, status: "Accepted" },
  { key: "3", category: "Packaging", count: 420, status: "Quarantine" },
  { key: "4", category: "API", count: 50, status: "Rejected" },
];

const recentActivity = [
  { key: "1", date: "2026-03-06", type: "Receipt", count: 12, material: "Various" },
  { key: "2", date: "2026-03-05", type: "Usage", count: 8, material: "Acetaminophen API" },
  { key: "3", date: "2026-03-05", type: "Transfer", count: 3, material: "Ethanol Solvent" },
  { key: "4", date: "2026-03-04", type: "Adjustment", count: 2, material: "Packaging Box Type B" },
];

const summaryColumns: ColumnsType<ReportSummaryItem> = [
  { title: "Category", dataIndex: "category", key: "category" },
  {
    title: "Quantity (units)",
    dataIndex: "count",
    key: "count",
    render: (v: number) => v.toLocaleString(),
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status: string) => {
      const cfg = LOT_STATUS_TAG[status];
      return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : status;
    },
  },
];

const activityColumns: ColumnsType<(typeof recentActivity)[0]> = [
  { title: "Date", dataIndex: "date", key: "date" },
  {
    title: "Type",
    dataIndex: "type",
    key: "type",
    render: (type: string) => {
      const cfg = TXN_TYPE_TAG[type];
      return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : type;
    },
  },
  { title: "Count", dataIndex: "count", key: "count" },
  { title: "Material", dataIndex: "material", key: "material" },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("inventory");

  return (
    <DashboardPage
      title="Reports & Analytics"
      subtitle="Generate inventory, transaction, and audit reports"
      actions={
        <Space>
          <Select
            value={reportType}
            onChange={setReportType}
            style={{ width: 200 }}
            options={[
              { value: "inventory", label: "Inventory Report" },
              { value: "transactions", label: "Transaction Report" },
              { value: "audit", label: "Audit Log" },
              { value: "qc", label: "QC Summary" },
            ]}
          />
          <Button icon={<FileExcelOutlined />}>Export Excel</Button>
          <Button icon={<FilePdfOutlined />}>Export PDF</Button>
        </Space>
      }
    >
      <Row gutter={CARD_GAP} style={{ marginTop: SECTION_GAP }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Lots"
              value={156}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Transactions (30d)"
              value={342}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="QC Pass Rate"
              value={94.2}
              suffix="%"
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Alerts Active"
              value={7}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={CARD_GAP} style={{ marginTop: SECTION_GAP }}>
        <Col xs={24} lg={12}>
          <Card title="Inventory Summary by Category" size="small">
            <Table
              columns={summaryColumns}
              dataSource={inventorySummary}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="Recent Activity"
            size="small"
            extra={
              <Button type="link" icon={<DownloadOutlined />} size="small">
                Download
              </Button>
            }
          >
            <Table
              columns={activityColumns}
              dataSource={recentActivity}
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </DashboardPage>
  );
}
