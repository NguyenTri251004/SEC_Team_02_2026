/**
 * Jest setup file for tests
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.BYPASS_AUTH = 'true';

// Note: console mocking and timeout can be configured in jest.config.js instead
