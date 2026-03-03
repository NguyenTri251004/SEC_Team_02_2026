import { memo } from "react";
import type { ReactNode } from "react";
import { Card, Empty } from "antd";
import styles from "./dashboard.module.css";

export interface ChartCardProps {
  /** Card heading */
  title: string;
  /** Optional top-right action slot (e.g. range selector) */
  extra?: ReactNode;
  /** The Recharts component tree */
  children: ReactNode;
  /** Show skeleton shimmer while data loads */
  loading?: boolean;
  /** When true, show Empty instead of the chart */
  empty?: boolean;
  /** Chart container height (px) – default 280 */
  height?: number;
}

/**
 * Wrapper card for any Recharts visualisation.
 * Handles loading skeleton, empty state, and consistent styling.
 */
function ChartCardInner({
  title,
  extra,
  children,
  loading = false,
  empty = false,
  height = 280,
}: ChartCardProps) {
  let body: ReactNode;
  if (loading) {
    body = <div className={styles.skeletonChart} style={{ height }} />;
  } else if (empty) {
    body = (
      <div className={styles.chartEmpty} style={{ height }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No data available"
        />
      </div>
    );
  } else {
    body = <div style={{ width: "100%", height }}>{children}</div>;
  }

  return (
    <Card
      className={styles.chartCard}
      size="small"
      title={<span className={styles.chartCardTitle}>{title}</span>}
      extra={extra}
    >
      {body}
    </Card>
  );
}

const ChartCard = memo(ChartCardInner);
export default ChartCard;
