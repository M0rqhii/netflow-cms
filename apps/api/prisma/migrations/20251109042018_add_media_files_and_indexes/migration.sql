-- CreateTable
CREATE TABLE "media_files" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
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

-- CreateIndex
CREATE INDEX "media_files_tenantId_idx" ON "media_files"("tenantId");

-- CreateIndex
CREATE INDEX "media_files_tenantId_mimeType_idx" ON "media_files"("tenantId", "mimeType");

-- CreateIndex
CREATE INDEX "media_files_tenantId_createdAt_idx" ON "media_files"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "collection_items_tenantId_createdAt_idx" ON "collection_items"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "collection_items_collectionId_status_idx" ON "collection_items"("collectionId", "status");

-- CreateIndex
CREATE INDEX "content_entries_tenantId_createdAt_idx" ON "content_entries"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "media_files" ADD CONSTRAINT "media_files_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable Row Level Security on all tenant-scoped tables
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "collections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "collection_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media_files" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
-- Note: These policies use app.current_tenant_id which should be set by application middleware
-- For development/testing, you can set it manually: SET app.current_tenant_id = 'tenant-uuid';

-- Users RLS Policy
CREATE POLICY tenant_isolation_users ON "users"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);

-- Content Types RLS Policy
CREATE POLICY tenant_isolation_content_types ON "content_types"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);

-- Content Entries RLS Policy
CREATE POLICY tenant_isolation_content_entries ON "content_entries"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);

-- Collections RLS Policy
CREATE POLICY tenant_isolation_collections ON "collections"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);

-- Collection Items RLS Policy
CREATE POLICY tenant_isolation_collection_items ON "collection_items"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);

-- Media Files RLS Policy
CREATE POLICY tenant_isolation_media_files ON "media_files"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
