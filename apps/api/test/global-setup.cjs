const path = require('path');
const { execSync } = require('child_process');

module.exports = async () => {
  // Ensure stable test env
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
  process.env.REDIS_DISABLED = process.env.REDIS_DISABLED || '1';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL ||
    'postgresql://test:test_password@localhost:5433/test_db?schema=public&connection_limit=5&pool_timeout=20';

  const apiRoot = path.resolve(__dirname, '..');
  const prismaBin = process.platform === 'win32'
    ? path.join(apiRoot, 'node_modules', '.bin', 'prisma.cmd')
    : path.join(apiRoot, 'node_modules', '.bin', 'prisma');
  const rlsFile = path.join(__dirname, 'setup-rls.sql');

  execSync(`"${prismaBin}" db push --skip-generate`, {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
  });

  execSync(`"${prismaBin}" db execute --file "${rlsFile}"`, {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
  });

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'test_rls') THEN
          CREATE ROLE test_rls LOGIN PASSWORD 'test_password' NOSUPERUSER NOBYPASSRLS;
        END IF;
      END $$;
    `);

    await prisma.$executeRawUnsafe('GRANT test_rls TO test');
    await prisma.$executeRawUnsafe('GRANT CONNECT ON DATABASE test_db TO test_rls');
    await prisma.$executeRawUnsafe('GRANT USAGE ON SCHEMA public TO test_rls');
    await prisma.$executeRawUnsafe('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO test_rls');
    await prisma.$executeRawUnsafe('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO test_rls');
    await prisma.$executeRawUnsafe('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO test_rls');
    await prisma.$executeRawUnsafe('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO test_rls');
  } catch (error) {
    // Best-effort: avoid failing tests if role creation/grants are not possible
    // eslint-disable-next-line no-console
    console.warn('RLS role setup skipped:', error?.message || error);
  } finally {
    await prisma.$disconnect();
  }
};