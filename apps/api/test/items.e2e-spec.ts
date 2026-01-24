import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { TestAppModule } from '../src/test-app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createUserWithOrg } from './helpers/rls';

describe('Collection Items (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let orgId: string;
  let siteId: string;
  let token: string;
  let collectionSlug: string;

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
      data: { name: 'Items Org', slug: `items-org-${Date.now()}`, plan: 'free' },
    });
    orgId = organization.id;

    const site = await prisma.site.create({
      data: { orgId, name: 'Items Site', slug: `items-site-${Date.now()}` },
    });
    siteId = site.id;

    const user = await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'items-admin@test.com',
        passwordHash: 'hashed-password',
        role: 'org_admin',
        siteRole: 'admin',
      },
    });

    token = jwtService.sign({
      sub: user.id,
      email: user.email,
      orgId,
      siteId,
      role: user.role,
    });

    collectionSlug = 'news';
    await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Site-ID', siteId)
      .send({
        slug: collectionSlug,
        name: 'News',
        schemaJson: { title: 'string' },
      });
  });

  afterAll(async () => {
    await prisma.collectionItem.deleteMany({ where: { siteId } });
    await prisma.collection.deleteMany({ where: { siteId } });
    await prisma.user.deleteMany({ where: { orgId } });
    await prisma.site.deleteMany({ where: { id: siteId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await app.close();
  });

  describe('POST /api/api/v1/v1/api/v1/collections/api/v1/:slug/api/v1/items', () => {
    it('should create item', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          data: { title: 'Hello World' },
          status: 'DRAFT',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.data.title).toBe('Hello World');
          expect(res.body.status).toBe('DRAFT');
          expect(res.body.version).toBe(1);
        });
    });
  });

  describe('GET /api/api/v1/v1/api/v1/collections/api/v1/:slug/api/v1/items', () => {
    it('should list items', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          data: { title: 'Test Item' },
          status: 'DRAFT',
        });

      return request(app.getHttpServer())
        .get(`/api/v1/collections/${collectionSlug}/items`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(Array.isArray(res.body.items)).toBe(true);
        });
    });
  });

  describe('PUT /api/api/v1/v1/api/v1/collections/api/v1/:slug/api/v1/items/api/v1/:id', () => {
    it('should update item with version check', async () => {
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          data: { title: 'Original' },
          status: 'DRAFT',
        });

      const itemId = createRes.body.id;
      const version = createRes.body.version;

      return request(app.getHttpServer())
        .put(`/api/v1/collections/${collectionSlug}/items/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          data: { title: 'Updated' },
          status: 'PUBLISHED',
          version,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data.title).toBe('Updated');
          expect(res.body.status).toBe('PUBLISHED');
          expect(res.body.version).toBe(version + 1);
        });
    });

    it('should return 409 on version mismatch', async () => {
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          data: { title: 'Test' },
          status: 'DRAFT',
        });

      const itemId = createRes.body.id;

      return request(app.getHttpServer())
        .put(`/api/v1/collections/${collectionSlug}/items/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          data: { title: 'Updated' },
          status: 'DRAFT',
          version: 999,
        })
        .expect(409);
    });
  });

  describe('GET /api/api/v1/v1/api/v1/collections/api/v1/:slug/api/v1/items/api/v1/:id', () => {
    it('should return item with ETag header', async () => {
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          data: { title: 'ETag Test' },
          status: 'DRAFT',
        });

      const itemId = createRes.body.id;

      return request(app.getHttpServer())
        .get(`/api/v1/collections/${collectionSlug}/items/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('etag');
        });
    });

    it('should return 304 Not Modified with If-None-Match', async () => {
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          data: { title: 'ETag Test' },
          status: 'DRAFT',
        });

      const itemId = createRes.body.id;
      const etag = createRes.body.etag;

      return request(app.getHttpServer())
        .get(`/api/v1/collections/${collectionSlug}/items/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .set('If-None-Match', etag)
        .expect(304);
    });

    it('should return 200 when ETag does not match', async () => {
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          data: { title: 'ETag Mismatch Test' },
          status: 'DRAFT',
        });

      const itemId = createRes.body.id;

      return request(app.getHttpServer())
        .get(`/api/v1/collections/${collectionSlug}/items/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .set('If-None-Match', 'wrong-etag')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
        });
    });
  });

  describe('DELETE /api/api/v1/v1/api/v1/collections/api/v1/:slug/api/v1/items/api/v1/:id', () => {
    it('should delete item', async () => {
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          data: { title: 'To Delete' },
          status: 'DRAFT',
        });

      const itemId = createRes.body.id;

      return request(app.getHttpServer())
        .delete(`/api/v1/collections/${collectionSlug}/items/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ ok: true });
        });
    });

    it('should return 404 when deleting nonexistent item', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/collections/${collectionSlug}/items/nonexistent`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(404);
    });
  });
});







