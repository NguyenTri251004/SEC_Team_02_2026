import pool from "../../shared/db/pool";
import { LabelTemplate, CreateTemplateInput, UpdateTemplateInput, GenerateLabelInput, GeneratedLabel, LabelType } from "./label.types";

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
 * Generate label data for a lot or batch
 */
export const generateLabel = async (input: GenerateLabelInput): Promise<GeneratedLabel> => {
  // Get the template
  const templateResult = await pool.query<LabelTemplate>(
    "SELECT * FROM label_templates WHERE template_id = $1",
    [input.template_id]
  );

  if (templateResult.rows.length === 0) {
    throw new Error(`Template ${input.template_id} not found`);
  }

  const template = templateResult.rows[0];
  const content: Record<string, unknown> = {};

  // Generate label based on lot_id or batch_id
  if (input.lot_id) {
    // Get lot information with material details
    const lotResult = await pool.query<any>(
      `SELECT il.*, m.material_name, m.material_type, m.part_number
       FROM inventory_lots il
       JOIN materials m ON il.material_id = m.material_id
       WHERE il.lot_id = $1`,
      [input.lot_id]
    );

    if (lotResult.rows.length === 0) {
      throw new Error(`Lot ${input.lot_id} not found`);
    }

    const lot = lotResult.rows[0];

    // Populate label content with lot data
    content.lot_id = lot.lot_id;
    content.material_name = lot.material_name;
    content.material_type = lot.material_type;
    content.part_number = lot.part_number;
    content.manufacturer_name = lot.manufacturer_name;
    content.manufacturer_lot = lot.manufacturer_lot;
    content.supplier_name = lot.supplier_name;
    content.received_date = lot.received_date;
    content.expiration_date = lot.expiration_date;
    content.quantity = lot.quantity;
    content.unit_of_measure = lot.unit_of_measure;
    content.storage_location = lot.storage_location;
    content.status = lot.status;
  } else if (input.batch_id) {
    // Get batch information with product details
    const batchResult = await pool.query<any>(
      `SELECT pb.*, m.material_name, m.material_type
       FROM production_batches pb
       JOIN materials m ON pb.product_id = m.material_id
       WHERE pb.batch_id = $1`,
      [input.batch_id]
    );

    if (batchResult.rows.length === 0) {
      throw new Error(`Batch ${input.batch_id} not found`);
    }

    const batch = batchResult.rows[0];

    // Populate label content with batch data
    content.batch_id = batch.batch_id;
    content.batch_number = batch.batch_number;
    content.material_name = batch.material_name;
    content.material_type = batch.material_type;
    content.batch_size = batch.batch_size;
    content.unit_of_measure = batch.unit_of_measure;
    content.manufacture_date = batch.manufacture_date;
    content.expiration_date = batch.expiration_date;
    content.status = batch.status;
  }

  return {
    template_id: template.template_id,
    template_name: template.template_name,
    label_type: template.label_type,
    width: template.width,
    height: template.height,
    content,
    generated_date: new Date(),
  };
};
