-- Ensure platform system roles exist before migrating the last legacy user flags.
INSERT INTO "platform_roles" ("id", "name", "description", "type", "isImmutable", "createdAt", "updatedAt")
VALUES
  ('platform-role-root', 'Platform Root', 'Emergency break-glass root role with unrestricted platform access', 'SYSTEM', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('platform-role-admin', 'Platform Admin', 'Operational administrator for the entire platform', 'SYSTEM', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('platform-role-developer', 'Platform Developer', 'Technical role for platform developers and internal engineering', 'SYSTEM', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('platform-role-support', 'Platform Support', 'Support role with read-heavy access and audited impersonation', 'SYSTEM', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO UPDATE
SET
  "description" = EXCLUDED."description",
  "type" = EXCLUDED."type",
  "isImmutable" = EXCLUDED."isImmutable",
  "updatedAt" = CURRENT_TIMESTAMP;

-- Re-run the legacy org membership normalization so dropping old user columns is safe.
INSERT INTO "user_orgs" ("id", "user_id", "org_id", "role", "created_at", "updated_at")
SELECT
  'legacy-user-org:' || u."id" || ':' || u."org_id",
  u."id",
  u."org_id",
  CASE
    WHEN LOWER(COALESCE(u."platformRole", u."role", '')) IN ('owner', 'admin', 'org_admin', 'super_admin', 'platform_admin')
      THEN 'org_admin'
    ELSE 'org_member'
  END,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "users" u
WHERE u."org_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "user_orgs" uo
    WHERE uo."user_id" = u."id"
      AND uo."org_id" = u."org_id"
  );

UPDATE "user_orgs"
SET
  "role" = CASE
    WHEN LOWER(COALESCE("role", '')) IN ('owner', 'admin', 'org_admin', 'super_admin', 'platform_admin')
      THEN 'org_admin'
    ELSE 'org_member'
  END,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "role" NOT IN ('org_admin', 'org_member');

-- Backfill platform assignments from the final legacy platform/super flags before removing them.
INSERT INTO "platform_user_roles" ("id", "userId", "roleId", "createdAt")
SELECT
  'legacy-platform-root:' || u."id",
  u."id",
  pr."id",
  CURRENT_TIMESTAMP
FROM "users" u
JOIN "platform_roles" pr
  ON pr."name" = 'Platform Root'
WHERE
  u."isSuperAdmin" = TRUE
  OR LOWER(COALESCE(u."systemRole", '')) = 'super_admin'
  OR LOWER(COALESCE(u."role", '')) = 'super_admin'
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "platform_user_roles" ("id", "userId", "roleId", "createdAt")
SELECT
  'legacy-platform-admin:' || u."id",
  u."id",
  pr."id",
  CURRENT_TIMESTAMP
FROM "users" u
JOIN "platform_roles" pr
  ON pr."name" = 'Platform Admin'
WHERE
  NOT (
    u."isSuperAdmin" = TRUE
    OR LOWER(COALESCE(u."systemRole", '')) = 'super_admin'
    OR LOWER(COALESCE(u."role", '')) = 'super_admin'
  )
  AND (
    LOWER(COALESCE(u."role", '')) = 'platform_admin'
    OR LOWER(COALESCE(u."platformRole", '')) = 'platform_admin'
    OR LOWER(COALESCE(u."systemRole", '')) = 'system_admin'
  )
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "platform_user_roles" ("id", "userId", "roleId", "createdAt")
SELECT
  'legacy-platform-developer:' || u."id",
  u."id",
  pr."id",
  CURRENT_TIMESTAMP
FROM "users" u
JOIN "platform_roles" pr
  ON pr."name" = 'Platform Developer'
WHERE
  NOT (
    u."isSuperAdmin" = TRUE
    OR LOWER(COALESCE(u."systemRole", '')) = 'super_admin'
    OR LOWER(COALESCE(u."role", '')) = 'super_admin'
    OR LOWER(COALESCE(u."role", '')) = 'platform_admin'
    OR LOWER(COALESCE(u."platformRole", '')) = 'platform_admin'
    OR LOWER(COALESCE(u."systemRole", '')) = 'system_admin'
  )
  AND LOWER(COALESCE(u."systemRole", '')) = 'system_dev'
ON CONFLICT ("userId", "roleId") DO NOTHING;

INSERT INTO "platform_user_roles" ("id", "userId", "roleId", "createdAt")
SELECT
  'legacy-platform-support:' || u."id",
  u."id",
  pr."id",
  CURRENT_TIMESTAMP
FROM "users" u
JOIN "platform_roles" pr
  ON pr."name" = 'Platform Support'
WHERE
  NOT (
    u."isSuperAdmin" = TRUE
    OR LOWER(COALESCE(u."systemRole", '')) = 'super_admin'
    OR LOWER(COALESCE(u."role", '')) = 'super_admin'
    OR LOWER(COALESCE(u."role", '')) = 'platform_admin'
    OR LOWER(COALESCE(u."platformRole", '')) = 'platform_admin'
    OR LOWER(COALESCE(u."systemRole", '')) = 'system_admin'
    OR LOWER(COALESCE(u."systemRole", '')) = 'system_dev'
  )
  AND LOWER(COALESCE(u."systemRole", '')) = 'system_support'
ON CONFLICT ("userId", "roleId") DO NOTHING;

DROP INDEX IF EXISTS "users_isSuperAdmin_idx";
DROP INDEX IF EXISTS "users_systemRole_idx";
DROP INDEX IF EXISTS "users_siteRole_idx";
DROP INDEX IF EXISTS "users_platformRole_idx";

ALTER TABLE "users"
  DROP COLUMN IF EXISTS "isSuperAdmin",
  DROP COLUMN IF EXISTS "systemRole",
  DROP COLUMN IF EXISTS "platformRole",
  DROP COLUMN IF EXISTS "siteRole",
  DROP COLUMN IF EXISTS "role";
