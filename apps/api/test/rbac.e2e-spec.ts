///api/v1/ <reference types="jest" /api/v1/>
///api/v1/ <reference path="./api/v1/tsconfig.json" /api/v1/>
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Response } from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { TestAppModule } from '../src/test-app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createUserWithOrg } from './helpers/rls';
import { Role } from '../src/common/auth/roles.enum';

describe('RBAC System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let orgId: string;
  let siteId: string;
  let superAdminOrgId: string;
  let superAdminToken: string;
  let orgAdminToken: string;
  let editorToken: string;
  let viewerToken: string;
  let superAdminUserId: string;
  let orgAdminUserId: string;
  let editorUserId: string;
  let viewerUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    const org = await prisma.organization.create({
      data: {
        name: 'RBAC Test Org',
        slug: `rbac-test-org-${Date.now()}`,
        plan: 'free',
      },
    });
    orgId = org.id;

    const site = await prisma.site.create({
      data: {
        orgId,
        name: 'RBAC Test Site',
        slug: `rbac-test-site-${Date.now()}`,
      },
    });
    siteId = site.id;

    const superAdminOrg = await prisma.organization.create({
      data: {
        name: 'Super Admin Org',
        slug: `super-admin-org-${Date.now()}`,
        plan: 'enterprise',
      },
    });
    superAdminOrgId = superAdminOrg.id;

    const superAdminUser = await createUserWithOrg(prisma, {
      data: {
        orgId: superAdminOrgId,
        email: 'superadmin@test.com',
        passwordHash: '$2b$10$rQZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK',
        role: Role.SUPER_ADMIN,
      },
    });
    superAdminUserId = superAdminUser.id;

    const orgAdminUser = await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'admin@test.com',
        passwordHash: '$2b$10$rQZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK',
        role: Role.ORG_ADMIN,
        siteRole: 'admin',
      },
    });
    orgAdminUserId = orgAdminUser.id;

    const editorUser = await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'editor@test.com',
        passwordHash: '$2b$10$rQZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK',
        role: Role.EDITOR,
        siteRole: 'editor',
      },
    });
    editorUserId = editorUser.id;

    const viewerUser = await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'viewer@test.com',
        passwordHash: '$2b$10$rQZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK',
        role: Role.VIEWER,
        siteRole: 'viewer',
      },
    });
    viewerUserId = viewerUser.id;

    superAdminToken = jwtService.sign({
      sub: superAdminUser.id,
      email: superAdminUser.email,
      orgId: superAdminOrgId,
      role: superAdminUser.role,
    });
    orgAdminToken = jwtService.sign({
      sub: orgAdminUser.id,
      email: orgAdminUser.email,
      orgId,
      siteId,
      role: orgAdminUser.role,
    });
    editorToken = jwtService.sign({
      sub: editorUser.id,
      email: editorUser.email,
      orgId,
      siteId,
      role: editorUser.role,
    });
    viewerToken = jwtService.sign({
      sub: viewerUser.id,
      email: viewerUser.email,
      orgId,
      siteId,
      role: viewerUser.role,
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [superAdminUserId, orgAdminUserId, editorUserId, viewerUserId],
        },
      },
    });
    await prisma.site.deleteMany({ where: { id: siteId } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgId, superAdminOrgId] } } });
    await app.close();
  });

  describe('Users Endpoint - Permission Checks', () => {
    describe('GET /api/v1/users/api/v1/me', () => {
      it('should allow all authenticated users to access their own profile', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${viewerToken}`)
          .set('X-Org-ID', orgId)
          .expect(200)
          .expect((res: Response) => {
            expect(res.body).toHaveProperty('id', viewerUserId);
            expect(res.body).toHaveProperty('email', 'viewer@test.com');
            expect(res.body).toHaveProperty('role', Role.VIEWER);
          });
      });

      it('should return 401 without authorization header', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users/me')
          .set('X-Org-ID', orgId)
          .expect(401);
      });
    });

    describe('GET /api/v1/users', () => {
      it('should allow org_admin to list users', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('X-Org-ID', orgId)
          .expect(200)
          .expect((res: Response) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });

      it('should allow super_admin to list users', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${superAdminToken}`)
          .set('X-Org-ID', orgId)
          .expect(200);
      });

      it('should deny editor access to list users', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Org-ID', orgId)
          .expect(403);
      });

      it('should deny viewer access to list users', () => {
        return request(app.getHttpServer())
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${viewerToken}`)
          .set('X-Org-ID', orgId)
          .expect(403);
      });
    });

    describe('GET /api/v1/users/api/v1/:id', () => {
      it('should allow org_admin to view user details', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/users/${editorUserId}`)
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('X-Org-ID', orgId)
          .expect(200)
          .expect((res: Response) => {
            expect(res.body).toHaveProperty('id', editorUserId);
            expect(res.body).toHaveProperty('email', 'editor@test.com');
          });
      });

      it('should deny editor access to view user details', () => {
        return request(app.getHttpServer())
          .get(`/api/v1/users/${viewerUserId}`)
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Org-ID', orgId)
          .expect(403);
      });
    });
  });

  describe('Collections Endpoint - Permission Checks', () => {
    beforeAll(async () => {
      await prisma.collection.create({
        data: {
          siteId,
          slug: 'test-collection',
          name: 'Test Collection',
          schemaJson: { type: 'object', properties: {} },
        },
      });
    });

    afterAll(async () => {
      await prisma.collection.deleteMany({ where: { siteId } });
    });

    describe('POST /api/v1/collections', () => {
      it('should allow org_admin to create collections', () => {
        return request(app.getHttpServer())
          .post('/api/v1/collections')
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('X-Site-ID', siteId)
          .send({
            slug: 'new-collection',
            name: 'New Collection',
            schemaJson: { type: 'object', properties: {} },
          })
          .expect(201);
      });

      it('should deny editor access to create collections', () => {
        return request(app.getHttpServer())
          .post('/api/v1/collections')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Site-ID', siteId)
          .send({
            slug: 'editor-collection',
            name: 'Editor Collection',
            schemaJson: { type: 'object', properties: {} },
          })
          .expect(403);
      });

      it('should deny viewer access to create collections', () => {
        return request(app.getHttpServer())
          .post('/api/v1/collections')
          .set('Authorization', `Bearer ${viewerToken}`)
          .set('X-Site-ID', siteId)
          .send({
            slug: 'viewer-collection',
            name: 'Viewer Collection',
            schemaJson: { type: 'object', properties: {} },
          })
          .expect(403);
      });
    });

    describe('GET /api/v1/collections', () => {
      it('should allow viewer to read collections', () => {
        return request(app.getHttpServer())
          .get('/api/v1/collections')
          .set('Authorization', `Bearer ${viewerToken}`)
          .set('X-Site-ID', siteId)
          .expect(200)
          .expect((res: Response) => {
            expect(Array.isArray(res.body)).toBe(true);
          });
      });

      it('should allow editor to read collections', () => {
        return request(app.getHttpServer())
          .get('/api/v1/collections')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Site-ID', siteId)
          .expect(200);
      });
    });

    describe('DELETE /api/v1/collections/api/v1/:slug', () => {
      it('should allow org_admin to delete collections', async () => {
        const collection = await prisma.collection.create({
          data: {
            siteId,
            slug: 'delete-test',
            name: 'Delete Test',
            schemaJson: { type: 'object', properties: {} },
          },
        });

        return request(app.getHttpServer())
          .delete(`/api/v1/collections/${collection.slug}`)
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('X-Site-ID', siteId)
          .expect(200);
      });

      it('should deny editor access to delete collections', () => {
        return request(app.getHttpServer())
          .delete('/api/v1/collections/test-collection')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Site-ID', siteId)
          .expect(403);
      });
    });
  });

  describe('Content Types Endpoint - Permission Checks', () => {
    beforeAll(async () => {
      await prisma.contentType.create({
        data: {
          siteId,
          name: 'Test Content Type',
          slug: 'test-content-type',
          schema: { type: 'object', properties: {} },
        },
      });
    });

    afterAll(async () => {
      await prisma.contentType.deleteMany({ where: { siteId } });
    });

    describe('POST /api/v1/content-types', () => {
      it('should allow org_admin to create content types', () => {
        return request(app.getHttpServer())
          .post('/api/v1/content-types')
          .set('Authorization', `Bearer ${orgAdminToken}`)
          .set('X-Site-ID', siteId)
          .send({
            name: 'New Content Type',
            slug: 'new-content-type',
            schema: { type: 'object', properties: {} },
          })
          .expect(201);
      });

      it('should deny editor access to create content types', () => {
        return request(app.getHttpServer())
          .post('/api/v1/content-types')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Site-ID', siteId)
          .send({
            name: 'Editor Content Type',
            slug: 'editor-content-type',
            schema: { type: 'object', properties: {} },
          })
          .expect(403);
      });
    });

    describe('GET /api/v1/content-types', () => {
      it('should allow viewer to read content types', () => {
        return request(app.getHttpServer())
          .get('/api/v1/content-types')
          .set('Authorization', `Bearer ${viewerToken}`)
          .set('X-Site-ID', siteId)
          .expect(200);
      });
    });
  });
});






