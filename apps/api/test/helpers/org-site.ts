import { PrismaService } from '../../src/common/prisma/prisma.service';

export async function createOrgAndSite(prisma: PrismaService, options?: { orgName?: string; orgSlug?: string; siteName?: string; siteSlug?: string; plan?: string }) {
  const orgSuffix = Date.now();
  const organization = await prisma.organization.create({
    data: {
      name: options?.orgName || `Test Organization ${orgSuffix}`,
      slug: options?.orgSlug || `test-org-${orgSuffix}`,
      plan: options?.plan || 'free',
    },
  });

  const site = await prisma.site.create({
    data: {
      orgId: organization.id,
      name: options?.siteName || `Test Site ${orgSuffix}`,
      slug: options?.siteSlug || `test-site-${orgSuffix}`,
    },
  });

  return { organization, site };
}
