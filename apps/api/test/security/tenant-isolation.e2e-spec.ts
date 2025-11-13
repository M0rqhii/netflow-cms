import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { Role } from '../../src/common/auth/roles.enum';

/**
 * Comprehensive Security Tests for Tenant Isolation
 * TNT-010: Comprehensive Testing - Security Tests
 */
describe('Tenant Isolation Security (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  
  let tenant1Id: string;
  let tenant2Id: string;
  let tenant1AdminToken: string;
  let tenant1EditorToken: string;
  let tenant1ViewerToken: string;
  let tenant2AdminToken: string;
  let tenant2EditorToken: string;
  
  let tenant1CollectionId: string;
  let tenant1ContentTypeId: string;
  let tenant1ContentEntryId: string;
  let tenant1CollectionItemId: string;
  
  let tenant2CollectionId: string;
  let tenant2ContentTypeId: string;
  let tenant2ContentEntryId: string;
  let tenant2CollectionItemId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create Tenant 1
    const tenant1 = await prisma.tenant.create({
      data: {
        name: 'Tenant 1',
        slug: 'tenant-1-isolation',
        plan: 'free',
      },
    });
    tenant1Id = tenant1.id;

    // Create Tenant 2
    const tenant2 = await prisma.tenant.create({
      data: {
        name: 'Tenant 2',
        slug: 'tenant-2-isolation',
        plan: 'free',
      },
    });
    tenant2Id = tenant2.id;

    // Create users for Tenant 1
    const tenant1Admin = await prisma.user.create({
      data: {
        tenantId: tenant1Id,
        email: 'admin1@test.com',
        passwordHash: '$2b$10$test',
        role: Role.TENANT_ADMIN,
      },
    });
    tenant1AdminToken = jwtService.sign({
      sub: tenant1Admin.id,
      email: tenant1Admin.email,
      tenantId: tenant1Admin.tenantId,
      role: tenant1Admin.role,
    });

    const tenant1Editor = await prisma.user.create({
      data: {
        tenantId: tenant1Id,
        email: 'editor1@test.com',
        passwordHash: '$2b$10$test',
        role: Role.EDITOR,
      },
    });
    tenant1EditorToken = jwtService.sign({
      sub: tenant1Editor.id,
      email: tenant1Editor.email,
      tenantId: tenant1Editor.tenantId,
      role: tenant1Editor.role,
    });

    const tenant1Viewer = await prisma.user.create({
      data: {
        tenantId: tenant1Id,
        email: 'viewer1@test.com',
        passwordHash: '$2b$10$test',
        role: Role.VIEWER,
      },
    });
    tenant1ViewerToken = jwtService.sign({
      sub: tenant1Viewer.id,
      email: tenant1Viewer.email,
      tenantId: tenant1Viewer.tenantId,
      role: tenant1Viewer.role,
    });

    // Create users for Tenant 2
    const tenant2Admin = await prisma.user.create({
      data: {
        tenantId: tenant2Id,
        email: 'admin2@test.com',
        passwordHash: '$2b$10$test',
        role: Role.TENANT_ADMIN,
      },
    });
    tenant2AdminToken = jwtService.sign({
      sub: tenant2Admin.id,
      email: tenant2Admin.email,
      tenantId: tenant2Admin.tenantId,
      role: tenant2Admin.role,
    });

    const tenant2Editor = await prisma.user.create({
      data: {
        tenantId: tenant2Id,
        email: 'editor2@test.com',
        passwordHash: '$2b$10$test',
        role: Role.EDITOR,
      },
    });
    tenant2EditorToken = jwtService.sign({
      sub: tenant2Editor.id,
      email: tenant2Editor.email,
      tenantId: tenant2Editor.tenantId,
      role: tenant2Editor.role,
    });

    // Create resources for Tenant 1
    const tenant1Collection = await prisma.collection.create({
      data: {
        tenantId: tenant1Id,
        slug: 'tenant1-collection',
        name: 'Tenant 1 Collection',
        schemaJson: { title: 'string' },
      },
    });
    tenant1CollectionId = tenant1Collection.id;

    const tenant1ContentType = await prisma.contentType.create({
      data: {
        tenantId: tenant1Id,
        slug: 'tenant1-article',
        name: 'Tenant 1 Article',
        schema: { type: 'object', properties: { title: { type: 'string' } } },
      },
    });
    tenant1ContentTypeId = tenant1ContentType.id;

    const tenant1ContentEntry = await prisma.contentEntry.create({
      data: {
        tenantId: tenant1Id,
        contentTypeId: tenant1ContentTypeId,
        data: { title: 'Tenant 1 Entry' },
        status: 'draft',
      },
    });
    tenant1ContentEntryId = tenant1ContentEntry.id;

    const tenant1CollectionItem = await prisma.collectionItem.create({
      data: {
        tenantId: tenant1Id,
        collectionId: tenant1CollectionId,
        data: { title: 'Tenant 1 Item' },
        status: 'DRAFT',
        version: 1,
      },
    });
    tenant1CollectionItemId = tenant1CollectionItem.id;

    // Create resources for Tenant 2
    const tenant2Collection = await prisma.collection.create({
      data: {
        tenantId: tenant2Id,
        slug: 'tenant2-collection',
        name: 'Tenant 2 Collection',
        schemaJson: { title: 'string' },
      },
    });
    tenant2CollectionId = tenant2Collection.id;

    const tenant2ContentType = await prisma.contentType.create({
      data: {
        tenantId: tenant2Id,
        slug: 'tenant2-article',
        name: 'Tenant 2 Article',
        schema: { type: 'object', properties: { title: { type: 'string' } } },
      },
    });
    tenant2ContentTypeId = tenant2ContentType.id;

    const tenant2ContentEntry = await prisma.contentEntry.create({
      data: {
        tenantId: tenant2Id,
        contentTypeId: tenant2ContentTypeId,
        data: { title: 'Tenant 2 Entry' },
        status: 'draft',
      },
    });
    tenant2ContentEntryId = tenant2ContentEntry.id;

    const tenant2CollectionItem = await prisma.collectionItem.create({
      data: {
        tenantId: tenant2Id,
        collectionId: tenant2CollectionId,
        data: { title: 'Tenant 2 Item' },
        status: 'DRAFT',
        version: 1,
      },
    });
    tenant2CollectionItemId = tenant2CollectionItem.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.collectionItem.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } },
    });
    await prisma.contentEntry.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } },
    });
    await prisma.collection.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } },
    });
    await prisma.contentType.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } },
    });
    await prisma.user.deleteMany({
      where: { tenantId: { in: [tenant1Id, tenant2Id] } },
    });
    await prisma.tenant.deleteMany({
      where: { id: { in: [tenant1Id, tenant2Id] } },
    });
    await app.close();
  });

  describe('Collections Isolation', () => {
    it('should only return collections for Tenant 1', async () => {
      const res = await request(app.getHttpServer())
        .get('/collections')
        .set('Authorization', `Bearer ${tenant1AdminToken}`)
        .set('X-Tenant-ID', tenant1Id)
        .expect(200);

      expect(res.body.every((c: any) => c.tenantId === tenant1Id)).toBe(true);
      expect(res.body.some((c: any) => c.id === tenant2CollectionId)).toBe(false);
    });

    it('should prevent Tenant 2 from accessing Tenant 1 collection', async () => {
      await request(app.getHttpServer())
        .get(`/collections/${tenant1CollectionId}`)
        .set('Authorization', `Bearer ${tenant2AdminToken}`)
        .set('X-Tenant-ID', tenant2Id)
        .expect(404);
    });

    it('should prevent Tenant 1 from accessing Tenant 2 collection', async () => {
      await request(app.getHttpServer())
        .get(`/collections/${tenant2CollectionId}`)
        .set('Authorization', `Bearer ${tenant1AdminToken}`)
        .set('X-Tenant-ID', tenant1Id)
        .expect(404);
    });
  });

  describe('Content Types Isolation', () => {
    it('should only return content types for Tenant 1', async () => {
      const res = await request(app.getHttpServer())
        .get('/content-types')
        .set('Authorization', `Bearer ${tenant1ViewerToken}`)
        .set('X-Tenant-ID', tenant1Id)
        .expect(200);

      expect(res.body.every((ct: any) => ct.tenantId === tenant1Id)).toBe(true);
      expect(res.body.some((ct: any) => ct.id === tenant2ContentTypeId)).toBe(false);
    });

    it('should prevent Tenant 2 from accessing Tenant 1 content type', async () => {
      await request(app.getHttpServer())
        .get(`/content-types/${tenant1ContentTypeId}`)
        .set('Authorization', `Bearer ${tenant2AdminToken}`)
        .set('X-Tenant-ID', tenant2Id)
        .expect(404);
    });
  });

  describe('Content Entries Isolation', () => {
    it('should only return content entries for Tenant 1', async () => {
      const res = await request(app.getHttpServer())
        .get(`/content/tenant1-article`)
        .set('Authorization', `Bearer ${tenant1ViewerToken}`)
        .set('X-Tenant-ID', tenant1Id)
        .expect(200);

      expect(res.body.entries.every((e: any) => e.tenantId === tenant1Id)).toBe(true);
      expect(res.body.entries.some((e: any) => e.id === tenant2ContentEntryId)).toBe(false);
    });

    it('should prevent Tenant 2 from accessing Tenant 1 content entry', async () => {
      await request(app.getHttpServer())
        .get(`/content/tenant1-article/${tenant1ContentEntryId}`)
        .set('Authorization', `Bearer ${tenant2EditorToken}`)
        .set('X-Tenant-ID', tenant2Id)
        .expect(404);
    });

    it('should prevent Tenant 1 from updating Tenant 2 content entry', async () => {
      await request(app.getHttpServer())
        .patch(`/content/tenant2-article/${tenant2ContentEntryId}`)
        .set('Authorization', `Bearer ${tenant1EditorToken}`)
        .set('X-Tenant-ID', tenant1Id)
        .send({ data: { title: 'Hacked' } })
        .expect(404);
    });
  });

  describe('Collection Items Isolation', () => {
    it('should only return items for Tenant 1 collection', async () => {
      const res = await request(app.getHttpServer())
        .get(`/collections/tenant1-collection/items`)
        .set('Authorization', `Bearer ${tenant1ViewerToken}`)
        .set('X-Tenant-ID', tenant1Id)
        .expect(200);

      expect(res.body.items.every((i: any) => i.tenantId === tenant1Id)).toBe(true);
      expect(res.body.items.some((i: any) => i.id === tenant2CollectionItemId)).toBe(false);
    });

    it('should prevent Tenant 2 from accessing Tenant 1 collection item', async () => {
      await request(app.getHttpServer())
        .get(`/collections/tenant1-collection/items/${tenant1CollectionItemId}`)
        .set('Authorization', `Bearer ${tenant2AdminToken}`)
        .set('X-Tenant-ID', tenant2Id)
        .expect(404);
    });
  });

  describe('Users Isolation', () => {
    it('should only return users for Tenant 1', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${tenant1AdminToken}`)
        .set('X-Tenant-ID', tenant1Id)
        .expect(200);

      expect(res.body.every((u: any) => u.tenantId === tenant1Id)).toBe(true);
    });

    it('should prevent Tenant 2 admin from accessing Tenant 1 users', async () => {
      const tenant1User = await prisma.user.findFirst({
        where: { tenantId: tenant1Id },
      });

      await request(app.getHttpServer())
        .get(`/users/${tenant1User!.id}`)
        .set('Authorization', `Bearer ${tenant2AdminToken}`)
        .set('X-Tenant-ID', tenant2Id)
        .expect(404);
    });
  });

  describe('Cross-Tenant Data Manipulation Prevention', () => {
    it('should prevent Tenant 2 from creating content in Tenant 1 content type', async () => {
      await request(app.getHttpServer())
        .post(`/content/tenant1-article`)
        .set('Authorization', `Bearer ${tenant2EditorToken}`)
        .set('X-Tenant-ID', tenant2Id)
        .send({
          data: { title: 'Hacked Entry' },
          status: 'draft',
        })
        .expect(404);
    });

    it('should prevent Tenant 1 from deleting Tenant 2 collection', async () => {
      await request(app.getHttpServer())
        .delete(`/collections/tenant2-collection`)
        .set('Authorization', `Bearer ${tenant1AdminToken}`)
        .set('X-Tenant-ID', tenant1Id)
        .expect(404);
    });

    it('should prevent Tenant 2 from updating Tenant 1 collection item', async () => {
      await request(app.getHttpServer())
        .put(`/collections/tenant1-collection/items/${tenant1CollectionItemId}`)
        .set('Authorization', `Bearer ${tenant2EditorToken}`)
        .set('X-Tenant-ID', tenant2Id)
        .send({
          data: { title: 'Hacked' },
          status: 'PUBLISHED',
          version: 1,
        })
        .expect(404);
    });
  });

  describe('Header Manipulation Attacks', () => {
    it('should reject request with mismatched tenant header and token tenant', async () => {
      // Token is for tenant1, but header says tenant2
      await request(app.getHttpServer())
        .get('/collections')
        .set('Authorization', `Bearer ${tenant1AdminToken}`)
        .set('X-Tenant-ID', tenant2Id)
        .expect(403);
    });

    it('should reject request without tenant header', async () => {
      await request(app.getHttpServer())
        .get('/collections')
        .set('Authorization', `Bearer ${tenant1AdminToken}`)
        .expect(400);
    });

    it('should reject request with invalid tenant ID', async () => {
      await request(app.getHttpServer())
        .get('/collections')
        .set('Authorization', `Bearer ${tenant1AdminToken}`)
        .set('X-Tenant-ID', 'invalid-tenant-id')
        .expect(400);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should safely handle malicious tenant ID in query', async () => {
      const maliciousTenantId = "'; DROP TABLE users; --";
      
      await request(app.getHttpServer())
        .get('/collections')
        .set('Authorization', `Bearer ${tenant1AdminToken}`)
        .set('X-Tenant-ID', maliciousTenantId)
        .expect(400);
    });

    it('should safely handle malicious IDs in path parameters', async () => {
      await request(app.getHttpServer())
        .get(`/collections/'; DROP TABLE collections; --`)
        .set('Authorization', `Bearer ${tenant1AdminToken}`)
        .set('X-Tenant-ID', tenant1Id)
        .expect(404); // Should return 404, not execute SQL
    });
  });
});


