import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

/**
 * TenantsService - business logic for tenant management
 * AI Note: Handles CRUD operations for tenants (only for super_admin)
 */
@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new tenant
   */
  async create(createTenantDto: CreateTenantDto) {
    // Check if slug already exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: createTenantDto.slug },
    });

    if (existingTenant) {
      throw new ConflictException(`Tenant with slug "${createTenantDto.slug}" already exists`);
    }

    return this.prisma.tenant.create({
      data: {
        name: createTenantDto.name,
        slug: createTenantDto.slug,
        plan: createTenantDto.plan,
        settings: (createTenantDto.settings || {}) as any, // Prisma Json type
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Get all tenants (with pagination)
   */
  async findAll(page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;
    const take = Math.min(pageSize, 100); // Max 100 per page

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip,
        take,
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          settings: true,
          createdAt: true,
          updatedAt: true,
          // Tenant doesn't have _count relations
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count(),
    ]);

    return {
      data: tenants,
      pagination: {
        page,
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Get tenant by ID
   */
  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        // Tenant doesn't have _count relations
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }

    return tenant;
  }

  /**
   * Get tenant by slug
   */
  async findBySlug(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with slug "${slug}" not found`);
    }

    return tenant;
  }

  /**
   * Update tenant
   */
  async update(id: string, updateTenantDto: UpdateTenantDto) {
    // Check if tenant exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }

    // If slug is being updated, check if it's already taken
    if (updateTenantDto.slug && updateTenantDto.slug !== existingTenant.slug) {
      const slugTaken = await this.prisma.tenant.findUnique({
        where: { slug: updateTenantDto.slug },
      });

      if (slugTaken) {
        throw new ConflictException(`Tenant with slug "${updateTenantDto.slug}" already exists`);
      }
    }

    // Merge settings if provided
    let settings: Record<string, any> | undefined = undefined;
    if (updateTenantDto.settings !== undefined) {
      const existingSettings = existingTenant.settings && 
        typeof existingTenant.settings === 'object' && 
        !Array.isArray(existingTenant.settings) &&
        existingTenant.settings !== null
        ? existingTenant.settings as Record<string, any>
        : {};
      settings = { ...existingSettings, ...updateTenantDto.settings };
    }

    return this.prisma.tenant.update({
      where: { id },
      data: {
        ...(updateTenantDto.name && { name: updateTenantDto.name }),
        ...(updateTenantDto.slug && { slug: updateTenantDto.slug }),
        ...(updateTenantDto.plan && { plan: updateTenantDto.plan }),
        ...(settings !== undefined && { settings: settings as any }), // Prisma Json type
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Delete tenant
   */
  async remove(id: string) {
    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant with ID "${id}" not found`);
    }

    // Delete tenant (cascade will delete all related data)
    await this.prisma.tenant.delete({
      where: { id },
    });

    return { message: `Tenant "${tenant.name}" has been deleted successfully` };
  }
}
