import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException, Inject, Optional, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Role } from '../../common/auth/roles.enum';
import { AuditService, AuditEvent } from '../../common/audit/audit.service';
import { Mailer } from '../../common/providers/interfaces';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

/**
 * UsersService - business logic for user management
 * AI Note: Handles user operations with proper authorization checks
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('Mailer') private readonly mailer?: Mailer,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly auditService?: AuditService,
  ) {}

  private normalizeInviteRole(role: string): string {
    const normalized = role === 'site_admin' ? Role.ORG_ADMIN : role;
    const allowed = [Role.ORG_ADMIN, Role.EDITOR, Role.VIEWER];
    if (!allowed.includes(normalized as Role)) {
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
    // Only org admins (org_admin role) and super_admin can list users
    if (
      requestingUserRole !== Role.ORG_ADMIN &&
      requestingUserRole !== Role.SUPER_ADMIN
    ) {
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
    // Only org admins (org_admin role) and super_admin can view user details
    if (
      requestingUserRole !== Role.ORG_ADMIN &&
      requestingUserRole !== Role.SUPER_ADMIN
    ) {
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
    const updateData: { preferredLanguage?: string } = {};
    
    if (preferences.preferredLanguage !== undefined) {
      updateData.preferredLanguage = preferences.preferredLanguage;
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
    dto: { email: string; password: string; role: string; preferredLanguage?: 'pl' | 'en' },
    requestingUserRole: string,
  ) {
    // Only org admins (org_admin role) and super_admin can create users
    if (
      requestingUserRole !== Role.ORG_ADMIN &&
      requestingUserRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Insufficient permissions to create users');
    }

    const normalizedRole = dto.role === 'site_admin' ? Role.ORG_ADMIN : dto.role;

    // Security: Only super_admin can create super_admin users
    if (normalizedRole === Role.SUPER_ADMIN && requestingUserRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only super_admin can create super_admin users');
    }

    // Validate role
    const validRoles = [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.EDITOR, Role.VIEWER];
    if (!validRoles.includes(normalizedRole as Role)) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    const siteRole = normalizedRole === Role.ORG_ADMIN ? 'admin' : normalizedRole === Role.EDITOR ? 'editor' : 'viewer';
    const platformRole = normalizedRole === Role.SUPER_ADMIN || normalizedRole === Role.ORG_ADMIN ? 'admin' : 'user';
    const isSuperAdmin = normalizedRole === Role.SUPER_ADMIN;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: {
        orgId_email: {
          orgId: orgId,
          email: dto.email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        orgId: orgId,
        role: normalizedRole,
        siteRole,
        platformRole,
        isSuperAdmin,
        preferredLanguage: dto.preferredLanguage || 'en',
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

    return user;
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
    const subject = `You're invited to ${organization?.name || 'an organization'} on Netflow CMS`;
    const body = [
      `You've been invited to join ${organization?.name || 'an organization'} on Netflow CMS.`,
      site?.name ? `Site: ${site.name}` : undefined,
      '',
      `Accept your invite: ${inviteLink}`,
      '',
      `This invite expires on ${expiresAt.toISOString()}.`,
    ]
      .filter(Boolean)
      .join('\n');

    if (this.mailer) {
      await this.mailer.sendEmail({
        to: email,
        subject,
        body,
        metadata: {
          orgId,
          siteId,
          inviteId: invite.id,
          orgSlug: organization?.slug,
          siteSlug: site?.slug,
        },
      });
    } else {
      this.logger.warn(`Mailer not configured; invite email for ${email} not sent`);
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

    return invite;
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
    // Only org admins (org_admin role) and super_admin can update user roles
    if (
      requestingUserRole !== Role.ORG_ADMIN &&
      requestingUserRole !== Role.SUPER_ADMIN
    ) {
      throw new ForbiddenException('Insufficient permissions to update user roles');
    }

    const normalizedRole = newRole === 'site_admin' ? Role.ORG_ADMIN : newRole;

    // Security: Only super_admin can assign super_admin role
    if (normalizedRole === Role.SUPER_ADMIN && requestingUserRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only super_admin can assign super_admin role');
    }

    // Validate role
    const validRoles = [Role.SUPER_ADMIN, Role.ORG_ADMIN, Role.EDITOR, Role.VIEWER];
    if (!validRoles.includes(normalizedRole as Role)) {
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
    if (user.role === Role.SUPER_ADMIN && newRole !== Role.SUPER_ADMIN) {
      // Check if this is the last super_admin in the organization
      const superAdminCount = await this.prisma.user.count({
        where: {
          orgId: orgId,
          role: Role.SUPER_ADMIN,
        },
      });

      if (superAdminCount === 1) {
        throw new BadRequestException('Cannot remove the last super_admin from organization');
      }
    }

    const siteRole = normalizedRole === Role.ORG_ADMIN ? 'admin' : normalizedRole === Role.EDITOR ? 'editor' : 'viewer';
    const platformRole = normalizedRole === Role.SUPER_ADMIN || normalizedRole === Role.ORG_ADMIN ? 'admin' : 'user';
    const isSuperAdmin = normalizedRole === Role.SUPER_ADMIN;

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


