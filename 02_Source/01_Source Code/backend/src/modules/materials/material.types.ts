export interface Material {
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: string;
  storage_conditions?: string;
  specification_document?: string;
  created_date: Date;
  modified_date: Date;
}

export interface CreateMaterialDto {
  part_number: string;
  material_name: string;
  material_type: string;
  storage_conditions?: string;
  specification_document?: string;
}

export interface UpdateMaterialDto {
  part_number?: string;
  material_name?: string;
  material_type?: string;
  storage_conditions?: string;
  specification_document?: string;
}
