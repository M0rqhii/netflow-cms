-- Add billing_info JSON field to users for account billing preferences
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "billing_info" JSONB NOT NULL DEFAULT '{}'::jsonb;
