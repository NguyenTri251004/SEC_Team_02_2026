import { useState } from "react";
import { Button, Popconfirm, Modal, Input, Space, message } from "antd";
import { CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";

import { useApproveLot, useRejectLot } from "@/hooks/useQCData";

interface QCApproveRejectButtonsProps {
  lotId: string;
  showText?: boolean;
}

export function QCApproveRejectButtons({ lotId, showText = false }: QCApproveRejectButtonsProps) {
  const { mutateAsync: approveLot, isPending: isApproving } = useApproveLot();
  const { mutateAsync: rejectLot, isPending: isRejecting } = useRejectLot();

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async () => {
    try {
      await approveLot({ lotId });
      message.success(`Lot ${lotId} approved successfully!`);
    } catch (error: any) {
      message.error(error.response?.data?.error || "Failed to approve lot");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      message.warning("Please provide a reason for rejection");
      return;
    }
    try {
      await rejectLot({ lotId, reason: rejectReason });
      message.success(`Lot ${lotId} rejected`);
      setRejectModalOpen(false);
      setRejectReason("");
    } catch (error: any) {
      message.error(error.response?.data?.error || "Failed to reject lot");
    }
  };

  return (
    <>
      <Space size="small">
        <Popconfirm
          title="Approve this lot?"
          description={`Are you sure you want to approve lot ${lotId}?`}
          onConfirm={handleApprove}
          okText="Yes, Approve"
          cancelText="Cancel"
        >
          <Button
            type={showText ? "primary" : "text"}
            size="small"
            icon={<CheckCircleOutlined />}
            style={showText ? undefined : { color: "#52c41a" }}
            loading={isApproving}
          >
            {showText && "Approve"}
          </Button>
        </Popconfirm>

        <Button
          type={showText ? "default" : "text"}
          size="small"
          danger={showText}
          icon={<CloseCircleOutlined />}
          style={showText ? undefined : { color: "#ff4d4f" }}
          loading={isRejecting}
          onClick={() => setRejectModalOpen(true)}
        >
          {showText && "Reject"}
        </Button>
      </Space>

      <Modal
        title={`Reject Lot ${lotId}`}
        open={rejectModalOpen}
        onOk={handleReject}
        onCancel={() => {
          setRejectModalOpen(false);
          setRejectReason("");
        }}
        confirmLoading={isRejecting}
        okText="Reject"
        okButtonProps={{ danger: true }}
        destroyOnClose
      >
        <Input.TextArea
          placeholder="Reason for rejection (required)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          rows={3}
          style={{ marginTop: 8 }}
        />
      </Modal>
    </>
  );
}
