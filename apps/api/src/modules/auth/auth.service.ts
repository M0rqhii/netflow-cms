import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../../common/auth/strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { randomUUID } from 'crypto';
import { AuditService, AuditEvent } from '../../common/audit/audit.service';

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    orgId: string; // Organization ID
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private auditService: AuditService,
  ) {}

  /**
   * Helper method to find user by email with fallback logic
   * Optimized: Uses select to limit fields returned
   */
  private async findUserByEmail(email: string, orgId?: string) {
    if (orgId) {
      // Organization-scoped login
      return await this.prisma.user.findUnique({
        where: {
          orgId_email: {
            orgId,
            email,
          },
        },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          role: true, // Backward compatibility
          siteRole: true,
          platformRole: true,
          systemRole: true,
          isSuperAdmin: true,
          orgId: true,
        },
      });
    }

    // Global login: find user by email (check all organizations)
    const userByEmail = await this.prisma.user.findFirst({
      where: { email },
      select: { id: true },
    });

    if (!userByEmail) {
      return null;
    }

    const membership = await this.prisma.userOrg.findFirst({
      where: {
        userId: userByEmail.id,
      },
      select: {
        user: {
          select: {
            id: true,
            email: true,
            passwordHash: true,
            role: true, // Backward compatibility
            siteRole: true,
            platformRole: true,
            systemRole: true,
            isSuperAdmin: true,
            orgId: true,
          },
        },
      },
    });
    if (membership?.user) {
      return membership.user;
    }
    
    // Fallback: find by email in User table
    // Optimized: Use select to limit fields
    const users = await this.prisma.user.findMany({
      where: { email },
      take: 1,
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true, // Backward compatibility
        siteRole: true,
        platformRole: true,
        systemRole: true,
        isSuperAdmin: true,
        orgId: true,
      },
    });
    return users[0] || null;
  }

  async validateUser(email: string, password: string, orgId?: string) {
    const user = await this.findUserByEmail(email, orgId);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    const { passwordHash: _, ...result } = user;
    return result;
  }

  private async issueAccessToken(payload: JwtPayload): Promise<string> {
    return this.jwtService.sign(payload);
  }

  private async issueRefreshToken(payload: JwtPayload): Promise<string> {
    const refreshSecret =
      this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
      this.configService.get<string>('JWT_SECRET');
    if (!refreshSecret) throw new Error('Missing REFRESH_TOKEN_SECRET/JWT_SECRET');
    const refreshExpires = this.configService.get<string | number>('REFRESH_TOKEN_EXPIRES_IN') || 60 * 60 * 24 * 7;
    const jti = randomUUID();
    // Whitelist jti in Redis with TTL
    const ttlSec = typeof refreshExpires === 'string' ? parseInt(refreshExpires as string, 10) : (refreshExpires as number);
    await this.cache.set(`refresh:${payload.sub}:${jti}`, '1', ttlSec);
    return this.jwtService.sign(payload, { secret: refreshSecret, expiresIn: ttlSec, jwtid: jti });
  }

  private mapRoleToSiteRole(role?: string): string {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'org_admin') return 'admin';
    if (normalized === 'super_admin') return 'owner';
    if (normalized === 'editor') return 'editor';
    if (normalized === 'viewer') return 'viewer';
    return 'viewer';
  }

  private mapRoleToPlatformRole(role?: string): string {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'super_admin') return 'admin';
    if (normalized === 'org_admin') return 'admin';
    return 'user';
  }

  async login(loginDto: LoginDto): Promise<AuthResponse & { refresh_token: string }> {
    const orgId = loginDto.orgId;
    
    const user = await this.validateUser(
      loginDto.email,
      loginDto.password,
      orgId,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // For global login (no orgId), check if user has multi-org memberships
    let isGlobalLogin = !orgId;
    let finalOrgId: string | undefined = user.orgId;
    
    if (isGlobalLogin) {
      const membershipCount = await this.prisma.userOrg.count({
        where: { userId: user.id },
      });

      // If user has multiple memberships, issue global token (no orgId)
      if (membershipCount > 1) {
        isGlobalLogin = true;
        finalOrgId = undefined;
      } else if (membershipCount === 1) {
        // Single membership - get the orgId from membership
        const membership = await this.prisma.userOrg.findFirst({
          where: { userId: user.id },
          select: { orgId: true },
        });
        finalOrgId = membership?.orgId || user.orgId;
      }
    }

    // Get roles from user - use new fields if available, fall back to old role field
    const siteRole = user.siteRole || this.mapRoleToSiteRole(user.role);
    const platformRole = user.platformRole || this.mapRoleToPlatformRole(user.role);
    const systemRole = user.systemRole || (user.role === 'super_admin' ? 'super_admin' : undefined);
    const isSuperAdmin = user.isSuperAdmin || user.role === 'super_admin' || user.systemRole === 'super_admin';

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: finalOrgId, // undefined for global token
      role: user.role, // Backward compatibility
      siteRole: siteRole !== user.role ? siteRole : undefined,
      platformRole,
      systemRole,
      isSuperAdmin,
    };

    const response = {
      access_token: await this.issueAccessToken(payload),
      refresh_token: await this.issueRefreshToken(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: finalOrgId || user.orgId, // Return orgId
      },
    };

    // Audit log: Global login
    await this.auditService.log({
      event: AuditEvent.GLOBAL_LOGIN,
      userId: user.id,
      metadata: {
        isGlobalLogin: isGlobalLogin,
        hasMultipleOrgs: isGlobalLogin && !finalOrgId,
      },
    });

    return response;
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse & { refresh_token: string }> {
    const orgId = registerDto.orgId;
    if (!orgId) {
      throw new ConflictException('Organization ID is required');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: {
        orgId_email: {
          orgId,
          email: registerDto.email,
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
      throw new ConflictException('Organization does not exist');
    }

    // Security: super_admin role is not allowed in registration schema
    // Only existing super_admin can create new super_admin users via admin endpoint
    // registerDto.role can only be 'org_admin', 'editor', or 'viewer'
    const role = registerDto.role || 'viewer';
    const siteRole = this.mapRoleToSiteRole(role);
    const platformRole = this.mapRoleToPlatformRole(role);
    
    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        orgId,
        role,
        siteRole,
        platformRole,
        preferredLanguage: registerDto.preferredLanguage || 'en',
      },
    });

    await this.prisma.userOrg.upsert({
      where: { userId_orgId: { userId: user.id, orgId } },
      update: { role },
      create: { userId: user.id, orgId, role },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
      role: user.role,
      siteRole,
      platformRole, // Platform role (platform_admin, org_owner, user)
    };

    const response = {
      access_token: await this.issueAccessToken(payload),
      refresh_token: await this.issueRefreshToken(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      },
    };

    // Audit log: User registration
    await this.auditService.log({
      event: AuditEvent.USER_INVITE, // Registration is similar to invite
      userId: user.id,
      metadata: {
        role: user.role,
        action: 'register',
      },
    });

    return response;
  }

  /**
   * Get invite details by token (public)
   */
  async getInviteDetails(token: string) {
    const invite = await this.prisma.userInvite.findFirst({
      where: {
        token,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        expiresAt: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
        site: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invite not found or expired');
    }

    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      organization: invite.organization,
      site: invite.site,
    };
  }

  /**
   * Accept invite and create user
   */
  async acceptInvite(dto: { token: string; password: string; preferredLanguage?: 'pl' | 'en' }): Promise<AuthResponse & { refresh_token: string }> {
    const invite = await this.prisma.userInvite.findFirst({
      where: {
        token: dto.token,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        email: true,
        role: true,
        orgId: true,
        siteId: true,
      },
    });

    if (!invite) {
      throw new BadRequestException('Invite token is invalid or expired');
    }

    if (invite.role === 'super_admin') {
      throw new BadRequestException('Invite role is not allowed');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: {
        orgId_email: {
          orgId: invite.orgId,
          email: invite.email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const role = invite.role === 'site_admin' ? 'org_admin' : invite.role || 'viewer';
    const siteRole = this.mapRoleToSiteRole(role);
    const platformRole = this.mapRoleToPlatformRole(role);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: invite.email,
        passwordHash,
        orgId: invite.orgId,
        role,
        siteRole,
        platformRole,
        preferredLanguage: dto.preferredLanguage || 'en',
      },
    });

    await this.prisma.userOrg.upsert({
      where: { userId_orgId: { userId: user.id, orgId: invite.orgId } },
      update: { role },
      create: { userId: user.id, orgId: invite.orgId, role },
    });

    await this.prisma.userInvite.update({
      where: { id: invite.id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
      role: user.role,
      siteRole,
      platformRole,
    };

    const response = {
      access_token: await this.issueAccessToken(payload),
      refresh_token: await this.issueRefreshToken(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
      },
    };

    await this.auditService.log({
      event: AuditEvent.USER_INVITE,
      userId: user.id,
      orgId: invite.orgId,
      siteId: invite.siteId || undefined,
      metadata: {
        inviteId: invite.id,
        action: 'accept',
      },
    });

    return response;
  }

  async refresh(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    const refreshSecret =
      this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
      this.configService.get<string>('JWT_SECRET');
    if (!refreshSecret) throw new Error('Missing REFRESH_TOKEN_SECRET/JWT_SECRET');

    let decoded: any;
    try {
      decoded = this.jwtService.verify(refreshToken, { secret: refreshSecret });
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const { sub, orgId, role, jti } = decoded as JwtPayload & { jti: string };
    if (!jti) throw new UnauthorizedException('Invalid refresh token');

    const key = `refresh:${sub}:${jti}`;
    const exists = await this.cache.get<string | null>(key);
    if (!exists) throw new UnauthorizedException('Refresh token revoked or expired');

    // rotate: delete old jti, issue new
    await this.cache.del(key as any);

    // ensure user still exists and active
    const user = await this.prisma.user.findUnique({ 
      where: { id: sub }, 
      select: { 
        id: true, 
        email: true, 
        role: true, // Backward compatibility
        siteRole: true,
        platformRole: true,
        systemRole: true,
        isSuperAdmin: true,
        orgId: true 
      } 
    });
    if (!user) throw new UnauthorizedException('User not found');

    // Use values from database (most up-to-date) or fall back to token payload
    const siteRole = user.siteRole || decoded.siteRole || this.mapRoleToSiteRole(role ?? user.role);
    const platformRole = user.platformRole || decoded.platformRole || this.mapRoleToPlatformRole(user.role);
    const systemRole = user.systemRole || decoded.systemRole || (user.role === 'super_admin' ? 'super_admin' : undefined);
    const isSuperAdmin = user.isSuperAdmin || decoded.isSuperAdmin || user.role === 'super_admin' || user.systemRole === 'super_admin';

    const finalOrgId = orgId ?? user.orgId;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: finalOrgId,
      role: role ?? user.role, // Backward compatibility
      siteRole: siteRole !== user.role ? siteRole : undefined,
      platformRole,
      systemRole,
      isSuperAdmin,
    };
    const access_token = await this.issueAccessToken(payload);
    const refresh_token = await this.issueRefreshToken(payload);
    return { access_token, refresh_token };
  }

  async logout(refreshToken: string): Promise<void> {
    const refreshSecret =
      this.configService.get<string>('REFRESH_TOKEN_SECRET') ||
      this.configService.get<string>('JWT_SECRET');
    if (!refreshSecret) throw new Error('Missing REFRESH_TOKEN_SECRET/JWT_SECRET');
    try {
      const decoded: any = this.jwtService.verify(refreshToken, { secret: refreshSecret });
      const { sub, jti } = decoded as { sub: string; jti: string };
      if (sub && jti) {
        await this.cache.del(`refresh:${sub}:${jti}` as any);
        
        // Audit log: Global logout
        await this.auditService.log({
          event: AuditEvent.GLOBAL_LOGOUT,
          userId: sub,
          metadata: {
            action: 'logout',
          },
        });
      }
    } catch {
      // swallow errors to make logout idempotent
    }
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        orgId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getUserOrgs(userId: string) {
    const memberships = await this.prisma.userOrg.findMany({
      where: { userId },
      select: {
        orgId: true,
        role: true,
        organization: { select: { id: true, name: true, slug: true, plan: true } },
      },
      orderBy: { orgId: 'asc' },
    });

    if (memberships.length > 0) {
      return memberships.map((m) => ({
        orgId: m.orgId,
        role: m.role,
        organization: m.organization,
      }));
    }

    // Fallback to legacy single-org relation (still used by some accounts)
    const legacy = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        orgId: true,
        organization: { select: { id: true, name: true, slug: true, plan: true } },
      },
    });
    if (!legacy?.orgId) return [];
    return [
      {
        orgId: legacy.orgId,
        role: legacy.role,
        organization: legacy.organization,
      },
    ];
  }

  async issueOrgToken(userId: string, orgId: string) {
    const membership = await this.prisma.userOrg.findUnique({
      where: { userId_orgId: { userId, orgId } },
      select: { role: true },
    });

    let role = membership?.role;
    if (!role) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { orgId: true, role: true, email: true },
      });
      if (!user || user.orgId !== orgId) {
        throw new UnauthorizedException('Not a member of this organization');
      }
      role = user.role;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const finalRole = role ?? 'viewer';
    const platformRole = this.mapRoleToPlatformRole(finalRole);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId,
      role: finalRole,
      platformRole,
    };
    const orgTokenExpiresIn = 60 * 60;
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: orgTokenExpiresIn }),
      expires_in: orgTokenExpiresIn,
    };
  }

  async issueSiteToken(userId: string, siteId: string) {
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      select: { id: true, orgId: true, name: true },
    });

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    const membership = await this.prisma.userOrg.findUnique({
      where: { userId_orgId: { userId, orgId: site.orgId } },
      select: { role: true },
    });

    let role = membership?.role;
    if (!role) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { orgId: true, role: true, email: true },
      });
      if (!user || user.orgId !== site.orgId) {
        throw new UnauthorizedException('Not a member of the organization that owns this site');
      }
      role = user.role;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const finalRole = role ?? 'viewer';
    const platformRole = this.mapRoleToPlatformRole(finalRole);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: site.orgId,
      siteId: site.id,
      role: finalRole,
      platformRole,
    };
    const siteTokenExpiresIn = 60 * 60;
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: siteTokenExpiresIn }),
      expires_in: siteTokenExpiresIn,
    };
  }

  async resolveOrgForUser(userId: string, slug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, plan: true },
    });
    if (!organization) throw new NotFoundException('Organization not found');

    const membership = await this.prisma.userOrg.findUnique({
      where: { userId_orgId: { userId, orgId: organization.id } },
      select: { role: true },
    });

    if (!membership) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { orgId: true },
      });
      if (!user || user.orgId !== organization.id) {
        throw new UnauthorizedException('Not a member of this organization');
      }
    }

    return organization;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        orgId: true,
        preferredLanguage: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      preferredLanguage: user.preferredLanguage || 'en',
    };
  }
}
