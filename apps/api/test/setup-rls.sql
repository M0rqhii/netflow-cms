-- E2E RLS setup for org/site model

-- Users (org-scoped)
DO $$
BEGIN
  ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'org_isolation_users'
  ) THEN
    ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
    CREATE POLICY org_isolation_users ON "users"
      FOR ALL
      USING ("org_id" = current_setting('app.current_org_id', true)::TEXT);
  END IF;
END $$;

-- Content Types (site-scoped)
DO $$
BEGIN
  ALTER TABLE "content_types" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_types" FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'content_types' AND policyname = 'site_isolation_content_types'
  ) THEN
    ALTER TABLE "content_types" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "content_types" FORCE ROW LEVEL SECURITY;
    CREATE POLICY site_isolation_content_types ON "content_types"
      FOR ALL
      USING ("siteId" = current_setting('app.current_site_id', true)::TEXT);
  END IF;
END $$;

-- Content Entries (site-scoped)
DO $$
BEGIN
  ALTER TABLE "content_entries" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_entries" FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'content_entries' AND policyname = 'site_isolation_content_entries'
  ) THEN
    ALTER TABLE "content_entries" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "content_entries" FORCE ROW LEVEL SECURITY;
    CREATE POLICY site_isolation_content_entries ON "content_entries"
      FOR ALL
      USING ("siteId" = current_setting('app.current_site_id', true)::TEXT);
  END IF;
END $$;

-- Collections (site-scoped)
DO $$
BEGIN
  ALTER TABLE "collections" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "collections" FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'collections' AND policyname = 'site_isolation_collections'
  ) THEN
    ALTER TABLE "collections" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "collections" FORCE ROW LEVEL SECURITY;
    CREATE POLICY site_isolation_collections ON "collections"
      FOR ALL
      USING ("siteId" = current_setting('app.current_site_id', true)::TEXT);
  END IF;
END $$;

-- Collection Items (site-scoped)
DO $$
BEGIN
  ALTER TABLE "collection_items" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "collection_items" FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'collection_items' AND policyname = 'site_isolation_collection_items'
  ) THEN
    ALTER TABLE "collection_items" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "collection_items" FORCE ROW LEVEL SECURITY;
    CREATE POLICY site_isolation_collection_items ON "collection_items"
      FOR ALL
      USING ("siteId" = current_setting('app.current_site_id', true)::TEXT);
  END IF;
END $$;

-- Media Files (site-scoped)
DO $$
BEGIN
  ALTER TABLE "media_files" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "media_files" FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'media_files' AND policyname = 'site_isolation_media_files'
  ) THEN
    ALTER TABLE "media_files" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "media_files" FORCE ROW LEVEL SECURITY;
    CREATE POLICY site_isolation_media_files ON "media_files"
      FOR ALL
      USING ("siteId" = current_setting('app.current_site_id', true)::TEXT);
  END IF;
END $$;

-- Content Reviews (site-scoped)
DO $$
BEGIN
  ALTER TABLE "content_reviews" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_reviews" FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'content_reviews' AND policyname = 'site_isolation_content_reviews'
  ) THEN
    ALTER TABLE "content_reviews" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "content_reviews" FORCE ROW LEVEL SECURITY;
    CREATE POLICY site_isolation_content_reviews ON "content_reviews"
      FOR ALL
      USING ("siteId" = current_setting('app.current_site_id', true)::TEXT);
  END IF;
END $$;

-- Content Comments (site-scoped)
DO $$
BEGIN
  ALTER TABLE "content_comments" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "content_comments" FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'content_comments' AND policyname = 'site_isolation_content_comments'
  ) THEN
    ALTER TABLE "content_comments" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "content_comments" FORCE ROW LEVEL SECURITY;
    CREATE POLICY site_isolation_content_comments ON "content_comments"
      FOR ALL
      USING ("siteId" = current_setting('app.current_site_id', true)::TEXT);
  END IF;
END $$;

-- Tasks (site-scoped)
DO $$
BEGIN
  ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'site_isolation_tasks'
  ) THEN
    ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "tasks" FORCE ROW LEVEL SECURITY;
    CREATE POLICY site_isolation_tasks ON "tasks"
      FOR ALL
      USING ("siteId" = current_setting('app.current_site_id', true)::TEXT);
  END IF;
END $$;

-- Collection Roles (site-scoped)
DO $$
BEGIN
  ALTER TABLE "collection_roles" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "collection_roles" FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'collection_roles' AND policyname = 'site_isolation_collection_roles'
  ) THEN
    ALTER TABLE "collection_roles" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "collection_roles" FORCE ROW LEVEL SECURITY;
    CREATE POLICY site_isolation_collection_roles ON "collection_roles"
      FOR ALL
      USING ("siteId" = current_setting('app.current_site_id', true)::TEXT);
  END IF;
END $$;

-- Webhooks (site-scoped)
DO $$
BEGIN
  ALTER TABLE "webhooks" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "webhooks" FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'webhooks' AND policyname = 'site_isolation_webhooks'
  ) THEN
    ALTER TABLE "webhooks" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "webhooks" FORCE ROW LEVEL SECURITY;
    CREATE POLICY site_isolation_webhooks ON "webhooks"
      FOR ALL
      USING ("siteId" = current_setting('app.current_site_id', true)::TEXT);
  END IF;
END $$;

-- Webhook Deliveries (site-scoped)
DO $$
BEGIN
  ALTER TABLE "webhook_deliveries" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "webhook_deliveries" FORCE ROW LEVEL SECURITY;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'webhook_deliveries' AND policyname = 'site_isolation_webhook_deliveries'
  ) THEN
    ALTER TABLE "webhook_deliveries" ENABLE ROW LEVEL SECURITY;
    ALTER TABLE "webhook_deliveries" FORCE ROW LEVEL SECURITY;
    CREATE POLICY site_isolation_webhook_deliveries ON "webhook_deliveries"
      FOR ALL
      USING ("siteId" = current_setting('app.current_site_id', true)::TEXT);
  END IF;
END $$;
