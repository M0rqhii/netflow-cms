-- CreateTable: site_feature_overrides
-- Per-site feature overrides (enable/disable features independent of plan)
CREATE TABLE IF NOT EXISTS "site_feature_overrides" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_feature_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "site_feature_overrides_siteId_featureKey_key" ON "site_feature_overrides"("siteId", "featureKey");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "site_feature_overrides_siteId_idx" ON "site_feature_overrides"("siteId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "site_feature_overrides_featureKey_idx" ON "site_feature_overrides"("featureKey");

-- AddForeignKey
ALTER TABLE "site_feature_overrides" ADD CONSTRAINT "site_feature_overrides_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;









