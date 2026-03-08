/**
 * Unit tests for Material Service
 * Mocks the pg pool, Redis cache, and Elasticsearch search service
 * so no real DB/Redis/ES connection is needed.
 */
import * as materialService from "../material.service";
import pool from "../../../shared/db/pool";

// ─── Mock pg pool ───────────────────────────────────────────────────────────
jest.mock("../../../shared/db/pool", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

// ─── Mock Redis ─────────────────────────────────────────────────────────────
jest.mock("../../../shared/cache/redis", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
  },
  CACHE_TTL: 60,
}));

// ─── Mock search service (Elasticsearch) ────────────────────────────────────
jest.mock("../../search/search.service", () => ({
  indexMaterial: jest.fn().mockResolvedValue(undefined),
  deleteMaterialIndex: jest.fn().mockResolvedValue(undefined),
}));

import redisClient from "../../../shared/cache/redis";
import * as searchService from "../../search/search.service";

// Cast to any for mock access
const mockPool = pool as any;
const mockRedis = redisClient as any;
const mockSearchService = searchService as any;

// ─── Sample fixtures ────────────────────────────────────────────────────────
const sampleMaterial = {
  material_id: "MAT-001",
  part_number: "PN-12345",
  material_name: "Aspirin API",
  material_type: "API",
  storage_conditions: "Cool, dry place",
  specification_document: "SPEC-001.pdf",
  created_date: new Date("2026-01-15"),
  modified_date: new Date("2026-01-15"),
};

const sampleMaterial2 = {
  material_id: "MAT-002",
  part_number: "PN-67890",
  material_name: "Lactose Monohydrate",
  material_type: "Excipient",
  storage_conditions: "Room temperature",
  specification_document: "SPEC-002.pdf",
  created_date: new Date("2026-02-01"),
  modified_date: new Date("2026-02-01"),
};

// ─── Setup ──────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
});

