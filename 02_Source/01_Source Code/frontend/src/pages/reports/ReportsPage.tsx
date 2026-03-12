import { useState, useMemo } from "react";
import { Card, Row, Col, Select, Button, Space, Statistic, Table, Tag, DatePicker, message, Spin } from "antd";
import {
  FileExcelOutlined,
  FilePdfOutlined,
  BarChartOutlined,
  InboxOutlined,
  SwapOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";

import DashboardPage from "../dashboard/DashboardPage";
import { SECTION_GAP, CARD_GAP, LOT_STATUS_TAG, TXN_TYPE_TAG } from "../../constants/theme";
import { exportToCSV, exportToPDF } from "../../lib/exportUtils";
import { useInventoryReport, useTransactionReport, useAuditLog } from "../../hooks/useReportsData";
import type { InventoryReportRow, TransactionReportRow, AuditLogRow } from "../../types";

type ReportType = "inventory" | "transactions" | "audit";

// ---- Column definitions ----

const inventoryColumns: ColumnsType<InventoryReportRow> = [
  { title: "Lot ID", dataIndex: "lot_id", key: "lot_id", width: 110 },
  { title: "Material", dataIndex: "material_name", key: "material_name" },
  { title: "Type", dataIndex: "material_type", key: "material_type", width: 100 },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    width: 110,
    render: (s: string) => {
      const cfg = LOT_STATUS_TAG[s as keyof typeof LOT_STATUS_TAG];
      return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{s}</Tag>;
    },
  },
  {
    title: "Quantity",
    dataIndex: "quantity",
    key: "quantity",
    width: 100,
    render: (v: number, row) => `${v?.toLocaleString() ?? 0} ${row.unit_of_measure}`,
  },
  { title: "Received", dataIndex: "received_date", key: "received_date", width: 110, render: (d: string) => d?.slice(0, 10) },
  { title: "Expires", dataIndex: "expiration_date", key: "expiration_date", width: 110, render: (d: string) => d?.slice(0, 10) ?? "—" },
  { title: "Location", dataIndex: "storage_location", key: "storage_location" },
];

const transactionColumns: ColumnsType<TransactionReportRow> = [
  { title: "Transaction ID", dataIndex: "transaction_id", key: "transaction_id", width: 130 },
  { title: "Lot ID", dataIndex: "lot_id", key: "lot_id", width: 110 },
  {
    title: "Type",
    dataIndex: "transaction_type",
    key: "transaction_type",
    width: 110,
    render: (t: string) => {
      const cfg = TXN_TYPE_TAG[t as keyof typeof TXN_TYPE_TAG];
      return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{t}</Tag>;
    },
  },
  {
    title: "Quantity",
    dataIndex: "quantity",
    key: "quantity",
    width: 100,
    render: (v: number, row) => `${v?.toLocaleString() ?? 0} ${row.unit_of_measure}`,
  },
  { title: "Performed By", dataIndex: "performed_by", key: "performed_by" },
  { title: "Date", dataIndex: "transaction_date", key: "transaction_date", width: 160, render: (d: string) => d?.slice(0, 16).replace("T", " ") ?? "—" },
  { title: "Notes", dataIndex: "notes", key: "notes", ellipsis: true },
];

const auditColumns: ColumnsType<AuditLogRow> = [
  { title: "Event", dataIndex: "event_type", key: "event_type", width: 120 },
  { title: "Date", dataIndex: "event_date", key: "event_date", width: 160, render: (d: string) => d?.slice(0, 16).replace("T", " ") ?? "—" },
  { title: "Lot ID", dataIndex: "lot_id", key: "lot_id", width: 110 },
  { title: "Performed By", dataIndex: "performed_by", key: "performed_by" },
  { title: "Details", dataIndex: "details", key: "details", ellipsis: true },
  { title: "Notes", dataIndex: "notes", key: "notes", ellipsis: true },
];

