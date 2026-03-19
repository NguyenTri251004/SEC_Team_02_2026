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
  Modal,
  Popconfirm,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { PlusOutlined, PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import {
  useBatchComponents,
  useAddComponent,
  useUpdateBatchStatus,
  useConsumeMaterial,
  useTraceability,
} from "@/hooks/useBatchesData";
import { useLots } from "@/hooks/useLotsData";
import { BATCH_STATUS_TAG } from "@/constants/theme";
import type { ProductionBatch, BatchComponent, ProductionTraceabilityItem } from "@/types";

interface BatchComponentsDrawerProps {
  batch: ProductionBatch | null;
  onClose: () => void;
}

export function BatchComponentsDrawer({ batch, onClose }: BatchComponentsDrawerProps) {
  const { data: components = [], isLoading } = useBatchComponents(batch?.batch_id ?? null);
  const { mutateAsync: addComponent, isPending: isAdding } = useAddComponent();
  const { mutateAsync: updateStatus, isPending: isUpdatingStatus } = useUpdateBatchStatus();
  const { mutateAsync: consumeMaterial, isPending: isConsuming } = useConsumeMaterial();
  const { data: lots = [] } = useLots();
  const { data: traceability = [], isLoading: traceLoading } = useTraceability(
    batch?.status === "In Progress" || batch?.status === "Complete" ? batch?.batch_id ?? null : null
  );

  const [addingComponent, setAddingComponent] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState<string | undefined>(undefined);
  const [plannedQty, setPlannedQty] = useState<number | null>(null);
  const [consumeModal, setConsumeModal] = useState<{ componentId: string; lotQty: number; plannedQty: number } | null>(null);
  const [consumeQty, setConsumeQty] = useState<number | null>(null);

  if (!batch) return null;

  const acceptedLots = lots.filter((l) => l.status === "Accepted");
  const statusCfg = BATCH_STATUS_TAG[batch.status];
  const isReadOnly = batch.status === "Complete" || batch.status === "Rejected";

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

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus({ batchId: batch.batch_id, status: newStatus });
      message.success(`Batch status updated to ${newStatus}`);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: string } } };
      message.error(axiosErr.response?.data?.error ?? "Failed to update status");
    }
  };

  const handleConsume = async () => {
    if (!consumeModal || !consumeQty) return;
    try {
      await consumeMaterial({
        batchId: batch.batch_id,
        componentId: consumeModal.componentId,
        actualQuantity: consumeQty,
      });
      message.success("Material consumed successfully!");
      setConsumeModal(null);
      setConsumeQty(null);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: string } } };
      message.error(axiosErr.response?.data?.error ?? "Failed to consume material");
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
      dataIndex: "material_name",
      key: "material_name",
      ellipsis: true,
      render: (v: string | undefined) => v ?? "-",
    },
    {
      title: "Planned Qty",
      dataIndex: "planned_quantity",
      key: "planned_quantity",
      width: 110,
    },
    {
      title: "Actual Qty",
      dataIndex: "actual_quantity",
      key: "actual_quantity",
      width: 110,
      render: (v: number | null) =>
        v != null ? <Tag color="green">{v}</Tag> : <span style={{ color: "#bbb" }}>-</span>,
    },
    {
      title: "Unit",
      dataIndex: "unit_of_measure",
      key: "unit_of_measure",
      width: 70,
    },
    ...(batch.status === "In Progress"
      ? [
          {
            title: "Action",
            key: "action",
            width: 100,
            render: (_: unknown, record: BatchComponent) =>
              record.actual_quantity != null ? (
                <Tag color="blue">Consumed</Tag>
              ) : (
                <Button
                  type="link"
                  size="small"
                  onClick={() => {
                    setConsumeModal({
                      componentId: record.component_id,
                      lotQty: record.lot_quantity ?? 9999,
                      plannedQty: record.planned_quantity,
                    });
                    setConsumeQty(record.planned_quantity);
                  }}
                >
                  Consume
                </Button>
              ),
          } as ColumnsType<BatchComponent>[number],
        ]
      : []),
  ];

  const traceColumns: ColumnsType<ProductionTraceabilityItem> = [
    { title: "Material", dataIndex: "material_name", key: "material_name", ellipsis: true },
    { title: "Lot ID", dataIndex: "lot_id", key: "lot_id", width: 110 },
    { title: "Planned", dataIndex: "planned_quantity", key: "planned_quantity", width: 90 },
    {
      title: "Actual",
      dataIndex: "actual_quantity",
      key: "actual_quantity",
      width: 90,
      render: (v: number | null) => v ?? "-",
    },
    {
      title: "Transaction Date",
      dataIndex: "transaction_date",
      key: "transaction_date",
      width: 150,
      render: (v: string | null) => (v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-"),
    },
  ];

  return (
    <Drawer
      title={`Batch Components: ${batch.batch_id}`}
      open={!!batch}
      onClose={onClose}
      width={750}
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

      {/* Status Action Buttons */}
      {!isReadOnly && (
        <div style={{ margin: "16px 0" }}>
          <Space>
            {batch.status === "Planned" && (
              <Popconfirm
                title="Start Production"
                description="Are you sure you want to start production for this batch?"
                onConfirm={() => handleStatusChange("In Progress")}
                okText="Yes"
                cancelText="No"
              >
                <Button type="primary" icon={<PlayCircleOutlined />} loading={isUpdatingStatus}>
                  Start Production
                </Button>
              </Popconfirm>
            )}
            {batch.status === "In Progress" && (
              <>
                <Popconfirm
                  title="Complete Batch"
                  description="Are you sure? All components must be consumed."
                  onConfirm={() => handleStatusChange("Complete")}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button type="primary" icon={<CheckCircleOutlined />} loading={isUpdatingStatus}>
                    Complete
                  </Button>
                </Popconfirm>
                <Popconfirm
                  title="Reject Batch"
                  description="Are you sure you want to reject this batch?"
                  onConfirm={() => handleStatusChange("Rejected")}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button danger icon={<CloseCircleOutlined />} loading={isUpdatingStatus}>
                    Reject
                  </Button>
                </Popconfirm>
              </>
            )}
          </Space>
        </div>
      )}

      <Divider>Components (Lots Used)</Divider>

      {!isReadOnly && !addingComponent && (
        <Button
          type="dashed"
          icon={<PlusOutlined />}
          onClick={() => setAddingComponent(true)}
          style={{ marginBottom: 16 }}
        >
          Add Component
        </Button>
      )}

      {addingComponent && (
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
        scroll={{ x: 600 }}
      />

      {/* Consume Material Modal */}
      <Modal
        title="Consume Material"
        open={!!consumeModal}
        onOk={handleConsume}
        onCancel={() => {
          setConsumeModal(null);
          setConsumeQty(null);
        }}
        confirmLoading={isConsuming}
      >
        <div style={{ marginBottom: 16 }}>
          Enter the actual quantity consumed:
        </div>
        <InputNumber
          style={{ width: "100%" }}
          min={0.001}
          max={consumeModal?.lotQty}
          value={consumeQty}
          onChange={(v) => setConsumeQty(v)}
          placeholder="Actual quantity"
        />
      </Modal>

      {/* Traceability Section */}
      {(batch.status === "In Progress" || batch.status === "Complete") && (
        <>
          <Divider>Production Traceability</Divider>
          <Table<ProductionTraceabilityItem>
            columns={traceColumns}
            dataSource={traceability}
            rowKey={(r) => `${r.component_id}-${r.transaction_id ?? "pending"}`}
            size="small"
            loading={traceLoading}
            pagination={false}
            scroll={{ x: 500 }}
          />
        </>
      )}
    </Drawer>
  );
}
