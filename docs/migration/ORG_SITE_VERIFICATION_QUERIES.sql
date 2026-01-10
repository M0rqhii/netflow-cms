-- Verification Queries for Org + Site Migration
-- Use these queries to verify that the migration was successful

-- ============================================
-- 1. Sprawdź czy wszystkie tenants mają organizations
-- ============================================
SELECT 
  COUNT(*) as total_tenants,
  COUNT(o.id) as organizations_created,
  COUNT(*) - COUNT(o.id) as missing_orgs
FROM tenants t
LEFT JOIN organizations o ON t.id = o.id;

-- ============================================
-- 2. Sprawdź czy wszystkie tenants mają sites
-- ============================================
SELECT 
  COUNT(*) as total_tenants,
  COUNT(s.id) as sites_created,
  COUNT(*) - COUNT(s.id) as missing_sites
FROM tenants t
LEFT JOIN sites s ON t.id = s.org_id;

-- ============================================
-- 3. Sprawdź czy wszystkie users mają org_id
-- ============================================
SELECT 
  COUNT(*) as total_users,
  COUNT(org_id) as users_with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_ids
FROM users;

-- ============================================
-- 4. Sprawdź czy wszystkie content entries mają site_id
-- ============================================
SELECT 
  COUNT(*) as total_content_entries,
  COUNT(site_id) as entries_with_site_id,
  COUNT(*) - COUNT(site_id) as missing_site_ids
FROM content_entries;

-- ============================================
-- 5. Sprawdź czy wszystkie subscriptions mają org_id
-- ============================================
SELECT 
  COUNT(*) as total_subscriptions,
  COUNT(org_id) as subscriptions_with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_ids
FROM subscriptions;

-- ============================================
-- 6. Sprawdź czy wszystkie collections mają site_id
-- ============================================
SELECT 
  COUNT(*) as total_collections,
  COUNT(site_id) as collections_with_site_id,
  COUNT(*) - COUNT(site_id) as missing_site_ids
FROM collections;

-- ============================================
-- 7. Sprawdź czy nie ma duplikatów w users (org_id)
-- ============================================
SELECT org_id, COUNT(*) as count
FROM users
WHERE org_id IS NOT NULL
GROUP BY org_id
HAVING COUNT(*) > 1;

-- ============================================
-- 8. Sprawdź czy nie ma duplikatów w content_entries (site_id)
-- ============================================
SELECT site_id, COUNT(*) as count
FROM content_entries
WHERE site_id IS NOT NULL
GROUP BY site_id
HAVING COUNT(*) > 1;

-- ============================================
-- 9. Sprawdź czy foreign keys działają (users → organizations)
-- ============================================
SELECT 
  COUNT(*) as total_users,
  COUNT(o.id) as users_with_valid_org,
  COUNT(*) - COUNT(o.id) as users_with_invalid_org
FROM users u
LEFT JOIN organizations o ON u.org_id = o.id
WHERE u.org_id IS NOT NULL;

-- ============================================
-- 10. Sprawdź czy foreign keys działają (content_entries → sites)
-- ============================================
SELECT 
  COUNT(*) as total_content_entries,
  COUNT(s.id) as entries_with_valid_site,
  COUNT(*) - COUNT(s.id) as entries_with_invalid_site
FROM content_entries ce
LEFT JOIN sites s ON ce.site_id = s.id
WHERE ce.site_id IS NOT NULL;

-- ============================================
-- 11. Sprawdź czy wszystkie billing records mają org_id
-- ============================================
SELECT 
  'subscriptions' as table_name,
  COUNT(*) as total,
  COUNT(org_id) as with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_id
FROM subscriptions
UNION ALL
SELECT 
  'invoices' as table_name,
  COUNT(*) as total,
  COUNT(org_id) as with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_id
FROM invoices
UNION ALL
SELECT 
  'payments' as table_name,
  COUNT(*) as total,
  COUNT(org_id) as with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_id
FROM payments
UNION ALL
SELECT 
  'usage_tracking' as table_name,
  COUNT(*) as total,
  COUNT(org_id) as with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_id
FROM usage_tracking;

-- ============================================
-- 12. Sprawdź czy wszystkie RBAC records mają org_id
-- ============================================
SELECT 
  'roles' as table_name,
  COUNT(*) as total,
  COUNT(org_id) as with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_id
FROM roles
UNION ALL
SELECT 
  'user_roles' as table_name,
  COUNT(*) as total,
  COUNT(org_id) as with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_id
