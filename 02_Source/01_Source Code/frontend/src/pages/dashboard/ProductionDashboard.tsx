import { useMemo } from "react";
import { Row, Col, Card, Button, Space } from "antd";
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
import { tokens, SECTION_GAP } from "../../constants/theme";
import {
  createTransactionTypeColumn,
  createLotIdColumn,
  createMaterialNameColumn,
  createQuantityColumn,
  createTransactionDateColumn,
  createBatchNumberColumn,
  createProductNameColumn,
  createBatchStatusColumn,
  createManufactureDateColumn,
  createExpirationDateColumn,
} from "../../components/tables/columnFactories";
import {
  useInventorySummary,
  useTransactionSummary,
  useRecentTransactions,
  useProductionBatches,
  useExpiringLots,
  useStockByStatus,
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
  by_status: [
    {
      status: "Accepted",
      lot_count: 5240,
      quantities_by_unit: [
        { unit_of_measure: "kg", total_quantity: 420 },
        { unit_of_measure: "ea", total_quantity: 200 },
      ],
    },
  ],
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
  const acceptedStock = useStockByStatus(invSummary, "Accepted");

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
    createTransactionTypeColumn<InventoryTransaction>(),
    createLotIdColumn<InventoryTransaction>(),
    createMaterialNameColumn<InventoryTransaction>(),
    createQuantityColumn<InventoryTransaction>(),
    createTransactionDateColumn<InventoryTransaction>(),
  ];

  const batchColumns = [
    createBatchNumberColumn<ProductionBatch>(),
    createProductNameColumn<ProductionBatch>(),
    {
      title: "Size",
      key: "size",
      sorter: (a: ProductionBatch, b: ProductionBatch) =>
        a.batch_size - b.batch_size,
      render: (_: unknown, r: ProductionBatch) =>
        `${r.batch_size} ${r.unit_of_measure}`,
    },
    createBatchStatusColumn<ProductionBatch>(),
    createManufactureDateColumn<ProductionBatch>(),
    createExpirationDateColumn<ProductionBatch>(),
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
            value={`${(acceptedStock?.lotCount ?? 0).toLocaleString()}`}
            delta={acceptedStock?.quantitiesFormatted ?? undefined}
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
            pagination={{ pageSize: 10, showSizeChanger: true }}
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
          pagination={{ pageSize: 10, showSizeChanger: true }}
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
