import { memo } from "react";
import { Card, Tag, Badge, Empty, Typography } from "antd";
import { WarningOutlined, RightOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import type { AlertItem } from "../../types";
import styles from "./dashboard.module.css";

const SEVERITY_COLOR: Record<string, string> = {
  critical: "red",
  high: "orange",
  warning: "gold",
};

const MAX_VISIBLE = 5;

export interface AlertPanelProps {
  alerts: AlertItem[];
  loading?: boolean;
}

/**
 * Severity-tagged alert list with "View" CTAs.
 * Shows max 5 items with a "View all" link when more exist.
 */
function AlertPanelInner({ alerts, loading = false }: AlertPanelProps) {
  const visible = alerts.slice(0, MAX_VISIBLE);
  const hasMore = alerts.length > MAX_VISIBLE;

  return (
    <Card
      className={styles.alertPanel}
      size="small"
      title={
        <span className={styles.alertPanelTitle}>
          <WarningOutlined />
          <span>Alerts</span>
          {alerts.length > 0 && (
            <Badge count={alerts.length} overflowCount={99} />
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
        <div>
          {visible.map((item) => (
            <div
              key={item.id}
              className={styles.alertItem}
              style={{
                padding: "8px 0",
                borderBottom: "1px solid rgba(0,0,0,0.04)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <Tag color={SEVERITY_COLOR[item.severity] ?? "default"}>
                  {item.severity.toUpperCase()}
                </Tag>
                <Typography.Text style={{ marginLeft: 8 }}>
                  {item.message}
                </Typography.Text>
                {item.count > 0 && (
                  <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                    ({item.count})
                  </Typography.Text>
                )}
              </div>
              <div>
                <Link to={item.link} className={styles.alertLink}>
                  View <RightOutlined />
                </Link>
              </div>
            </div>
          ))}
        </div>
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

const AlertPanel = memo(AlertPanelInner);
export default AlertPanel;
