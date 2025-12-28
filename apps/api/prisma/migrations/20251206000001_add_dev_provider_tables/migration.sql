-- CreateTable: dev_email_log
-- Development email logging for observability
CREATE TABLE IF NOT EXISTS "dev_email_log" (
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

-- CreateTable: dev_domain_records
-- Development domain configuration logging
CREATE TABLE IF NOT EXISTS "dev_domain_records" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "targetUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'configured',
    "sslStatus" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dev_domain_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dev_email_log_to_idx" ON "dev_email_log"("to");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dev_email_log_status_idx" ON "dev_email_log"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dev_email_log_sentAt_idx" ON "dev_email_log"("sentAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "dev_domain_records_domain_tenantId_key" ON "dev_domain_records"("domain", "tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dev_domain_records_tenantId_idx" ON "dev_domain_records"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dev_domain_records_domain_idx" ON "dev_domain_records"("domain");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "dev_domain_records_status_idx" ON "dev_domain_records"("status");





