import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('ContentTypes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tenantId = 'tenant-e2e-content-types';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Create test tenant if it doesn't exist
    await prisma.tenant.upsert({
      where: { slug: tenantId },
      update: {},
      create: {
        id: tenantId,
        name: 'Test Tenant',
        slug: tenantId,
        plan: 'free',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.contentType.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await app.close();
  });

  describe('POST /api/v1/content-types', () => {
    it('should create content type with fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .send({
          name: 'Article',
          slug: 'article',
          fields: [
            {
              name: 'title',
              type: 'text',
              required: true,
              maxLength: 200,
            },
            {
              name: 'content',
              type: 'richtext',
              required: true,
            },
            {
              name: 'publishedAt',
              type: 'datetime',
              required: false,
            },
          ],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.slug).toBe('article');
          expect(res.body.name).toBe('Article');
          expect(res.body.tenantId).toBe(tenantId);
          expect(res.body.schema).toHaveProperty('type', 'object');
          expect(res.body.schema.properties).toHaveProperty('title');
          expect(res.body.schema.properties).toHaveProperty('content');
          expect(res.body.schema.required).toContain('title');
          expect(res.body.schema.required).toContain('content');
        });
    });

    it('should create content type with schema', () => {
      return request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .send({
          name: 'Page',
          slug: 'page',
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['title'],
          },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.slug).toBe('page');
          expect(res.body.schema).toHaveProperty('type', 'object');
        });
    });

    it('should return 400 without X-Tenant-Id', () => {
      return request(app.getHttpServer())
        .post('/api/v1/content-types')
        .send({
          name: 'Article',
          slug: 'article',
          fields: [],
        })
        .expect(400);
    });

    it('should return 400 if neither fields nor schema provided', () => {
      return request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .send({
          name: 'Article',
          slug: 'article',
        })
        .expect(400);
    });

    it('should return 409 on duplicate slug', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .send({
          name: 'Duplicate',
          slug: 'duplicate-slug',
          fields: [{ name: 'test', type: 'text' }],
        })
        .expect(201);

      return request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .send({
          name: 'Duplicate 2',
          slug: 'duplicate-slug',
          fields: [{ name: 'test', type: 'text' }],
        })
        .expect(409);
    });
  });

  describe('GET /api/v1/content-types', () => {
    it('should list content types for tenant', async () => {
      // Create content type first
      await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .send({
          name: 'Test List',
          slug: 'test-list',
          fields: [{ name: 'test', type: 'text' }],
        });

      return request(app.getHttpServer())
        .get('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('GET /api/v1/content-types/:id', () => {
    it('should get content type by id', async () => {
      // Create content type first
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .send({
          name: 'Test Get',
          slug: 'test-get',
          fields: [{ name: 'test', type: 'text' }],
        });

      const contentTypeId = createResponse.body.id;

      return request(app.getHttpServer())
        .get(`/api/v1/content-types/${contentTypeId}`)
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(contentTypeId);
          expect(res.body.slug).toBe('test-get');
        });
    });

    it('should return 404 for nonexistent content type', () => {
      return request(app.getHttpServer())
        .get('/api/v1/content-types/00000000-0000-0000-0000-000000000000')
        .set('X-Tenant-Id', tenantId)
        .expect(404);
    });
  });

  describe('PATCH /api/v1/content-types/:id', () => {
    it('should update content type', async () => {
      // Create content type first
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .send({
          name: 'Test Update',
          slug: 'test-update',
          fields: [{ name: 'test', type: 'text' }],
        });

      const contentTypeId = createResponse.body.id;

      return request(app.getHttpServer())
        .patch(`/api/v1/content-types/${contentTypeId}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          name: 'Updated Name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Name');
          expect(res.body.slug).toBe('test-update'); // Unchanged
        });
    });

    it('should update content type schema', async () => {
      // Create content type first
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .send({
          name: 'Test Schema Update',
          slug: 'test-schema-update',
          fields: [{ name: 'oldField', type: 'text' }],
        });

      const contentTypeId = createResponse.body.id;

      return request(app.getHttpServer())
        .patch(`/api/v1/content-types/${contentTypeId}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          fields: [
            { name: 'newField', type: 'text', required: true },
            { name: 'numberField', type: 'number' },
          ],
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.schema.properties).toHaveProperty('newField');
          expect(res.body.schema.properties).toHaveProperty('numberField');
          expect(res.body.schema.required).toContain('newField');
        });
    });
  });

  describe('DELETE /api/v1/content-types/:id', () => {
    it('should delete content type', async () => {
      // Create content type first
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .send({
          name: 'Test Delete',
          slug: 'test-delete',
          fields: [{ name: 'test', type: 'text' }],
        });

      const contentTypeId = createResponse.body.id;

      return request(app.getHttpServer())
        .delete(`/api/v1/content-types/${contentTypeId}`)
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('ok', true);
        });
    });

    it('should return 404 for nonexistent content type', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/content-types/00000000-0000-0000-0000-000000000000')
        .set('X-Tenant-Id', tenantId)
        .expect(404);
    });

    it('should return 409 if content type has entries', async () => {
      // Create content type
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .send({
          name: 'Test With Entries',
          slug: 'test-with-entries',
          fields: [{ name: 'test', type: 'text' }],
        });

      const contentTypeId = createResponse.body.id;

      // Create content entry
      await prisma.contentEntry.create({
        data: {
          tenantId,
          contentTypeId,
          data: { test: 'value' },
          status: 'draft',
        },
      });

      return request(app.getHttpServer())
        .delete(`/api/v1/content-types/${contentTypeId}`)
        .set('X-Tenant-Id', tenantId)
        .expect(409);
    });
  });

  describe('tenant isolation', () => {
    it('should only return content types for specific tenant', async () => {
      const tenantId2 = 'tenant-e2e-content-types-2';

      // Create second tenant
      await prisma.tenant.upsert({
        where: { slug: tenantId2 },
        update: {},
        create: {
          id: tenantId2,
          name: 'Test Tenant 2',
          slug: tenantId2,
          plan: 'free',
        },
      });

      // Create content type for tenant 1
      await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .send({
          name: 'Tenant 1 Type',
          slug: 'tenant-1-type',
          fields: [{ name: 'test', type: 'text' }],
        });

      // Create content type for tenant 2
      await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId2)
        .send({
          name: 'Tenant 2 Type',
          slug: 'tenant-2-type',
          fields: [{ name: 'test', type: 'text' }],
        });

      // List for tenant 1
      const res1 = await request(app.getHttpServer())
        .get('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId)
        .expect(200);

      // List for tenant 2
      const res2 = await request(app.getHttpServer())
        .get('/api/v1/content-types')
        .set('X-Tenant-Id', tenantId2)
        .expect(200);

      // Verify isolation
      expect(res1.body.every((ct: any) => ct.tenantId === tenantId)).toBe(true);
      expect(res2.body.every((ct: any) => ct.tenantId === tenantId2)).toBe(true);

      // Cleanup tenant 2
      await prisma.contentType.deleteMany({ where: { tenantId: tenantId2 } });
      await prisma.tenant.delete({ where: { id: tenantId2 } });
    });
  });
});





