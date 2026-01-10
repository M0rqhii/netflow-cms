-- AlterTable
ALTER TABLE "users" ADD COLUMN "siteRole" TEXT NOT NULL DEFAULT 'viewer';
ALTER TABLE "users" ADD COLUMN "platformRole" TEXT;
ALTER TABLE "users" ADD COLUMN "systemRole" TEXT;
ALTER TABLE "users" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "users_isSuperAdmin_idx" ON "users"("isSuperAdmin");
CREATE INDEX "users_systemRole_idx" ON "users"("systemRole");
CREATE INDEX "users_siteRole_idx" ON "users"("siteRole");
CREATE INDEX "users_platformRole_idx" ON "users"("platformRole");

-- Update existing users: map old role to new siteRole
UPDATE "users" SET "siteRole" = CASE
  WHEN "role" = 'super_admin' THEN 'owner'
  WHEN "role" = 'tenant_admin' THEN 'admin'
  WHEN "role" = 'editor' THEN 'editor'
  WHEN "role" = 'viewer' THEN 'viewer'
  ELSE 'viewer'
END;

-- Update existing users: set platformRole for super_admin
UPDATE "users" SET "platformRole" = 'admin', "systemRole" = 'super_admin', "isSuperAdmin" = true WHERE "role" = 'super_admin';

-- Update existing users: set platformRole for others (default to 'user')
UPDATE "users" SET "platformRole" = 'user' WHERE "platformRole" IS NULL;









