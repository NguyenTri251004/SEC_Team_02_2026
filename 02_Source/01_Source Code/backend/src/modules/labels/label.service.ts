import pool from "../../shared/db/pool";
import { LabelTemplate, CreateTemplateInput, UpdateTemplateInput, GenerateLabelInput, GenerateLabelFromTemplateInput, GeneratedLabel, LabelType, CodeType } from "./label.types";
import crypto from "crypto";
import QRCode from "qrcode";
import bwipjs from "bwip-js";

// Cache for labels
const CACHE_KEY = "labels:templates:all";

// Invalidate cache when data changes
const invalidateCache = async (): Promise<void> => {
  try {
    const redisClient = await import("../../shared/cache/redis").then(m => m.default);
    await redisClient.del(CACHE_KEY);
  } catch {
    // Redis not available, skip cache invalidation
  }
};

/**
 * Get all label templates
 */
export const getAllTemplates = async (): Promise<LabelTemplate[]> => {
  // Try to get from cache first
  try {
    const redisClient = await import("../../shared/cache/redis").then(m => m.default);
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      console.log("✓ Cache hit: label templates");
      return JSON.parse(cached) as LabelTemplate[];
    }
  } catch {
    // Redis not available, query DB
  }

  const result = await pool.query<LabelTemplate>(
    "SELECT * FROM label_templates ORDER BY created_date DESC"
  );

  // Save to cache
  try {
    const redisClient = await import("../../shared/cache/redis").then(m => m.default);
    const { CACHE_TTL } = await import("../../shared/cache/redis");
    await redisClient.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(result.rows));
  } catch {
    // Skip cache if Redis not available
  }

  return result.rows;
};

/**
 * Get a single template by ID
 */
export const getTemplateById = async (id: string): Promise<LabelTemplate | null> => {
  const result = await pool.query<LabelTemplate>(
    "SELECT * FROM label_templates WHERE template_id = $1",
    [id]
  );
  return result.rows[0] ?? null;
};

/**
 * Create a new template
 */
export const createTemplate = async (dto: CreateTemplateInput): Promise<LabelTemplate> => {
  const result = await pool.query<LabelTemplate>(
    `INSERT INTO label_templates
       (template_id, template_name, label_type, template_content, width, height)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      dto.template_id,
      dto.template_name,
      dto.label_type,
      dto.template_content,
      dto.width,
      dto.height,
    ]
  );
  await invalidateCache();
  return result.rows[0];
};

/**
 * Update an existing template
 */
export const updateTemplate = async (
  id: string,
  dto: UpdateTemplateInput
): Promise<LabelTemplate | null> => {
  const result = await pool.query<LabelTemplate>(
    `UPDATE label_templates
     SET template_name    = COALESCE($1, template_name),
         label_type       = COALESCE($2, label_type),
         template_content = COALESCE($3, template_content),
         width            = COALESCE($4, width),
         height           = COALESCE($5, height),
         modified_date    = CURRENT_TIMESTAMP
     WHERE template_id = $6
     RETURNING *`,
    [
      dto.template_name ?? null,
      dto.label_type ?? null,
      dto.template_content ?? null,
      dto.width ?? null,
      dto.height ?? null,
      id,
    ]
  );
  if (result.rows.length === 0) return null;
  await invalidateCache();
  return result.rows[0];
};

/**
 * Delete a template
 */
export const deleteTemplate = async (id: string): Promise<boolean> => {
  const result = await pool.query(
    "DELETE FROM label_templates WHERE template_id = $1",
    [id]
  );
  if ((result.rowCount ?? 0) === 0) return false;
  await invalidateCache();
  return true;
};

/**
 * Generate QR Code as base64 image
 */
const generateQRCode = async (data: string): Promise<string> => {
  try {
    // Generate QR code as PNG data URL
    const qrDataUrl = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Generate Barcode as base64 image (PNG)
 * @param data - Data to encode in barcode (should be short, e.g., material_id)
 * @param displayText - Optional text to display below barcode (e.g., material name)
 */
const generateBarcode = async (data: string, displayText?: string): Promise<string> => {
  try {
    // Generate CODE128 barcode using bwip-js
    const png = await bwipjs.toBuffer({
      bcid: 'code128',        // Barcode type
      text: data,             // Data to encode (only material_id)
      scale: 3,               // 3x scaling factor
      height: 12,             // Bar height, in millimeters
      includetext: true,      // Show human-readable text below barcode
      textxalign: 'center',   // Center the text
      textsize: 11,           // Font size for readable text
      textgaps: 0.5,          // Gap between bars and text
      alttext: displayText    // Display this text instead (material name)
    });
    
    // Convert PNG buffer to base64 data URL
    const base64 = png.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('Error generating barcode:', error);
    throw new Error('Failed to generate barcode');
  }
};

/**
 * Generate label data for a material and save to database
 */
export const generateLabel = async (input: GenerateLabelInput, userId: string): Promise<GeneratedLabel> => {
  // Get material information
  const materialResult = await pool.query<any>(
    `SELECT material_id, part_number, material_name, material_type, storage_conditions, specification_document
     FROM materials
     WHERE material_id = $1`,
    [input.material_id]
  );

  if (materialResult.rows.length === 0) {
    throw new Error(`Material ${input.material_id} not found`);
  }

  const material = materialResult.rows[0];

  // Prepare label content
  const content: Record<string, unknown> = {
    material_id: material.material_id,
    part_number: material.part_number,
    material_name: material.material_name,
    material_type: material.material_type,
    storage_conditions: material.storage_conditions || 'N/A',
    specification_document: material.specification_document || 'N/A',
    generated_date: new Date().toISOString(),
  };

  // Generate code data (barcode or QR code)
  let generatedCode: string;

  if (input.code_type === CodeType.QR_CODE) {
    // For QR code, encode full JSON data
    const qrPayload = JSON.stringify(content);
    generatedCode = await generateQRCode(qrPayload);
  } else {
    // For barcode, only encode material_id (short & scannable)
    // But display material name below for readability
    generatedCode = await generateBarcode(
      material.material_id,
      `${material.part_number} - ${material.material_name}`
    );
  }

  // Save to database
  const labelId = crypto.randomUUID();
  const insertResult = await pool.query<any>(
    `INSERT INTO generated_labels (label_id, material_id, code_type, code_data, label_content, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      labelId,
      material.material_id,
      input.code_type,
      generatedCode,
      JSON.stringify(content),
      userId,
    ]
  );

  const savedLabel = insertResult.rows[0];

  return {
    label_id: savedLabel.label_id,
    material_id: material.material_id,
    material_name: material.material_name,
    part_number: material.part_number,
    material_type: material.material_type,
    code_type: savedLabel.code_type,
    code_data: savedLabel.code_data,
    label_content: content,
    created_by: savedLabel.created_by,
    created_date: savedLabel.created_date,
  };
};

