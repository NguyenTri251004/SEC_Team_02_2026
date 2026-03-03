import { memo } from "react";
import type { ReactNode, CSSProperties } from "react";
import { Card, Skeleton } from "antd";
import styles from "./dashboard.module.css";

export interface KpiCardProps {
  /** Label text shown above the value */
  label: string;
  /** Main metric (number or formatted string) */
  value: ReactNode;
  /** Icon rendered in a tinted disc */
  icon?: ReactNode;
  /** Icon background colour (e.g. tokens.colorPrimary) */
  iconBg?: string;
  /** Icon foreground colour */
  iconColor?: string;
  /** Small secondary text below value (delta, unit, etc.) */
  delta?: ReactNode;
  /** Override the value colour */
  valueStyle?: CSSProperties;
  /** Skeleton loading state */
  loading?: boolean;
  /** Make the card clickable */
  onClick?: () => void;
}

/**
 * Enterprise KPI card – icon + label + value + optional delta.
 * Displays a Skeleton when `loading` is true.
 */
function KpiCardInner({
  label,
  value,
  icon,
  iconBg = "rgba(22,119,255,0.08)",
  iconColor = "#1677ff",
  delta,
  valueStyle,
  loading = false,
  onClick,
}: KpiCardProps) {
  return (
    <Card
      className={`${styles.kpiCard} ${onClick ? styles.kpiCardClickable : ""}`}
      size="small"
      bordered
      onClick={onClick}
      styles={{ body: { padding: "20px 20px 16px" } }}
    >
      {loading ? (
        <Skeleton
          active
          paragraph={{ rows: 1, width: "60%" }}
          title={{ width: "40%" }}
        />
      ) : (
        <>
          <div className={styles.kpiHeader}>
            {icon && (
              <span
                className={styles.kpiIcon}
                style={{ background: iconBg, color: iconColor }}
              >
                {icon}
              </span>
            )}
            <span className={styles.kpiLabel}>{label}</span>
          </div>
          <div className={styles.kpiValue} style={valueStyle}>
            {value}
          </div>
          {delta && <div className={styles.kpiDelta}>{delta}</div>}
        </>
      )}
    </Card>
  );
}

const KpiCard = memo(KpiCardInner);
export default KpiCard;