// ---- Component ----

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("inventory");
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const dateFilters = useMemo(() => {
    if (!dateRange?.[0] || !dateRange?.[1]) return {} as Record<string, string>;
    return {
      date_from: dateRange[0].format("YYYY-MM-DD"),
      date_to: dateRange[1].format("YYYY-MM-DD"),
    } as Record<string, string>;
  }, [dateRange]);

  const { data: inventoryData, isLoading: loadingInv } = useInventoryReport(
    reportType === "inventory" ? dateFilters : undefined,
  );
  const { data: transactionData, isLoading: loadingTxn } = useTransactionReport(
    reportType === "transactions" ? dateFilters : undefined,
  );
  const { data: auditData, isLoading: loadingAudit } = useAuditLog(
    reportType === "audit" ? dateFilters : undefined,
  );

  const isLoading = loadingInv || loadingTxn || loadingAudit;

  // KPI derived from real data
  const totalLots = inventoryData?.length ?? 0;
  const totalTransactions = transactionData?.length ?? 0;

  function getCurrentData(): Record<string, unknown>[] {
    if (reportType === "inventory") return (inventoryData ?? []) as unknown as Record<string, unknown>[];
    if (reportType === "transactions") return (transactionData ?? []) as unknown as Record<string, unknown>[];
    return (auditData ?? []) as unknown as Record<string, unknown>[];
  }

  function getCurrentCSVColumns() {
    if (reportType === "inventory") return [
      { key: "lot_id", title: "Lot ID" },
      { key: "material_name", title: "Material" },
      { key: "material_type", title: "Type" },
      { key: "status", title: "Status" },
      { key: "quantity", title: "Quantity" },
      { key: "unit_of_measure", title: "Unit" },
      { key: "received_date", title: "Received" },
      { key: "expiration_date", title: "Expires" },
      { key: "storage_location", title: "Location" },
    ];
    if (reportType === "transactions") return [
      { key: "transaction_id", title: "Transaction ID" },
      { key: "lot_id", title: "Lot ID" },
      { key: "transaction_type", title: "Type" },
      { key: "quantity", title: "Quantity" },
      { key: "unit_of_measure", title: "Unit" },
      { key: "performed_by", title: "Performed By" },
      { key: "transaction_date", title: "Date" },
      { key: "notes", title: "Notes" },
    ];
    return [
      { key: "event_type", title: "Event" },
      { key: "event_date", title: "Date" },
      { key: "lot_id", title: "Lot ID" },
      { key: "performed_by", title: "Performed By" },
      { key: "details", title: "Details" },
      { key: "notes", title: "Notes" },
    ];
  }

  function getReportTitle() {
    if (reportType === "inventory") return "Inventory Report";
    if (reportType === "transactions") return "Transaction Report";
    return "Audit Log";
  }

  const handleExportCSV = () => {
    const data = getCurrentData();
    if (!data.length) { message.warning("No data to export"); return; }
    exportToCSV(data, getCurrentCSVColumns(), `${reportType}-report`);
    message.success("Exported to CSV!");
  };

  const handleExportPDF = () => {
    const data = getCurrentData();
    if (!data.length) { message.warning("No data to export"); return; }
    exportToPDF(data, getCurrentCSVColumns(), getReportTitle(), `${reportType}-report`);
    message.success("Exported to PDF!");
  };

  return (
    <DashboardPage
      title="Reports & Analytics"
      subtitle="Generate inventory, transaction, and audit reports"
      actions={
        <Space wrap>
          <Select
            value={reportType}
            onChange={(v) => setReportType(v as ReportType)}
            style={{ width: 200 }}
            options={[
              { value: "inventory", label: "Inventory Report" },
              { value: "transactions", label: "Transaction Report" },
              { value: "audit", label: "Audit Log" },
            ]}
          />
          <DatePicker.RangePicker
            value={dateRange}
            onChange={(dates) => setDateRange(dates as [Dayjs | null, Dayjs | null] | null)}
            style={{ width: 260 }}
          />
          <Button icon={<FileExcelOutlined />} onClick={handleExportCSV}>Export CSV</Button>
          <Button icon={<FilePdfOutlined />} onClick={handleExportPDF} type="primary">Export PDF</Button>
        </Space>
      }
    >
      <Row gutter={CARD_GAP} style={{ marginTop: SECTION_GAP }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Lots (Inventory)"
              value={totalLots}
              prefix={<InboxOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Transactions"
              value={totalTransactions}
              prefix={<SwapOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Accepted Lots"
              value={inventoryData?.filter((r) => r.status === "Accepted").length ?? 0}
              prefix={<SafetyCertificateOutlined />}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Quarantine / Rejected"
              value={(inventoryData?.filter((r) => r.status === "Quarantine" || r.status === "Rejected").length) ?? 0}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: "#ff4d4f" }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={CARD_GAP} style={{ marginTop: SECTION_GAP }}>
        <Col xs={24}>
          <Card
            title={getReportTitle()}
            size="small"
          >
            <Spin spinning={isLoading}>
              {reportType === "inventory" && (
                <Table<InventoryReportRow>
                  columns={inventoryColumns}
                  dataSource={(inventoryData ?? []).map((r) => ({ ...r, key: r.lot_id }))}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                  size="small"
                  scroll={{ x: 900 }}
                />
              )}
              {reportType === "transactions" && (
                <Table<TransactionReportRow>
                  columns={transactionColumns}
                  dataSource={(transactionData ?? []).map((r) => ({ ...r, key: r.transaction_id }))}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                  size="small"
                  scroll={{ x: 900 }}
                />
              )}
              {reportType === "audit" && (
                <Table<AuditLogRow>
                  columns={auditColumns}
                  dataSource={(auditData ?? []).map((r, i) => ({ ...r, key: `${r.lot_id}-${i}` }))}
                  pagination={{ pageSize: 20, showSizeChanger: true }}
                  size="small"
                  scroll={{ x: 900 }}
                />
              )}
            </Spin>
          </Card>
        </Col>
      </Row>
    </DashboardPage>
  );
}
