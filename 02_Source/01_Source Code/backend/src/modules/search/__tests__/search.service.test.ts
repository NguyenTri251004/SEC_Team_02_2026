/**
 * Unit tests for Search Service
 * Mocks the Elasticsearch client and pg pool — no real connections needed.
 */
import * as searchService from "../search.service";
import pool from "../../../shared/db/pool";
import esClient from "../../../shared/elasticsearch/client";
import type { IndexMaterialRequest } from "../search.types";

// ─── Mock pg pool ────────────────────────────────────────────────────────────
jest.mock("../../../shared/db/pool", () => ({
  __esModule: true,
  default: { query: jest.fn() },
}));

// ─── Mock Elasticsearch client ───────────────────────────────────────────────
jest.mock("../../../shared/elasticsearch/client", () => ({
  __esModule: true,
  default: {
    indices: {
      exists: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    index:  jest.fn(),
    bulk:   jest.fn(),
    search: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockQuery = (pool as any).query as jest.Mock;
const mockEs    = esClient as any;

// ─── Fixtures ────────────────────────────────────────────────────────────────
const sampleMaterial: IndexMaterialRequest = {
  material_id:            "MAT-001",
  part_number:            "PN-001",
  material_name:          "Acetaminophen API",
  material_type:          "API",
  storage_conditions:     "15-25C, dry place",
  specification_document: "SPEC-001",
  created_date:           new Date("2026-01-01"),
  modified_date:          new Date("2026-01-01"),
};

const makeEsHit = (mat: IndexMaterialRequest, score = 1.5) => ({
  _id:     mat.material_id,
  _score:  score,
  _source: { ...mat },
});

const makeEsResponse = (hits: any[], total = hits.length, took = 2) => ({
  hits:  { hits, total: { value: total, relation: "eq" } },
  took,
});

// ─── Setup ───────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockReset();
});

// =============================================================================
describe("createIndexIfNotExists", () => {
  it("tạo index mới khi chưa tồn tại", async () => {
    mockEs.indices.exists.mockResolvedValueOnce(false);
    mockEs.indices.create.mockResolvedValueOnce({});

    await searchService.createIndexIfNotExists();

    expect(mockEs.indices.exists).toHaveBeenCalledWith({ index: "materials" });
    expect(mockEs.indices.create).toHaveBeenCalledWith(
      expect.objectContaining({ index: "materials" })
    );
  });

  it("không gọi create khi index đã tồn tại", async () => {
    mockEs.indices.exists.mockResolvedValueOnce(true);

    await searchService.createIndexIfNotExists();

    expect(mockEs.indices.create).not.toHaveBeenCalled();
  });

  it("ném lỗi khi Elasticsearch trả về lỗi", async () => {
    mockEs.indices.exists.mockRejectedValueOnce(new Error("ES unavailable"));

    await expect(searchService.createIndexIfNotExists()).rejects.toThrow("ES unavailable");
  });
});

// =============================================================================
describe("indexMaterial", () => {
  it("gọi esClient.index với đúng params", async () => {
    mockEs.index.mockResolvedValueOnce({ result: "created" });

    await searchService.indexMaterial(sampleMaterial);

    expect(mockEs.index).toHaveBeenCalledWith(
      expect.objectContaining({
        index:   "materials",
        id:      sampleMaterial.material_id,
        refresh: true,
        document: expect.objectContaining({
          material_id:   sampleMaterial.material_id,
          material_name: sampleMaterial.material_name,
          material_type: sampleMaterial.material_type,
          part_number:   sampleMaterial.part_number,
        }),
      })
    );
  });

  it("lưu null cho storage_conditions và specification_document khi không có", async () => {
    mockEs.index.mockResolvedValueOnce({ result: "created" });

    await searchService.indexMaterial({
      material_id:   "MAT-002",
      part_number:   "PN-002",
      material_name: "Excipient B",
      material_type: "Excipient",
    });

    const doc = mockEs.index.mock.calls[0][0].document;
    expect(doc.storage_conditions).toBeNull();
    expect(doc.specification_document).toBeNull();
  });

  it("ném lỗi khi ES index thất bại", async () => {
    mockEs.index.mockRejectedValueOnce(new Error("ES write error"));

    await expect(searchService.indexMaterial(sampleMaterial)).rejects.toThrow("ES write error");
  });
});

// =============================================================================
describe("indexAllMaterials", () => {
  beforeEach(() => {
    // createIndexIfNotExists được gọi bên trong — index đã tồn tại
    mockEs.indices.exists.mockResolvedValue(true);
  });

  it("bulk index tất cả materials từ DB và trả về đúng số lượng", async () => {
    const rows = [
      sampleMaterial,
      { ...sampleMaterial, material_id: "MAT-101", part_number: "PN-101" },
    ];
    mockQuery.mockResolvedValueOnce({ rows });
    mockEs.bulk.mockResolvedValueOnce({ errors: false, items: [] });

    const count = await searchService.indexAllMaterials();

    expect(count).toBe(2);
    expect(mockEs.bulk).toHaveBeenCalledWith(
      expect.objectContaining({
        refresh: true,
        operations: expect.arrayContaining([
          expect.objectContaining({ index: { _index: "materials", _id: "MAT-001" } }),
        ]),
      })
    );
  });

  it("trả về 0 và không gọi bulk khi DB trống", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const count = await searchService.indexAllMaterials();

    expect(count).toBe(0);
    expect(mockEs.bulk).not.toHaveBeenCalled();
  });

  it("ném lỗi khi DB query thất bại", async () => {
    mockQuery.mockRejectedValueOnce(new Error("DB connection error"));

    await expect(searchService.indexAllMaterials()).rejects.toThrow("DB connection error");
  });
});

// =============================================================================
describe("searchMaterials", () => {
  it("trả về kết quả khi có full-text query", async () => {
    mockEs.search.mockResolvedValueOnce(makeEsResponse([makeEsHit(sampleMaterial, 2.5)], 1));

    const res = await searchService.searchMaterials({ query: "Acetaminophen" });

    expect(res.total).toBe(1);
    expect(res.results).toHaveLength(1);
    expect(res.results[0].material_id).toBe("MAT-001");
    expect(res.results[0].score).toBe(2.5);
  });

  it("dùng multi_match khi query có nội dung", async () => {
    mockEs.search.mockResolvedValueOnce(makeEsResponse([], 0));

    await searchService.searchMaterials({ query: "aspirin" });

    const esCall = mockEs.search.mock.calls[0][0];
    const must = esCall.query.bool.must;
    expect(must[0]).toHaveProperty("multi_match");
    expect(must[0].multi_match.query).toBe("aspirin");
    expect(must[0].multi_match.fuzziness).toBe("AUTO");
  });

  it("dùng match_all khi query rỗng", async () => {
    mockEs.search.mockResolvedValueOnce(makeEsResponse([], 0));

    await searchService.searchMaterials({ query: "" });

    const esCall = mockEs.search.mock.calls[0][0];
    expect(esCall.query).toHaveProperty("match_all");
  });

  it("dùng match_all khi query chỉ toàn khoảng trắng", async () => {
    mockEs.search.mockResolvedValueOnce(makeEsResponse([], 0));

    await searchService.searchMaterials({ query: "   " });

    const esCall = mockEs.search.mock.calls[0][0];
    expect(esCall.query).toHaveProperty("match_all");
  });

  it("thêm term filter khi có material_type", async () => {
    mockEs.search.mockResolvedValueOnce(makeEsResponse([], 0));

    await searchService.searchMaterials({ query: "api", filters: { material_type: "API" } });

    const must = mockEs.search.mock.calls[0][0].query.bool.must as any[];
    const termClause = must.find((c: any) => c.term?.material_type);
    expect(termClause.term.material_type).toBe("API");
  });

  it("thêm match filter khi có storage_conditions", async () => {
    mockEs.search.mockResolvedValueOnce(makeEsResponse([], 0));

    await searchService.searchMaterials({
      query: "excipient",
      filters: { storage_conditions: "refrigerated" },
    });

    const must = mockEs.search.mock.calls[0][0].query.bool.must as any[];
    const matchClause = must.find((c: any) => c.match?.storage_conditions);
    expect(matchClause.match.storage_conditions).toBe("refrigerated");
  });

  it("truyền đúng from và size khi phân trang", async () => {
    mockEs.search.mockResolvedValueOnce(makeEsResponse([], 0));

    await searchService.searchMaterials({ query: "x", limit: 10, offset: 40 });

    const esCall = mockEs.search.mock.calls[0][0];
    expect(esCall.from).toBe(40);
    expect(esCall.size).toBe(10);
  });

  it("dùng limit=20 và offset=0 làm mặc định", async () => {
    mockEs.search.mockResolvedValueOnce(makeEsResponse([], 0));

    await searchService.searchMaterials({ query: "x" });

    const esCall = mockEs.search.mock.calls[0][0];
    expect(esCall.from).toBe(0);
    expect(esCall.size).toBe(20);
  });

  it("thêm sort created_date desc khi không có query", async () => {
    mockEs.search.mockResolvedValueOnce(makeEsResponse([], 0));

    await searchService.searchMaterials({ query: "" });

    const esCall = mockEs.search.mock.calls[0][0];
    expect(esCall.sort).toEqual([{ created_date: { order: "desc" } }]);
  });

  it("không thêm sort khi có query (relevance sort)", async () => {
    mockEs.search.mockResolvedValueOnce(makeEsResponse([], 0));

    await searchService.searchMaterials({ query: "paracetamol" });

    const esCall = mockEs.search.mock.calls[0][0];
    expect(esCall.sort).toBeUndefined();
  });

  it("xử lý total dạng số nguyên từ ES legacy response", async () => {
    mockEs.search.mockResolvedValueOnce({ hits: { hits: [], total: 99 }, took: 1 });

    const res = await searchService.searchMaterials({ query: "" });
    expect(res.total).toBe(99);
  });

  it("trả về score = 0 khi hit._score là null", async () => {
    const hit = { ...makeEsHit(sampleMaterial), _score: null };
    mockEs.search.mockResolvedValueOnce(makeEsResponse([hit], 1));

    const res = await searchService.searchMaterials({ query: "test" });
    expect(res.results[0].score).toBe(0);
  });

  it("ném lỗi khi ES search thất bại", async () => {
    mockEs.search.mockRejectedValueOnce(new Error("ES timeout"));

    await expect(searchService.searchMaterials({ query: "test" })).rejects.toThrow("ES timeout");
  });
});

// =============================================================================
describe("deleteMaterialIndex", () => {
  it("gọi esClient.delete với đúng index và id", async () => {
    mockEs.delete.mockResolvedValueOnce({ result: "deleted" });

    await searchService.deleteMaterialIndex("MAT-001");

    expect(mockEs.delete).toHaveBeenCalledWith({
      index:   "materials",
      id:      "MAT-001",
      refresh: true,
    });
  });

  it("bỏ qua lỗi 404 khi document không tồn tại trong index", async () => {
    mockEs.delete.mockRejectedValueOnce({ meta: { statusCode: 404 } });

    await expect(searchService.deleteMaterialIndex("MAT-GHOST")).resolves.toBeUndefined();
  });

  it("ném lỗi khi lỗi không phải 404", async () => {
    const err = { meta: { statusCode: 500 }, message: "Internal error" };
    mockEs.delete.mockRejectedValueOnce(err);

    await expect(searchService.deleteMaterialIndex("MAT-001")).rejects.toEqual(err);
  });
});

// =============================================================================
describe("deleteIndex", () => {
  it("xóa index khi tồn tại", async () => {
    mockEs.indices.exists.mockResolvedValueOnce(true);
    mockEs.indices.delete.mockResolvedValueOnce({ acknowledged: true });

    await searchService.deleteIndex();

    expect(mockEs.indices.delete).toHaveBeenCalledWith({ index: "materials" });
  });

  it("không gọi delete khi index chưa tồn tại", async () => {
    mockEs.indices.exists.mockResolvedValueOnce(false);

    await searchService.deleteIndex();

    expect(mockEs.indices.delete).not.toHaveBeenCalled();
  });

  it("ném lỗi khi ES delete thất bại", async () => {
    mockEs.indices.exists.mockResolvedValueOnce(true);
    mockEs.indices.delete.mockRejectedValueOnce(new Error("Delete failed"));

    await expect(searchService.deleteIndex()).rejects.toThrow("Delete failed");
  });
});
