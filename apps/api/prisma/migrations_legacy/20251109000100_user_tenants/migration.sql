-- Enable required extension for UUID if not present
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create user_tenants table
-- Use TEXT columns to match existing tables created as TEXT ids
CREATE TABLE IF NOT EXISTS user_tenants (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unique membership per user/tenant
CREATE UNIQUE INDEX IF NOT EXISTS user_tenants_user_tenant_unique ON user_tenants (user_id, tenant_id);

-- Indexes for lookups
CREATE INDEX IF NOT EXISTS user_tenants_tenant_idx ON user_tenants (tenant_id);
CREATE INDEX IF NOT EXISTS user_tenants_user_idx ON user_tenants (user_id);

-- Foreign keys
ALTER TABLE user_tenants
  ADD CONSTRAINT fk_user_tenants_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE user_tenants
  ADD CONSTRAINT fk_user_tenants_tenant
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

-- Backfill memberships from existing users (legacy single-tenant relation)
INSERT INTO user_tenants (user_id, tenant_id, role)
SELECT id, "tenantId", role FROM users
WHERE "tenantId" IS NOT NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;
