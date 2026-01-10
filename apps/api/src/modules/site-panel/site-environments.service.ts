import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma, EnvironmentType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateSiteEnvironmentDto } from './dto';

@Injectable()
export class SiteEnvironmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapType(type: string): EnvironmentType {
    return type === 'production' ? EnvironmentType.PRODUCTION : EnvironmentType.DRAFT;
  }

  private async ensureDefaults(tenantId: string): Promise<void> {
    const existing = await this.prisma.siteEnvironment.findMany({
      where: { siteId: tenantId },
      select: { type: true },
    });
    const haveDraft = existing.some((env) => env.type === EnvironmentType.DRAFT);
    const haveProduction = existing.some((env) => env.type === EnvironmentType.PRODUCTION);

    const createOps: Promise<unknown>[] = [];
    if (!haveDraft) {
      createOps.push(
        this.prisma.siteEnvironment.create({
          data: { siteId: tenantId, type: EnvironmentType.DRAFT },
        }),
      );
    }
    if (!haveProduction) {
      createOps.push(
        this.prisma.siteEnvironment.create({
          data: { siteId: tenantId, type: EnvironmentType.PRODUCTION },
        }),
      );
    }

    if (createOps.length) {
      await Promise.all(createOps);
    }
  }

  async list(tenantId: string) {
    await this.ensureDefaults(tenantId);
    return this.prisma.siteEnvironment.findMany({
      where: { siteId: tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateSiteEnvironmentDto) {
    const type = this.mapType(dto.type);
    try {
      return await this.prisma.siteEnvironment.create({
        data: { siteId: tenantId, type },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(`Environment '${dto.type}' already exists for this site.`);
      }
      throw error;
    }
  }

  async getById(tenantId: string, environmentId: string) {
    const env = await this.prisma.siteEnvironment.findFirst({
      where: { id: environmentId, siteId: tenantId },
    });
    if (!env) {
      throw new NotFoundException('Environment not found for this site');
    }
    return env;
  }

  async getByTypeOrCreate(tenantId: string, type: EnvironmentType) {
    const env = await this.prisma.siteEnvironment.findFirst({
      where: { siteId: tenantId, type },
    });
    if (env) return env;

    return this.prisma.siteEnvironment.create({
      data: { siteId: tenantId, type },
    });
  }
}
