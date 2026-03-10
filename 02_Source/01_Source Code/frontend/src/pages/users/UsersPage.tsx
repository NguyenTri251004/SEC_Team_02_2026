import { useState } from "react";
import { Button, Input, Tag, Badge, Space, message, Modal, Form } from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, LockOutlined, UnlockOutlined, KeyOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";

import DashboardPage from "../dashboard/DashboardPage";
import { DataTableCard } from "../../components/dashboard";
import { UserFormModal } from "../../components/users/UserFormModal";
import { useUsers, useToggleUserActive, useResetPassword } from "../../hooks/useUsersData";
import { SECTION_GAP } from "../../constants/theme";
import { ROLE_TAG } from "../../constants/roles";
import type { User, UserRole } from "../../types";

export default function UsersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: users = [], isLoading } = useUsers();

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { mutateAsync: toggleActive } = useToggleUserActive();

  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [resetPwUser, setResetPwUser] = useState<User | null>(null);
  const [resetPwForm] = Form.useForm();
  const { mutateAsync: resetPassword, isPending: isResetting } = useResetPassword();

  const handleCreate = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormOpen(true);
  };

  const handleToggleActive = async (user: User) => {
    try {
      await toggleActive(user.user_id);
      message.success(`User ${user.is_active ? "locked" : "unlocked"} successfully!`);
    } catch {
      message.error("Failed to toggle user status.");
    }
  };

  const handleResetPassword = (user: User) => {
    setResetPwUser(user);
    resetPwForm.resetFields();
    setResetPwOpen(true);
  };

  const handleResetPwOk = async () => {
    try {
      const { new_password } = await resetPwForm.validateFields();
      await resetPassword({ userId: resetPwUser!.user_id, newPassword: new_password });
      message.success(`Password reset successfully for ${resetPwUser!.username}`);
      setResetPwOpen(false);
    } catch (error) {
      const err = error as { response?: { status?: number; data?: { error?: string } }; name?: string };
      if (err.name !== "ValidationError") {
        message.error(err.response?.data?.error || "Failed to reset password.");
      }
    }
  };

  const filteredData = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const columns: ColumnsType<User> = [
    {
      title: "Username",
      dataIndex: "username",
      key: "username",
      width: 150,
      sorter: (a, b) => a.username.localeCompare(b.username),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      ellipsis: true,
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
      width: 160,
      filters: Object.entries(ROLE_TAG).map(([value, { label }]) => ({
        text: label,
        value,
      })),
      onFilter: (value, record) => record.role === value,
      render: (role: UserRole) => {
        const cfg = ROLE_TAG[role];
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : role;
      },
    },
    {
      title: "Status",
      dataIndex: "is_active",
      key: "is_active",
      width: 100,
      filters: [
        { text: "Active", value: true },
        { text: "Inactive", value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
      render: (active: boolean) => (
        <Badge
          status={active ? "success" : "default"}
          text={active ? "Active" : "Inactive"}
        />
      ),
    },
    {
      title: "Last Login",
      dataIndex: "last_login_at",
      key: "last_login_at",
      width: 160,
      render: (v: string | null) =>
        v ? dayjs(v).format("YYYY-MM-DD HH:mm") : <span style={{ color: "#bbb" }}>Never</span>,
      sorter: (a, b) => {
        if (!a.last_login_at) return -1;
        if (!b.last_login_at) return 1;
        return dayjs(a.last_login_at).unix() - dayjs(b.last_login_at).unix();
      },
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 120,
      render: (v: string) => dayjs(v).format("YYYY-MM-DD"),
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
    },
    {
      title: "Actions",
      key: "actions",
      width: 100,
      fixed: "right",
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            size="small"
            icon={<KeyOutlined />}
            title="Reset Password"
            onClick={() => handleResetPassword(record)}
          />
          <Button
            type="text"
            size="small"
            icon={record.is_active ? <LockOutlined /> : <UnlockOutlined />}
            onClick={() => handleToggleActive(record)}
          />
        </Space>
      ),
    },
  ];

  return (
    <DashboardPage
      title="User Management"
      subtitle="Manage system users and role assignments"
      actions={
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Add User
        </Button>
      }
    >
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<User>
          title="System Users"
          extra={
            <Input
              placeholder="Search by Username or Email..."
              prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          }
          columns={columns}
          dataSource={filteredData}
          rowKey="user_id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 1000 }}
        />
      </div>

      <UserFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        initialData={editingUser}
      />

      <Modal
        title={`Reset Password — ${resetPwUser?.username ?? ""}`}
        open={resetPwOpen}
        onOk={handleResetPwOk}
        onCancel={() => setResetPwOpen(false)}
        confirmLoading={isResetting}
        destroyOnClose
        width={420}
      >
        <Form form={resetPwForm} layout="vertical">
          <Form.Item
            name="new_password"
            label="New Password"
            rules={[
              { required: true, message: "Please enter a new password" },
              { min: 8, message: "Password must be at least 8 characters" },
            ]}
          >
            <Input.Password placeholder="Min. 8 characters" />
          </Form.Item>
          <Form.Item
            name="confirm_password"
            label="Confirm Password"
            dependencies={["new_password"]}
            rules={[
              { required: true, message: "Please confirm the password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("new_password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Re-enter password" />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardPage>
  );
}
