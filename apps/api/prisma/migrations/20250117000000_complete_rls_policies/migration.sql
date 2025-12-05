-- Migration: Complete RLS policies for all tenant-scoped tables
-- Date: 2025-01-17
-- Ensures all tables with tenantId have RLS enabled with proper policies

-- Verify and enable RLS for all tenant-scoped tables
-- Note: Some tables may already have RLS enabled, but we ensure consistency

-- 1. Tenants table - NO RLS (this is the root table)
-- Tenants are managed by platform admins, not tenant-scoped

-- 2. Users - RLS already enabled, verify policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND policyname = 'tenant_isolation_users'
  ) THEN
    ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_users ON "users"
      FOR ALL
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
  END IF;
END $$;

-- 3. Content Types - RLS already enabled, verify policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'content_types' 
    AND policyname = 'tenant_isolation_content_types'
  ) THEN
    ALTER TABLE "content_types" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_content_types ON "content_types"
      FOR ALL
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
  END IF;
END $$;

-- 4. Content Entries - RLS already enabled, verify policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'content_entries' 
    AND policyname = 'tenant_isolation_content_entries'
  ) THEN
    ALTER TABLE "content_entries" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_content_entries ON "content_entries"
      FOR ALL
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
  END IF;
END $$;

-- 5. Collections - RLS already enabled, verify policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'collections' 
    AND policyname = 'tenant_isolation_collections'
  ) THEN
    ALTER TABLE "collections" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_collections ON "collections"
      FOR ALL
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
  END IF;
END $$;

-- 6. Collection Items - RLS already enabled, verify policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'collection_items' 
    AND policyname = 'tenant_isolation_collection_items'
  ) THEN
    ALTER TABLE "collection_items" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_collection_items ON "collection_items"
      FOR ALL
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
  END IF;
END $$;

-- 7. Media Files - RLS already enabled, verify policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'media_files' 
    AND policyname = 'tenant_isolation_media_files'
  ) THEN
    ALTER TABLE "media_files" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_media_files ON "media_files"
      FOR ALL
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
  END IF;
END $$;

-- 8. User Tenants - RLS already enabled, verify policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_tenants' 
    AND policyname = 'tenant_isolation_user_tenants'
  ) THEN
    ALTER TABLE "user_tenants" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_user_tenants ON "user_tenants"
      FOR ALL
      USING ("tenant_id" = current_setting('app.current_tenant_id', true)::TEXT);
  END IF;
END $$;

-- 9. Content Reviews - RLS already enabled, verify policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'content_reviews' 
    AND policyname = 'tenant_isolation_content_reviews'
  ) THEN
    ALTER TABLE "content_reviews" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_content_reviews ON "content_reviews"
      FOR ALL
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
  END IF;
END $$;

-- 10. Content Comments - RLS already enabled, verify policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'content_comments' 
    AND policyname = 'tenant_isolation_content_comments'
  ) THEN
    ALTER TABLE "content_comments" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_content_comments ON "content_comments"
      FOR ALL
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
  END IF;
END $$;

-- 11. Tasks - RLS already enabled, verify policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tasks' 
    AND policyname = 'tenant_isolation_tasks'
  ) THEN
    ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_tasks ON "tasks"
      FOR ALL
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
  END IF;
END $$;

-- 12. Collection Roles - RLS already enabled, verify policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'collection_roles' 
    AND policyname = 'tenant_isolation_collection_roles'
  ) THEN
    ALTER TABLE "collection_roles" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_collection_roles ON "collection_roles"
      FOR ALL
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
  END IF;
END $$;

-- 13. Webhooks - RLS already enabled, verify policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'webhooks' 
    AND policyname = 'tenant_isolation_webhooks'
  ) THEN
    ALTER TABLE "webhooks" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_webhooks ON "webhooks"
      FOR ALL
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
  END IF;
END $$;

-- 14. Webhook Deliveries - RLS already enabled, verify policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'webhook_deliveries' 
    AND policyname = 'tenant_isolation_webhook_deliveries'
  ) THEN
    ALTER TABLE "webhook_deliveries" ENABLE ROW LEVEL SECURITY;
    CREATE POLICY tenant_isolation_webhook_deliveries ON "webhook_deliveries"
      FOR ALL
      USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
  END IF;
END $$;

-- 15. Subscriptions - NEW: Enable RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'subscriptions' 
      AND policyname = 'tenant_isolation_subscriptions'
    ) THEN
      CREATE POLICY tenant_isolation_subscriptions ON "subscriptions"
        FOR ALL
        USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
    END IF;
  END IF;
END $$;

-- 16. Invoices - NEW: Enable RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'invoices' 
      AND policyname = 'tenant_isolation_invoices'
    ) THEN
      CREATE POLICY tenant_isolation_invoices ON "invoices"
        FOR ALL
        USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
    END IF;
  END IF;
END $$;

-- 17. Payments - NEW: Enable RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'payments' 
      AND policyname = 'tenant_isolation_payments'
    ) THEN
      CREATE POLICY tenant_isolation_payments ON "payments"
        FOR ALL
        USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
    END IF;
  END IF;
END $$;

-- 18. Usage Tracking - NEW: Enable RLS
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'usage_tracking') THEN
    ALTER TABLE "usage_tracking" ENABLE ROW LEVEL SECURITY;
    
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'usage_tracking' 
      AND policyname = 'tenant_isolation_usage_tracking'
    ) THEN
      CREATE POLICY tenant_isolation_usage_tracking ON "usage_tracking"
        FOR ALL
        USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
    END IF;
  END IF;
END $$;

-- Create helper function to verify RLS is working
CREATE OR REPLACE FUNCTION verify_rls_enabled(table_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = table_name;
  
  RETURN COALESCE(rls_enabled, false);
END;
$$ LANGUAGE plpgsql;




