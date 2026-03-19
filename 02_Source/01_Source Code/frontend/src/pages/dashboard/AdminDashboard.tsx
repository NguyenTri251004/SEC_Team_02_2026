import { useMemo } from "react";
import { Row, Col, Tag } from "antd";
import {
  UserOutlined,
  SwapOutlined,
  InboxOutlined,
  StopOutlined,
  ApiOutlined,
} from "@ant-design/icons";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import DashboardPage from "./DashboardPage";
import { KpiCard, ChartCard, DataTableCard } from "../../components/dashboard";
import { tokens, SECTION_GAP } from "../../constants/theme";
import {
  useAdminStats,
  useAdminUsers,
  useRecentTransactions,
  useAdminHealth,
} from "../../hooks/useDashboardData";
import {
  createTransactionTypeColumn,
  createLotIdColumn,
  createMaterialNameColumn,
  createQuantityColumn,
  createPerformedByColumn,
  createTransactionDateColumn,
  createUsernameColumn,
  createUserRoleColumn,
  createLastLoginColumn,
  createUserStatusColumn,
} from "../../components/common/tables/columnFactories";
import type { AdminStats, InventoryTransaction, User, ServiceHealth } from "../../types";

/* ── Mock data (removed when backend is live) ── */
const MOCK_STATS: AdminStats = {
  total_active_users: 42,
  today_transactions: 328,
  total_lots: 8241,
  lots_in_quarantine: 15,
  users_by_role: [
    { role: "Admin", count: 3 },
    { role: "Inventory Manager", count: 8 },
    { role: "Quality Control", count: 12 },
    { role: "Production", count: 19 },
  ],
};

