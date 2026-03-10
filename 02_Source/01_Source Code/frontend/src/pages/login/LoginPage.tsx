import { Button, Card, Typography } from "antd";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../auth/context";

const { Title, Text } = Typography;

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #001529 0%, #003a6e 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 420,
          borderRadius: 12,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
        styles={{ body: { padding: "40px 36px" } }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "#1677ff",
              borderRadius: 12,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <span style={{ color: "#fff", fontSize: 22, fontWeight: 700 }}>
              IMS
            </span>
          </div>
          <Title level={3} style={{ margin: 0, color: "#1a1a2e" }}>
            Inventory Management
          </Title>
          <Text
            type="secondary"
            style={{ fontSize: 13, marginTop: 4, display: "block" }}
          >
            Pharmaceutical Inventory Management System
          </Text>
        </div>

        <Button
          type="primary"
          block
          size="large"
          onClick={login}
          style={{ height: 44, fontWeight: 600, fontSize: 15 }}
        >
          Sign in with Keycloak
        </Button>
      </Card>
    </div>
  );
}
