// Jest setup file for E2E tests
// This file runs before each E2E test file

// Mock environment variables for E2E tests
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db_e2e';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
process.env.NODE_ENV = 'test';
process.env.PORT = '4001';

