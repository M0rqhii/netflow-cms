import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { TestAppModule } from '../src/test-app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createUserWithOrg } from './helpers/rls';

// E2E tests use real JWT tokens with test secret from AuthModule

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let orgId: string;
  let siteId: string;
  let adminUserId: string;
  let editorUserId: string;
  let viewerUserId: string;
  let adminToken: string;
  let editorToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    const organization = await prisma.organization.create({
      data: {
        name: 'Test Organization',
        slug: `test-org-${Date.now()}`,
        plan: 'free',
      },
    });
    orgId = organization.id;

    const site = await prisma.site.create({
      data: {
        orgId,
        name: 'Test Site',
        slug: `test-site-${Date.now()}`,
      },
    });
    siteId = site.id;

    const adminUser = await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'admin@test.com',
        passwordHash: 'hashed-password',
        role: 'org_admin',
        siteRole: 'admin',
      },
    });
    adminUserId = adminUser.id;

    const editorUser = await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'editor@test.com',
        passwordHash: 'hashed-password',
        role: 'editor',
        siteRole: 'editor',
      },
    });
    editorUserId = editorUser.id;

    const viewerUser = await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'viewer@test.com',
        passwordHash: 'hashed-password',
        role: 'viewer',
        siteRole: 'viewer',
      },
    });
    viewerUserId = viewerUser.id;

    adminToken = jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      orgId,
      role: adminUser.role,
      siteId,
    });
    editorToken = jwtService.sign({
      sub: editorUser.id,
      email: editorUser.email,
      orgId,
      role: editorUser.role,
      siteId,
    });
    viewerToken = jwtService.sign({
      sub: viewerUser.id,
      email: viewerUser.email,
      orgId,
      role: viewerUser.role,
      siteId,
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { orgId } });
    await prisma.site.deleteMany({ where: { id: siteId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await app.close();
  });

  describe('GET /api/api/v1/v1/api/v1/users/api/v1/me', () => {
    it('should return current user information', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Org-ID', orgId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', adminUserId);
          expect(res.body).toHaveProperty('email', 'admin@test.com');
          expect(res.body).toHaveProperty('role', 'org_admin');
          expect(res.body).toHaveProperty('orgId', orgId);
        });
    });

    it('should return 401 without authorization header', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('X-Org-ID', orgId)
        .expect(401);
    });

    it('should return 400 without organization header', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return list of users for org_admin', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Org-ID', orgId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should return 403 for editor role', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${editorToken}`)
        .set('X-Org-ID', orgId)
        .expect(403);
    });

    it('should return 403 for viewer role', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${viewerToken}`)
        .set('X-Org-ID', orgId)
        .expect(403);
    });
  });

  describe('GET /api/v1/users/api/v1/:id', () => {
    it('should return user by ID for org_admin', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/users/${editorUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Org-ID', orgId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', editorUserId);
          expect(res.body).toHaveProperty('email', 'editor@test.com');
        });
    });

    it('should return 403 for editor role', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/users/${viewerUserId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .set('X-Org-ID', orgId)
        .expect(403);
    });

    it('should return 404 for non-existent user', () => {
      const fakeUserId = '123e4567-e89b-12d3-a456-426614174000';
      return request(app.getHttpServer())
        .get(`/api/v1/users/${fakeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Org-ID', orgId)
        .expect(404);
    });
  });
});






