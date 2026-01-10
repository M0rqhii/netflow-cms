# Migracja: Tenant → Organization + Site

**Status:** 📋 Plan  
**Data:** 2025-01-16  
**Priority:** P0 (Critical)

---

## Summary

Plan migracji z modelu `Tenant` (organizacja + strona w jednym) do rozdzielonych modeli `Organization` (organizacja) i `Site` (strona). Organizacja może mieć wiele Site, a Site należy do jednej Organization.

---

## 1. Nowa Struktura

### 1.1 Organization (Org)
**Cel:** Organizacja użytkowników na platformie

**Relacje:**
- Ma użytkowników (User)
- Ma wiele Site
- Ma billing (Subscription, Invoice, Payment)
- Ma RBAC (Role, UserRole, OrgPolicy)
- Ma marketing (Campaign, DistributionDraft, etc.)

### 1.2 Site
**Cel:** Strona/tenant należąca do Organization

**Relacje:**
- Należy do jednej Organization
- Ma treści (ContentType, ContentEntry, Collection)
- Ma media (MediaItem)
- Ma hosting (SiteDeployment, SiteSnapshot, SiteEvent)
- Ma SEO (SeoSettings)
- Ma strony (Page, SiteEnvironment)

---

## 2. Mapowanie tenantId → orgId / siteId

### 2.1 Modele → orgId (Organization)
Te modele będą używać `orgId` (billing, RBAC, marketing):

- ✅ `User` → `orgId`
- ✅ `UserOrg` (było UserTenant) → `orgId`
- ✅ `Subscription` → `orgId`
- ✅ `Invoice` → `orgId`
- ✅ `Payment` → `orgId`
- ✅ `UsageTracking` → `orgId`
- ✅ `Role` → `orgId` (już ma orgId w komentarzu)
- ✅ `UserRole` → `orgId` (już ma orgId w komentarzu)
- ✅ `OrgPolicy` → `orgId` (już ma orgId w komentarzu)
- ✅ `Campaign` → `orgId` (już ma orgId w komentarzu)
- ✅ `DistributionDraft` → `orgId` (już ma orgId w komentarzu)
- ✅ `ChannelConnection` → `orgId` (już ma orgId w komentarzu)
- ✅ `PublishJob` → `orgId` (już ma orgId w komentarzu)
- ✅ `PublishResult` → `orgId` (już ma orgId w komentarzu)

### 2.2 Modele → siteId (Site)
Te modele będą używać `siteId` (treści, media, hosting):

- ✅ `ContentType` → `siteId`
- ✅ `ContentEntry` → `siteId`
- ✅ `Collection` → `siteId`
- ✅ `CollectionItem` → `siteId`
- ✅ `CollectionItemVersion` → `siteId`
- ✅ `MediaItem` → `siteId` (już ma siteId)
- ✅ `ContentReview` → `siteId`
- ✅ `ContentComment` → `siteId`
- ✅ `Task` → `siteId`
- ✅ `CollectionRole` → `siteId`
- ✅ `Webhook` → `siteId`
- ✅ `Hook` → `siteId`
- ✅ `WebhookDelivery` → `siteId`
- ✅ `DevDomainRecord` → `siteId`
- ✅ `SeoSettings` → `siteId`
- ✅ `SiteEnvironment` → `siteId`
- ✅ `Page` → `siteId`
- ✅ `SiteFeatureOverride` → `siteId` (już ma siteId)
- ✅ `SiteSnapshot` → `siteId` (już ma siteId)
- ✅ `SiteEvent` → `siteId` (już ma siteId)
- ✅ `SiteDeployment` → `siteId` (już ma siteId)

---

## 3. Strategia Migracji

### Faza 1: Przygotowanie (Bez przestojów)
1. ✅ Utworzyć tabele `organizations` i `sites`
2. ✅ Skopiować dane z `tenants` do `organizations`
3. ✅ Dla każdego `tenant` utworzyć `site` z `orgId`
4. ✅ Dodać kolumny `orgId` i `siteId` do wszystkich tabel (nullable)
5. ✅ Zaktualizować foreign keys (nullable)

### Faza 2: Migracja Danych (Bez przestojów)
1. ✅ Backfill: `organizations` z `tenants`
2. ✅ Backfill: `sites` z `tenants` (jeden site per org)
3. ✅ Backfill: `orgId` w tabelach billing/RBAC/marketing
4. ✅ Backfill: `siteId` w tabelach content/hosting
5. ✅ Backfill: `UserTenant` → `UserOrg` (zmiana nazwy + orgId)

