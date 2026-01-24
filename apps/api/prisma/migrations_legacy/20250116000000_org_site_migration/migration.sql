-- Migration: Tenant → Organization + Site
-- Date: 2025-01-16
-- Description: Rozdzielenie modelu Tenant na Organization (org) i Site

-- ============================================
-- Faza 1: Utworzenie tabel Organization i Site
-- ============================================

-- Utworzenie tabeli organizations
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Utworzenie tabeli sites
CREATE TABLE IF NOT EXISTS sites (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_sites_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  CONSTRAINT unique_org_slug UNIQUE (org_id, slug)
);

-- Indeksy dla organizations
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Indeksy dla sites
CREATE INDEX IF NOT EXISTS idx_sites_org_id ON sites(org_id);

-- ============================================
-- Faza 2: Backfill - Organizations i Sites
-- ============================================

-- Backfill: Skopiuj dane z tenants do organizations
INSERT INTO organizations (id, name, slug, plan, settings, created_at, updated_at)
SELECT id, name, slug, plan, settings, "createdAt", "updatedAt"
FROM tenants
ON CONFLICT (id) DO NOTHING;

-- Backfill: Utwórz site dla każdej organizacji (jeden site per org)
INSERT INTO sites (id, org_id, name, slug, settings, created_at, updated_at)
SELECT 
  gen_random_uuid()::text,
  t.id,
  COALESCE(t.name, 'Site') || ' Site',
  COALESCE(t.slug, 'site') || '-site',
  t.settings,
  t."createdAt",
  t."updatedAt"
FROM tenants t
ON CONFLICT (org_id, slug) DO NOTHING;

-- ============================================
-- Faza 3: Dodanie kolumn orgId / siteId (nullable)
-- ============================================

-- User → orgId
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);

-- UserTenant → orgId
ALTER TABLE user_tenants ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_user_tenants_org_id ON user_tenants(org_id);

-- Content models → siteId
ALTER TABLE content_types ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE content_entries ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE collection_items ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE collection_item_versions ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE media_files ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE content_reviews ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE content_comments ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE collection_roles ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE webhooks ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE hooks ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE webhook_deliveries ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE dev_domain_records ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE seo_settings ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE site_environments ADD COLUMN IF NOT EXISTS site_id TEXT;
ALTER TABLE pages ADD COLUMN IF NOT EXISTS site_id TEXT;

-- Billing models → orgId
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE usage_tracking ADD COLUMN IF NOT EXISTS org_id TEXT;

-- RBAC models → orgId
-- Uwaga: W bazie danych kolumna już istnieje jako "orgId", więc dodajemy alias "org_id" lub kopiujemy
-- Dla zgodności dodajemy kolumnę org_id (małe litery) i kopiujemy wartość z orgId
ALTER TABLE roles ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE org_policies ADD COLUMN IF NOT EXISTS org_id TEXT;

-- Marketing models → orgId
-- Uwaga: W bazie danych kolumna już istnieje jako "orgId", więc dodajemy alias "org_id" lub kopiujemy
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE marketing_distribution_drafts ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE marketing_channel_connections ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE marketing_publish_jobs ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE marketing_publish_results ADD COLUMN IF NOT EXISTS org_id TEXT;

