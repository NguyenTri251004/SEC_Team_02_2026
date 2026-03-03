import { useMemo } from "react";
import { Row, Col } from "antd";
import {
  ExperimentOutlined,
  FileSearchOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import DashboardPage from "../../components/shared/DashboardPage";
import {
  KpiCard,
  ChartCard,
  DataTableCard,
  AlertPanel,
} from "../../components/dashboard";
import { tokens, SECTION_GAP } from "../../constants/theme";
import {
  createLotIdColumn,
  createMaterialNameColumn,
  createMaterialTypeColumn,
  createSupplierNameColumn,
  createReceivedDateColumn,
  createExpirationDateColumn,
  createWaitTimeColumn,
  createTransactionTypeColumn,
  createQuantityColumn,
  createTransactionDateColumn,
} from "../../components/tables/columnFactories";
import {
  useQCStats,
  useQCQueue,
  useRecentTransactions,
} from "../../hooks/useDashboardData";
import type {
  QCStats,
  QCQueueItem,
  InventoryTransaction,
  AlertItem,
} from "../../types";

/* ── Mock data ── */
const MOCK_STATS: QCStats = {
  pending_qc_lots: 15,
  tests_pending_review: 22,
  tests_unverified: 7,
  pass_rate_30d: 94.2,
  rejected_lots_active: 3,
  by_test_type: [
    { test_type: "Identity", pass_count: 98, fail_count: 2, total: 100 },
    { test_type: "Potency", pass_count: 95, fail_count: 5, total: 100 },
    { test_type: "Microbial", pass_count: 90, fail_count: 10, total: 100 },
    { test_type: "Physical", pass_count: 96, fail_count: 4, total: 100 },
  ],
};

const MOCK_QUEUE: QCQueueItem[] = [
  {
    lot_id: "LOT-055",
    material_name: "API-X",
    material_type: "API",
    supplier_name: "Acme",
    quantity: 10,
    unit_of_measure: "kg",
    received_date: "2026-02-25",
    expiration_date: "2027-02-25",
    wait_time_hours: 72,
  },
  {
    lot_id: "LOT-058",
    material_name: "Excipient Y",
    material_type: "Excipient",
    supplier_name: "Beta Inc",
    quantity: 20,
    unit_of_measure: "kg",
    received_date: "2026-02-26",
    expiration_date: "2027-02-26",
    wait_time_hours: 48,
  },
  {
    lot_id: "LOT-061",
    material_name: "Container Z",
    material_type: "Container",
    supplier_name: "Gamma",
    quantity: 500,
    unit_of_measure: "ea",
    received_date: "2026-02-27",
    expiration_date: "2028-02-27",
    wait_time_hours: 24,
  },
  {
    lot_id: "LOT-062",
    material_name: "API-W",
    material_type: "API",
    supplier_name: "Acme",
    quantity: 5,
    unit_of_measure: "kg",
    received_date: "2026-02-28",
    expiration_date: "2027-02-28",
    wait_time_hours: 4,
  },
];

const MOCK_TXN: InventoryTransaction[] = [
  {
    transaction_id: "T100",
    lot_id: "LOT-065",
    transaction_type: "Receipt",
    quantity: 10,
    unit_of_measure: "kg",
    reference_id: null,
    notes: null,
    performed_by: "qc_user",
    transaction_date: "2026-02-28T09:30:00Z",
    created_date: "2026-02-28T09:30:00Z",
    material_name: "API-X",
  },
  {
    transaction_id: "T101",
    lot_id: "LOT-042",
    transaction_type: "Usage",
    quantity: -2,
    unit_of_measure: "kg",
    reference_id: null,
    notes: null,
    performed_by: "qc_user",
    transaction_date: "2026-02-28T09:15:00Z",
    created_date: "2026-02-28T09:15:00Z",
    material_name: "Vitamin D3",
  },
];

/* ── Mock activity trend data for line chart ── */
const MOCK_ACTIVITY_TREND = [
  { date: "Feb 22", tests: 12 },
  { date: "Feb 23", tests: 15 },
  { date: "Feb 24", tests: 10 },
  { date: "Feb 25", tests: 18 },
  { date: "Feb 26", tests: 22 },
  { date: "Feb 27", tests: 14 },
  { date: "Feb 28", tests: 20 },
];

export default function QualityControlDashboard() {
  /* ── React Query hooks ── */
  const { data: statsRes, isLoading: statsLoading } = useQCStats();
  const { data: queueRes, isLoading: queueLoading } = useQCQueue();
  const { data: txnRes, isLoading: txnLoading } = useRecentTransactions();

  const stats = statsRes?.data ?? MOCK_STATS;
  const queue = queueRes?.data ?? MOCK_QUEUE;
  const transactions = txnRes?.data ?? MOCK_TXN;
  const loading = statsLoading;

  /* ── Memoised chart data: stacked bar for pass/fail by test type ── */
  const barData = useMemo(
    () =>
      (stats.by_test_type ?? []).map((t) => ({
        name: t.test_type,
        pass: t.pass_count,
        fail: t.fail_count,
      })),
    [stats.by_test_type],
  );

  /* ── Activity trend (use API data when available, else mock) ── */
  const activityTrend = useMemo(
    () =>
      ((stats as unknown as Record<string, unknown>)
        .activity_trend as typeof MOCK_ACTIVITY_TREND) ?? MOCK_ACTIVITY_TREND,
    [stats],
  );

  /* ── Alerts ── */
  const alerts = useMemo<AlertItem[]>(() => {
    const a: AlertItem[] = [];
    if (stats.rejected_lots_active > 0)
      a.push({
        id: "alt03",
        severity: "critical",
        message: "Rejected lots awaiting action",
        count: stats.rejected_lots_active,
        link: "/lots?status=Rejected",
      });
    const stale = queue.filter((q) => q.wait_time_hours >= 48).length;
    if (stale > 0)
      a.push({
        id: "alt04",
        severity: "warning",
        message: "Lots in quarantine > 48h",
        count: stale,
        link: "/qc?staleDays=2",
      });
    return a;
  }, [stats, queue]);

  /* ── Column definitions ── */
  const queueColumns = [
    createLotIdColumn<QCQueueItem>(),
    createMaterialNameColumn<QCQueueItem>(),
    createMaterialTypeColumn<QCQueueItem>(),
    createSupplierNameColumn<QCQueueItem>(),
    {
      title: "Qty",
      key: "qty",
      sorter: (a: QCQueueItem, b: QCQueueItem) => a.quantity - b.quantity,
      render: (_: unknown, r: QCQueueItem) =>
        `${r.quantity} ${r.unit_of_measure}`,
    },
    createReceivedDateColumn<QCQueueItem>(),
    createExpirationDateColumn<QCQueueItem>(),
    createWaitTimeColumn<QCQueueItem>(),
  ];

  const txnColumns = [
    createTransactionTypeColumn<InventoryTransaction>(),
    createLotIdColumn<InventoryTransaction>(),
    createMaterialNameColumn<InventoryTransaction>(),
    createQuantityColumn<InventoryTransaction>(),
    createTransactionDateColumn<InventoryTransaction>(),
  ];

  const formatPercent = (v: number) => `${v.toFixed(1)}%`;

  /* ── Render (Ant Design Visualization spec:
         KPI → Queue table → Charts → Txn table → Alerts) ── */
  return (
    <DashboardPage
      title="Quality Control Dashboard"
      subtitle="QC queue, test results, and compliance overview"
    >
      {/* ── 1. KPI Scorecards ── */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={4}>
          <KpiCard
            label="Pending Lots"
            value={stats.pending_qc_lots}
            icon={<ExperimentOutlined />}
            iconBg="rgba(250,173,20,0.08)"
            iconColor={tokens.colorWarning}
            loading={loading}
            valueStyle={{ color: tokens.colorWarning }}
          />
        </Col>
        <Col xs={12} sm={5}>
          <KpiCard
            label="Tests Pending"
            value={stats.tests_pending_review}
            icon={<FileSearchOutlined />}
            iconBg="rgba(22,119,255,0.08)"
            iconColor={tokens.colorPrimary}
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={5}>
          <KpiCard
            label="Tests Unverified"
            value={stats.tests_unverified}
            icon={<SafetyCertificateOutlined />}
            iconBg="rgba(114,46,209,0.08)"
            iconColor="#722ed1"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={5}>
          <KpiCard
            label="Pass Rate (30d)"
            value={formatPercent(stats.pass_rate_30d)}
            icon={<CheckCircleOutlined />}
            iconBg="rgba(82,196,26,0.08)"
            iconColor={tokens.colorSuccess}
            loading={loading}
            valueStyle={{ color: tokens.colorSuccess }}
          />
        </Col>
        <Col xs={12} sm={5}>
          <KpiCard
            label="Rejected Active"
            value={stats.rejected_lots_active}
            icon={<CloseCircleOutlined />}
            iconBg="rgba(255,77,79,0.08)"
            iconColor={tokens.colorError}
            loading={loading}
            valueStyle={
              stats.rejected_lots_active > 0
                ? { color: tokens.colorError }
                : undefined
            }
          />
        </Col>
      </Row>

      {/* ── 2. QC Pending Queue (primary work table) ── */}
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<QCQueueItem>
          title="QC Pending Queue"
          columns={queueColumns}
          dataSource={queue}
          rowKey="lot_id"
          loading={queueLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 700 }}
        />
      </div>

      {/* ── 3. Charts: Pass/Fail by Test Type (bar) + QC Activity (line) ── */}
      <Row gutter={[16, 16]} style={{ marginTop: SECTION_GAP }}>
        <Col xs={24} lg={12}>
          <ChartCard
            title="Pass/Fail by Test Type"
            loading={loading}
            empty={barData.length === 0}
            height={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ left: 0, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={tokens.borderColor}
                />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <Bar
                  dataKey="pass"
                  name="Pass"
                  fill={tokens.colorSuccess}
                  stackId="a"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="fail"
                  name="Fail"
                  fill={tokens.colorError}
                  stackId="a"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard
            title="QC Activity (7d)"
            loading={loading}
            empty={activityTrend.length === 0}
            height={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={activityTrend}
                margin={{ left: 0, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={tokens.borderColor}
                />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="tests"
                  name="Tests/day"
                  stroke={tokens.colorPrimary}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
      </Row>

      {/* ── 4. Recent Transactions ── */}
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<InventoryTransaction>
          title="Recent Transactions"
          columns={txnColumns}
          dataSource={transactions}
          rowKey="transaction_id"
          loading={txnLoading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          scroll={{ x: 600 }}
        />
      </div>

      {/* ── 5. Alerts ── */}
      <div style={{ marginTop: SECTION_GAP }}>
        <AlertPanel alerts={alerts} loading={loading} />
      </div>
    </DashboardPage>
  );
}
