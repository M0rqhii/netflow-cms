-- Migration: Workflow enhancements - new statuses and collection workflow config
-- Date: 2025-01-17

-- 1. Update ItemStatus enum to include new statuses
ALTER TYPE "ItemStatus" ADD VALUE IF NOT EXISTS 'REVIEW';
ALTER TYPE "ItemStatus" ADD VALUE IF NOT EXISTS 'APPROVED';
ALTER TYPE "ItemStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

-- Note: PostgreSQL doesn't support removing enum values, so we keep DRAFT and PUBLISHED
-- The new enum will have: DRAFT, PUBLISHED, REVIEW, APPROVED, ARCHIVED

-- 2. Add workflowConfig column to collections table
ALTER TABLE "collections" ADD COLUMN IF NOT EXISTS "workflowConfig" JSONB;

-- 3. Update existing collection items to use new statuses if needed
-- (No data migration needed - existing DRAFT/PUBLISHED remain valid)

-- 4. Create index for workflow queries
CREATE INDEX IF NOT EXISTS "collection_items_status_workflow_idx" ON "collection_items"("status", "createdAt");