FROM user_roles
UNION ALL
SELECT 
  'org_policies' as table_name,
  COUNT(*) as total,
  COUNT(org_id) as with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_id
FROM org_policies;

-- ============================================
-- 13. Sprawdź czy wszystkie content models mają site_id
-- ============================================
SELECT 
  'content_types' as table_name,
  COUNT(*) as total,
  COUNT(site_id) as with_site_id,
  COUNT(*) - COUNT(site_id) as missing_site_id
FROM content_types
UNION ALL
SELECT 
  'collections' as table_name,
  COUNT(*) as total,
  COUNT(site_id) as with_site_id,
  COUNT(*) - COUNT(site_id) as missing_site_id
FROM collections
UNION ALL
SELECT 
  'collection_items' as table_name,
  COUNT(*) as total,
  COUNT(site_id) as with_site_id,
  COUNT(*) - COUNT(site_id) as missing_site_id
FROM collection_items
UNION ALL
SELECT 
  'media_files' as table_name,
  COUNT(*) as total,
  COUNT(site_id) as with_site_id,
  COUNT(*) - COUNT(site_id) as missing_site_id
FROM media_files;

-- ============================================
-- 14. Sprawdź czy wszystkie sites mają prawidłowe org_id
-- ============================================
SELECT 
  COUNT(*) as total_sites,
  COUNT(o.id) as sites_with_valid_org,
  COUNT(*) - COUNT(o.id) as sites_with_invalid_org
FROM sites s
LEFT JOIN organizations o ON s.org_id = o.id;

-- ============================================
-- 15. Sprawdź czy nie ma orphaned records (bez org_id lub site_id)
-- ============================================
SELECT 
  'users' as table_name,
  COUNT(*) as orphaned_count
FROM users
WHERE org_id IS NULL
UNION ALL
SELECT 
  'content_entries' as table_name,
  COUNT(*) as orphaned_count
FROM content_entries
WHERE site_id IS NULL
UNION ALL
SELECT 
  'subscriptions' as table_name,
  COUNT(*) as orphaned_count
FROM subscriptions
WHERE org_id IS NULL
UNION ALL
SELECT 
  'collections' as table_name,
  COUNT(*) as orphaned_count
FROM collections
WHERE site_id IS NULL;

-- ============================================
-- 16. Sprawdź czy wszystkie sites mają unikalne slug w ramach org
-- ============================================
SELECT org_id, slug, COUNT(*) as count
FROM sites
GROUP BY org_id, slug
HAVING COUNT(*) > 1;

-- ============================================
-- 17. Sprawdź czy wszystkie organizations mają unikalne slug
-- ============================================
SELECT slug, COUNT(*) as count
FROM organizations
GROUP BY slug
HAVING COUNT(*) > 1;

-- ============================================
-- 18. Sprawdź czy dane są spójne (tenant → org → site)
-- ============================================
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  o.id as org_id,
  o.name as org_name,
  s.id as site_id,
  s.name as site_name,
  CASE 
    WHEN o.id IS NULL THEN 'Missing Organization'
    WHEN s.id IS NULL THEN 'Missing Site'
    ELSE 'OK'
  END as status
FROM tenants t
LEFT JOIN organizations o ON t.id = o.id
LEFT JOIN sites s ON o.id = s.org_id
ORDER BY t.id;

-- ============================================
-- 19. Sprawdź czy user_tenants mają org_id
-- ============================================
SELECT 
  COUNT(*) as total_user_tenants,
  COUNT(org_id) as with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_id
FROM user_tenants;

-- ============================================
-- 20. Sprawdź czy wszystkie marketing records mają org_id
-- ============================================
SELECT 
  'marketing_campaigns' as table_name,
  COUNT(*) as total,
  COUNT(org_id) as with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_id
FROM marketing_campaigns
UNION ALL
SELECT 
  'marketing_distribution_drafts' as table_name,
  COUNT(*) as total,
  COUNT(org_id) as with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_id
FROM marketing_distribution_drafts
UNION ALL
SELECT 
  'marketing_channel_connections' as table_name,
  COUNT(*) as total,
  COUNT(org_id) as with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_id
FROM marketing_channel_connections
UNION ALL
SELECT 
  'marketing_publish_jobs' as table_name,
  COUNT(*) as total,
  COUNT(org_id) as with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_id
FROM marketing_publish_jobs
UNION ALL
SELECT 
  'marketing_publish_results' as table_name,
  COUNT(*) as total,
  COUNT(org_id) as with_org_id,
  COUNT(*) - COUNT(org_id) as missing_org_id
FROM marketing_publish_results;