const MOCK_TRANSACTIONS: InventoryTransaction[] = [
  {
    transaction_id: "T001",
    lot_id: "LOT-042",
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
    lot_id: "LOT-018",
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

const MOCK_USERS: User[] = [
  {
    user_id: "1",
    keycloak_sub: "s1",
    email: "alice@ims.com",
    username: "alice",
    role: "admin",
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-02-28",
    last_login_at: "2026-02-28T09:45:00Z",
  },
  {
    user_id: "2",
    keycloak_sub: "s2",
    email: "bob@ims.com",
    username: "bob",
    role: "inventory_manager",
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-02-28",
    last_login_at: "2026-02-28T09:30:00Z",
  },
  {
    user_id: "3",
    keycloak_sub: "s3",
    email: "carol@ims.com",
    username: "carol",
    role: "quality_control",
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-02-28",
    last_login_at: "2026-02-28T09:10:00Z",
  },
  {
    user_id: "4",
    keycloak_sub: "s4",
    email: "dave@ims.com",
    username: "dave",
    role: "production",
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-02-28",
    last_login_at: "2026-02-27T17:55:00Z",
  },
];

export default function AdminDashboard() {
  /* ── React Query hooks (auto-poll, caching, stale-while-revalidate) ── */
  const { data: statsRes, isLoading: statsLoading } = useAdminStats();
  const { data: txnRes, isLoading: txnLoading } = useRecentTransactions();
  const { data: usersRes, isLoading: usersLoading } = useAdminUsers();
  const { data: healthRes } = useAdminHealth();
  const healthData = healthRes?.data;

  const rawStats = statsRes?.data;
  const transactions = txnRes?.data ?? MOCK_TRANSACTIONS;
  const users = usersRes?.data ?? MOCK_USERS;
  const loading = statsLoading;

  // Normalize backend AdminStats (camelCase, object usersByRole) to frontend shape (snake_case, array users_by_role)
  const stats: AdminStats = useMemo(() => {
    if (!rawStats) return MOCK_STATS;
    // If already in frontend shape (has users_by_role array)
    if (Array.isArray((rawStats as any).users_by_role)) return rawStats;
    // Backend returns camelCase shape: { totalUsers, activeUsers, usersByRole: { Admin: n, ... }, ... }
    const backendStats = rawStats as any;
    const usersByRoleObj = backendStats.usersByRole ?? backendStats.users_by_role ?? {};
    const usersByRoleArr = Array.isArray(usersByRoleObj)
      ? usersByRoleObj
      : Object.entries(usersByRoleObj).map(([role, count]) => ({ role, count: count as number }));
    return {
      total_active_users: backendStats.activeUsers ?? backendStats.total_active_users ?? 0,
      today_transactions: backendStats.todayTransactions ?? backendStats.today_transactions ?? 0,
      total_lots: backendStats.totalLots ?? backendStats.total_lots ?? 0,
      lots_in_quarantine: backendStats.quarantineLots ?? backendStats.lots_in_quarantine ?? 0,
      users_by_role: usersByRoleArr,
    };
  }, [rawStats]);

  /* ── Memoised pie-chart data transform ── */
  const pieData = useMemo(
    () => (stats.users_by_role ?? []).map((r) => ({ name: r.role, value: r.count })),
    [stats.users_by_role],
  );

  /* ── Column definitions ── */
  const txnColumns = [
    createTransactionTypeColumn<InventoryTransaction>(),
    createLotIdColumn<InventoryTransaction>(),
    createMaterialNameColumn<InventoryTransaction>(),
    createQuantityColumn<InventoryTransaction>(),
    createPerformedByColumn<InventoryTransaction>(),
    createTransactionDateColumn<InventoryTransaction>(),
  ];

  const userColumns = [
    createUsernameColumn<User>(),
    createUserRoleColumn<User>(),
    createLastLoginColumn<User>(),
    createUserStatusColumn<User>(),
  ];

  /* ── Render (follows Ant Design Visualization Page spec:
         KPI cards → Charts + Tables → Detailed tables → Alerts) ── */
  return (
    <DashboardPage
      title="Admin Dashboard"
      subtitle="System overview and user activity"
    >
      {/* ── 1. KPI Scorecards (top row, most prominent) ── */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Active Users"
            value={stats.total_active_users.toLocaleString()}
            icon={<UserOutlined />}
            iconBg="rgba(22,119,255,0.08)"
            iconColor={tokens.colorPrimary}
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Today's Transactions"
            value={stats.today_transactions.toLocaleString()}
            icon={<SwapOutlined />}
            iconBg="rgba(82,196,26,0.08)"
            iconColor={tokens.colorSuccess}
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Total Lots"
            value={stats.total_lots.toLocaleString()}
            icon={<InboxOutlined />}
            iconBg="rgba(114,46,209,0.08)"
            iconColor="#722ed1"
            loading={loading}
          />
        </Col>
        <Col xs={12} sm={6}>
          <KpiCard
            label="Quarantine Lots"
            value={stats.lots_in_quarantine.toLocaleString()}
            icon={<StopOutlined />}
            iconBg="rgba(250,173,20,0.10)"
            iconColor={tokens.colorWarning}
            loading={loading}
            valueStyle={
              stats.lots_in_quarantine > 0
                ? { color: tokens.colorWarning }
                : undefined
            }
          />
        </Col>
      </Row>

      {/* ── Health Monitoring Panel ── */}
      {healthData && (
        <Row gutter={[16, 16]} style={{ marginTop: SECTION_GAP }}>
          <Col span={24}>
            <div style={{
              background: "#fff",
              borderRadius: 8,
              padding: "16px 24px",
              border: "1px solid #f0f0f0",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  <ApiOutlined style={{ marginRight: 8 }} />
                  System Health
                </span>
                <Tag color={healthData.overall === "healthy" ? "success" : healthData.overall === "degraded" ? "warning" : "error"}>
                  {healthData.overall.toUpperCase()}
                </Tag>
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                {healthData.services.map((svc: ServiceHealth) => (
                  <div key={svc.name} style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    background: svc.status === "healthy" ? "#f6ffed" : svc.status === "degraded" ? "#fffbe6" : "#fff2f0",
                    borderRadius: 6,
                    border: `1px solid ${svc.status === "healthy" ? "#b7eb8f" : svc.status === "degraded" ? "#ffe58f" : "#ffccc7"}`,
                  }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: svc.status === "healthy" ? "#52c41a" : svc.status === "degraded" ? "#faad14" : "#ff4d4f",
                      display: "inline-block",
                    }} />
                    <span style={{ fontWeight: 500 }}>{svc.name}</span>
                    {svc.latency_ms != null && (
                      <span style={{ color: "#888", fontSize: 12 }}>{svc.latency_ms}ms</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* ── 2. Users by Role (Pie Chart) + Recent Transactions ── */}
      <Row gutter={[16, 16]} style={{ marginTop: SECTION_GAP }}>
        <Col xs={24} lg={10}>
          <ChartCard
            title="Users by Role"
            loading={loading}
            empty={pieData.length === 0}
            height={280}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={2}
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine
                >
                  {pieData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={tokens.chart[idx % tokens.chart.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </Col>
        <Col xs={24} lg={14}>
          <DataTableCard<InventoryTransaction>
            title="Recent Transactions"
            columns={txnColumns}
            dataSource={transactions}
            rowKey="transaction_id"
            loading={txnLoading}
            pagination={{
              pageSize: 5,
              pageSizeOptions: ["5", "10", "15", "20"],
            }}
            scroll={{ x: 600 }}
          />
        </Col>
      </Row>

      {/* ── 3. Recent User Logins (detail table) ── */}
      <Row gutter={[16, 16]} style={{ marginTop: SECTION_GAP }}>
        <Col span={24}>
          <DataTableCard<User>
            title="Recent User Logins"
            columns={userColumns}
            dataSource={users}
            rowKey="user_id"
            loading={usersLoading}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 500 }}
          />
        </Col>
      </Row>
    </DashboardPage>
  );
}
