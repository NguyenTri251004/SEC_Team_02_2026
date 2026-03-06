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

export interface GenerateLabelInput {
  template_id: string;
  lot_id?: string;
  batch_id?: string;
}

export interface GeneratedLabel {
  template_id: string;
  template_name: string;
  label_type: LabelType;
  width: number;
  height: number;
  content: Record<string, unknown>;
  generated_date: Date;
}
