import { Injectable, NotFoundException, ConflictException, BadRequestException, Optional, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService, AuditEvent } from '../../common/audit/audit.service';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AccountNotificationsService } from '../../common/notifications/account-notifications.service';
import {
  coercePublicRbacUserRoleKey,
  getPublicRbacUserRole,
  getPublicRbacUserRoleByName,
  type PublicRbacUserRoleDefinition,
  type PublicRbacUserRoleKey,
  type PublicRbacUserRoleScope,
} from '@repo/schemas';
import { RbacService } from '../rbac/rbac.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rbacService: RbacService,
    private readonly notifications: AccountNotificationsService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  private async resolvePublicRole(
    orgId: string,
    roleKey: string,
    scope: PublicRbacUserRoleScope,
  ): Promise<PublicRbacUserRoleDefinition & { id: string }> {
    const normalizedRoleKey = coercePublicRbacUserRoleKey(roleKey, scope) || roleKey;
    const definition = getPublicRbacUserRole(normalizedRoleKey);
    if (!definition || definition.scope !== scope) {
      throw new BadRequestException(`Invalid ${scope} role: ${roleKey}`);
    }

    await this.rbacService.getRoles(orgId, scope);

    const role = await this.prisma.role.findUnique({
      where: {
        orgId_name_scope: {
          orgId,
          name: definition.roleName,
          scope,
        },
      },
      select: { id: true },
    });

    if (!role) {
      throw new NotFoundException(`RBAC role not found: ${definition.roleName}`);
    }

    return { ...definition, id: role.id };
  }

  private getInviteTtlMs(): number {
    const ttlRaw =
      this.configService?.get<string>('INVITE_TTL_DAYS') ||
      process.env.INVITE_TTL_DAYS;
    const ttlDays = ttlRaw ? Number(ttlRaw) : 7;
    const safeDays = Number.isFinite(ttlDays) && ttlDays > 0 ? ttlDays : 7;
    return safeDays * 24 * 60 * 60 * 1000;
  }

  private buildInviteLink(token: string): string {
    const baseUrl =
      this.configService?.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/invite/${token}`;
  }

  private getPasswordSetupTtlMs(): number {
    const ttlRaw =
      this.configService?.get<string>('ACCOUNT_SETUP_TTL_HOURS') ||
      process.env.ACCOUNT_SETUP_TTL_HOURS;
    const ttlHours = ttlRaw ? Number(ttlRaw) : 48;
    const safeHours = Number.isFinite(ttlHours) && ttlHours > 0 ? ttlHours : 48;
    return safeHours * 60 * 60 * 1000;
  }

  private buildPasswordSetupLink(token: string): string {
    const baseUrl =
      this.configService?.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000';
    return `${baseUrl.replace(/\/$/, '')}/reset-password?token=${encodeURIComponent(token)}`;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async createPasswordSetupToken(
    userId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const passwordTokenModel = (this.prisma as any).passwordActionToken;
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.getPasswordSetupTtlMs());

    await passwordTokenModel.updateMany({
      where: {
        userId,
        purpose: 'account_setup',
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await passwordTokenModel.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        purpose: 'account_setup',
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  private async ensureSiteInOrg(orgId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: { id: siteId, orgId },
      select: { id: true, name: true, slug: true, orgId: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    return site;
  }

  private serializeOrgUser(user: {
    id: string;
    email: string;
    createdAt: Date;
    roleAssignments?: Array<{ role: { name: string } }>;
    membershipRole?: string | null;
  }) {
    const roleName = user.roleAssignments?.[0]?.role.name;
    const roleKey =
      (roleName ? getPublicRbacUserRoleByName(roleName, 'ORG')?.key : undefined) ||
      (user.membershipRole
        ? coercePublicRbacUserRoleKey(user.membershipRole, 'ORG') || undefined
        : undefined) ||
      'org_member';

    return {
      id: user.id,
      email: user.email,
      role: roleKey,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private serializeSiteUser(user: {
    id: string;
    email: string;
    createdAt: Date;
    roleAssignments: Array<{ role: { name: string } }>;
  }) {
    const roleName = user.roleAssignments[0]?.role.name;
    const roleKey = roleName ? getPublicRbacUserRoleByName(roleName, 'SITE')?.key : undefined;

    if (!roleKey) {
      throw new BadRequestException('Invalid site assignment state');
    }

    return {
      id: user.id,
      email: user.email,
      role: roleKey,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async getPrimaryOrgRoleKey(orgId: string, userId: string): Promise<PublicRbacUserRoleKey> {
    const assignment = await this.prisma.userRole.findFirst({
      where: {
        orgId,
        userId,
        siteId: null,
        role: {
          scope: 'ORG',
        },
      },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!assignment) {
      return 'org_member';
    }

    return getPublicRbacUserRoleByName(assignment.role.name, 'ORG')?.key || 'org_member';
  }

  private async syncCompatibilityForOrgRole(orgId: string, userId: string, roleKey: PublicRbacUserRoleKey) {
    const role = getPublicRbacUserRole(roleKey);
    if (!role || role.scope !== 'ORG') return;

    await this.prisma.userOrg.upsert({
      where: { userId_orgId: { userId, orgId } },
      update: { role: role.key },
      create: { userId, orgId, role: role.key },
    });
  }

  private async syncCompatibilityForSiteRole(orgId: string, userId: string, roleKey: PublicRbacUserRoleKey) {
    const siteRole = getPublicRbacUserRole(roleKey);
    if (!siteRole || siteRole.scope !== 'SITE') return;

    const orgRoleKey = await this.getPrimaryOrgRoleKey(orgId, userId);

    await this.prisma.userOrg.upsert({
      where: { userId_orgId: { userId, orgId } },
      update: { role: orgRoleKey },
      create: { userId, orgId, role: orgRoleKey },
    });
  }

  async getCurrentUser(userId: string) {
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
            plan: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      preferredLanguage: user.preferredLanguage || 'en',
    };
  }

  async listUsers(orgId: string, siteId?: string) {
    if (siteId) {
      await this.ensureSiteInOrg(orgId, siteId);

      const assignments = await this.prisma.userRole.findMany({
        where: {
          orgId,
          siteId,
          role: {
            scope: 'SITE',
          },
        },
        include: {
          role: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      const assignedUserIds = [...new Set(assignments.map((assignment) => assignment.userId))];
      const assignedUsers = assignedUserIds.length
        ? await this.prisma.user.findMany({
            where: {
              id: { in: assignedUserIds },
              orgId,
            },
            select: {
              id: true,
              email: true,
              createdAt: true,
            },
          })
        : [];
      const userMap = new Map(assignedUsers.map((user) => [user.id, user]));

      const users = new Map<string, { id: string; email: string; createdAt: Date; roleAssignments: Array<{ role: { name: string } }> }>();
      for (const assignment of assignments) {
        const assignedUser = userMap.get(assignment.userId);
        if (assignedUser && !users.has(assignment.userId)) {
          users.set(assignment.userId, {
            id: assignedUser.id,
            email: assignedUser.email,
            createdAt: assignedUser.createdAt,
            roleAssignments: [{ role: { name: assignment.role.name } }],
          });
        }
      }

      return Array.from(users.values()).map((user) => this.serializeSiteUser(user));
    }

    const memberships = await this.prisma.userOrg.findMany({
      where: { orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    const orgAssignments = await this.prisma.userRole.findMany({
      where: {
        orgId,
        siteId: null,
        role: {
          scope: 'ORG',
        },
      },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    const assignmentMap = new Map<string, string>();
    for (const assignment of orgAssignments) {
      if (!assignmentMap.has(assignment.userId)) {
        assignmentMap.set(
          assignment.userId,
          getPublicRbacUserRoleByName(assignment.role.name, 'ORG')?.key || 'org_member',
        );
      }
    }

    return memberships.map((membership) =>
      this.serializeOrgUser({
        id: membership.user.id,
        email: membership.user.email,
        createdAt: membership.user.createdAt,
        membershipRole: assignmentMap.get(membership.user.id) || membership.role,
      }),
    );
  }

  async listInvites(orgId: string, siteId?: string) {
    if (siteId) {
      await this.ensureSiteInOrg(orgId, siteId);
    }

    const now = new Date();
    const where: any = {
      orgId,
      status: 'pending',
      expiresAt: { gt: now },
    };
    if (siteId) {
      where.siteId = siteId;
    }

    const invites = await this.prisma.userInvite.findMany({
      where,
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        siteId: true,
        createdAt: true,
        expiresAt: true,
        site: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return invites.map((invite) => ({
      ...invite,
      role: coercePublicRbacUserRoleKey(invite.role, invite.siteId ? 'SITE' : 'ORG') || invite.role,
    }));
  }

  async getUserById(userId: string, orgId: string, siteId?: string) {
    if (siteId) {
      await this.ensureSiteInOrg(orgId, siteId);

      const assignment = await this.prisma.userRole.findFirst({
        where: {
          orgId,
          userId,
          siteId,
          role: {
            scope: 'SITE',
          },
        },
        include: {
          role: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!assignment) {
        throw new NotFoundException('User not found');
      }
      const assignedUser = await this.prisma.user.findFirst({
        where: {
          id: assignment.userId,
          orgId,
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      });

      if (!assignedUser) {
        throw new NotFoundException('User not found');
      }

      return this.serializeSiteUser({
        id: assignedUser.id,
        email: assignedUser.email,
        createdAt: assignedUser.createdAt,
        roleAssignments: [{ role: { name: assignment.role.name } }],
      });
    }

    const membership = await this.prisma.userOrg.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            createdAt: true,
          },
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('User not found');
    }
    const orgAssignment = await this.prisma.userRole.findFirst({
      where: {
        orgId,
        userId,
        siteId: null,
        role: {
          scope: 'ORG',
        },
      },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return this.serializeOrgUser({
      id: membership.user.id,
      email: membership.user.email,
      createdAt: membership.user.createdAt,
      membershipRole:
        (orgAssignment
          ? getPublicRbacUserRoleByName(orgAssignment.role.name, 'ORG')?.key
          : undefined) || membership.role,
    });
  }

  async updatePreferences(userId: string, preferences: { preferredLanguage?: 'pl' | 'en' }) {
    const updateData: { preferredLanguage?: string; languageChosenAt?: Date } = {};

    if (preferences.preferredLanguage !== undefined) {
      updateData.preferredLanguage = preferences.preferredLanguage;
      updateData.languageChosenAt = new Date();
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        preferredLanguage: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      preferredLanguage: user.preferredLanguage || 'en',
    };
  }

  async createUser(
    orgId: string,
    dto: { email: string; password?: string; role: string; preferredLanguage?: 'pl' | 'en'; siteId?: string },
    siteId?: string,
    actorUserId?: string,
  ) {
    const email = dto.email.trim().toLowerCase();
    const resolvedSiteId = dto.siteId || siteId || undefined;
    const roleScope: PublicRbacUserRoleScope = resolvedSiteId ? 'SITE' : 'ORG';
    const publicRole = await this.resolvePublicRole(orgId, dto.role, roleScope);

    const existingUser = await this.prisma.user.findUnique({
      where: {
        orgId_email: {
          orgId,
          email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    let site: { id: string; name: string } | null = null;
    if (resolvedSiteId) {
      site = await this.prisma.site.findFirst({
        where: { id: resolvedSiteId, orgId },
        select: { id: true, name: true },
      });
      if (!site) {
        throw new NotFoundException('Site not found in this organization');
      }
    }

    const rawPassword =
      typeof dto.password === 'string' && dto.password.trim().length >= 8
        ? dto.password
        : randomBytes(24).toString('base64url');
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        orgId,
        preferredLanguage: dto.preferredLanguage || 'en',
        languageChosenAt: null,
        mustCompleteOnboarding: true,
        mustChangePassword: true,
      },
      select: {
        id: true,
      },
    });

    if (publicRole.scope === 'ORG') {
      await this.rbacService.createAssignment(
        orgId,
        { userId: user.id, roleId: publicRole.id, siteId: null },
        actorUserId || user.id,
      );
      await this.syncCompatibilityForOrgRole(orgId, user.id, publicRole.key);
    } else if (site) {
      await this.rbacService.createAssignment(
        orgId,
        { userId: user.id, roleId: publicRole.id, siteId: site.id },
        actorUserId || user.id,
      );
      await this.syncCompatibilityForSiteRole(orgId, user.id, publicRole.key);
    }

    let setupEmailSent = false;
    try {
      const setupToken = await this.createPasswordSetupToken(user.id);
      await this.notifications.sendAccountCreatedEmail({
        to: email,
        organizationName: organization.name,
        role: publicRole.roleName,
        setupUrl: this.buildPasswordSetupLink(setupToken.token),
        expiresAt: setupToken.expiresAt,
      });
      setupEmailSent = true;
    } catch (error) {
      this.logger.error(
        `Failed to send account setup email for ${email}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return {
      ...(resolvedSiteId
        ? await this.getUserById(user.id, orgId, resolvedSiteId)
        : await this.getUserById(user.id, orgId)),
      setupEmailSent,
    };
  }

  async createInvite(
    orgId: string,
    siteId: string | undefined,
    dto: { email: string; role: string },
    invitedById: string,
  ) {
    let site: { id: string; name: string; slug: string; orgId: string } | null = null;
    if (siteId) {
      site = await this.ensureSiteInOrg(orgId, siteId);
    }

    const email = dto.email.trim().toLowerCase();
    const roleScope: PublicRbacUserRoleScope = siteId ? 'SITE' : 'ORG';
    const publicRole = await this.resolvePublicRole(orgId, dto.role, roleScope);
    const role = publicRole.key;

    const existingUser = await this.prisma.user.findUnique({
      where: {
        orgId_email: {
          orgId,
          email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const duplicateWhere: any = {
      orgId,
      email,
      status: 'pending',
      expiresAt: { gt: new Date() },
    };
    if (siteId) {
      duplicateWhere.siteId = siteId;
    } else {
      duplicateWhere.siteId = null;
    }

    const existingInvite = await this.prisma.userInvite.findFirst({
      where: duplicateWhere,
      select: { id: true },
    });

    if (existingInvite) {
      throw new ConflictException('Invite already sent for this email');
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.getInviteTtlMs());

    const invite = await this.prisma.userInvite.create({
      data: {
        orgId,
        siteId: siteId || null,
        email,
        role,
        token,
        status: 'pending',
        invitedById,
        expiresAt,
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        siteId: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true },
    });

    const inviteLink = this.buildInviteLink(token);
    let emailSent = false;
    try {
      await this.notifications.sendInviteEmail({
        to: email,
        organizationName: organization?.name || 'Net-Flow',
        siteName: site?.name || null,
        role: publicRole.roleName,
        inviteUrl: inviteLink,
        expiresAt,
      });
      emailSent = true;
    } catch (error) {
      this.logger.error(
        `Failed to send invite email for ${email}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (this.auditService) {
      await this.auditService.log({
        event: AuditEvent.USER_INVITE,
        userId: invitedById,
        orgId,
        siteId: siteId || undefined,
        metadata: {
          inviteId: invite.id,
          email,
          role,
          action: 'create',
        },
      });
    }

    return {
      ...invite,
      emailSent,
    };
  }

  async updateUserRole(
    userId: string,
    orgId: string,
    newRole: string,
    siteId?: string,
    actorUserId?: string,
  ) {
    const scope: PublicRbacUserRoleScope = siteId ? 'SITE' : 'ORG';
    const publicRole = await this.resolvePublicRole(orgId, newRole, scope);

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        orgId,
      },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (publicRole.scope === 'ORG') {
      await this.prisma.userRole.deleteMany({
        where: {
          orgId,
          userId,
          siteId: null,
          role: {
            scope: 'ORG',
          },
        },
      });

      await this.rbacService.createAssignment(
        orgId,
        { userId, roleId: publicRole.id, siteId: null },
        actorUserId || userId,
      );
      await this.syncCompatibilityForOrgRole(orgId, userId, publicRole.key);

      return this.getUserById(userId, orgId);
    }

    if (!siteId) {
      throw new BadRequestException('Site role update requires siteId');
    }

    await this.ensureSiteInOrg(orgId, siteId);
    await this.prisma.userRole.deleteMany({
      where: {
        orgId,
        userId,
        siteId,
        role: {
          scope: 'SITE',
        },
      },
    });

    await this.rbacService.createAssignment(
      orgId,
      { userId, roleId: publicRole.id, siteId },
      actorUserId || userId,
    );
    await this.syncCompatibilityForSiteRole(orgId, userId, publicRole.key);

    return this.getUserById(userId, orgId, siteId);
  }

  async revokeInvite(
    orgId: string,
    siteId: string | undefined,
    inviteId: string,
    revokedById: string,
  ) {
    if (siteId) {
      await this.ensureSiteInOrg(orgId, siteId);
    }
    const where: any = { id: inviteId, orgId };
    if (siteId) {
      where.siteId = siteId;
    }
    const invite = await this.prisma.userInvite.findFirst({
      where,
      select: { id: true, email: true, role: true, siteId: true },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    await this.prisma.userInvite.update({
      where: { id: inviteId },
      data: { status: 'revoked' },
    });

    if (this.auditService) {
      await this.auditService.log({
        event: AuditEvent.USER_INVITE,
        userId: revokedById,
        orgId,
        siteId: siteId || invite.siteId || undefined,
        metadata: {
          inviteId,
          email: invite.email,
          role: invite.role,
          action: 'revoke',
        },
      });
    }
  }
}
