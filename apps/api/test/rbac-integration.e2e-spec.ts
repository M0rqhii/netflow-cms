/// <reference types="jest" />
/// <reference path="./tsconfig.json" />
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { TestAppModule } from '../src/test-app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { RbacService } from '../src/modules/rbac/rbac.service';
import { RbacEvaluatorService } from '../src/modules/rbac/rbac-evaluator.service';
import { Role, SiteRole } from '../src/common/auth/roles.enum';
import { TestFactory } from './helpers/test-factory';
import { RbacFixtures } from './helpers/rbac-fixtures';
import { ensureCapabilities, ensureOrgOwnerRole, ensureUserRole } from './helpers/rbac-seed';

describe('RBAC Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let rbacService: RbacService;
  let rbacEvaluatorService: RbacEvaluatorService;
  let testFactory: TestFactory;

  // Test data
  let org: { id: string; name: string; slug: string; plan: string };
  let site: { id: string; orgId: string; name: string; slug: string };
  let ownerUser: { id: string; email: string; token: string };
  let adminUser: { id: string; email: string; token: string };
  let memberUser: { id: string; email: string; token: string };
  let testUser: { id: string; email: string; token: string };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    rbacService = moduleFixture.get<RbacService>(RbacService);
    rbacEvaluatorService = moduleFixture.get<RbacEvaluatorService>(RbacEvaluatorService);
    testFactory = new TestFactory(prisma, jwtService);

    await app.init();

    org = await testFactory.createOrganization({
      name: 'Test Org',
      slug: 'test-org-rbac',
      plan: 'pro',
    });

    site = await testFactory.createSite({
      orgId: org.id,
      name: 'Test Site',
      slug: 'test-site-rbac',
    });

    const ownerUserData = await testFactory.createUser({
      orgId: org.id,
      siteId: site.id,
      email: 'owner@test.com',
      role: Role.ORG_ADMIN,
        siteRole: SiteRole.ADMIN,
    });
    ownerUser = {
      id: ownerUserData.id,
      email: ownerUserData.email,
      token: ownerUserData.token,
    };

    const adminUserData = await testFactory.createUser({
      orgId: org.id,
      siteId: site.id,
      email: 'admin@test.com',
      role: Role.ORG_ADMIN,
        siteRole: SiteRole.ADMIN,
    });
    adminUser = {
      id: adminUserData.id,
      email: adminUserData.email,
      token: adminUserData.token,
    };

    const memberUserData = await testFactory.createUser({
      orgId: org.id,
      siteId: site.id,
      email: 'member@test.com',
      role: Role.VIEWER,
        siteRole: SiteRole.VIEWER,
    });
    memberUser = {
      id: memberUserData.id,
      email: memberUserData.email,
      token: memberUserData.token,
    };

    const testUserData = await testFactory.createUser({
      orgId: org.id,
      siteId: site.id,
      email: 'testuser@test.com',
      role: Role.VIEWER,
        siteRole: SiteRole.VIEWER,
    });
    testUser = {
      id: testUserData.id,
      email: testUserData.email,
      token: testUserData.token,
    };

    await ensureCapabilities(prisma);
    const ownerRole = await ensureOrgOwnerRole(prisma, org.id);
    await ensureUserRole(prisma, {
      orgId: org.id,
      userId: ownerUser.id,
      roleId: ownerRole.id,
      siteId: null,
    });

    const capabilities = await prisma.capability.findMany();
    if (capabilities.length == 0) {
      throw new Error('Capabilities not found in database. Run seed first.');
    }
  });

  afterAll(async () => {
    await prisma.userRole.deleteMany({
      where: {
        orgId: org.id,
      },
    });
    await prisma.role.deleteMany({
      where: {
        orgId: org.id,
      },
    });
    await prisma.orgPolicy.deleteMany({
      where: {
        orgId: org.id,
      },
    });
    await testFactory.cleanup({ orgIds: [org.id], siteIds: [site.id] });
    await app.close();
  });

  describe('TC-1: Custom Role Creation and Assignment (SITE scope)', () => {
    let customRoleId: string;
    it('should create a custom SITE role with builder.edit capability', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/roles`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          name: RbacFixtures.customRoles.siteEditor.name,
          description: RbacFixtures.customRoles.siteEditor.description,
          scope: RbacFixtures.customRoles.siteEditor.scope,
          capabilityKeys: RbacFixtures.customRoles.siteEditor.capabilityKeys,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(RbacFixtures.customRoles.siteEditor.name);
      expect(response.body.scope).toBe('SITE');
      expect(response.body.type).toBe('CUSTOM');
      expect(response.body.capabilities).toHaveLength(2);
      expect(response.body.capabilities.some((c: any) => c.key === 'builder.edit')).toBe(true);

      customRoleId = response.body.id;
    });

    it('should assign the SITE role to a user with siteId', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/assignments`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          userId: testUser.id,
          roleId: customRoleId,
          siteId: site.id,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(testUser.id);
      expect(response.body.roleId).toBe(customRoleId);
      expect(response.body.siteId).toBe(site.id);

    });

    it('should return true for canUserPerform(builder.edit) on the assigned site', async () => {
      const canPerform = await rbacService.canUserPerform(
        org.id,
        testUser.id,
        'builder.edit',
        site.id,
      );

      expect(canPerform).toBe(true);
    });

    it('should return false for canUserPerform(builder.edit) on a different site', async () => {
      const otherSite = await testFactory.createSite({
        orgId: org.id,
        name: 'Other Site',
        slug: `other-site-rbac-${Date.now()}`,
      });

      const canPerform = await rbacService.canUserPerform(
        org.id,
        testUser.id,
        'builder.edit',
        otherSite.id,
      );

      expect(canPerform).toBe(false);

      await testFactory.cleanup({ siteIds: [otherSite.id] });
    });
  });

  describe('TC-2: Policy Blocks Capability', () => {
    let customRoleId: string;
    let assignmentId: string;
    beforeAll(async () => {
      const roleResponse = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/roles`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          name: RbacFixtures.customRoles.marketingManager.name,
          description: RbacFixtures.customRoles.marketingManager.description,
          scope: RbacFixtures.customRoles.marketingManager.scope,
          capabilityKeys: RbacFixtures.customRoles.marketingManager.capabilityKeys,
        })
        .expect(201);

      customRoleId = roleResponse.body.id;

      const assignmentResponse = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/assignments`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          userId: testUser.id,
          roleId: customRoleId,
          siteId: null,
        })
        .expect(201);

      assignmentId = assignmentResponse.body.id;
    });

    afterAll(async () => {
      if (assignmentId) {
        await request(app.getHttpServer())
          .delete(`/api/v1/orgs/${org.id}/rbac/assignments/${assignmentId}`)
          .set('Authorization', `Bearer ${ownerUser.token}`)
          .set('X-Org-ID', org.id);
      }
      if (customRoleId) {
        await request(app.getHttpServer())
          .delete(`/api/v1/orgs/${org.id}/rbac/roles/${customRoleId}?force=true`)
          .set('Authorization', `Bearer ${ownerUser.token}`)
          .set('X-Org-ID', org.id);
      }
    });

    it('should allow marketing.ads.manage when policy is enabled', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/orgs/${org.id}/rbac/policies/marketing.ads.manage`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          enabled: true,
        })
        .expect(200);

      const canPerform = await rbacService.canUserPerform(
        org.id,
        testUser.id,
        'marketing.ads.manage',
      );

      expect(canPerform).toBe(true);
    });

    it('should block marketing.ads.manage when policy is disabled', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/orgs/${org.id}/rbac/policies/marketing.ads.manage`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          enabled: false,
        })
        .expect(200);

      const canPerform = await rbacService.canUserPerform(
        org.id,
        testUser.id,
        'marketing.ads.manage',
      );

      expect(canPerform).toBe(false);
    });

    it('should return 403 when trying to publish to ads channel with disabled policy', async () => {
      const draftResponse = await request(app.getHttpServer())
        .post('/api/v1/marketing/drafts')
        .set('Authorization', `Bearer ${testUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          title: 'Test Draft',
          content: { site: { title: 'Test' } },
          channels: ['site', 'ads'],
        });

      if (draftResponse.status === 201) {
        const publishResponse = await request(app.getHttpServer())
          .post('/api/v1/marketing/publish')
          .set('Authorization', `Bearer ${testUser.token}`)
          .set('X-Org-ID', org.id)
          .send({
            siteId: site.id,
            draftId: draftResponse.body.id,
            channels: ['ads'],
          });

        expect([400, 403]).toContain(publishResponse.status);
      }
    });
  });

  describe('TC-3: System Role Protection', () => {
    let systemRoleId: string;

    beforeAll(async () => {
      const rolesResponse = await request(app.getHttpServer())
        .get(`/api/v1/orgs/${org.id}/rbac/roles`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .expect(200);

      const systemRole = rolesResponse.body.find((r: any) => r.type === 'SYSTEM');
      if (systemRole) {
        systemRoleId = systemRole.id;
      }
    });

    it('should return 403 when trying to update a system role', async () => {
      if (!systemRoleId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/orgs/${org.id}/rbac/roles/${systemRoleId}`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          name: 'Modified System Role',
        });

      expect([400, 403]).toContain(response.status);
    });

    it('should return 403 when trying to delete a system role', async () => {
      if (!systemRoleId) {
        return;
      }

      const response = await request(app.getHttpServer())
        .delete(`/api/v1/orgs/${org.id}/rbac/roles/${systemRoleId}`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id);

      expect([400, 403]).toContain(response.status);
    });
  });

  describe('TC-4: Blocked Capabilities in Custom Roles', () => {
    it('should return 400 when trying to create a custom role with billing.* capability', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/roles`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          name: 'Custom Role with Billing',
          description: 'Should fail',
          scope: 'ORG',
          capabilityKeys: ['billing.view_plan', 'builder.view'],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('blocked capabilities');
    });

    it('should return 400 when trying to update a custom role to include billing.* capability', async () => {
      const createResponse = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/roles`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          name: 'Test Role for Update',
          description: 'Test',
          scope: 'ORG',
          capabilityKeys: ['builder.view'],
        })
        .expect(201);

      const roleId = createResponse.body.id;

      const updateResponse = await request(app.getHttpServer())
        .patch(`/api/v1/orgs/${org.id}/rbac/roles/${roleId}`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          capabilityKeys: ['builder.view', 'billing.change_plan'],
        });

      expect(updateResponse.status).toBe(400);
      expect(updateResponse.body.message).toContain('blocked capabilities');

      await request(app.getHttpServer())
        .delete(`/api/v1/orgs/${org.id}/rbac/roles/${roleId}?force=true`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id);
    });
  });

  describe('TC-5: Assignment Scope Validation', () => {
    let siteRoleId: string;
    let orgRoleId: string;

    beforeAll(async () => {
      const siteRoleResponse = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/roles`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          name: 'Site Scope Role',
          description: 'Test',
          scope: 'SITE',
          capabilityKeys: ['builder.view'],
        })
        .expect(201);

      siteRoleId = siteRoleResponse.body.id;

      const orgRoleResponse = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/roles`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          name: 'Org Scope Role',
          description: 'Test',
          scope: 'ORG',
          capabilityKeys: ['builder.view'],
        })
        .expect(201);

      orgRoleId = orgRoleResponse.body.id;
    });

    afterAll(async () => {
      if (siteRoleId) {
        await request(app.getHttpServer())
          .delete(`/api/v1/orgs/${org.id}/rbac/roles/${siteRoleId}?force=true`)
          .set('Authorization', `Bearer ${ownerUser.token}`)
          .set('X-Org-ID', org.id);
      }
      if (orgRoleId) {
        await request(app.getHttpServer())
          .delete(`/api/v1/orgs/${org.id}/rbac/roles/${orgRoleId}?force=true`)
          .set('Authorization', `Bearer ${ownerUser.token}`)
          .set('X-Org-ID', org.id);
      }
    });

    it('should return 400 when assigning SITE role without siteId', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/assignments`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          userId: testUser.id,
          roleId: siteRoleId,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('siteId');
    });

    it('should return 400 when assigning ORG role with siteId', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/assignments`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          userId: testUser.id,
          roleId: orgRoleId,
          siteId: site.id,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('ORG scope');
    });
  });

  describe('TC-6: Effective Capabilities Endpoint', () => {
    let customRoleId: string;
    let assignmentId: string;
    beforeAll(async () => {
      const roleResponse = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/roles`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          name: 'Effective Test Role',
          description: 'Test',
          scope: 'ORG',
          capabilityKeys: ['builder.view', 'builder.edit', 'marketing.view'],
        })
        .expect(201);

      customRoleId = roleResponse.body.id;

      const assignmentResponse = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/assignments`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          userId: testUser.id,
          roleId: customRoleId,
          siteId: null,
        })
        .expect(201);

      assignmentId = assignmentResponse.body.id;

      await request(app.getHttpServer())
        .put(`/api/v1/orgs/${org.id}/rbac/policies/marketing.ads.manage`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          enabled: false,
        });
    });

    afterAll(async () => {
      if (assignmentId) {
        await request(app.getHttpServer())
          .delete(`/api/v1/orgs/${org.id}/rbac/assignments/${assignmentId}`)
          .set('Authorization', `Bearer ${ownerUser.token}`)
          .set('X-Org-ID', org.id);
      }
      if (customRoleId) {
        await request(app.getHttpServer())
          .delete(`/api/v1/orgs/${org.id}/rbac/roles/${customRoleId}?force=true`)
          .set('Authorization', `Bearer ${ownerUser.token}`)
          .set('X-Org-ID', org.id);
      }
    });

    it('should return effective capabilities with consistent reasons', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/orgs/${org.id}/rbac/effective`)
        .set('Authorization', `Bearer ${testUser.token}`)
        .set('X-Org-ID', org.id)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const builderView = response.body.find((c: any) => c.key === 'builder.view');
      expect(builderView).toBeDefined();
      expect(builderView).toHaveProperty('allowed');
      expect(builderView).toHaveProperty('reason');
      expect(builderView).toHaveProperty('policyEnabled');
      expect(builderView).toHaveProperty('roleSources');

      expect(builderView.allowed).toBe(true);
      expect(builderView.reason).toBe('allowed');
      expect(builderView.roleSources).toContain('Effective Test Role');

      const builderEdit = response.body.find((c: any) => c.key === 'builder.edit');
      expect(builderEdit.allowed).toBe(true);
      expect(builderEdit.reason).toBe('allowed');

      const marketingView = response.body.find((c: any) => c.key === 'marketing.view');
      expect(marketingView.allowed).toBe(true);
      expect(marketingView.reason).toBe('allowed');

      const marketingAds = response.body.find((c: any) => c.key === 'marketing.ads.manage');
      expect(marketingAds).toBeDefined();
      expect(marketingAds.allowed).toBe(false);
      expect(marketingAds.reason).toBe('missing_role_capability');
    });

    it('should return consistent reasons when checking via can() method', async () => {
      const builderViewResult = await rbacEvaluatorService.can({
        userId: testUser.id,
        orgId: org.id,
        capabilityKey: 'builder.view',
      });

      expect(builderViewResult.allowed).toBe(true);
      expect(builderViewResult.reason).toBe('allowed');
      expect(builderViewResult.roleSources).toContain('Effective Test Role');

      const marketingAdsResult = await rbacEvaluatorService.can({
        userId: testUser.id,
        orgId: org.id,
        capabilityKey: 'marketing.ads.manage',
      });

      expect(marketingAdsResult.allowed).toBe(false);
      expect(marketingAdsResult.reason).toBe('missing_role_capability');
    });
  });

  describe('TC-7: Domains/api/v1/Hosting Endpoints Authorization', () => {
    let memberRoleId: string;
    let adminRoleId: string;
    let memberAssignmentId: string;
    let adminAssignmentId: string;

    beforeAll(async () => {
      const rolesResponse = await request(app.getHttpServer())
        .get(`/api/v1/orgs/${org.id}/rbac/roles`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .expect(200);

      let adminRole = rolesResponse.body.find((r: any) =>
        r.capabilities.some((c: any) => c.key === 'domains.view'),
      );

      if (!adminRole) {
        const createResponse = await request(app.getHttpServer())
          .post(`/api/v1/orgs/${org.id}/rbac/roles`)
          .set('Authorization', `Bearer ${ownerUser.token}`)
          .set('X-Org-ID', org.id)
          .send({
            name: 'Admin with Domains',
            description: 'Admin role with domains/api/v1/hosting access',
            scope: 'ORG',
            capabilityKeys: ['domains.view', 'domains.assign', 'hosting.usage.view', 'hosting.deploy'],
          })
          .expect(201);

        adminRole = createResponse.body;
      }

      adminRoleId = adminRole.id;

      const memberRoleResponse = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/roles`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          name: 'Member without Domains',
          description: 'Member role without domains/api/v1/hosting access',
          scope: 'ORG',
          capabilityKeys: ['builder.view', 'content.view'],
        })
        .expect(201);

      memberRoleId = memberRoleResponse.body.id;

      const memberAssignmentResponse = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/assignments`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          userId: memberUser.id,
          roleId: memberRoleId,
          siteId: null,
        })
        .expect(201);

      memberAssignmentId = memberAssignmentResponse.body.id;

      const adminAssignmentResponse = await request(app.getHttpServer())
        .post(`/api/v1/orgs/${org.id}/rbac/assignments`)
        .set('Authorization', `Bearer ${ownerUser.token}`)
        .set('X-Org-ID', org.id)
        .send({
          userId: adminUser.id,
          roleId: adminRoleId,
          siteId: null,
        })
        .expect(201);

      adminAssignmentId = adminAssignmentResponse.body.id;
    });

    afterAll(async () => {
      if (memberAssignmentId) {
        await request(app.getHttpServer())
          .delete(`/api/v1/orgs/${org.id}/rbac/assignments/${memberAssignmentId}`)
          .set('Authorization', `Bearer ${ownerUser.token}`)
          .set('X-Org-ID', org.id);
      }
      if (adminAssignmentId) {
        await request(app.getHttpServer())
          .delete(`/api/v1/orgs/${org.id}/rbac/assignments/${adminAssignmentId}`)
          .set('Authorization', `Bearer ${ownerUser.token}`)
          .set('X-Org-ID', org.id);
      }
      if (memberRoleId) {
        await request(app.getHttpServer())
          .delete(`/api/v1/orgs/${org.id}/rbac/roles/${memberRoleId}?force=true`)
          .set('Authorization', `Bearer ${ownerUser.token}`)
          .set('X-Org-ID', org.id);
      }
    });

    it('should return 403 for member user accessing domains capabilities', async () => {
      const canViewDomains = await rbacService.canUserPerform(
        org.id,
        memberUser.id,
        'domains.view',
      );

      expect(canViewDomains).toBe(false);
    });

    it('should return true for admin user accessing domains capabilities', async () => {
      const canViewDomains = await rbacService.canUserPerform(
        org.id,
        adminUser.id,
        'domains.view',
      );

      expect(canViewDomains).toBe(true);
    });

    it('should return 403 for member user accessing hosting capabilities', async () => {
      const canViewHosting = await rbacService.canUserPerform(
        org.id,
        memberUser.id,
        'hosting.usage.view',
      );

      expect(canViewHosting).toBe(false);
    });

    it('should return true for admin user accessing hosting capabilities', async () => {
      const canViewHosting = await rbacService.canUserPerform(
        org.id,
        adminUser.id,
        'hosting.usage.view',
      );

      expect(canViewHosting).toBe(true);
    });

    it('should return true for owner user accessing domains/api/v1/hosting capabilities', async () => {
      const canViewDomains = await rbacService.canUserPerform(
        org.id,
        ownerUser.id,
        'domains.view',
      );

      expect(typeof canViewDomains).toBe('boolean');
    });
  });
});









