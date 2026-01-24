///api/v1/ <reference types="jest" /api/v1/>
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { TestAppModule } from '../src/test-app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createUserWithOrg } from './helpers/rls';

// Tests for org-scoped auth hub endpoints

describe('Auth Hub Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let userId: string;
  let orgAId: string;
  let orgBId: string;
  let globalToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();

    const orgA = await prisma.organization.create({
      data: { name: 'Org A', slug: 'org-a', plan: 'free' },
    });
    const orgB = await prisma.organization.create({
      data: { name: 'Org B', slug: 'org-b', plan: 'free' },
    });
    orgAId = orgA.id; orgBId = orgB.id;

    // Create a site for each org to satisfy RLS/api/v1/middleware when needed
    await prisma.site.create({ data: { orgId: orgAId, name: 'Org A Site', slug: `org-a-site-${Date.now()}` } });
    await prisma.site.create({ data: { orgId: orgBId, name: 'Org B Site', slug: `org-b-site-${Date.now()}` } });

    const user = await createUserWithOrg(prisma, {
      data: {
        email: 'hub@test.com',
        passwordHash: '$2b$10$rQZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK',
        orgId: orgAId,
        role: 'org_admin',
        siteRole: 'admin',
      },
    });
    userId = user.id;

    await prisma.userOrg.createMany({
      data: [
        { userId, orgId: orgAId, role: 'owner' },
        { userId, orgId: orgBId, role: 'editor' },
      ],
    });

    globalToken = jwtService.sign({ sub: userId, email: user.email, role: 'org_admin' });
  });

  afterAll(async () => {
    await prisma.userOrg.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.site.deleteMany({ where: { orgId: { in: [orgAId, orgBId] } } });
    await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
    await app.close();
  });

  it('GET /api/v1/auth/api/v1/me/api/v1/orgs returns memberships', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me/orgs')
      .set('Authorization', `Bearer ${globalToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /api/v1/auth/api/v1/org-token issues org-scoped token', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/org-token')
      .set('Authorization', `Bearer ${globalToken}`)
      .send({ orgId: orgAId })
      .expect(200);
    expect(res.body).toHaveProperty('access_token');
  });

  it('GET /api/v1/auth/api/v1/resolve-org/api/v1/:slug resolves membership', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/resolve-org/org-a')
      .set('Authorization', `Bearer ${globalToken}`)
      .expect(200);
    expect(res.body).toHaveProperty('id', orgAId);
  });
});






