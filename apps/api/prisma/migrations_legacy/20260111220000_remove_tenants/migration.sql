-- Remove deprecated tenant tables
DROP TABLE IF EXISTS "user_tenants" CASCADE;
DROP TABLE IF EXISTS "tenants" CASCADE;
