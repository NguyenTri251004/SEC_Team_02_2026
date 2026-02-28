import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

type MaterialType = 'RAW' | 'PACKAGING' | 'FINISHED' | 'CONSUMABLE';

interface MaterialFormData {
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: MaterialType;
  storage_conditions: string;
  specification_document: string;
}

interface MaterialFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (data: MaterialFormData) => void;
  initialData?: MaterialFormData | null;
}

const defaultState: MaterialFormData = {
  material_id: '',
  part_number: '',
  material_name: '',
  material_type: 'RAW',
  storage_conditions: '',
  specification_document: ''
};

export function MaterialFormDialog({ isOpen, onClose, onSuccess, initialData }: MaterialFormDialogProps) {
  const [formData, setFormData] = useState<MaterialFormData>(defaultState);

  useEffect(() => {
    if (isOpen) setFormData(initialData || defaultState);
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess(formData);
  };

  if (!isOpen) return null;
  const isEditing = !!initialData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEditing ? 'Edit Material' : 'Add Material'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Material ID *</label>
              <input 
                required
                disabled={isEditing}
                type="text" 
                value={formData.material_id}
                onChange={e => setFormData({...formData, material_id: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500" 
                placeholder="Ex: MAT-001" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Part Number *</label>
              <input 
                required
                type="text" 
                value={formData.part_number}
                onChange={e => setFormData({...formData, part_number: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="Ex: PART-12345" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Name *</label>
              <input 
                required
                type="text" 
                value={formData.material_name}
                onChange={e => setFormData({...formData, material_name: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Type *</label>
              <select 
                value={formData.material_type}
                onChange={e => setFormData({...formData, material_type: e.target.value as MaterialType})}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="RAW">RAW</option>
                <option value="PACKAGING">PACKAGING</option>
                <option value="CONSUMABLE">CONSUMABLE</option>
                <option value="FINISHED">FINISHED</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Storage Conditions</label>
            <input 
              type="text" 
              value={formData.storage_conditions}
              onChange={e => setFormData({...formData, storage_conditions: e.target.value})}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Specification Document</label>
            <input 
              type="text" 
              value={formData.specification_document}
              onChange={e => setFormData({...formData, specification_document: e.target.value})}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="cursor-pointer px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" className="cursor-pointer px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
              {isEditing ? 'Save Changes' : 'Create Material'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}