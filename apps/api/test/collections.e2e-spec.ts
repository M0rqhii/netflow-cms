import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Collections (e2e)', () => {
  let app: INestApplication;
  const tenantId = 'tenant-e2e-1';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/collections', () => {
    it('should create collection', () => {
      return request(app.getHttpServer())
        .post('/api/v1/collections')
        .set('X-Tenant-Id', tenantId)
        .send({
          slug: 'articles',
          name: 'Articles',
          schemaJson: { title: 'string' },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.slug).toBe('articles');
          expect(res.body.tenantId).toBe(tenantId);
        });
    });

    it('should return 400 without X-Tenant-Id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/collections')
        .send({
          slug: 'articles',
          name: 'Articles',
          schemaJson: {},
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/collections', () => {
    it('should list collections for tenant', async () => {
      // Create collection first
      await request(app.getHttpServer())
        .post('/api/v1/collections')
        .set('X-Tenant-Id', tenantId)
        .send({
          slug: 'test-list',
          name: 'Test List',
          schemaJson: {},
        });

      return request(app.getHttpServer())
        .get('/api/v1/collections')
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /api/v1/collections/:slug', () => {
    it('should get collection by slug', async () => {
      const slug = 'test-get';
      // Create collection first
      await request(app.getHttpServer())
        .post('/api/v1/collections')
        .set('X-Tenant-Id', tenantId)
        .send({
          slug,
          name: 'Test Get',
          schemaJson: {},
        });

      return request(app.getHttpServer())
        .get(`/api/v1/collections/${slug}`)
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body.slug).toBe(slug);
        });
    });

    it('should return 404 for nonexistent collection', () => {
      return request(app.getHttpServer())
        .get('/api/v1/collections/nonexistent')
        .set('X-Tenant-Id', tenantId)
        .expect(404);
    });
  });
});