/**
 * Get all generated labels with material info
 */
export const getAllGeneratedLabels = async (): Promise<GeneratedLabel[]> => {
  const result = await pool.query<any>(
    `SELECT gl.*, m.material_name, m.part_number, m.material_type
     FROM generated_labels gl
     JOIN materials m ON gl.material_id = m.material_id
     ORDER BY gl.created_date DESC`
  );

  return result.rows.map((row: any) => ({
    label_id: row.label_id,
    material_id: row.material_id,
    material_name: row.material_name,
    part_number: row.part_number,
    material_type: row.material_type,
    code_type: row.code_type,
    code_data: row.code_data,
    label_content: typeof row.label_content === 'string' ? JSON.parse(row.label_content) : row.label_content,
    created_by: row.created_by,
    created_date: row.created_date,
  }));
};

/**
 * Get a generated label by ID
 */
export const getGeneratedLabelById = async (labelId: string): Promise<GeneratedLabel | null> => {
  const result = await pool.query<any>(
    `SELECT gl.*, m.material_name, m.part_number, m.material_type
     FROM generated_labels gl
     JOIN materials m ON gl.material_id = m.material_id
     WHERE gl.label_id = $1`,
    [labelId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    label_id: row.label_id,
    material_id: row.material_id,
    material_name: row.material_name,
    part_number: row.part_number,
    material_type: row.material_type,
    code_type: row.code_type,
    code_data: row.code_data,
    label_content: typeof row.label_content === 'string' ? JSON.parse(row.label_content) : row.label_content,
    created_by: row.created_by,
    created_date: row.created_date,
  };
};

/**
 * Delete a generated label
 */
export const deleteGeneratedLabel = async (labelId: string): Promise<boolean> => {
  const result = await pool.query(
    "DELETE FROM generated_labels WHERE label_id = $1",
    [labelId]
  );
  return (result.rowCount ?? 0) > 0;
};

/**
 * Helper: Get entity data based on entity type
 */
const getEntityData = async (entityId: string): Promise<Record<string, any> | null> => {
  // Try to find entity in different tables
  // Check if it's a material (MAT prefix)
  if (entityId.startsWith('MAT')) {
    const result = await pool.query(
      `SELECT material_id, part_number, material_name, material_type, storage_conditions, specification_document, created_date
       FROM materials WHERE material_id = $1`,
      [entityId]
    );
    if (result.rows.length > 0) {
      return { ...result.rows[0], entity_type: 'Material' };
    }
  }

  // Check if it's an inventory lot (LOT prefix)
  if (entityId.startsWith('LOT')) {
    const result = await pool.query(
      `SELECT l.*, m.material_name, m.part_number, m.material_type
       FROM inventory_lots l
       JOIN materials m ON l.material_id = m.material_id
       WHERE l.lot_id = $1`,
      [entityId]
    );
    if (result.rows.length > 0) {
      const lot = result.rows[0];
      return {
        ...lot,
        entity_type: lot.is_sample ? 'Sample' : 'InventoryLot',
        // Format dates for display
        received_date: lot.received_date?.toISOString().split('T')[0],
        expiration_date: lot.expiration_date?.toISOString().split('T')[0],
        in_use_expiration_date: lot.in_use_expiration_date?.toISOString().split('T')[0],
      };
    }
  }

  // Check if it's a production batch (BATCH prefix)
  if (entityId.startsWith('BATCH')) {
    const result = await pool.query(
      `SELECT b.*, m.material_name as product_name, m.part_number
       FROM production_batches b
       JOIN materials m ON b.product_id = m.material_id
       WHERE b.batch_id = $1`,
      [entityId]
    );
    if (result.rows.length > 0) {
      const batch = result.rows[0];
      return {
        ...batch,
        entity_type: 'ProductionBatch',
        // Format dates for display
        manufacture_date: batch.manufacture_date?.toISOString().split('T')[0],
        expiration_date: batch.expiration_date?.toISOString().split('T')[0],
      };
    }
  }

  return null;
};

/**
 * Replace placeholders in template content with actual entity data
 * Supports {{field_name}} syntax
 */
const replacePlaceholders = (template: string, data: Record<string, any>): string => {
  let result = template;
  
  // Find all placeholders in format {{field_name}}
  const placeholderRegex = /\{\{([^}]+)\}\}/g;
  let match;
  
  while ((match = placeholderRegex.exec(template)) !== null) {
    const fieldName = match[1].trim();
    const value = data[fieldName];
    
    // Replace placeholder with actual value (or 'N/A' if not found)
    const replacement = value !== undefined && value !== null ? String(value) : 'N/A';
    result = result.replace(match[0], replacement);
  }
  
  return result;
};

