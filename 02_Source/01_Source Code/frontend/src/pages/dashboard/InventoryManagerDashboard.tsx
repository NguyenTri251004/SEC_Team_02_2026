import { useMemo } from "react";
import { Row, Col } from "antd";
import {
  CheckCircleOutlined,
  StopOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  WarningOutlined,
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
import { formatQuantitiesByUnit } from "./utils/formatters";
import {
  KpiCard,
  ChartCard,
  DataTableCard,
  AlertPanel,
} from "../../components/dashboard";
import { tokens, SECTION_GAP } from "../../constants/theme";
import {
  createTransactionTypeColumn,
  createLotIdColumn,
  createMaterialNameColumn,
  createQuantityColumn,
  createPerformedByColumn,
  createTransactionDateColumn,
  createExpirationDateColumn,
  createDaysToExpiryColumn,
  createLotStatusColumn,
  createStorageLocationColumn,
} from "../../components/tables/columnFactories";
import {
  useInventorySummary,
  useTransactionSummary,
  useRecentTransactions,
  useExpiringLots,
} from "../../hooks/useDashboardData";
import type {
  InventorySummary,
  TransactionSummary,
  InventoryTransaction,
  ExpiringLot,
  AlertItem,
} from "../../types";

/* ── Mock data ── */
const MOCK_INV: InventorySummary = {
  by_status: [
    {
      status: "Accepted",
      lot_count: 5240,
      quantities_by_unit: [
        { unit_of_measure: "kg", total_quantity: 420 },
        { unit_of_measure: "ea", total_quantity: 200 },
      ],
    },
    {
      status: "Quarantine",
      lot_count: 15,
      quantities_by_unit: [{ unit_of_measure: "kg", total_quantity: 82 }],
    },
    {
      status: "Rejected",
      lot_count: 8,
      quantities_by_unit: [{ unit_of_measure: "kg", total_quantity: 12 }],
    },
    {
      status: "Depleted",
      lot_count: 2978,
      quantities_by_unit: [{ unit_of_measure: "kg", total_quantity: 0 }],
    },
  ],
  by_material_type: [
    { material_type: "API", unit_of_measure: "kg", total_quantity: 420 },
    {
      material_type: "Excipient",
      unit_of_measure: "L",
      total_quantity: 340,
    },
    {
      material_type: "Container",
      unit_of_measure: "ea",
      total_quantity: 200,
    },
  ],
};

const MOCK_TXN_SUMMARY: TransactionSummary = {
  today_receipts: 24,
  today_issues: 18,
};

const MOCK_TRANSACTIONS: InventoryTransaction[] = [
  {
    transaction_id: "T001",
    lot_id: "LOT-065",
    transaction_type: "Receipt",
    quantity: 10,
    unit_of_measure: "kg",
    reference_id: null,
    notes: null,
    performed_by: "op01",
    transaction_date: "2026-02-28T09:30:00Z",
    created_date: "2026-02-28T09:30:00Z",
    material_name: "API-X",
  },
  {
    transaction_id: "T002",
    lot_id: "LOT-042",
    transaction_type: "Usage",
    quantity: -2,
    unit_of_measure: "kg",
    reference_id: null,
    notes: null,
    performed_by: "prod01",
    transaction_date: "2026-02-28T09:15:00Z",
    created_date: "2026-02-28T09:15:00Z",
    material_name: "Vitamin D3",
  },
  {
    transaction_id: "T003",
    lot_id: "LOT-033",
    transaction_type: "Transfer",
    quantity: 0,
    unit_of_measure: "kg",
    reference_id: null,
    notes: null,
    performed_by: "op02",
    transaction_date: "2026-02-28T09:00:00Z",
    created_date: "2026-02-28T09:00:00Z",
    material_name: "Excipient B",
  },
];

const MOCK_EXPIRING: ExpiringLot[] = [
  {
    lot_id: "LOT-042",
    material_name: "Vitamin D3",
    status: "Accepted",
    quantity: 5,
    unit_of_measure: "kg",
    expiration_date: "2026-03-15",
    days_to_expiry: 15,
    storage_location: "WH-A-01",
  },
  {
    lot_id: "LOT-018",
    material_name: "Excipient B",
    status: "Accepted",
    quantity: 12,
    unit_of_measure: "kg",
    expiration_date: "2026-03-22",
    days_to_expiry: 22,
    storage_location: "WH-B-03",
  },
];

const STATUS_ICON: Record<string, React.ReactNode> = {
  Accepted: <CheckCircleOutlined />,
  Quarantine: <StopOutlined />,
  Rejected: <CloseCircleOutlined />,
  Depleted: <MinusCircleOutlined />,
};

const STATUS_COLOR: Record<string, string> = {
  Accepted: tokens.colorSuccess,
  Quarantine: tokens.colorWarning,
  Rejected: tokens.colorError,
  Depleted: "rgba(0,0,0,0.25)",
};

/* ── Mock trend data for Receipt vs Usage line chart ── */
const MOCK_TREND = [
  { date: "Feb 01", receipts: 18, issues: 12 },
  { date: "Feb 05", receipts: 22, issues: 15 },
  { date: "Feb 10", receipts: 15, issues: 20 },
  { date: "Feb 15", receipts: 28, issues: 22 },
  { date: "Feb 20", receipts: 20, issues: 18 },
  { date: "Feb 25", receipts: 24, issues: 16 },
  { date: "Feb 28", receipts: 24, issues: 18 },
];

export default function InventoryManagerDashboard() {
  /* ── React Query hooks ── */
  const { data: invRes, isLoading: invLoading } = useInventorySummary();
  const { data: txnSumRes, isLoading: txnSumLoading } = useTransactionSummary();
  const { data: txnRes, isLoading: txnLoading } = useRecentTransactions();
  const { data: expRes, isLoading: expLoading } = useExpiringLots();

  const invSummary = invRes?.data ?? MOCK_INV;
  const txnSummary = txnSumRes?.data ?? MOCK_TXN_SUMMARY;
  const transactions = txnRes?.data ?? MOCK_TRANSACTIONS;
  const expiring = expRes?.data ?? MOCK_EXPIRING;
  const expiringCount = expRes?.total ?? 12;
  const loading = invLoading;

  /* ── Memoised chart data: bar chart for stock by material type ── */
  const barData = useMemo(
    () =>
      (invSummary.by_material_type ?? [])
        .filter((m) => (m.unit_of_measure ?? "").trim().length > 0)
        .map((m) => ({
          name: `${m.material_type} (${m.unit_of_measure})`,
          unit: m.unit_of_measure ?? "",
          quantity: m.total_quantity,
        })),
    [invSummary.by_material_type],
  );

  /* ── Trend line data (use API data when available, else mock) ── */
  const trendData = useMemo(
    () =>
      ((invSummary as unknown as Record<string, unknown>)
        .trend as typeof MOCK_TREND) ?? MOCK_TREND,
    [invSummary],
  );

  /* ── Alerts ── */
  const alerts = useMemo<AlertItem[]>(() => {
    const a: AlertItem[] = [];
    const exp7 = expiring.filter((l) => l.days_to_expiry <= 7).length;
    const exp30 = expiring.filter((l) => l.days_to_expiry <= 30).length;
    if (exp7 > 0)
      a.push({
        id: "alt01",
        severity: "critical",
        message: "Lots expiring within 7 days",
        count: exp7,
        link: "/lots?expiring=7",
      });
    if (exp30 > 0)
      a.push({
        id: "alt02",
        severity: "warning",
        message: "Lots expiring within 30 days",
        count: exp30,
        link: "/lots?expiring=30",
      });
    const rejected = invSummary.by_status.find((s) => s.status === "Rejected");
    if (rejected && rejected.lot_count > 0)
      a.push({
        id: "alt03",
        severity: "critical",
        message: "Rejected lots awaiting action",
        count: rejected.lot_count,
        link: "/lots?status=Rejected",
      });
    return a;
  }, [expiring, invSummary]);

  /* ── Column definitions ── */
  const txnColumns = [
    createTransactionTypeColumn<InventoryTransaction>(),
    createLotIdColumn<InventoryTransaction>(),
    createMaterialNameColumn<InventoryTransaction>(),
    createQuantityColumn<InventoryTransaction>(),
    createPerformedByColumn<InventoryTransaction>(),
    createTransactionDateColumn<InventoryTransaction>(),
  ];

  const expiringColumns = [
    createLotIdColumn<ExpiringLot>(),
    createMaterialNameColumn<ExpiringLot>(),
    {
      title: "Qty",
      key: "qty",
      sorter: (a: ExpiringLot, b: ExpiringLot) => a.quantity - b.quantity,
      render: (_: unknown, r: ExpiringLot) =>
        `${r.quantity} ${r.unit_of_measure}`,
    },
    {
      ...createExpirationDateColumn<ExpiringLot>(),
      defaultSortOrder: "ascend" as const,
    },
    createDaysToExpiryColumn<ExpiringLot>(),
    createLotStatusColumn<ExpiringLot>(),
    createStorageLocationColumn<ExpiringLot>(),
  ];

  /* ── Render (Ant Design Visualization spec:
         KPI → Charts → Tables → Alerts) ── */
  return (
    <DashboardPage
      title="Inventory Manager Dashboard"
      subtitle="Stock levels, transactions, and expiry tracking"
    >
      {/* ── 1. Status KPI Cards ── */}
      <Row gutter={[16, 16]}>
        {invSummary.by_status.map((s) => (
          <Col xs={12} sm={6} key={s.status}>
            <KpiCard
              label={s.status}
              value={s.lot_count.toLocaleString()}
              icon={STATUS_ICON[s.status]}
              iconBg={`${STATUS_COLOR[s.status] ?? tokens.colorPrimary}14`}
              iconColor={STATUS_COLOR[s.status]}
              delta={formatQuantitiesByUnit(s.quantities_by_unit) ?? undefined}
              loading={loading}
              valueStyle={{ color: STATUS_COLOR[s.status] }}
            />
          </Col>
        ))}
      </Row>

      {/* ── 2. Transaction KPI Cards ── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={12} sm={8}>
          <KpiCard
            label="Today's Receipts"
            value={txnSummary.today_receipts}
            icon={<ArrowUpOutlined />}
            iconBg="rgba(82,196,26,0.08)"
            iconColor={tokens.colorSuccess}
            loading={txnSumLoading}
            valueStyle={{ color: tokens.colorSuccess }}
          />
        </Col>
        <Col xs={12} sm={8}>
          <KpiCard
            label="Today's Issues"
            value={txnSummary.today_issues}
            icon={<ArrowDownOutlined />}
            iconBg="rgba(255,77,79,0.08)"
            iconColor={tokens.colorError}
            loading={txnSumLoading}
            valueStyle={{ color: tokens.colorError }}
          />
        </Col>
        <Col xs={12} sm={8}>
          <KpiCard
            label="Expiring (30 days)"
            value={expiringCount}
            icon={<WarningOutlined />}
            iconBg="rgba(250,173,20,0.08)"
            iconColor={tokens.colorWarning}
            loading={expLoading}
            valueStyle={{ color: tokens.colorWarning }}
          />
        </Col>
      </Row>

      {/* ── 3. Charts: Bar (Stock by Material Type) + Line (Trend) ── */}
      <Row gutter={[16, 16]} style={{ marginTop: SECTION_GAP }}>
        <Col xs={24} lg={12}>
          <ChartCard
            title="Stock by Material Type"
            loading={loading}
            empty={barData.length === 0}
            height={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                layout="vertical"
                margin={{ left: 20, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={tokens.borderColor}
                />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value, _name, item) => {
                    const row = item.payload as { unit?: string };
                    if (row.unit) {
                      return [`${value} ${row.unit}`, "Quantity"];
                    }
                    return [value, "Quantity"];
                  }}
                />
                <Bar
                  dataKey="quantity"
                  fill={tokens.colorPrimary}
                  radius={[0, 4, 4, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={12}>
          <ChartCard
            title="Receipt vs Usage Trend (30d)"
            loading={loading}
            empty={trendData.length === 0}
            height={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ left: 0, right: 20, top: 5, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={tokens.borderColor}
                />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend verticalAlign="top" height={36} />
                <Line
                  type="monotone"
                  dataKey="receipts"
                  name="Receipt"
                  stroke={tokens.colorSuccess}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="issues"
                  name="Usage"
                  stroke={tokens.colorError}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
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
          pagination={{ pageSize: 10 }}
          scroll={{ x: 600 }}
        />
      </div>

      {/* ── 5. Expiring Lots ── */}
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<ExpiringLot>
          title="Expiring Lots (next 30 days)"
          columns={expiringColumns}
          dataSource={expiring}
          rowKey="lot_id"
          loading={expLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 700 }}
        />
      </div>

      {/* ── 6. Alerts ── */}
      <div style={{ marginTop: SECTION_GAP }}>
        <AlertPanel alerts={alerts} loading={loading} />
      </div>
    </DashboardPage>
  );
}
