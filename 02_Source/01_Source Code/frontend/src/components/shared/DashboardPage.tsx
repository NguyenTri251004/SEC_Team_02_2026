import type { ReactNode } from "react";
import { Typography, Space, Flex } from "antd";

const { Title } = Typography;

interface DashboardPageProps {
  /** Page heading shown at the top-left */
  title: string;
  /** Optional description below the title */
  subtitle?: string;
  /** Optional action buttons placed top-right */
  actions?: ReactNode;
  /** Page body content */
  children: ReactNode;
}

/**
 * Standardised page wrapper for every dashboard view.
 * Provides consistent title row + spacing.
 */
export default function DashboardPage({
  title,
  subtitle,
  actions,
  children,
}: DashboardPageProps) {
  return (
    <section>
      <Flex
        justify="space-between"
        align="flex-start"
        wrap="wrap"
        gap={16}
        style={{ marginBottom: 24 }}
      >
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
          {subtitle && (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {subtitle}
            </Typography.Text>
          )}
        </div>
        {actions && <Space wrap>{actions}</Space>}
      </Flex>
      {children}
    </section>
  );
}
