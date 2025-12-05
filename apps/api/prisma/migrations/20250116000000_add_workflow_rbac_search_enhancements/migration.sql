-- Migration: Add workflow tasks, collection roles, webhook enhancements, and complete RLS
-- Date: 2025-01-16

-- 1. Enable RLS for UserTenant table (was missing)
ALTER TABLE "user_tenants" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_user_tenants ON "user_tenants"
  FOR ALL
  USING ("tenant_id" = current_setting('app.current_tenant_id', true)::TEXT);

-- 2. Create Task enums first
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- Create Task table for workflow tasks
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contentEntryId" TEXT,
    "collectionItemId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for Task
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contentEntryId_fkey" FOREIGN KEY ("contentEntryId") REFERENCES "content_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for Task
CREATE INDEX "tasks_tenantId_idx" ON "tasks"("tenantId");
CREATE INDEX "tasks_tenantId_status_idx" ON "tasks"("tenantId", "status");
CREATE INDEX "tasks_tenantId_assignedToId_idx" ON "tasks"("tenantId", "assignedToId");
CREATE INDEX "tasks_contentEntryId_idx" ON "tasks"("contentEntryId");
CREATE INDEX "tasks_collectionItemId_idx" ON "tasks"("collectionItemId");

-- Enable RLS for Task
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_tasks ON "tasks"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);

-- 3. Create CollectionRole table for per-collection RBAC
CREATE TABLE "collection_roles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_roles_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for CollectionRole
ALTER TABLE "collection_roles" ADD CONSTRAINT "collection_roles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collection_roles" ADD CONSTRAINT "collection_roles_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create indexes for CollectionRole
CREATE UNIQUE INDEX "collection_roles_collectionId_userId_key" ON "collection_roles"("collectionId", "userId");
CREATE INDEX "collection_roles_tenantId_idx" ON "collection_roles"("tenantId");
CREATE INDEX "collection_roles_collectionId_idx" ON "collection_roles"("collectionId");
CREATE INDEX "collection_roles_userId_idx" ON "collection_roles"("userId");

-- Enable RLS for CollectionRole
ALTER TABLE "collection_roles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_collection_roles ON "collection_roles"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);

-- 4. Add collectionId to Webhook table for per-collection webhooks
ALTER TABLE "webhooks" ADD COLUMN "collectionId" TEXT;

-- Add foreign key for collectionId
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index for collectionId
CREATE INDEX "webhooks_collectionId_idx" ON "webhooks"("collectionId");

-- Note: RLS policy for webhooks already exists and will work with collectionId filtering
-- The existing policy filters by tenantId, which is sufficient

