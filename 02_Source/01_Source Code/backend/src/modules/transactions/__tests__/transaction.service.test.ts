/**
 * Unit tests for Transaction Service
 * Mocks the pg pool so no real DB connection is needed.
 */
import * as transactionService from "../transaction.service";
import pool from "../../../shared/db/pool";
import { CreateTransactionDto, Transaction } from "../transaction.types";

// --- Mock pg pool -----------------------------------------------------------
jest.mock("../../../shared/db/pool", () => ({
  __esModule: true,
  default: {
    query: jest.fn(),
  },
}));

const mockPool = pool as any;

// --- Sample fixtures --------------------------------------------------------
const now = new Date();

const sampleTransaction: Transaction = {
  transaction_id: "txn-001",
  transaction_type: "Receipt",
  lot_id: "lot-001",
  quantity: 100,
  unit_of_measure: "kg",
  reference_id: "ref-001",
  notes: "Initial receipt",
  performed_by: "user-inv",
  transaction_date: new Date("2026-03-01"),
  created_date: now,
};

const sampleTransaction2: Transaction = {
  transaction_id: "txn-002",
  transaction_type: "Usage",
  lot_id: "lot-001",
  quantity: 25,
  unit_of_measure: "kg",
  reference_id: "ref-002",
  notes: "Production usage",
  performed_by: "user-prod",
  transaction_date: new Date("2026-03-02"),
  created_date: now,
};

const sampleTransaction3: Transaction = {
  transaction_id: "txn-003",
  transaction_type: "Transfer",
  lot_id: "lot-002",
  quantity: 50,
  unit_of_measure: "L",
  reference_id: undefined,
  notes: undefined,
  performed_by: undefined,
  transaction_date: new Date("2026-03-03"),
  created_date: now,
};

// --- Setup ------------------------------------------------------------------
beforeEach(() => {
  jest.clearAllMocks();
  mockPool.query.mockReset();
});

// ============================================================================
describe("getAllTransactions", () => {
  it("returns all transactions ordered by transaction_date DESC", async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [sampleTransaction, sampleTransaction2, sampleTransaction3],
    });

    const result = await transactionService.getAllTransactions();

    expect(mockPool.query).toHaveBeenCalledTimes(1);
    const [sql] = mockPool.query.mock.calls[0] as [string];
    expect(sql).toContain("FROM inventory_transactions");
    expect(sql).toContain("ORDER BY transaction_date DESC");
    expect(result).toHaveLength(3);
    expect(result).toEqual([sampleTransaction, sampleTransaction2, sampleTransaction3]);
  });

  it("returns an empty array when no transactions exist", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await transactionService.getAllTransactions();

    expect(result).toEqual([]);
  });

  it("selects the expected columns", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await transactionService.getAllTransactions();

    const [sql] = mockPool.query.mock.calls[0] as [string];
    expect(sql).toContain("transaction_id");
    expect(sql).toContain("transaction_type");
    expect(sql).toContain("lot_id");
    expect(sql).toContain("quantity");
    expect(sql).toContain("unit_of_measure");
    expect(sql).toContain("reference_id");
    expect(sql).toContain("notes");
    expect(sql).toContain("performed_by");
    expect(sql).toContain("transaction_date");
    expect(sql).toContain("created_date");
  });

  it("propagates database errors", async () => {
    mockPool.query.mockRejectedValueOnce(new Error("connection refused"));

    await expect(transactionService.getAllTransactions()).rejects.toThrow(
      "connection refused",
    );
  });
});

// ============================================================================
describe("getTransactionById", () => {
  it("returns the transaction when found", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [sampleTransaction] });

    const result = await transactionService.getTransactionById("txn-001");

    expect(result).toEqual(sampleTransaction);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE transaction_id = $1"),
      ["txn-001"],
    );
  });

  it("returns null when transaction is not found", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await transactionService.getTransactionById("nonexistent");

    expect(result).toBeNull();
  });

  it("passes the id as a parameterized query argument", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await transactionService.getTransactionById("txn-999");

    const [, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual(["txn-999"]);
  });

  it("propagates database errors", async () => {
    mockPool.query.mockRejectedValueOnce(new Error("timeout"));

    await expect(transactionService.getTransactionById("txn-001")).rejects.toThrow(
      "timeout",
    );
  });
});

// ============================================================================
describe("getTransactionsByLot", () => {
  it("returns all transactions for a specific lot", async () => {
    mockPool.query.mockResolvedValueOnce({
      rows: [sampleTransaction, sampleTransaction2],
    });

    const result = await transactionService.getTransactionsByLot("lot-001");

    expect(result).toEqual([sampleTransaction, sampleTransaction2]);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE lot_id = $1"),
      ["lot-001"],
    );
  });

  it("orders results by transaction_date DESC", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    await transactionService.getTransactionsByLot("lot-001");

    const [sql] = mockPool.query.mock.calls[0] as [string];
    expect(sql).toContain("ORDER BY transaction_date DESC");
  });

  it("returns empty array when lot has no transactions", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const result = await transactionService.getTransactionsByLot("lot-no-txns");

    expect(result).toEqual([]);
  });

  it("propagates database errors", async () => {
    mockPool.query.mockRejectedValueOnce(new Error("DB error"));

    await expect(transactionService.getTransactionsByLot("lot-001")).rejects.toThrow(
      "DB error",
    );
  });
});

