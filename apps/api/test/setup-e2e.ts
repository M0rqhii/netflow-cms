// Jest setup file for E2E tests
// This file runs before each E2E test file

// Mock environment variables for E2E tests
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://test:test_password@localhost:5433/test_db?schema=public&connection_limit=5&pool_timeout=20';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';

process.env.REDIS_DISABLED = process.env.REDIS_DISABLED || '1';