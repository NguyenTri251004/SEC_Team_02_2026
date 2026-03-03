import { Card, Statistic, type StatisticProps } from "antd";
import type { ReactNode, CSSProperties } from "react";

interface KPICardProps {
  title: string;
  value: number | string;
  prefix?: ReactNode;
  suffix?: string;
  loading?: boolean;
  valueStyle?: CSSProperties;
  formatter?: StatisticProps["formatter"];
  /** Optional click handler */
  onClick?: () => void;
}

export default function KPICard({
  title,
  value,
  prefix,
  suffix,
  loading = false,
  valueStyle,
  formatter,
  onClick,
}: KPICardProps) {
  return (
    <Card
      size="small"
      hoverable={!!onClick}
      onClick={onClick}
      loading={loading}
      style={{ minWidth: 160, flex: "1 1 200px" }}
      styles={{ body: { padding: "16px 20px" } }}
    >
      <Statistic
        title={title}
        value={value}
        prefix={prefix}
        suffix={suffix}
        valueStyle={{ fontSize: 24, ...valueStyle }}
        formatter={formatter}
      />
    </Card>
  );
}
