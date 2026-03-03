import { memo } from "react";
import type { ReactNode } from "react";
import { Card, Table } from "antd";
import type { TableProps } from "antd";
import styles from "./dashboard.module.css";

export interface DataTableCardProps<T extends object> extends Pick<
  TableProps<T>,
  | "columns"
  | "dataSource"
  | "rowKey"
  | "pagination"
  | "loading"
  | "scroll"
  | "size"
  | "onChange"
  | "rowSelection"
> {
  /** Card heading */
  title: string;
  /** Optional top-right action slot (buttons, links) */
  extra?: ReactNode;
}

/**
 * Consistent title + actions + Ant Design Table card.
 * Wraps Table in a bordered Card with enterprise styling.
 */
function DataTableCardInner<T extends object>({
  title,
  extra,
  columns,
  dataSource,
  rowKey,
  pagination = false,
  loading = false,
  scroll,
  size = "small",
  onChange,
  rowSelection,
}: DataTableCardProps<T>) {
  return (
    <Card
      className={styles.tableCard}
      size="small"
      title={
        <div className={styles.tableCardHeader}>
          <span className={styles.tableCardTitle}>{title}</span>
          {extra && <div>{extra}</div>}
        </div>
      }
    >
      <Table<T>
        columns={columns}
        dataSource={dataSource}
        rowKey={rowKey}
        pagination={pagination}
        loading={loading}
        scroll={scroll}
        size={size}
        onChange={onChange}
        rowSelection={rowSelection}
      />
    </Card>
  );
}

const DataTableCard = memo(DataTableCardInner) as typeof DataTableCardInner;
export default DataTableCard;
