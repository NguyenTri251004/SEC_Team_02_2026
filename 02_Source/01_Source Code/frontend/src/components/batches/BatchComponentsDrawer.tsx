import { useState } from "react";
import {
  Drawer,
  Descriptions,
  Tag,
  Button,
  Space,
  Select,
  InputNumber,
  Table,
  Divider,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import { useBatchComponents, useAddComponent } from "@/hooks/useBatchesData";
import { useLots } from "@/hooks/useLotsData";
import { BATCH_STATUS_TAG } from "@/constants/theme";
import type { ProductionBatch } from "@/types";

interface BatchComponent {
  component_id: string;
  batch_id: string;
  lot_id: string;
  planned_quantity: number;
  actual_quantity: number | null;
  unit_of_measure: string;
  lot_material_name?: string;
}

interface BatchComponentsDrawerProps {
  batch: ProductionBatch | null;
  onClose: () => void;
}

export function BatchComponentsDrawer({ batch, onClose }: BatchComponentsDrawerProps) {
  const { data: components = [], isLoading } = useBatchComponents(batch?.batch_id ?? null);
  const { mutateAsync: addComponent, isPending: isAdding } = useAddComponent();
  const { data: lots = [] } = useLots();

  const [addingComponent, setAddingComponent] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<string | undefined>(undefined);
  const [plannedQty, setPlannedQty] = useState<number | null>(null);

  if (!batch) return null;

  const acceptedLots = lots.filter((l) => l.status === "Accepted");
  const statusCfg = BATCH_STATUS_TAG[batch.status];

  const handleAddComponent = async () => {
    if (!selectedLotId || !plannedQty) {
      message.warning("Please select a lot and enter quantity");
      return;
    }
    const selectedLot = acceptedLots.find((l) => l.lot_id === selectedLotId);
    if (!selectedLot) {
      message.error("Selected lot not found");
      return;
    }
    try {
      await addComponent({
        batchId: batch.batch_id,
        data: {
          lot_id: selectedLotId,
          planned_quantity: plannedQty,
          unit_of_measure: selectedLot.unit_of_measure,
        },
      });
      message.success("Component added successfully!");
      setAddingComponent(false);
      setSelectedLotId(undefined);
      setPlannedQty(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to add component";
      const axiosErr = error as { response?: { data?: { error?: string } } };
      message.error(axiosErr.response?.data?.error ?? msg);
    }
  };

  const componentColumns: ColumnsType<BatchComponent> = [
    {
      title: "Lot ID",
      dataIndex: "lot_id",
      key: "lot_id",
      width: 120,
    },
    {
      title: "Material",
      dataIndex: "lot_material_name",
      key: "lot_material_name",
      ellipsis: true,
      render: (v: string | undefined) => v ?? "-",
    },
    {
      title: "Planned Qty",
      dataIndex: "planned_quantity",
      key: "planned_quantity",
      width: 120,
    },
    {
      title: "Actual Qty",
      dataIndex: "actual_quantity",
      key: "actual_quantity",
      width: 120,
      render: (v: number | null) => v ?? <span style={{ color: "#bbb" }}>-</span>,
    },
    {
      title: "Unit",
      dataIndex: "unit_of_measure",
      key: "unit_of_measure",
      width: 80,
    },
  ];

  return (
    <Drawer
      title={`Batch Components: ${batch.batch_id}`}
      open={!!batch}
      onClose={onClose}
      width={700}
    >
      <Descriptions column={2} bordered size="small">
        <Descriptions.Item label="Batch ID">{batch.batch_id}</Descriptions.Item>
        <Descriptions.Item label="Status">
          {statusCfg ? <Tag color={statusCfg.color}>{statusCfg.label}</Tag> : batch.status}
        </Descriptions.Item>
        <Descriptions.Item label="Product">{batch.product_name ?? batch.product_id}</Descriptions.Item>
        <Descriptions.Item label="Batch Number">{batch.batch_number}</Descriptions.Item>
        <Descriptions.Item label="Batch Size">
          {batch.batch_size.toLocaleString()} {batch.unit_of_measure}
        </Descriptions.Item>
        <Descriptions.Item label="Manufacture Date">
          {dayjs(batch.manufacture_date).format("YYYY-MM-DD")}
        </Descriptions.Item>
        <Descriptions.Item label="Expiration Date">
          {dayjs(batch.expiration_date).format("YYYY-MM-DD")}
        </Descriptions.Item>
      </Descriptions>

      <Divider>Components (Lots Used)</Divider>

      {!addingComponent ? (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setAddingComponent(true)}
          style={{ marginBottom: 16 }}
        >
          Add Component
        </Button>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr auto",
            gap: 12,
            marginBottom: 16,
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, color: "#888" }}>Lot (Accepted only)</div>
            <Select
              showSearch
              placeholder="Select lot"
              optionFilterProp="label"
              value={selectedLotId}
              onChange={setSelectedLotId}
              style={{ width: "100%" }}
              options={acceptedLots.map((l) => ({
                value: l.lot_id,
                label: `${l.lot_id} — ${l.material_name ?? l.material_id}`,
              }))}
            />
          </div>
          <div>
            <div style={{ marginBottom: 4, fontSize: 12, color: "#888" }}>Planned Qty</div>
            <InputNumber
              style={{ width: "100%" }}
              placeholder="100"
              min={0.001}
              value={plannedQty}
              onChange={(v) => setPlannedQty(v)}
            />
          </div>
          <Space>
            <Button type="primary" onClick={handleAddComponent} loading={isAdding}>
              Add
            </Button>
            <Button
              onClick={() => {
                setAddingComponent(false);
                setSelectedLotId(undefined);
                setPlannedQty(null);
              }}
            >
              Cancel
            </Button>
          </Space>
        </div>
      )}

      <Table<BatchComponent>
        columns={componentColumns}
        dataSource={components}
        rowKey="component_id"
        size="small"
        loading={isLoading}
        pagination={false}
        scroll={{ x: 500 }}
      />
    </Drawer>
  );
}
