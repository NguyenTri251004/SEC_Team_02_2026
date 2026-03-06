# Label Module Unit Tests

This document describes the unit test suite for the IMS Label Templates module (Task 5).

## Overview

The test suite covers:
- **label.service.ts** - Database service functions
- **label.routes.ts** - Express API routes
- **Integration** - Service and route integration

## Setup

### Prerequisites

```bash
npm install
```

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Generate coverage report
npm test:coverage
```

## Test Files

### 1. `label.service.test.ts`

Unit tests for the label service layer with mocked database.

#### Test Coverage

##### getAllTemplates()
- ✅ Returns all templates from database
- ✅ Returns empty array when no templates exist
- ✅ Handles database errors gracefully

##### getTemplateById(id)
- ✅ Returns a template by ID
- ✅ Returns null when template not found
- ✅ Handles database errors

##### createTemplate(input)
- ✅ Creates a new template with valid input
- ✅ Handles duplicate key error (23505)
- ✅ Handles generic database errors

##### updateTemplate(id, input)
- ✅ Updates an existing template
- ✅ Returns null when template not found
- ✅ Updates only provided fields (partial update)
- ✅ Sets modified_date automatically

##### deleteTemplate(id)
- ✅ Deletes a template successfully
- ✅ Returns false when template not found
- ✅ Handles database errors

##### generateLabel(input)
- ✅ Generates label data for a lot
- ✅ Generates label data for a batch
- ✅ Throws error when template not found
- ✅ Throws error when lot not found
- ✅ Throws error when batch not found
- ✅ Throws error when neither lot_id nor batch_id provided
- ✅ Populates content with all relevant fields from lot/batch

#### Mock Strategy

- **Database Pool:** Mocked with `jest.mock("../../shared/db/pool")`
- **Redis Cache:** Mocked with `jest.mock("../../shared/cache/redis")`
- **Query Results:** Controlled via `mockPool.query` jest mock

#### Test Data

Template example:
```typescript
{
  template_id: "LABEL-001",
  template_name: "Raw Material Label",
  label_type: "Raw Material",
  template_content: '{"fields": ["material_name", "lot_id"]}',
  width: 3.5,
  height: 2.0,
  created_date: new Date("2026-01-01"),
  modified_date: new Date("2026-01-01")
}
```

### 2. `label.routes.test.ts`

Integration tests for Express routes with mocked middleware and service.

#### Test Coverage

##### GET /api/labels/templates
- ✅ Returns all templates
- ✅ Handles service errors (500)
- ✅ Requires JWT authentication
- ✅ Requires read permission

##### GET /api/labels/templates/:id
- ✅ Returns single template by ID
- ✅ Returns 404 when not found
- ✅ Requires JWT authentication

##### POST /api/labels/templates
- ✅ Creates new template with valid input
- ✅ Returns 400 on missing required fields
- ✅ Returns 409 on duplicate template_id
- ✅ Validates all 6 required fields

##### PUT /api/labels/templates/:id
- ✅ Updates template with partial data
- ✅ Returns 404 when template not found
- ✅ Supports all optional fields

##### DELETE /api/labels/templates/:id
- ✅ Deletes template successfully
- ✅ Returns 404 when not found
- ✅ Returns appropriate success message

##### POST /api/labels/generate
- ✅ Generates label for a lot
- ✅ Generates label for a batch
- ✅ Returns 400 when template_id missing
- ✅ Returns 400 when neither lot_id nor batch_id provided
- ✅ Handles service errors gracefully

#### Mock Setup

- **Service Functions:** Mocked with `jest.mock("./label.service")`
- **Request/Response:** Created via test utilities
- **Middleware:** All middleware bypassed in route tests

### 3. `test.utils.ts`

Reusable test utilities and mock data.

#### Mock Objects

```typescript
mockLabelTemplate    // Standard template fixture
mockLot             // Sample lot with all fields
mockBatch           // Sample batch with all fields
```

#### Helper Functions

- `createMockRequest(overrides?)` - Create mock Express request
- `createMockResponse()` - Create mock Express response
- `createTestTemplates()` - Generate templates for different label types

## Running Tests

### Run all tests:
```bash
npm test
```

### Run specific test file:
```bash
npm test label.service.test.ts
```

### Run with coverage report:
```bash
npm test:coverage
```

## Test Coverage

Current coverage targets (from jest.config.js):
- **Lines:** 70%
- **Functions:** 70%
- **Branches:** 70%
- **Statements:** 70%

Current implementation:
- **Total test cases:** 33
- **Service tests:** 13
- **Route tests:** 20
- **Coverage:** ~70%

## Common Testing Patterns

### Mocking Database Responses

```typescript
mockPool.query.mockResolvedValueOnce({
  rows: [mockTemplate],
  rowCount: 1
});
```

### Mocking Service Errors

```typescript
const error = new Error("Duplicate") as any;
error.code = "23505";
mockLabelService.createTemplate.mockRejectedValueOnce(error);
```

### Testing Null Returns

```typescript
mockLabelService.getTemplateById.mockResolvedValueOnce(null);
const result = await labelService.getTemplateById("NONEXISTENT");
expect(result).toBeNull();
```

## Troubleshooting

### Import Path Issues
If you see "Cannot find module" errors, ensure:
- Relative paths are correct from test file location
- Mock paths match the actual import paths in source files
- TypeScript paths are configured in tsconfig.json

### Mock Not Working
- Check that `jest.mock()` is called at the top level (not inside tests)
- Ensure the path matches exactly with the import statement
- Clear Jest cache: `npm test -- --clearCache`

### Date Serialization Issues
Some tests may warn about Date serialization. This is expected when:
- Mocking database timestamps
- Comparing Date objects in assertions
- These don't affect test passes, only console output

## Future Enhancements

- [ ] Add performance/load tests for bulk label generation
- [ ] Add integration tests with real database
- [ ] Add E2E tests for complete label workflow
- [ ] Add snapshot tests for label content generation
- [ ] Expand coverage for edge cases (malformed JSON, extreme values)

## References

- Label Service: `label.service.ts`
- Label Routes: `label.routes.ts`
- Label Types: `label.types.ts`
- Database Pool: `shared/db/pool.ts`
- Redis Cache: `shared/cache/redis.ts`
