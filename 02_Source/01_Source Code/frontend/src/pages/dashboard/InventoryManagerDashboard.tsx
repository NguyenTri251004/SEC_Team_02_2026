import { useMemo, useState } from "react";
import { Row, Col, Segmented, Button, App } from "antd";
import {
  CheckCircleOutlined,
  StopOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  AppstoreOutlined,
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
import DashboardPage from "./DashboardPage";
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
} from "../../components/common/tables/columnFactories";
import {
  useInventorySummary,
  useTransactionSummary,
  useRecentTransactions,
  useExpiringLots,
  useMaterials,
} from "../../hooks/useDashboardData";
import { reportApi } from "../../services/api";
import type {
  InventorySummary,
  TransactionSummary,
  InventoryTransaction,
  ExpiringLot,
  AlertItem,
} from "../../types";

const EMPTY_INV_SUMMARY: InventorySummary = {
  by_status: [],
  by_material_type: [],
};

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

interface TrendPoint {
  date: string;
  receipts: number;
  issues: number;
}

type TrendRange = "7d" | "14d" | "30d";

const TREND_RANGE_OPTIONS: { label: string; value: TrendRange }[] = [
  { label: "7d", value: "7d" },
  { label: "14d", value: "14d" },
  { label: "30d", value: "30d" },
];

function hasTrendData(
  value: TransactionSummary,
): value is TransactionSummary & {
  trend: TrendPoint[];
} {
  return (
    "trend" in value && Array.isArray((value as { trend?: unknown }).trend)
  );
}

function applyRange<T>(rows: T[], range: TrendRange): T[] {
  if (range === "7d") {
    return rows.slice(-7);
  }
  if (range === "14d") {
    return rows.slice(-14);
  }
  return rows.slice(-30);
}

function calculateDaysToExpiry(expirationDate: string): number {
  const dateOnly = expirationDate.includes("T")
    ? expirationDate.slice(0, 10)
    : expirationDate;
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const expiryDate = new Date(`${dateOnly}T00:00:00`);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const expiryTime = expiryDate.getTime();

  if (Number.isNaN(expiryTime)) {
    return Number.NaN;
  }

  return Math.ceil(
    (expiryTime - startOfToday.getTime()) / millisecondsPerDay,
  );
}

