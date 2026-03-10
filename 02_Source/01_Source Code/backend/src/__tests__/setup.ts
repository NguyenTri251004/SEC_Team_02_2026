/**
 * Jest setup file for tests
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
// Tests mock authenticateJWT directly; no JWT_SECRET or BYPASS_AUTH needed.
