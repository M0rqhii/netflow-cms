import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { TestAppModule } from '../src/test-app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createUserWithOrg } from './helpers/rls';

// Collections endpoints require auth and X-Site-ID

describe('Collections (e2e)', () => {
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
      data: { name: 'Collections Org', slug: `collections-org-${Date.now()}`, plan: 'free' },
    });
    orgId = organization.id;

    const site = await prisma.site.create({
      data: { orgId, name: 'Collections Site', slug: `collections-site-${Date.now()}` },
    });
    siteId = site.id;

    const user = await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'collections-admin@test.com',
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
    await prisma.user.deleteMany({ where: { orgId } });
    await prisma.site.deleteMany({ where: { id: siteId } });
    await prisma.organization.delete({ where: { id: orgId } });
    await app.close();
  });

  describe('POST /api/api/v1/v1/api/v1/collections', () => {
    it('should create collection', () => {
      return request(app.getHttpServer())
        .post('/api/v1/collections')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          slug: 'articles',
          name: 'Articles',
          schemaJson: { title: 'string' },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.slug).toBe('articles');
          expect(res.body.siteId).toBe(siteId);
        });
    });

    it('should return 400 without X-Site-ID', () => {
      return request(app.getHttpServer())
        .post('/api/v1/collections')
        .set('Authorization', `Bearer ${token}`)
        .send({
          slug: 'articles',
          name: 'Articles',
          schemaJson: {},
        })
        .expect(400);
    });
  });

  describe('GET /api/api/v1/v1/api/v1/collections', () => {
    it('should list collections for site', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/collections')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          slug: 'test-list',
          name: 'Test List',
          schemaJson: {},
        });

      return request(app.getHttpServer())
        .get('/api/v1/collections')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('GET /api/api/v1/v1/api/v1/collections/api/v1/:slug', () => {
    it('should get collection by slug', async () => {
      const slug = 'test-get';
      await request(app.getHttpServer())
        .post('/api/v1/collections')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .send({
          slug,
          name: 'Test Get',
          schemaJson: {},
        });

      return request(app.getHttpServer())
        .get(`/api/v1/collections/${slug}`)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(200)
        .expect((res) => {
          expect(res.body.slug).toBe(slug);
        });
    });

    it('should return 404 for nonexistent collection', () => {
      return request(app.getHttpServer())
        .get('/api/v1/collections/nonexistent')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Site-ID', siteId)
        .expect(404);
    });
  });
});







