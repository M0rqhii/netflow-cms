-- Enable Row Level Security on workflow tables
ALTER TABLE "content_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "content_comments" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tenant isolation
-- Note: These policies use app.current_tenant_id which should be set by application middleware

-- Content Reviews RLS Policy
CREATE POLICY tenant_isolation_content_reviews ON "content_reviews"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);

-- Content Comments RLS Policy
CREATE POLICY tenant_isolation_content_comments ON "content_comments"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);

