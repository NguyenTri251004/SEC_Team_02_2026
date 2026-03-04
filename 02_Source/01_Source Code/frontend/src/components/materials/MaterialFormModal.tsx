import { useEffect } from 'react';
import { Modal, Form, Input, Select, message } from 'antd';
import { useSaveMaterial, type Material } from '../../hooks/useMaterialsData';

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: Material | null;
}

export function MaterialFormModal({ isOpen, onClose, initialData }: MaterialFormModalProps) {
  const [form] = Form.useForm();
  const { mutateAsync: saveMaterial, isPending } = useSaveMaterial();
  const isEditing = !!initialData;

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.setFieldsValue({
          ...initialData,
          storage_conditions: initialData.storage_conditions || '',
          specification_document: initialData.specification_document || '',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ material_type: 'RAW' });
      }
    }
  }, [isOpen, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await saveMaterial({ isEditing, data: values });
      message.success(`Material ${isEditing ? 'updated' : 'created'} successfully!`);
      onClose();
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error('Material ID or Part Number already exists!');
      } else if (error.name !== 'ValidationError') {
        message.error('An error occurred while saving.');
      }
    }
  };

  return (
    <Modal
      title={isEditing ? 'Edit Material' : 'Add Material'}
      open={isOpen}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={isPending}
      destroyOnClose
    >
      <Form form={form} layout="vertical" preserve={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item 
            name="material_id" 
            label="Material ID" 
            rules={[{ required: true, message: 'Please enter Material ID' }]}
          >
            <Input disabled={isEditing} placeholder="Ex: MAT-001" />
          </Form.Item>

          <Form.Item 
            name="part_number" 
            label="Part Number" 
            rules={[{ required: true, message: 'Please enter Part Number' }]}
          >
            <Input placeholder="Ex: PART-12345" />
          </Form.Item>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item 
            name="material_name" 
            label="Name" 
            rules={[{ required: true, message: 'Please enter Material Name' }]}
          >
            <Input placeholder="Enter material name" />
          </Form.Item>

          <Form.Item 
            name="material_type" 
            label="Type" 
            rules={[{ required: true, message: 'Please select a type' }]}
          >
            <Select>
              <Select.Option value="RAW">RAW</Select.Option>
              <Select.Option value="PACKAGING">PACKAGING</Select.Option>
              <Select.Option value="CONSUMABLE">CONSUMABLE</Select.Option>
              <Select.Option value="FINISHED">FINISHED</Select.Option>
            </Select>
          </Form.Item>
        </div>

        <Form.Item name="storage_conditions" label="Storage Conditions">
          <Input placeholder="Ex: Room Temp, Dry" />
        </Form.Item>

        <Form.Item name="specification_document" label="Specification Document">
          <Input placeholder="Ex: DOC-001" />
        </Form.Item>
      </Form>
    </Modal>
  );
}