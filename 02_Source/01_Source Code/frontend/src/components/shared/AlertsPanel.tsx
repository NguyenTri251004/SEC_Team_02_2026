import { Card, List, Tag, Typography, Badge, Empty } from "antd";
import { WarningOutlined, RightOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import type { AlertItem } from "../../types";

const SEVERITY_COLOR: Record<AlertItem["severity"], string> = {
  critical: "red",
  high: "orange",
  warning: "gold",
};

const MAX_VISIBLE = 5;

interface AlertsPanelProps {
  alerts: AlertItem[];
  loading?: boolean;
}

export default function AlertsPanel({
  alerts,
  loading = false,
}: AlertsPanelProps) {
  const visible = alerts.slice(0, MAX_VISIBLE);
  const hasMore = alerts.length > MAX_VISIBLE;

  return (
    <Card
      size="small"
      title={
        <span>
          <WarningOutlined style={{ marginRight: 8 }} />
          Alerts
          {alerts.length > 0 && (
            <Badge
              count={alerts.length}
              style={{ marginLeft: 8 }}
              overflowCount={99}
            />
          )}
        </span>
      }
    >
      {visible.length === 0 && !loading ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No active alerts"
        />
      ) : (
        <List
          loading={loading}
          size="small"
          dataSource={visible}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Link to={item.link} key="view">
                  View <RightOutlined />
                </Link>,
              ]}
            >
              <List.Item.Meta
                title={
                  <span>
                    <Tag color={SEVERITY_COLOR[item.severity]}>
                      {item.severity.toUpperCase()}
                    </Tag>
                    <Typography.Text>{item.message}</Typography.Text>
                  </span>
                }
                description={`${item.count} occurrence(s)`}
              />
            </List.Item>
          )}
        />
      )}
      {hasMore && (
        <div style={{ textAlign: "center", paddingTop: 8 }}>
          <Link to="/lots?filter=alerts">
            View all {alerts.length} alerts <RightOutlined />
          </Link>
        </div>
      )}
    </Card>
  );
}
