import request from 'supertest';
import express, { Express } from 'express';
import adminRoutes from '../admin.routes';
import * as adminService from '../admin.service';
import { UserRole } from '../admin.types';

// Mock dependencies
jest.mock('../admin.service');
jest.mock('../../../security/auth', () => ({
  authenticateJWT: (req: any, res: any, next: any) => {
    req.user = {
      user_id: 'USR-ADMIN',
      username: 'admin',
      roles: ['admin'],
    };
    next();
  },
}));
jest.mock('../../../security/rbac', () => ({
  adminOnly: (req: any, res: any, next: any) => next(),
}));

const mockAdminService = adminService as jest.Mocked<typeof adminService>;

describe('Admin Routes', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRoutes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/users', () => {
    it('should return all users successfully', async () => {
      const mockUsers = [
        {
          user_id: 'USR-001',
          username: 'admin',
          email: 'admin@test.com',
          role: UserRole.ADMIN,
          is_active: true,
          last_login: null,
          created_date: new Date(),
          modified_date: new Date(),
        },
        {
          user_id: 'USR-002',
          username: 'manager',
          email: 'manager@test.com',
          role: UserRole.INVENTORY_MANAGER,
          is_active: true,
          last_login: null,
          created_date: new Date(),
          modified_date: new Date(),
        },
      ];

      mockAdminService.getAllUsers.mockResolvedValueOnce(mockUsers);

      const response = await request(app).get('/api/admin/users');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUsers);
      expect(response.body.total).toBe(2);
    });

    it('should filter users by role', async () => {
      const mockUsers = [
        {
          user_id: 'USR-001',
          username: 'admin',
          email: 'admin@test.com',
          role: UserRole.ADMIN,
          is_active: true,
          last_login: null,
          created_date: new Date(),
          modified_date: new Date(),
        },
      ];

      mockAdminService.getAllUsers.mockResolvedValueOnce(mockUsers);

      const response = await request(app)
        .get('/api/admin/users')
        .query({ role: 'Admin' });

      expect(response.status).toBe(200);
      expect(mockAdminService.getAllUsers).toHaveBeenCalledWith({
        role: 'Admin',
        is_active: undefined,
        search: undefined,
      });
    });

    it('should filter users by active status', async () => {
      mockAdminService.getAllUsers.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/admin/users')
        .query({ is_active: 'true' });

      expect(response.status).toBe(200);
      expect(mockAdminService.getAllUsers).toHaveBeenCalledWith({
        role: undefined,
        is_active: true,
        search: undefined,
      });
    });

    it('should filter users by search term', async () => {
      mockAdminService.getAllUsers.mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/admin/users')
        .query({ search: 'admin' });

      expect(response.status).toBe(200);
      expect(mockAdminService.getAllUsers).toHaveBeenCalledWith({
        role: undefined,
        is_active: undefined,
        search: 'admin',
      });
    });

    it('should handle errors', async () => {
      mockAdminService.getAllUsers.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/admin/users');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Không thể lấy danh sách users');
    });
  });

  describe('GET /api/admin/users/:id', () => {
    it('should return user detail successfully', async () => {
      const mockUser = {
        user_id: 'USR-001',
        username: 'admin',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        is_active: true,
        last_login: null,
        created_date: new Date(),
        modified_date: new Date(),
      };

      mockAdminService.getUserById.mockResolvedValueOnce(mockUser);

      const response = await request(app).get('/api/admin/users/USR-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUser);
    });

    it('should return 404 when user not found', async () => {
      mockAdminService.getUserById.mockResolvedValueOnce(null);

      const response = await request(app).get('/api/admin/users/USR-999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Không tìm thấy user');
    });

    it('should handle errors', async () => {
      mockAdminService.getUserById.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/admin/users/USR-001');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/admin/users', () => {
    it('should create user successfully', async () => {
      const newUser = {
        user_id: 'USR-003',
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'password123',
        role: UserRole.VIEWER,
        is_active: true,
      };

      const createdUser = {
        ...newUser,
        last_login: null,
        created_date: new Date(),
        modified_date: new Date(),
      };

      mockAdminService.createUser.mockResolvedValueOnce(createdUser as any);

      const response = await request(app)
        .post('/api/admin/users')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        user_id: newUser.user_id,
        username: newUser.username,
        email: newUser.email,
      });
      expect(response.body.message).toBe('Tạo user thành công');
    });

    it('should return 400 when required fields missing', async () => {
      const incompleteUser = {
        username: 'newuser',
        email: 'newuser@test.com',
        // Missing user_id, password, role
      };

      const response = await request(app)
        .post('/api/admin/users')
        .send(incompleteUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Thiếu thông tin bắt buộc');
    });

    it('should return 400 when email is invalid', async () => {
      const invalidUser = {
        user_id: 'USR-003',
        username: 'newuser',
        email: 'invalidemail',
        password: 'password123',
        role: UserRole.VIEWER,
      };

      const response = await request(app)
        .post('/api/admin/users')
        .send(invalidUser);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email không hợp lệ');
    });

    it('should return 409 when username or email already exists', async () => {
      const duplicateUser = {
        user_id: 'USR-003',
        username: 'admin',
        email: 'admin@test.com',
        password: 'password123',
        role: UserRole.VIEWER,
      };

      const dbError: any = new Error('Duplicate key');
      dbError.code = '23505';
      mockAdminService.createUser.mockRejectedValueOnce(dbError);

      const response = await request(app)
        .post('/api/admin/users')
        .send(duplicateUser);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Username hoặc email đã tồn tại');
    });

    it('should handle other errors', async () => {
      const newUser = {
        user_id: 'USR-003',
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'password123',
        role: UserRole.VIEWER,
      };

      mockAdminService.createUser.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/admin/users')
        .send(newUser);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Không thể tạo user');
    });
  });

  describe('PUT /api/admin/users/:id', () => {
    it('should update user successfully', async () => {
      const updateData = {
        username: 'updatedname',
        email: 'updated@test.com',
        role: UserRole.INVENTORY_MANAGER,
      };

      const updatedUser = {
        user_id: 'USR-001',
        ...updateData,
        is_active: true,
        last_login: null,
        created_date: new Date(),
        modified_date: new Date(),
      };

      mockAdminService.updateUser.mockResolvedValueOnce(updatedUser);

      const response = await request(app)
        .put('/api/admin/users/USR-001')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(updateData);
      expect(response.body.message).toBe('Cập nhật user thành công');
    });

    it('should return 404 when user not found', async () => {
      mockAdminService.updateUser.mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/admin/users/USR-999')
        .send({ username: 'test' });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Không tìm thấy user');
    });

    it('should return 400 when email is invalid', async () => {
      const response = await request(app)
        .put('/api/admin/users/USR-001')
        .send({ email: 'invalidemail' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Email không hợp lệ');
    });

    it('should return 409 on duplicate key error', async () => {
      const dbError: any = new Error('Duplicate key');
      dbError.code = '23505';
      mockAdminService.updateUser.mockRejectedValueOnce(dbError);

      const response = await request(app)
        .put('/api/admin/users/USR-001')
        .send({ username: 'admin' });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Username hoặc email đã tồn tại');
    });
  });

  describe('PATCH /api/admin/users/:id/toggle-active', () => {
    it('should toggle user active status successfully', async () => {
      const toggledUser = {
        user_id: 'USR-001',
        username: 'admin',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        is_active: false, // Toggled to inactive
        last_login: null,
        created_date: new Date(),
        modified_date: new Date(),
      };

      mockAdminService.toggleUserActive.mockResolvedValueOnce(toggledUser);

      const response = await request(app).patch('/api/admin/users/USR-001/toggle-active');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.is_active).toBe(false);
      expect(response.body.message).toBe('Đã khóa tài khoản');
    });

    it('should return correct message when activating user', async () => {
      const toggledUser = {
        user_id: 'USR-001',
        username: 'admin',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        is_active: true, // Toggled to active
        last_login: null,
        created_date: new Date(),
        modified_date: new Date(),
      };

      mockAdminService.toggleUserActive.mockResolvedValueOnce(toggledUser);

      const response = await request(app).patch('/api/admin/users/USR-001/toggle-active');

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Đã mở khóa tài khoản');
    });

    it('should return 404 when user not found', async () => {
      mockAdminService.toggleUserActive.mockResolvedValueOnce(null);

      const response = await request(app).patch('/api/admin/users/USR-999/toggle-active');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Không tìm thấy user');
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return admin statistics successfully', async () => {
      const mockStats = {
        totalUsers: 5,
        activeUsers: 4,
        usersByRole: {
          Admin: 1,
          InventoryManager: 2,
          QualityControl: 0,
          Production: 0,
          Viewer: 2,
        },
        totalLots: 10,
        quarantineLots: 3,
        todayTransactions: 5,
      };

      mockAdminService.getAdminStats.mockResolvedValueOnce(mockStats);

      const response = await request(app).get('/api/admin/stats');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should handle errors', async () => {
      mockAdminService.getAdminStats.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/admin/stats');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });
});
