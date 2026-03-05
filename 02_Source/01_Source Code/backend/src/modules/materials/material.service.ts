import pool from "../../shared/db/pool";
import redisClient, { CACHE_TTL } from "../../shared/cache/redis";
import { Material, CreateMaterialDto, UpdateMaterialDto } from "./material.types";
import * as searchService from "../search/search.service";

const CACHE_KEY = "materials:all";

// Xóa cache khi có thay đổi dữ liệu
const invalidateCache = async (): Promise<void> => {
  try {
    await redisClient.del(CACHE_KEY);
  } catch {
    // Redis không available thì bỏ qua
  }
};

export const getAllMaterials = async (): Promise<Material[]> => {
  // Thử lấy từ cache trước
  try {
    const cached = await redisClient.get(CACHE_KEY);
    if (cached) {
      console.log("✓ Cache hit: materials");
      return JSON.parse(cached) as Material[];
    }
  } catch {
    // Redis không available, truy vấn thẳng DB
  }

  const result = await pool.query<Material>(
    "SELECT * FROM materials ORDER BY created_date DESC"
  );

  // Lưu vào cache
  try {
    await redisClient.setEx(CACHE_KEY, CACHE_TTL, JSON.stringify(result.rows));
  } catch {
    // Bỏ qua nếu Redis không available
  }

  return result.rows;
};

export const getMaterialById = async (id: string): Promise<Material | null> => {
  const result = await pool.query<Material>(
    "SELECT * FROM materials WHERE material_id = $1",
    [id]
  );
  return result.rows[0] ?? null;
};

export const createMaterial = async (dto: CreateMaterialDto): Promise<Material> => {
  const result = await pool.query<Material>(
    `INSERT INTO materials
       (material_id, part_number, material_name, material_type, storage_conditions, specification_document)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      dto.material_id,
      dto.part_number,
      dto.material_name,
      dto.material_type,
      dto.storage_conditions ?? null,
      dto.specification_document ?? null,
    ]
  );
  await invalidateCache();
  
  // Index vào Elasticsearch
  const material = result.rows[0];
  try {
    await searchService.indexMaterial(material);
  } catch (error) {
    console.warn("Không thể index material vào Elasticsearch:", error);
  }
  
  return material;
};

export const updateMaterial = async (
  id: string,
  dto: UpdateMaterialDto
): Promise<Material | null> => {
  const result = await pool.query<Material>(
    `UPDATE materials
     SET part_number            = COALESCE($1, part_number),
         material_name          = COALESCE($2, material_name),
         material_type          = COALESCE($3, material_type),
         storage_conditions     = COALESCE($4, storage_conditions),
         specification_document = COALESCE($5, specification_document),
         modified_date          = CURRENT_TIMESTAMP
     WHERE material_id = $6
     RETURNING *`,
    [
      dto.part_number ?? null,
      dto.material_name ?? null,
      dto.material_type ?? null,
      dto.storage_conditions ?? null,
      dto.specification_document ?? null,
      id,
    ]
  );
  if (result.rows.length === 0) return null;
  await invalidateCache();
  
  // Update trong Elasticsearch
  const material = result.rows[0];
  try {
    await searchService.indexMaterial(material);
  } catch (error) {
    console.warn("Không thể update material trong Elasticsearch:", error);
  }
  
  return material;
};

export const deleteMaterial = async (id: string): Promise<boolean> => {
  const result = await pool.query(
    "DELETE FROM materials WHERE material_id = $1",
    [id]
  );
  if ((result.rowCount ?? 0) === 0) return false;
  await invalidateCache();
  
  // Xóa khỏi Elasticsearch
  try {
    await searchService.deleteMaterialIndex(id);
  } catch (error) {
    console.warn("Không thể xóa material khỏi Elasticsearch:", error);
  }
  
  return true;
};
