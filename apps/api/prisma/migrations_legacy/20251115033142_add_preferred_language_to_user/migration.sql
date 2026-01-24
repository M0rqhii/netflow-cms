-- DropForeignKey
ALTER TABLE "user_tenants" DROP CONSTRAINT "fk_user_tenants_tenant";

-- DropForeignKey
ALTER TABLE "user_tenants" DROP CONSTRAINT "fk_user_tenants_user";

-- DropIndex
DROP INDEX "idx_collection_items_data_gin";

-- DropIndex
DROP INDEX "idx_content_entries_data_gin";

-- DropIndex
DROP INDEX "idx_users_email";

-- AlterTable
ALTER TABLE "user_tenants" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "preferredLanguage" TEXT NOT NULL DEFAULT 'en';

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "user_tenants_user_tenant_unique" RENAME TO "user_tenants_user_id_tenant_id_key";
