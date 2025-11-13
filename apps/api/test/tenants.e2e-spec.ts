import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { Role } from '../src/common/auth/roles.enum';

describe('TenantsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let superAdminTenantId: string;
  let superAdminToken: string;
  let tenantAdminToken: string;
  let editorToken: string;
  let viewerToken: string;
  let superAdminUserId: string;
  let tenantAdminUserId: string;
  let editorUserId: string;
  let viewerUserId: string;
  let testTenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create super admin tenant
    const superAdminTenant = await prisma.tenant.create({
      data: {
        name: 'Super Admin Tenant',
        slug: 'super-admin-tenant',
        plan: 'enterprise',
      },
    });
    superAdminTenantId = superAdminTenant.id;

    // Create super admin user
    const superAdminUser = await prisma.user.create({
      data: {
        tenantId: superAdminTenant.id,
        email: 'superadmin@test.com',
        passwordHash: '$2b$10$rQZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK',
        role: Role.SUPER_ADMIN,
      },
    });
    superAdminUserId = superAdminUser.id;

    // Create test tenant for other users
    const testTenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'free',
      },
    });
    testTenantId = testTenant.id;

    // Create tenant admin user
    const tenantAdminUser = await prisma.user.create({
      data: {
        tenantId: testTenant.id,
        email: 'admin@test.com',
        passwordHash: '$2b$10$rQZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK',
        role: Role.TENANT_ADMIN,
      },
    });
    tenantAdminUserId = tenantAdminUser.id;

    // Create editor user
    const editorUser = await prisma.user.create({
      data: {
        tenantId: testTenant.id,
        email: 'editor@test.com',
        passwordHash: '$2b$10$rQZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK',
        role: Role.EDITOR,
      },
    });
    editorUserId = editorUser.id;

    // Create viewer user
    const viewerUser = await prisma.user.create({
      data: {
        tenantId: testTenant.id,
        email: 'viewer@test.com',
        passwordHash: '$2b$10$rQZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK',
        role: Role.VIEWER,
      },
    });
    viewerUserId = viewerUser.id;

    // Generate JWT tokens for each user
    superAdminToken = jwtService.sign({
      sub: superAdminUser.id,
      email: superAdminUser.email,
      role: superAdminUser.role,
      tenantId: superAdminUser.tenantId,
    });

    tenantAdminToken = jwtService.sign({
      sub: tenantAdminUser.id,
      email: tenantAdminUser.email,
      role: tenantAdminUser.role,
      tenantId: tenantAdminUser.tenantId,
    });

    editorToken = jwtService.sign({
      sub: editorUser.id,
      email: editorUser.email,
      role: editorUser.role,
      tenantId: editorUser.tenantId,
    });

    viewerToken = jwtService.sign({
      sub: viewerUser.id,
      email: viewerUser.email,
      role: viewerUser.role,
      tenantId: viewerUser.tenantId,
    });
  });

  afterAll(async () => {
    // Cleanup - delete all test tenants and users
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [superAdminUserId, tenantAdminUserId, editorUserId, viewerUserId],
        },
      },
    });
    await prisma.tenant.deleteMany({
      where: {
        id: {
          in: [superAdminTenantId, testTenantId],
        },
      },
    });
    await app.close();
  });

  describe('POST /api/v1/tenants', () => {
    it('should create a new tenant (super_admin only)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .send({
          name: 'New Tenant',
          slug: 'new-tenant',
          plan: 'professional',
          settings: { theme: 'dark' },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name', 'New Tenant');
          expect(res.body).toHaveProperty('slug', 'new-tenant');
          expect(res.body).toHaveProperty('plan', 'professional');
          expect(res.body).toHaveProperty('settings');
          expect(res.body.settings).toHaveProperty('theme', 'dark');
          expect(res.body).toHaveProperty('createdAt');
          expect(res.body).toHaveProperty('updatedAt');
        });
    });

    it('should return 403 for tenant_admin', () => {
      return request(app.getHttpServer())
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .set('X-Tenant-ID', testTenantId)
        .send({
          name: 'New Tenant',
          slug: 'new-tenant-2',
          plan: 'free',
        })
        .expect(403);
    });

    it('should return 403 for editor', () => {
      return request(app.getHttpServer())
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${editorToken}`)
        .set('X-Tenant-ID', testTenantId)
        .send({
          name: 'New Tenant',
          slug: 'new-tenant-3',
          plan: 'free',
        })
        .expect(403);
    });

    it('should return 403 for viewer', () => {
      return request(app.getHttpServer())
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('X-Tenant-ID', testTenantId)
        .send({
          name: 'New Tenant',
          slug: 'new-tenant-4',
          plan: 'free',
        })
        .expect(403);
    });

    it('should return 401 without authorization', () => {
      return request(app.getHttpServer())
        .post('/api/v1/tenants')
        .set('X-Tenant-ID', superAdminTenantId)
        .send({
          name: 'New Tenant',
          slug: 'new-tenant-5',
          plan: 'free',
        })
        .expect(401);
    });

    it('should return 409 for duplicate slug', async () => {
      // First create a tenant
      await request(app.getHttpServer())
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .send({
          name: 'Duplicate Tenant',
          slug: 'duplicate-tenant',
          plan: 'free',
        })
        .expect(201);

      // Try to create another with same slug
      return request(app.getHttpServer())
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .send({
          name: 'Another Duplicate Tenant',
          slug: 'duplicate-tenant',
          plan: 'free',
        })
        .expect(409);
    });

    it('should validate slug format', () => {
      return request(app.getHttpServer())
        .post('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .send({
          name: 'Invalid Tenant',
          slug: 'Invalid_Slug_With_Underscores',
          plan: 'free',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/tenants', () => {
    it('should return paginated list of tenants (super_admin only)', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body).toHaveProperty('pagination');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.pagination).toHaveProperty('page');
          expect(res.body.pagination).toHaveProperty('pageSize');
          expect(res.body.pagination).toHaveProperty('total');
          expect(res.body.pagination).toHaveProperty('totalPages');
        });
    });

    it('should support pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tenants?page=1&pageSize=10')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body.pagination.page).toBe(1);
          expect(res.body.pagination.pageSize).toBe(10);
        });
    });

    it('should return 403 for tenant_admin', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .set('X-Tenant-ID', testTenantId)
        .expect(403);
    });

    it('should return 403 for editor', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tenants')
        .set('Authorization', `Bearer ${editorToken}`)
        .set('X-Tenant-ID', testTenantId)
        .expect(403);
    });

    it('should return 401 without authorization', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tenants')
        .set('X-Tenant-ID', superAdminTenantId)
        .expect(401);
    });
  });

  describe('GET /api/v1/tenants/:id', () => {
    let createdTenantId: string;

    beforeAll(async () => {
      // Create a tenant for testing
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Get Test Tenant',
          slug: 'get-test-tenant',
          plan: 'free',
        },
      });
      createdTenantId = tenant.id;
    });

    afterAll(async () => {
      // Cleanup
      await prisma.tenant.delete({ where: { id: createdTenantId } }).catch(() => {});
    });

    it('should return tenant by ID (super_admin only)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', createdTenantId);
          expect(res.body).toHaveProperty('name', 'Get Test Tenant');
          expect(res.body).toHaveProperty('slug', 'get-test-tenant');
          expect(res.body).toHaveProperty('plan', 'free');
          expect(res.body).toHaveProperty('_count');
        });
    });

    it('should return 404 for non-existent tenant', () => {
      const fakeTenantId = '123e4567-e89b-12d3-a456-426614174000';
      return request(app.getHttpServer())
        .get(`/api/v1/tenants/${fakeTenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .expect(404);
    });

    it('should return 403 for tenant_admin', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .set('X-Tenant-ID', testTenantId)
        .expect(403);
    });

    it('should return 401 without authorization', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/tenants/${createdTenantId}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .expect(401);
    });
  });

  describe('GET /api/v1/tenants/slug/:slug', () => {
    let createdTenantSlug: string;

    beforeAll(async () => {
      // Create a tenant for testing
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Slug Test Tenant',
          slug: 'slug-test-tenant',
          plan: 'professional',
        },
      });
      createdTenantSlug = tenant.slug;
    });

    afterAll(async () => {
      // Cleanup
      await prisma.tenant.delete({ where: { slug: createdTenantSlug } }).catch(() => {});
    });

    it('should return tenant by slug (super_admin only)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/tenants/slug/${createdTenantSlug}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('slug', createdTenantSlug);
          expect(res.body).toHaveProperty('name', 'Slug Test Tenant');
          expect(res.body).toHaveProperty('plan', 'professional');
        });
    });

    it('should return 404 for non-existent slug', () => {
      return request(app.getHttpServer())
        .get('/api/v1/tenants/slug/non-existent-slug')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .expect(404);
    });

    it('should return 403 for tenant_admin', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/tenants/slug/${createdTenantSlug}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .set('X-Tenant-ID', testTenantId)
        .expect(403);
    });
  });

  describe('PATCH /api/v1/tenants/:id', () => {
    let createdTenantId: string;

    beforeAll(async () => {
      // Create a tenant for testing
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Update Test Tenant',
          slug: 'update-test-tenant',
          plan: 'free',
          settings: { original: true },
        },
      });
      createdTenantId = tenant.id;
    });

    afterAll(async () => {
      // Cleanup
      await prisma.tenant.delete({ where: { id: createdTenantId } }).catch(() => {});
    });

    it('should update tenant (super_admin only)', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .send({
          name: 'Updated Tenant Name',
          plan: 'enterprise',
          settings: { updated: true },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', createdTenantId);
          expect(res.body).toHaveProperty('name', 'Updated Tenant Name');
          expect(res.body).toHaveProperty('plan', 'enterprise');
          expect(res.body.settings).toHaveProperty('updated', true);
        });
    });

    it('should update only provided fields', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .send({
          name: 'Partially Updated Tenant',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('name', 'Partially Updated Tenant');
          expect(res.body).toHaveProperty('plan', 'enterprise'); // Should remain unchanged
        });
    });

    it('should merge settings object', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .send({
          settings: { newSetting: 'value' },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.settings).toHaveProperty('updated', true); // Previous setting
          expect(res.body.settings).toHaveProperty('newSetting', 'value'); // New setting
        });
    });

    it('should return 404 for non-existent tenant', () => {
      const fakeTenantId = '123e4567-e89b-12d3-a456-426614174000';
      return request(app.getHttpServer())
        .patch(`/api/v1/tenants/${fakeTenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .send({
          name: 'Updated Name',
        })
        .expect(404);
    });

    it('should return 409 for duplicate slug', async () => {
      // Create another tenant
      const otherTenant = await prisma.tenant.create({
        data: {
          name: 'Other Tenant',
          slug: 'other-tenant',
          plan: 'free',
        },
      });

      // Try to update with existing slug
      const result = await request(app.getHttpServer())
        .patch(`/api/v1/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .send({
          slug: 'other-tenant',
        })
        .expect(409);

      // Cleanup
      await prisma.tenant.delete({ where: { id: otherTenant.id } });
    });

    it('should return 403 for tenant_admin', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .set('X-Tenant-ID', testTenantId)
        .send({
          name: 'Updated Name',
        })
        .expect(403);
    });

    it('should return 401 without authorization', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/tenants/${createdTenantId}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .send({
          name: 'Updated Name',
        })
        .expect(401);
    });
  });

  describe('DELETE /api/v1/tenants/:id', () => {
    it('should delete tenant (super_admin only)', async () => {
      // Create a tenant for deletion
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Delete Test Tenant',
          slug: 'delete-test-tenant',
          plan: 'free',
        },
      });

      return request(app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('Delete Test Tenant');
        });
    });

    it('should return 404 for non-existent tenant', () => {
      const fakeTenantId = '123e4567-e89b-12d3-a456-426614174000';
      return request(app.getHttpServer())
        .delete(`/api/v1/tenants/${fakeTenantId}`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .expect(404);
    });

    it('should return 403 for tenant_admin', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Delete Test Tenant 2',
          slug: 'delete-test-tenant-2',
          plan: 'free',
        },
      });

      const result = await request(app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}`)
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .set('X-Tenant-ID', testTenantId)
        .expect(403);

      // Cleanup
      await prisma.tenant.delete({ where: { id: tenant.id } });
    });

    it('should return 401 without authorization', async () => {
      const tenant = await prisma.tenant.create({
        data: {
          name: 'Delete Test Tenant 3',
          slug: 'delete-test-tenant-3',
          plan: 'free',
        },
      });

      const result = await request(app.getHttpServer())
        .delete(`/api/v1/tenants/${tenant.id}`)
        .set('X-Tenant-ID', superAdminTenantId)
        .expect(401);

      // Cleanup
      await prisma.tenant.delete({ where: { id: tenant.id } });
    });
  });
});





