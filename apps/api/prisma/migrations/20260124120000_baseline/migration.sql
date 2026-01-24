-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('BASIC', 'PRO');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "EnvironmentType" AS ENUM ('DRAFT', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "siteRole" TEXT NOT NULL DEFAULT 'viewer',
    "platformRole" TEXT,
    "systemRole" TEXT,
    "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
    "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
    "billing_info" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_types" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_entries" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "contentTypeId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "content_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schemaJson" JSONB NOT NULL,
    "workflowConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_items" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "publishedAt" TIMESTAMP(3),
    "etag" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_item_versions" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "status" "ItemStatus" NOT NULL,
    "changeNote" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_item_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_files" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "alt" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_orgs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_invites" (
    "id" TEXT NOT NULL,
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
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reviews" (
    "id" TEXT NOT NULL,
    "contentEntryId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_comments" (
    "id" TEXT NOT NULL,
    "contentEntryId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "contentEntryId" TEXT,
    "collectionItemId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "assignedToId" TEXT,
    "createdById" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_roles" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "canRead" BOOLEAN NOT NULL DEFAULT true,
    "canWrite" BOOLEAN NOT NULL DEFAULT false,
    "canPublish" BOOLEAN NOT NULL DEFAULT false,
    "canDelete" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhooks" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "collectionId" TEXT,
    "url" TEXT NOT NULL,
    "events" TEXT[],
    "secret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 3,
    "timeout" INTEGER NOT NULL DEFAULT 5000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hooks" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "collectionId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "handler" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "webhookId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "statusCode" INTEGER,
    "response" TEXT,
    "error" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'BASIC',
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "stripeSubscriptionId" TEXT,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "stripeInvoiceId" TEXT,
    "invoiceNumber" TEXT NOT NULL,
    "lineItems" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "paidAt" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_tracking" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "period" CHAR(7) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_email_log" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "from" TEXT,
    "replyTo" TEXT,
    "cc" TEXT,
    "bcc" TEXT,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dev_email_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dev_domain_records" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "targetUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'configured',
    "sslStatus" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dev_domain_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seo_settings" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "twitterCard" TEXT DEFAULT 'summary_large_image',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seo_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_environments" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" "EnvironmentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_environments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "environmentId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "PageStatus" NOT NULL DEFAULT 'DRAFT',
    "content" JSONB NOT NULL DEFAULT '{}',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_feature_overrides" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_feature_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_snapshots" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_events" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_deployments" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "env" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_deployments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capabilities" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "isDangerous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "isImmutable" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_capabilities" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_capabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "siteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_policies" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "capabilityKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "orgId" TEXT,
    "siteId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "sites_org_id_idx" ON "sites"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "sites_org_id_slug_key" ON "sites"("org_id", "slug");

-- CreateIndex
CREATE INDEX "users_org_id_idx" ON "users"("org_id");

-- CreateIndex
CREATE INDEX "users_isSuperAdmin_idx" ON "users"("isSuperAdmin");

-- CreateIndex
CREATE INDEX "users_systemRole_idx" ON "users"("systemRole");

-- CreateIndex
CREATE INDEX "users_siteRole_idx" ON "users"("siteRole");

-- CreateIndex
CREATE INDEX "users_platformRole_idx" ON "users"("platformRole");

-- CreateIndex
CREATE UNIQUE INDEX "users_org_id_email_key" ON "users"("org_id", "email");

-- CreateIndex
CREATE INDEX "content_types_siteId_idx" ON "content_types"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "content_types_siteId_slug_key" ON "content_types"("siteId", "slug");

-- CreateIndex
CREATE INDEX "content_entries_siteId_idx" ON "content_entries"("siteId");

-- CreateIndex
CREATE INDEX "content_entries_siteId_contentTypeId_idx" ON "content_entries"("siteId", "contentTypeId");

-- CreateIndex
CREATE INDEX "content_entries_siteId_status_idx" ON "content_entries"("siteId", "status");

-- CreateIndex
CREATE INDEX "content_entries_siteId_createdAt_idx" ON "content_entries"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "content_entries_siteId_publishedAt_idx" ON "content_entries"("siteId", "publishedAt");

-- CreateIndex
CREATE INDEX "collections_siteId_idx" ON "collections"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "collections_siteId_slug_key" ON "collections"("siteId", "slug");

-- CreateIndex
CREATE INDEX "collection_items_siteId_collectionId_idx" ON "collection_items"("siteId", "collectionId");

-- CreateIndex
CREATE INDEX "collection_items_siteId_status_idx" ON "collection_items"("siteId", "status");

-- CreateIndex
CREATE INDEX "collection_items_siteId_createdAt_idx" ON "collection_items"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "collection_items_collectionId_status_idx" ON "collection_items"("collectionId", "status");

-- CreateIndex
CREATE INDEX "collection_item_versions_siteId_itemId_idx" ON "collection_item_versions"("siteId", "itemId");

-- CreateIndex
CREATE INDEX "collection_item_versions_siteId_itemId_version_idx" ON "collection_item_versions"("siteId", "itemId", "version");

-- CreateIndex
CREATE INDEX "collection_item_versions_siteId_createdAt_idx" ON "collection_item_versions"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "media_files_siteId_idx" ON "media_files"("siteId");

-- CreateIndex
CREATE INDEX "media_files_siteId_mimeType_idx" ON "media_files"("siteId", "mimeType");

-- CreateIndex
CREATE INDEX "media_files_siteId_createdAt_idx" ON "media_files"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "user_orgs_org_id_idx" ON "user_orgs"("org_id");

-- CreateIndex
CREATE INDEX "user_orgs_user_id_idx" ON "user_orgs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_orgs_user_id_org_id_key" ON "user_orgs"("user_id", "org_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_invites_token_key" ON "user_invites"("token");

-- CreateIndex
CREATE INDEX "user_invites_org_id_idx" ON "user_invites"("org_id");

-- CreateIndex
CREATE INDEX "user_invites_site_id_idx" ON "user_invites"("site_id");

-- CreateIndex
CREATE INDEX "user_invites_email_idx" ON "user_invites"("email");

-- CreateIndex
CREATE INDEX "user_invites_status_idx" ON "user_invites"("status");

-- CreateIndex
CREATE INDEX "user_invites_expires_at_idx" ON "user_invites"("expires_at");

-- CreateIndex
CREATE INDEX "content_reviews_contentEntryId_idx" ON "content_reviews"("contentEntryId");

-- CreateIndex
CREATE INDEX "content_reviews_siteId_idx" ON "content_reviews"("siteId");

-- CreateIndex
CREATE INDEX "content_reviews_reviewerId_idx" ON "content_reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "content_reviews_createdAt_idx" ON "content_reviews"("createdAt");

-- CreateIndex
CREATE INDEX "content_comments_contentEntryId_idx" ON "content_comments"("contentEntryId");

-- CreateIndex
CREATE INDEX "content_comments_siteId_idx" ON "content_comments"("siteId");

-- CreateIndex
CREATE INDEX "content_comments_authorId_idx" ON "content_comments"("authorId");

-- CreateIndex
CREATE INDEX "content_comments_createdAt_idx" ON "content_comments"("createdAt");

-- CreateIndex
CREATE INDEX "tasks_siteId_idx" ON "tasks"("siteId");

-- CreateIndex
CREATE INDEX "tasks_siteId_status_idx" ON "tasks"("siteId", "status");

-- CreateIndex
CREATE INDEX "tasks_siteId_assignedToId_idx" ON "tasks"("siteId", "assignedToId");

-- CreateIndex
CREATE INDEX "tasks_contentEntryId_idx" ON "tasks"("contentEntryId");

-- CreateIndex
CREATE INDEX "tasks_collectionItemId_idx" ON "tasks"("collectionItemId");

-- CreateIndex
CREATE INDEX "collection_roles_siteId_idx" ON "collection_roles"("siteId");

-- CreateIndex
CREATE INDEX "collection_roles_collectionId_idx" ON "collection_roles"("collectionId");

-- CreateIndex
CREATE INDEX "collection_roles_userId_idx" ON "collection_roles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "collection_roles_collectionId_userId_key" ON "collection_roles"("collectionId", "userId");

-- CreateIndex
CREATE INDEX "webhooks_siteId_idx" ON "webhooks"("siteId");

-- CreateIndex
CREATE INDEX "webhooks_collectionId_idx" ON "webhooks"("collectionId");

-- CreateIndex
CREATE INDEX "webhooks_active_idx" ON "webhooks"("active");

-- CreateIndex
CREATE INDEX "hooks_siteId_idx" ON "hooks"("siteId");

-- CreateIndex
CREATE INDEX "hooks_collectionId_idx" ON "hooks"("collectionId");

-- CreateIndex
CREATE INDEX "hooks_active_idx" ON "hooks"("active");

-- CreateIndex
CREATE INDEX "hooks_event_idx" ON "hooks"("event");

-- CreateIndex
CREATE INDEX "webhook_deliveries_webhookId_idx" ON "webhook_deliveries"("webhookId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_siteId_idx" ON "webhook_deliveries"("siteId");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries"("status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_createdAt_idx" ON "webhook_deliveries"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_orgId_idx" ON "subscriptions"("orgId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "subscriptions_plan_idx" ON "subscriptions"("plan");

-- CreateIndex
CREATE INDEX "subscriptions_stripeSubscriptionId_idx" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_stripeCustomerId_idx" ON "subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripeInvoiceId_key" ON "invoices"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_orgId_idx" ON "invoices"("orgId");

-- CreateIndex
CREATE INDEX "invoices_subscriptionId_idx" ON "invoices"("subscriptionId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_invoiceNumber_idx" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_stripeInvoiceId_idx" ON "invoices"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key" ON "payments"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "payments_orgId_idx" ON "payments"("orgId");

-- CreateIndex
CREATE INDEX "payments_invoiceId_idx" ON "payments"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_stripePaymentIntentId_idx" ON "payments"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "usage_tracking_orgId_idx" ON "usage_tracking"("orgId");

-- CreateIndex
CREATE INDEX "usage_tracking_orgId_period_idx" ON "usage_tracking"("orgId", "period");

-- CreateIndex
CREATE INDEX "usage_tracking_resourceType_idx" ON "usage_tracking"("resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "usage_tracking_orgId_resourceType_period_key" ON "usage_tracking"("orgId", "resourceType", "period");

-- CreateIndex
CREATE INDEX "dev_email_log_to_idx" ON "dev_email_log"("to");

-- CreateIndex
CREATE INDEX "dev_email_log_status_idx" ON "dev_email_log"("status");

-- CreateIndex
CREATE INDEX "dev_email_log_sentAt_idx" ON "dev_email_log"("sentAt");

-- CreateIndex
CREATE INDEX "dev_domain_records_siteId_idx" ON "dev_domain_records"("siteId");

-- CreateIndex
CREATE INDEX "dev_domain_records_domain_idx" ON "dev_domain_records"("domain");

-- CreateIndex
CREATE INDEX "dev_domain_records_status_idx" ON "dev_domain_records"("status");

-- CreateIndex
CREATE UNIQUE INDEX "dev_domain_records_domain_siteId_key" ON "dev_domain_records"("domain", "siteId");

-- CreateIndex
CREATE INDEX "seo_settings_siteId_idx" ON "seo_settings"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "seo_settings_siteId_key" ON "seo_settings"("siteId");

-- CreateIndex
CREATE INDEX "site_environments_siteId_idx" ON "site_environments"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "site_environments_siteId_type_key" ON "site_environments"("siteId", "type");

-- CreateIndex
CREATE INDEX "pages_siteId_environmentId_idx" ON "pages"("siteId", "environmentId");

-- CreateIndex
CREATE INDEX "pages_siteId_status_idx" ON "pages"("siteId", "status");

-- CreateIndex
CREATE INDEX "pages_siteId_slug_idx" ON "pages"("siteId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "pages_siteId_environmentId_slug_key" ON "pages"("siteId", "environmentId", "slug");

-- CreateIndex
CREATE INDEX "site_feature_overrides_siteId_idx" ON "site_feature_overrides"("siteId");

-- CreateIndex
CREATE INDEX "site_feature_overrides_featureKey_idx" ON "site_feature_overrides"("featureKey");

-- CreateIndex
CREATE UNIQUE INDEX "site_feature_overrides_siteId_featureKey_key" ON "site_feature_overrides"("siteId", "featureKey");

-- CreateIndex
CREATE INDEX "site_snapshots_siteId_idx" ON "site_snapshots"("siteId");

-- CreateIndex
CREATE INDEX "site_events_siteId_createdAt_idx" ON "site_events"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "site_deployments_siteId_createdAt_idx" ON "site_deployments"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "site_deployments_siteId_env_idx" ON "site_deployments"("siteId", "env");

-- CreateIndex
CREATE UNIQUE INDEX "capabilities_key_key" ON "capabilities"("key");

-- CreateIndex
CREATE INDEX "capabilities_module_idx" ON "capabilities"("module");

-- CreateIndex
CREATE INDEX "capabilities_key_idx" ON "capabilities"("key");

-- CreateIndex
CREATE INDEX "roles_orgId_idx" ON "roles"("orgId");

-- CreateIndex
CREATE INDEX "roles_orgId_scope_idx" ON "roles"("orgId", "scope");

-- CreateIndex
CREATE INDEX "roles_type_idx" ON "roles"("type");

-- CreateIndex
CREATE UNIQUE INDEX "roles_orgId_name_scope_key" ON "roles"("orgId", "name", "scope");

-- CreateIndex
CREATE INDEX "role_capabilities_roleId_idx" ON "role_capabilities"("roleId");

-- CreateIndex
CREATE INDEX "role_capabilities_capabilityId_idx" ON "role_capabilities"("capabilityId");

-- CreateIndex
CREATE UNIQUE INDEX "role_capabilities_roleId_capabilityId_key" ON "role_capabilities"("roleId", "capabilityId");

-- CreateIndex
CREATE INDEX "user_roles_orgId_userId_idx" ON "user_roles"("orgId", "userId");

-- CreateIndex
CREATE INDEX "user_roles_orgId_siteId_idx" ON "user_roles"("orgId", "siteId");

-- CreateIndex
CREATE INDEX "user_roles_roleId_idx" ON "user_roles"("roleId");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE INDEX "user_roles_siteId_idx" ON "user_roles"("siteId");

-- CreateIndex
CREATE INDEX "org_policies_orgId_idx" ON "org_policies"("orgId");

-- CreateIndex
CREATE INDEX "org_policies_capabilityKey_idx" ON "org_policies"("capabilityKey");

-- CreateIndex
CREATE UNIQUE INDEX "org_policies_orgId_capabilityKey_key" ON "org_policies"("orgId", "capabilityKey");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_logs_orgId_idx" ON "audit_logs"("orgId");

-- CreateIndex
CREATE INDEX "audit_logs_siteId_idx" ON "audit_logs"("siteId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "marketing_campaigns_orgId_siteId_idx" ON "marketing_campaigns"("orgId", "siteId");

-- CreateIndex
CREATE INDEX "marketing_campaigns_orgId_status_idx" ON "marketing_campaigns"("orgId", "status");

-- CreateIndex
CREATE INDEX "marketing_campaigns_siteId_idx" ON "marketing_campaigns"("siteId");

-- CreateIndex
CREATE INDEX "marketing_campaigns_createdAt_idx" ON "marketing_campaigns"("createdAt");

-- CreateIndex
CREATE INDEX "marketing_distribution_drafts_orgId_siteId_idx" ON "marketing_distribution_drafts"("orgId", "siteId");

-- CreateIndex
CREATE INDEX "marketing_distribution_drafts_orgId_status_idx" ON "marketing_distribution_drafts"("orgId", "status");

-- CreateIndex
CREATE INDEX "marketing_distribution_drafts_campaignId_idx" ON "marketing_distribution_drafts"("campaignId");

-- CreateIndex
CREATE INDEX "marketing_distribution_drafts_siteId_idx" ON "marketing_distribution_drafts"("siteId");

-- CreateIndex
CREATE INDEX "marketing_distribution_drafts_createdAt_idx" ON "marketing_distribution_drafts"("createdAt");

-- CreateIndex
CREATE INDEX "marketing_channel_connections_orgId_siteId_idx" ON "marketing_channel_connections"("orgId", "siteId");

-- CreateIndex
CREATE INDEX "marketing_channel_connections_channel_idx" ON "marketing_channel_connections"("channel");

-- CreateIndex
CREATE INDEX "marketing_channel_connections_status_idx" ON "marketing_channel_connections"("status");

-- CreateIndex
CREATE UNIQUE INDEX "marketing_channel_connections_orgId_siteId_channel_key" ON "marketing_channel_connections"("orgId", "siteId", "channel");

-- CreateIndex
CREATE INDEX "marketing_publish_jobs_orgId_siteId_idx" ON "marketing_publish_jobs"("orgId", "siteId");

-- CreateIndex
CREATE INDEX "marketing_publish_jobs_orgId_status_idx" ON "marketing_publish_jobs"("orgId", "status");

-- CreateIndex
CREATE INDEX "marketing_publish_jobs_campaignId_idx" ON "marketing_publish_jobs"("campaignId");

-- CreateIndex
CREATE INDEX "marketing_publish_jobs_draftId_idx" ON "marketing_publish_jobs"("draftId");

-- CreateIndex
CREATE INDEX "marketing_publish_jobs_siteId_idx" ON "marketing_publish_jobs"("siteId");

-- CreateIndex
CREATE INDEX "marketing_publish_jobs_createdAt_idx" ON "marketing_publish_jobs"("createdAt");

-- CreateIndex
CREATE INDEX "marketing_publish_results_jobId_idx" ON "marketing_publish_results"("jobId");

-- CreateIndex
CREATE INDEX "marketing_publish_results_orgId_siteId_idx" ON "marketing_publish_results"("orgId", "siteId");

-- CreateIndex
CREATE INDEX "marketing_publish_results_channel_idx" ON "marketing_publish_results"("channel");

-- CreateIndex
CREATE INDEX "marketing_publish_results_status_idx" ON "marketing_publish_results"("status");

-- CreateIndex
CREATE INDEX "marketing_publish_results_createdAt_idx" ON "marketing_publish_results"("createdAt");

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_types" ADD CONSTRAINT "content_types_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_entries" ADD CONSTRAINT "content_entries_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_entries" ADD CONSTRAINT "content_entries_contentTypeId_fkey" FOREIGN KEY ("contentTypeId") REFERENCES "content_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_item_versions" ADD CONSTRAINT "collection_item_versions_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_item_versions" ADD CONSTRAINT "collection_item_versions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "collection_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_orgs" ADD CONSTRAINT "user_orgs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_orgs" ADD CONSTRAINT "user_orgs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_site_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_contentEntryId_fkey" FOREIGN KEY ("contentEntryId") REFERENCES "content_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_contentEntryId_fkey" FOREIGN KEY ("contentEntryId") REFERENCES "content_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_contentEntryId_fkey" FOREIGN KEY ("contentEntryId") REFERENCES "content_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_roles" ADD CONSTRAINT "collection_roles_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_roles" ADD CONSTRAINT "collection_roles_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hooks" ADD CONSTRAINT "hooks_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hooks" ADD CONSTRAINT "hooks_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhookId_fkey" FOREIGN KEY ("webhookId") REFERENCES "webhooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_tracking" ADD CONSTRAINT "usage_tracking_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dev_domain_records" ADD CONSTRAINT "dev_domain_records_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seo_settings" ADD CONSTRAINT "seo_settings_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_environments" ADD CONSTRAINT "site_environments_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "site_environments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_feature_overrides" ADD CONSTRAINT "site_feature_overrides_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_snapshots" ADD CONSTRAINT "site_snapshots_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_events" ADD CONSTRAINT "site_events_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_deployments" ADD CONSTRAINT "site_deployments_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "sites"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_capabilities" ADD CONSTRAINT "role_capabilities_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_capabilities" ADD CONSTRAINT "role_capabilities_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_policies" ADD CONSTRAINT "org_policies_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_campaigns" ADD CONSTRAINT "marketing_campaigns_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_distribution_drafts" ADD CONSTRAINT "marketing_distribution_drafts_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_distribution_drafts" ADD CONSTRAINT "marketing_distribution_drafts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketing_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_channel_connections" ADD CONSTRAINT "marketing_channel_connections_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_publish_jobs" ADD CONSTRAINT "marketing_publish_jobs_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_publish_jobs" ADD CONSTRAINT "marketing_publish_jobs_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "marketing_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_publish_jobs" ADD CONSTRAINT "marketing_publish_jobs_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "marketing_distribution_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_publish_results" ADD CONSTRAINT "marketing_publish_results_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketing_publish_results" ADD CONSTRAINT "marketing_publish_results_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "marketing_publish_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

