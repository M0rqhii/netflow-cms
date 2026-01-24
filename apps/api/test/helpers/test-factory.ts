import { PrismaService } from '../../src/common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role, SiteRole, PlatformRole } from '../../src/common/auth/roles.enum';
import * as bcrypt from 'bcrypt';

export interface TestUser {
  id: string;
  email: string;
  orgId: string;
  siteId?: string;
  role: Role;
  siteRole?: SiteRole;
  platformRole?: PlatformRole;
  token: string;
}

export interface TestOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface TestSite {
  id: string;
  orgId: string;
  name: string;
  slug: string;
}

export class TestFactory {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Create a test organization
   */
  async createOrganization(data?: {
    name?: string;
    slug?: string;
    plan?: string;
  }): Promise<TestOrganization> {
    const organization = await this.prisma.organization.create({
      data: {
        name: data?.name || `Test Organization ${Date.now()}`,
        slug: data?.slug || `test-org-${Date.now()}`,
        plan: data?.plan || 'free',
      },
    });

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
    };
  }

  /**
   * Create a test site for an organization
   */
  async createSite(data: {
    orgId: string;
    name?: string;
    slug?: string;
  }): Promise<TestSite> {
    const site = await this.prisma.site.create({
      data: {
        orgId: data.orgId,
        name: data.name || `Test Site ${Date.now()}`,
        slug: data.slug || `test-site-${Date.now()}`,
      },
    });

    return {
      id: site.id,
      orgId: site.orgId,
      name: site.name,
      slug: site.slug,
    };
  }

  /**
   * Create a test user with JWT token
   */
  async createUser(data: {
    orgId: string;
    siteId?: string;
    email?: string;
    role?: Role;
    siteRole?: SiteRole;
    platformRole?: PlatformRole;
    password?: string;
  }): Promise<TestUser> {
    const passwordHash = await bcrypt.hash(
      data.password || 'test-password',
      10,
    );

    const user = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${data.orgId}'`);
      const created = await tx.user.create({
        data: {
          orgId: data.orgId,
          email: data.email || `test-${Date.now()}@test.com`,
          passwordHash,
          role: data.role || Role.VIEWER,
          siteRole: data.siteRole,
          platformRole: data.platformRole,
        },
      });
      await tx.userOrg.create({
        data: {
          userId: created.id,
          orgId: data.orgId,
          role: data.role || Role.VIEWER,
        },
      });
      return created;
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
      siteId: data.siteId,
      role: user.role,
      siteRole: user.siteRole || data.siteRole,
      platformRole: user.platformRole || data.platformRole,
    });

    return {
      id: user.id,
      email: user.email,
      orgId: user.orgId,
      siteId: data.siteId,
      role: user.role as Role,
      siteRole: user.siteRole as SiteRole | undefined,
      platformRole: user.platformRole as PlatformRole | undefined,
      token,
    };
  }

  /**
   * Create a test collection
   */
  async createCollection(data: {
    siteId: string;
    slug?: string;
    name?: string;
    schemaJson?: any;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${data.siteId}'`);
      return tx.collection.create({
        data: {
          siteId: data.siteId,
          slug: data.slug || `test-collection-${Date.now()}`,
          name: data.name || `Test Collection ${Date.now()}`,
          schemaJson: data.schemaJson || { type: 'object', properties: {} },
        },
      });
    });
  }

  /**
   * Create a test content type
   */
  async createContentType(data: {
    siteId: string;
    slug?: string;
    name?: string;
    schema?: any;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${data.siteId}'`);
      return tx.contentType.create({
        data: {
          siteId: data.siteId,
          slug: data.slug || `test-content-type-${Date.now()}`,
          name: data.name || `Test Content Type ${Date.now()}`,
          schema: data.schema || { type: 'object', properties: {} },
        },
      });
    });
  }

  /**
   * Create a test content entry
   */
  async createContentEntry(data: {
    siteId: string;
    contentTypeId: string;
    data?: any;
    status?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL app.current_site_id = '${data.siteId}'`);
      return tx.contentEntry.create({
        data: {
          siteId: data.siteId,
          contentTypeId: data.contentTypeId,
          data: data.data || {},
          status: data.status || 'draft',
        },
      });
    });
  }

  /**
   * Clean up test data
   */
  async cleanup(data: { orgIds?: string[]; siteIds?: string[] }) {
    const siteIds = data.siteIds || [];
    const orgIds = data.orgIds || [];

    if (siteIds.length > 0) {
      await this.prisma.site.deleteMany({
        where: { id: { in: siteIds } },
      });
    }

    if (orgIds.length > 0) {
      await this.prisma.organization.deleteMany({
        where: { id: { in: orgIds } },
      });
    }
  }
}






