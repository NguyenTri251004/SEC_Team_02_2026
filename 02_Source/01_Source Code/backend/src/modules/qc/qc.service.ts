import { randomUUID } from "crypto";
import pool from "../../shared/db/pool";
import {
  QCTest,
  QCTestType,
  CreateQCTestInput,
  UpdateQCTestInput,
  QCStats,
  QCQueueItem,
  QCResultStatus,
} from "./qc.types";

// Bộ lọc khi lấy danh sách tests
export interface QCTestFilters {
  lot_id?: string;
  test_type?: string;
  result_status?: QCResultStatus;
  performed_by?: string;
  from_date?: string;
  to_date?: string;
}

/**
 * Lấy danh sách tất cả QC tests (có thể lọc), JOIN với lots và materials
 */
export const getAllTests = async (filters: QCTestFilters = {}): Promise<QCTest[]> => {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (filters.lot_id) {
    conditions.push(`qt.lot_id = $${idx++}`);
    params.push(filters.lot_id);
  }
  if (filters.test_type) {
    conditions.push(`qt.test_type = $${idx++}`);
    params.push(filters.test_type);
  }
  if (filters.result_status) {
    conditions.push(`qt.result_status = $${idx++}`);
    params.push(filters.result_status);
  }
  if (filters.performed_by) {
    conditions.push(`qt.performed_by = $${idx++}`);
    params.push(filters.performed_by);
  }
  if (filters.from_date) {
    conditions.push(`qt.test_date >= $${idx++}`);
    params.push(filters.from_date);
  }
  if (filters.to_date) {
    conditions.push(`qt.test_date <= $${idx++}`);
    params.push(filters.to_date);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      qt.*,
      il.manufacturer_lot,
      il.lot_id AS lot_number,
      m.material_name,
      m.material_type
    FROM qc_tests qt
    LEFT JOIN inventory_lots il ON qt.lot_id = il.lot_id
    LEFT JOIN materials m ON il.material_id = m.material_id
    ${where}
    ORDER BY qt.test_date DESC, qt.created_date DESC
  `;

  const result = await pool.query<QCTest>(sql, params);
  return result.rows;
};

/**
 * Lấy chi tiết một QC test theo ID
 */
export const getTestById = async (id: string): Promise<QCTest | null> => {
  const sql = `
    SELECT
      qt.*,
      il.manufacturer_lot,
      il.lot_id AS lot_number,
      il.expiration_date,
      m.material_name,
      m.material_type
    FROM qc_tests qt
    LEFT JOIN inventory_lots il ON qt.lot_id = il.lot_id
    LEFT JOIN materials m ON il.material_id = m.material_id
    WHERE qt.test_id = $1
  `;
  const result = await pool.query<QCTest>(sql, [id]);
  return result.rows[0] ?? null;
};

/**
 * Lấy tất cả QC tests của một lô hàng
 */
export const getTestsByLot = async (lotId: string): Promise<QCTest[]> => {
  const sql = `
    SELECT
      qt.*,
      il.manufacturer_lot,
      il.lot_id AS lot_number,
      m.material_name,
      m.material_type
    FROM qc_tests qt
    LEFT JOIN inventory_lots il ON qt.lot_id = il.lot_id
    LEFT JOIN materials m ON il.material_id = m.material_id
    WHERE qt.lot_id = $1
    ORDER BY qt.test_date DESC
  `;
  const result = await pool.query<QCTest>(sql, [lotId]);
  return result.rows;
};

/**
 * Tạo mới một QC test (result_status mặc định là 'Pending')
 */
export const createTest = async (input: CreateQCTestInput): Promise<QCTest> => {
  // Generate QC-XXX formatted id
  const seqResult = await pool.query<{ max_id: string | null }>(
    `SELECT test_id AS max_id FROM qc_tests
     WHERE test_id ~ '^QC-[0-9]+$'
     ORDER BY LENGTH(test_id) DESC, test_id DESC
     LIMIT 1`
  );
  const lastId = seqResult.rows[0]?.max_id;
  let testId: string;
  if (lastId) {
    const num = parseInt(lastId.replace(/^QC-/, ""), 10);
    testId = `QC-${String(num + 1).padStart(3, "0")}`;
  } else {
    const cnt = await pool.query<{ cnt: string }>(`SELECT COUNT(*) AS cnt FROM qc_tests`);
    testId = `QC-${String(parseInt(cnt.rows[0]?.cnt ?? "0", 10) + 1).padStart(3, "0")}`;
  }
  const testDate = input.test_date ?? new Date().toISOString();

  const sql = `
    INSERT INTO qc_tests (
      test_id, lot_id, test_type, test_method,
      test_date, acceptance_criteria, result_status,
      performed_by, notes
    )
    VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7, $8)
    RETURNING *
  `;

  const result = await pool.query<QCTest>(sql, [
    testId,
    input.lot_id,
    input.test_type,
    input.test_method ?? null,
    testDate,
    input.acceptance_criteria ?? null,
    input.performed_by,
    input.notes ?? null,
  ]);

  return result.rows[0];
};

/**
 * Cập nhật kết quả QC test
 */
export const updateTestResult = async (
  id: string,
  input: UpdateQCTestInput
): Promise<QCTest | null> => {
  const sql = `
    UPDATE qc_tests
    SET test_result   = $1,
        result_status = $2,
        verified_by   = $3,
        modified_date = CURRENT_TIMESTAMP
    WHERE test_id = $4
    RETURNING *
  `;
  const result = await pool.query<QCTest>(sql, [
    input.test_result,
    input.result_status,
    input.verified_by,
    id,
  ]);
  return result.rows[0] ?? null;
};

/**
 * Lấy danh sách các tests đang ở trạng thái 'Pending'
 */
export const getPendingTests = async (): Promise<QCTest[]> => {
  const sql = `
    SELECT
      qt.*,
      il.manufacturer_lot,
      il.lot_id AS lot_number,
      m.material_name,
      m.material_type
    FROM qc_tests qt
    LEFT JOIN inventory_lots il ON qt.lot_id = il.lot_id
    LEFT JOIN materials m ON il.material_id = m.material_id
    WHERE qt.result_status = 'Pending'
    ORDER BY qt.test_date ASC
  `;
  const result = await pool.query<QCTest>(sql);
  return result.rows;
};

/**
 * Thống kê QC: số pending, pass rate 30 ngày, phân loại theo type
 */
export const getQCStats = async (): Promise<QCStats> => {
  const [pendingResult, rateResult, byTypeResult] = await Promise.all([
    // Số lượng pending
    pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM qc_tests WHERE result_status = 'Pending'`
    ),
    // Pass rate trong 30 ngày gần nhất
    pool.query<{ total: string; pass_count: string }>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN result_status = 'Pass' THEN 1 ELSE 0 END) AS pass_count
       FROM qc_tests
       WHERE test_date >= NOW() - INTERVAL '30 days'
         AND result_status <> 'Pending'`
    ),
    // Tests phân loại theo type (30 ngày)
    pool.query<{ test_type: string; count: string; pass_count: string }>(
      `SELECT
         test_type,
         COUNT(*) AS count,
         SUM(CASE WHEN result_status = 'Pass' THEN 1 ELSE 0 END) AS pass_count
       FROM qc_tests
       WHERE test_date >= NOW() - INTERVAL '30 days'
       GROUP BY test_type
       ORDER BY count DESC`
    ),
  ]);

  const pendingCount = parseInt(pendingResult.rows[0]?.count ?? "0", 10);
  const total30d = parseInt(rateResult.rows[0]?.total ?? "0", 10);
  const pass30d = parseInt(rateResult.rows[0]?.pass_count ?? "0", 10);
  const passRate = total30d > 0 ? Math.round((pass30d / total30d) * 100) : 0;

  return {
    pending_count: pendingCount,
    pass_rate_30d: passRate,
    total_tests_30d: total30d,
    tests_by_type: byTypeResult.rows.map((r) => ({
      test_type: r.test_type as QCTestType,
      count: parseInt(r.count, 10),
      pass_count: parseInt(r.pass_count, 10),
    })),
  };
};

/**
 * Lấy hàng đợi QC: các lô đang ở trạng thái Quarantine, JOIN với materials
 */
/**
 * Lấy danh sách các lô đang chờ QC (status = 'Quarantine')
 * với số lượng tests đã thực hiện và số tests đang chờ
 */
export const getQCQueue = async (status?: string): Promise<QCQueueItem[]> => {
  const whereClause = status ? `WHERE il.status = $1` : `WHERE il.status IN ('Quarantine', 'Accepted', 'Rejected')`;
  const params = status ? [status] : [];
  
  const sql = `
    SELECT
      il.lot_id,
      il.lot_id AS lot_number,
      il.manufacturer_lot,
      il.manufacturer_name,
      il.material_id,
      il.status,
      m.material_name,
      m.material_type,
      il.received_date,
      il.expiration_date,
      il.quantity,
      il.unit_of_measure,
      il.storage_location,
      COUNT(qt.test_id) FILTER (WHERE qt.result_status = 'Pending') AS pending_tests,
      COUNT(qt.test_id) AS total_tests
    FROM inventory_lots il
    JOIN materials m ON il.material_id = m.material_id
    LEFT JOIN qc_tests qt ON il.lot_id = qt.lot_id
    ${whereClause}
    GROUP BY
      il.lot_id, il.manufacturer_lot, il.manufacturer_name,
      il.material_id, il.status, m.material_name, m.material_type,
      il.received_date, il.expiration_date, il.quantity,
      il.unit_of_measure, il.storage_location
    ORDER BY il.received_date ASC
  `;
  type QueueRow = Omit<QCQueueItem, "pending_tests" | "total_tests"> & { pending_tests: string; total_tests: string };
  const result = await pool.query<QueueRow>(sql, params);
  return result.rows.map((r) => ({
    ...r,
    pending_tests: parseInt(r.pending_tests, 10),
    total_tests: parseInt(r.total_tests, 10),
  }));
};

/**
 * Phê duyệt lô hàng: tất cả tests phải là Pass -> đổi lot status thành 'Accepted'
 */
export const approveLot = async (
  lotId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  type TestSummaryRow = {
    test_id: string;
    test_type: QCTestType;
    test_date: string;
    result_status: QCResultStatus;
  };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Kiểm tra lô có tồn tại và đang ở trạng thái Quarantine không
    const lotCheck = await client.query<{ status: string }>(
      `SELECT status FROM inventory_lots WHERE lot_id = $1`,
      [lotId]
    );

    if (!lotCheck.rows[0]) {
      await client.query("ROLLBACK");
      return { success: false, message: "Không tìm thấy lô hàng" };
    }

    if (lotCheck.rows[0].status !== "Quarantine") {
      await client.query("ROLLBACK");
      return { success: false, message: `Lô hàng đang ở trạng thái '${lotCheck.rows[0].status}', không thể phê duyệt` };
    }

    // Kiểm tra tất cả tests đều là 'Pass'
    const testCheck = await client.query<{
      total: string;
      pending_count: string;
      fail_count: string;
    }>(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN result_status = 'Pending' THEN 1 ELSE 0 END) AS pending_count,
         SUM(CASE WHEN result_status = 'Fail'    THEN 1 ELSE 0 END) AS fail_count
       FROM qc_tests
       WHERE lot_id = $1`,
      [lotId]
    );

    const { total, pending_count, fail_count } = testCheck.rows[0];
    const totalTests = parseInt(total, 10);
    const pendingTests = parseInt(pending_count, 10);
    const failTests = parseInt(fail_count, 10);

    if (totalTests === 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "Lô hàng chưa có kết quả kiểm tra nào" };
    }

    if (pendingTests > 0) {
      const pendingDetails = await client.query<TestSummaryRow>(
        `SELECT test_id, test_type, test_date::text, result_status
         FROM qc_tests
         WHERE lot_id = $1 AND result_status = 'Pending'
         ORDER BY test_date ASC, test_id ASC`,
        [lotId]
      );

      const pendingList = pendingDetails.rows
        .map((row) => `${row.test_id} (${row.test_type}, ${row.test_date})`)
        .join("; ");

      await client.query("ROLLBACK");
      return {
        success: false,
        message: `Còn ${pendingTests} kiểm tra chưa có kết quả. Không thể phê duyệt. Pending: ${pendingList}`,
      };
    }

    if (failTests > 0) {
      const failedDetails = await client.query<TestSummaryRow>(
        `SELECT test_id, test_type, test_date::text, result_status
         FROM qc_tests
         WHERE lot_id = $1 AND result_status = 'Fail'
         ORDER BY test_date ASC, test_id ASC`,
        [lotId]
      );

      const failedList = failedDetails.rows
        .map((row) => `${row.test_id} (${row.test_type}, ${row.test_date})`)
        .join("; ");

      await client.query("ROLLBACK");
      return {
        success: false,
        message: `Có ${failTests} kiểm tra không đạt. Không thể phê duyệt. Failed: ${failedList}`,
      };
    }

    // Tất cả tests đều Pass -> cập nhật status lot
    await client.query(
      `UPDATE inventory_lots
       SET status = 'Accepted', modified_date = CURRENT_TIMESTAMP
       WHERE lot_id = $1`,
      [lotId]
    );

    // Ghi nhận transaction kiểm tra vào audit (nếu có bảng audit_logs, ở đây log ra console)
    console.log(`[QC] Lot ${lotId} approved by user ${userId} at ${new Date().toISOString()}`);

    await client.query("COMMIT");
    return { success: true, message: "Lô hàng đã được phê duyệt thành công" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Từ chối lô hàng: đổi lot status thành 'Rejected' (reason bắt buộc)
 */
export const rejectLot = async (
  lotId: string,
  userId: string,
  reason: string
): Promise<{ success: boolean; message: string }> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Kiểm tra lô tồn tại
    const lotCheck = await client.query<{ status: string }>(
      `SELECT status FROM inventory_lots WHERE lot_id = $1`,
      [lotId]
    );

    if (!lotCheck.rows[0]) {
      await client.query("ROLLBACK");
      return { success: false, message: "Không tìm thấy lô hàng" };
    }

    const currentStatus = lotCheck.rows[0].status;
    if (currentStatus === "Rejected" || currentStatus === "Depleted") {
      await client.query("ROLLBACK");
      return { success: false, message: `Lô hàng đang ở trạng thái '${currentStatus}', không thể từ chối` };
    }

    // Cập nhật status
    await client.query(
      `UPDATE inventory_lots
       SET status = 'Rejected',
           modified_date = CURRENT_TIMESTAMP
       WHERE lot_id = $1`,
      [lotId]
    );

    console.log(`[QC] Lot ${lotId} rejected by user ${userId}. Reason: ${reason}`);

    await client.query("COMMIT");
    return { success: true, message: "Lô hàng đã bị từ chối" };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
