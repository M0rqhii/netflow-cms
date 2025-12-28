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
    tenantId: string;
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
  private async findUserByEmail(email: string, tenantId?: string) {
    if (tenantId) {
      // Legacy: tenant-scoped login
      return await this.prisma.user.findUnique({
        where: {
          tenantId_email: {
            tenantId,
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
          tenantId: true,
        },
      });
    }

    // Global login: find user by email (check all tenants)
    // First try to find via UserTenant memberships
    try {
      const membership = await this.prisma.userTenant.findFirst({
        where: {
          user: { email },
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
              tenantId: true,
            },
          },
        },
      });
      if (membership?.user) {
        return membership.user;
      }
    } catch (error) {
      // If UserTenant table doesn't exist yet, fall back to legacy
      this.logger.warn('UserTenant table not available, using legacy model', error);
    }
    
    // Fallback: find by email in User table (legacy single-tenant)
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
        tenantId: true,
      },
    });
    return users[0] || null;
  }

  async validateUser(email: string, password: string, tenantId?: string) {
    const user = await this.findUserByEmail(email, tenantId);

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
    const user = await this.validateUser(
      loginDto.email,
      loginDto.password,
      loginDto.tenantId,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // For global login (no tenantId), check if user has multi-tenant memberships
    let isGlobalLogin = !loginDto.tenantId;
    let finalTenantId: string | undefined = user.tenantId;
    
    if (isGlobalLogin) {
      try {
        const membershipCount = await this.prisma.userTenant.count({
          where: { userId: user.id },
        });
        
        // If user has multiple memberships, issue global token (no tenantId)
        if (membershipCount > 1) {
          isGlobalLogin = true;
          finalTenantId = undefined;
        } else if (membershipCount === 1) {
          // Single membership - get the tenantId from membership
          const membership = await this.prisma.userTenant.findFirst({
            where: { userId: user.id },
            select: { tenantId: true },
          });
          finalTenantId = membership?.tenantId || user.tenantId;
        }
      } catch (error) {
        // If UserTenant table doesn't exist yet, use legacy tenantId
        this.logger.warn('UserTenant table not available, using legacy model', error);
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
      tenantId: finalTenantId, // undefined for global token
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
        tenantId: finalTenantId || user.tenantId, // Return tenantId for backward compatibility
      },
    };

    // Audit log: Global login
    await this.auditService.log({
      event: AuditEvent.GLOBAL_LOGIN,
      userId: user.id,
      tenantId: finalTenantId || null,
      metadata: {
        isGlobalLogin: isGlobalLogin,
        hasMultipleTenants: isGlobalLogin && !finalTenantId,
      },
    });

    return response;
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse & { refresh_token: string }> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: registerDto.tenantId,
          email: registerDto.email,
        },
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Check if tenant exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: registerDto.tenantId },
    });

    if (!tenant) {
      throw new ConflictException('Tenant does not exist');
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
        tenantId: registerDto.tenantId,
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
      tenantId: user.tenantId,
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
        tenantId: user.tenantId,
      },
    };

    // Audit log: User registration
    await this.auditService.log({
      event: AuditEvent.USER_INVITE, // Registration is similar to invite
      userId: user.id,
      tenantId: user.tenantId,
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
    const { sub, tenantId, role, jti } = decoded as JwtPayload & { jti: string };
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
        tenantId: true 
      } 
    });
    if (!user) throw new UnauthorizedException('User not found');

    // Use values from database (most up-to-date) or fall back to token payload
    const siteRole = user.siteRole || decoded.siteRole || role || user.role || 'viewer';
    const platformRole = user.platformRole || decoded.platformRole || (user.role === 'super_admin' ? 'admin' : 'user');
    const systemRole = user.systemRole || decoded.systemRole || (user.role === 'super_admin' ? 'super_admin' : undefined);
    const isSuperAdmin = user.isSuperAdmin || decoded.isSuperAdmin || user.role === 'super_admin' || user.systemRole === 'super_admin';

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: tenantId ?? user.tenantId,
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
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getUserTenants(userId: string) {
    // Use UserTenant model for multi-tenant memberships
    try {
      const memberships = await this.prisma.userTenant.findMany({
        where: { userId },
        select: {
          tenantId: true,
          role: true,
          tenant: { select: { id: true, name: true, slug: true, plan: true } },
        },
        orderBy: { tenantId: 'asc' },
      });

      if (memberships.length > 0) {
        return memberships.map((m: { tenantId: string; role: string; tenant: any }) => ({
          tenantId: m.tenantId,
          role: m.role,
          tenant: m.tenant,
        }));
      }
    } catch (error) {
      // If UserTenant table doesn't exist yet, fall back to legacy
      this.logger.warn('UserTenant table not available, using legacy model', error);
    }

    // Fallback to legacy single-tenant relation (backward compatibility)
    const legacy = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        tenantId: true,
        tenant: { select: { id: true, name: true, slug: true, plan: true } },
      },
    });
    if (!legacy?.tenantId) return [];
    return [
      {
        tenantId: legacy.tenantId,
        role: legacy.role,
        tenant: legacy.tenant,
      },
    ];
  }

  async issueTenantToken(userId: string, tenantId: string) {
    // Verify membership using UserTenant model
    let role: string | undefined = undefined;
    
    try {
      const membership = await this.prisma.userTenant.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
        select: { role: true },
      });
      if (membership) {
        role = membership.role;
      }
    } catch (error) {
      // If UserTenant table doesn't exist yet, fall back to legacy
      this.logger.warn('UserTenant table not available, using legacy model', error);
    }

    if (!role) {
      // Fallback: allow if user's legacy tenantId matches (backward compatibility)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true, role: true, email: true },
      });
      if (!user || user.tenantId !== tenantId) {
        throw new UnauthorizedException('Not a member of this tenant');
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
    // For tenant-scoped token, we keep the platform role from the global token
    // Super admin gets platform_admin role, others default to user
    const platformRole = finalRole === 'super_admin' ? 'admin' : 'user';

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId,
      role: finalRole,
      platformRole, // Platform role (platform_admin, org_owner, user)
    };
    // Tenant token has shorter expiration (1 hour vs 7 days for global token)
    const tenantTokenExpiresIn = 60 * 60; // 1 hour in seconds
    return {
      access_token: this.jwtService.sign(payload, { expiresIn: tenantTokenExpiresIn }),
      expires_in: tenantTokenExpiresIn,
    };
  }

  async resolveTenantForUser(userId: string, slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
      select: { id: true, name: true, slug: true, plan: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Check membership via UserTenant model
    let isMember = false;
    try {
      const membership = await this.prisma.userTenant.findUnique({
        where: { userId_tenantId: { userId, tenantId: tenant.id } },
        select: { role: true },
      });
      isMember = !!membership;
    } catch (error) {
      // If UserTenant table doesn't exist yet, fall back to legacy
      this.logger.warn('UserTenant table not available, using legacy model', error);
      const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
      isMember = !!user && user.tenantId === tenant.id;
    }
    
    if (!isMember) throw new UnauthorizedException('Not a member of this tenant');

    return tenant;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        tenantId: true,
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
      tenantId: user.tenantId,
      preferredLanguage: user.preferredLanguage || 'en',
    };
  }
}
