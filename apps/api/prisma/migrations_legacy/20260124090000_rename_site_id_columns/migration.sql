-- Migration: Align site_id columns with Prisma schema (siteId) and remove legacy tenantId
-- Date: 2026-01-24

-- Drop legacy tenant isolation policies before removing tenantId columns
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname
           FROM pg_policies
           WHERE schemaname = 'public' AND policyname LIKE 'tenant_isolation_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Rename site_id -> siteId where present (for legacy tables from org/site migration)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_types' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_types' AND column_name = 'siteId') THEN
    ALTER TABLE "content_types" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_entries' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_entries' AND column_name = 'siteId') THEN
    ALTER TABLE "content_entries" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collections' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collections' AND column_name = 'siteId') THEN
    ALTER TABLE "collections" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collection_items' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collection_items' AND column_name = 'siteId') THEN
    ALTER TABLE "collection_items" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collection_item_versions' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collection_item_versions' AND column_name = 'siteId') THEN
    ALTER TABLE "collection_item_versions" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_files' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'media_files' AND column_name = 'siteId') THEN
    ALTER TABLE "media_files" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_reviews' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_reviews' AND column_name = 'siteId') THEN
    ALTER TABLE "content_reviews" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_comments' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_comments' AND column_name = 'siteId') THEN
    ALTER TABLE "content_comments" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'siteId') THEN
    ALTER TABLE "tasks" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collection_roles' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'collection_roles' AND column_name = 'siteId') THEN
    ALTER TABLE "collection_roles" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhooks' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhooks' AND column_name = 'siteId') THEN
    ALTER TABLE "webhooks" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hooks' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'hooks' AND column_name = 'siteId') THEN
    ALTER TABLE "hooks" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_deliveries' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_deliveries' AND column_name = 'siteId') THEN
    ALTER TABLE "webhook_deliveries" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dev_domain_records' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dev_domain_records' AND column_name = 'siteId') THEN
    ALTER TABLE "dev_domain_records" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_settings' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_settings' AND column_name = 'siteId') THEN
    ALTER TABLE "seo_settings" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_environments' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'site_environments' AND column_name = 'siteId') THEN
    ALTER TABLE "site_environments" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pages' AND column_name = 'site_id')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pages' AND column_name = 'siteId') THEN
    ALTER TABLE "pages" RENAME COLUMN site_id TO "siteId";
  END IF;
END $$;

-- Drop legacy tenantId columns if present
ALTER TABLE "users" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "content_types" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "content_entries" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "collections" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "collection_items" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "collection_item_versions" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "media_files" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "content_reviews" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "content_comments" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "collection_roles" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "webhooks" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "hooks" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "webhook_deliveries" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "dev_domain_records" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "seo_settings" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "site_environments" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "pages" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "subscriptions" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "payments" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "usage_tracking" DROP COLUMN IF EXISTS "tenantId";
