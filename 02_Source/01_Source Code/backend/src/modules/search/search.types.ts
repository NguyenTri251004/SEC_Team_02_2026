export interface SearchRequest {
  query: string;
  limit?: number;
  offset?: number;
  filters?: {
    material_type?: string;
    storage_conditions?: string;
  };
}

export interface SearchResult {
  id: string;
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: string;
  storage_conditions?: string;
  specification_document?: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  took: number; // milliseconds
}

export interface IndexMaterialRequest {
  material_id: string;
  part_number: string;
  material_name: string;
  material_type: string;
  storage_conditions?: string;
  specification_document?: string;
  created_date?: Date;
  modified_date?: Date;
}
