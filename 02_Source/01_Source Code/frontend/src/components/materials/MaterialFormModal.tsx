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
      // Always reset first to clear any previous values
      form.resetFields();
      if (initialData) {
        form.setFieldsValue({
          ...initialData,
          storage_conditions: initialData.storage_conditions || '',
          specification_document: initialData.specification_document || '',
        });
      } else {
        form.setFieldsValue({ material_type: 'API' });
      }
    }
  }, [isOpen, initialData, form]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      // Ensure material_id is always present when editing (disabled fields may be excluded)
      const data = isEditing ? { ...values, material_id: initialData!.material_id } : values;
      await saveMaterial({ isEditing, data });
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
      forceRender
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item 
          name="part_number" 
          label="Part Number" 
          rules={[{ required: true, message: 'Please enter Part Number' }]}
        >
          <Input placeholder="Ex: PART-12345" />
        </Form.Item>

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
              <Select.Option value="API">API</Select.Option>
              <Select.Option value="Excipient">Excipient</Select.Option>
              <Select.Option value="Dietary Supplement">Dietary Supplement</Select.Option>
              <Select.Option value="Container">Container</Select.Option>
              <Select.Option value="Closure">Closure</Select.Option>
              <Select.Option value="Process Chemical">Process Chemical</Select.Option>
              <Select.Option value="Testing Material">Testing Material</Select.Option>
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