// ============================================================================
describe("createTransaction", () => {
  const newDto: CreateTransactionDto = {
    transaction_id: "txn-new",
    transaction_type: "Receipt",
    lot_id: "lot-010",
    quantity: 200,
    unit_of_measure: "kg",
    reference_id: "po-100",
    notes: "New shipment",
    performed_by: "user-inv",
  };

  const createdRow: Transaction = {
    ...newDto,
    transaction_id: newDto.transaction_id!,
    transaction_date: new Date("2026-03-09"),
    created_date: now,
  };

  it("inserts a transaction with all fields and returns the created row", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [createdRow] });

    const result = await transactionService.createTransaction(newDto);

    expect(result).toEqual(createdRow);
    expect(mockPool.query).toHaveBeenCalledTimes(1);

    const [sql, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("INSERT INTO inventory_transactions");
    expect(sql).toContain("RETURNING");
    expect(params).toEqual([
      "txn-new",
      "Receipt",
      "lot-010",
      200,
      "kg",
      "po-100",
      "New shipment",
      "user-inv",
    ]);
  });

  it("sets optional fields to null when not provided", async () => {
    const minimalDto: CreateTransactionDto = {
      transaction_id: "txn-min",
      transaction_type: "Adjustment",
      lot_id: "lot-020",
      quantity: 10,
    };

    const minimalRow: Transaction = {
      ...minimalDto,
      transaction_id: minimalDto.transaction_id!,
      unit_of_measure: undefined,
      reference_id: undefined,
      notes: undefined,
      performed_by: undefined,
      transaction_date: new Date("2026-03-09"),
      created_date: now,
    };

    mockPool.query.mockResolvedValueOnce({ rows: [minimalRow] });

    const result = await transactionService.createTransaction(minimalDto);

    expect(result).toEqual(minimalRow);

    const [, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
    // Optional fields should be null
    expect(params[4]).toBeNull(); // unit_of_measure
    expect(params[5]).toBeNull(); // reference_id
    expect(params[6]).toBeNull(); // notes
    expect(params[7]).toBeNull(); // performed_by
  });

  it("supports all transaction types", async () => {
    const types = ["Receipt", "Usage", "Split", "Transfer", "Adjustment", "Disposal"] as const;

    for (const txnType of types) {
      mockPool.query.mockReset();
      const dto: CreateTransactionDto = {
        transaction_id: `txn-${txnType.toLowerCase()}`,
        transaction_type: txnType,
        lot_id: "lot-001",
        quantity: 10,
      };

      const row: Transaction = {
        ...dto,
        transaction_id: dto.transaction_id!,
        transaction_date: now,
        created_date: now,
      };

      mockPool.query.mockResolvedValueOnce({ rows: [row] });

      const result = await transactionService.createTransaction(dto);

      expect(result.transaction_type).toBe(txnType);
      const [, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
      expect(params[1]).toBe(txnType);
    }
  });

  it("passes 8 parameters in the correct order", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [createdRow] });

    await transactionService.createTransaction(newDto);

    const [, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
    expect(params).toHaveLength(8);
    expect(params[0]).toBe(newDto.transaction_id);   // $1
    expect(params[1]).toBe(newDto.transaction_type);  // $2
    expect(params[2]).toBe(newDto.lot_id);            // $3
    expect(params[3]).toBe(newDto.quantity);           // $4
    expect(params[4]).toBe(newDto.unit_of_measure);   // $5
    expect(params[5]).toBe(newDto.reference_id);      // $6
    expect(params[6]).toBe(newDto.notes);             // $7
    expect(params[7]).toBe(newDto.performed_by);      // $8
  });

  it("uses RETURNING clause to get back the inserted row", async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [createdRow] });

    await transactionService.createTransaction(newDto);

    const [sql] = mockPool.query.mock.calls[0] as [string];
    expect(sql).toContain("RETURNING");
    expect(sql).toContain("transaction_id");
    expect(sql).toContain("transaction_date");
    expect(sql).toContain("created_date");
  });

  it("propagates database errors (e.g., unique constraint violation)", async () => {
    mockPool.query.mockRejectedValueOnce(
      new Error("duplicate key value violates unique constraint"),
    );

    await expect(transactionService.createTransaction(newDto)).rejects.toThrow(
      "duplicate key value violates unique constraint",
    );
  });

  it("handles undefined unit_of_measure by passing null", async () => {
    const dto: CreateTransactionDto = {
      transaction_id: "txn-no-uom",
      transaction_type: "Disposal",
      lot_id: "lot-030",
      quantity: 5,
      unit_of_measure: undefined,
      reference_id: "ref-x",
      notes: "disposing",
      performed_by: "user-1",
    };

    mockPool.query.mockResolvedValueOnce({ rows: [{ ...dto, transaction_date: now, created_date: now }] });

    await transactionService.createTransaction(dto);

    const [, params] = mockPool.query.mock.calls[0] as [string, unknown[]];
    expect(params[4]).toBeNull(); // unit_of_measure should be null
    expect(params[5]).toBe("ref-x"); // reference_id should be present
  });
});
