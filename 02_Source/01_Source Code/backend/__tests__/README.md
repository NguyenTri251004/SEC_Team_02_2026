# Backend Testing Guide

## Overview
Unit tests for the IMS backend Admin module using Jest and TypeScript.

## Test Coverage
- **admin.service.test.ts**: Tests for admin service layer (database operations)
- **admin.routes.test.ts**: Tests for HTTP routes/controllers

## Running Tests

```bash
# Install dependencies first
cd backend
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Service Layer Tests (admin.service.test.ts)
Tests for business logic and database operations:
- `getAllUsers()` - List users with filters
- `getUserById()` - Get single user (with caching)
- `createUser()` - Create new user (password hashing)
- `updateUser()` - Update user information
- `toggleUserActive()` - Lock/unlock user account
- `getAdminStats()` - Get dashboard statistics

**Mocked Dependencies:**
- PostgreSQL pool
- Redis client

### Route Layer Tests (admin.routes.test.ts)
Tests for HTTP endpoints:
- `GET /api/admin/users` - List users with filters
- `GET /api/admin/users/:id` - Get user detail
- `POST /api/admin/users` - Create user (with validation)
- `PUT /api/admin/users/:id` - Update user
- `PATCH /api/admin/users/:id/toggle-active` - Toggle active status
- `GET /api/admin/stats` - Get admin statistics

**Mocked Dependencies:**
- admin.service module
- authenticateJWT middleware
- adminOnly RBAC middleware

## Test Examples

### Service Test Example
```typescript
it('should return all users without password field', async () => {
  const mockUsers = [...];
  mockPool.query.mockResolvedValueOnce({ rows: mockUsers });

  const result = await adminService.getAllUsers();

  expect(result).toEqual(mockUsers);
  expect(result).toHaveLength(2);
  // Verify no password field
  result.forEach(user => {
    expect(user).not.toHaveProperty('password');
  });
});
```

### Route Test Example
```typescript
it('should return 400 when email is invalid', async () => {
  const invalidUser = { email: 'invalidemail', ... };

  const response = await request(app)
    .post('/api/admin/users')
    .send(invalidUser);

  expect(response.status).toBe(400);
  expect(response.body.error).toBe('Email không hợp lệ');
});
```

## Coverage Goals
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Notes
- Tests run in isolated environment (NODE_ENV=test)
- Database queries are mocked (no real DB needed)
- Redis operations are mocked (no real Redis needed)
- Authentication middleware is mocked for route tests