-- Indeksy dla site_id
CREATE INDEX IF NOT EXISTS idx_content_types_site_id ON content_types(site_id);
CREATE INDEX IF NOT EXISTS idx_content_entries_site_id ON content_entries(site_id);
CREATE INDEX IF NOT EXISTS idx_collections_site_id ON collections(site_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_site_id ON collection_items(site_id);
CREATE INDEX IF NOT EXISTS idx_collection_item_versions_site_id ON collection_item_versions(site_id);
CREATE INDEX IF NOT EXISTS idx_media_files_site_id ON media_files(site_id);
CREATE INDEX IF NOT EXISTS idx_content_reviews_site_id ON content_reviews(site_id);
CREATE INDEX IF NOT EXISTS idx_content_comments_site_id ON content_comments(site_id);
CREATE INDEX IF NOT EXISTS idx_tasks_site_id ON tasks(site_id);
CREATE INDEX IF NOT EXISTS idx_collection_roles_site_id ON collection_roles(site_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_site_id ON webhooks(site_id);
CREATE INDEX IF NOT EXISTS idx_hooks_site_id ON hooks(site_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_site_id ON webhook_deliveries(site_id);
CREATE INDEX IF NOT EXISTS idx_dev_domain_records_site_id ON dev_domain_records(site_id);
CREATE INDEX IF NOT EXISTS idx_seo_settings_site_id ON seo_settings(site_id);
CREATE INDEX IF NOT EXISTS idx_site_environments_site_id ON site_environments(site_id);
CREATE INDEX IF NOT EXISTS idx_pages_site_id ON pages(site_id);

-- Indeksy dla org_id
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_org_id ON usage_tracking(org_id);
CREATE INDEX IF NOT EXISTS idx_roles_org_id ON roles(org_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_org_id ON user_roles(org_id);
CREATE INDEX IF NOT EXISTS idx_org_policies_org_id ON org_policies(org_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_org_id ON marketing_campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_marketing_distribution_drafts_org_id ON marketing_distribution_drafts(org_id);
CREATE INDEX IF NOT EXISTS idx_marketing_channel_connections_org_id ON marketing_channel_connections(org_id);
CREATE INDEX IF NOT EXISTS idx_marketing_publish_jobs_org_id ON marketing_publish_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_marketing_publish_results_org_id ON marketing_publish_results(org_id);

-- ============================================
-- Faza 4: Backfill - orgId / siteId
-- ============================================

-- User → orgId (tenantId → orgId)
UPDATE users SET org_id = "tenantId" WHERE org_id IS NULL;

-- UserTenant → orgId (tenantId → orgId)
UPDATE user_tenants SET org_id = tenant_id WHERE org_id IS NULL;

-- Content models → siteId
-- Używamy subquery aby znaleźć site_id dla każdego tenantId
UPDATE content_types ct
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = ct."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE content_entries ce
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = ce."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE collections c
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = c."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE collection_items ci
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = ci."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE collection_item_versions civ
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = civ."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

-- MediaItem już ma siteId mapowane na tenantId, więc aktualizujemy
UPDATE media_files mf
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = mf."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL OR site_id = mf."tenantId";

UPDATE content_reviews cr
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = cr."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE content_comments cc
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = cc."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE tasks t
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = t."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE collection_roles cr
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = cr."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE webhooks w
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = w."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE hooks h
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = h."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE webhook_deliveries wd
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = wd."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE dev_domain_records ddr
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = ddr."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE seo_settings ss
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = ss."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE site_environments se
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = se."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

UPDATE pages p
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = p."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

-- SiteFeatureOverride, SiteSnapshot, SiteEvent, SiteDeployment już mają siteId
-- Ale musimy zaktualizować je jeśli siteId = tenantId
UPDATE site_feature_overrides sfo
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = sfo.site_id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = sfo.site_id
);

UPDATE site_snapshots ss
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = ss.site_id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = ss.site_id
);

UPDATE site_events se
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = se.site_id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = se.site_id
);

UPDATE site_deployments sd
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = sd.site_id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM tenants t WHERE t.id = sd.site_id
);

-- Billing models → orgId (tenantId → orgId)
UPDATE subscriptions SET org_id = "tenantId" WHERE org_id IS NULL;
UPDATE invoices SET org_id = "tenantId" WHERE org_id IS NULL;
UPDATE payments SET org_id = "tenantId" WHERE org_id IS NULL;
UPDATE usage_tracking SET org_id = "tenantId" WHERE org_id IS NULL;

-- RBAC models → orgId
-- Uwaga: W bazie danych kolumna nazywa się "orgId" (camelCase), a my dodaliśmy "org_id" (snake_case)
-- Kopiujemy wartość z "orgId" do "org_id" dla zgodności
-- Te kolumny już wskazują na tenants (które teraz są organizations), więc po prostu kopiujemy wartość
UPDATE roles SET org_id = "orgId" WHERE org_id IS NULL AND "orgId" IS NOT NULL;
UPDATE user_roles SET org_id = "orgId" WHERE org_id IS NULL AND "orgId" IS NOT NULL;
UPDATE org_policies SET org_id = "orgId" WHERE org_id IS NULL AND "orgId" IS NOT NULL;

-- Marketing models → orgId
-- Uwaga: W bazie danych kolumna nazywa się "orgId" (camelCase), a my dodaliśmy "org_id" (snake_case)
-- Kopiujemy wartość z "orgId" do "org_id" dla zgodności
UPDATE marketing_campaigns SET org_id = "orgId" WHERE org_id IS NULL AND "orgId" IS NOT NULL;
UPDATE marketing_distribution_drafts SET org_id = "orgId" WHERE org_id IS NULL AND "orgId" IS NOT NULL;
UPDATE marketing_channel_connections SET org_id = "orgId" WHERE org_id IS NULL AND "orgId" IS NOT NULL;
UPDATE marketing_publish_jobs SET org_id = "orgId" WHERE org_id IS NULL AND "orgId" IS NOT NULL;
UPDATE marketing_publish_results SET org_id = "orgId" WHERE org_id IS NULL AND "orgId" IS NOT NULL;

-- ============================================
-- Faza 5: Dodanie Foreign Keys
-- ============================================

-- User → Organization
ALTER TABLE users
  ADD CONSTRAINT fk_users_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- UserTenant → Organization
ALTER TABLE user_tenants
  ADD CONSTRAINT fk_user_tenants_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Content models → Site
ALTER TABLE content_types
  ADD CONSTRAINT fk_content_types_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE content_entries
  ADD CONSTRAINT fk_content_entries_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE collections
  ADD CONSTRAINT fk_collections_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE collection_items
  ADD CONSTRAINT fk_collection_items_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE collection_item_versions
  ADD CONSTRAINT fk_collection_item_versions_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE media_files
  ADD CONSTRAINT fk_media_files_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE content_reviews
  ADD CONSTRAINT fk_content_reviews_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE content_comments
  ADD CONSTRAINT fk_content_comments_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE tasks
  ADD CONSTRAINT fk_tasks_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE collection_roles
  ADD CONSTRAINT fk_collection_roles_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE webhooks
  ADD CONSTRAINT fk_webhooks_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE hooks
  ADD CONSTRAINT fk_hooks_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE webhook_deliveries
  ADD CONSTRAINT fk_webhook_deliveries_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE dev_domain_records
  ADD CONSTRAINT fk_dev_domain_records_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE seo_settings
  ADD CONSTRAINT fk_seo_settings_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE site_environments
  ADD CONSTRAINT fk_site_environments_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE pages
  ADD CONSTRAINT fk_pages_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

-- SiteFeatureOverride, SiteSnapshot, SiteEvent, SiteDeployment
ALTER TABLE site_feature_overrides
  ADD CONSTRAINT fk_site_feature_overrides_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE site_snapshots
  ADD CONSTRAINT fk_site_snapshots_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE site_events
  ADD CONSTRAINT fk_site_events_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

ALTER TABLE site_deployments
  ADD CONSTRAINT fk_site_deployments_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE;

-- Billing models → Organization
ALTER TABLE subscriptions
  ADD CONSTRAINT fk_subscriptions_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE invoices
  ADD CONSTRAINT fk_invoices_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE payments
  ADD CONSTRAINT fk_payments_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE usage_tracking
  ADD CONSTRAINT fk_usage_tracking_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- RBAC models → Organization
-- Uwaga: Najpierw musimy usunąć stare foreign keys wskazujące na tenants
ALTER TABLE roles DROP CONSTRAINT IF EXISTS "roles_orgId_fkey";
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS "user_roles_orgId_fkey";
ALTER TABLE org_policies DROP CONSTRAINT IF EXISTS "org_policies_orgId_fkey";

-- Teraz dodajemy nowe foreign keys wskazujące na organizations
ALTER TABLE roles
  ADD CONSTRAINT fk_roles_org FOREIGN KEY ("orgId") REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_org FOREIGN KEY ("orgId") REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE org_policies
  ADD CONSTRAINT fk_org_policies_org FOREIGN KEY ("orgId") REFERENCES organizations(id) ON DELETE CASCADE;

-- Marketing models → Organization
-- Uwaga: Najpierw musimy usunąć stare foreign keys wskazujące na tenants (jeśli istnieją)
ALTER TABLE marketing_campaigns DROP CONSTRAINT IF EXISTS "marketing_campaigns_orgId_fkey";
ALTER TABLE marketing_distribution_drafts DROP CONSTRAINT IF EXISTS "marketing_distribution_drafts_orgId_fkey";
ALTER TABLE marketing_channel_connections DROP CONSTRAINT IF EXISTS "marketing_channel_connections_orgId_fkey";
ALTER TABLE marketing_publish_jobs DROP CONSTRAINT IF EXISTS "marketing_publish_jobs_orgId_fkey";
ALTER TABLE marketing_publish_results DROP CONSTRAINT IF EXISTS "marketing_publish_results_orgId_fkey";

-- Teraz dodajemy nowe foreign keys wskazujące na organizations
ALTER TABLE marketing_campaigns
  ADD CONSTRAINT fk_marketing_campaigns_org FOREIGN KEY ("orgId") REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE marketing_distribution_drafts
  ADD CONSTRAINT fk_marketing_distribution_drafts_org FOREIGN KEY ("orgId") REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE marketing_channel_connections
  ADD CONSTRAINT fk_marketing_channel_connections_org FOREIGN KEY ("orgId") REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE marketing_publish_jobs
  ADD CONSTRAINT fk_marketing_publish_jobs_org FOREIGN KEY ("orgId") REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE marketing_publish_results
  ADD CONSTRAINT fk_marketing_publish_results_org FOREIGN KEY ("orgId") REFERENCES organizations(id) ON DELETE CASCADE;
