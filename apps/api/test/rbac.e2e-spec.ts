/// <reference types="jest" />
/// <reference path="./tsconfig.json" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { Role } from '../src/common/auth/roles.enum';

describe('RBAC System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let tenantId: string;
  let superAdminTenantId: string;
  let superAdminToken: string;
  let tenantAdminToken: string;
  let editorToken: string;
  let viewerToken: string;
  let superAdminUserId: string;
  let tenantAdminUserId: string;
  let editorUserId: string;
  let viewerUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'RBAC Test Tenant',
        slug: 'rbac-test-tenant',
        plan: 'free',
      },
    });
    tenantId = tenant.id;

    // Create super admin user (belongs to a different tenant for super admin)
    const superAdminTenant = await prisma.tenant.create({
      data: {
        name: 'Super Admin Tenant',
        slug: 'super-admin-tenant',
        plan: 'enterprise',
      },
    });
    superAdminTenantId = superAdminTenant.id;

    const superAdminUser = await prisma.user.create({
      data: {
        tenantId: superAdminTenant.id,
        email: 'superadmin@test.com',
        passwordHash: '$2b$10$rQZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK',
        role: Role.SUPER_ADMIN,
      },
    });
    superAdminUserId = superAdminUser.id;

    // Create tenant admin user
    const tenantAdminUser = await prisma.user.create({
      data: {
        tenantId,
        email: 'admin@test.com',
        passwordHash: '$2b$10$rQZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK',
        role: Role.TENANT_ADMIN,
      },
    });
    tenantAdminUserId = tenantAdminUser.id;

    // Create editor user
    const editorUser = await prisma.user.create({
      data: {
        tenantId,
        email: 'editor@test.com',
        passwordHash: '$2b$10$rQZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK',
        role: Role.EDITOR,
      },
    });
    editorUserId = editorUser.id;

    // Create viewer user
    const viewerUser = await prisma.user.create({
      data: {
        tenantId,
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
      tenantId: superAdminUser.tenantId,
      role: superAdminUser.role,
    });
    tenantAdminToken = jwtService.sign({
      sub: tenantAdminUser.id,
      email: tenantAdminUser.email,
      tenantId: tenantAdminUser.tenantId,
      role: tenantAdminUser.role,
    });
    editorToken = jwtService.sign({
      sub: editorUser.id,
      email: editorUser.email,
      tenantId: editorUser.tenantId,
      role: editorUser.role,
    });
    viewerToken = jwtService.sign({
      sub: viewerUser.id,
      email: viewerUser.email,
      tenantId: viewerUser.tenantId,
      role: viewerUser.role,
    });
  });

  afterAll(async () => {
    // Cleanup - delete users first
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [superAdminUserId, tenantAdminUserId, editorUserId, viewerUserId],
        },
      },
    });
    // Then delete tenants
    await prisma.tenant.deleteMany({
      where: {
        id: {
          in: [tenantId, superAdminTenantId],
        },
      },
    });
    await app.close();
  });

  describe('Users Endpoint - Permission Checks', () => {
    describe('GET /users/me', () => {
      it('should allow all authenticated users to access their own profile', () => {
        return request(app.getHttpServer())
          .get('/users/me')
          .set('Authorization', `Bearer ${viewerToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(200)
          .expect((res: Response) => {
            expect(res.body).toHaveProperty('id', viewerUserId);
            expect(res.body).toHaveProperty('email', 'viewer@test.com');
            expect(res.body).toHaveProperty('role', Role.VIEWER);
          });
      });

      it('should return 401 without authorization header', () => {
        return request(app.getHttpServer())
          .get('/users/me')
          .set('X-Tenant-ID', tenantId)
          .expect(401);
      });
    });

    describe('GET /users', () => {
      it('should allow tenant_admin to list users', () => {
        return request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${tenantAdminToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(200)
          .expect((res: Response) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });

      it('should allow super_admin to list users', () => {
        return request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(200);
      });

      it('should deny editor access to list users', () => {
        return request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(403);
      });

      it('should deny viewer access to list users', () => {
        return request(app.getHttpServer())
          .get('/users')
          .set('Authorization', `Bearer ${viewerToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(403);
      });
    });

    describe('GET /users/:id', () => {
      it('should allow tenant_admin to view user details', () => {
        return request(app.getHttpServer())
          .get(`/users/${editorUserId}`)
          .set('Authorization', `Bearer ${tenantAdminToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(200)
          .expect((res: Response) => {
            expect(res.body).toHaveProperty('id', editorUserId);
            expect(res.body).toHaveProperty('email', 'editor@test.com');
          });
      });

      it('should deny editor access to view user details', () => {
        return request(app.getHttpServer())
          .get(`/users/${viewerUserId}`)
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(403);
      });
    });
  });

  describe('Collections Endpoint - Permission Checks', () => {
    beforeAll(async () => {
      // Create a test collection
      await prisma.collection.create({
        data: {
          tenantId,
          slug: 'test-collection',
          name: 'Test Collection',
          schemaJson: { type: 'object', properties: {} },
        },
      });
    });

    afterAll(async () => {
      await prisma.collection.deleteMany({ where: { tenantId } });
    });

    describe('POST /collections', () => {
      it('should allow tenant_admin to create collections', () => {
        return request(app.getHttpServer())
          .post('/collections')
          .set('Authorization', `Bearer ${tenantAdminToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            slug: 'new-collection',
            name: 'New Collection',
            schemaJson: { type: 'object', properties: {} },
          })
          .expect(201);
      });

      it('should deny editor access to create collections', () => {
        return request(app.getHttpServer())
          .post('/collections')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            slug: 'editor-collection',
            name: 'Editor Collection',
            schemaJson: { type: 'object', properties: {} },
          })
          .expect(403);
      });

      it('should deny viewer access to create collections', () => {
        return request(app.getHttpServer())
          .post('/collections')
          .set('Authorization', `Bearer ${viewerToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            slug: 'viewer-collection',
            name: 'Viewer Collection',
            schemaJson: { type: 'object', properties: {} },
          })
          .expect(403);
      });
    });

    describe('GET /collections', () => {
      it('should allow viewer to read collections', () => {
        return request(app.getHttpServer())
          .get('/collections')
          .set('Authorization', `Bearer ${viewerToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(200)
          .expect((res: Response) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });

      it('should allow editor to read collections', () => {
        return request(app.getHttpServer())
          .get('/collections')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(200);
      });
    });

    describe('DELETE /collections/:slug', () => {
      it('should allow tenant_admin to delete collections', async () => {
        const collection = await prisma.collection.create({
          data: {
            tenantId,
            slug: 'delete-test',
            name: 'Delete Test',
            schemaJson: { type: 'object', properties: {} },
          },
        });

        return request(app.getHttpServer())
          .delete(`/collections/${collection.slug}`)
          .set('Authorization', `Bearer ${tenantAdminToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(200);
      });

      it('should deny editor access to delete collections', () => {
        return request(app.getHttpServer())
          .delete('/collections/test-collection')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(403);
      });
    });
  });

  describe('Content Types Endpoint - Permission Checks', () => {
    beforeAll(async () => {
      await prisma.contentType.create({
        data: {
          tenantId,
          name: 'Test Content Type',
          slug: 'test-content-type',
          schema: { type: 'object', properties: {} },
        },
      });
    });

    afterAll(async () => {
      await prisma.contentType.deleteMany({ where: { tenantId } });
    });

    describe('POST /content-types', () => {
      it('should allow tenant_admin to create content types', () => {
        return request(app.getHttpServer())
          .post('/content-types')
          .set('Authorization', `Bearer ${tenantAdminToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            name: 'New Content Type',
            slug: 'new-content-type',
            schema: { type: 'object', properties: {} },
          })
          .expect(201);
      });

      it('should deny editor access to create content types', () => {
        return request(app.getHttpServer())
          .post('/content-types')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            name: 'Editor Content Type',
            slug: 'editor-content-type',
            schema: { type: 'object', properties: {} },
          })
          .expect(403);
      });
    });

    describe('GET /content-types', () => {
      it('should allow viewer to read content types', () => {
        return request(app.getHttpServer())
          .get('/content-types')
          .set('Authorization', `Bearer ${viewerToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(200);
      });
    });
  });

  describe('Tenants Endpoint - Super Admin Only', () => {
    describe('GET /tenants', () => {
      it('should allow super_admin to list tenants', () => {
        return request(app.getHttpServer())
          .get('/tenants')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .expect(200)
          .expect((res: Response) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });

      it('should deny tenant_admin access to list tenants', () => {
        return request(app.getHttpServer())
          .get('/tenants')
          .set('Authorization', `Bearer ${tenantAdminToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(403);
      });

      it('should deny editor access to list tenants', () => {
        return request(app.getHttpServer())
          .get('/tenants')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Tenant-ID', tenantId)
          .expect(403);
      });
    });

    describe('POST /tenants', () => {
      it('should allow super_admin to create tenants', () => {
        return request(app.getHttpServer())
          .post('/tenants')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .send({
            name: 'New Tenant',
            slug: 'new-tenant',
            plan: 'free',
          })
          .expect(201);
      });

      it('should deny tenant_admin access to create tenants', () => {
        return request(app.getHttpServer())
          .post('/tenants')
          .set('Authorization', `Bearer ${tenantAdminToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            name: 'Unauthorized Tenant',
            slug: 'unauthorized-tenant',
            plan: 'free',
          })
          .expect(403);
      });
    });
  });

  describe('Role Hierarchy Tests', () => {
    it('should verify super_admin has all permissions', () => {
      // Super admin should be able to access tenant endpoints
      return request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
    });

    it('should verify tenant_admin cannot access tenant management', () => {
      return request(app.getHttpServer())
        .get('/tenants')
        .set('Authorization', `Bearer ${tenantAdminToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(403);
    });
  });
});
