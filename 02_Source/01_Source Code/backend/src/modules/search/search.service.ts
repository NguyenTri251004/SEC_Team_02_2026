import esClient from "../../shared/elasticsearch/client";
import pool from "../../shared/db/pool";
import type {
  SearchRequest,
  SearchResponse,
  SearchResult,
  IndexMaterialRequest,
} from "./search.types";

const INDEX_NAME = "materials";

// Tạo index nếu chưa tồn tại
export const createIndexIfNotExists = async (): Promise<void> => {
  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME });

    if (!exists) {
      await esClient.indices.create({
        index: INDEX_NAME,
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                default: {
                  type: "standard",
                },
              },
            },
          },
          mappings: {
            properties: {
              material_id: { type: "keyword" },
              part_number: { type: "text", analyzer: "standard" },
              material_name: { type: "text", analyzer: "standard" },
              material_type: { type: "keyword" },
              storage_conditions: { type: "text" },
              specification_document: { type: "text" },
              created_date: { type: "date" },
              modified_date: { type: "date" },
            },
          },
        },
      });
      console.log(`✓ Elasticsearch index "${INDEX_NAME}" đã được tạo`);
    }
  } catch (error) {
    console.error("Lỗi tạo Elasticsearch index:", error);
    throw error;
  }
};

// Index một material vào Elasticsearch
export const indexMaterial = async (
  material: IndexMaterialRequest
): Promise<void> => {
  try {
    await esClient.index({
      index: INDEX_NAME,
      id: material.material_id,
      document: {
        material_id: material.material_id,
        part_number: material.part_number,
        material_name: material.material_name,
        material_type: material.material_type,
        storage_conditions: material.storage_conditions || null,
        specification_document: material.specification_document || null,
        created_date: material.created_date || new Date(),
        modified_date: material.modified_date || new Date(),
      },
      refresh: true,
    });
  } catch (error) {
    console.error("Lỗi index material vào Elasticsearch:", error);
    throw error;
  }
};

// Index tất cả materials từ database vào Elasticsearch
export const indexAllMaterials = async (): Promise<number> => {
  try {
    // Tạo index nếu chưa có
    await createIndexIfNotExists();

    // Lấy tất cả materials từ database
    const result = await pool.query(
      "SELECT * FROM materials ORDER BY created_date DESC"
    );

    const materials = result.rows;

    // Bulk index vào Elasticsearch
    if (materials.length > 0) {
      const operations = materials.flatMap((material) => [
        { index: { _index: INDEX_NAME, _id: material.material_id } },
        {
          material_id: material.material_id,
          part_number: material.part_number,
          material_name: material.material_name,
          material_type: material.material_type,
          storage_conditions: material.storage_conditions,
          specification_document: material.specification_document,
          created_date: material.created_date,
          modified_date: material.modified_date,
        },
      ]);

      await esClient.bulk({
        refresh: true,
        operations,
      });
    }

    console.log(`✓ Đã index ${materials.length} materials vào Elasticsearch`);
    return materials.length;
  } catch (error) {
    console.error("Lỗi index tất cả materials:", error);
    throw error;
  }
};

// Full-text search materials
export const searchMaterials = async (
  request: SearchRequest
): Promise<SearchResponse> => {
  try {
    const { query, limit = 20, offset = 0, filters } = request;

    // Build query
    const mustClauses: any[] = [];

    // Full-text search trên các trường
    if (query && query.trim()) {
      mustClauses.push({
        multi_match: {
          query: query.trim(),
          fields: [
            "material_name^3", // Boost material_name cao nhất
            "part_number^2",
            "specification_document",
            "storage_conditions",
          ],
          type: "best_fields",
          fuzziness: "AUTO",
        },
      });
    }

    // Filters
    if (filters?.material_type) {
      mustClauses.push({
        term: { material_type: filters.material_type },
      });
    }

    if (filters?.storage_conditions) {
      mustClauses.push({
        match: { storage_conditions: filters.storage_conditions },
      });
    }

    const searchQuery =
      mustClauses.length > 0
        ? { bool: { must: mustClauses } }
        : { match_all: {} };

    const response = await esClient.search({
      index: INDEX_NAME,
      from: offset,
      size: limit,
      query: searchQuery,
      sort: query ? undefined : [{ created_date: { order: "desc" } }],
    });

    const results: SearchResult[] = response.hits.hits.map((hit: any) => ({
      id: hit._id,
      material_id: hit._source.material_id,
      part_number: hit._source.part_number,
      material_name: hit._source.material_name,
      material_type: hit._source.material_type,
      storage_conditions: hit._source.storage_conditions,
      specification_document: hit._source.specification_document,
      score: hit._score || 0,
    }));

    return {
      results,
      total:
        typeof response.hits.total === "number"
          ? response.hits.total
          : response.hits.total?.value || 0,
      took: response.took,
    };
  } catch (error) {
    console.error("Lỗi search materials:", error);
    throw error;
  }
};

// Xóa material khỏi index
export const deleteMaterialIndex = async (
  materialId: string
): Promise<void> => {
  try {
    await esClient.delete({
      index: INDEX_NAME,
      id: materialId,
      refresh: true,
    });
  } catch (error: any) {
    if (error.meta?.statusCode === 404) {
      // Material không tồn tại trong index, bỏ qua
      return;
    }
    console.error("Lỗi xóa material khỏi Elasticsearch:", error);
    throw error;
  }
};

// Xóa toàn bộ index
export const deleteIndex = async (): Promise<void> => {
  try {
    const exists = await esClient.indices.exists({ index: INDEX_NAME });
    if (exists) {
      await esClient.indices.delete({ index: INDEX_NAME });
      console.log(`✓ Đã xóa index "${INDEX_NAME}"`);
    }
  } catch (error) {
    console.error("Lỗi xóa index:", error);
    throw error;
  }
};