/**
 * Generate label from template
 */
export const generateLabelFromTemplate = async (
  input: GenerateLabelFromTemplateInput,
  userId: string
): Promise<GeneratedLabel> => {
  // Get template
  const template = await getTemplateById(input.template_id);
  if (!template) {
    throw new Error(`Template ${input.template_id} not found`);
  }

  // Get entity data
  const entityData = await getEntityData(input.entity_id);
  if (!entityData) {
    throw new Error(`Entity ${input.entity_id} not found`);
  }

  // Get material_id (needed for foreign key in generated_labels table)
  let materialId: string;
  if (entityData.entity_type === 'Material') {
    materialId = entityData.material_id;
  } else if (entityData.entity_type === 'InventoryLot' || entityData.entity_type === 'Sample') {
    materialId = entityData.material_id;
  } else if (entityData.entity_type === 'ProductionBatch') {
    materialId = entityData.product_id;
  } else {
    throw new Error(`Unknown entity type: ${entityData.entity_type}`);
  }

  // Replace placeholders in template content
  const processedContent = replacePlaceholders(template.template_content, entityData);

  // Prepare label content
  const content: Record<string, unknown> = {
    entity_type: entityData.entity_type,
    entity_id: input.entity_id,
    template_id: input.template_id,
    template_name: template.template_name,
    label_type: template.label_type,
    processed_content: processedContent,
    raw_data: entityData,
    generated_date: new Date().toISOString(),
  };

  // Generate code data (barcode or QR code)
  let generatedCode: string;

  if (input.code_type === CodeType.QR_CODE) {
    // For QR code, encode full JSON data
    const qrPayload = JSON.stringify(content);
    generatedCode = await generateQRCode(qrPayload);
  } else {
    // For barcode, encode entity_id
    const displayText = `${template.label_type}: ${entityData.material_name || entityData.product_name || input.entity_id}`;
    generatedCode = await generateBarcode(input.entity_id, displayText);
  }

  // Save to database
  const labelId = crypto.randomUUID();
  const insertResult = await pool.query<any>(
    `INSERT INTO generated_labels (label_id, material_id, code_type, code_data, label_content, created_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      labelId,
      materialId,
      input.code_type,
      generatedCode,
      JSON.stringify(content),
      userId,
    ]
  );

  const savedLabel = insertResult.rows[0];

  // Get material info for response
  const materialResult = await pool.query<any>(
    `SELECT material_name, part_number, material_type FROM materials WHERE material_id = $1`,
    [materialId]
  );
  const material = materialResult.rows[0] || { material_name: 'Unknown', part_number: 'N/A', material_type: 'N/A' };

  return {
    label_id: savedLabel.label_id,
    material_id: materialId,
    material_name: material.material_name,
    part_number: material.part_number,
    material_type: material.material_type,
    code_type: savedLabel.code_type,
    code_data: savedLabel.code_data,
    label_content: content,
    created_by: savedLabel.created_by,
    created_date: savedLabel.created_date,
  };
};

/**
 * Get templates by label type
 */
export const getTemplatesByLabelType = async (labelType: LabelType): Promise<LabelTemplate[]> => {
  const result = await pool.query<LabelTemplate>(
    "SELECT * FROM label_templates WHERE label_type = $1 ORDER BY created_date DESC",
    [labelType]
  );
  return result.rows;
};
