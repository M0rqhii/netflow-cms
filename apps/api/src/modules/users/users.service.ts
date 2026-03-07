import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException, Optional, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService, AuditEvent } from '../../common/audit/audit.service';
import { randomBytes, createHash } from 'crypto';
import * as bcrypt from 'bcrypt';
import { AccountNotificationsService } from '../../common/notifications/account-notifications.service';

/**
 * Legacy role values for backward compatibility with database
 * These match the values stored in the 'role' column
 */
const LegacyRole = {
  SUPER_ADMIN: 'super_admin',
  ORG_ADMIN: 'org_admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

/** Accepts both legacy (org_admin) and new (admin/owner) role values */
function isAdminRole(role?: string): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return [
    LegacyRole.SUPER_ADMIN,
    LegacyRole.ORG_ADMIN,
    'admin',
    'owner',
    'platform_admin',
  ].includes(normalized);
}

/**
 * UsersService - business logic for user management
 * AI Note: Handles user operations with proper authorization checks
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: AccountNotificationsService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  private normalizeInviteRole(role: string): string {
    const aliasMap: Record<string, string> = {
      'site_admin': LegacyRole.ORG_ADMIN,
      'admin': LegacyRole.ORG_ADMIN,
      'organization_admin': LegacyRole.ORG_ADMIN,
    };
    const normalized = aliasMap[role] || role;
    const allowed: string[] = [
      LegacyRole.ORG_ADMIN,
      'editor-in-chief',
      LegacyRole.EDITOR,
      'marketing',
      LegacyRole.VIEWER,
    ];
    if (!allowed.includes(normalized)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${allowed.join(', ')}`);
    }
    return normalized;
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

  /**
   * Get current user information
   */
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
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

  /**
   * List users in an organization (only for admins)
   */
  async listUsers(orgId: string, requestingUserRole: string) {
    if (!isAdminRole(requestingUserRole)) {
      throw new ForbiddenException('Insufficient permissions to list users');
    }

    const users = await this.prisma.user.findMany({
      where: { orgId: orgId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  /**
   * List pending invites for a site (admin only)
   */
  async listInvites(orgId: string, siteId: string) {
    await this.ensureSiteInOrg(orgId, siteId);
    const now = new Date();
    return this.prisma.userInvite.findMany({
      where: {
        orgId,
        siteId,
        status: 'pending',
        expiresAt: { gt: now },
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user by ID (only for admins)
   */
  async getUserById(userId: string, orgId: string, requestingUserRole: string) {
    if (!isAdminRole(requestingUserRole)) {
      throw new ForbiddenException('Insufficient permissions to view user');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        orgId: orgId, // Ensure user belongs to the same organization
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user preferences (language, etc.)
   */
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

  /**
   * Create a new user (admin only)
   * Security: Only super_admin can create super_admin users
   */
  async createUser(
    orgId: string,
    dto: { email: string; password?: string; role: string; preferredLanguage?: 'pl' | 'en' },
    requestingUserRole: string,
  ) {
    if (!isAdminRole(requestingUserRole)) {
      throw new ForbiddenException('Insufficient permissions to create users');
    }

    const aliasMap: Record<string, string> = {
      'site_admin': LegacyRole.ORG_ADMIN,
      'admin': LegacyRole.ORG_ADMIN,
      'organization_admin': LegacyRole.ORG_ADMIN,
    };
    const normalizedRole = aliasMap[dto.role] || dto.role;
    const email = dto.email.trim().toLowerCase();

    // Security: Only super_admin can create super_admin users
    if (normalizedRole === LegacyRole.SUPER_ADMIN && requestingUserRole !== LegacyRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super_admin can create super_admin users');
    }

    // Validate role
    const validRoles: string[] = [
      LegacyRole.SUPER_ADMIN, LegacyRole.ORG_ADMIN,
      'editor-in-chief', LegacyRole.EDITOR, 'marketing', LegacyRole.VIEWER,
    ];
    if (!validRoles.includes(normalizedRole)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const siteRoleMap: Record<string, string> = {
      [LegacyRole.SUPER_ADMIN]: 'owner',
      [LegacyRole.ORG_ADMIN]: 'admin',
      'editor-in-chief': 'editor-in-chief',
      [LegacyRole.EDITOR]: 'editor',
      'marketing': 'marketing',
      [LegacyRole.VIEWER]: 'viewer',
    };
    const siteRole = siteRoleMap[normalizedRole] || 'viewer';
    const platformRole = normalizedRole === LegacyRole.SUPER_ADMIN || normalizedRole === LegacyRole.ORG_ADMIN ? 'admin' : 'user';
    const isSuperAdmin = normalizedRole === LegacyRole.SUPER_ADMIN;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: {
        orgId_email: {
          orgId: orgId,
          email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if organization exists
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

    const rawPassword =
      typeof dto.password === 'string' && dto.password.trim().length >= 8
        ? dto.password
        : randomBytes(24).toString('base64url');
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        orgId: orgId,
        role: normalizedRole,
        siteRole,
        platformRole,
        isSuperAdmin,
        preferredLanguage: dto.preferredLanguage || 'en',
        languageChosenAt: null,
        mustCompleteOnboarding: true,
        mustChangePassword: true,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.userOrg.upsert({
      where: { userId_orgId: { userId: user.id, orgId } },
      update: { role: normalizedRole },
      create: { userId: user.id, orgId, role: normalizedRole },
    });

    let setupEmailSent = false;
    try {
      const setupToken = await this.createPasswordSetupToken(user.id);
      await this.notifications.sendAccountCreatedEmail({
        to: user.email,
        organizationName: organization.name,
        role: normalizedRole,
        setupUrl: this.buildPasswordSetupLink(setupToken.token),
        expiresAt: setupToken.expiresAt,
      });
      setupEmailSent = true;
    } catch (error) {
      this.logger.error(
        `Failed to send account setup email for ${user.email}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return {
      ...user,
      setupEmailSent,
    };
  }

  /**
   * Create a new invite for a user (admin only)
   */
  async createInvite(
    orgId: string,
    siteId: string,
    dto: { email: string; role: string },
    invitedById: string,
  ) {
    const site = await this.ensureSiteInOrg(orgId, siteId);
    const email = dto.email.trim().toLowerCase();
    const role = this.normalizeInviteRole(dto.role);

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

    const existingInvite = await this.prisma.userInvite.findFirst({
      where: {
        orgId,
        siteId,
        email,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
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
        siteId,
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
        createdAt: true,
        expiresAt: true,
      },
    });

    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, slug: true },
    });

    const inviteLink = this.buildInviteLink(token);
    let emailSent = false;
    try {
      await this.notifications.sendInviteEmail({
        to: email,
        organizationName: organization?.name || 'Net-Flow',
        siteName: site?.name || null,
        role,
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
        siteId,
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

  /**
   * Update user role (admin only)
   * Security: Only super_admin can assign super_admin role
   */
  async updateUserRole(
    userId: string,
    orgId: string,
    newRole: string,
    requestingUserRole: string,
  ) {
    if (!isAdminRole(requestingUserRole)) {
      throw new ForbiddenException('Insufficient permissions to update user roles');
    }

    const aliasMap: Record<string, string> = {
      'site_admin': LegacyRole.ORG_ADMIN,
      'admin': LegacyRole.ORG_ADMIN,
      'organization_admin': LegacyRole.ORG_ADMIN,
    };
    const normalizedRole = aliasMap[newRole] || newRole;

    // Security: Only super_admin can assign super_admin role
    if (normalizedRole === LegacyRole.SUPER_ADMIN && requestingUserRole !== LegacyRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super_admin can assign super_admin role');
    }

    // Validate role
    const validRoles: string[] = [
      LegacyRole.SUPER_ADMIN, LegacyRole.ORG_ADMIN,
      'editor-in-chief', LegacyRole.EDITOR, 'marketing', LegacyRole.VIEWER,
    ];
    if (!validRoles.includes(normalizedRole)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    // Check if user exists and belongs to organization
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        orgId: orgId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent self-demotion of last super_admin (optional safety check)
    if (user.role === LegacyRole.SUPER_ADMIN && newRole !== LegacyRole.SUPER_ADMIN) {
      // Check if this is the last super_admin in the organization
      const superAdminCount = await this.prisma.user.count({
        where: {
          orgId: orgId,
          role: LegacyRole.SUPER_ADMIN,
        },
      });

      if (superAdminCount === 1) {
        throw new BadRequestException('Cannot remove the last super_admin from organization');
      }
    }

    const siteRoleMap: Record<string, string> = {
      [LegacyRole.SUPER_ADMIN]: 'owner',
      [LegacyRole.ORG_ADMIN]: 'admin',
      'editor-in-chief': 'editor-in-chief',
      [LegacyRole.EDITOR]: 'editor',
      'marketing': 'marketing',
      [LegacyRole.VIEWER]: 'viewer',
    };
    const siteRole = siteRoleMap[normalizedRole] || 'viewer';
    const platformRole = normalizedRole === LegacyRole.SUPER_ADMIN || normalizedRole === LegacyRole.ORG_ADMIN ? 'admin' : 'user';
    const isSuperAdmin = normalizedRole === LegacyRole.SUPER_ADMIN;

    // Update user role
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: normalizedRole, siteRole, platformRole, isSuperAdmin },
      select: {
        id: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    await this.prisma.userOrg.upsert({
      where: { userId_orgId: { userId, orgId } },
      update: { role: normalizedRole },
      create: { userId, orgId, role: normalizedRole },
    });

    return updatedUser;
  }

  /**
   * Revoke a pending invite (admin only)
   */
  async revokeInvite(
    orgId: string,
    siteId: string,
    inviteId: string,
    revokedById: string,
  ) {
    await this.ensureSiteInOrg(orgId, siteId);
    const invite = await this.prisma.userInvite.findFirst({
      where: { id: inviteId, orgId, siteId },
      select: { id: true, email: true, role: true },
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
        siteId,
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
