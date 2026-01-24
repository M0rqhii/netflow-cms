-- Migration: Org/Site RLS policies
-- Date: 2026-01-24

-- Enable and create org-level RLS policies (org_id column)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','sites','user_orgs'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS org_isolation_%I ON %I', t, t);
    EXECUTE format('CREATE POLICY org_isolation_%I ON %I FOR ALL USING (org_id = current_setting(''app.current_org_id'', true)::text)', t, t);
  END LOOP;
END $$;

-- Enable and create org-level RLS policies ("orgId" column)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'roles',
    'user_roles',
    'org_policies',
    'subscriptions',
    'invoices',
    'payments',
    'usage_tracking',
    'marketing_campaigns',
    'marketing_distribution_drafts',
    'marketing_channel_connections',
    'marketing_publish_jobs',
    'marketing_publish_results',
    'audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS org_isolation_%I ON %I', t, t);
    IF t = 'audit_logs' THEN
      EXECUTE format('CREATE POLICY org_isolation_%I ON %I FOR ALL USING ("orgId" IS NULL OR "orgId" = current_setting(''app.current_org_id'', true)::text)', t, t);
    ELSE
      EXECUTE format('CREATE POLICY org_isolation_%I ON %I FOR ALL USING ("orgId" = current_setting(''app.current_org_id'', true)::text)', t, t);
    END IF;
  END LOOP;
END $$;

-- Role capabilities (via roles.orgId)
ALTER TABLE "role_capabilities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "role_capabilities" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation_role_capabilities ON "role_capabilities";
CREATE POLICY org_isolation_role_capabilities ON "role_capabilities"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM "roles"
      WHERE "roles"."id" = "role_capabilities"."roleId"
        AND "roles"."orgId" = current_setting('app.current_org_id', true)::text
    )
  );

-- Enable and create site-level RLS policies ("siteId" column)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'content_types',
    'content_entries',
    'collections',
    'collection_items',
    'collection_item_versions',
    'media_files',
    'content_reviews',
    'content_comments',
    'tasks',
    'collection_roles',
    'webhooks',
    'hooks',
    'webhook_deliveries',
    'dev_domain_records',
    'seo_settings',
    'site_environments',
    'pages',
    'site_feature_overrides',
    'site_snapshots',
    'site_events',
    'site_deployments'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS site_isolation_%I ON %I', t, t);
    EXECUTE format('CREATE POLICY site_isolation_%I ON %I FOR ALL USING ("siteId" = current_setting(''app.current_site_id'', true)::text)', t, t);
  END LOOP;
END $$;
