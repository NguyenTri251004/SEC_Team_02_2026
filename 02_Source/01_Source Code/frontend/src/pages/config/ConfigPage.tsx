import { Card, Row, Col, Form, Input, InputNumber, Switch, Button, Divider, Typography, Space } from "antd";
import { SaveOutlined } from "@ant-design/icons";

import DashboardPage from "../dashboard/DashboardPage";
import { SECTION_GAP, CARD_GAP } from "../../constants/theme";

const { Text } = Typography;

export default function ConfigPage() {
  const [form] = Form.useForm();

  return (
    <DashboardPage
      title="System Configuration"
      subtitle="Manage system parameters, thresholds, and operational settings"
      actions={
        <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()}>
          Save Changes
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          lowStockThreshold: 50,
          expiryAlertDays: 30,
          maxTransactionsPerDay: 10000,
          autoBackup: true,
          backupFrequencyHours: 24,
          sessionTimeoutMinutes: 60,
          defaultPageSize: 20,
          maintenanceMode: false,
        }}
        onFinish={(values) => {
          console.log("Config saved:", values);
        }}
      >
        <Row gutter={CARD_GAP} style={{ marginTop: SECTION_GAP }}>
          <Col xs={24} lg={12}>
            <Card title="Inventory Settings" size="small">
              <Form.Item
                label="Low Stock Alert Threshold"
                name="lowStockThreshold"
                tooltip="Alert when quantity falls below this value"
              >
                <InputNumber min={1} max={10000} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                label="Expiry Alert Days"
                name="expiryAlertDays"
                tooltip="Days before expiration to trigger alert"
              >
                <InputNumber min={1} max={365} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                label="Max Transactions Per Day"
                name="maxTransactionsPerDay"
              >
                <InputNumber min={100} max={100000} style={{ width: "100%" }} />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="System Settings" size="small">
              <Form.Item
                label="Session Timeout (minutes)"
                name="sessionTimeoutMinutes"
              >
                <InputNumber min={5} max={480} style={{ width: "100%" }} />
              </Form.Item>
              <Form.Item
                label="Default Page Size"
                name="defaultPageSize"
              >
                <InputNumber min={5} max={100} style={{ width: "100%" }} />
              </Form.Item>
              <Divider />
              <Form.Item
                label="Automatic Backup"
                name="autoBackup"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label="Backup Frequency (hours)"
                name="backupFrequencyHours"
              >
                <InputNumber min={1} max={168} style={{ width: "100%" }} />
              </Form.Item>
            </Card>
          </Col>
        </Row>

        <Row gutter={CARD_GAP} style={{ marginTop: SECTION_GAP }}>
          <Col xs={24} lg={12}>
            <Card title="Integration Endpoints" size="small">
              <Form.Item label="Backend API URL">
                <Input value={import.meta.env.VITE_API_URL || "http://localhost:3000"} disabled />
              </Form.Item>
              <Form.Item label="Keycloak URL">
                <Input value={import.meta.env.VITE_KEYCLOAK_URL || "http://localhost:8080"} disabled />
              </Form.Item>
              <Space>
                <Text type="secondary">These values are set via environment variables.</Text>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Maintenance" size="small">
              <Form.Item
                label="Maintenance Mode"
                name="maintenanceMode"
                valuePropName="checked"
                tooltip="When enabled, only admins can access the system"
              >
                <Switch checkedChildren="ON" unCheckedChildren="OFF" />
              </Form.Item>
              <Text type="secondary">
                Enabling maintenance mode will restrict access for all non-admin users.
              </Text>
            </Card>
          </Col>
        </Row>
      </Form>
    </DashboardPage>
  );
}
