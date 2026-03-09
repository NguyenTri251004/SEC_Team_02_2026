import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export type MaterialType = 'API' | 'Excipient' | 'Dietary Supplement' | 'Container' | 'Closure' | 'Process Chemical' | 'Testing Material';

export interface Material {
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: MaterialType;
  storage_conditions: string | null;
  specification_document: string | null;
  created_date: string;
  modified_date: string;
}

// --- MOCK DATA FALLBACK ---
const mockData: Material[] = [
  { 
    material_id: 'MAT-001', 
    part_number: 'PART-10025', 
    material_name: 'Resin Alpha (Fake)', 
    material_type: 'API',
    storage_conditions: 'Room Temp, Low Humidity',
    specification_document: 'DOC-RA-01',
    created_date: '2026-02-15',
    modified_date: '2026-02-15'
  },
  { 
    material_id: 'MAT-002', 
    part_number: 'PART-20599', 
    material_name: 'Packaging Box Type B (Fake)', 
    material_type: 'Excipient',
    storage_conditions: 'Dry, Ambient',
    specification_document: null,
    created_date: '2026-02-20',
    modified_date: '2026-02-28'
  },
];

export const useMaterials = () => {
  return useQuery({
    queryKey: ['materials'],
    queryFn: async (): Promise<Material[]> => {
      try {
        // Attempt to fetch real data from the backend
        const response = await api.get('/api/materials');
        const data = response.data?.data || response.data;
        
        // If the backend is running but the database is completely empty, use mock data for the demo
        if (!data || data.length === 0) {
          console.warn("Backend returned empty data. Falling back to mock data.");
          return mockData;
        }
        
        return data; // Return real data
      } catch (error) {
        // If the backend is turned off/crashes, catch the error and use mock data
        console.warn("API call failed (Backend might be offline). Falling back to mock data.", error);
        return mockData;
      }
    },
  });
};

export const useSaveMaterial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ isEditing, data }: { isEditing: boolean; data: Partial<Material> }) => {
      if (isEditing) {
        return api.put(`/api/materials/${data.material_id}`, data);
      }
      return api.post('/api/materials', data);
    },
    onSuccess: () => {
      // Automatically refetch the table data when a save is successful
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
};

export const useDeleteMaterial = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (materialId: string) => {
      return api.delete(`/api/materials/${materialId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
    },
  });
};