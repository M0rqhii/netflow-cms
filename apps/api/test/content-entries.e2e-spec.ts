import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { TestAppModule } from '../src/test-app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createUserWithOrg } from './helpers/rls';

describe('ContentEntries (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let orgId: string;
  let siteId: string;
  let token: string;
  let contentTypeId: string;
  const contentTypeSlug = 'article';

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
      data: { name: 'Content Entries Org', slug: `content-entries-org-${Date.now()}`, plan: 'free' },
    });
    orgId = organization.id;

    const site = await prisma.site.create({
      data: { orgId, name: 'Content Entries Site', slug: `content-entries-site-${Date.now()}` },
    });
    siteId = site.id;

    const user = await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'content-entries-admin@test.com',
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

    const contentType = await prisma.contentType.upsert({
      where: {
        siteId_slug: {
          siteId,
          slug: contentTypeSlug,
        },
      },
      update: {},
      create: {
        siteId,
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
    await prisma.contentEntry.deleteMany({ where: { siteId } });
    await prisma.contentType.deleteMany({ where: { siteId } });
    await prisma.user.deleteMany({ where: { orgId } });
    await prisma.site.deleteMany({ where: { id: siteId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await app.close();
  });

  describe('POST /api/api/v1/v1/api/v1/content/api/v1/:contentTypeSlug', () => {
    it('should create content entry', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/content/${contentTypeSlug}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
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
          expect(res.body.siteId).toBe(siteId);
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          data: {
            title: 123, // Should be string
            content: 'Article content',
          },
          status: 'draft',
        })
        .expect(400);
    });

    it('should return 400 without X-Site-ID', () => {
      return request(app.getHttpServer())
        .post(`/api/v1/content/${contentTypeSlug}`)
        .set('Authorization', `Bearer ${token}`)
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          data: {
            title: 'Test',
            content: 'Content',
          },
        })
        .expect(404);
    });
  });

  describe('GET /api/api/v1/v1/api/v1/content/api/v1/:contentTypeSlug', () => {
    beforeAll(async () => {
      await prisma.contentEntry.create({
        data: {
          siteId,
          contentTypeId,
          data: {
            title: 'Published Article',
            content: 'Published content',
            author: 'Author 1',
          },
          status: 'published',
        },
      });

      await prisma.contentEntry.create({
        data: {
          siteId,
          contentTypeId,
          data: {
            title: 'Draft Article',
            content: 'Draft content',
            author: 'Author 2',
          },
          status: 'draft',
        },
      });
    });

    it('should list content entries', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200)
        .expect((res) => {
          expect(res.body.entries.every((e: any) => e.status === 'published')).toBe(true);
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}?page=1&pageSize=1`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .query({
          'filter[author]': 'Author 1',
        })
        .expect(200)
        .expect((res) => {
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200)
        .expect((res) => {
          res.body.entries.forEach((entry: any) => {
            const dataStr = JSON.stringify(entry.data).toLowerCase();
            expect(dataStr).toContain('published');
          });
        });
    });
  });

  describe('GET /api/api/v1/v1/api/v1/content/api/v1/:contentTypeSlug/api/v1/:id', () => {
    let entryId: string;

    beforeAll(async () => {
      const entry = await prisma.contentEntry.create({
        data: {
          siteId,
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(entryId);
          expect(res.body.siteId).toBe(siteId);
          expect(res.body.contentType).toBeDefined();
          expect(res.body.contentType.slug).toBe(contentTypeSlug);
        });
    });

    it('should return 404 for nonexistent entry', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(404);
    });

    it('should return 404 for wrong content type', async () => {
      const otherContentType = await prisma.contentType.create({
        data: {
          siteId,
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
          siteId,
          contentTypeId: otherContentType.id,
          data: { title: 'Page Title' },
          status: 'draft',
        },
      });

      return request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}/${otherEntry.id}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(404)
        .then(async () => {
          await prisma.contentEntry.delete({ where: { id: otherEntry.id } });
          await prisma.contentType.delete({ where: { id: otherContentType.id } });
        });
    });
  });

  describe('PATCH /api/api/v1/v1/api/v1/content/api/v1/:contentTypeSlug/api/v1/:id', () => {
    let entryId: string;

    beforeAll(async () => {
      const entry = await prisma.contentEntry.create({
        data: {
          siteId,
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          data: {
            title: 'Test',
            content: 'Content',
          },
        })
        .expect(404);
    });
  });

  describe('DELETE /api/api/v1/v1/api/v1/content/api/v1/:contentTypeSlug/api/v1/:id', () => {
    let entryId: string;

    beforeEach(async () => {
      const entry = await prisma.contentEntry.create({
        data: {
          siteId,
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('ok', true);
        })
        .then(async () => {
          const deleted = await prisma.contentEntry.findFirst({
            where: { id: entryId },
          });
          expect(deleted).toBeNull();
        });
    });

    it('should return 404 for nonexistent entry', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/content/${contentTypeSlug}/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(404);
    });
  });

  describe('site isolation', () => {
    it('should only return entries for specific site', async () => {
      const org2 = await prisma.organization.create({
        data: { name: 'Content Entries Org 2', slug: `content-entries-org-2-${Date.now()}`, plan: 'free' },
      });
      const site2 = await prisma.site.create({
        data: { orgId: org2.id, name: 'Content Entries Site 2', slug: `content-entries-site-2-${Date.now()}` },
      });
      const user2 = await createUserWithOrg(prisma, {
        data: {
          orgId: org2.id,
          email: 'content-entries-admin-2@test.com',
          passwordHash: 'hashed-password',
          role: 'org_admin',
        siteRole: 'admin',
        },
      });
      const token2 = jwtService.sign({
        sub: user2.id,
        email: user2.email,
        orgId: org2.id,
        siteId: site2.id,
        role: user2.role,
      });

      const contentType2 = await prisma.contentType.create({
        data: {
          siteId: site2.id,
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

      await prisma.contentEntry.create({
        data: {
          siteId,
          contentTypeId,
          data: { title: 'Site 1 Entry', content: 'Content' },
          status: 'draft',
        },
      });

      await prisma.contentEntry.create({
        data: {
          siteId: site2.id,
          contentTypeId: contentType2.id,
          data: { title: 'Site 2 Entry', content: 'Content' },
          status: 'draft',
        },
      });

      const res1 = await request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .get(`/api/v1/content/${contentTypeSlug}`)
        .set('Authorization', `Bearer ${token2}`)
        .set('X-Site-ID', site2.id)
        .expect(200);

      expect(res1.body.entries.every((e: any) => e.siteId === siteId)).toBe(true);
      expect(res2.body.entries.every((e: any) => e.siteId === site2.id)).toBe(true);

      await prisma.contentEntry.deleteMany({ where: { siteId: site2.id } });
      await prisma.contentType.deleteMany({ where: { siteId: site2.id } });
      await prisma.user.delete({ where: { id: user2.id } });
      await prisma.site.delete({ where: { id: site2.id } });
      await prisma.organization.delete({ where: { id: org2.id } });
    });
  });
});





