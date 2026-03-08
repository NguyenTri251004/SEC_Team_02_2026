import * as dashboardService from '../dashboard.service';
import pool from '../../../shared/db/pool';

// Mock dependencies
jest.mock('../../../shared/db/pool');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPool = pool as any;

describe('Dashboard Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // getInventorySummary
  // ---------------------------------------------------------------------------
  describe('getInventorySummary', () => {
    it('should return inventory summary grouped by status and material type', async () => {
      // 1st query: lot counts by status
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            { status: 'Accepted', lot_count: '5' },
            { status: 'Quarantine', lot_count: '3' },
          ],
        } as any)
        // 2nd query: quantities by status + unit
        .mockResolvedValueOnce({
          rows: [
            { status: 'Accepted', unit_of_measure: 'kg', total_quantity: '100' },
            { status: 'Accepted', unit_of_measure: 'L', total_quantity: '50' },
            { status: 'Quarantine', unit_of_measure: 'kg', total_quantity: '20' },
          ],
        } as any)
        // 3rd query: quantities by material type
        .mockResolvedValueOnce({
          rows: [
            { material_type: 'Raw Material', unit_of_measure: 'kg', total_quantity: '80' },
            { material_type: 'Packaging', unit_of_measure: 'pcs', total_quantity: '200' },
          ],
        } as any);

      const result = await dashboardService.getInventorySummary();

      expect(mockPool.query).toHaveBeenCalledTimes(3);

      // by_status assertions
      expect(result.by_status).toHaveLength(2);

      const accepted = result.by_status.find((s) => s.status === 'Accepted');
      expect(accepted).toBeDefined();
      expect(accepted!.lot_count).toBe(5);
      expect(accepted!.quantities_by_unit).toEqual([
        { unit_of_measure: 'kg', total_quantity: 100 },
        { unit_of_measure: 'L', total_quantity: 50 },
      ]);

      const quarantine = result.by_status.find((s) => s.status === 'Quarantine');
      expect(quarantine).toBeDefined();
      expect(quarantine!.lot_count).toBe(3);
      expect(quarantine!.quantities_by_unit).toEqual([
        { unit_of_measure: 'kg', total_quantity: 20 },
      ]);

      // by_material_type assertions
      expect(result.by_material_type).toHaveLength(2);
      expect(result.by_material_type).toEqual([
        { material_type: 'Raw Material', unit_of_measure: 'kg', total_quantity: 80 },
        { material_type: 'Packaging', unit_of_measure: 'pcs', total_quantity: 200 },
      ]);
    });

    it('should return empty by_status array when no lots exist', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any)   // no status counts
        .mockResolvedValueOnce({ rows: [] } as any)   // no quantity rows
        .mockResolvedValueOnce({ rows: [] } as any);  // no material type rows

      const result = await dashboardService.getInventorySummary();

      expect(result.by_status).toEqual([]);
      expect(result.by_material_type).toBeUndefined();
    });

    it('should set quantities_by_unit to undefined when a status has no quantity rows', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ status: 'Rejected', lot_count: '2' }],
        } as any)
        // No quantity rows returned at all
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await dashboardService.getInventorySummary();

      expect(result.by_status).toHaveLength(1);
      expect(result.by_status[0].status).toBe('Rejected');
      expect(result.by_status[0].lot_count).toBe(2);
      expect(result.by_status[0].quantities_by_unit).toBeUndefined();
    });

    it('should filter out null material_type rows', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [
            { material_type: null, unit_of_measure: 'kg', total_quantity: '10' },
            { material_type: 'Chemical', unit_of_measure: 'L', total_quantity: '30' },
          ],
        } as any);

      const result = await dashboardService.getInventorySummary();

      expect(result.by_material_type).toHaveLength(1);
      expect(result.by_material_type![0].material_type).toBe('Chemical');
    });

    it('should handle quantity rows for statuses not present in count query', async () => {
      // Count query returns nothing for "Depleted" but quantity query has a row
      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({
          rows: [{ status: 'Depleted', unit_of_measure: 'kg', total_quantity: '5' }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await dashboardService.getInventorySummary();

      // The status should be added with lot_count = 0 (fallback branch)
      expect(result.by_status).toHaveLength(1);
      expect(result.by_status[0].status).toBe('Depleted');
      expect(result.by_status[0].lot_count).toBe(0);
      expect(result.by_status[0].quantities_by_unit).toEqual([
        { unit_of_measure: 'kg', total_quantity: 5 },
      ]);
    });

    it('should propagate non-PG errors from pool.query', async () => {
      const dbError = new Error('Connection lost');
      mockPool.query.mockRejectedValueOnce(dbError);

      await expect(dashboardService.getInventorySummary()).rejects.toThrow('Connection lost');
    });
  });

  // ---------------------------------------------------------------------------
  // getTransactionSummary
  // ---------------------------------------------------------------------------
  describe('getTransactionSummary', () => {
    it('should return today counts and 7-day trend', async () => {
      // 1st call: today summary (goes through queryInventoryTransactions)
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ receipts: '4', issues: '2' }],
        } as any)
        // 2nd call: trend data
        .mockResolvedValueOnce({
          rows: [
            { date: '2026-03-03', receipts: '1', issues: '0' },
            { date: '2026-03-04', receipts: '2', issues: '1' },
            { date: '2026-03-09', receipts: '4', issues: '2' },
          ],
        } as any);

      const result = await dashboardService.getTransactionSummary();

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result.today_receipts).toBe(4);
      expect(result.today_issues).toBe(2);
      expect(result.trend).toHaveLength(3);
      expect(result.trend![0]).toEqual({ date: '2026-03-03', receipts: 1, issues: 0 });
      expect(result.trend![2]).toEqual({ date: '2026-03-09', receipts: 4, issues: 2 });
    });

    it('should default to 0 when today query returns no rows', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] } as any)      // empty today
        .mockResolvedValueOnce({ rows: [] } as any);      // empty trend

      const result = await dashboardService.getTransactionSummary();

      expect(result.today_receipts).toBe(0);
      expect(result.today_issues).toBe(0);
      expect(result.trend).toBeUndefined();
    });

    it('should set trend to undefined when no trend rows exist', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ receipts: '1', issues: '0' }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any); // no trend data

      const result = await dashboardService.getTransactionSummary();

      expect(result.today_receipts).toBe(1);
      expect(result.today_issues).toBe(0);
      expect(result.trend).toBeUndefined();
    });

    it('should handle null receipts/issues from DB gracefully', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ receipts: null, issues: null }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await dashboardService.getTransactionSummary();

      expect(result.today_receipts).toBe(0);
      expect(result.today_issues).toBe(0);
    });

    it('should fall back to legacy "transactions" table on 42P01 error', async () => {
      const undefinedTableError: Error & { code?: string } = new Error('undefined_table');
      undefinedTableError.code = '42P01';

      // First call: today query fails with 42P01, then fallback succeeds
      mockPool.query
        .mockRejectedValueOnce(undefinedTableError)        // today query fails
        .mockResolvedValueOnce({                           // today fallback succeeds
          rows: [{ receipts: '3', issues: '1' }],
        } as any)
        .mockRejectedValueOnce(undefinedTableError)        // trend query fails
        .mockResolvedValueOnce({                           // trend fallback succeeds
          rows: [{ date: '2026-03-09', receipts: '3', issues: '1' }],
        } as any);

      const result = await dashboardService.getTransactionSummary();

      expect(result.today_receipts).toBe(3);
      expect(result.today_issues).toBe(1);
      expect(result.trend).toHaveLength(1);

      // Verify fallback SQL replaces table name and column names
      const fallbackTodaySql = mockPool.query.mock.calls[1][0] as string;
      expect(fallbackTodaySql).not.toContain('inventory_transactions');
      expect(fallbackTodaySql).toContain('transactions');
      expect(fallbackTodaySql).toContain('created_date');
    });

    it('should propagate non-42P01 errors', async () => {
      const otherError: Error & { code?: string } = new Error('permission denied');
      otherError.code = '42501';

      mockPool.query.mockRejectedValueOnce(otherError);

      await expect(dashboardService.getTransactionSummary()).rejects.toThrow('permission denied');
    });

    it('should propagate errors without a code property', async () => {
      const genericError = new Error('unexpected failure');

      mockPool.query.mockRejectedValueOnce(genericError);

      await expect(dashboardService.getTransactionSummary()).rejects.toThrow('unexpected failure');
    });
  });
});
