-- Migration: Add user_orgs table for org memberships
-- Date: 2026-01-24

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "user_orgs" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'viewer',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "user_orgs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_orgs_user_id_org_id_key" ON "user_orgs"("user_id", "org_id");
CREATE INDEX IF NOT EXISTS "user_orgs_org_id_idx" ON "user_orgs"("org_id");
CREATE INDEX IF NOT EXISTS "user_orgs_user_id_idx" ON "user_orgs"("user_id");

ALTER TABLE "user_orgs" ADD CONSTRAINT "user_orgs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;
ALTER TABLE "user_orgs" ADD CONSTRAINT "user_orgs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

-- Backfill memberships from existing users
INSERT INTO "user_orgs" ("id", "user_id", "org_id", "role", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "id", "org_id", "role", NOW(), NOW()
FROM "users"
WHERE "org_id" IS NOT NULL
ON CONFLICT ("user_id", "org_id") DO NOTHING;
