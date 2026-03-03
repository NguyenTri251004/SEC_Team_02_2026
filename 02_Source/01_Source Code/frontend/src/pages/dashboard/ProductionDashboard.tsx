import { useMemo } from "react";
import { Row, Col, Card, Tag, Button, Space } from "antd";
import {
  CheckCircleOutlined,
  BuildOutlined,
  ArrowUpOutlined,
  WarningOutlined,
  PlusOutlined,
  ExportOutlined,
  TagOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import DashboardPage from "../../components/shared/DashboardPage";
import { KpiCard, DataTableCard, AlertPanel } from "../../components/dashboard";
import {
  TXN_TYPE_TAG,
  BATCH_STATUS_TAG,
  tokens,
  SECTION_GAP,
} from "../../constants/theme";
import {
  useInventorySummary,
  useTransactionSummary,
  useRecentTransactions,
  useProductionBatches,
  useExpiringLots,
} from "../../hooks/useDashboardData";
import type {
  InventorySummary,
  TransactionSummary,
  InventoryTransaction,
  ProductionBatch,
  AlertItem,
} from "../../types";

/* ── Mock data ── */
const MOCK_INV: InventorySummary = {
  by_status: [{ status: "Accepted", lot_count: 5240, total_quantity: 1250 }],
};
const MOCK_TXN_SUMMARY: TransactionSummary = {
  today_receipts: 12,
  today_issues: 0,
};

const MOCK_TXN: InventoryTransaction[] = [
  {
    transaction_id: "T201",
    lot_id: "LOT-062",
    transaction_type: "Receipt",
    quantity: 10,
    unit_of_measure: "kg",
    reference_id: null,
    notes: null,
    performed_by: "prod01",
    transaction_date: "2026-02-28T09:30:00Z",
    created_date: "2026-02-28T09:30:00Z",
    material_name: "API-X",
  },
  {
    transaction_id: "T202",
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
    transaction_id: "T203",
    lot_id: "LOT-033",
    transaction_type: "Transfer",
    quantity: 0,
    unit_of_measure: "kg",
    reference_id: null,
    notes: null,
    performed_by: "prod01",
    transaction_date: "2026-02-28T08:45:00Z",
    created_date: "2026-02-28T08:45:00Z",
    material_name: "Excipient B",
  },
];

const MOCK_BATCHES: ProductionBatch[] = [
  {
    batch_id: "B001",
    product_id: "M001",
    batch_number: "PB-2026-042",
    batch_size: 1000,
    unit_of_measure: "units",
    manufacture_date: "2026-02-27",
    expiration_date: "2028-02-27",
    status: "In Progress",
    created_date: "2026-02-27",
    modified_date: "2026-02-28",
    product_name: "VitD3 Softgel",
  },
  {
    batch_id: "B002",
    product_id: "M002",
    batch_number: "PB-2026-043",
    batch_size: 500,
    unit_of_measure: "units",
    manufacture_date: "2026-02-28",
    expiration_date: "2028-02-28",
    status: "Planned",
    created_date: "2026-02-28",
    modified_date: "2026-02-28",
    product_name: "Omega3 Caps",
  },
];

export default function ProductionDashboard() {
  const navigate = useNavigate();

  /* ── React Query hooks ── */
  const { data: invRes, isLoading: invLoading } = useInventorySummary();
  const { data: txnSumRes, isLoading: txnSumLoading } = useTransactionSummary();
  const { data: txnRes, isLoading: txnLoading } = useRecentTransactions();
  const { data: batchRes, isLoading: batchLoading } = useProductionBatches();
  const { data: expRes } = useExpiringLots();

  const invSummary = invRes?.data ?? MOCK_INV;
  const txnSummary = txnSumRes?.data ?? MOCK_TXN_SUMMARY;
  const transactions = txnRes?.data ?? MOCK_TXN;
  const batches = batchRes?.data ?? MOCK_BATCHES;
  const activeBatchCount = batchRes?.total ?? 4;
  const expiringCount = expRes?.total ?? 6;
  const loading = invLoading || txnSumLoading;

  /* ── Derived data ── */
  const acceptedStock = invSummary.by_status.find(
    (s) => s.status === "Accepted",
  );

  /* ── Alerts ── */
  const alerts = useMemo<AlertItem[]>(() => {
    const a: AlertItem[] = [];
    if (expiringCount > 0)
      a.push({
        id: "alt01",
        severity: "critical",
        message: "Lots expiring within 7 days",
        count: expiringCount,
        link: "/lots?expiring=7",
      });
    const rejectedBatch = batches.filter((b) => b.status === "Rejected").length;
    if (rejectedBatch > 0)
      a.push({
        id: "alt06",
        severity: "critical",
        message: "Production batch rejected",
        count: rejectedBatch,
        link: "/batches?status=Rejected",
      });
    return a;
  }, [expiringCount, batches]);

  /* ── Column definitions ── */
  const txnColumns = [
    {
      title: "Type",
      dataIndex: "transaction_type",
      key: "type",
      sorter: (a: InventoryTransaction, b: InventoryTransaction) =>
        a.transaction_type.localeCompare(b.transaction_type),
      render: (v: string) => {
        const cfg = TXN_TYPE_TAG[v];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{v}</Tag>;
      },
    },
    {
      title: "Lot",
      dataIndex: "lot_id",
      key: "lot",
      sorter: (a: InventoryTransaction, b: InventoryTransaction) =>
        a.lot_id.localeCompare(b.lot_id),
    },
    {
      title: "Material",
      dataIndex: "material_name",
      key: "material",
      sorter: (a: InventoryTransaction, b: InventoryTransaction) =>
        a.material_name.localeCompare(b.material_name),
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "qty",
      sorter: (a: InventoryTransaction, b: InventoryTransaction) =>
        a.quantity - b.quantity,
      render: (v: number, r: InventoryTransaction) =>
        `${v > 0 ? "+" : ""}${v} ${r.unit_of_measure}`,
    },
    {
      title: "Date",
      dataIndex: "transaction_date",
      key: "date",
      sorter: (a: InventoryTransaction, b: InventoryTransaction) =>
        new Date(a.transaction_date).getTime() -
        new Date(b.transaction_date).getTime(),
      defaultSortOrder: "descend" as const,
      render: (v: string) => new Date(v).toLocaleString(),
    },
  ];

  const batchColumns = [
    {
      title: "Batch #",
      dataIndex: "batch_number",
      key: "batch",
      sorter: (a: ProductionBatch, b: ProductionBatch) =>
        a.batch_number.localeCompare(b.batch_number),
    },
    {
      title: "Product",
      dataIndex: "product_name",
      key: "product",
      sorter: (a: ProductionBatch, b: ProductionBatch) =>
        a.product_name.localeCompare(b.product_name),
    },
    {
      title: "Size",
      key: "size",
      sorter: (a: ProductionBatch, b: ProductionBatch) =>
        a.batch_size - b.batch_size,
      render: (_: unknown, r: ProductionBatch) =>
        `${r.batch_size} ${r.unit_of_measure}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      filters: [
        { text: "Planned", value: "Planned" },
        { text: "In Progress", value: "In Progress" },
        { text: "Completed", value: "Completed" },
        { text: "Rejected", value: "Rejected" },
      ],
      onFilter: (value, record: ProductionBatch) => record.status === value,
      render: (v: string) => {
        const cfg = BATCH_STATUS_TAG[v];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : <Tag>{v}</Tag>;
      },
    },
    {
      title: "Mfg Date",
      dataIndex: "manufacture_date",
      key: "mfg",
      sorter: (a: ProductionBatch, b: ProductionBatch) =>
        new Date(a.manufacture_date).getTime() -
        new Date(b.manufacture_date).getTime(),
      defaultSortOrder: "descend" as const,
    },
    {
      title: "Expiry",
      dataIndex: "expiration_date",
      key: "expiry",
      sorter: (a: ProductionBatch, b: ProductionBatch) =>
        new Date(a.expiration_date).getTime() -
        new Date(b.expiration_date).getTime(),
    },
  ];

  /* ── Render (Ant Design Viz spec: KPIs → Quick Actions+Txn → Batches → Alerts) ── */
  return (
    <DashboardPage
      title="Production Dashboard"
      subtitle="Stock availability, batches, and quick actions"
    >
      {/* ── 1. KPI Scorecards ── */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Available Stock"
            value={`${acceptedStock?.total_quantity ?? 0} kg`}
            icon={<CheckCircleOutlined />}
            iconBg="rgba(82,196,26,0.08)"
            iconColor={tokens.colorSuccess}
            loading={loading}
            valueStyle={{ color: tokens.colorSuccess }}
          />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Active Batches"
            value={activeBatchCount}
            icon={<BuildOutlined />}
            iconBg="rgba(22,119,255,0.08)"
            iconColor={tokens.colorPrimary}
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Today's Receipts"
            value={txnSummary.today_receipts}
            icon={<ArrowUpOutlined />}
            iconBg="rgba(82,196,26,0.08)"
            iconColor={tokens.colorSuccess}
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Expiring (30d)"
            value={expiringCount}
            icon={<WarningOutlined />}
            iconBg="rgba(250,173,20,0.08)"
            iconColor={tokens.colorWarning}
            loading={loading}
            valueStyle={
              expiringCount > 0 ? { color: tokens.colorWarning } : undefined
            }
          />
        </Col>
      </Row>

      {/* ── 2. Quick Actions + Recent Transactions ── */}
      <Row gutter={[16, 16]} style={{ marginTop: SECTION_GAP }}>
        <Col xs={24} lg={10}>
          <Card size="small" title="Quick Actions" style={{ height: "100%" }}>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                icon={<PlusOutlined />}
                block
                onClick={() => navigate("/lots/new")}
              >
                New Receipt
              </Button>
              <Button
                icon={<ExportOutlined />}
                block
                onClick={() => navigate("/transactions/issue")}
              >
                Issue Material
              </Button>
              <Button
                icon={<TagOutlined />}
                block
                onClick={() => navigate("/labels/print")}
              >
                Print Label
              </Button>
              <Button
                icon={<BuildOutlined />}
                block
                onClick={() => navigate("/batches/new")}
              >
                New Batch
              </Button>
              <Button
                icon={<SwapOutlined />}
                block
                onClick={() => navigate("/transactions/transfer")}
              >
                Transfer
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <DataTableCard<InventoryTransaction>
            title="Recent Transactions"
            columns={txnColumns}
            dataSource={transactions}
            rowKey="transaction_id"
            loading={txnLoading}
            scroll={{ x: 500 }}
          />
        </Col>
      </Row>

      {/* ── 3. Active Production Batches ── */}
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<ProductionBatch>
          title="Active Production Batches"
          columns={batchColumns}
          dataSource={batches}
          rowKey="batch_id"
          loading={batchLoading}
          scroll={{ x: 600 }}
        />
      </div>

      {/* ── 4. Alerts ── */}
      <div style={{ marginTop: SECTION_GAP }}>
        <AlertPanel alerts={alerts} loading={loading} />
      </div>
    </DashboardPage>
  );
}
