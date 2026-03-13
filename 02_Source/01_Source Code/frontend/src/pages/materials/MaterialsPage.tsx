import { useState } from "react";
import axios from "axios";
import { Button, Input, Popconfirm, message } from "antd";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

import DashboardPage from "../dashboard/DashboardPage";
import { DataTableCard } from "../../components/dashboard";
import { MaterialFormModal } from "../../components/materials/MaterialFormModal";
import { useMaterials, useDeleteMaterial, type Material } from "../../hooks/useMaterialsData";
import { SECTION_GAP } from "../../constants/theme";

import {
  createMaterialIdColumn,
  createPartNumberColumn,
  createMaterialNameColumn,
  createMasterMaterialTypeColumn,
  createStorageConditionsColumn,
  createCreatedDateColumn,
} from "../../components/common/tables/columnFactories";

export default function MaterialsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  const { data: materials = [], isLoading } = useMaterials();
  const { mutateAsync: deleteMaterial } = useDeleteMaterial();

  const handleDelete = async (materialId: string) => {
    try {
      await deleteMaterial(materialId);
      message.success('Material deleted successfully!');
    } catch (error: unknown) {
      if (axios.isAxiosError<{ error?: string }>(error)) {
        message.error(error.response?.data?.error ?? 'Failed to delete material.');
        return;
      }

      message.error('Failed to delete material.');
    }
  };

  const filteredData = materials.filter(
    (m: Material) =>
      m.material_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.part_number.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const openCreateModal = () => {
    setEditingMaterial(null);
    setIsModalOpen(true);
  };

  const openEditModal = (material: Material) => {
    setEditingMaterial(material);
    setIsModalOpen(true);
  };

  const columns: ColumnsType<Material> = [
    createMaterialIdColumn<Material>(),
    createPartNumberColumn<Material>(),
    createMaterialNameColumn<Material>(),
    createMasterMaterialTypeColumn<Material>(),
    createStorageConditionsColumn<Material>(),
    createCreatedDateColumn<Material>(),
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          />
          <Popconfirm
            title="Delete material"
            description={`Are you sure you want to delete "${record.material_name}"?`}
            onConfirm={() => handleDelete(record.material_id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </>
      ),
    },
  ];

  return (
    <DashboardPage
      title="Materials Management"
      subtitle="Manage raw materials, packaging, and finished products"
      actions={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreateModal}
        >
          Add Material
        </Button>
      }
    >
      <div style={{ marginTop: SECTION_GAP }}>
        <DataTableCard<Material>
          title="Master Data"
          extra={
            <Input
              placeholder="Search by Name or Part Number..."
              prefix={<SearchOutlined style={{ color: "rgba(0,0,0,.25)" }} />}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />
          }
          columns={columns}
          dataSource={filteredData}
          rowKey="material_id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </div>

      <MaterialFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingMaterial}
      />
    </DashboardPage>
  );
}
