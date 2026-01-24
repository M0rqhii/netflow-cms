-- Create user_invites table for org/site invitations
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "user_invites" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "org_id" TEXT NOT NULL,
  "site_id" TEXT,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'viewer',
  "token" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "invited_by_id" TEXT,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "accepted_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_invites_token_key" ON "user_invites"("token");
CREATE INDEX IF NOT EXISTS "user_invites_org_id_idx" ON "user_invites"("org_id");
CREATE INDEX IF NOT EXISTS "user_invites_site_id_idx" ON "user_invites"("site_id");
CREATE INDEX IF NOT EXISTS "user_invites_email_idx" ON "user_invites"("email");
CREATE INDEX IF NOT EXISTS "user_invites_status_idx" ON "user_invites"("status");
CREATE INDEX IF NOT EXISTS "user_invites_expires_at_idx" ON "user_invites"("expires_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_invites_org_id_fkey'
  ) THEN
    ALTER TABLE "user_invites"
      ADD CONSTRAINT "user_invites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_invites_site_id_fkey'
  ) THEN
    ALTER TABLE "user_invites"
      ADD CONSTRAINT "user_invites_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_invites_invited_by_id_fkey'
  ) THEN
    ALTER TABLE "user_invites"
      ADD CONSTRAINT "user_invites_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- RLS policy for org isolation
ALTER TABLE "user_invites" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation_user_invites ON "user_invites";
CREATE POLICY org_isolation_user_invites ON "user_invites"
  FOR ALL USING ("org_id" = current_setting('app.current_org_id', true)::text);
