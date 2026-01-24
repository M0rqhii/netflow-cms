import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TestAppModule } from '../src/test-app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * RLS E2E Tests
 * AI Note: Tests that verify Row-Level Security policies block queries without org/site context
 */
describe('RLS (Row-Level Security) E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let org1Id: string;
  let org2Id: string;
  let site1Id: string;
  let site2Id: string;
  const emptyUuid = '00000000-0000-0000-0000-000000000000';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    const org1 = await prisma.organization.create({
      data: {
        name: 'Test Org 1',
        slug: `test-org-1-${Date.now()}`,
        plan: 'free',
      },
    });
    org1Id = org1.id;

    const org2 = await prisma.organization.create({
      data: {
        name: 'Test Org 2',
        slug: `test-org-2-${Date.now()}`,
        plan: 'free',
      },
    });
    org2Id = org2.id;

    const site1 = await prisma.site.create({
      data: {
        orgId: org1Id,
        name: 'Test Site 1',
        slug: `test-site-1-${Date.now()}`,
      },
    });
    site1Id = site1.id;

    const site2 = await prisma.site.create({
      data: {
        orgId: org2Id,
        name: 'Test Site 2',
        slug: `test-site-2-${Date.now()}`,
      },
    });
    site2Id = site2.id;

    await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
      await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${org1Id}'`);
      await tx.user.create({
        data: {
          orgId: org1Id,
          email: 'user1@test.com',
          passwordHash: 'hash1',
          role: 'org_admin',
          siteRole: 'admin',
        },
      });
    });

    await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
      await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${org2Id}'`);
      await tx.user.create({
        data: {
          orgId: org2Id,
          email: 'user2@test.com',
          passwordHash: 'hash2',
          role: 'org_admin',
          siteRole: 'admin',
        },
      });
    });
  });

  afterAll(async () => {
    await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
      await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${org1Id}'`);
      await tx.user.deleteMany({ where: { orgId: org1Id } });
    });

    await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
      await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${org2Id}'`);
      await tx.user.deleteMany({ where: { orgId: org2Id } });
    });

    await prisma.site.deleteMany({ where: { id: { in: [site1Id, site2Id] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [org1Id, org2Id] } } });
    await app.close();
  });

  describe('RLS Isolation Tests', () => {
    it('should block queries without org/site context', async () => {
      const result = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
        await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${emptyUuid}'`);
        await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${emptyUuid}'`);
        return tx.$queryRawUnsafe<Array<{ id: string }>>(
          'SELECT id FROM users LIMIT 1',
        );
      });

      expect(result).toEqual([]);
    });

    it('should only return data for current organization', async () => {
      const users = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
        await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${org1Id}'`);
        return tx.user.findMany();
      });

      expect(users.length).toBeGreaterThan(0);
      expect(users.every((u) => u.orgId === org1Id)).toBe(true);
    });

    it('should prevent cross-site data access', async () => {
      const { contentType, entry } = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
        await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${site1Id}'`);
        const contentType = await tx.contentType.create({
          data: {
            siteId: site1Id,
            name: 'Test Type',
            slug: `test-type-${Date.now()}`,
            schema: {},
          },
        });

        const entry = await tx.contentEntry.create({
          data: {
            siteId: site1Id,
            contentTypeId: contentType.id,
            data: { test: 'data' },
            status: 'draft',
          },
        });

        return { contentType, entry };
      });

      const foundEntry = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
        await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${site2Id}'`);
        return tx.contentEntry.findUnique({
          where: { id: entry.id },
        });
      });

      expect(foundEntry).toBeNull();

      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
        await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${site1Id}'`);
        await tx.contentEntry.delete({ where: { id: entry.id } });
        await tx.contentType.delete({ where: { id: contentType.id } });
      });
    });

    it('should block INSERT without org context', async () => {
      await expect(
        prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
          await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${emptyUuid}'`);
          await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${emptyUuid}'`);
          await tx.$executeRawUnsafe(`
            INSERT INTO "users" (id, "org_id", email, "passwordHash", role, "createdAt", "updatedAt")
            VALUES (gen_random_uuid(), '${org1Id}', 'test@test.com', 'hash', 'viewer', now(), now())
          `);
        }),
      ).rejects.toThrow();
    });

    it('should block UPDATE without site context', async () => {
      const { contentType, entry } = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
        await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${site1Id}'`);
        const contentType = await tx.contentType.create({
          data: {
            siteId: site1Id,
            name: 'Test',
            slug: `test-update-${Date.now()}`,
            schema: {},
          },
        });

        const entry = await tx.contentEntry.create({
          data: {
            siteId: site1Id,
            contentTypeId: contentType.id,
            data: {},
            status: 'draft',
          },
        });

        return { contentType, entry };
      });

      await expect(
        prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
          await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${emptyUuid}'`);
          await tx.contentEntry.update({
            where: { id: entry.id },
            data: { status: 'published' },
          });
        }),
      ).rejects.toThrow();

      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
        await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${site1Id}'`);
        await tx.contentEntry.delete({ where: { id: entry.id } });
        await tx.contentType.delete({ where: { id: contentType.id } });
      });
    });

    it('should block DELETE without site context', async () => {
      const { contentType, entry } = await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
        await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${site1Id}'`);
        const contentType = await tx.contentType.create({
          data: {
            siteId: site1Id,
            name: 'Test',
            slug: `test-delete-${Date.now()}`,
            schema: {},
          },
        });

        const entry = await tx.contentEntry.create({
          data: {
            siteId: site1Id,
            contentTypeId: contentType.id,
            data: {},
            status: 'draft',
          },
        });

        return { contentType, entry };
      });

      await expect(
        prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
          await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${emptyUuid}'`);
          await tx.contentEntry.delete({ where: { id: entry.id } });
        }),
      ).rejects.toThrow();

      await prisma.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL ROLE test_rls');
        await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${site1Id}'`);
        await tx.contentEntry.delete({ where: { id: entry.id } });
        await tx.contentType.delete({ where: { id: contentType.id } });
      });
    });
  });

  describe('RLS Policy Verification', () => {
    it('should verify all site/org-scoped tables have RLS enabled', async () => {
      const tables = [
        'users',
        'content_types',
        'content_entries',
        'collections',
        'collection_items',
        'media_files',
        'content_reviews',
        'content_comments',
        'tasks',
        'collection_roles',
        'webhooks',
        'webhook_deliveries',
      ];

      for (const table of tables) {
        const result = await prisma.$queryRawUnsafe<Array<{ relrowsecurity: boolean }>>(
          `SELECT relrowsecurity FROM pg_class WHERE relname = '${table}'`,
        );

        if (result.length > 0) {
          expect(result[0].relrowsecurity).toBe(true);
        }
      }
    });

    it('should verify RLS policies exist for all tables', async () => {
      const tables = [
        'users',
        'content_types',
        'content_entries',
        'collections',
        'collection_items',
        'media_files',
        'content_reviews',
        'content_comments',
        'tasks',
        'collection_roles',
        'webhooks',
        'webhook_deliveries',
      ];

      for (const table of tables) {
        const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*) as count FROM pg_policies WHERE tablename = '${table}'`,
        );

        expect(Number(result[0]?.count || 0)).toBeGreaterThan(0);
      }
    });
  });
});