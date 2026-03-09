import { useEffect } from "react";
import { Modal, Form, Input, Select, Switch, message } from "antd";

import { useSaveUser } from "@/hooks/useUsersData";
import { ROLE_TAG } from "@/constants/roles";
import type { User, UserRole } from "@/types";

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: User | null;
}

export function UserFormModal({ isOpen, onClose, initialData }: UserFormModalProps) {
  const [form] = Form.useForm();
  const { mutateAsync: saveUser, isPending } = useSaveUser();
  const isEditing = !!initialData;

  useEffect(() => {
    if (isOpen) {
      form.resetFields();
      if (initialData) {
        form.setFieldsValue({
          username: initialData.username,
          email: initialData.email,
          role: initialData.role,
        });
      } else {
        form.setFieldsValue({ is_active: true });
      }
    }
  }, [isOpen, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = isEditing
        ? { user_id: initialData!.user_id, username: values.username, email: values.email, role: values.role }
        : { username: values.username, email: values.email, password: values.password, role: values.role, is_active: values.is_active };
      await saveUser({ isEditing, data: payload });
      message.success(`User ${isEditing ? "updated" : "created"} successfully!`);
      onClose();
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error("Username or email already exists!");
      } else if (error.response?.status === 400) {
        message.error(error.response?.data?.error || "Invalid data");
      } else if (error.name !== "ValidationError") {
        message.error("An error occurred while saving.");
      }
    }
  };

  return (
    <Modal
      title={isEditing ? "Edit User" : "Add User"}
      open={isOpen}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={isPending}
      forceRender
      width={520}
    >
      <Form form={form} layout="vertical" preserve={false}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: "Please enter username" }]}
          >
            <Input placeholder="Ex: john_doe" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: "Please enter email" },
              { type: "email", message: "Please enter a valid email" },
            ]}
          >
            <Input placeholder="Ex: user@ims.local" />
          </Form.Item>
        </div>

        {!isEditing && (
          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: "Please enter password" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>
        )}

        <div style={{ display: "grid", gridTemplateColumns: isEditing ? "1fr" : "1fr 1fr", gap: 16 }}>
          <Form.Item
            name="role"
            label="Role"
            rules={[{ required: true, message: "Please select a role" }]}
          >
            <Select
              placeholder="Select role"
              options={Object.entries(ROLE_TAG).map(([value, { label }]) => ({
                value: value as UserRole,
                label,
              }))}
            />
          </Form.Item>

          {!isEditing && (
            <Form.Item name="is_active" label="Active" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </div>
      </Form>
    </Modal>
  );
}