### Faza 3: Weryfikacja
1. ✅ Sprawdzić czy wszystkie dane są zmigrowane
2. ✅ Sprawdzić czy foreign keys działają
3. ✅ Sprawdzić czy nie ma duplikatów
4. ✅ Testy aplikacji

### Faza 4: Finalizacja (Z przestojem - opcjonalne)
1. ⚠️ Usunąć nullable z kolumn `orgId` / `siteId`
2. ⚠️ Usunąć stare kolumny `tenantId`
3. ⚠️ Usunąć tabelę `tenants`
4. ⚠️ Zaktualizować aplikację (usunąć backward compatibility)

---

## 4. Skrypty SQL

### 4.1 Utworzenie tabel Organization i Site

```sql
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

-- Indeksy
CREATE INDEX IF NOT EXISTS idx_sites_org_id ON sites(org_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
```

### 4.2 Backfill: Organizations i Sites

```sql
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
  t.name || ' Site',
  t.slug || '-site',
  t.settings,
  t."createdAt",
  t."updatedAt"
FROM tenants t
ON CONFLICT (org_id, slug) DO NOTHING;
```

### 4.3 Dodanie kolumn orgId / siteId (nullable)

```sql
-- User → orgId
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_org_id ON users(org_id);

-- UserTenant → UserOrg (zmiana nazwy + orgId)
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

-- RBAC models → orgId (już mają orgId w komentarzu, ale trzeba dodać kolumnę)
ALTER TABLE roles ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE user_roles ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE org_policies ADD COLUMN IF NOT EXISTS org_id TEXT;

-- Marketing models → orgId
ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE marketing_distribution_drafts ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE marketing_channel_connections ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE marketing_publish_jobs ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE marketing_publish_results ADD COLUMN IF NOT EXISTS org_id TEXT;
```

### 4.4 Backfill: orgId / siteId

```sql
-- User → orgId (tenantId → orgId)
UPDATE users SET org_id = "tenantId" WHERE org_id IS NULL;

-- UserTenant → orgId (tenantId → orgId)
UPDATE user_tenants SET org_id = tenant_id WHERE org_id IS NULL;

-- Content models → siteId
-- Najpierw musimy znaleźć site_id dla każdego tenantId
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

UPDATE media_files mf
SET site_id = (
  SELECT s.id FROM sites s
  WHERE s.org_id = mf."tenantId"
  LIMIT 1
)
WHERE site_id IS NULL;

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

-- Billing models → orgId (tenantId → orgId)
UPDATE subscriptions SET org_id = "tenantId" WHERE org_id IS NULL;
UPDATE invoices SET org_id = "tenantId" WHERE org_id IS NULL;
UPDATE payments SET org_id = "tenantId" WHERE org_id IS NULL;
UPDATE usage_tracking SET org_id = "tenantId" WHERE org_id IS NULL;

-- RBAC models → orgId
UPDATE roles SET org_id = "orgId" WHERE org_id IS NULL; -- orgId to było tenantId
UPDATE user_roles SET org_id = "orgId" WHERE org_id IS NULL;
UPDATE org_policies SET org_id = "orgId" WHERE org_id IS NULL;

-- Marketing models → orgId
UPDATE marketing_campaigns SET org_id = "orgId" WHERE org_id IS NULL;
UPDATE marketing_distribution_drafts SET org_id = "orgId" WHERE org_id IS NULL;
UPDATE marketing_channel_connections SET org_id = "orgId" WHERE org_id IS NULL;
UPDATE marketing_publish_jobs SET org_id = "orgId" WHERE org_id IS NULL;
UPDATE marketing_publish_results SET org_id = "orgId" WHERE org_id IS NULL;
```

### 4.5 Dodanie Foreign Keys

```sql
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
ALTER TABLE roles
  ADD CONSTRAINT fk_roles_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE user_roles
  ADD CONSTRAINT fk_user_roles_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE org_policies
  ADD CONSTRAINT fk_org_policies_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- Marketing models → Organization
ALTER TABLE marketing_campaigns
  ADD CONSTRAINT fk_marketing_campaigns_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE marketing_distribution_drafts
  ADD CONSTRAINT fk_marketing_distribution_drafts_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE marketing_channel_connections
  ADD CONSTRAINT fk_marketing_channel_connections_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE marketing_publish_jobs
  ADD CONSTRAINT fk_marketing_publish_jobs_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE marketing_publish_results
  ADD CONSTRAINT fk_marketing_publish_results_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
```

