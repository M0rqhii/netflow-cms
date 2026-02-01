
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { FeatureFlagsService } from '../feature-flags/feature-flags.service';
import type { SiteModuleConfigDto } from './dto';

@Injectable()
export class SiteModulesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async getConfig(siteId: string) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { settings: true, orgId: true },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    const settings = (site.settings as Record<string, any>) || {};
    const modulesConfig = settings.modulesConfig || {};

    return { modules: modulesConfig };
  }

  async updateConfig(siteId: string, dto: SiteModuleConfigDto) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { settings: true, orgId: true },
    });

    if (!site) {
      throw new NotFoundException(`Site with ID ${siteId} not found`);
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: site.orgId },
      select: { plan: true },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${site.orgId} not found`);
    }

    const planFeatures = this.featureFlags.getPlanFeatures(organization.plan);
    if (!planFeatures.includes(dto.moduleKey)) {
      throw new BadRequestException(`Module ${dto.moduleKey} is not available in plan ${organization.plan}`);
    }

    const settings = (site.settings as Record<string, any>) || {};
    const modulesConfig = settings.modulesConfig || {};

    const nextConfig = {
      ...modulesConfig,
      [dto.moduleKey]: {
        ...(modulesConfig[dto.moduleKey] || {}),
        ...(dto.config || {}),
      },
    };

    const updated = await this.prisma.site.update({
      where: { id: siteId },
      data: {
        settings: {
          ...(settings as Prisma.InputJsonObject),
          modulesConfig: nextConfig,
        },
      },
      select: { settings: true },
    });

    return {
      modules: (updated.settings as Record<string, any>)?.modulesConfig || {},
    };
  }
}
