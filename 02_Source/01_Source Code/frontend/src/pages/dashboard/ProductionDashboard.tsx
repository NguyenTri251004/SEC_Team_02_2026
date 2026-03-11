import { useMemo, useState } from "react";
import { Row, Col, Space, Empty, Input, Select } from "antd";
import {
  CheckCircleOutlined,
  BuildOutlined,
  AuditOutlined,
  ArrowUpOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import DashboardPage from "./DashboardPage";
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
} from "../../components/common/tables/columnFactories";
import {
  useInventorySummary,
  useTransactionSummary,
  useRecentTransactions,
  useProductionBatches,
  useExpiringLots,
  useStockByStatus,
  useLots,
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
      lot_count: 2,
      quantities_by_unit: [
        { unit_of_measure: "kg", total_quantity: 420 },
        { unit_of_measure: "ea", total_quantity: 200 },
      ],
    },
    {
      status: "Quarantine",
      lot_count: 3,
      quantities_by_unit: [{ unit_of_measure: "kg", total_quantity: 56 }],
    },
    {
      status: "Rejected",
      lot_count: 0,
      quantities_by_unit: [{ unit_of_measure: "kg", total_quantity: 0 }],
    },
    {
      status: "Depleted",
      lot_count: 0,
      quantities_by_unit: [{ unit_of_measure: "kg", total_quantity: 0 }],
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
    lot_id: "MFR-2025-002",
    transaction_type: "Usage",
    quantity: -4.5,
    unit_of_measure: "kg",
    reference_id: "a299829f-9d45-4f27-98dd-668786be10e3",
    notes: null,
    performed_by: "prod1",
    transaction_date: "2026-01-31T21:09:56Z",
    created_date: "2026-01-31T21:09:56Z",
    material_name: "Microcrystalline Cellulose",
  },
  {
    transaction_id: "T202",
    lot_id: "MFR-2025-001",
    transaction_type: "Usage",
    quantity: -2,
    unit_of_measure: "kg",
    reference_id: "a299829f-9d45-4f27-98dd-668786be10e3",
    notes: null,
    performed_by: "prod1",
    transaction_date: "2026-01-31T21:09:27Z",
    created_date: "2026-01-31T21:09:27Z",
    material_name: "Vitamin D3 100K",
  },
  {
    transaction_id: "T203",
    lot_id: "MFR-2025-002",
    transaction_type: "Receipt",
    quantity: 10,
    unit_of_measure: "kg",
    reference_id: null,
    notes: null,
    performed_by: "System",
    transaction_date: "2026-01-31T21:01:11Z",
    created_date: "2026-01-31T21:01:11Z",
    material_name: "Microcrystalline Cellulose",
  },
];

const MOCK_BATCHES: ProductionBatch[] = [
  {
    batch_id: "B000",
    product_id: "M000",
    batch_number: "PB-2026-4401",
    batch_size: 1200,
    component_count: 3,
    unit_of_measure: "units",
    manufacture_date: "2026-02-01",
    expiration_date: "2026-03-01",
    status: "In Progress",
    created_date: "2026-02-01",
    modified_date: "2026-02-02",
    product_name: "Omega 3 Softgel 1000mg",
  },
  {
    batch_id: "B002",
    product_id: "M002",
    batch_number: "PB-2026-4402",
    batch_size: 800,
    component_count: 2,
    unit_of_measure: "units",
    manufacture_date: "2026-02-03",
    expiration_date: "2026-03-03",
    status: "In Progress",
    created_date: "2026-02-03",
    modified_date: "2026-02-03",
    product_name: "Vitamin C Effervescent",
  },
  {
    batch_id: "B001",
    product_id: "M001",
    batch_number: "PB-2026-4468",
    batch_size: 1000,
    component_count: 2,
    unit_of_measure: "units",
    manufacture_date: "2026-01-31",
    expiration_date: "2026-02-07",
    status: "Complete",
    created_date: "2026-01-31",
    modified_date: "2026-01-31",
    product_name: "Vitamin D3 Softgel 1000IU",
  },
];

interface QuarantineLotRow {
  lot_id: string;
  material_name?: string;
  quantity: number;
  unit_of_measure: string;
  expiration_date: string;
}

