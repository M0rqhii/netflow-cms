import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Marketing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const orgId = 'org-e2e-marketing-1';
  const siteId = 'site-e2e-marketing-1';
  let authToken: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    await app.init();

    // Create test tenant (site)
    await prisma.tenant.upsert({
      where: { id: siteId },
      create: {
        id: siteId,
        name: 'Test Site',
        slug: 'test-site-marketing',
        plan: 'free',
      },
      update: {},
    });

    // Create test user
    const user = await prisma.user.upsert({
      where: { id: `user-${siteId}` },
      create: {
        id: `user-${siteId}`,
        tenantId: siteId,
        email: 'marketing-test@example.com',
        passwordHash: 'hashed',
        role: 'tenant_admin',
      },
      update: {},
    });
    userId = user.id;

    // Mock auth token (in real scenario, use JWT)
    authToken = 'mock-token';
  });

  afterAll(async () => {
    // Cleanup
    await prisma.publishResult.deleteMany({ where: { orgId } });
    await prisma.publishJob.deleteMany({ where: { orgId } });
    await prisma.distributionDraft.deleteMany({ where: { orgId } });
    await prisma.channelConnection.deleteMany({ where: { orgId } });
    await prisma.campaign.deleteMany({ where: { orgId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.tenant.deleteMany({ where: { id: siteId } });
    await app.close();
  });

  describe('Campaigns', () => {
    it('POST /api/v1/marketing/campaigns - should create campaign', () => {
      return request(app.getHttpServer())
        .post('/api/v1/marketing/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', orgId)
        .send({
          siteId,
          name: 'Test Campaign',
          description: 'Test description',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.name).toBe('Test Campaign');
          expect(res.body.orgId).toBe(orgId);
        });
    });

    it('GET /api/v1/marketing/campaigns - should list campaigns', () => {
      return request(app.getHttpServer())
        .get('/api/v1/marketing/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', orgId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('campaigns');
          expect(res.body).toHaveProperty('pagination');
          expect(Array.isArray(res.body.campaigns)).toBe(true);
        });
    });
  });

  describe('Distribution Drafts', () => {
    it('POST /api/v1/marketing/drafts - should create draft', () => {
      return request(app.getHttpServer())
        .post('/api/v1/marketing/drafts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', orgId)
        .send({
          siteId,
          title: 'Test Draft',
          content: { site: { title: 'Test' } },
          channels: ['site', 'facebook'],
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.title).toBe('Test Draft');
          expect(res.body.channels).toContain('site');
        });
    });

    it('GET /api/v1/marketing/drafts - should list drafts', () => {
      return request(app.getHttpServer())
        .get('/api/v1/marketing/drafts')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', orgId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('drafts');
          expect(res.body).toHaveProperty('pagination');
        });
    });
  });

  describe('Publish', () => {
    it('POST /api/v1/marketing/publish - should create publish job', () => {
      return request(app.getHttpServer())
        .post('/api/v1/marketing/publish')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', orgId)
        .send({
          siteId,
          channels: ['site'],
          title: 'Test Publish',
          content: { site: { title: 'Test' } },
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.status).toBe('pending');
          expect(res.body.channels).toContain('site');
        });
    });

    it('GET /api/v1/marketing/jobs - should list publish jobs', () => {
      return request(app.getHttpServer())
        .get('/api/v1/marketing/jobs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', orgId)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('jobs');
          expect(res.body).toHaveProperty('pagination');
        });
    });
  });

  describe('Channel Connections', () => {
    it('POST /api/v1/marketing/channels - should create channel connection', () => {
      return request(app.getHttpServer())
        .post('/api/v1/marketing/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', orgId)
        .send({
          siteId,
          channel: 'facebook',
          channelName: 'My Page',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.channel).toBe('facebook');
        });
    });

    it('GET /api/v1/marketing/channels - should list channel connections', () => {
      return request(app.getHttpServer())
        .get('/api/v1/marketing/channels')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Tenant-ID', orgId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});