// ═════════════════════════════════════════════════════════════════════════════
describe("getAllMaterials", () => {
  it("returns materials from cache when cache hit", async () => {
    const cached = JSON.stringify([sampleMaterial]);
    mockRedis.get.mockResolvedValueOnce(cached);

    const result = await materialService.getAllMaterials();

    // JSON.parse turns Date objects into ISO strings, so compare with parsed version
    expect(result).toEqual(JSON.parse(cached));
    expect(mockRedis.get).toHaveBeenCalledWith("materials:all");
    // Should NOT query DB when cache hit
    expect(mockPool.query).not.toHaveBeenCalled();
  });

  it("queries DB when cache miss and stores result in cache", async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockPool.query.mockResolvedValueOnce({ rows: [sampleMaterial, sampleMaterial2] });
    mockRedis.setEx.mockResolvedValueOnce("OK");

    const result = await materialService.getAllMaterials();

    expect(result).toEqual([sampleMaterial, sampleMaterial2]);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM materials ORDER BY created_date DESC")
    );
    expect(mockRedis.setEx).toHaveBeenCalledWith(
      "materials:all",
      60,
      JSON.stringify([sampleMaterial, sampleMaterial2])
    );
  });

  it("queries DB when Redis is unavailable (get throws)", async () => {
    mockRedis.get.mockRejectedValueOnce(new Error("Redis unavailable"));
    mockPool.query.mockResolvedValueOnce({ rows: [sampleMaterial] });
    mockRedis.setEx.mockRejectedValueOnce(new Error("Redis unavailable"));

    const result = await materialService.getAllMaterials();

    expect(result).toEqual([sampleMaterial]);
    expect(mockPool.query).toHaveBeenCalled();
  });

  it("returns empty array when no materials exist", async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await materialService.getAllMaterials();

    expect(result).toEqual([]);
  });

  it("still returns DB results when setEx fails silently", async () => {
    mockRedis.get.mockResolvedValueOnce(null);
    mockPool.query.mockResolvedValueOnce({ rows: [sampleMaterial] });
    mockRedis.setEx.mockRejectedValueOnce(new Error("Redis write error"));

    const result = await materialService.getAllMaterials();

    expect(result).toEqual([sampleMaterial]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("getMaterialById", () => {
  it("returns the material when found", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [sampleMaterial] });

    const result = await materialService.getMaterialById("MAT-001");

    expect(result).toEqual(sampleMaterial);
    expect(mockPool.query).toHaveBeenCalledWith(
      "SELECT * FROM materials WHERE material_id = $1",
      ["MAT-001"]
    );
  });

  it("returns null when material is not found", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await materialService.getMaterialById("nonexistent");

    expect(result).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("createMaterial", () => {
  const createDto = {
    material_id: "MAT-003",
    part_number: "PN-11111",
    material_name: "Ibuprofen API",
    material_type: "API",
    storage_conditions: "Below 25C",
    specification_document: "SPEC-003.pdf",
  };

  const createdRow = {
    ...createDto,
    created_date: new Date("2026-03-01"),
    modified_date: new Date("2026-03-01"),
  };

  it("inserts material and returns the created row", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [createdRow] });

    const result = await materialService.createMaterial(createDto);

    expect(result).toEqual(createdRow);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO materials"),
      [
        createDto.material_id,
        createDto.part_number,
        createDto.material_name,
        createDto.material_type,
        createDto.storage_conditions,
        createDto.specification_document,
      ]
    );
  });

  it("invalidates cache after creation", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [createdRow] });

    await materialService.createMaterial(createDto);

    expect(mockRedis.del).toHaveBeenCalledWith("materials:all");
  });

  it("indexes material in Elasticsearch after creation", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [createdRow] });

    await materialService.createMaterial(createDto);

    expect(mockSearchService.indexMaterial).toHaveBeenCalledWith(createdRow);
  });

  it("handles optional fields as null when not provided", async () => {
    const minimalDto = {
      material_id: "MAT-004",
      part_number: "PN-22222",
      material_name: "Test Material",
      material_type: "Excipient",
    };
    const minimalRow = {
      ...minimalDto,
      storage_conditions: null,
      specification_document: null,
      created_date: new Date(),
      modified_date: new Date(),
    };
    mockPool.query.mockResolvedValueOnce({ rows: [minimalRow] });

    await materialService.createMaterial(minimalDto);

    const [, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
    // storage_conditions and specification_document should be null
    expect(params[4]).toBeNull();
    expect(params[5]).toBeNull();
  });

  it("still returns material even when Elasticsearch indexing fails", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [createdRow] });
    mockSearchService.indexMaterial.mockRejectedValueOnce(new Error("ES unavailable"));

    const result = await materialService.createMaterial(createDto);

    expect(result).toEqual(createdRow);
  });

  it("still returns material even when Redis cache invalidation fails", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [createdRow] });
    mockRedis.del.mockRejectedValueOnce(new Error("Redis unavailable"));

    const result = await materialService.createMaterial(createDto);

    expect(result).toEqual(createdRow);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("updateMaterial", () => {
  const updateDto = {
    part_number: "PN-UPDATED",
    material_name: "Updated Aspirin",
  };

  const updatedRow = {
    ...sampleMaterial,
    part_number: "PN-UPDATED",
    material_name: "Updated Aspirin",
    modified_date: new Date("2026-03-09"),
  };

  it("updates material and returns the updated row", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [updatedRow] });

    const result = await materialService.updateMaterial("MAT-001", updateDto);

    expect(result).toEqual(updatedRow);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE materials"),
      expect.arrayContaining(["PN-UPDATED", "Updated Aspirin", "MAT-001"])
    );
  });

  it("returns null when material does not exist", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await materialService.updateMaterial("nonexistent", updateDto);

    expect(result).toBeNull();
  });

  it("does not invalidate cache when material not found", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await materialService.updateMaterial("nonexistent", updateDto);

    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  it("invalidates cache after successful update", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [updatedRow] });

    await materialService.updateMaterial("MAT-001", updateDto);

    expect(mockRedis.del).toHaveBeenCalledWith("materials:all");
  });

  it("indexes updated material in Elasticsearch", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [updatedRow] });

    await materialService.updateMaterial("MAT-001", updateDto);

    expect(mockSearchService.indexMaterial).toHaveBeenCalledWith(updatedRow);
  });

  it("does not index in Elasticsearch when material not found", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await materialService.updateMaterial("nonexistent", updateDto);

    expect(mockSearchService.indexMaterial).not.toHaveBeenCalled();
  });

  it("passes null for fields not provided in update DTO", async () => {
    const partialDto = { material_name: "Only Name Updated" };
    mockPool.query.mockResolvedValueOnce({ rows: [{ ...sampleMaterial, material_name: "Only Name Updated" }] });

    await materialService.updateMaterial("MAT-001", partialDto);

    const [, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
    // part_number (index 0) should be null since not provided
    expect(params[0]).toBeNull();
    // material_name (index 1) should be set
    expect(params[1]).toBe("Only Name Updated");
    // material_type (index 2), storage_conditions (index 3), specification_document (index 4) should be null
    expect(params[2]).toBeNull();
    expect(params[3]).toBeNull();
    expect(params[4]).toBeNull();
    // id (index 5) should be "MAT-001"
    expect(params[5]).toBe("MAT-001");
  });

  it("still returns updated material when Elasticsearch update fails", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [updatedRow] });
    mockSearchService.indexMaterial.mockRejectedValueOnce(new Error("ES error"));

    const result = await materialService.updateMaterial("MAT-001", updateDto);

    expect(result).toEqual(updatedRow);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("deleteMaterial", () => {
  it("returns true when material is successfully deleted", async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

    const result = await materialService.deleteMaterial("MAT-001");

    expect(result).toBe(true);
    expect(mockPool.query).toHaveBeenCalledWith(
      "DELETE FROM materials WHERE material_id = $1",
      ["MAT-001"]
    );
  });

  it("returns false when material does not exist", async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    const result = await materialService.deleteMaterial("nonexistent");

    expect(result).toBe(false);
  });

  it("handles null rowCount as not found", async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: null });

    const result = await materialService.deleteMaterial("MAT-001");

    expect(result).toBe(false);
  });

  it("invalidates cache after successful deletion", async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

    await materialService.deleteMaterial("MAT-001");

    expect(mockRedis.del).toHaveBeenCalledWith("materials:all");
  });

  it("does not invalidate cache when material not found", async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    await materialService.deleteMaterial("nonexistent");

    expect(mockRedis.del).not.toHaveBeenCalled();
  });

  it("deletes material from Elasticsearch index after successful deletion", async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 1 });

    await materialService.deleteMaterial("MAT-001");

    expect(mockSearchService.deleteMaterialIndex).toHaveBeenCalledWith("MAT-001");
  });

  it("does not delete from Elasticsearch when material not found in DB", async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 0 });

    await materialService.deleteMaterial("nonexistent");

    expect(mockSearchService.deleteMaterialIndex).not.toHaveBeenCalled();
  });

  it("still returns true when Elasticsearch deletion fails", async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
    mockSearchService.deleteMaterialIndex.mockRejectedValueOnce(new Error("ES error"));

    const result = await materialService.deleteMaterial("MAT-001");

    expect(result).toBe(true);
  });

  it("still returns true when Redis cache invalidation fails", async () => {
    mockPool.query.mockResolvedValueOnce({ rowCount: 1 });
    mockRedis.del.mockRejectedValueOnce(new Error("Redis error"));

    const result = await materialService.deleteMaterial("MAT-001");

    expect(result).toBe(true);
  });
});
