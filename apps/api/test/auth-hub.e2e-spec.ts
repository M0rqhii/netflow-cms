/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Auth Hub Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let userId: string;
  let tenantAId: string;
  let tenantBId: string;
  let globalToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();

    const ta = await prisma.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a', plan: 'free' } });
    const tb = await prisma.tenant.create({ data: { name: 'Tenant B', slug: 'tenant-b', plan: 'free' } });
    tenantAId = ta.id; tenantBId = tb.id;

    const user = await prisma.user.create({
      data: {
        email: 'hub@test.com',
        passwordHash: '$2b$10$rQZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK9JZ8vK',
        tenantId: ta.id,
        role: 'tenant_admin',
      },
    });
    userId = user.id;

    // Try to create memberships if table exists (ignore errors otherwise)
    try {
      // @ts-ignore
      await prisma.userTenant.create({ data: { userId, tenantId: ta.id, role: 'tenant_admin' } });
      // @ts-ignore
      await prisma.userTenant.create({ data: { userId, tenantId: tb.id, role: 'editor' } });
    } catch (_) {}

    globalToken = jwtService.sign({ sub: userId, email: user.email, role: 'tenant_admin' });
  });

  afterAll(async () => {
    // Cleanup
    // @ts-ignore
    try { await prisma.userTenant.deleteMany({ where: { userId } }); } catch (_) {}
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
    await app.close();
  });

  it('GET /auth/me/tenants returns memberships', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me/tenants')
      .set('Authorization', `Bearer ${globalToken}`)
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it('POST /auth/tenant-token issues tenant-scoped token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/tenant-token')
      .set('Authorization', `Bearer ${globalToken}`)
      .send({ tenantId: tenantAId })
      .expect(200);
    expect(res.body).toHaveProperty('access_token');
  });

  it('GET /auth/resolve-tenant/:slug resolves membership', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/resolve-tenant/tenant-a')
      .set('Authorization', `Bearer ${globalToken}`)
      .expect(200);
    expect(res.body).toHaveProperty('id', tenantAId);
  });
});

