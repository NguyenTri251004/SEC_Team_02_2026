import { useMemo, useState } from "react";
import { Row, Col, Segmented } from "antd";
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
import DashboardPage from "./DashboardPage";
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
  createReceivedDateColumn,
  createExpirationDateColumn,
  createTransactionTypeColumn,
  createQuantityColumn,
  createTransactionDateColumn,
  createPerformedByColumn,
} from "../../components/common/tables/columnFactories";
import {
  useQCStats,
  useQCQueue,
  useRecentTransactions,
  useRecentQCTests,
} from "../../hooks/useDashboardData";
import type {
  QCStats,
  QCQueueItem,
  InventoryTransaction,
  AlertItem,
  QCTest,
} from "../../types";

type ActivityRange = "7d" | "14d" | "30d";

const ACTIVITY_RANGE_OPTIONS: { label: string; value: ActivityRange }[] = [
  { label: "7d", value: "7d" },
  { label: "14d", value: "14d" },
  { label: "30d", value: "30d" },
];

interface ActivityPoint {
  date: string;
  test_count: number;
}

interface BackendQCStats {
  pending_count?: number;
  total_tests_30d?: number;
  pass_rate_30d?: number;
  tests_by_type?: BackendQCTestTypeStat[];
  rejected_lots_active?: number;
  activity_trend?: ActivityPoint[];
}

interface BackendQCTestTypeStat {
  test_type: string;
  count: number;
  pass_count: number;
}

const EMPTY_QC_STATS: QCStats = {
  pending_qc_lots: 0,
  tests_pending_review: 0,
  tests_unverified: 0,
  pass_rate_30d: 0,
  rejected_lots_active: 0,
  by_test_type: [],
  activity_trend: [],
};
const EMPTY_QC_QUEUE: QCQueueItem[] = [];
const EMPTY_TRANSACTIONS: InventoryTransaction[] = [];
const EMPTY_QC_TESTS: QCTest[] = [];

function hasActivityTrendData(value: QCStats | BackendQCStats): value is (
  QCStats | BackendQCStats
) & {
  activity_trend: ActivityPoint[];
} {
  return (
    "activity_trend" in value &&
    Array.isArray((value as { activity_trend?: unknown }).activity_trend)
  );
}

function hasBackendTestsByType(
  value: QCStats | BackendQCStats,
): value is BackendQCStats & { tests_by_type: BackendQCTestTypeStat[] } {
  return "tests_by_type" in value && Array.isArray(value.tests_by_type);
}

function normalizeQCStats(
  value: QCStats | BackendQCStats | undefined,
): QCStats {
  if (!value) {
    return EMPTY_QC_STATS;
  }

  const byTestType =
    "by_test_type" in value && Array.isArray(value.by_test_type)
      ? value.by_test_type
      : hasBackendTestsByType(value)
        ? value.tests_by_type.map((item: BackendQCTestTypeStat) => ({
            test_type: item.test_type,
            pass_count: item.pass_count,
            fail_count: Math.max(item.count - item.pass_count, 0),
            total: item.count,
          }))
        : [];

  return {
    pending_qc_lots:
      "pending_qc_lots" in value
        ? value.pending_qc_lots
        : value.pending_count ?? 0,
    tests_pending_review:
      "tests_pending_review" in value
        ? value.tests_pending_review
        : value.pending_count ?? 0,
    tests_unverified:
      "tests_unverified" in value ? value.tests_unverified : 0,
    pass_rate_30d: value.pass_rate_30d ?? 0,
    rejected_lots_active: value.rejected_lots_active ?? 0,
    by_test_type: byTestType,
    activity_trend:
      "activity_trend" in value && Array.isArray(value.activity_trend)
        ? value.activity_trend
        : [],
  };
}

function applyRange<T>(rows: T[], range: ActivityRange): T[] {
  if (range === "7d") {
    return rows.slice(-7);
  }
  if (range === "14d") {
    return rows.slice(-14);
  }
  return rows.slice(-30);
}

