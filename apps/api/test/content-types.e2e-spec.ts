import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TestAppModule } from '../src/test-app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createUserWithOrg } from './helpers/rls';
import { JwtService } from '@nestjs/jwt';

describe('ContentTypes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let orgId: string;
  let siteId: string;
  let token: string;

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
      data: { name: 'Test Organization', slug: `test-org-${Date.now()}`, plan: 'free' },
    });
    orgId = organization.id;

    const site = await prisma.site.create({
      data: { orgId, name: 'Test Site', slug: `test-site-${Date.now()}` },
    });
    siteId = site.id;

    const user = await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'content-types-admin@test.com',
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
  });

  afterAll(async () => {
    await prisma.contentType.deleteMany({ where: { siteId } });
    await prisma.user.deleteMany({ where: { orgId } });
    await prisma.site.deleteMany({ where: { id: siteId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await app.close();
  });

  describe('POST /api/api/v1/v1/api/v1/content-types', () => {
    it('should create content type with fields', () => {
      return request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
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
          expect(res.body.siteId).toBe(siteId);
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
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

    it('should return 400 without X-Site-ID', () => {
      return request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
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
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          name: 'Article',
          slug: 'article',
        })
        .expect(400);
    });

    it('should return 409 on duplicate slug', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          name: 'Duplicate',
          slug: 'duplicate-slug',
          fields: [{ name: 'test', type: 'text' }],
        })
        .expect(201);

      return request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          name: 'Duplicate 2',
          slug: 'duplicate-slug',
          fields: [{ name: 'test', type: 'text' }],
        })
        .expect(409);
    });
  });

  describe('GET /api/api/v1/v1/api/v1/content-types', () => {
    it('should list content types for site', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          name: 'Test List',
          slug: 'test-list',
          fields: [{ name: 'test', type: 'text' }],
        });

      return request(app.getHttpServer())
        .get('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('GET /api/api/v1/v1/api/v1/content-types/api/v1/:id', () => {
    it('should get content type by id', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          name: 'Test Get',
          slug: 'test-get',
          fields: [{ name: 'test', type: 'text' }],
        });

      const contentTypeId = createResponse.body.id;

      return request(app.getHttpServer())
        .get(`/api/v1/content-types/${contentTypeId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(contentTypeId);
          expect(res.body.slug).toBe('test-get');
        });
    });

    it('should return 404 for nonexistent content type', () => {
      return request(app.getHttpServer())
        .get('/api/v1/content-types/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(404);
    });
  });

  describe('PATCH /api/api/v1/v1/api/v1/content-types/api/v1/:id', () => {
    it('should update content type', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          name: 'Test Update',
          slug: 'test-update',
          fields: [{ name: 'test', type: 'text' }],
        });

      const contentTypeId = createResponse.body.id;

      return request(app.getHttpServer())
        .patch(`/api/v1/content-types/${contentTypeId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          name: 'Updated Name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Name');
          expect(res.body.slug).toBe('test-update');
        });
    });

    it('should update content type schema', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          name: 'Test Schema Update',
          slug: 'test-schema-update',
          fields: [{ name: 'oldField', type: 'text' }],
        });

      const contentTypeId = createResponse.body.id;

      return request(app.getHttpServer())
        .patch(`/api/v1/content-types/${contentTypeId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
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

  describe('DELETE /api/api/v1/v1/api/v1/content-types/api/v1/:id', () => {
    it('should delete content type', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          name: 'Test Delete',
          slug: 'test-delete',
          fields: [{ name: 'test', type: 'text' }],
        });

      const contentTypeId = createResponse.body.id;

      return request(app.getHttpServer())
        .delete(`/api/v1/content-types/${contentTypeId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('ok', true);
        });
    });

    it('should return 404 for nonexistent content type', () => {
      return request(app.getHttpServer())
        .delete('/api/v1/content-types/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(404);
    });

    it('should return 409 if content type has entries', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          name: 'Test With Entries',
          slug: 'test-with-entries',
          fields: [{ name: 'test', type: 'text' }],
        });

      const contentTypeId = createResponse.body.id;

      await prisma.contentEntry.create({
        data: {
          siteId,
          contentTypeId,
          data: { test: 'value' },
          status: 'draft',
        },
      });

      return request(app.getHttpServer())
        .delete(`/api/v1/content-types/${contentTypeId}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(409);
    });
  });

  describe('site isolation', () => {
    it('should only return content types for specific site', async () => {
      const org2 = await prisma.organization.create({
        data: { name: 'Test Organization 2', slug: `test-org-2-${Date.now()}`, plan: 'free' },
      });
      const site2 = await prisma.site.create({
        data: { orgId: org2.id, name: 'Test Site 2', slug: `test-site-2-${Date.now()}` },
      });
      const user2 = await createUserWithOrg(prisma, {
        data: {
          orgId: org2.id,
          email: 'content-types-admin-2@test.com',
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

      await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          name: 'Site 1 Type',
          slug: 'site-1-type',
          fields: [{ name: 'test', type: 'text' }],
        });

      await request(app.getHttpServer())
        .post('/api/v1/content-types')
        .set('Authorization', `Bearer ${token2}`)
        .set('X-Site-ID', site2.id)
        .send({
          name: 'Site 2 Type',
          slug: 'site-2-type',
          fields: [{ name: 'test', type: 'text' }],
        });

      const res1 = await request(app.getHttpServer())
        .get('/api/v1/content-types')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200);

      const res2 = await request(app.getHttpServer())
        .get('/api/v1/content-types')
        .set('Authorization', `Bearer ${token2}`)
        .set('X-Site-ID', site2.id)
        .expect(200);

      expect(res1.body.every((ct: any) => ct.siteId === siteId)).toBe(true);
      expect(res2.body.every((ct: any) => ct.siteId === site2.id)).toBe(true);

      await prisma.contentType.deleteMany({ where: { siteId: site2.id } });
      await prisma.user.delete({ where: { id: user2.id } });
      await prisma.site.delete({ where: { id: site2.id } });
      await prisma.organization.delete({ where: { id: org2.id } });
    });
  });
});





