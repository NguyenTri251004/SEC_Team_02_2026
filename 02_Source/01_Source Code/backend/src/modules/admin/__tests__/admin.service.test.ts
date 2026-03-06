import * as adminService from '../admin.service';
import pool from '../../../shared/db/pool';
import redisClient from '../../../shared/cache/redis';
import { CreateUserInput, UpdateUserInput, UserRole } from '../admin.types';

// Mock dependencies
jest.mock('../../../shared/db/pool');
jest.mock('../../../shared/cache/redis');

const mockPool = pool as jest.Mocked<typeof pool>;
const mockRedis = redisClient as jest.Mocked<typeof redisClient>;

describe('Admin Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock implementations
    mockRedis.get = jest.fn().mockResolvedValue(null);
    mockRedis.setEx = jest.fn().mockResolvedValue('OK');
    mockRedis.keys = jest.fn().mockResolvedValue([]);
    mockRedis.del = jest.fn().mockResolvedValue(1);
  });

  describe('getAllUsers', () => {
    it('should return all users without password field', async () => {
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

      mockPool.query.mockResolvedValueOnce({
        rows: mockUsers,
        command: 'SELECT',
        rowCount: 2,
        oid: 0,
        fields: [],
      } as any);

      const result = await adminService.getAllUsers();

      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      
      // Verify no password field is included
      result.forEach(user => {
        expect(user).not.toHaveProperty('password');
      });
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

      mockPool.query.mockResolvedValueOnce({
        rows: mockUsers,
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const result = await adminService.getAllUsers({ role: UserRole.ADMIN });

      expect(result).toEqual(mockUsers);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND role = $1'),
        [UserRole.ADMIN]
      );
    });

    it('should filter users by active status', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      await adminService.getAllUsers({ is_active: true });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND is_active = $1'),
        [true]
      );
    });

    it('should filter users by search term', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      await adminService.getAllUsers({ search: 'admin' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND (username ILIKE $1 OR email ILIKE $1)'),
        ['%admin%']
      );
    });
  });

  describe('getUserById', () => {
    it('should return user from database when cache miss', async () => {
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

      mockRedis.get.mockResolvedValueOnce(null); // Cache miss
      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const result = await adminService.getUserById('USR-001');

      expect(result).toEqual(mockUser);
      expect(mockRedis.get).toHaveBeenCalledWith('users:USR-001');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockRedis.setEx).toHaveBeenCalled(); // Cache should be set
    });

    it('should return user from cache when cache hit', async () => {
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

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(mockUser)); // Cache hit

      const result = await adminService.getUserById('USR-001');

      expect(result).toEqual(mockUser);
      expect(mockRedis.get).toHaveBeenCalledWith('users:USR-001');
      expect(mockPool.query).not.toHaveBeenCalled(); // Should not query DB
    });

    it('should return null when user not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      const result = await adminService.getUserById('USR-999');

      expect(result).toBeNull();
    });

    it('should handle redis errors gracefully', async () => {
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

      mockRedis.get.mockRejectedValueOnce(new Error('Redis error'));
      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const result = await adminService.getUserById('USR-001');

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalled(); // Should fallback to DB
    });
  });

  describe('createUser', () => {
    it('should create a new user with hashed password', async () => {
      const input: CreateUserInput = {
        user_id: 'USR-003',
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'password123',
        role: UserRole.VIEWER,
        is_active: true,
      };

      const mockCreatedUser = {
        user_id: input.user_id,
        username: input.username,
        email: input.email,
        role: input.role,
        is_active: true,
        last_login: null,
        created_date: new Date(),
        modified_date: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockCreatedUser],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const result = await adminService.createUser(input);

      expect(result).toEqual(mockCreatedUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining([
          input.user_id,
          input.username,
          input.email,
          expect.any(String), // Hashed password
          input.role,
          true,
        ])
      );

      // Password should be hashed (not plain text)
      const queryParams = (mockPool.query.mock.calls[0] as any)[1];
      expect(queryParams[3]).not.toBe('password123');
      expect(queryParams[3]).toHaveLength(64); // SHA256 hash length
    });

    it('should default is_active to true when not provided', async () => {
      const input: CreateUserInput = {
        user_id: 'USR-004',
        username: 'anotheruser',
        email: 'another@test.com',
        password: 'password123',
        role: UserRole.PRODUCTION,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [{ ...input, is_active: true }],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      await adminService.createUser(input);

      const queryParams = (mockPool.query.mock.calls[0] as any)[1];
      expect(queryParams[5]).toBe(true); // is_active should default to true
    });

    it('should invalidate cache after creating user', async () => {
      const input: CreateUserInput = {
        user_id: 'USR-005',
        username: 'test',
        email: 'test@test.com',
        password: 'password',
        role: UserRole.VIEWER,
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [input],
        command: 'INSERT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      await adminService.createUser(input);

      expect(mockRedis.keys).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should update user information', async () => {
      const userId = 'USR-001';
      const existingUser = {
        user_id: userId,
        username: 'oldname',
        email: 'old@test.com',
        role: UserRole.VIEWER,
        is_active: true,
        last_login: null,
        created_date: new Date(),
        modified_date: new Date(),
      };

      const updateInput: UpdateUserInput = {
        username: 'newname',
        email: 'new@test.com',
        role: UserRole.INVENTORY_MANAGER,
      };

      const updatedUser = {
        ...existingUser,
        ...updateInput,
        modified_date: new Date(),
      };

      // Mock getUserById to return existing user
      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query
        .mockResolvedValueOnce({
          rows: [existingUser],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [updatedUser],
          command: 'UPDATE',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any);

      const result = await adminService.updateUser(userId, updateInput);

      expect(result).toMatchObject(updateInput);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining([updateInput.username, updateInput.email, updateInput.role, userId])
      );
    });

    it('should return null when user not found', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'SELECT',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      const result = await adminService.updateUser('USR-999', { username: 'test' });

      expect(result).toBeNull();
    });

    it('should return existing user when no updates provided', async () => {
      const existingUser = {
        user_id: 'USR-001',
        username: 'admin',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        is_active: true,
        last_login: null,
        created_date: new Date(),
        modified_date: new Date(),
      };

      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query.mockResolvedValueOnce({
        rows: [existingUser],
        command: 'SELECT',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const result = await adminService.updateUser('USR-001', {});

      expect(result).toEqual(existingUser);
      // Should only call getUserById, not UPDATE
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache after update', async () => {
      const existingUser = {
        user_id: 'USR-001',
        username: 'admin',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        is_active: true,
        last_login: null,
        created_date: new Date(),
        modified_date: new Date(),
      };

      mockRedis.get.mockResolvedValueOnce(null);
      mockPool.query
        .mockResolvedValueOnce({
          rows: [existingUser],
          command: 'SELECT',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ ...existingUser, username: 'newname' }],
          command: 'UPDATE',
          rowCount: 1,
          oid: 0,
          fields: [],
        } as any);

      await adminService.updateUser('USR-001', { username: 'newname' });

      expect(mockRedis.keys).toHaveBeenCalled();
      expect(mockRedis.del).toHaveBeenCalled();
    });
  });

  describe('toggleUserActive', () => {
    it('should toggle user active status', async () => {
      const mockUser = {
        user_id: 'USR-001',
        username: 'admin',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
        is_active: false, // Toggled
        last_login: null,
        created_date: new Date(),
        modified_date: new Date(),
      };

      mockPool.query.mockResolvedValueOnce({
        rows: [mockUser],
        command: 'UPDATE',
        rowCount: 1,
        oid: 0,
        fields: [],
      } as any);

      const result = await adminService.toggleUserActive('USR-001');

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('SET is_active = NOT is_active'),
        ['USR-001']
      );
    });

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [],
        command: 'UPDATE',
        rowCount: 0,
        oid: 0,
        fields: [],
      } as any);

      const result = await adminService.toggleUserActive('USR-999');

      expect(result).toBeNull();
    });
  });

  describe('getAdminStats', () => {
    it('should return admin statistics', async () => {
      // Mock cache miss
      mockRedis.get.mockResolvedValueOnce(null);

      // Mock all queries
      mockPool.query
        .mockResolvedValueOnce({ 
          rows: [{ total_users: '5', active_users: '4' }] 
        } as any) // total/active users
        .mockResolvedValueOnce({ 
          rows: [
            { role: 'Admin', count: '1' },
            { role: 'InventoryManager', count: '2' },
            { role: 'Viewer', count: '2' },
          ] 
        } as any) // users by role
        .mockResolvedValueOnce({ 
          rows: [{ count: '5' }] 
        } as any) // today transactions
        .mockResolvedValueOnce({ 
          rows: [{ total_lots: '10', quarantine_lots: '3' }] 
        } as any); // lots stats

      const result = await adminService.getAdminStats();

      expect(result).toMatchObject({
        totalUsers: 5,
        activeUsers: 4,
        totalLots: 10,
        quarantineLots: 3,
        todayTransactions: 5,
      });
      expect(result.usersByRole.Admin).toBe(1);
      expect(result.usersByRole.InventoryManager).toBe(2);
      expect(result.usersByRole.Viewer).toBe(2);
    });

    it('should return stats from cache when available', async () => {
      const cachedStats = {
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

      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedStats));

      const result = await adminService.getAdminStats();

      expect(result).toEqual(cachedStats);
      expect(mockPool.query).not.toHaveBeenCalled(); // Should not query DB
    });
  });
});