export default function InventoryManagerDashboard() {
  const { message } = App.useApp();
  const [trendRange, setTrendRange] = useState<TrendRange>("30d");
  const [preferredStockUnit, setPreferredStockUnit] = useState<string>("");
  const [isExportingTxn, setIsExportingTxn] = useState(false);
  const [isExportingExpiring, setIsExportingExpiring] = useState(false);

  const { data: invRes, isLoading: invLoading } = useInventorySummary();
  const { data: txnSumRes, isLoading: txnSumLoading } = useTransactionSummary();
  const { data: txnRes, isLoading: txnLoading } = useRecentTransactions();
  const { data: expRes, isLoading: expLoading } = useExpiringLots();
  const { data: materialsRes, isLoading: materialsLoading } = useMaterials();

  const invSummary = invRes?.data ?? EMPTY_INV_SUMMARY;
  const txnSummary = txnSumRes?.data;
  const transactions = txnRes?.data ?? [];
  const expiring = useMemo<ExpiringLot[]>(
    () =>
      expRes?.data?.map((lot) => ({
        ...lot,
        days_to_expiry: calculateDaysToExpiry(lot.expiration_date),
      })) ?? [],
    [expRes?.data],
  );
  const expiringCount = expRes?.total ?? 0;
  const totalMaterials = materialsRes?.total ?? 0;

  const stockRows = useMemo(
    () =>
      (invSummary.by_material_type ?? [])
        .filter((m) => (m.unit_of_measure ?? "").trim().length > 0)
        .map((m) => ({
          key: `${m.material_type}-${m.unit_of_measure}`,
          name: m.material_type,
          unit: m.unit_of_measure ?? "",
          quantity: m.total_quantity,
        })),
    [invSummary.by_material_type],
  );
  const stockUnitOptions = useMemo(
    () =>
      Array.from(new Set(stockRows.map((row) => row.unit)))
        .sort((a, b) => a.localeCompare(b))
        .map((unit) => ({ label: unit, value: unit })),
    [stockRows],
  );
  const selectedStockUnit =
    preferredStockUnit.length > 0 &&
    stockUnitOptions.some((option) => option.value === preferredStockUnit)
      ? preferredStockUnit
      : (stockUnitOptions[0]?.value ?? "");
  const barData = useMemo(
    () => stockRows.filter((row) => row.unit === selectedStockUnit),
    [selectedStockUnit, stockRows],
  );

  const trendData = useMemo(() => {
    const source = txnSummary && hasTrendData(txnSummary) ? txnSummary.trend : [];
    return applyRange(source, trendRange);
  }, [trendRange, txnSummary]);

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
  }, [expiring, invSummary.by_status]);

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

  function downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function handleExportTransactions(): Promise<void> {
    try {
      setIsExportingTxn(true);
      const file = await reportApi.exportReport({
        type: "transactions",
        filters: {
          date_range: trendRange,
        },
      });
      downloadBlob(
        file,
        `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      message.success("Transactions report exported");
    } catch {
      message.error("Unable to export transactions report");
    } finally {
      setIsExportingTxn(false);
    }
  }

  async function handleExportExpiringLots(): Promise<void> {
    try {
      setIsExportingExpiring(true);
      const file = await reportApi.exportReport({
        type: "expiring",
        filters: {
          days: 30,
        },
      });
      downloadBlob(
        file,
        `expiring-lots-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      message.success("Expiring lots report exported");
    } catch {
      message.error("Unable to export expiring lots report");
    } finally {
      setIsExportingExpiring(false);
    }
  }

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
              loading={invLoading}
              valueStyle={{ color: STATUS_COLOR[s.status] }}
            />
          </Col>
        ))}
      </Row>

      {/* ── 2. Transaction KPI Cards ── */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Total Materials"
            value={totalMaterials.toLocaleString()}
            icon={<AppstoreOutlined />}
            iconBg="rgba(22,119,255,0.08)"
            iconColor={tokens.colorPrimary}
            loading={materialsLoading}
          />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Today's Receipts"
            icon={<ArrowUpOutlined />}
            iconBg="rgba(82,196,26,0.08)"
            iconColor={tokens.colorSuccess}
            loading={txnSumLoading}
            valueStyle={{ color: tokens.colorSuccess }}
            value={txnSummary?.today_receipts ?? "-"}
          />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Today's Issues"
            value={txnSummary?.today_issues ?? "-"}
            icon={<ArrowDownOutlined />}
            iconBg="rgba(255,77,79,0.08)"
            iconColor={tokens.colorError}
            loading={txnSumLoading}
            valueStyle={{ color: tokens.colorError }}
          />
        </Col>
        <Col xs={12} sm={6}>
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
            title={`Stock by Material Type${selectedStockUnit ? ` (${selectedStockUnit})` : ""}`}
            loading={invLoading}
            empty={barData.length === 0}
            height={280}
            extra={
              stockUnitOptions.length > 0 ? (
                <Segmented<string>
                  size="small"
                  options={stockUnitOptions}
                  value={selectedStockUnit}
                  onChange={(value) => setPreferredStockUnit(value)}
                />
              ) : undefined
            }
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
            title={`Receipt vs Usage Trend (${trendRange})`}
            loading={txnSumLoading}
            empty={trendData.length === 0}
            height={280}
            extra={
              <Segmented<TrendRange>
                size="small"
                options={TREND_RANGE_OPTIONS}
                value={trendRange}
                onChange={(value) => setTrendRange(value)}
              />
            }
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
          extra={
            <Button
              size="small"
              loading={isExportingTxn}
              onClick={handleExportTransactions}
            >
              Export
            </Button>
          }
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
          extra={
            <Button
              size="small"
              loading={isExportingExpiring}
              onClick={handleExportExpiringLots}
            >
              Export
            </Button>
          }
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
        <AlertPanel alerts={alerts} loading={invLoading || expLoading} />
      </div>
    </DashboardPage>
  );
}
