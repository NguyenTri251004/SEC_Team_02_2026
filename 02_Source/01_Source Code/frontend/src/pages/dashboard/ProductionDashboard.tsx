import { useMemo, useState } from "react";
import { Row, Col, Space, Empty, Input } from "antd";
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
import { useAuth } from "../../auth/context";

const EMPTY_INV: InventorySummary = {
  by_status: [],
};

const EMPTY_TXN_SUMMARY: TransactionSummary = {
  today_receipts: 0,
  today_issues: 0,
};

interface QuarantineLotRow {
  lot_id: string;
  material_name?: string;
  quantity: number;
  unit_of_measure: string;
  expiration_date: string;
}

export default function ProductionDashboard() {
  const { user } = useAuth();
  const [batchSearch, setBatchSearch] = useState("");

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

  const invSummary = invRes?.data ?? EMPTY_INV;
  const txnSummary = txnSumRes?.data ?? EMPTY_TXN_SUMMARY;
  const transactions = useMemo<InventoryTransaction[]>(() => {
    const currentUser = user;
    const recentTransactions = txnRes?.data ?? [];

    if (!currentUser) {
      return [];
    }

    const currentUserIds = new Set(
      [currentUser.user_id, currentUser.username]
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    );

    return recentTransactions.filter((transaction) =>
      currentUserIds.has(transaction.performed_by.trim().toLowerCase()),
    );
  }, [txnRes?.data, user]);
  const batches = useMemo<ProductionBatch[]>(
    () => batchRes?.data ?? [],
    [batchRes?.data],
  );
  const completedBatchCount = completedBatchRes?.total ?? 0;
  const expiringCount = expRes?.total ?? 0;
  const loading =
    invLoading ||
    txnSumLoading ||
    txnLoading ||
    batchLoading ||
    completedBatchLoading ||
    quarantineLotsLoading;

  const acceptedStock = useStockByStatus(invSummary, "Accepted");

  const inProgressBatches = useMemo(
    () => batches.filter((batch) => batch.status === "In Progress"),
    [batches],
  );

  const quarantineLotRows = useMemo<QuarantineLotRow[]>(
    () =>
      (quarantineLotsRes?.data ?? []).map((lot) => ({
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
      return (
        keyword.length === 0 ||
        batch.batch_number.toLowerCase().includes(keyword) ||
        (batch.product_name ?? "").toLowerCase().includes(keyword)
      );
    });
  }, [batchSearch, batches]);

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
                description="No batches"
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
