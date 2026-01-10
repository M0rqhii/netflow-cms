import { Injectable, UnauthorizedException, ConflictException, NotFoundException, Inject, Logger } from '@nestjs/common';
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
    tenantId?: string; // Backward compatibility - deprecated
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

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
    // First try to find via UserOrg memberships
    try {
      // First find user by email
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
    } catch (error) {
      // If UserOrg table doesn't exist yet, fall back to legacy UserTenant
      this.logger.warn('UserOrg table not available, trying legacy UserTenant', error);
      try {
        const legacyMembership = await this.prisma.userTenant.findFirst({
          where: {
            userId: (await this.prisma.user.findFirst({ where: { email }, select: { id: true } }))?.id || '',
          },
        });
        if (legacyMembership) {
          const user = await this.prisma.user.findUnique({
            where: { id: legacyMembership.userId },
            select: {
              id: true,
              email: true,
              passwordHash: true,
              role: true,
              siteRole: true,
              platformRole: true,
              systemRole: true,
              isSuperAdmin: true,
              orgId: true,
            },
          });
          if (user) {
            return user;
          }
        }
      } catch (legacyError) {
        this.logger.warn('UserTenant table not available, using legacy model', legacyError);
      }
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

  async login(loginDto: LoginDto): Promise<AuthResponse & { refresh_token: string }> {
    // Support both orgId (new) and tenantId (backward compatibility)
    const orgId = loginDto.orgId || loginDto.tenantId;
    
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
      try {
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
      } catch (error) {
        // If UserOrg table doesn't exist yet, try legacy UserTenant
        this.logger.warn('UserOrg table not available, trying legacy UserTenant', error);
        try {
          const legacyCount = await this.prisma.userTenant.count({
            where: { userId: user.id },
          });
          if (legacyCount > 1) {
            isGlobalLogin = true;
            finalOrgId = undefined;
          } else if (legacyCount === 1) {
            const legacyMembership = await this.prisma.userTenant.findFirst({
              where: { userId: user.id },
              select: { tenantId: true },
            });
            finalOrgId = legacyMembership?.tenantId || user.orgId;
          }
        } catch (legacyError) {
          this.logger.warn('UserTenant table not available, using legacy model', legacyError);
        }
      }
    }

    // Get roles from user - use new fields if available, fall back to old role field
    const siteRole = user.siteRole || user.role || 'viewer';
    const platformRole = user.platformRole || (user.role === 'super_admin' ? 'admin' : 'user');
    const systemRole = user.systemRole || (user.role === 'super_admin' ? 'super_admin' : undefined);
    const isSuperAdmin = user.isSuperAdmin || user.role === 'super_admin' || user.systemRole === 'super_admin';

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: finalOrgId, // undefined for global token
      tenantId: finalOrgId, // Backward compatibility - map orgId to tenantId
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
        tenantId: finalOrgId || user.orgId, // Backward compatibility
      },
    };

    // Audit log: Global login
    await this.auditService.log({
      event: AuditEvent.GLOBAL_LOGIN,
      userId: user.id,
      tenantId: finalOrgId || null, // Backward compatibility - audit still uses tenantId
      metadata: {
        isGlobalLogin: isGlobalLogin,
        hasMultipleOrgs: isGlobalLogin && !finalOrgId,
      },
    });

    return response;
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse & { refresh_token: string }> {
    // Support both orgId (new) and tenantId (backward compatibility)
    const orgId = registerDto.orgId || registerDto.tenantId;
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
    // registerDto.role can only be 'tenant_admin', 'editor', or 'viewer'
    const role = registerDto.role || 'viewer';
    
    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        orgId,
        role,
        preferredLanguage: registerDto.preferredLanguage || 'en',
      },
    });

    // Get platform role from user
    // Regular users default to 'user' platform role
    const platformRole = 'user';

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
      tenantId: user.orgId, // Backward compatibility - map orgId to tenantId
      role: user.role,
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
        tenantId: user.orgId, // Backward compatibility
      },
    };

    // Audit log: User registration
    await this.auditService.log({
      event: AuditEvent.USER_INVITE, // Registration is similar to invite
      userId: user.id,
      tenantId: user.orgId, // Backward compatibility - audit still uses tenantId
      metadata: {
        role: user.role,
        action: 'register',
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
    const { sub, orgId, tenantId, role, jti } = decoded as JwtPayload & { jti: string };
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
    const siteRole = user.siteRole || decoded.siteRole || role || user.role || 'viewer';
    const platformRole = user.platformRole || decoded.platformRole || (user.role === 'super_admin' ? 'admin' : 'user');
    const systemRole = user.systemRole || decoded.systemRole || (user.role === 'super_admin' ? 'super_admin' : undefined);
    const isSuperAdmin = user.isSuperAdmin || decoded.isSuperAdmin || user.role === 'super_admin' || user.systemRole === 'super_admin';

    // Support both orgId (new) and tenantId (backward compatibility)
    const finalOrgId = orgId ?? tenantId ?? user.orgId;

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: finalOrgId,
      tenantId: finalOrgId, // Backward compatibility - map orgId to tenantId
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
      const { sub, tenantId, jti } = decoded as { sub: string; tenantId?: string; jti: string };
      if (sub && jti) {
        await this.cache.del(`refresh:${sub}:${jti}` as any);
        
        // Audit log: Global logout
        await this.auditService.log({
          event: AuditEvent.GLOBAL_LOGOUT,
          userId: sub,
          tenantId: tenantId || null,
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
    // Use UserOrg model for multi-org memberships
    try {
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
    } catch (error) {
      // If UserOrg table doesn't exist yet, try legacy UserTenant
      this.logger.warn('UserOrg table not available, trying legacy UserTenant', error);
      try {
        const legacyMemberships = await this.prisma.userTenant.findMany({
          where: { userId },
          select: {
            tenantId: true,
            role: true,
          },
          orderBy: { tenantId: 'asc' },
        });

        if (legacyMemberships.length > 0) {
          const tenantIds = legacyMemberships.map(m => m.tenantId);
          const tenants = await this.prisma.tenant.findMany({
            where: { id: { in: tenantIds } },
            select: { id: true, name: true, slug: true, plan: true },
          });
          const tenantMap = new Map(tenants.map(t => [t.id, t]));
          
          return legacyMemberships.map((m) => ({
            orgId: m.tenantId,
            role: m.role,
            organization: tenantMap.get(m.tenantId) || null,
          }));
        }
      } catch (legacyError) {
        this.logger.warn('UserTenant table not available, using legacy model', legacyError);
      }
    }

    // Fallback to legacy single-org relation (backward compatibility)
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

  // Backward compatibility alias
  async getUserTenants(userId: string) {
    const orgs = await this.getUserOrgs(userId);
    return orgs.map((org) => ({
      tenantId: org.orgId, // Map orgId to tenantId for backward compatibility
      role: org.role,
      tenant: org.organization, // Map organization to tenant for backward compatibility
    }));
  }

  async issueOrgToken(userId: string, orgId: string) {
    // Verify membership using UserOrg model
    let role: string | undefined = undefined;
    
    try {
      const membership = await this.prisma.userOrg.findUnique({
        where: { userId_orgId: { userId, orgId } },
        select: { role: true },
      });
      if (membership) {
        role = membership.role;
      }
    } catch (error) {
      // If UserOrg table doesn't exist yet, try legacy UserTenant
      this.logger.warn('UserOrg table not available, trying legacy UserTenant', error);
      try {
        const legacyMembership = await this.prisma.userTenant.findUnique({
          where: { userId_tenantId: { userId, tenantId: orgId } },
          select: { role: true },
        });
        if (legacyMembership) {
          role = legacyMembership.role;
        }
      } catch (legacyError) {
        this.logger.warn('UserTenant table not available, using legacy model', legacyError);
      }
    }

    if (!role) {
      // Fallback: allow if user's legacy orgId matches (backward compatibility)
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
    // Get platform role from user
    // For org-scoped token, we keep the platform role from the global token
    // Super admin gets platform_admin role, others default to user
    const platformRole = finalRole === 'super_admin' ? 'admin' : 'user';

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId,
      tenantId: orgId, // Backward compatibility - map orgId to tenantId
      role: finalRole,
      platformRole, // Platform role (platform_admin, org_owner, user)
    };
    // Org token has shorter expiration (1 hour vs 7 days for global token)
    const orgTokenExpiresIn = 60 * 60; // 1 hour in seconds
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: orgTokenExpiresIn }),
      expires_in: orgTokenExpiresIn,
    };
  }

  // Backward compatibility alias
  async issueTenantToken(userId: string, tenantId: string) {
    return this.issueOrgToken(userId, tenantId);
  }

  async resolveOrgForUser(userId: string, slug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, plan: true },
    });
    if (!organization) throw new NotFoundException('Organization not found');

    // Check membership via UserOrg model
    let isMember = false;
    try {
      const membership = await this.prisma.userOrg.findUnique({
        where: { userId_orgId: { userId, orgId: organization.id } },
        select: { role: true },
      });
      isMember = !!membership;
    } catch (error) {
      // If UserOrg table doesn't exist yet, try legacy UserTenant
      this.logger.warn('UserOrg table not available, trying legacy UserTenant', error);
      try {
        const legacyMembership = await this.prisma.userTenant.findUnique({
          where: { userId_tenantId: { userId, tenantId: organization.id } },
          select: { role: true },
        });
        isMember = !!legacyMembership;
      } catch (legacyError) {
        this.logger.warn('UserTenant table not available, using legacy model', legacyError);
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { orgId: true } });
        isMember = !!user && user.orgId === organization.id;
      }
    }
    
    if (!isMember) throw new UnauthorizedException('Not a member of this organization');

    return organization;
  }

  // Backward compatibility alias
  async resolveTenantForUser(userId: string, slug: string) {
    const org = await this.resolveOrgForUser(userId, slug);
    // Map organization to tenant structure for backward compatibility
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
    };
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
      tenantId: user.orgId, // Backward compatibility - map orgId to tenantId
      preferredLanguage: user.preferredLanguage || 'en',
    };
  }
}
