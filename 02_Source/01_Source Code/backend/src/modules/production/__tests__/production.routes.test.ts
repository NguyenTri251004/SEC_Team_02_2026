import request from 'supertest';
import express, { Express } from 'express';
import productionRoutes from '../production.routes';
import * as productionService from '../production.service';

// Mock dependencies
jest.mock('../production.service');
jest.mock('../../../security/auth', () => ({
  authenticateJWT: (req: any, res: any, next: any) => {
    req.user = {
      user_id: 'USR-PROD',
      username: 'production',
      roles: ['production'],
    };
    next();
  },
}));
jest.mock('../../../security/rbac', () => ({
  requirePermission: () => (req: any, res: any, next: any) => next(),
}));

const mockProductionService = productionService as jest.Mocked<typeof productionService>;

describe('Production Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/production', productionRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/production/batches', () => {
    it('should return batches successfully', async () => {
      const mockBatches = [
        {
          batch_id: 'BATCH-001',
          product_id: 'MAT-001',
          batch_number: 'B-2026-001',
          batch_size: 100,
          unit_of_measure: 'kg',
          manufacture_date: '2026-03-06',
          expiration_date: '2027-03-06',
          status: 'Planned' as const,
          created_date: new Date(),
          modified_date: new Date(),
          product_name: 'Paracetamol',
        },
      ];

      mockProductionService.getAllBatches.mockResolvedValueOnce(mockBatches);

      const response = await request(app).get('/api/production/batches');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        batch_id: 'BATCH-001',
        product_id: 'MAT-001',
        batch_number: 'B-2026-001',
        status: 'Planned',
      });
      expect(response.body.total).toBe(1);
    });

    it('should pass validated filters to service', async () => {
      mockProductionService.getAllBatches.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/production/batches')
        .query({
          status: 'Planned',
          product_id: 'MAT-001',
          batch_number: '2026',
        });

      expect(response.status).toBe(200);
      expect(mockProductionService.getAllBatches).toHaveBeenCalledWith({
        status: 'Planned',
        product_id: 'MAT-001',
        batch_number: '2026',
      });
    });

    it('should handle errors', async () => {
      mockProductionService.getAllBatches.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/production/batches');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to fetch production batches');
    });
  });

  describe('GET /api/production/batches/:id', () => {
    it('should return batch detail successfully', async () => {
      const mockBatch = {
        batch_id: 'BATCH-001',
        product_id: 'MAT-001',
        batch_number: 'B-2026-001',
        batch_size: 100,
        unit_of_measure: 'kg',
        manufacture_date: '2026-03-06',
        expiration_date: '2027-03-06',
        status: 'Planned' as const,
        created_date: new Date(),
        modified_date: new Date(),
        product_name: 'Paracetamol',
        components: [],
      };

      mockProductionService.getBatchById.mockResolvedValueOnce(mockBatch);

      const response = await request(app).get('/api/production/batches/BATCH-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        batch_id: 'BATCH-001',
        batch_number: 'B-2026-001',
        status: 'Planned',
      });
    });

    it('should return 404 when batch not found', async () => {
      mockProductionService.getBatchById.mockResolvedValueOnce(null);

      const response = await request(app).get('/api/production/batches/BATCH-999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Production batch not found');
    });

    it('should return 500 when batch detail lookup fails', async () => {
      mockProductionService.getBatchById.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/production/batches/BATCH-001');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch production batch details',
      });
    });
  });

  describe('POST /api/production/batches', () => {
    it('should create batch successfully', async () => {
      const newBatch = {
        batch_id: 'BATCH-002',
        product_id: 'MAT-001',
        batch_number: 'B-2026-002',
        batch_size: 50,
        unit_of_measure: 'kg',
        manufacture_date: '2026-03-06',
        expiration_date: '2027-03-06',
      };

      mockProductionService.createBatch.mockResolvedValueOnce({
        ...newBatch,
        status: 'Planned',
        created_date: new Date(),
        modified_date: new Date(),
        product_name: 'Paracetamol',
        components: [],
      });

      const response = await request(app)
        .post('/api/production/batches')
        .send(newBatch);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        batch_id: newBatch.batch_id,
        product_id: newBatch.product_id,
        batch_number: newBatch.batch_number,
        status: 'Planned',
      });
    });

    it('should return 400 when required fields missing', async () => {
      const response = await request(app)
        .post('/api/production/batches')
        .send({
          product_id: 'MAT-001',
          batch_number: 'B-2026-002',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 409 on duplicate key error', async () => {
      const dbError: any = new Error('Duplicate key');
      dbError.code = '23505';
      mockProductionService.createBatch.mockRejectedValueOnce(dbError);

      const response = await request(app)
        .post('/api/production/batches')
        .send({
          batch_id: 'BATCH-002',
          product_id: 'MAT-001',
          batch_number: 'B-2026-002',
          batch_size: 50,
          unit_of_measure: 'kg',
          manufacture_date: '2026-03-06',
          expiration_date: '2027-03-06',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('batch_id or batch_number already exists');
    });

    it('should return 400 when service throws a validation error', async () => {
      mockProductionService.createBatch.mockRejectedValueOnce(
        new Error('Batch size must be greater than zero')
      );

      const response = await request(app)
        .post('/api/production/batches')
        .send({
          product_id: 'MAT-001',
          batch_number: 'B-2026-002',
          batch_size: 0,
          unit_of_measure: 'kg',
          manufacture_date: '2026-03-06',
          expiration_date: '2027-03-06',
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Batch size must be greater than zero',
      });
    });

    it('should return 500 for non-Error failures', async () => {
      mockProductionService.createBatch.mockRejectedValueOnce('unknown failure' as any);

      const response = await request(app)
        .post('/api/production/batches')
        .send({
          product_id: 'MAT-001',
          batch_number: 'B-2026-002',
          batch_size: 50,
          unit_of_measure: 'kg',
          manufacture_date: '2026-03-06',
          expiration_date: '2027-03-06',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to create production batch',
      });
    });
  });

  describe('PATCH /api/production/batches/:id/status', () => {
    it('should update batch status successfully', async () => {
      mockProductionService.updateBatchStatus.mockResolvedValueOnce({
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
        components: [],
      } as any);

      const response = await request(app)
        .patch('/api/production/batches/BATCH-001/status')
        .send({ status: 'In Progress' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockProductionService.updateBatchStatus).toHaveBeenCalledWith(
        'BATCH-001',
        'In Progress'
      );
    });

    it('should return 400 for invalid status values', async () => {
      const response = await request(app)
        .patch('/api/production/batches/BATCH-001/status')
        .send({ status: 'Started' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid status value',
      });
    });

    it('should return 404 when status update target does not exist', async () => {
      mockProductionService.updateBatchStatus.mockResolvedValueOnce(null);

      const response = await request(app)
        .patch('/api/production/batches/BATCH-404/status')
        .send({ status: 'In Progress' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Production batch not found',
      });
    });

    it('should return 400 when service rejects status update', async () => {
      mockProductionService.updateBatchStatus.mockRejectedValueOnce(
        new Error('Invalid status transition: Planned -> Complete. Allowed: In Progress')
      );

      const response = await request(app)
        .patch('/api/production/batches/BATCH-001/status')
        .send({ status: 'Complete' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 500 for non-Error status update failures', async () => {
      mockProductionService.updateBatchStatus.mockRejectedValueOnce('unknown failure' as any);

      const response = await request(app)
        .patch('/api/production/batches/BATCH-001/status')
        .send({ status: 'In Progress' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to update production batch status',
      });
    });
  });

  describe('POST /api/production/batches/:id/components', () => {
    it('should add component successfully', async () => {
      mockProductionService.addComponent.mockResolvedValueOnce({
        component_id: 'COMP-001',
        batch_id: 'BATCH-001',
        lot_id: 'LOT-001',
        planned_quantity: 10,
        actual_quantity: null,
        unit_of_measure: 'kg',
        addition_date: new Date(),
        added_by: 'USR-PROD',
        created_date: new Date(),
        modified_date: new Date(),
      });

      const response = await request(app)
        .post('/api/production/batches/BATCH-001/components')
        .send({
          lot_id: 'LOT-001',
          planned_quantity: 10,
          unit_of_measure: 'kg',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(mockProductionService.addComponent).toHaveBeenCalledWith('BATCH-001', {
        component_id: undefined,
        lot_id: 'LOT-001',
        planned_quantity: 10,
        unit_of_measure: 'kg',
        added_by: 'production',
      });
    });

    it('should return 400 when required component fields are missing', async () => {
      const response = await request(app)
        .post('/api/production/batches/BATCH-001/components')
        .send({ lot_id: 'LOT-001' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 404 when batch does not exist', async () => {
      mockProductionService.addComponent.mockRejectedValueOnce(
        new Error('Production batch not found')
      );

      const response = await request(app)
        .post('/api/production/batches/BATCH-404/components')
        .send({
          lot_id: 'LOT-001',
          planned_quantity: 10,
          unit_of_measure: 'kg',
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Production batch not found');
    });

    it('should return 400 for component validation errors', async () => {
      mockProductionService.addComponent.mockRejectedValueOnce(
        new Error('Component unit of measure must match the inventory lot unit')
      );

      const response = await request(app)
        .post('/api/production/batches/BATCH-001/components')
        .send({
          lot_id: 'LOT-001',
          planned_quantity: 10,
          unit_of_measure: 'g',
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        'Component unit of measure must match the inventory lot unit'
      );
    });

    it('should return 500 for non-Error component failures', async () => {
      mockProductionService.addComponent.mockRejectedValueOnce('unknown failure' as any);

      const response = await request(app)
        .post('/api/production/batches/BATCH-001/components')
        .send({
          lot_id: 'LOT-001',
          planned_quantity: 10,
          unit_of_measure: 'kg',
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to add batch component',
      });
    });
  });

  describe('GET /api/production/batches/:id/components', () => {
    it('should return components successfully', async () => {
      mockProductionService.getBatchById.mockResolvedValueOnce({
        batch_id: 'BATCH-001',
      } as any);
      mockProductionService.getComponents.mockResolvedValueOnce([
        {
          component_id: 'COMP-001',
          batch_id: 'BATCH-001',
          lot_id: 'LOT-001',
          planned_quantity: 10,
          actual_quantity: 5,
          unit_of_measure: 'kg',
          addition_date: new Date(),
          added_by: 'USR-PROD',
          created_date: new Date(),
          modified_date: new Date(),
        },
      ] as any);

      const response = await request(app).get('/api/production/batches/BATCH-001/components');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(1);
    });

    it('should return 404 when parent batch does not exist', async () => {
      mockProductionService.getBatchById.mockResolvedValueOnce(null);

      const response = await request(app).get('/api/production/batches/BATCH-404/components');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Production batch not found',
      });
    });

    it('should return 500 when component lookup fails', async () => {
      mockProductionService.getBatchById.mockResolvedValueOnce({
        batch_id: 'BATCH-001',
      } as any);
      mockProductionService.getComponents.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/production/batches/BATCH-001/components');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch batch components',
      });
    });
  });

  describe('POST /api/production/batches/:id/components/:componentId/consume', () => {
    it('should return 400 when actual_quantity is missing', async () => {
      const response = await request(app)
        .post('/api/production/batches/BATCH-001/components/COMP-001/consume')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required field: actual_quantity');
    });

    it('should consume material successfully with actual_quantity', async () => {
      mockProductionService.consumeMaterial.mockResolvedValueOnce({
        component_id: 'COMP-001',
        batch_id: 'BATCH-001',
        lot_id: 'LOT-001',
        planned_quantity: 10,
        actual_quantity: 5,
        unit_of_measure: 'kg',
        addition_date: new Date(),
        added_by: 'USR-PROD',
        created_date: new Date(),
        modified_date: new Date(),
      } as any);

      const response = await request(app)
        .post('/api/production/batches/BATCH-001/components/COMP-001/consume')
        .send({ actual_quantity: 5 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockProductionService.consumeMaterial).toHaveBeenCalledWith(
        'BATCH-001',
        'COMP-001',
        5
      );
    });

    it('should also accept actualQuantity (camelCase) for backward compatibility', async () => {
      mockProductionService.consumeMaterial.mockResolvedValueOnce({
        component_id: 'COMP-001',
        batch_id: 'BATCH-001',
        lot_id: 'LOT-001',
        planned_quantity: 10,
        actual_quantity: 7,
        unit_of_measure: 'kg',
        addition_date: new Date(),
        added_by: 'USR-PROD',
        created_date: new Date(),
        modified_date: new Date(),
      } as any);

      const response = await request(app)
        .post('/api/production/batches/BATCH-001/components/COMP-001/consume')
        .send({ actualQuantity: 7 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(mockProductionService.consumeMaterial).toHaveBeenCalledWith(
        'BATCH-001',
        'COMP-001',
        7
      );
    });

    it('should return 404 when component not found', async () => {
      mockProductionService.consumeMaterial.mockRejectedValueOnce(
        new Error('Batch component not found')
      );

      const response = await request(app)
        .post('/api/production/batches/BATCH-001/components/COMP-999/consume')
        .send({ actual_quantity: 3 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Batch component not found');
    });

    it('should return 400 for consume validation errors', async () => {
      mockProductionService.consumeMaterial.mockRejectedValueOnce(
        new Error('Actual quantity must be greater than zero')
      );

      const response = await request(app)
        .post('/api/production/batches/BATCH-001/components/COMP-001/consume')
        .send({ actual_quantity: 0 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Actual quantity must be greater than zero');
    });

    it('should return 500 for non-Error consume failures', async () => {
      mockProductionService.consumeMaterial.mockRejectedValueOnce('unknown failure' as any);

      const response = await request(app)
        .post('/api/production/batches/BATCH-001/components/COMP-001/consume')
        .send({ actual_quantity: 3 });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to consume material',
      });
    });
  });

  describe('GET /api/production/batches/:id/traceability', () => {
    it('should return traceability successfully', async () => {
      mockProductionService.getBatchById.mockResolvedValueOnce({
        batch_id: 'BATCH-001',
      } as any);
      mockProductionService.getTraceability.mockResolvedValueOnce([
        {
          component_id: 'COMP-001',
          lot_id: 'LOT-001',
        },
      ] as any);

      const response = await request(app).get('/api/production/batches/BATCH-001/traceability');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.total).toBe(1);
    });

    it('should return 404 when traceability batch does not exist', async () => {
      mockProductionService.getBatchById.mockResolvedValueOnce(null);

      const response = await request(app).get('/api/production/batches/BATCH-404/traceability');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        error: 'Production batch not found',
      });
    });

    it('should return 500 when traceability lookup fails', async () => {
      mockProductionService.getBatchById.mockResolvedValueOnce({
        batch_id: 'BATCH-001',
      } as any);
      mockProductionService.getTraceability.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/production/batches/BATCH-001/traceability');

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch traceability',
      });
    });
  });
});
