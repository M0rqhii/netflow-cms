import { PrismaService } from '../../src/common/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../../src/common/auth/roles.enum';
import * as bcrypt from 'bcrypt';

export interface TestUser {
  id: string;
  email: string;
  tenantId: string;
  role: Role;
  token: string;
}

export interface TestTenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export class TestFactory {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Create a test tenant
   */
  async createTenant(data?: {
    name?: string;
    slug?: string;
    plan?: string;
  }): Promise<TestTenant> {
    const tenant = await this.prisma.tenant.create({
      data: {
        name: data?.name || `Test Tenant ${Date.now()}`,
        slug: data?.slug || `test-tenant-${Date.now()}`,
        plan: data?.plan || 'free',
      },
    });

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
    };
  }

  /**
   * Create a test user with JWT token
   */
  async createUser(data: {
    tenantId: string;
    email?: string;
    role?: Role;
    password?: string;
  }): Promise<TestUser> {
    const passwordHash = await bcrypt.hash(
      data.password || 'test-password',
      10,
    );

    const user = await this.prisma.user.create({
      data: {
        tenantId: data.tenantId,
        email: data.email || `test-${Date.now()}@test.com`,
        passwordHash,
        role: data.role || Role.VIEWER,
      },
    });

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role as Role,
      token,
    };
  }

  /**
   * Create a test collection
   */
  async createCollection(data: {
    tenantId: string;
    slug?: string;
    name?: string;
    schemaJson?: any;
  }) {
    return this.prisma.collection.create({
      data: {
        tenantId: data.tenantId,
        slug: data.slug || `test-collection-${Date.now()}`,
        name: data.name || `Test Collection ${Date.now()}`,
        schemaJson: data.schemaJson || { type: 'object', properties: {} },
      },
    });
  }

  /**
   * Create a test content type
   */
  async createContentType(data: {
    tenantId: string;
    slug?: string;
    name?: string;
    schema?: any;
  }) {
    return this.prisma.contentType.create({
      data: {
        tenantId: data.tenantId,
        slug: data.slug || `test-content-type-${Date.now()}`,
        name: data.name || `Test Content Type ${Date.now()}`,
        schema: data.schema || { type: 'object', properties: {} },
      },
    });
  }

  /**
   * Create a test content entry
   */
  async createContentEntry(data: {
    tenantId: string;
    contentTypeId: string;
    data?: any;
    published?: boolean;
  }) {
    return this.prisma.contentEntry.create({
      data: {
        tenantId: data.tenantId,
        contentTypeId: data.contentTypeId,
        data: data.data || {},
        published: data.published ?? false,
      },
    });
  }

  /**
   * Clean up test data
   */
  async cleanup(tenantIds: string[]) {
    // Delete in correct order to respect foreign keys
    await this.prisma.contentEntry.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
    await this.prisma.collection.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
    await this.prisma.contentType.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
    await this.prisma.user.deleteMany({
      where: { tenantId: { in: tenantIds } },
    });
    await this.prisma.tenant.deleteMany({
      where: { id: { in: tenantIds } },
    });
  }
}