const MOCK_QUARANTINE_LOTS: QuarantineLotRow[] = [
  {
    lot_id: "Q-LOT-2026-001",
    material_name: "Vitamin D3 100K",
    quantity: 20,
    unit_of_measure: "kg",
    expiration_date: "2026-04-05",
  },
  {
    lot_id: "Q-LOT-2026-002",
    material_name: "Microcrystalline Cellulose",
    quantity: 36,
    unit_of_measure: "kg",
    expiration_date: "2026-04-18",
  },
];

const USE_SECTION_MOCK = true;

export default function ProductionDashboard() {
  const [batchSearch, setBatchSearch] = useState("");
  const [batchStatusFilter, setBatchStatusFilter] = useState<
    ProductionBatch["status"] | undefined
  >("In Progress");

  const { data: invRes, isLoading: invLoading } = useInventorySummary();
  const { data: txnSumRes, isLoading: txnSumLoading } = useTransactionSummary();
  const { data: txnRes, isLoading: txnLoading } = useRecentTransactions();
  const { data: batchRes, isLoading: batchLoading } = useProductionBatches();
  const { data: completedBatchRes, isLoading: completedBatchLoading } =
    useProductionBatches("status=Complete&sort=modified_date:desc&limit=1");
  const { data: expRes } = useExpiringLots();
  const { data: quarantineLotsRes, isLoading: quarantineLotsLoading } = useLots(
    "status=Quarantine&sort=expiration_date:asc&limit=10",
  );

  const invSummary = USE_SECTION_MOCK ? MOCK_INV : (invRes?.data ?? MOCK_INV);
  const txnSummary = txnSumRes?.data ?? MOCK_TXN_SUMMARY;
  const transactions = txnRes?.data ?? MOCK_TXN;
  const batches = USE_SECTION_MOCK
    ? MOCK_BATCHES
    : (batchRes?.data ?? MOCK_BATCHES);
  const completedBatchCount = completedBatchRes?.total ?? 0;
  const expiringCount = expRes?.total ?? 0;
  const loading = invLoading || txnSumLoading;

  const acceptedStock = useStockByStatus(invSummary, "Accepted");

  const inProgressBatches = useMemo(
    () => batches.filter((batch) => batch.status === "In Progress"),
    [batches],
  );

  const quarantineLotRows = useMemo<QuarantineLotRow[]>(
    () =>
      USE_SECTION_MOCK
        ? MOCK_QUARANTINE_LOTS
        : (quarantineLotsRes?.data ?? []).map((lot) => ({
            lot_id: lot.lot_id,
            material_name: lot.material_name,
            quantity: lot.quantity,
            unit_of_measure: lot.unit_of_measure,
            expiration_date: lot.expiration_date,
          })),
    [quarantineLotsRes?.data],
  );

  const alerts = useMemo<AlertItem[]>(() => {
    const list: AlertItem[] = [];

    const expiringLots = expRes?.data ?? [];
    const expiringWithin7Days = expiringLots.filter(
      (lot) => lot.days_to_expiry <= 7,
    ).length;
    const expiringWithin30Days = expiringLots.filter(
      (lot) => lot.days_to_expiry <= 30,
    ).length;

    if (expiringWithin7Days > 0) {
      list.push({
        id: "alt01",
        severity: "critical",
        message: "Lots expiring within 7 days",
        count: expiringWithin7Days,
        link: "/lots?expiring=7",
      });
    }

    if (expiringWithin30Days > 0) {
      list.push({
        id: "alt02",
        severity: "warning",
        message: "Lots expiring within 30 days",
        count: expiringWithin30Days,
        link: "/lots?expiring=30",
      });
    }

    const rejectedBatch = batches.filter(
      (batch) => batch.status === "Rejected",
    ).length;
    if (rejectedBatch > 0) {
      list.push({
        id: "alt06",
        severity: "critical",
        message: "Production batch rejected",
        count: rejectedBatch,
        link: "/batches?status=Rejected",
      });
    }

    return list;
  }, [batches, expRes?.data]);

  const filteredBatches = useMemo(() => {
    const keyword = batchSearch.trim().toLowerCase();

    return batches.filter((batch) => {
      const matchesKeyword =
        keyword.length === 0 ||
        batch.batch_number.toLowerCase().includes(keyword) ||
        (batch.product_name ?? "").toLowerCase().includes(keyword);

      const matchesStatus =
        !batchStatusFilter || batch.status === batchStatusFilter;

      return matchesKeyword && matchesStatus;
    });
  }, [batchSearch, batchStatusFilter, batches]);

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
      title: "Batch Size",
      key: "size",
      sorter: (a: ProductionBatch, b: ProductionBatch) =>
        a.batch_size - b.batch_size,
      render: (_: unknown, record: ProductionBatch) =>
        `${record.batch_size} ${record.unit_of_measure}`,
    },
    {
      title: "Components",
      key: "components",
      sorter: (a: ProductionBatch, b: ProductionBatch) =>
        (a.component_count ?? 0) - (b.component_count ?? 0),
      render: (_: unknown, record: ProductionBatch) =>
        (record.component_count ?? 0).toLocaleString(),
    },
    createBatchStatusColumn<ProductionBatch>(),
    createManufactureDateColumn<ProductionBatch>(),
    {
      ...createExpirationDateColumn<ProductionBatch>(),
      title: "Exp Date",
    },
  ];
  const quarantineLotColumns = [
    createLotIdColumn<QuarantineLotRow>(),
    createMaterialNameColumn<QuarantineLotRow>(),
    {
      title: "Qty",
      key: "qty",
      sorter: (a: QuarantineLotRow, b: QuarantineLotRow) =>
        a.quantity - b.quantity,
      render: (_: unknown, record: QuarantineLotRow) =>
        `${record.quantity} ${record.unit_of_measure}`,
    },
    createExpirationDateColumn<QuarantineLotRow>(),
  ];

  return (
    <DashboardPage
      title="Production Dashboard"
      subtitle="Stock availability, batches, and alerts overview"
    >
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={4}>
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
        <Col xs={12} sm={5}>
          <KpiCard
            label="In Progress Batches"
            value={inProgressBatches.length}
            icon={<BuildOutlined />}
            iconBg="rgba(22,119,255,0.08)"
            iconColor={tokens.colorPrimary}
            loading={batchLoading}
          />
        </Col>
        <Col xs={12} sm={5}>
          <KpiCard
            label="Completed Batches"
            value={completedBatchCount.toLocaleString()}
            icon={<AuditOutlined />}
            iconBg="rgba(82,196,26,0.08)"
            iconColor={tokens.colorSuccess}
            loading={completedBatchLoading}
            valueStyle={{ color: tokens.colorSuccess }}
          />
        </Col>
        <Col xs={12} sm={5}>
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
        <Col xs={12} sm={5}>
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

      <Row gutter={[16, 16]} style={{ marginTop: SECTION_GAP }}>
        <Col span={24}>
          <DataTableCard<QuarantineLotRow>
            title="Quarantine Lots"
            columns={quarantineLotColumns}
            dataSource={quarantineLotRows}
            rowKey="lot_id"
            loading={quarantineLotsLoading}
            pagination={{ pageSize: 5 }}
            scroll={{ x: 720 }}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="No lots in quarantine"
                />
              ),
            }}
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: SECTION_GAP }}>
        <Col span={24}>
          <DataTableCard<InventoryTransaction>
            title="My Recent Transactions"
            columns={txnColumns}
            dataSource={transactions}
            rowKey="transaction_id"
            loading={txnLoading}
            pagination={{
              pageSize: 5,
              pageSizeOptions: ["5", "10", "15", "20"],
            }}
            scroll={{ x: 500 }}
          />
        </Col>
      </Row>

      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<ProductionBatch>
          title="Production Batches"
          extra={
            <Space wrap size={8}>
              <Input.Search
                allowClear
                placeholder="Search batch or product"
                value={batchSearch}
                onChange={(event) => setBatchSearch(event.target.value)}
                style={{ width: 240 }}
              />
              <Select<ProductionBatch["status"]>
                allowClear
                placeholder="Status"
                value={batchStatusFilter}
                onChange={(value) => setBatchStatusFilter(value)}
                style={{ width: 170 }}
                options={[
                  { label: "Planned", value: "Planned" },
                  { label: "In Progress", value: "In Progress" },
                  { label: "Completed", value: "Complete" },
                  { label: "Rejected", value: "Rejected" },
                ]}
              />
            </Space>
          }
          columns={batchColumns}
          dataSource={filteredBatches}
          rowKey="batch_id"
          loading={batchLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 680 }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  batchStatusFilter
                    ? `No batches ${batchStatusFilter.toLowerCase()}`
                    : "No batches"
                }
              />
            ),
          }}
        />
      </div>

      {/* ── 4. Alerts ── */}
      <div style={{ marginTop: SECTION_GAP }}>
        <AlertPanel alerts={alerts} loading={loading} />
      </div>
    </DashboardPage>
  );
}
