import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

/**
 * RLS E2E Tests
 * AI Note: Tests that verify Row-Level Security policies block queries without tenantId
 */
describe('RLS (Row-Level Security) E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenant1Id: string;
  let tenant2Id: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create test tenants
    const tenant1 = await prisma.tenant.create({
      data: {
        name: 'Test Tenant 1',
        slug: 'test-tenant-1',
        plan: 'free',
      },
    });
    tenant1Id = tenant1.id;

    const tenant2 = await prisma.tenant.create({
      data: {
        name: 'Test Tenant 2',
        slug: 'test-tenant-2',
        plan: 'free',
      },
    });
    tenant2Id = tenant2.id;

    // Create test users
    const user1 = await prisma.user.create({
      data: {
        tenantId: tenant1Id,
        email: 'user1@test.com',
        passwordHash: 'hash1',
        role: 'tenant_admin',
      },
    });
    user1Id = user1.id;

    const user2 = await prisma.user.create({
      data: {
        tenantId: tenant2Id,
        email: 'user2@test.com',
        passwordHash: 'hash2',
        role: 'tenant_admin',
      },
    });
    user2Id = user2.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({ where: { tenantId: { in: [tenant1Id, tenant2Id] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenant1Id, tenant2Id] } } });
    await app.close();
  });

  describe('RLS Isolation Tests', () => {
    it('should block queries without tenantId context', async () => {
      // Try to query users without setting tenant context
      // This should return empty result due to RLS
      const result = await prisma.$queryRawUnsafe<Array<{ id: string }>>(
        'SELECT id FROM users LIMIT 1',
      );
      
      // RLS should block access - result should be empty
      expect(result).toEqual([]);
    });

    it('should only return data for current tenant', async () => {
      // Set tenant1 context
      await prisma.$executeRawUnsafe(`SET app.current_tenant_id = '${tenant1Id}'`);
      
      const users = await prisma.user.findMany();
      
      // Should only return users from tenant1
      expect(users.length).toBeGreaterThan(0);
      expect(users.every(u => u.tenantId === tenant1Id)).toBe(true);
      
      // Clear context
      await prisma.$executeRawUnsafe('SET app.current_tenant_id = NULL');
    });

    it('should prevent cross-tenant data access', async () => {
      // Create content entry for tenant1
      const contentType = await prisma.contentType.create({
        data: {
          tenantId: tenant1Id,
          name: 'Test Type',
          slug: 'test-type',
          schema: {},
        },
      });

      const entry = await prisma.contentEntry.create({
        data: {
          tenantId: tenant1Id,
          contentTypeId: contentType.id,
          data: { test: 'data' },
          status: 'draft',
        },
      });

      // Set tenant2 context
      await prisma.$executeRawUnsafe(`SET app.current_tenant_id = '${tenant2Id}'`);
      
      // Try to access tenant1's entry
      const foundEntry = await prisma.contentEntry.findUnique({
        where: { id: entry.id },
      });
      
      // Should be null due to RLS
      expect(foundEntry).toBeNull();
      
      // Clear context
      await prisma.$executeRawUnsafe('SET app.current_tenant_id = NULL');
      
      // Cleanup
      await prisma.$executeRawUnsafe(`SET app.current_tenant_id = '${tenant1Id}'`);
      await prisma.contentEntry.delete({ where: { id: entry.id } });
      await prisma.contentType.delete({ where: { id: contentType.id } });
      await prisma.$executeRawUnsafe('SET app.current_tenant_id = NULL');
    });

    it('should block INSERT without tenantId', async () => {
      // Try to insert without tenant context
      await expect(
        prisma.$executeRawUnsafe(`
          INSERT INTO users (id, "tenantId", email, "passwordHash", role)
          VALUES (gen_random_uuid(), '${tenant1Id}', 'test@test.com', 'hash', 'viewer')
        `),
      ).rejects.toThrow();
    });

    it('should block UPDATE without tenantId', async () => {
      // Set tenant1 context and create entry
      await prisma.$executeRawUnsafe(`SET app.current_tenant_id = '${tenant1Id}'`);
      
      const contentType = await prisma.contentType.create({
        data: {
          tenantId: tenant1Id,
          name: 'Test',
          slug: 'test',
          schema: {},
        },
      });

      const entry = await prisma.contentEntry.create({
        data: {
          tenantId: tenant1Id,
          contentTypeId: contentType.id,
          data: {},
          status: 'draft',
        },
      });

      // Clear context
      await prisma.$executeRawUnsafe('SET app.current_tenant_id = NULL');
      
      // Try to update without tenant context
      await expect(
        prisma.contentEntry.update({
          where: { id: entry.id },
          data: { status: 'published' },
        }),
      ).rejects.toThrow();
      
      // Cleanup
      await prisma.$executeRawUnsafe(`SET app.current_tenant_id = '${tenant1Id}'`);
      await prisma.contentEntry.delete({ where: { id: entry.id } });
      await prisma.contentType.delete({ where: { id: contentType.id } });
      await prisma.$executeRawUnsafe('SET app.current_tenant_id = NULL');
    });

    it('should block DELETE without tenantId', async () => {
      // Set tenant1 context and create entry
      await prisma.$executeRawUnsafe(`SET app.current_tenant_id = '${tenant1Id}'`);
      
      const contentType = await prisma.contentType.create({
        data: {
          tenantId: tenant1Id,
          name: 'Test',
          slug: 'test',
          schema: {},
        },
      });

      const entry = await prisma.contentEntry.create({
        data: {
          tenantId: tenant1Id,
          contentTypeId: contentType.id,
          data: {},
          status: 'draft',
        },
      });

      // Clear context
      await prisma.$executeRawUnsafe('SET app.current_tenant_id = NULL');
      
      // Try to delete without tenant context
      await expect(
        prisma.contentEntry.delete({ where: { id: entry.id } }),
      ).rejects.toThrow();
      
      // Cleanup
      await prisma.$executeRawUnsafe(`SET app.current_tenant_id = '${tenant1Id}'`);
      await prisma.contentEntry.delete({ where: { id: entry.id } });
      await prisma.contentType.delete({ where: { id: contentType.id } });
      await prisma.$executeRawUnsafe('SET app.current_tenant_id = NULL');
    });
  });

  describe('RLS Policy Verification', () => {
    it('should verify all tenant-scoped tables have RLS enabled', async () => {
      const tables = [
        'users',
        'content_types',
        'content_entries',
        'collections',
        'collection_items',
        'media_files',
        'user_tenants',
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
        'user_tenants',
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




