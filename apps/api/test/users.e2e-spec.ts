import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let adminUserId: string;
  let editorUserId: string;
  let viewerUserId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Create test tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'free',
      },
    });
    tenantId = tenant.id;

    // Create test users
    const adminUser = await prisma.user.create({
      data: {
        tenantId,
        email: 'admin@test.com',
        passwordHash: 'hashed-password',
        role: 'tenant_admin',
      },
    });
    adminUserId = adminUser.id;

    const editorUser = await prisma.user.create({
      data: {
        tenantId,
        email: 'editor@test.com',
        passwordHash: 'hashed-password',
        role: 'editor',
      },
    });
    editorUserId = editorUser.id;

    const viewerUser = await prisma.user.create({
      data: {
        tenantId,
        email: 'viewer@test.com',
        passwordHash: 'hashed-password',
        role: 'viewer',
      },
    });
    viewerUserId = viewerUser.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  describe('GET /api/v1/users/me', () => {
    it('should return current user information', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${adminUserId}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', adminUserId);
          expect(res.body).toHaveProperty('email', 'admin@test.com');
          expect(res.body).toHaveProperty('role', 'tenant_admin');
          expect(res.body).toHaveProperty('tenantId', tenantId);
        });
    });

    it('should return 401 without authorization header', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('X-Tenant-ID', tenantId)
        .expect(401);
    });

    it('should return 400 without tenant header', () => {
      return request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${adminUserId}`)
        .expect(400);
    });
  });

  describe('GET /users', () => {
    it('should return list of users for tenant_admin', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminUserId}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should return 403 for editor role', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${editorUserId}`)
        .set('X-Tenant-ID', tenantId)
        .expect(403);
    });

    it('should return 403 for viewer role', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${viewerUserId}`)
        .set('X-Tenant-ID', tenantId)
        .expect(403);
    });
  });

  describe('GET /users/:id', () => {
    it('should return user by ID for tenant_admin', () => {
      return request(app.getHttpServer())
        .get(`/users/${editorUserId}`)
        .set('Authorization', `Bearer ${adminUserId}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', editorUserId);
          expect(res.body).toHaveProperty('email', 'editor@test.com');
        });
    });

    it('should return 403 for editor role', () => {
      return request(app.getHttpServer())
        .get(`/users/${viewerUserId}`)
        .set('Authorization', `Bearer ${editorUserId}`)
        .set('X-Tenant-ID', tenantId)
        .expect(403);
    });

    it('should return 404 for non-existent user', () => {
      const fakeUserId = '123e4567-e89b-12d3-a456-426614174000';
      return request(app.getHttpServer())
        .get(`/users/${fakeUserId}`)
        .set('Authorization', `Bearer ${adminUserId}`)
        .set('X-Tenant-ID', tenantId)
        .expect(404);
    });
  });
});

