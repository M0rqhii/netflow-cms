-- Add GIN indexes for JSON fields to improve query performance
-- These indexes enable efficient filtering and searching within JSON data

-- GIN index for ContentEntry.data JSON field
-- Enables fast filtering and searching within content entry data
CREATE INDEX IF NOT EXISTS idx_content_entries_data_gin ON content_entries USING GIN (data);

-- GIN index for CollectionItem.data JSON field
-- Enables fast filtering and searching within collection item data
CREATE INDEX IF NOT EXISTS idx_collection_items_data_gin ON collection_items USING GIN (data);

-- Composite index for UserTenant lookups by user email
-- Improves performance of user lookup queries
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_email ON user_tenants(user_id);

-- Index for email lookups in User table (for global login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Index for ContentEntry status filtering
CREATE INDEX IF NOT EXISTS idx_content_entries_status ON content_entries(status) WHERE status IS NOT NULL;

-- Index for CollectionItem status filtering
CREATE INDEX IF NOT EXISTS idx_collection_items_status ON collection_items(status) WHERE status IS NOT NULL;

-- Index for UserTenant lookups by tenant
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id);

-- Index for ContentEntry by contentTypeId (already exists but ensuring it's there)
-- This is already covered by @@index([tenantId, contentTypeId]) in schema

-- Index for CollectionItem by collectionId and status (already exists but ensuring it's there)
-- This is already covered by @@index([collectionId, status]) in schema

