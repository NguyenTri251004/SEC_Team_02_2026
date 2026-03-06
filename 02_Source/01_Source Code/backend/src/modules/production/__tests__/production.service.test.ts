import * as productionService from '../production.service';
import pool from '../../../shared/db/pool';

// Mock dependencies
jest.mock('../../../shared/db/pool');

const mockPool = pool as jest.Mocked<typeof pool>;

describe('Production Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.connect = jest.fn();
  });

  describe('getAllBatches', () => {
    it('should return all batches', async () => {
      const mockBatches = [
        {
          batch_id: 'BATCH-001',
          product_id: 'MAT-001',
          batch_number: 'B-2026-001',
          batch_size: 100,
          unit_of_measure: 'kg',
          manufacture_date: '2026-03-06',
          expiration_date: '2027-03-06',
          status: 'Planned',
          created_date: new Date(),
          modified_date: new Date(),
          product_name: 'Paracetamol',
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockBatches,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const result = await productionService.getAllBatches();

      expect(result).toEqual(mockBatches);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should filter batches by status, product and batch number', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      await productionService.getAllBatches({
        status: 'Planned',
        product_id: 'MAT-001',
        batch_number: '2026',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE pb.status = $1 AND pb.product_id = $2 AND pb.batch_number ILIKE $3'),
        ['Planned', 'MAT-001', '%2026%']
      );
    });
  });

  describe('createBatch', () => {
    it('should create a batch with Planned status', async () => {
      const createdBatch = {
        batch_id: 'BATCH-001',
        product_id: 'MAT-001',
        batch_number: 'B-2026-001',
        batch_size: 100,
        unit_of_measure: 'kg',
        manufacture_date: '2026-03-06',
        expiration_date: '2027-03-06',
        status: 'Planned',
        created_date: new Date(),
        modified_date: new Date(),
      };

      mockPool.query
        .mockResolvedValueOnce({
          rows: [createdBatch],
          command: 'INSERT',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ ...createdBatch, product_name: 'Paracetamol' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [],
          command: 'SELECT',
          rowCount: 0,
          oid: 0,
          fields: [],
        } as any);

      const result = await productionService.createBatch({
        batch_id: 'BATCH-001',
        product_id: 'MAT-001',
        batch_number: 'B-2026-001',
        batch_size: 100,
        unit_of_measure: 'kg',
        manufacture_date: '2026-03-06',
        expiration_date: '2027-03-06',
      });

      expect(result).toMatchObject({
        batch_id: 'BATCH-001',
        product_id: 'MAT-001',
        batch_number: 'B-2026-001',
        status: 'Planned',
      });
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO production_batches'),
        ['BATCH-001', 'MAT-001', 'B-2026-001', 100, 'kg', '2026-03-06', '2027-03-06']
      );
    });

    it('should reject when expiration date is before manufacture date', async () => {
      await expect(
        productionService.createBatch({
          product_id: 'MAT-001',
          batch_number: 'B-2026-ERR',
          batch_size: 100,
          unit_of_measure: 'kg',
          manufacture_date: '2026-03-06',
          expiration_date: '2026-03-05',
        })
      ).rejects.toThrow('Expiration date must be on or after manufacture date');
    });
  });

  describe('updateBatchStatus', () => {
    it('should reject invalid status transition', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            batch_id: 'BATCH-001',
            product_id: 'MAT-001',
            batch_number: 'B-2026-001',
            batch_size: 100,
            unit_of_measure: 'kg',
            manufacture_date: '2026-03-06',
            expiration_date: '2027-03-06',
            status: 'Planned',
            created_date: new Date(),
            modified_date: new Date(),
          },
        ],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      await expect(
        productionService.updateBatchStatus('BATCH-001', 'Complete')
      ).rejects.toThrow('Invalid status transition: Planned -> Complete. Allowed: In Progress');
    });
  });

  describe('addComponent', () => {
    it('should reject expired lots before insert', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              batch_id: 'BATCH-001',
              product_id: 'MAT-001',
              batch_number: 'B-2026-001',
              batch_size: 100,
              unit_of_measure: 'kg',
              manufacture_date: '2026-03-06',
              expiration_date: '2027-03-06',
              status: 'Planned',
              created_date: new Date(),
              modified_date: new Date(),
            },
          ],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              lot_id: 'LOT-001',
              material_id: 'MAT-002',
              expiration_date: '2020-01-01',
              status: 'Accepted',
              quantity: 200,
              unit_of_measure: 'kg',
              manufacturer_lot: 'MFG-LOT-1',
              supplier_name: 'Supplier A',
              material_name: 'MCC',
            },
          ],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any);

      await expect(
        productionService.addComponent('BATCH-001', {
          lot_id: 'LOT-001',
          planned_quantity: 10,
          unit_of_measure: 'kg',
          added_by: 'USR-001',
        })
      ).rejects.toThrow('Cannot add an expired lot as a batch component');
    });
  });

  describe('consumeMaterial', () => {
    it('should create usage transaction and deplete lot when quantity reaches zero', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
          .mockResolvedValueOnce({
            rows: [
              {
                batch_id: 'BATCH-001',
                product_id: 'MAT-001',
                batch_number: 'B-2026-001',
                batch_size: 100,
                unit_of_measure: 'kg',
                manufacture_date: '2026-03-06',
                expiration_date: '2027-03-06',
                status: 'In Progress',
                created_date: new Date(),
                modified_date: new Date(),
              },
            ],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                component_id: 'COMP-001',
                batch_id: 'BATCH-001',
                lot_id: 'LOT-001',
                planned_quantity: 10,
                actual_quantity: null,
                unit_of_measure: 'kg',
                addition_date: new Date(),
                added_by: 'USR-001',
                created_date: new Date(),
                modified_date: new Date(),
                material_id: 'MAT-002',
                material_name: 'MCC',
                manufacturer_lot: 'MFG-LOT-1',
                lot_status: 'Accepted',
                lot_expiration_date: '2026-12-31',
                lot_quantity: 10,
              },
            ],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          .mockResolvedValueOnce({
            rows: [
              {
                lot_id: 'LOT-001',
                material_id: 'MAT-002',
                expiration_date: '2026-12-31',
                status: 'Accepted',
                quantity: 10,
                unit_of_measure: 'kg',
                manufacturer_lot: 'MFG-LOT-1',
                supplier_name: 'Supplier A',
                material_name: 'MCC',
              },
            ],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          .mockResolvedValueOnce({ rows: [], command: 'UPDATE', rowCount: 1, oid: 0, fields: [] })
          .mockResolvedValueOnce({ rows: [], command: 'UPDATE', rowCount: 1, oid: 0, fields: [] })
          .mockResolvedValueOnce({ rows: [], command: 'INSERT', rowCount: 1, oid: 0, fields: [] })
          .mockResolvedValueOnce({ rows: [], command: 'COMMIT', rowCount: 0, oid: 0, fields: [] }),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            component_id: 'COMP-001',
            batch_id: 'BATCH-001',
            lot_id: 'LOT-001',
            planned_quantity: 10,
            actual_quantity: 10,
            unit_of_measure: 'kg',
            addition_date: new Date(),
            added_by: 'USR-001',
            created_date: new Date(),
            modified_date: new Date(),
            material_id: 'MAT-002',
            material_name: 'MCC',
            manufacturer_lot: 'MFG-LOT-1',
            lot_status: 'Depleted',
            lot_expiration_date: '2026-12-31',
            lot_quantity: 0,
          },
        ],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const result = await productionService.consumeMaterial('BATCH-001', 'COMP-001', 10);

      expect(result.actual_quantity).toBe(10);
      expect(result.lot_status).toBe('Depleted');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should rollback and release when batch status is invalid', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
          .mockResolvedValueOnce({
            rows: [
              {
                batch_id: 'BATCH-001',
                product_id: 'MAT-001',
                batch_number: 'B-2026-001',
                batch_size: 100,
                unit_of_measure: 'kg',
                manufacture_date: '2026-03-06',
                expiration_date: '2027-03-06',
                status: 'Planned',
                created_date: new Date(),
                modified_date: new Date(),
              },
            ],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          .mockResolvedValueOnce({ rows: [], command: 'ROLLBACK', rowCount: 0, oid: 0, fields: [] }),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      await expect(
        productionService.consumeMaterial('BATCH-001', 'COMP-001', 5)
      ).rejects.toThrow('Materials can only be consumed when the batch is In Progress');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('getTraceability', () => {
    it('should return traceability items', async () => {
      const mockTraceability = [
        {
          component_id: 'COMP-001',
          lot_id: 'LOT-001',
          planned_quantity: 10,
          actual_quantity: 8,
          unit_of_measure: 'kg',
          addition_date: new Date(),
          material_id: 'MAT-002',
          material_name: 'MCC',
          manufacturer_lot: 'MFG-LOT-1',
          supplier_name: 'Supplier A',
          expiration_date: '2026-12-31',
          lot_status: 'Accepted',
          transaction_id: 'TXN-001',
          transaction_quantity: -8,
          transaction_date: new Date(),
          reference_id: 'BATCH-001',
          notes: 'Consumed for production batch',
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockTraceability,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const result = await productionService.getTraceability('BATCH-001');

      expect(result).toEqual(mockTraceability);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN inventory_transactions'),
        ['BATCH-001']
      );
    });
  });
});
