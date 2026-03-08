/**
 * Unit tests for QC Service
 * Mocks the pg pool so no real DB connection is needed.
 */
import * as qcService from "../qc.service";
import pool from "../../../shared/db/pool";

// ─── Mock pg pool ───────────────────────────────────────────────────────────
jest.mock("../../../shared/db/pool", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

// Typed helpers
const mockQuery = (pool as unknown as { query: jest.Mock }).query;
const mockConnect = (pool as unknown as { connect: jest.Mock }).connect;

// Reusable mock DB client (for transactional functions)
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

// ─── Sample fixtures ─────────────────────────────────────────────────────────
const sampleTest = {
  test_id: "test-001",
  lot_id: "lot-001",
  test_type: "Identity",
  result_status: "Pending",
  performed_by: "user-qc",
  test_date: new Date("2026-03-01"),
  created_date: new Date(),
  modified_date: new Date(),
  manufacturer_lot: "MFG-001",
  material_name: "Aspirin API",
  material_type: "API",
};

// ─── Setup ───────────────────────────────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockQuery.mockReset();
  mockConnect.mockResolvedValue(mockClient);
  mockClient.query.mockReset();
  mockClient.release.mockReset();
});

// ═════════════════════════════════════════════════════════════════════════════
describe("getAllTests", () => {
  it("returns all tests when called without filters", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleTest] });

    const result = await qcService.getAllTests();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [sql] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toContain("WHERE");
    expect(result).toEqual([sampleTest]);
  });

  it("adds WHERE clause when lot_id filter is provided", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleTest] });

    await qcService.getAllTests({ lot_id: "lot-001" });

    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("WHERE");
    expect(sql).toContain("qt.lot_id =");
    expect(params).toContain("lot-001");
  });

  it("adds WHERE clause when result_status filter is provided", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await qcService.getAllTests({ result_status: "Pending" });

    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("qt.result_status =");
    expect(params).toContain("Pending");
  });

  it("supports multiple filters combined", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await qcService.getAllTests({
      lot_id: "lot-001",
      test_type: "Identity",
      result_status: "Pass",
    });

    const [sql, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toHaveLength(3);
    expect(params).toContain("lot-001");
    expect(params).toContain("Identity");
    expect(params).toContain("Pass");
  });

  it("supports date range filters", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await qcService.getAllTests({
      from_date: "2026-01-01",
      to_date: "2026-12-31",
    });

    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toContain("2026-01-01");
    expect(params).toContain("2026-12-31");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("getTestById", () => {
  it("returns the test when found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleTest] });

    const result = await qcService.getTestById("test-001");

    expect(result).toEqual(sampleTest);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE qt.test_id = $1"),
      ["test-001"],
    );
  });

  it("returns null when test is not found", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await qcService.getTestById("nonexistent");

    expect(result).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("getTestsByLot", () => {
  it("returns all tests for a specific lot", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [sampleTest] });

    const result = await qcService.getTestsByLot("lot-001");

    expect(result).toEqual([sampleTest]);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("WHERE qt.lot_id = $1"),
      ["lot-001"],
    );
  });

  it("returns empty array when lot has no tests", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await qcService.getTestsByLot("lot-no-tests");

    expect(result).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("createTest", () => {
  const newTestRow = { ...sampleTest, result_status: "Pending" };

  it("creates a test and returns the row", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [newTestRow] });

    const result = await qcService.createTest({
      lot_id: "lot-001",
      test_type: "Identity",
      performed_by: "user-qc",
    });

    expect(result).toEqual(newTestRow);
    expect(result.result_status).toBe("Pending");
  });

  it("hardcodes result_status to Pending in the INSERT", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [newTestRow] });

    await qcService.createTest({
      lot_id: "lot-001",
      test_type: "Potency",
      performed_by: "user-qc",
    });

    const [sql] = mockQuery.mock.calls[0] as [string, unknown[]];
    // The INSERT must hardcode 'Pending' — not use a parameter for result_status
    expect(sql).toContain("'Pending'");
  });

  it("uses today's date when test_date is not provided", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [newTestRow] });
    const before = new Date().toISOString().slice(0, 10);

    await qcService.createTest({
      lot_id: "lot-001",
      test_type: "Microbial",
      performed_by: "user-qc",
    });

    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    // The 5th param (index 4) is test_date
    const testDate = (params[4] as string).slice(0, 10);
    expect(testDate).toBe(before);
  });

  it("accepts optional fields (test_method, acceptance_criteria, notes)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [newTestRow] });

    await qcService.createTest({
      lot_id: "lot-001",
      test_type: "Chemical",
      performed_by: "user-qc",
      test_method: "HPLC",
      acceptance_criteria: ">99% purity",
      notes: "Batch re-test",
    });

    const [, params] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(params).toContain("HPLC");
    expect(params).toContain(">99% purity");
    expect(params).toContain("Batch re-test");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("updateTestResult", () => {
  const updatedTest = {
    ...sampleTest,
    result_status: "Pass",
    test_result: "Conforms",
    verified_by: "supervisor",
  };

  it("updates test result and returns updated row", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [updatedTest] });

    const result = await qcService.updateTestResult("test-001", {
      test_result: "Conforms",
      result_status: "Pass",
      verified_by: "supervisor",
    });

    expect(result).toEqual(updatedTest);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE qc_tests"),
      expect.arrayContaining(["Conforms", "Pass", "supervisor", "test-001"]),
    );
  });

  it("returns null when test does not exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await qcService.updateTestResult("nonexistent", {
      test_result: "Conforms",
      result_status: "Pass",
      verified_by: "supervisor",
    });

    expect(result).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("getPendingTests", () => {
  it("returns only pending tests", async () => {
    const pendingTest = { ...sampleTest, result_status: "Pending" };
    mockQuery.mockResolvedValueOnce({ rows: [pendingTest] });

    const result = await qcService.getPendingTests();

    expect(result).toEqual([pendingTest]);
    const [sql] = mockQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("result_status = 'Pending'");
  });

  it("returns empty array when no pending tests", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await qcService.getPendingTests();

    expect(result).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("getQCStats", () => {
  it("calculates pass_rate correctly from 30-day data", async () => {
    // Promise.all fires 3 queries
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "5" }] }) // pending count
      .mockResolvedValueOnce({ rows: [{ total: "20", pass_count: "16" }] }) // rate
      .mockResolvedValueOnce({
        rows: [{ test_type: "Identity", count: "10", pass_count: "8" }],
      }); // by type

    const stats = await qcService.getQCStats();

    expect(stats.pending_count).toBe(5);
    expect(stats.total_tests_30d).toBe(20);
    expect(stats.pass_rate_30d).toBe(80); // 16/20 * 100
    expect(stats.tests_by_type).toHaveLength(1);
    expect(stats.tests_by_type[0]).toMatchObject({
      test_type: "Identity",
      count: 10,
      pass_count: 8,
    });
  });

  it("returns 0% pass rate when total tests is zero (no division by zero)", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "0" }] })
      .mockResolvedValueOnce({ rows: [{ total: "0", pass_count: "0" }] })
      .mockResolvedValueOnce({ rows: [] });

    const stats = await qcService.getQCStats();

    expect(stats.pass_rate_30d).toBe(0);
    expect(stats.pending_count).toBe(0);
    expect(stats.tests_by_type).toEqual([]);
  });

  it("rounds pass_rate to nearest integer", async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: "0" }] })
      .mockResolvedValueOnce({ rows: [{ total: "3", pass_count: "2" }] }) // 66.67%
      .mockResolvedValueOnce({ rows: [] });

    const stats = await qcService.getQCStats();

    expect(stats.pass_rate_30d).toBe(67); // rounds up
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("getQCQueue", () => {
  it("returns quarantine lots with parsed numeric fields", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          lot_id: "lot-001",
          manufacturer_lot: "MFG-001",
          material_name: "Aspirin",
          material_type: "API",
          quantity: 100,
          pending_tests: "2", // DB returns string
          total_tests: "3", // DB returns string
        },
      ],
    });

    const result = await qcService.getQCQueue();

    expect(result).toHaveLength(1);
    expect(result[0].pending_tests).toBe(2); // parsed to number
    expect(result[0].total_tests).toBe(3); // parsed to number
    expect(typeof result[0].pending_tests).toBe("number");
  });

  it("returns empty array when no lots in quarantine", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const result = await qcService.getQCQueue();

    expect(result).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("approveLot", () => {
  // Helper: set up the mock client call sequence
  const setupClientCalls = (responses: object[]) => {
    mockClient.query.mockReset();
    responses.forEach((r) => mockClient.query.mockResolvedValueOnce(r));
  };

  it("returns error when lot is not found", async () => {
    setupClientCalls([
      { rows: [] }, // BEGIN
      { rows: [] }, // SELECT status → empty
      { rows: [] }, // ROLLBACK
    ]);

    const result = await qcService.approveLot("no-lot", "user-1");

    expect(result.success).toBe(false);
    expect(result.message).toContain("Không tìm thấy");
  });

  it("returns error when lot is not in Quarantine status", async () => {
    setupClientCalls([
      { rows: [] }, // BEGIN
      { rows: [{ status: "Accepted" }] }, // SELECT status
      { rows: [] }, // ROLLBACK
    ]);

    const result = await qcService.approveLot("lot-001", "user-1");

    expect(result.success).toBe(false);
    expect(result.message).toContain("Accepted");
  });

  it("returns error when lot has no QC tests at all", async () => {
    setupClientCalls([
      { rows: [] }, // BEGIN
      { rows: [{ status: "Quarantine" }] }, // SELECT status
      { rows: [{ total: "0", pending_count: "0", fail_count: "0" }] }, // test count
      { rows: [] }, // ROLLBACK
    ]);

    const result = await qcService.approveLot("lot-001", "user-1");

    expect(result.success).toBe(false);
    expect(result.message).toContain("chưa có kết quả kiểm tra");
  });

  it("returns error when some tests are still Pending", async () => {
    setupClientCalls([
      { rows: [] }, // BEGIN
      { rows: [{ status: "Quarantine" }] }, // SELECT status
      { rows: [{ total: "3", pending_count: "1", fail_count: "0" }] }, // 1 pending
      { rows: [] }, // ROLLBACK
    ]);

    const result = await qcService.approveLot("lot-001", "user-1");

    expect(result.success).toBe(false);
    expect(result.message).toContain("1 kiểm tra chưa có kết quả");
  });

  it("returns error when some tests failed", async () => {
    setupClientCalls([
      { rows: [] }, // BEGIN
      { rows: [{ status: "Quarantine" }] }, // SELECT status
      { rows: [{ total: "3", pending_count: "0", fail_count: "2" }] }, // 2 fail
      { rows: [] }, // ROLLBACK
    ]);

    const result = await qcService.approveLot("lot-001", "user-1");

    expect(result.success).toBe(false);
    expect(result.message).toContain("2 kiểm tra không đạt");
  });

  it("approves successfully when all tests pass", async () => {
    setupClientCalls([
      { rows: [] }, // BEGIN
      { rows: [{ status: "Quarantine" }] }, // SELECT status
      { rows: [{ total: "2", pending_count: "0", fail_count: "0" }] }, // all pass
      { rows: [] }, // UPDATE
      { rows: [] }, // COMMIT
    ]);

    const result = await qcService.approveLot("lot-001", "user-qc");

    expect(result.success).toBe(true);
    expect(result.message).toContain("phê duyệt thành công");
    // Verify COMMIT was called (not ROLLBACK)
    const queries: string[] = mockClient.query.mock.calls.map(
      (c: unknown[]) => c[0] as string,
    );
    expect(queries).toContain("COMMIT");
    expect(queries).not.toContain("ROLLBACK");
  });

  it("calls client.release() even when error occurs", async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockRejectedValueOnce(new Error("DB error")); // SELECT → throws

    await expect(qcService.approveLot("lot-001", "user-1")).rejects.toThrow(
      "DB error",
    );

    expect(mockClient.release).toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
describe("rejectLot", () => {
  const setupClientCalls = (responses: object[]) => {
    mockClient.query.mockReset();
    responses.forEach((r) => mockClient.query.mockResolvedValueOnce(r));
  };

  it("returns error when lot is not found", async () => {
    setupClientCalls([
      { rows: [] }, // BEGIN
      { rows: [] }, // SELECT status → not found
      { rows: [] }, // ROLLBACK
    ]);

    const result = await qcService.rejectLot(
      "no-lot",
      "user-1",
      "Failed tests",
    );

    expect(result.success).toBe(false);
    expect(result.message).toContain("Không tìm thấy");
  });

  it("returns error when lot is already Rejected", async () => {
    setupClientCalls([
      { rows: [] },
      { rows: [{ status: "Rejected" }] },
      { rows: [] }, // ROLLBACK
    ]);

    const result = await qcService.rejectLot("lot-001", "user-1", "reason");

    expect(result.success).toBe(false);
    expect(result.message).toContain("Rejected");
  });

  it("returns error when lot is Depleted", async () => {
    setupClientCalls([
      { rows: [] },
      { rows: [{ status: "Depleted" }] },
      { rows: [] },
    ]);

    const result = await qcService.rejectLot("lot-001", "user-1", "reason");

    expect(result.success).toBe(false);
    expect(result.message).toContain("Depleted");
  });

  it("rejects a Quarantine lot successfully", async () => {
    setupClientCalls([
      { rows: [] }, // BEGIN
      { rows: [{ status: "Quarantine" }] }, // SELECT status
      { rows: [] }, // UPDATE
      { rows: [] }, // COMMIT
    ]);

    const result = await qcService.rejectLot(
      "lot-001",
      "user-qc",
      "Identity test failed",
    );

    expect(result.success).toBe(true);
    expect(result.message).toContain("từ chối");
    // Verify the UPDATE sets status to 'Rejected'
    const updateCall = mockClient.query.mock.calls.find((c: unknown[]) =>
      (c[0] as string).includes("status = 'Rejected'"),
    ) as unknown[];
    expect(updateCall).toBeDefined();
    // The lot_id should be passed as parameter
    expect(updateCall[1]).toContain("lot-001");
  });

  it("can also reject an Accepted lot", async () => {
    setupClientCalls([
      { rows: [] },
      { rows: [{ status: "Accepted" }] },
      { rows: [] },
      { rows: [] },
    ]);

    const result = await qcService.rejectLot("lot-001", "user-qc", "Recall");

    expect(result.success).toBe(true);
  });

  it("calls client.release() on error", async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error("DB fail"));

    await expect(
      qcService.rejectLot("lot-001", "user-1", "reason"),
    ).rejects.toThrow("DB fail");

    expect(mockClient.release).toHaveBeenCalled();
  });
});