---

## 5. Weryfikacja

### 5.1 Queries Weryfikacyjne

```sql
-- Sprawdź czy wszystkie tenants mają organizations
SELECT COUNT(*) as missing_orgs
FROM tenants t
LEFT JOIN organizations o ON t.id = o.id
WHERE o.id IS NULL;

-- Sprawdź czy wszystkie tenants mają sites
SELECT COUNT(*) as missing_sites
FROM tenants t
LEFT JOIN sites s ON t.id = s.org_id
WHERE s.id IS NULL;

-- Sprawdź czy wszystkie users mają org_id
SELECT COUNT(*) as missing_org_ids
FROM users
WHERE org_id IS NULL;

-- Sprawdź czy wszystkie content entries mają site_id
SELECT COUNT(*) as missing_site_ids
FROM content_entries
WHERE site_id IS NULL;

-- Sprawdź czy wszystkie subscriptions mają org_id
SELECT COUNT(*) as missing_org_ids
FROM subscriptions
WHERE org_id IS NULL;

-- Sprawdź czy nie ma duplikatów
SELECT org_id, COUNT(*) as count
FROM users
GROUP BY org_id
HAVING COUNT(*) > 1;

SELECT site_id, COUNT(*) as count
FROM content_entries
GROUP BY site_id
HAVING COUNT(*) > 1;
```

---

## 6. Rollback Plan

### 6.1 Procedura Rollbacku

**Scenariusz:** Migracja nie powiodła się

**Kroki:**
1. **Zatrzymaj aplikację** (opcjonalne)
2. **Usuń nowe kolumny** (org_id, site_id)
3. **Usuń tabele** (organizations, sites)
4. **Przywróć poprzednią wersję kodu**

**SQL Rollback:**
```sql
-- Usuń foreign keys
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_org;
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS fk_subscriptions_org;
-- ... (wszystkie foreign keys)

-- Usuń kolumny
ALTER TABLE users DROP COLUMN IF EXISTS org_id;
ALTER TABLE content_entries DROP COLUMN IF EXISTS site_id;
-- ... (wszystkie nowe kolumny)

-- Usuń tabele
DROP TABLE IF EXISTS sites CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;
```

---

## 7. Timeline

### Faza 1: Przygotowanie (1-2 dni)
- ✅ Utworzenie skryptów SQL
- ✅ Testowanie na staging
- ✅ Backup bazy danych

### Faza 2: Migracja (1 dzień)
- ✅ Wykonanie migracji na staging
- ✅ Weryfikacja danych
- ✅ Testy aplikacji

### Faza 3: Produkcja (1 dzień)
- ✅ Backup bazy danych
- ✅ Wykonanie migracji
- ✅ Weryfikacja
- ✅ Monitoring

### Faza 4: Finalizacja (opcjonalne, później)
- ⏳ Usunięcie backward compatibility
- ⏳ Usunięcie starych kolumn
- ⏳ Usunięcie tabeli tenants

---

## 8. Acceptance Criteria

- ✅ Wszystkie tenants mają odpowiadające organizations
- ✅ Wszystkie tenants mają odpowiadające sites
- ✅ Wszystkie dane są zmigrowane (org_id / site_id wypełnione)
- ✅ Foreign keys działają poprawnie
- ✅ Aplikacja działa bez błędów
- ✅ Testy przechodzą

---

## 9. Next Steps

1. **Przygotowanie:**
   - Utworzyć pełne skrypty SQL
   - Przetestować na staging
   - Przygotować rollback plan

2. **Migracja:**
   - Wykonać migrację na staging
   - Weryfikować dane
   - Testować aplikację

3. **Produkcja:**
   - Backup bazy danych
   - Wykonać migrację
   - Monitorować

4. **Finalizacja (później):**
   - Zaktualizować aplikację (usunąć backward compatibility)
   - Usunąć stare kolumny
   - Usunąć tabelę tenants

---

**Created by:** AI Assistant  
**Review Status:** Ready for Review  
**Next Review:** After staging testing
