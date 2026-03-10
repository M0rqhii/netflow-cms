import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { CurrentUser, type CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RbacService } from './rbac.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';

const createPlatformAssignmentSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
});

@UseGuards(AuthGuard)
@Controller('platform/rbac')
export class PlatformRbacController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
  ) {}

  @Get('users')
  async getPlatformUsers(@CurrentUser() user: CurrentUserPayload) {
    await this.assertCanManagePlatform(user.id);

    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        orgId: true,
        preferredLanguage: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  @Get('capabilities')
  async getCapabilities(@CurrentUser() user: CurrentUserPayload) {
    await this.assertCanManagePlatform(user.id);
    return this.rbacService.getPlatformCapabilities();
  }

  @Get('roles')
  async getRoles(@CurrentUser() user: CurrentUserPayload) {
    await this.assertCanManagePlatform(user.id);
    return this.rbacService.getPlatformRoles();
  }

  @Get('assignments')
  async getAssignments(
    @CurrentUser() user: CurrentUserPayload,
    @Query('userId') userId?: string,
  ) {
    await this.assertCanManagePlatform(user.id);
    return this.rbacService.getPlatformAssignments(userId);
  }

  @Post('assignments')
  async createAssignment(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(createPlatformAssignmentSchema))
    dto: z.infer<typeof createPlatformAssignmentSchema>,
  ) {
    await this.assertCanManagePlatform(user.id);
    return this.rbacService.createPlatformAssignment(dto.userId, dto.roleId);
  }

  @Delete('assignments/:assignmentId')
  @HttpCode(HttpStatus.OK)
  async deleteAssignment(
    @CurrentUser() user: CurrentUserPayload,
    @Param('assignmentId') assignmentId: string,
  ) {
    await this.assertCanManagePlatform(user.id);
    return this.rbacService.deletePlatformAssignment(assignmentId);
  }

  @Get('effective')
  async getEffective(
    @CurrentUser() user: CurrentUserPayload,
    @Query('userId') userId?: string,
  ) {
    const resolvedUserId = userId && userId.length > 0 ? userId : user.id;
    if (resolvedUserId !== user.id) {
      await this.assertCanManagePlatform(user.id);
    }

    return this.rbacService.getEffectivePlatformCapabilities(resolvedUserId);
  }

  private async assertCanManagePlatform(userId: string) {
    const canManage = await this.rbacService.hasPlatformManagementAccess(userId);
    if (!canManage) {
      throw new ForbiddenException('Platform role management requires Platform Admin or Platform Root');
    }
  }
}
