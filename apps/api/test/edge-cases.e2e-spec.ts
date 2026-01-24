import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { TestAppModule } from '../src/test-app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createUserWithOrg } from './helpers/rls';
import { Role } from '../src/common/auth/roles.enum';

/**
 * Edge Cases and Error Scenarios Tests
 * TNT-010: Comprehensive Testing - Edge Cases
 */
describe('Edge Cases and Error Scenarios (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let orgId: string;
  let siteId: string;
  let adminToken: string;
  let editorToken: string;

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
        name: 'Edge Cases Org',
        slug: `edge-cases-org-${Date.now()}`,
        plan: 'free',
      },
    });
    orgId = organization.id;

    const site = await prisma.site.create({
      data: {
        orgId,
        name: 'Edge Cases Site',
        slug: `edge-cases-site-${Date.now()}`,
      },
    });
    siteId = site.id;

    const adminUser = await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'admin@edge.com',
        passwordHash: '$2b$10$test',
        role: Role.ORG_ADMIN,
        siteRole: 'admin',
      },
    });
    adminToken = jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      orgId,
      siteId,
      role: adminUser.role,
    });

    const editorUser = await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'editor@edge.com',
        passwordHash: '$2b$10$test',
        role: Role.EDITOR,
        siteRole: 'editor',
      },
    });
    editorToken = jwtService.sign({
      sub: editorUser.id,
      email: editorUser.email,
      orgId,
      siteId,
      role: editorUser.role,
    });

    await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'viewer@edge.com',
        passwordHash: '$2b$10$test',
        role: Role.VIEWER,
        siteRole: 'viewer',
      },
    });
  });

  afterAll(async () => {
    await prisma.collectionItem.deleteMany({ where: { siteId } });
    await prisma.contentEntry.deleteMany({ where: { siteId } });
    await prisma.collection.deleteMany({ where: { siteId } });
    await prisma.contentType.deleteMany({ where: { siteId } });
    await prisma.user.deleteMany({ where: { orgId } });
    await prisma.site.delete({ where: { id: siteId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await app.close();
  });

  describe('Invalid Input Handling', () => {
    describe('Collections', () => {
      it('should reject empty slug', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/collections')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Site-ID', siteId)
          .send({
            slug: '',
            name: 'Test',
            schemaJson: {},
          })
          .expect(400);
      });

      it('should reject invalid slug format', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/collections')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Site-ID', siteId)
          .send({
            slug: 'Invalid Slug With Spaces',
            name: 'Test',
            schemaJson: {},
          })
          .expect(400);
      });

      it('should reject missing required fields', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/collections')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Site-ID', siteId)
          .send({
            name: 'Test',
          })
          .expect(400);
      });

      it('should handle extremely long strings', async () => {
        const longString = 'a'.repeat(10000);
        await request(app.getHttpServer())
          .post('/api/v1/collections')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Site-ID', siteId)
          .send({
            slug: 'test-collection',
            name: longString,
            schemaJson: {},
          })
          .expect(400);
      });
    });

    describe('Content Types', () => {
      it('should reject content type without fields or schema', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/content-types')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Site-ID', siteId)
          .send({
            name: 'Test',
            slug: 'test',
          })
          .expect(400);
      });

      it('should reject invalid field types', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/content-types')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Site-ID', siteId)
          .send({
            name: 'Test',
            slug: 'test',
            fields: [
              {
                name: 'test',
                type: 'invalid-type',
                required: false,
              },
            ],
          })
          .expect(400);
      });

      it('should handle empty fields array', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/content-types')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Site-ID', siteId)
          .send({
            name: 'Test',
            slug: 'test',
            fields: [],
          })
          .expect(201);
      });
    });

    describe('Content Entries', () => {
      beforeAll(async () => {
        await prisma.contentType.create({
          data: {
            siteId,
            slug: 'test-article',
            name: 'Test Article',
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string', minLength: 1, maxLength: 200 },
                content: { type: 'string' },
              },
              required: ['title'],
            },
          },
        });
      });

      it('should reject entry with missing required field', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/content/test-article')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Site-ID', siteId)
          .send({
            data: {
              content: 'Content',
            },
            status: 'draft',
          })
          .expect(400);
      });

      it('should reject entry with invalid field type', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/content/test-article')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Site-ID', siteId)
          .send({
            data: {
              title: 123,
              content: 'Content',
            },
            status: 'draft',
          })
          .expect(400);
      });

      it('should reject entry exceeding max length', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/content/test-article')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Site-ID', siteId)
          .send({
            data: {
              title: 'a'.repeat(201),
              content: 'Content',
            },
            status: 'draft',
          })
          .expect(400);
      });

      it('should reject entry with invalid status', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/content/test-article')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Site-ID', siteId)
          .send({
            data: {
              title: 'Test',
              content: 'Content',
            },
            status: 'invalid-status',
          })
          .expect(400);
      });
    });
  });

  describe('Pagination Edge Cases', () => {
    it('should handle page 0', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/collections?page=0&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Site-ID', siteId)
        .expect(400);
    });

    it('should handle negative page', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/collections?page=-1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Site-ID', siteId)
        .expect(400);
    });

    it('should handle pageSize exceeding maximum', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/collections?page=1&pageSize=1000')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Site-ID', siteId)
        .expect(200);

      expect(res.body.length).toBeLessThanOrEqual(100);
    });

    it('should handle very large page number', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/collections?page=999999&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Site-ID', siteId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Sorting Edge Cases', () => {
    it('should handle invalid sort field', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/collections?sort=invalidField')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Site-ID', siteId)
        .expect(200);
    });

    it('should handle multiple sort fields', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/collections?sort=-createdAt,name')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Site-ID', siteId)
        .expect(200);
    });

    it('should handle empty sort parameter', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/collections?sort=')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Site-ID', siteId)
        .expect(200);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent updates with version conflict', async () => {
      const collection = await prisma.collection.create({
        data: {
          siteId,
          slug: 'concurrent-test',
          name: 'Concurrent Test',
          schemaJson: { title: 'string' },
        },
      });

      const item = await prisma.collectionItem.create({
        data: {
          siteId,
          collectionId: collection.id,
          data: { title: 'Test' },
          status: 'DRAFT',
          version: 1,
        },
      });

      await request(app.getHttpServer())
        .put(`/api/v1/collections/${collection.slug}/items/${item.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .set('X-Site-ID', siteId)
        .send({
          data: { title: 'Updated' },
          status: 'DRAFT',
          version: 1,
        })
        .expect(200);

      await request(app.getHttpServer())
        .put(`/api/v1/collections/${collection.slug}/items/${item.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .set('X-Site-ID', siteId)
        .send({
          data: { title: 'Concurrent Update' },
          status: 'DRAFT',
          version: 1,
        })
        .expect(409);
    });
  });

  describe('Resource Deletion Edge Cases', () => {
    it('should prevent deletion of content type with entries', async () => {
      const contentType = await prisma.contentType.create({
        data: {
          siteId,
          slug: 'delete-test',
          name: 'Delete Test',
          schema: { type: 'object', properties: { title: { type: 'string' } } },
        },
      });

      await prisma.contentEntry.create({
        data: {
          siteId,
          contentTypeId: contentType.id,
          data: { title: 'Test' },
          status: 'draft',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/content-types/${contentType.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Site-ID', siteId)
        .expect(409);
    });

    it('should handle deletion of non-existent resource', async () => {
      await request(app.getHttpServer())
        .delete('/api/v1/collections/non-existent-slug')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Site-ID', siteId)
        .expect(404);
    });
  });

  describe('Authorization Edge Cases', () => {
    it('should reject expired token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/collections')
        .set('Authorization', 'Bearer invalid-token')
        .set('X-Site-ID', siteId)
        .expect(401);
    });

    it('should reject malformed token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/collections')
        .set('Authorization', 'Bearer not.a.valid.jwt.token')
        .set('X-Site-ID', siteId)
        .expect(401);
    });

    it('should reject request without Bearer prefix', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/collections')
        .set('Authorization', adminToken)
        .set('X-Site-ID', siteId)
        .expect(401);
    });
  });

  describe('Unicode and Special Characters', () => {
    it('should handle unicode characters in names', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/collections')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Site-ID', siteId)
        .send({
          slug: 'unicode-test',
          name: '?u<?? Collection ???%',
          schemaJson: {},
        })
        .expect(201);
    });

    it('should handle special characters in slugs', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/collections')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Site-ID', siteId)
        .send({
          slug: 'test-collection-123',
          name: 'Test',
          schemaJson: {},
        })
        .expect(201);
    });
  });

  describe('Empty Results', () => {
    it('should return empty array for site with no collections', async () => {
      const emptyOrg = await prisma.organization.create({
        data: {
          name: 'Empty Org',
          slug: `empty-org-${Date.now()}`,
          plan: 'free',
        },
      });
      const emptySite = await prisma.site.create({
        data: {
          orgId: emptyOrg.id,
          name: 'Empty Site',
          slug: `empty-site-${Date.now()}`,
        },
      });

      const emptyUser = await createUserWithOrg(prisma, {
        data: {
          orgId: emptyOrg.id,
          email: 'empty@test.com',
          passwordHash: '$2b$10$test',
          role: Role.ORG_ADMIN,
        siteRole: 'admin',
        },
      });

      const emptyToken = jwtService.sign({
        sub: emptyUser.id,
        email: emptyUser.email,
        orgId: emptyOrg.id,
        siteId: emptySite.id,
        role: emptyUser.role,
      });

      const res = await request(app.getHttpServer())
        .get('/api/v1/collections')
        .set('Authorization', `Bearer ${emptyToken}`)
        .set('X-Site-ID', emptySite.id)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);

      await prisma.user.delete({ where: { id: emptyUser.id } });
      await prisma.site.delete({ where: { id: emptySite.id } });
      await prisma.organization.delete({ where: { id: emptyOrg.id } });
    });
  });
});