export default function QualityControlDashboard() {
  const [activityRange, setActivityRange] = useState<ActivityRange>("7d");

  /* ── React Query hooks ── */
  const { data: statsRes, isLoading: statsLoading } = useQCStats();
  const { data: activityStatsRes } = useQCStats(
    `period=${activityRange}&groupBy=day`,
  );
  const { data: queueRes, isLoading: queueLoading } = useQCQueue();
  const { data: txnRes, isLoading: txnLoading } = useRecentTransactions();
  const { data: recentTestsRes, isLoading: testsLoading } = useRecentQCTests();

  const stats = normalizeQCStats(
    statsRes?.data as QCStats | BackendQCStats | undefined,
  );
  const activityStats = normalizeQCStats(
    (activityStatsRes?.data ?? statsRes?.data) as
      | QCStats
      | BackendQCStats
      | undefined,
  );
  const queue = queueRes?.data ?? EMPTY_QC_QUEUE;
  const transactions = txnRes?.data ?? EMPTY_TRANSACTIONS;
  const recentQCTests = recentTestsRes?.data ?? EMPTY_QC_TESTS;
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
  const activityTrend = useMemo(() => {
    const source = hasActivityTrendData(activityStats)
      ? activityStats.activity_trend.map((point) => ({
          date: point.date,
          tests: point.test_count,
        }))
      : [];
    return applyRange(source, activityRange);
  }, [activityRange, activityStats]);

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
    const stale = queue.filter((q) => q.pending_tests > 0).length;
    if (stale > 0)
      a.push({
        id: "alt04",
        severity: "warning",
        message: "Lots with pending tests",
        count: stale,
        link: "/qc",
      });
    return a;
  }, [stats, queue]);

  /* ── Column definitions ── */
  const queueColumns = [
    createLotIdColumn<QCQueueItem>(),
    createMaterialNameColumn<QCQueueItem>(),
    createMaterialTypeColumn<QCQueueItem>(),
    {
      title: "Qty",
      key: "qty",
      sorter: (a: QCQueueItem, b: QCQueueItem) => a.quantity - b.quantity,
      render: (_: unknown, r: QCQueueItem) =>
        `${r.quantity} ${r.unit_of_measure}`,
    },
    createReceivedDateColumn<QCQueueItem>(),
    createExpirationDateColumn<QCQueueItem>(),
  ];

  const txnColumns = [
    createTransactionTypeColumn<InventoryTransaction>(),
    createLotIdColumn<InventoryTransaction>(),
    createMaterialNameColumn<InventoryTransaction>(),
    createQuantityColumn<InventoryTransaction>(),
    createTransactionDateColumn<InventoryTransaction>(),
  ];

  const recentQCTestColumns = [
    {
      title: "Test Type",
      dataIndex: "test_type" as const,
      key: "test_type",
      sorter: (a: QCTest, b: QCTest) => a.test_type.localeCompare(b.test_type),
    },
    createLotIdColumn<QCTest>(),
    createMaterialNameColumn<QCTest>(),
    {
      title: "Status",
      dataIndex: "result_status" as const,
      key: "result_status",
      sorter: (a: QCTest, b: QCTest) =>
        a.result_status.localeCompare(b.result_status),
    },
    createPerformedByColumn<QCTest>(),
    {
      title: "Test Date",
      dataIndex: "test_date" as const,
      key: "test_date",
      sorter: (a: QCTest, b: QCTest) =>
        new Date(a.test_date).getTime() - new Date(b.test_date).getTime(),
      defaultSortOrder: "descend" as const,
      render: (value: string) => new Date(value).toLocaleString(),
    },
  ];

  const qcDecisionTransactions = useMemo(
    () =>
      transactions.filter(
        (transaction) =>
          transaction.transaction_type === "QC_Approved" ||
          transaction.transaction_type === "QC_Rejected",
      ),
    [transactions],
  );

  const showRecentTransactions = qcDecisionTransactions.length > 0;

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
            label="Rejected Lots"
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

      {/* ── 2. QC Work Queue (Quarantine lots only) ── */}
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<QCQueueItem>
          title="QC Work Queue"
          columns={queueColumns}
          dataSource={queue}
          rowKey="lot_id"
          loading={queueLoading}
          pagination={{ pageSize: 10 }}
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
            title={`Completed QC Tests (${activityRange})`}
            loading={loading}
            empty={activityTrend.length === 0}
            height={280}
            extra={
              <Segmented<ActivityRange>
                size="small"
                options={ACTIVITY_RANGE_OPTIONS}
                value={activityRange}
                onChange={(value) => setActivityRange(value)}
              />
            }
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
                  name="Completed tests/day"
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

      {/* ── 4. Recent Transactions / QC Tests ── */}
      <div style={{ marginTop: SECTION_GAP }}>
        {showRecentTransactions ? (
          <DataTableCard<InventoryTransaction>
            title="My Recent Transactions"
            columns={txnColumns}
            dataSource={qcDecisionTransactions}
            rowKey="transaction_id"
            loading={txnLoading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 600 }}
          />
        ) : (
          <DataTableCard<QCTest>
            title="My Recent QC Tests"
            columns={recentQCTestColumns}
            dataSource={recentQCTests}
            rowKey="test_id"
            loading={testsLoading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 700 }}
          />
        )}
      </div>

      {/* ── 5. Alerts ── */}
      <div style={{ marginTop: SECTION_GAP }}>
        <AlertPanel alerts={alerts} loading={loading} />
      </div>
    </DashboardPage>
  );
}
