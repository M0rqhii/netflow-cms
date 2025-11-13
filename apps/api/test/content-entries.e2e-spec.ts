import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('ContentEntries (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const tenantId = 'tenant-e2e-content-entries';
  let contentTypeId: string;
  const contentTypeSlug = 'article';

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

    // Create content type for testing
    const contentType = await prisma.contentType.upsert({
      where: {
        tenantId_slug: {
          tenantId,
          slug: contentTypeSlug,
        },
      },
      update: {},
      create: {
        tenantId,
        name: 'Article',
        slug: contentTypeSlug,
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            content: { type: 'string' },
            author: { type: 'string' },
          },
          required: ['title', 'content'],
        },
      },
    });

    contentTypeId = contentType.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.contentEntry.deleteMany({ where: { tenantId } });
    await prisma.contentType.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    await app.close();
  });

  describe('POST /api/v1/content/:contentTypeSlug', () => {
    it('should create content entry', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/content/${contentTypeSlug}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: {
            title: 'My First Article',
            content: 'Article content here',
            author: 'John Doe',
          },
          status: 'draft',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.tenantId).toBe(tenantId);
          expect(res.body.contentTypeId).toBe(contentTypeId);
          expect(res.body.data).toMatchObject({
            title: 'My First Article',
            content: 'Article content here',
            author: 'John Doe',
          });
          expect(res.body.status).toBe('draft');
        });
    });

    it('should return 400 if required field is missing', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/content/${contentTypeSlug}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: {
            // title is missing
            content: 'Article content',
          },
          status: 'draft',
        })
        .expect(400);
    });

    it('should return 400 if field type is invalid', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/content/${contentTypeSlug}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: {
            title: 123, // Should be string
            content: 'Article content',
          },
          status: 'draft',
        })
        .expect(400);
    });

    it('should return 400 without X-Tenant-Id', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/content/${contentTypeSlug}`)
        .send({
          data: {
            title: 'Test',
            content: 'Content',
          },
        })
        .expect(400);
    });

    it('should return 404 for non-existent content type', () => {
      return request(app.getHttpServer())
        .post('/api/v1/content/non-existent')
        .set('X-Tenant-Id', tenantId)
        .send({
          data: {
            title: 'Test',
            content: 'Content',
          },
        })
        .expect(404);
    });
  });

  describe('GET /api/v1/content/:contentTypeSlug', () => {
    let entryId1: string;
    let entryId2: string;

    beforeAll(async () => {
      // Create test entries
      const entry1 = await prisma.contentEntry.create({
        data: {
          tenantId,
          contentTypeId,
          data: {
            title: 'Published Article',
            content: 'Published content',
            author: 'Author 1',
          },
          status: 'published',
        },
      });

      const entry2 = await prisma.contentEntry.create({
        data: {
          tenantId,
          contentTypeId,
          data: {
            title: 'Draft Article',
            content: 'Draft content',
            author: 'Author 2',
          },
          status: 'draft',
        },
      });

      entryId1 = entry1.id;
      entryId2 = entry2.id;
    });

    it('should list content entries', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}`)
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('pageSize');
          expect(res.body).toHaveProperty('entries');
          expect(Array.isArray(res.body.entries)).toBe(true);
          expect(res.body.entries.length).toBeGreaterThan(0);
        });
    });

    it('should filter by status', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}?status=published`)
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body.entries.every((e: any) => e.status === 'published')).toBe(true);
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}?page=1&pageSize=1`)
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.pageSize).toBe(1);
          expect(res.body.entries.length).toBeLessThanOrEqual(1);
        });
    });

    it('should support sorting', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}?sort=-createdAt`)
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          if (res.body.entries.length > 1) {
            const dates = res.body.entries.map((e: any) => new Date(e.createdAt).getTime());
            const sorted = [...dates].sort((a, b) => b - a);
            expect(dates).toEqual(sorted);
          }
        });
    });

    it('should filter by JSON fields', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}`)
        .set('X-Tenant-Id', tenantId)
        .query({
          'filter[author]': 'Author 1',
        })
        .expect(200)
        .expect((res) => {
          // Should filter entries where author = 'Author 1'
          if (res.body.entries.length > 0) {
            res.body.entries.forEach((entry: any) => {
              expect(entry.data.author).toBe('Author 1');
            });
          }
        });
    });

    it('should support full-text search', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}?search=Published`)
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          // Should find entries containing "Published"
          res.body.entries.forEach((entry: any) => {
            const dataStr = JSON.stringify(entry.data).toLowerCase();
            expect(dataStr).toContain('published');
          });
        });
    });
  });

  describe('GET /api/v1/content/:contentTypeSlug/:id', () => {
    let entryId: string;

    beforeAll(async () => {
      const entry = await prisma.contentEntry.create({
        data: {
          tenantId,
          contentTypeId,
          data: {
            title: 'Test Get Article',
            content: 'Test content',
            author: 'Test Author',
          },
          status: 'draft',
        },
      });
      entryId = entry.id;
    });

    it('should get content entry by id', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}/${entryId}`)
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(entryId);
          expect(res.body.tenantId).toBe(tenantId);
          expect(res.body.contentType).toBeDefined();
          expect(res.body.contentType.slug).toBe(contentTypeSlug);
        });
    });

    it('should return 404 for nonexistent entry', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}/00000000-0000-0000-0000-000000000000`)
        .set('X-Tenant-Id', tenantId)
        .expect(404);
    });

    it('should return 404 for wrong content type', async () => {
      // Create entry in different content type
      const otherContentType = await prisma.contentType.create({
        data: {
          tenantId,
          name: 'Page',
          slug: 'page',
          schema: {
            type: 'object',
            properties: { title: { type: 'string' } },
          },
        },
      });

      const otherEntry = await prisma.contentEntry.create({
        data: {
          tenantId,
          contentTypeId: otherContentType.id,
          data: { title: 'Page Title' },
          status: 'draft',
        },
      });

      // Try to get it via article endpoint
      return request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}/${otherEntry.id}`)
        .set('X-Tenant-Id', tenantId)
        .expect(404)
        .then(async () => {
          // Cleanup
          await prisma.contentEntry.delete({ where: { id: otherEntry.id } });
          await prisma.contentType.delete({ where: { id: otherContentType.id } });
        });
    });
  });

  describe('PATCH /api/v1/content/:contentTypeSlug/:id', () => {
    let entryId: string;

    beforeAll(async () => {
      const entry = await prisma.contentEntry.create({
        data: {
          tenantId,
          contentTypeId,
          data: {
            title: 'Original Title',
            content: 'Original content',
            author: 'Original Author',
          },
          status: 'draft',
        },
      });
      entryId = entry.id;
    });

    it('should update content entry data', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/content/${contentTypeSlug}/${entryId}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: {
            title: 'Updated Title',
            content: 'Updated content',
            author: 'Updated Author',
          },
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.data).toMatchObject({
            title: 'Updated Title',
            content: 'Updated content',
            author: 'Updated Author',
          });
        });
    });

    it('should update status only', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/content/${contentTypeSlug}/${entryId}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          status: 'published',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('published');
        });
    });

    it('should return 400 if updated data is invalid', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/content/${contentTypeSlug}/${entryId}`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: {
            title: 123, // Invalid type
            content: 'Content',
          },
        })
        .expect(400);
    });

    it('should return 404 for nonexistent entry', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/content/${contentTypeSlug}/00000000-0000-0000-0000-000000000000`)
        .set('X-Tenant-Id', tenantId)
        .send({
          data: {
            title: 'Test',
            content: 'Content',
          },
        })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/content/:contentTypeSlug/:id', () => {
    let entryId: string;

    beforeEach(async () => {
      const entry = await prisma.contentEntry.create({
        data: {
          tenantId,
          contentTypeId,
          data: {
            title: 'To Delete',
            content: 'Content to delete',
            author: 'Author',
          },
          status: 'draft',
        },
      });
      entryId = entry.id;
    });

    it('should delete content entry', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/content/${contentTypeSlug}/${entryId}`)
        .set('X-Tenant-Id', tenantId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('ok', true);
        })
        .then(async () => {
          // Verify it's deleted
          const deleted = await prisma.contentEntry.findFirst({
            where: { id: entryId },
          });
          expect(deleted).toBeNull();
        });
    });

    it('should return 404 for nonexistent entry', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/content/${contentTypeSlug}/00000000-0000-0000-0000-000000000000`)
        .set('X-Tenant-Id', tenantId)
        .expect(404);
    });
  });

  describe('tenant isolation', () => {
    it('should only return entries for specific tenant', async () => {
      const tenantId2 = 'tenant-e2e-content-entries-2';

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

      // Create content type for tenant 2
      const contentType2 = await prisma.contentType.create({
        data: {
          tenantId: tenantId2,
          name: 'Article',
          slug: contentTypeSlug,
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              content: { type: 'string' },
            },
            required: ['title', 'content'],
          },
        },
      });

      // Create entry for tenant 1
      await prisma.contentEntry.create({
        data: {
          tenantId,
          contentTypeId,
          data: { title: 'Tenant 1 Entry', content: 'Content' },
          status: 'draft',
        },
      });

      // Create entry for tenant 2
      await prisma.contentEntry.create({
        data: {
          tenantId: tenantId2,
          contentTypeId: contentType2.id,
          data: { title: 'Tenant 2 Entry', content: 'Content' },
          status: 'draft',
        },
      });

      // List for tenant 1
      const res1 = await request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}`)
        .set('X-Tenant-Id', tenantId)
        .expect(200);

      // List for tenant 2
      const res2 = await request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}`)
        .set('X-Tenant-Id', tenantId2)
        .expect(200);

      // Verify isolation
      expect(res1.body.entries.every((e: any) => e.tenantId === tenantId)).toBe(true);
      expect(res2.body.entries.every((e: any) => e.tenantId === tenantId2)).toBe(true);

      // Cleanup tenant 2
      await prisma.contentEntry.deleteMany({ where: { tenantId: tenantId2 } });
      await prisma.contentType.deleteMany({ where: { tenantId: tenantId2 } });
      await prisma.tenant.delete({ where: { id: tenantId2 } });
    });
  });
});

