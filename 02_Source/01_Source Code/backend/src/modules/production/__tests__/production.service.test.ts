import * as productionService from '../production.service';
import pool from '../../../shared/db/pool';

// Mock dependencies
jest.mock('../../../shared/db/pool');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockPool = pool as any;

describe('Production Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.connect = jest.fn();
  });

  describe('getComponents', () => {
    it('should return components for a batch', async () => {
      const mockComponents = [
        {
          component_id: 'COMP-001',
          batch_id: 'BATCH-001',
          lot_id: 'LOT-001',
          planned_quantity: 10,
          actual_quantity: 5,
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
          lot_quantity: 100,
        },
      ];

      mockPool.query.mockResolvedValueOnce({
        rows: mockComponents,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const result = await productionService.getComponents('BATCH-001');

      expect(result).toEqual(mockComponents);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE bc.batch_id = $1'),
        ['BATCH-001']
      );
    });
  });

  describe('getBatchById', () => {
    it('should return null when the batch does not exist', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      const result = await productionService.getBatchById('BATCH-404');

      expect(result).toBeNull();
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
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
    it('should reject when batch size is not positive', async () => {
      await expect(
        productionService.createBatch({
          product_id: 'MAT-001',
          batch_number: 'B-2026-ERR',
          batch_size: 0,
          unit_of_measure: 'kg',
          manufacture_date: '2026-03-06',
          expiration_date: '2027-03-06',
        })
      ).rejects.toThrow('Batch size must be greater than zero');
    });

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

    it('should throw when created batch cannot be loaded', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              batch_id: 'BATCH-001',
            },
          ],
          command: 'INSERT',
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

      await expect(
        productionService.createBatch({
          batch_id: 'BATCH-001',
          product_id: 'MAT-001',
          batch_number: 'B-2026-001',
          batch_size: 100,
          unit_of_measure: 'kg',
          manufacture_date: '2026-03-06',
          expiration_date: '2027-03-06',
        })
      ).rejects.toThrow('Failed to load created batch');
    });
  });

  describe('updateBatchStatus', () => {
    it('should return null when batch is not found', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
          .mockResolvedValueOnce({
            rows: [],
            command: 'SELECT',
            rowCount: 0,
            oid: 0,
            fields: [],
          })
          .mockResolvedValueOnce({ rows: [], command: 'ROLLBACK', rowCount: 0, oid: 0, fields: [] }),
        release: jest.fn(),
      };
      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      const result = await productionService.updateBatchStatus('BATCH-404', 'In Progress');

      expect(result).toBeNull();
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should update the status and return the refreshed batch', async () => {
      const currentBatch = {
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

      const refreshedBatch = {
        ...currentBatch,
        status: 'In Progress',
        product_name: 'Paracetamol',
        components: [],
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
          // SELECT batch FOR UPDATE
          .mockResolvedValueOnce({
            rows: [currentBatch],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          // UPDATE status
          .mockResolvedValueOnce({
            rows: [],
            command: 'UPDATE',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          // COMMIT
          .mockResolvedValueOnce({ rows: [], command: 'COMMIT', rowCount: 0, oid: 0, fields: [] }),
        release: jest.fn(),
      };

      mockPool.connect.mockResolvedValueOnce(mockClient as any);

      // getBatchById calls pool.query (not client)
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ ...refreshedBatch }],
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

      const result = await productionService.updateBatchStatus('BATCH-001', 'In Progress');

      expect(result).toEqual(refreshedBatch);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject invalid status transition', async () => {
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
        productionService.updateBatchStatus('BATCH-001', 'Complete')
      ).rejects.toThrow('Invalid status transition: Planned -> Complete. Allowed: In Progress');

      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('addComponent', () => {
    it('should reject when batch is not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      await expect(
        productionService.addComponent('BATCH-404', {
          lot_id: 'LOT-001',
          planned_quantity: 10,
          unit_of_measure: 'kg',
          added_by: 'USR-001',
        })
      ).rejects.toThrow('Production batch not found');
    });

    it('should reject when batch is complete', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            batch_id: 'BATCH-001',
            status: 'Complete',
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
      ).rejects.toThrow('Cannot add components to a completed or rejected batch');
    });

    it('should reject when lot is not found', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ batch_id: 'BATCH-001', status: 'Planned' }],
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

      await expect(
        productionService.addComponent('BATCH-001', {
          lot_id: 'LOT-404',
          planned_quantity: 10,
          unit_of_measure: 'kg',
          added_by: 'USR-001',
        })
      ).rejects.toThrow('Inventory lot not found');
    });

    it('should reject when lot status is not accepted', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ batch_id: 'BATCH-001', status: 'Planned' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              lot_id: 'LOT-001',
              status: 'Rejected',
              expiration_date: '2099-12-31',
              quantity: 50,
              unit_of_measure: 'kg',
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
      ).rejects.toThrow('Only accepted lots can be added as components');
    });

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

    it('should reject non-positive planned quantity', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ batch_id: 'BATCH-001', status: 'Planned' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              lot_id: 'LOT-001',
              status: 'Accepted',
              expiration_date: '2099-12-31',
              quantity: 50,
              unit_of_measure: 'kg',
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
          planned_quantity: 0,
          unit_of_measure: 'kg',
          added_by: 'USR-001',
        })
      ).rejects.toThrow('Planned quantity must be greater than zero');
    });

    it('should reject planned quantity above available lot quantity', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ batch_id: 'BATCH-001', status: 'Planned' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              lot_id: 'LOT-001',
              status: 'Accepted',
              expiration_date: '2099-12-31',
              quantity: 5,
              unit_of_measure: 'kg',
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
      ).rejects.toThrow('Planned quantity exceeds available lot quantity');
    });

    it('should reject mismatched unit of measure', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ batch_id: 'BATCH-001', status: 'Planned' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              lot_id: 'LOT-001',
              status: 'Accepted',
              expiration_date: '2099-12-31',
              quantity: 50,
              unit_of_measure: 'kg',
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
          unit_of_measure: 'g',
          added_by: 'USR-001',
        })
      ).rejects.toThrow('Component unit of measure must match the inventory lot unit');
    });

    it('should throw when created component cannot be reloaded', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ batch_id: 'BATCH-001', status: 'Planned' }],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            {
              lot_id: 'LOT-001',
              status: 'Accepted',
              expiration_date: '2099-12-31',
              quantity: 50,
              unit_of_measure: 'kg',
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
              component_id: 'COMP-001',
            },
          ],
          command: 'INSERT',
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

      await expect(
        productionService.addComponent('BATCH-001', {
          lot_id: 'LOT-001',
          planned_quantity: 10,
          unit_of_measure: 'kg',
          added_by: 'USR-001',
          component_id: 'COMP-001',
        })
      ).rejects.toThrow('Failed to load created component');
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

    it('should rollback when lot is not accepted', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
          .mockResolvedValueOnce({
            rows: [{ batch_id: 'BATCH-001', batch_number: 'B-2026-001', status: 'In Progress' }],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          .mockResolvedValueOnce({
            rows: [{ component_id: 'COMP-001', lot_id: 'LOT-001', unit_of_measure: 'kg' }],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          .mockResolvedValueOnce({
            rows: [{ lot_id: 'LOT-001', status: 'Rejected', quantity: 10 }],
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
      ).rejects.toThrow('Only accepted lots can be consumed');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should reject non-positive actual quantity', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
          .mockResolvedValueOnce({
            rows: [{ batch_id: 'BATCH-001', batch_number: 'B-2026-001', status: 'In Progress' }],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          .mockResolvedValueOnce({
            rows: [{ component_id: 'COMP-001', lot_id: 'LOT-001', unit_of_measure: 'kg' }],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          .mockResolvedValueOnce({
            rows: [{ lot_id: 'LOT-001', status: 'Accepted', quantity: 10 }],
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
        productionService.consumeMaterial('BATCH-001', 'COMP-001', 0)
      ).rejects.toThrow('Actual quantity must be greater than zero');
    });

    it('should reject actual quantity above lot quantity', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
          .mockResolvedValueOnce({
            rows: [{ batch_id: 'BATCH-001', batch_number: 'B-2026-001', status: 'In Progress' }],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          .mockResolvedValueOnce({
            rows: [{ component_id: 'COMP-001', lot_id: 'LOT-001', unit_of_measure: 'kg' }],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          .mockResolvedValueOnce({
            rows: [{ lot_id: 'LOT-001', status: 'Accepted', quantity: 10 }],
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
        productionService.consumeMaterial('BATCH-001', 'COMP-001', 11)
      ).rejects.toThrow('Actual quantity exceeds available lot quantity');
    });

    it('should throw when updated component cannot be reloaded after commit', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [], command: 'BEGIN', rowCount: 0, oid: 0, fields: [] })
          .mockResolvedValueOnce({
            rows: [{ batch_id: 'BATCH-001', batch_number: 'B-2026-001', status: 'In Progress' }],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          .mockResolvedValueOnce({
            rows: [{ component_id: 'COMP-001', lot_id: 'LOT-001', unit_of_measure: 'kg', added_by: null }],
            command: 'SELECT',
            rowCount: 1,
            oid: 0,
            fields: [],
          })
          .mockResolvedValueOnce({
            rows: [{ lot_id: 'LOT-001', status: 'Accepted', quantity: 10 }],
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
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      await expect(
        productionService.consumeMaterial('BATCH-001', 'COMP-001', 5)
      ).rejects.toThrow('Failed to load updated component');

      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
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
