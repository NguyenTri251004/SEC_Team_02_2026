import { memo, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Card, Table } from "antd";
import type { TableProps, PaginationProps } from "antd";
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
  | "locale"
  | "expandable"
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
  locale,
  expandable,
}: DataTableCardProps<T>) {
  // Extract initial pageSize from pagination prop, default to 10
  const initialPageSize =
    typeof pagination === "object" && pagination?.pageSize
      ? pagination.pageSize
      : 10;

  const [current, setCurrent] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Merge pagination with global defaults
  const paginationConfig = useMemo(() => {
    if (pagination === false) {
      return false;
    }

    const defaults: PaginationProps = {
      current,
      pageSize,
      showSizeChanger: true,
      pageSizeOptions: ["10", "20", "50", "100"],
    };

    if (typeof pagination !== "object") {
      return defaults;
    }

    return {
      ...defaults,
      ...(pagination as object),
      current,
      pageSize,
    };
  }, [pagination, current, pageSize]);

  // Handle pagination changes (page or size)
  const handleTableChange: TableProps<T>["onChange"] = (
    paginationObj,
    filters,
    sorter,
    extra,
  ) => {
    if (paginationObj.current) {
      setCurrent(paginationObj.current);
    }
    if (paginationObj.pageSize) {
      setPageSize(paginationObj.pageSize);
    }
    // Call user's onChange if provided
    onChange?.(paginationObj, filters, sorter, extra);
  };

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
        pagination={paginationConfig}
        loading={loading}
        scroll={scroll}
        size={size}
        onChange={handleTableChange}
        rowSelection={rowSelection}
        locale={locale}
        expandable={expandable}
      />
    </Card>
  );
}

const DataTableCard = memo(DataTableCardInner) as typeof DataTableCardInner;
export default DataTableCard;
