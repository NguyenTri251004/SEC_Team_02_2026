import { useMemo, useState } from "react";
import {
  Layout,
  Menu,
  Dropdown,
  Space,
  Tag,
  Typography,
  Breadcrumb,
} from "antd";
import {
  DashboardOutlined,
  InboxOutlined,
  ExperimentOutlined,
  SwapOutlined,
  SafetyCertificateOutlined,
  BuildOutlined,
  TagsOutlined,
  BarChartOutlined,
  TeamOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../auth/context";
import type { UserRole } from "../../types";
import { ROLE_TAG } from "../../constants/roles";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  lots: "Inventory Lots",
  materials: "Materials",
  transactions: "Transactions",
  qc: "Quality Control",
  batches: "Production Batches",
  labels: "Labels",
  reports: "Reports",
  users: "User Management",
  config: "Configuration",
};

function getSidebarItems(role: UserRole) {
  const common = [
    { key: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" },
    { key: "/transactions", icon: <SwapOutlined />, label: "Transactions" },
  ];

  const map: Record<string, typeof common> = {
    admin: [
      ...common,
      { key: "/materials", icon: <ExperimentOutlined />, label: "Materials" },
      { key: "/lots", icon: <InboxOutlined />, label: "Inventory Lots" },
      {
        key: "/qc",
        icon: <SafetyCertificateOutlined />,
        label: "Quality Control",
      },
      { key: "/batches", icon: <BuildOutlined />, label: "Batches" },
      { key: "/labels", icon: <TagsOutlined />, label: "Labels" },
      { key: "/reports", icon: <BarChartOutlined />, label: "Reports" },
      { key: "/users", icon: <TeamOutlined />, label: "User Management" },
      { key: "/config", icon: <SettingOutlined />, label: "Configuration" },
    ],
    inventory_manager: [
      ...common,
      { key: "/materials", icon: <ExperimentOutlined />, label: "Materials" },
      { key: "/lots", icon: <InboxOutlined />, label: "Inventory Lots" },
      { key: "/labels", icon: <TagsOutlined />, label: "Labels" },
      { key: "/reports", icon: <BarChartOutlined />, label: "Reports" },
    ],
    quality_control: [
      ...common,
      {
        key: "/qc",
        icon: <SafetyCertificateOutlined />,
        label: "Quality Control",
      },
    ],
    production: [
      ...common,
      { key: "/batches", icon: <BuildOutlined />, label: "Batches" },
      { key: "/reports", icon: <BarChartOutlined />, label: "Reports" },
    ],
    viewer: [],
  };

  return map[role] ?? common;
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const role = user?.role ?? "viewer";
  const items = useMemo(() => getSidebarItems(role), [role]);

  // Breadcrumb from pathname
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const breadcrumbItems = [
    { title: <Link to="/dashboard">Home</Link> },
    ...pathSegments.map((seg, i) => {
      const path = "/" + pathSegments.slice(0, i + 1).join("/");
      const label = ROUTE_LABELS[seg] ?? seg;
      const isLast = i === pathSegments.length - 1;
      return { title: isLast ? label : <Link to={path}>{label}</Link> };
    }),
  ];

  const userMenuItems = [
    { key: "profile", icon: <UserOutlined />, label: "Profile" },
    { type: "divider" as const },
    { key: "logout", icon: <LogoutOutlined />, label: "Sign out" },
  ];

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        breakpoint="lg"
        collapsedWidth={64}
        width={240}
        style={{
          background: "#001529",
          overflow: "auto",
          height: "100vh",
          position: "sticky",
          top: 0,
          left: 0,
        }}
      >
        <div
          style={{
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: "1px solid rgba(255,255,255,.1)",
          }}
        >
          <Text
            strong
            style={{
              color: "#fff",
              fontSize: collapsed ? 16 : 18,
              letterSpacing: 2,
              whiteSpace: "nowrap",
            }}
          >
            {collapsed ? "IMS" : "Inventory MS"}
          </Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={["/" + pathSegments[0]]}
          items={items}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #f0f0f0",
            position: "sticky",
            top: 0,
            zIndex: 10,
            height: 56,
          }}
        >
          <Space>
            <span
              onClick={() => setCollapsed(!collapsed)}
              style={{ cursor: "pointer", fontSize: 18, lineHeight: 1 }}
              role="button"
              aria-label="Toggle sidebar"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") setCollapsed(!collapsed);
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </span>
            <Breadcrumb items={breadcrumbItems} style={{ marginLeft: 8 }} />
          </Space>

          <Space size="middle">
            <Tag
              color={ROLE_TAG[role]?.color ?? "default"}
              style={{ fontSize: 13, padding: "2px 10px", fontWeight: 600 }}
            >
              {ROLE_TAG[role]?.label ?? role}
            </Tag>
            <Dropdown
              menu={{
                items: userMenuItems,
                onClick: ({ key }) => {
                  if (key === "logout") {
                    logout();
                  }
                },
              }}
              placement="bottomRight"
              trigger={["click"]}
            >
              <Space style={{ cursor: "pointer" }}>
                <UserOutlined />
                <Text>{user?.username}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content
          style={{
            margin: 24,
            minHeight: 280,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
