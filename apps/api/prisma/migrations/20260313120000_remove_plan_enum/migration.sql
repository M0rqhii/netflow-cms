-- Remove unused Plan enum and update subscription default
DROP TYPE IF EXISTS "Plan";
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DEFAULT 'free';
