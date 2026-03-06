-- AlterTable
ALTER TABLE "users"
ADD COLUMN "language_chosen_at" TIMESTAMP(3),
ADD COLUMN "first_name" TEXT,
ADD COLUMN "last_name" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "must_complete_onboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "onboarding_completed_at" TIMESTAMP(3),
ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- Backfill existing accounts as language-selected to avoid forcing bilingual notifications for existing users
UPDATE "users"
SET "language_chosen_at" = CURRENT_TIMESTAMP
WHERE "language_chosen_at" IS NULL
  AND "preferredLanguage" IN ('pl', 'en');

-- CreateTable
CREATE TABLE "password_action_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'reset_password',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_action_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_action_tokens_token_hash_key" ON "password_action_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_action_tokens_user_id_purpose_idx" ON "password_action_tokens"("user_id", "purpose");

-- CreateIndex
CREATE INDEX "password_action_tokens_expires_at_idx" ON "password_action_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "password_action_tokens_used_at_idx" ON "password_action_tokens"("used_at");

-- AddForeignKey
ALTER TABLE "password_action_tokens" ADD CONSTRAINT "password_action_tokens_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
