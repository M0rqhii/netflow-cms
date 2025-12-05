-- AlterTable
ALTER TABLE "content_entries" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ADD COLUMN     "updatedById" TEXT;

-- CreateTable
CREATE TABLE "content_reviews" (
    "id" TEXT NOT NULL,
    "contentEntryId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
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
    "tenantId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "content_reviews_contentEntryId_idx" ON "content_reviews"("contentEntryId");

-- CreateIndex
CREATE INDEX "content_reviews_tenantId_idx" ON "content_reviews"("tenantId");

-- CreateIndex
CREATE INDEX "content_reviews_reviewerId_idx" ON "content_reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "content_reviews_createdAt_idx" ON "content_reviews"("createdAt");

-- CreateIndex
CREATE INDEX "content_comments_contentEntryId_idx" ON "content_comments"("contentEntryId");

-- CreateIndex
CREATE INDEX "content_comments_tenantId_idx" ON "content_comments"("tenantId");

-- CreateIndex
CREATE INDEX "content_comments_authorId_idx" ON "content_comments"("authorId");

-- CreateIndex
CREATE INDEX "content_comments_createdAt_idx" ON "content_comments"("createdAt");

-- CreateIndex
CREATE INDEX "content_entries_tenantId_publishedAt_idx" ON "content_entries"("tenantId", "publishedAt");

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reviews" ADD CONSTRAINT "content_reviews_contentEntryId_fkey" FOREIGN KEY ("contentEntryId") REFERENCES "content_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_comments" ADD CONSTRAINT "content_comments_contentEntryId_fkey" FOREIGN KEY ("contentEntryId") REFERENCES "content_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
