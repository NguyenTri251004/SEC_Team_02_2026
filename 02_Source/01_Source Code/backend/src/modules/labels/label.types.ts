export enum LabelType {
  RAW_MATERIAL = "Raw Material",
  API = "API",
  SAMPLE = "Sample",
  INTERMEDIATE = "Intermediate",
  FINISHED_PRODUCT = "Finished Product",
  STATUS = "Status",
}

export interface LabelTemplate {
  template_id: string;
  template_name: string;
  label_type: LabelType;
  template_content: string;
  width: number;
  height: number;
  created_date: Date;
  modified_date: Date;
}

export interface CreateTemplateInput {
  template_id: string;
  template_name: string;
  label_type: LabelType;
  template_content: string;
  width: number;
  height: number;
}

export interface UpdateTemplateInput {
  template_name?: string;
  label_type?: LabelType;
  template_content?: string;
  width?: number;
  height?: number;
}

export enum CodeType {
  BARCODE = "barcode",
  QR_CODE = "qrcode",
}

export enum EntityType {
  MATERIAL = "material",
  LOT = "lot",
  BATCH = "batch",
}

export interface GenerateLabelInput {
  material_id: string;
  code_type: CodeType;
}

export interface GenerateLabelFromTemplateInput {
  template_id: string;
  entity_type: EntityType;
  entity_id: string; // lot_id, batch_id, or material_id depending on entity_type
  code_type: CodeType;
}

export interface GeneratedLabel {
  label_id: string;
  material_id: string;
  material_name: string;
  part_number: string;
  material_type: string;
  entity_type: EntityType;
  entity_id: string;
  code_type: CodeType;
  code_data: string; // base64 encoded image
  label_content: Record<string, unknown>;
  created_by: string;
  created_date: Date;
}
