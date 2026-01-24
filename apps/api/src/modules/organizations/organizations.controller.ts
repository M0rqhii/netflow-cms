import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Permission } from '../../common/auth/roles.enum';
import { OrgGuard } from '../../common/org-site/org.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';

const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  settings: z.record(z.unknown()).optional(),
});

type UpdateOrganizationDto = z.infer<typeof UpdateOrganizationSchema>;

@UseGuards(AuthGuard, OrgGuard, PermissionsGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':orgId')
  @Permissions(Permission.ORGANIZATIONS_READ)
  async getOrganization(
    @Param('orgId') orgId: string,
    @CurrentOrg() currentOrgId: string,
  ) {
    if (orgId !== currentOrgId) {
      throw new NotFoundException('Organization not found');
    }
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
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
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return {
      ...org,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  @Patch(':orgId')
  @Permissions(Permission.ORGANIZATIONS_WRITE)
  async updateOrganization(
    @Param('orgId') orgId: string,
    @CurrentOrg() currentOrgId: string,
    @Body(new ZodValidationPipe(UpdateOrganizationSchema)) dto: UpdateOrganizationDto,
  ) {
    if (orgId !== currentOrgId) {
      throw new NotFoundException('Organization not found');
    }

    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data: {
        name: dto.name,
        settings: dto.settings,
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

    return {
      ...org,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }
}
