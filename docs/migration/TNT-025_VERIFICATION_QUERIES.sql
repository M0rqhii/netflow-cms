-- TNT-025: Verification Queries for UserTenant Migration
-- Run these queries after migration to verify data integrity

-- 1. Check if all existing users have memberships
-- Should return 0 rows (all users should have memberships)
SELECT 
  u.id,
  u.email,
  u."tenantId" as legacy_tenant_id,
  COUNT(ut.id) as membership_count
FROM users u
LEFT JOIN user_tenants ut ON u.id = ut.user_id
WHERE u."tenantId" IS NOT NULL
GROUP BY u.id, u.email, u."tenantId"
HAVING COUNT(ut.id) = 0;

-- 2. Check for duplicate memberships
-- Should return 0 rows (no duplicates allowed)
SELECT 
  user_id,
  tenant_id,
  COUNT(*) as count
FROM user_tenants
GROUP BY user_id, tenant_id
HAVING COUNT(*) > 1;

-- 3. Verify foreign key integrity
-- Should return same count as total memberships
SELECT COUNT(*) as total_memberships
FROM user_tenants ut
INNER JOIN users u ON ut.user_id = u.id
INNER JOIN tenants t ON ut.tenant_id = t.id;

-- 4. Check for orphaned memberships (users that don't exist)
-- Should return 0 rows
SELECT ut.*
FROM user_tenants ut
LEFT JOIN users u ON ut.user_id = u.id
WHERE u.id IS NULL;

-- 5. Check for orphaned memberships (tenants that don't exist)
-- Should return 0 rows
SELECT ut.*
FROM user_tenants ut
LEFT JOIN tenants t ON ut.tenant_id = t.id
WHERE t.id IS NULL;

-- 6. Verify membership data matches legacy user data
-- Should return 0 rows (all memberships should match legacy data)
SELECT 
  u.id,
  u.email,
  u."tenantId" as legacy_tenant_id,
  u.role as legacy_role,
  ut.tenant_id as membership_tenant_id,
  ut.role as membership_role
FROM users u
INNER JOIN user_tenants ut ON u.id = ut.user_id
WHERE u."tenantId" IS NOT NULL
  AND (
    u."tenantId" != ut.tenant_id
    OR u.role != ut.role
  );

-- 7. Count total memberships vs total users
-- Should show similar counts (users with tenantId should have memberships)
SELECT 
  (SELECT COUNT(*) FROM users WHERE "tenantId" IS NOT NULL) as users_with_tenant,
  (SELECT COUNT(*) FROM user_tenants) as total_memberships;

-- 8. Check for users with multiple memberships (multi-tenant users)
-- This is expected for multi-tenant users
SELECT 
  user_id,
  COUNT(*) as membership_count,
  STRING_AGG(tenant_id::text, ', ') as tenant_ids
FROM user_tenants
GROUP BY user_id
HAVING COUNT(*) > 1
ORDER BY membership_count DESC;

-- 9. Verify role distribution
SELECT 
  role,
  COUNT(*) as count
FROM user_tenants
GROUP BY role
ORDER BY count DESC;

-- 10. Check for recent memberships (created after migration)
-- Should show memberships created after migration date
SELECT 
  ut.*,
  u.email,
  t.name as tenant_name
FROM user_tenants ut
INNER JOIN users u ON ut.user_id = u.id
INNER JOIN tenants t ON ut.tenant_id = t.id
WHERE ut.created_at > NOW() - INTERVAL '1 day'
ORDER BY ut.created_at DESC;

