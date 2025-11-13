import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Collection Items (e2e)', () => {
  let app: INestApplication;
  const tenantId = 'tenant-e2e-2';
  let collectionSlug: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Create collection for tests
    collectionSlug = 'news';
    await request(app.getHttpServer())
      .post('/api/v1/collections')
      .set('X-Tenant-Id', tenantId)
      .send({
        slug: collectionSlug,
        name: 'News',
        schemaJson: { title: 'string' },
      });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/collections/:slug/items', () => {
    it('should create item', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('X-Tenant-Id', tenantId)
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

  describe('GET /api/v1/collections/:slug/items', () => {
    it('should list items', async () => {
      // Create item first
      await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: { title: 'Test Item' },
          status: 'DRAFT',
        });

      return request(app.getHttpServer())
        .get(`/api/v1/collections/${collectionSlug}/items`)
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(Array.isArray(res.body.items)).toBe(true);
        });
    });
  });

  describe('PUT /api/v1/collections/:slug/items/:id', () => {
    it('should update item with version check', async () => {
      // Create item
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: { title: 'Original' },
          status: 'DRAFT',
        });

      const itemId = createRes.body.id;
      const version = createRes.body.version;

      // Update with correct version
      return request(app.getHttpServer())
        .put(`/api/v1/collections/${collectionSlug}/items/${itemId}`)
        .set('X-Tenant-Id', tenantId)
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
      // Create item
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: { title: 'Test' },
          status: 'DRAFT',
        });

      const itemId = createRes.body.id;

      // Try to update with wrong version
      return request(app.getHttpServer())
        .put(`/api/v1/collections/${collectionSlug}/items/${itemId}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: { title: 'Updated' },
          status: 'DRAFT',
          version: 999, // Wrong version
        })
        .expect(409);
    });
  });

  describe('GET /api/v1/collections/:slug/items/:id', () => {
    it('should return item with ETag header', async () => {
      // Create item
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: { title: 'ETag Test' },
          status: 'DRAFT',
        });

      const itemId = createRes.body.id;

      // Get item and check ETag header
      return request(app.getHttpServer())
        .get(`/api/v1/collections/${collectionSlug}/items/${itemId}`)
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('etag');
        });
    });

    it('should return 304 Not Modified with If-None-Match', async () => {
      // Create item
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: { title: 'ETag Test' },
          status: 'DRAFT',
        });

      const itemId = createRes.body.id;
      const etag = createRes.body.etag;

      // Get with If-None-Match header
      return request(app.getHttpServer())
        .get(`/api/v1/collections/${collectionSlug}/items/${itemId}`)
        .set('X-Tenant-Id', tenantId)
        .set('If-None-Match', etag)
        .expect(304);
    });

    it('should return 200 when ETag does not match', async () => {
      // Create item
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: { title: 'ETag Mismatch Test' },
          status: 'DRAFT',
        });

      const itemId = createRes.body.id;

      // Get with wrong ETag
      return request(app.getHttpServer())
        .get(`/api/v1/collections/${collectionSlug}/items/${itemId}`)
        .set('X-Tenant-Id', tenantId)
        .set('If-None-Match', 'wrong-etag')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
        });
    });
  });

  describe('DELETE /api/v1/collections/:slug/items/:id', () => {
    it('should delete item', async () => {
      // Create item
      const createRes = await request(app.getHttpServer())
        .post(`/api/v1/collections/${collectionSlug}/items`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: { title: 'To Delete' },
          status: 'DRAFT',
        });

      const itemId = createRes.body.id;

      // Delete item
      return request(app.getHttpServer())
        .delete(`/api/v1/collections/${collectionSlug}/items/${itemId}`)
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toEqual({ ok: true });
        });
    });

    it('should return 404 when deleting nonexistent item', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/collections/${collectionSlug}/items/nonexistent`)
        .set('X-Tenant-Id', tenantId)
        .expect(404);
    });
  });
});

