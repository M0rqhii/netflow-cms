import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { TestAppModule } from '../src/test-app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { createUserWithOrg } from './helpers/rls';
import { ensureCapabilities, ensureRoleWithCapabilities, ensureUserRole } from './helpers/rbac-seed';

describe('Marketing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let orgId: string;
  let siteId: string;
  let authToken: string;

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
      data: { name: 'Marketing Org', slug: `marketing-org-${Date.now()}`, plan: 'free' },
    });
    orgId = organization.id;

    const site = await prisma.site.create({
      data: { orgId, name: 'Marketing Site', slug: `marketing-site-${Date.now()}` },
    });
    siteId = site.id;

    const user = await createUserWithOrg(prisma, {
      data: {
        orgId,
        email: 'marketing-test@example.com',
        passwordHash: 'hashed',
        role: 'org_admin',
        siteRole: 'admin',
      },
    });

    await ensureCapabilities(prisma);
    const marketingRole = await ensureRoleWithCapabilities(prisma, {
      orgId,
      name: 'Marketing E2E',
      scope: 'ORG',
      capabilityKeys: [
        'marketing.view',
        'marketing.content.edit',
        'marketing.publish',
        'marketing.campaign.manage',
        'marketing.social.connect',
      ],
      type: 'CUSTOM',
      isImmutable: false,
    });
    await ensureUserRole(prisma, {
      orgId,
      userId: user.id,
      roleId: marketingRole.id,
      siteId: null,
    });

    authToken = jwtService.sign({
      sub: user.id,
      email: user.email,
      orgId,
      siteId,
      role: user.role,
    });
  });

  afterAll(async () => {
    await prisma.publishResult.deleteMany({ where: { orgId } });
    await prisma.publishJob.deleteMany({ where: { orgId } });
    await prisma.distributionDraft.deleteMany({ where: { orgId } });
    await prisma.channelConnection.deleteMany({ where: { orgId } });
    await prisma.campaign.deleteMany({ where: { orgId } });
    await prisma.user.deleteMany({ where: { orgId } });
    await prisma.site.deleteMany({ where: { id: siteId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await app.close();
  });

  describe('Campaigns', () => {
    it('POST /api/v1/marketing/campaigns - should create campaign', () => {
      return request(app.getHttpServer())
        .post('/api/v1/marketing/campaigns')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Org-ID', orgId)
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
        .set('X-Org-ID', orgId)
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
        .set('X-Org-ID', orgId)
        .send({
          siteId,
          title: 'Test Draft',
          content: { site: { title: 'Test' }, facebook: { message: 'Test FB' } },
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
        .set('X-Org-ID', orgId)
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
        .set('X-Org-ID', orgId)
        .send({
          siteId,
          channels: ['site'],
          title: 'Test Publish',
          content: { site: { title: 'Test' }, facebook: { message: 'Test FB' } },
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
        .set('X-Org-ID', orgId)
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
        .set('X-Org-ID', orgId)
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
        .set('X-Org-ID', orgId)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });
});





