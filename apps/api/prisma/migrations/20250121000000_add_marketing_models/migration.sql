-- Migration: Add Marketing & Distribution models
-- Date: 2025-01-21
-- Description: Implements marketing campaigns, distribution drafts, channel connections, publish jobs, and publish results

-- ============================================
-- 1. Campaign table - kampanie marketingowe
-- ============================================
CREATE TABLE "marketing_campaigns" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "marketing_campaigns_orgId_siteId_idx" ON "marketing_campaigns"("orgId", "siteId");
CREATE INDEX "marketing_campaigns_orgId_status_idx" ON "marketing_campaigns"("orgId", "status");
CREATE INDEX "marketing_campaigns_siteId_idx" ON "marketing_campaigns"("siteId");
CREATE INDEX "marketing_campaigns_createdAt_idx" ON "marketing_campaigns"("createdAt");

-- ============================================
-- 2. DistributionDraft table - wersje postów do publikacji
-- ============================================
CREATE TABLE "marketing_distribution_drafts" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "campaignId" TEXT,
    "contentId" TEXT,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "channels" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scheduledAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_distribution_drafts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "marketing_distribution_drafts" ADD CONSTRAINT "marketing_distribution_drafts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_distribution_drafts" ADD CONSTRAINT "marketing_distribution_drafts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketing_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "marketing_distribution_drafts_orgId_siteId_idx" ON "marketing_distribution_drafts"("orgId", "siteId");
CREATE INDEX "marketing_distribution_drafts_orgId_status_idx" ON "marketing_distribution_drafts"("orgId", "status");
CREATE INDEX "marketing_distribution_drafts_campaignId_idx" ON "marketing_distribution_drafts"("campaignId");
CREATE INDEX "marketing_distribution_drafts_siteId_idx" ON "marketing_distribution_drafts"("siteId");
CREATE INDEX "marketing_distribution_drafts_createdAt_idx" ON "marketing_distribution_drafts"("createdAt");

-- ============================================
-- 3. ChannelConnection table - połączenia z kanałami social media
-- ============================================
CREATE TABLE "marketing_channel_connections" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "channelId" TEXT,
    "channelName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "credentials" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "connectedById" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_channel_connections_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "marketing_channel_connections" ADD CONSTRAINT "marketing_channel_connections_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "marketing_channel_connections_orgId_siteId_channel_key" ON "marketing_channel_connections"("orgId", "siteId", "channel");
CREATE INDEX "marketing_channel_connections_orgId_siteId_idx" ON "marketing_channel_connections"("orgId", "siteId");
CREATE INDEX "marketing_channel_connections_channel_idx" ON "marketing_channel_connections"("channel");
CREATE INDEX "marketing_channel_connections_status_idx" ON "marketing_channel_connections"("status");

-- ============================================
-- 4. PublishJob table - joby publikacji
-- ============================================
CREATE TABLE "marketing_publish_jobs" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "campaignId" TEXT,
    "draftId" TEXT,
    "channels" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketing_publish_jobs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "marketing_publish_jobs" ADD CONSTRAINT "marketing_publish_jobs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_publish_jobs" ADD CONSTRAINT "marketing_publish_jobs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketing_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "marketing_publish_jobs" ADD CONSTRAINT "marketing_publish_jobs_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "marketing_distribution_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "marketing_publish_jobs_orgId_siteId_idx" ON "marketing_publish_jobs"("orgId", "siteId");
CREATE INDEX "marketing_publish_jobs_orgId_status_idx" ON "marketing_publish_jobs"("orgId", "status");
CREATE INDEX "marketing_publish_jobs_campaignId_idx" ON "marketing_publish_jobs"("campaignId");
CREATE INDEX "marketing_publish_jobs_draftId_idx" ON "marketing_publish_jobs"("draftId");
CREATE INDEX "marketing_publish_jobs_siteId_idx" ON "marketing_publish_jobs"("siteId");
CREATE INDEX "marketing_publish_jobs_createdAt_idx" ON "marketing_publish_jobs"("createdAt");

-- ============================================
-- 5. PublishResult table - wyniki publikacji per kanał
-- ============================================
CREATE TABLE "marketing_publish_results" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "externalId" TEXT,
    "url" TEXT,
    "error" TEXT,
    "publishedAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketing_publish_results_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "marketing_publish_results" ADD CONSTRAINT "marketing_publish_results_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "marketing_publish_results" ADD CONSTRAINT "marketing_publish_results_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "marketing_publish_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "marketing_publish_results_jobId_idx" ON "marketing_publish_results"("jobId");
CREATE INDEX "marketing_publish_results_orgId_siteId_idx" ON "marketing_publish_results"("orgId", "siteId");
CREATE INDEX "marketing_publish_results_channel_idx" ON "marketing_publish_results"("channel");
CREATE INDEX "marketing_publish_results_status_idx" ON "marketing_publish_results"("status");
CREATE INDEX "marketing_publish_results_createdAt_idx" ON "marketing_publish_results"("createdAt");

-- ============================================
-- 6. Enable RLS (Row Level Security) for Marketing tables
-- ============================================
ALTER TABLE "marketing_campaigns" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "marketing_distribution_drafts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "marketing_channel_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "marketing_publish_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "marketing_publish_results" ENABLE ROW LEVEL SECURITY;

-- RLS Policy for marketing_campaigns
CREATE POLICY tenant_isolation_marketing_campaigns ON "marketing_campaigns"
    FOR ALL
    USING ("orgId" = current_setting('app.current_tenant_id', true)::TEXT);

-- RLS Policy for marketing_distribution_drafts
CREATE POLICY tenant_isolation_marketing_distribution_drafts ON "marketing_distribution_drafts"
    FOR ALL
    USING ("orgId" = current_setting('app.current_tenant_id', true)::TEXT);

-- RLS Policy for marketing_channel_connections
CREATE POLICY tenant_isolation_marketing_channel_connections ON "marketing_channel_connections"
    FOR ALL
    USING ("orgId" = current_setting('app.current_tenant_id', true)::TEXT);

-- RLS Policy for marketing_publish_jobs
CREATE POLICY tenant_isolation_marketing_publish_jobs ON "marketing_publish_jobs"
    FOR ALL
    USING ("orgId" = current_setting('app.current_tenant_id', true)::TEXT);

-- RLS Policy for marketing_publish_results
CREATE POLICY tenant_isolation_marketing_publish_results ON "marketing_publish_results"
    FOR ALL
    USING ("orgId" = current_setting('app.current_tenant_id', true)::TEXT);

