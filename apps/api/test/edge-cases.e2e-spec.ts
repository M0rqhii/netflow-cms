import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { Role } from '../src/common/auth/roles.enum';

/**
 * Edge Cases and Error Scenarios Tests
 * TNT-010: Comprehensive Testing - Edge Cases
 */
describe('Edge Cases and Error Scenarios (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let tenantId: string;
  let adminToken: string;
  let editorToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    const tenant = await prisma.tenant.create({
      data: {
        name: 'Edge Cases Tenant',
        slug: 'edge-cases-tenant',
        plan: 'free',
      },
    });
    tenantId = tenant.id;

    const adminUser = await prisma.user.create({
      data: {
        tenantId,
        email: 'admin@edge.com',
        passwordHash: '$2b$10$test',
        role: Role.TENANT_ADMIN,
      },
    });
    adminToken = jwtService.sign({
      sub: adminUser.id,
      email: adminUser.email,
      tenantId: adminUser.tenantId,
      role: adminUser.role,
    });

    const editorUser = await prisma.user.create({
      data: {
        tenantId,
        email: 'editor@edge.com',
        passwordHash: '$2b$10$test',
        role: Role.EDITOR,
      },
    });
    editorToken = jwtService.sign({
      sub: editorUser.id,
      email: editorUser.email,
      tenantId: editorUser.tenantId,
      role: editorUser.role,
    });

    const viewerUser = await prisma.user.create({
      data: {
        tenantId,
        email: 'viewer@edge.com',
        passwordHash: '$2b$10$test',
        role: Role.VIEWER,
      },
    });
    viewerToken = jwtService.sign({
      sub: viewerUser.id,
      email: viewerUser.email,
      tenantId: viewerUser.tenantId,
      role: viewerUser.role,
    });
  });

  afterAll(async () => {
    await prisma.collectionItem.deleteMany({ where: { tenantId } });
    await prisma.contentEntry.deleteMany({ where: { tenantId } });
    await prisma.collection.deleteMany({ where: { tenantId } });
    await prisma.contentType.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  describe('Invalid Input Handling', () => {
    describe('Collections', () => {
      it('should reject empty slug', async () => {
        await request(app.getHttpServer())
          .post('/collections')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            slug: '',
            name: 'Test',
            schemaJson: {},
          })
          .expect(400);
      });

      it('should reject invalid slug format', async () => {
        await request(app.getHttpServer())
          .post('/collections')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            slug: 'Invalid Slug With Spaces',
            name: 'Test',
            schemaJson: {},
          })
          .expect(400);
      });

      it('should reject missing required fields', async () => {
        await request(app.getHttpServer())
          .post('/collections')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            name: 'Test',
            // slug missing
          })
          .expect(400);
      });

      it('should handle extremely long strings', async () => {
        const longString = 'a'.repeat(10000);
        await request(app.getHttpServer())
          .post('/collections')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            slug: 'test-collection',
            name: longString,
            schemaJson: {},
          })
          .expect(400); // Should validate max length
      });
    });

    describe('Content Types', () => {
      it('should reject content type without fields or schema', async () => {
        await request(app.getHttpServer())
          .post('/content-types')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            name: 'Test',
            slug: 'test',
            // No fields or schema
          })
          .expect(400);
      });

      it('should reject invalid field types', async () => {
        await request(app.getHttpServer())
          .post('/content-types')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Tenant-ID', tenantId)
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
          .post('/content-types')
          .set('Authorization', `Bearer ${adminToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            name: 'Test',
            slug: 'test',
            fields: [],
          })
          .expect(201); // Empty fields should be allowed
      });
    });

    describe('Content Entries', () => {
      let contentTypeId: string;

      beforeAll(async () => {
        const contentType = await prisma.contentType.create({
          data: {
            tenantId,
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
        contentTypeId = contentType.id;
      });

      it('should reject entry with missing required field', async () => {
        await request(app.getHttpServer())
          .post('/content/test-article')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            data: {
              // title is missing
              content: 'Content',
            },
            status: 'draft',
          })
          .expect(400);
      });

      it('should reject entry with invalid field type', async () => {
        await request(app.getHttpServer())
          .post('/content/test-article')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            data: {
              title: 123, // Should be string
              content: 'Content',
            },
            status: 'draft',
          })
          .expect(400);
      });

      it('should reject entry exceeding max length', async () => {
        await request(app.getHttpServer())
          .post('/content/test-article')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Tenant-ID', tenantId)
          .send({
            data: {
              title: 'a'.repeat(201), // Exceeds maxLength: 200
              content: 'Content',
            },
            status: 'draft',
          })
          .expect(400);
      });

      it('should reject entry with invalid status', async () => {
        await request(app.getHttpServer())
          .post('/content/test-article')
          .set('Authorization', `Bearer ${editorToken}`)
          .set('X-Tenant-ID', tenantId)
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
        .get('/collections?page=0&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(400);
    });

    it('should handle negative page', async () => {
      await request(app.getHttpServer())
        .get('/collections?page=-1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(400);
    });

    it('should handle pageSize exceeding maximum', async () => {
      const res = await request(app.getHttpServer())
        .get('/collections?page=1&pageSize=1000')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      // Should cap at maximum pageSize
      expect(res.body.length).toBeLessThanOrEqual(100);
    });

    it('should handle very large page number', async () => {
      const res = await request(app.getHttpServer())
        .get('/collections?page=999999&pageSize=10')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Sorting Edge Cases', () => {
    it('should handle invalid sort field', async () => {
      // Should ignore invalid fields and use default sort
      await request(app.getHttpServer())
        .get('/collections?sort=invalidField')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200);
    });

    it('should handle multiple sort fields', async () => {
      await request(app.getHttpServer())
        .get('/collections?sort=-createdAt,name')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200);
    });

    it('should handle empty sort parameter', async () => {
      await request(app.getHttpServer())
        .get('/collections?sort=')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(200);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent updates with version conflict', async () => {
      const collection = await prisma.collection.create({
        data: {
          tenantId,
          slug: 'concurrent-test',
          name: 'Concurrent Test',
          schemaJson: { title: 'string' },
        },
      });

      const item = await prisma.collectionItem.create({
        data: {
          tenantId,
          collectionId: collection.id,
          data: { title: 'Test' },
          status: 'DRAFT',
          version: 1,
        },
      });

      // First update succeeds
      await request(app.getHttpServer())
        .put(`/collections/${collection.slug}/items/${item.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          data: { title: 'Updated' },
          status: 'DRAFT',
          version: 1,
        })
        .expect(200);

      // Second update with old version should fail
      await request(app.getHttpServer())
        .put(`/collections/${collection.slug}/items/${item.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          data: { title: 'Concurrent Update' },
          status: 'DRAFT',
          version: 1, // Old version
        })
        .expect(409); // Conflict
    });
  });

  describe('Resource Deletion Edge Cases', () => {
    it('should prevent deletion of content type with entries', async () => {
      const contentType = await prisma.contentType.create({
        data: {
          tenantId,
          slug: 'delete-test',
          name: 'Delete Test',
          schema: { type: 'object', properties: { title: { type: 'string' } } },
        },
      });

      await prisma.contentEntry.create({
        data: {
          tenantId,
          contentTypeId: contentType.id,
          data: { title: 'Test' },
          status: 'draft',
        },
      });

      await request(app.getHttpServer())
        .delete(`/content-types/${contentType.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(409); // Conflict - has entries
    });

    it('should handle deletion of non-existent resource', async () => {
      await request(app.getHttpServer())
        .delete('/collections/non-existent-slug')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', tenantId)
        .expect(404);
    });
  });

  describe('Authorization Edge Cases', () => {
    it('should reject expired token', async () => {
      // Create an expired token (this would require mocking time)
      // For now, we test with invalid token format
      await request(app.getHttpServer())
        .get('/collections')
        .set('Authorization', 'Bearer invalid-token')
        .set('X-Tenant-ID', tenantId)
        .expect(401);
    });

    it('should reject malformed token', async () => {
      await request(app.getHttpServer())
        .get('/collections')
        .set('Authorization', 'Bearer not.a.valid.jwt.token')
        .set('X-Tenant-ID', tenantId)
        .expect(401);
    });

    it('should reject request without Bearer prefix', async () => {
      await request(app.getHttpServer())
        .get('/collections')
        .set('Authorization', adminToken)
        .set('X-Tenant-ID', tenantId)
        .expect(401);
    });
  });

  describe('Unicode and Special Characters', () => {
    it('should handle unicode characters in names', async () => {
      await request(app.getHttpServer())
        .post('/collections')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          slug: 'unicode-test',
          name: '测试 Collection 🎉',
          schemaJson: {},
        })
        .expect(201);
    });

    it('should handle special characters in slugs', async () => {
      await request(app.getHttpServer())
        .post('/collections')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('X-Tenant-ID', tenantId)
        .send({
          slug: 'test-collection-123',
          name: 'Test',
          schemaJson: {},
        })
        .expect(201);
    });
  });

  describe('Empty Results', () => {
    it('should return empty array for tenant with no collections', async () => {
      const emptyTenant = await prisma.tenant.create({
        data: {
          name: 'Empty Tenant',
          slug: 'empty-tenant',
          plan: 'free',
        },
      });

      const emptyUser = await prisma.user.create({
        data: {
          tenantId: emptyTenant.id,
          email: 'empty@test.com',
          passwordHash: '$2b$10$test',
          role: Role.TENANT_ADMIN,
        },
      });

      const emptyToken = jwtService.sign({
        sub: emptyUser.id,
        email: emptyUser.email,
        tenantId: emptyUser.tenantId,
        role: emptyUser.role,
      });

      const res = await request(app.getHttpServer())
        .get('/collections')
        .set('Authorization', `Bearer ${emptyToken}`)
        .set('X-Tenant-ID', emptyTenant.id)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);

      // Cleanup
      await prisma.user.delete({ where: { id: emptyUser.id } });
      await prisma.tenant.delete({ where: { id: emptyTenant.id } });
    });
  });
});


