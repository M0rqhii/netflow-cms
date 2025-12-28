-- Migration: Add RBAC models (Capability, Role, RoleCapability, UserRole, OrgPolicy, AuditLog)
-- Date: 2025-01-20
-- Description: Implements role-based access control with capabilities, roles, policies, and audit logging

-- ============================================
-- 1. Capability table - atomowe uprawnienia
-- ============================================
CREATE TABLE "capabilities" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "isDangerous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capabilities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "capabilities_key_key" ON "capabilities"("key");
CREATE INDEX "capabilities_module_idx" ON "capabilities"("module");
CREATE INDEX "capabilities_key_idx" ON "capabilities"("key");

-- ============================================
-- 2. Role table - role systemowe i custom
-- ============================================
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "isImmutable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "roles" ADD CONSTRAINT "roles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "roles_orgId_name_scope_key" ON "roles"("orgId", "name", "scope");
CREATE INDEX "roles_orgId_idx" ON "roles"("orgId");
CREATE INDEX "roles_orgId_scope_idx" ON "roles"("orgId", "scope");
CREATE INDEX "roles_type_idx" ON "roles"("type");

-- ============================================
-- 3. RoleCapability join table
-- ============================================
CREATE TABLE "role_capabilities" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_capabilities_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "role_capabilities" ADD CONSTRAINT "role_capabilities_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_capabilities" ADD CONSTRAINT "role_capabilities_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "role_capabilities_roleId_capabilityId_key" ON "role_capabilities"("roleId", "capabilityId");
CREATE INDEX "role_capabilities_roleId_idx" ON "role_capabilities"("roleId");
CREATE INDEX "role_capabilities_capabilityId_idx" ON "role_capabilities"("capabilityId");

-- ============================================
-- 4. UserRole table - przypisanie ról do użytkowników
-- ============================================
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "siteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "user_roles_orgId_userId_idx" ON "user_roles"("orgId", "userId");
CREATE INDEX "user_roles_orgId_siteId_idx" ON "user_roles"("orgId", "siteId");
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");
CREATE INDEX "user_roles_siteId_idx" ON "user_roles"("siteId");

-- ============================================
-- 5. OrgPolicy table - globalne włączanie/wyłączanie capabilities
-- ============================================
CREATE TABLE "org_policies" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "capabilityKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_policies_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "org_policies" ADD CONSTRAINT "org_policies_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "org_policies_orgId_capabilityKey_key" ON "org_policies"("orgId", "capabilityKey");
CREATE INDEX "org_policies_orgId_idx" ON "org_policies"("orgId");
CREATE INDEX "org_policies_capabilityKey_idx" ON "org_policies"("capabilityKey");

-- ============================================
-- 6. AuditLog table - logowanie zmian RBAC
-- ============================================
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "orgId" TEXT,
    "siteId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");
CREATE INDEX "audit_logs_orgId_idx" ON "audit_logs"("orgId");
CREATE INDEX "audit_logs_siteId_idx" ON "audit_logs"("siteId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- ============================================
-- 7. Enable RLS (Row Level Security) for RBAC tables
-- ============================================
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_capabilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "org_policies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- RLS Policy for roles
CREATE POLICY tenant_isolation_roles ON "roles"
    FOR ALL
    USING ("orgId" = current_setting('app.current_tenant_id', true)::TEXT);

-- RLS Policy for role_capabilities (via role.orgId)
CREATE POLICY tenant_isolation_role_capabilities ON "role_capabilities"
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM "roles"
            WHERE "roles"."id" = "role_capabilities"."roleId"
            AND "roles"."orgId" = current_setting('app.current_tenant_id', true)::TEXT
        )
    );

-- RLS Policy for user_roles
CREATE POLICY tenant_isolation_user_roles ON "user_roles"
    FOR ALL
    USING ("orgId" = current_setting('app.current_tenant_id', true)::TEXT);

-- RLS Policy for org_policies
CREATE POLICY tenant_isolation_org_policies ON "org_policies"
    FOR ALL
    USING ("orgId" = current_setting('app.current_tenant_id', true)::TEXT);

-- RLS Policy for audit_logs
CREATE POLICY tenant_isolation_audit_logs ON "audit_logs"
    FOR ALL
    USING (
        "orgId" IS NULL OR "orgId" = current_setting('app.current_tenant_id', true)::TEXT
    );

