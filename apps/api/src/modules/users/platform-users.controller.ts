import {
  BadRequestException,
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { OrgRolesGuard } from '../../common/auth/guards/platform-roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { OrgRoles } from '../../common/auth/decorators/platform-roles.decorator';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { OrgRole, Permission } from '../../common/auth/roles.enum';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RbacService } from '../rbac/rbac.service';
import * as bcrypt from 'bcrypt';
import { z } from 'zod';

const createPlatformUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be at most 128 characters'),
  preferredLanguage: z.enum(['pl', 'en']).optional().default('en'),
});

const updatePlatformUserSchema = z.object({
  preferredLanguage: z.enum(['pl', 'en']).optional(),
});

type PlatformUserRecord = {
  id: string;
  email: string;
  orgId: string;
  preferredLanguage: string | null;
  createdAt: Date;
  updatedAt: Date;
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
};

@UseGuards(AuthGuard, OrgRolesGuard, PermissionsGuard)
@Controller('platform/users')
export class PlatformUsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
  ) {}

  @Get()
  @OrgRoles(OrgRole.ADMIN, OrgRole.OWNER)
  @Permissions(Permission.USERS_READ)
  async listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    const skip = (page - 1) * pageSize;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: pageSize,
        select: {
          id: true,
          email: true,
          orgId: true,
          preferredLanguage: true,
          createdAt: true,
          updatedAt: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    const data = await this.serializeUsers(users);

    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  @Get(':id')
  @OrgRoles(OrgRole.ADMIN, OrgRole.OWNER)
  @Permissions(Permission.USERS_READ)
  async getUserById(@Param('id') userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        orgId: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.serializeUser(user, await this.rbacService.getPlatformRoleNames(user.id));
  }

  @Post()
  @OrgRoles(OrgRole.ADMIN, OrgRole.OWNER)
  @Permissions(Permission.USERS_WRITE)
  async createUser(
    @Body(new ZodValidationPipe(createPlatformUserSchema)) dto: z.infer<typeof createPlatformUserSchema>,
  ) {
    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    let organization = await this.prisma.organization.findFirst({
      where: { slug: 'platform-users' },
      select: { id: true },
    });

    if (!organization) {
      organization = await this.prisma.organization.create({
        data: {
          name: 'Platform Users',
          slug: 'platform-users',
          plan: 'enterprise',
          settings: {},
        },
        select: { id: true },
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        orgId: organization.id,
        preferredLanguage: dto.preferredLanguage || 'en',
      },
      select: {
        id: true,
        email: true,
        orgId: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    await this.prisma.userOrg.upsert({
      where: { userId_orgId: { userId: user.id, orgId: organization.id } },
      update: { role: 'org_member' },
      create: { userId: user.id, orgId: organization.id, role: 'org_member' },
    });

    return this.serializeUser(user, []);
  }

  @Patch(':id')
  @OrgRoles(OrgRole.ADMIN, OrgRole.OWNER)
  @Permissions(Permission.USERS_WRITE)
  async updateUser(
    @Param('id') userId: string,
    @Body(new ZodValidationPipe(updatePlatformUserSchema)) dto: z.infer<typeof updatePlatformUserSchema>,
  ) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferredLanguage: dto.preferredLanguage,
      },
      select: {
        id: true,
        email: true,
        orgId: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return this.serializeUser(updatedUser, await this.rbacService.getPlatformRoleNames(updatedUser.id));
  }

  @Delete(':id')
  @OrgRoles(OrgRole.ADMIN, OrgRole.OWNER)
  @Permissions(Permission.USERS_DELETE)
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param('id') userId: string,
    @CurrentUser() user: { id: string },
  ) {
    if (userId === user.id) {
      throw new BadRequestException('Cannot delete yourself');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const roleNames = await this.rbacService.getPlatformRoleNames(userId);
    if (roleNames.includes('Platform Root')) {
      const rootAssignments = await this.prisma.platformUserRole.count({
        where: {
          role: {
            name: 'Platform Root',
          },
        },
      });

      if (rootAssignments <= 1) {
        throw new BadRequestException('Cannot delete the last Platform Root user');
      }
    }

    await this.prisma.platformUserRole.deleteMany({
      where: { userId },
    });

    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }

  private async serializeUsers(users: PlatformUserRecord[]) {
    const roleMap = await this.getPlatformRoleMap(users.map((user) => user.id));
    return users.map((user) => this.serializeUser(user, roleMap.get(user.id) ?? []));
  }

  private async getPlatformRoleMap(userIds: string[]) {
    if (userIds.length === 0) {
      return new Map<string, string[]>();
    }

    const assignments = await this.prisma.platformUserRole.findMany({
      where: {
        userId: { in: userIds },
      },
      select: {
        userId: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    const roleMap = new Map<string, string[]>();
    for (const assignment of assignments) {
      const current = roleMap.get(assignment.userId) ?? [];
      current.push(assignment.role.name);
      roleMap.set(assignment.userId, current);
    }

    for (const userId of userIds) {
      roleMap.set(userId, (roleMap.get(userId) ?? []).sort());
    }

    return roleMap;
  }

  private serializeUser(user: PlatformUserRecord, platformRbacRoles: string[]) {
    return {
      id: user.id,
      email: user.email,
      orgId: user.orgId,
      preferredLanguage: user.preferredLanguage || 'en',
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      organization: user.organization || undefined,
      platformRbacRoles,
    };
  }
}
