import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException, Inject, Optional, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto, LoginTwoFactorDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from '../../common/auth/strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { randomBytes, randomInt, randomUUID, createHash } from 'crypto';
import { AuditService, AuditEvent } from '../../common/audit/audit.service';
import { Mailer } from '../../common/providers/interfaces';
import { isPlatformAdminValue, isPlatformPowerUser } from '../../common/auth/platform-admin.util';
import { AccountNotificationsService } from '../../common/notifications/account-notifications.service';

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    email: string;
    role: string;
    orgId: string; // Organization ID
    preferredLanguage?: 'pl' | 'en';
    onboardingRequired?: boolean;
    mustChangePassword?: boolean;
    onboardingCompletedAt?: string | null;
    languageChosen?: boolean;
  };
}

type TwoFactorMethod = 'auth_app' | 'email';
type TwoFactorCodeDelivery = 'email' | 'none';

export interface TwoFactorChallengeResponse {
  requiresTwoFactor: true;
  twoFactorToken: string;
  twoFactorMethod: TwoFactorMethod;
  codeDelivery: TwoFactorCodeDelivery;
  expiresInSeconds: number;
}

type LoginSuccessResponse = AuthResponse & { refresh_token: string };
export type LoginResponse = LoginSuccessResponse | TwoFactorChallengeResponse;

type TwoFactorChallengePayload = {
  userId: string;
  email: string;
  role: string;
  baseOrgId: string;
  finalOrgId?: string;
  siteRole: string;
  platformRole: string;
  systemRole?: string;
  isSuperAdmin: boolean;
  isGlobalLogin: boolean;
  twoFactorMethod: TwoFactorMethod;
  codeDelivery: TwoFactorCodeDelivery;
  oneTimeCode?: string;
};

type PasswordActionPurpose = 'reset_password' | 'account_setup';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private auditService: AuditService,
    private readonly notifications: AccountNotificationsService,
    @Optional() @Inject('Mailer') private readonly mailer?: Mailer,
  ) {}

  private asJsonObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private normalizeVerificationCode(value: string): string {
    return value.trim().toUpperCase();
  }

  private readTwoFactorSettings(rawBillingInfo: unknown): {
    enabled: boolean;
    method: TwoFactorMethod;
    recoveryCodes: string[];
  } {
    const rawBilling = this.asJsonObject(rawBillingInfo);
    const rawSecurity = this.asJsonObject(rawBilling.security);
    const method: TwoFactorMethod = rawSecurity.twoFactorMethod === 'email' ? 'email' : 'auth_app';
    const recoveryCodes = Array.isArray(rawSecurity.recoveryCodes)
      ? rawSecurity.recoveryCodes
          .filter((code): code is string => typeof code === 'string' && code.trim().length > 0)
          .map((code) => this.normalizeVerificationCode(code))
      : [];

    return {
      enabled: Boolean(rawSecurity.twoFactorEnabled),
      method,
      recoveryCodes,
    };
  }

  private getTwoFactorChallengeTtlSeconds(): number {
    const raw = this.configService.get<string | number>('LOGIN_2FA_TTL_SECONDS');
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 60 && parsed <= 900) {
      return Math.round(parsed);
    }
    return 300;
  }

  private getTwoFactorChallengeCacheKey(token: string): string {
    return `auth:2fa:challenge:${token}`;
  }

  private async getTwoFactorChallenge(token: string): Promise<TwoFactorChallengePayload | null> {
    const raw = await this.cache.get<string | TwoFactorChallengePayload>(this.getTwoFactorChallengeCacheKey(token));
    if (!raw) return null;

    if (typeof raw === 'string') {
      try {
        return JSON.parse(raw) as TwoFactorChallengePayload;
      } catch {
        return null;
      }
    }

    return raw as TwoFactorChallengePayload;
  }

  private async sendTwoFactorEmailCode(email: string, code: string, ttlSeconds: number): Promise<boolean> {
    if (!this.mailer) {
      return false;
    }

    await this.mailer.sendEmail({
      to: email,
      subject: 'Your Net-Flow CMS verification code',
      body: `<p>Your verification code is <strong>${code}</strong>.</p><p>This code expires in ${Math.max(
        1,
        Math.floor(ttlSeconds / 60),
      )} minute(s).</p>`,
      metadata: {
        category: 'auth_2fa_login',
      },
    });

    return true;
  }

  private getPasswordResetTtlMs(): number {
    const raw = this.configService.get<string | number>('PASSWORD_RESET_TTL_MINUTES');
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 5 && parsed <= 240) {
      return Math.round(parsed) * 60 * 1000;
    }
    return 30 * 60 * 1000;
  }

  private getBaseFrontendUrl(): string {
    return (
      this.configService.get<string>('FRONTEND_URL') ||
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000'
    ).replace(/\/$/, '');
  }

  private buildPasswordResetLink(token: string): string {
    return `${this.getBaseFrontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  }

  private hashActionToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private passwordTokenModel() {
    return (this.prisma as any).passwordActionToken;
  }

  private async createPasswordActionToken(
    userId: string,
    purpose: PasswordActionPurpose,
    ttlMs: number,
  ): Promise<{ token: string; expiresAt: Date }> {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + ttlMs);
    const model = this.passwordTokenModel();

    await model.updateMany({
      where: {
        userId,
        purpose,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await model.create({
      data: {
        userId,
        tokenHash: this.hashActionToken(token),
        purpose,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  private async getPasswordActionTokenRecord(token: string): Promise<{
    id: string;
    userId: string;
    purpose: PasswordActionPurpose;
    usedAt: Date | null;
    expiresAt: Date;
  } | null> {
    const tokenHash = this.hashActionToken(token);
    const model = this.passwordTokenModel();
    const record = await model.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        purpose: true,
        usedAt: true,
        expiresAt: true,
      },
    });

    if (!record) {
      return null;
    }

    return record;
  }

  private async consumePasswordActionToken(token: string): Promise<{
    userId: string;
    purpose: PasswordActionPurpose;
  }> {
    const record = await this.getPasswordActionTokenRecord(token);
    if (!record) {
      throw new BadRequestException('Token is invalid or expired');
    }

    if (record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Token is invalid or expired');
    }

    const model = this.passwordTokenModel();
    const consumed = await model.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (!consumed?.count) {
      throw new BadRequestException('Token is invalid or expired');
    }

    return {
      userId: record.userId,
      purpose: record.purpose,
    };
  }

  private getOnboardingState(user: {
    preferredLanguage?: string | null;
    languageChosenAt?: Date | null;
    mustCompleteOnboarding?: boolean | null;
    onboardingCompletedAt?: Date | null;
    mustChangePassword?: boolean | null;
  }): {
    preferredLanguage: 'pl' | 'en';
    onboardingRequired: boolean;
    mustChangePassword: boolean;
    onboardingCompletedAt: string | null;
    languageChosen: boolean;
  } {
    const preferredLanguage =
      user.preferredLanguage === 'pl' ? 'pl' : 'en';
    const languageChosen = Boolean(user.languageChosenAt);
    const mustChangePassword = Boolean(user.mustChangePassword);
    const mustCompleteOnboarding = Boolean(user.mustCompleteOnboarding);
    const onboardingRequired =
      mustChangePassword || mustCompleteOnboarding || !languageChosen;

    return {
      preferredLanguage,
      onboardingRequired,
      mustChangePassword,
      onboardingCompletedAt: user.onboardingCompletedAt
        ? user.onboardingCompletedAt.toISOString()
        : null,
      languageChosen,
    };
  }

  private async hasMatchingRecoveryCode(userId: string, providedCode: string): Promise<boolean> {
    const normalized = this.normalizeVerificationCode(providedCode);
    if (!normalized) {
      return false;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, billingInfo: true },
    });
    if (!user) {
      return false;
    }

    const settings = this.readTwoFactorSettings(user.billingInfo);
    return settings.recoveryCodes.includes(normalized);
  }

  private async buildLoginResponse(params: {
    userId: string;
    email: string;
    role: string;
    finalOrgId?: string;
    baseOrgId: string;
    siteRole: string;
    platformRole: string;
    systemRole?: string;
    isSuperAdmin: boolean;
    preferredLanguage?: string | null;
    languageChosenAt?: Date | null;
    mustCompleteOnboarding?: boolean | null;
    onboardingCompletedAt?: Date | null;
    mustChangePassword?: boolean | null;
  }): Promise<LoginSuccessResponse> {
    const payload: JwtPayload = {
      sub: params.userId,
      email: params.email,
      orgId: params.finalOrgId,
      role: params.role, // Backward compatibility
      siteRole: params.siteRole !== params.role ? params.siteRole : undefined,
      platformRole: params.platformRole,
      systemRole: params.systemRole,
      isSuperAdmin: params.isSuperAdmin,
    };

    const onboarding = this.getOnboardingState({
      preferredLanguage: params.preferredLanguage,
      languageChosenAt: params.languageChosenAt,
      mustCompleteOnboarding: params.mustCompleteOnboarding,
      onboardingCompletedAt: params.onboardingCompletedAt,
      mustChangePassword: params.mustChangePassword,
    });

    return {
      access_token: await this.issueAccessToken(payload),
      refresh_token: await this.issueRefreshToken(payload),
      user: {
        id: params.userId,
        email: params.email,
        role: params.role,
        orgId: params.finalOrgId || params.baseOrgId,
        preferredLanguage: onboarding.preferredLanguage,
        onboardingRequired: onboarding.onboardingRequired,
        mustChangePassword: onboarding.mustChangePassword,
        onboardingCompletedAt: onboarding.onboardingCompletedAt,
        languageChosen: onboarding.languageChosen,
      },
    };
  }

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
          billingInfo: true,
          preferredLanguage: true,
          languageChosenAt: true,
          mustCompleteOnboarding: true,
          onboardingCompletedAt: true,
          mustChangePassword: true,
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
            billingInfo: true,
            preferredLanguage: true,
            languageChosenAt: true,
            mustCompleteOnboarding: true,
            onboardingCompletedAt: true,
            mustChangePassword: true,
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
        billingInfo: true,
        preferredLanguage: true,
        languageChosenAt: true,
        mustCompleteOnboarding: true,
        onboardingCompletedAt: true,
        mustChangePassword: true,
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
      this.configService.get<string>('REFRESH_TOKEN_SECRET');
    if (!refreshSecret) throw new Error('Missing REFRESH_TOKEN_SECRET');
    const refreshExpires = this.configService.get<string | number>('REFRESH_TOKEN_EXPIRES_IN') || 60 * 60 * 24 * 7;
    const jti = randomUUID();
    // Whitelist jti in Redis with TTL
    const ttlSec = typeof refreshExpires === 'string' ? parseInt(refreshExpires as string, 10) : (refreshExpires as number);
    await this.cache.set(`refresh:${payload.sub}:${jti}`, '1', ttlSec);
    return this.jwtService.sign(payload, { secret: refreshSecret, expiresIn: ttlSec, jwtid: jti });
  }

  private mapRoleToSiteRole(role?: string): string {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'platform_admin') return 'owner';
    if (normalized === 'org_admin') return 'admin';
    if (normalized === 'super_admin') return 'owner';
    if (normalized === 'editor') return 'editor';
    if (normalized === 'viewer') return 'viewer';
    return 'viewer';
  }

  private mapRoleToPlatformRole(role?: string): string {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'platform_admin') return 'platform_admin';
    if (normalized === 'super_admin') return 'admin';
    if (normalized === 'org_admin') return 'admin';
    return 'user';
  }

  async login(loginDto: LoginDto): Promise<LoginResponse> {
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

    const twoFactor = this.readTwoFactorSettings(user.billingInfo);
    if (twoFactor.enabled) {
      const ttlSeconds = this.getTwoFactorChallengeTtlSeconds();
      const twoFactorToken = randomUUID();
      const oneTimeCode = String(randomInt(100000, 1000000));

      let codeDelivery: TwoFactorCodeDelivery = 'none';
      try {
        const delivered = await this.sendTwoFactorEmailCode(user.email, oneTimeCode, ttlSeconds);
        codeDelivery = delivered ? 'email' : 'none';
      } catch (error) {
        this.logger.warn(`2FA code delivery failed for user ${user.id}: ${error instanceof Error ? error.message : String(error)}`);
      }

      if (twoFactor.method === 'email' && codeDelivery !== 'email') {
        throw new UnauthorizedException('Unable to deliver two-factor verification code');
      }

      const challengePayload: TwoFactorChallengePayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        baseOrgId: user.orgId,
        finalOrgId,
        siteRole,
        platformRole,
        systemRole,
        isSuperAdmin,
        isGlobalLogin,
        twoFactorMethod: twoFactor.method,
        codeDelivery,
        oneTimeCode: codeDelivery === 'email' ? oneTimeCode : undefined,
      };

      await this.cache.set(
        this.getTwoFactorChallengeCacheKey(twoFactorToken),
        JSON.stringify(challengePayload),
        ttlSeconds,
      );

      return {
        requiresTwoFactor: true,
        twoFactorToken,
        twoFactorMethod: twoFactor.method,
        codeDelivery,
        expiresInSeconds: ttlSeconds,
      };
    }

    const response = await this.buildLoginResponse({
      userId: user.id,
      email: user.email,
      role: user.role,
      finalOrgId,
      baseOrgId: user.orgId,
      siteRole,
      platformRole,
      systemRole,
      isSuperAdmin,
      preferredLanguage: user.preferredLanguage,
      languageChosenAt: user.languageChosenAt,
      mustCompleteOnboarding: user.mustCompleteOnboarding,
      onboardingCompletedAt: user.onboardingCompletedAt,
      mustChangePassword: user.mustChangePassword,
    });

    // Audit log: Global login
    await this.auditService.log({
      event: AuditEvent.GLOBAL_LOGIN,
      userId: user.id,
      metadata: {
        isGlobalLogin: isGlobalLogin,
        hasMultipleOrgs: isGlobalLogin && !finalOrgId,
        twoFactorRequired: false,
      },
    });

    return response;
  }

  async loginWithTwoFactor(dto: LoginTwoFactorDto): Promise<LoginSuccessResponse> {
    const challenge = await this.getTwoFactorChallenge(dto.token);
    if (!challenge) {
      throw new UnauthorizedException('Two-factor challenge expired or invalid');
    }

    const providedCode = this.normalizeVerificationCode(dto.code);
    const matchesEmailCode =
      challenge.codeDelivery === 'email' &&
      Boolean(challenge.oneTimeCode) &&
      providedCode === this.normalizeVerificationCode(challenge.oneTimeCode || '');
    const matchesRecoveryCode = await this.hasMatchingRecoveryCode(challenge.userId, providedCode);

    if (!matchesEmailCode && !matchesRecoveryCode) {
      throw new UnauthorizedException('Invalid two-factor verification code');
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: challenge.userId },
      select: {
        id: true,
        email: true,
        role: true, // Backward compatibility
        siteRole: true,
        platformRole: true,
        systemRole: true,
        isSuperAdmin: true,
        orgId: true,
        preferredLanguage: true,
        languageChosenAt: true,
        mustCompleteOnboarding: true,
        onboardingCompletedAt: true,
        mustChangePassword: true,
      },
    });

    if (!currentUser) {
      throw new UnauthorizedException('User not found');
    }

    await this.cache.del(this.getTwoFactorChallengeCacheKey(dto.token) as any);

    const siteRole = currentUser.siteRole || this.mapRoleToSiteRole(currentUser.role);
    const platformRole = currentUser.platformRole || this.mapRoleToPlatformRole(currentUser.role);
    const systemRole = currentUser.systemRole || (currentUser.role === 'super_admin' ? 'super_admin' : undefined);
    const isSuperAdmin =
      currentUser.isSuperAdmin ||
      currentUser.role === 'super_admin' ||
      currentUser.systemRole === 'super_admin';

    const response = await this.buildLoginResponse({
      userId: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      finalOrgId: challenge.finalOrgId,
      baseOrgId: currentUser.orgId,
      siteRole,
      platformRole,
      systemRole,
      isSuperAdmin,
      preferredLanguage: currentUser.preferredLanguage,
      languageChosenAt: currentUser.languageChosenAt,
      mustCompleteOnboarding: currentUser.mustCompleteOnboarding,
      onboardingCompletedAt: currentUser.onboardingCompletedAt,
      mustChangePassword: currentUser.mustChangePassword,
    });

    await this.auditService.log({
      event: AuditEvent.GLOBAL_LOGIN,
      userId: currentUser.id,
      metadata: {
        isGlobalLogin: challenge.isGlobalLogin,
        hasMultipleOrgs: challenge.isGlobalLogin && !challenge.finalOrgId,
        twoFactorRequired: true,
        twoFactorMethod: challenge.twoFactorMethod,
        usedRecoveryCode: matchesRecoveryCode && !matchesEmailCode,
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
    const preferredLanguage = registerDto.preferredLanguage || 'en';
    const languageChosenAt = registerDto.preferredLanguage ? new Date() : null;
    
    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        passwordHash,
        orgId,
        role,
        siteRole,
        platformRole,
        preferredLanguage,
        languageChosenAt,
        mustCompleteOnboarding: true,
        mustChangePassword: false,
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

    const onboarding = this.getOnboardingState({
      preferredLanguage: user.preferredLanguage,
      languageChosenAt: user.languageChosenAt,
      mustCompleteOnboarding: user.mustCompleteOnboarding,
      onboardingCompletedAt: user.onboardingCompletedAt,
      mustChangePassword: user.mustChangePassword,
    });

    const response = {
      access_token: await this.issueAccessToken(payload),
      refresh_token: await this.issueRefreshToken(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
        preferredLanguage: onboarding.preferredLanguage,
        onboardingRequired: onboarding.onboardingRequired,
        mustChangePassword: onboarding.mustChangePassword,
        onboardingCompletedAt: onboarding.onboardingCompletedAt,
        languageChosen: onboarding.languageChosen,
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
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const preferredLanguage = dto.preferredLanguage || 'en';
    const languageChosenAt = dto.preferredLanguage ? new Date() : null;

    const user = await this.prisma.user.create({
      data: {
        email: invite.email,
        passwordHash,
        orgId: invite.orgId,
        role,
        siteRole,
        platformRole,
        preferredLanguage,
        languageChosenAt,
        mustCompleteOnboarding: true,
        mustChangePassword: false,
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

    const onboarding = this.getOnboardingState({
      preferredLanguage: user.preferredLanguage,
      languageChosenAt: user.languageChosenAt,
      mustCompleteOnboarding: user.mustCompleteOnboarding,
      onboardingCompletedAt: user.onboardingCompletedAt,
      mustChangePassword: user.mustChangePassword,
    });

    const response = {
      access_token: await this.issueAccessToken(payload),
      refresh_token: await this.issueRefreshToken(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        orgId: user.orgId,
        preferredLanguage: onboarding.preferredLanguage,
        onboardingRequired: onboarding.onboardingRequired,
        mustChangePassword: onboarding.mustChangePassword,
        onboardingCompletedAt: onboarding.onboardingCompletedAt,
        languageChosen: onboarding.languageChosen,
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

  async requestPasswordReset(dto: {
    email: string;
    orgId?: string;
  }): Promise<{ success: true; message: string }> {
    const email = dto.email.trim().toLowerCase();

    let user:
      | {
          id: string;
          email: string;
          preferredLanguage: string | null;
          languageChosenAt: Date | null;
        }
      | null = null;

    if (dto.orgId) {
      user = await this.prisma.user.findUnique({
        where: {
          orgId_email: {
            orgId: dto.orgId,
            email,
          },
        },
        select: {
          id: true,
          email: true,
          preferredLanguage: true,
          languageChosenAt: true,
        },
      });
    } else {
      user = await this.prisma.user.findFirst({
        where: { email },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          preferredLanguage: true,
          languageChosenAt: true,
        },
      });
    }

    if (user) {
      try {
        const actionToken = await this.createPasswordActionToken(
          user.id,
          'reset_password',
          this.getPasswordResetTtlMs(),
        );
        await this.notifications.sendPasswordResetEmail({
          to: user.email,
          resetUrl: this.buildPasswordResetLink(actionToken.token),
          expiresAt: actionToken.expiresAt,
          preferredLanguage: user.preferredLanguage,
          languageChosenAt: user.languageChosenAt,
        });
      } catch (error) {
        this.logger.error(
          `Password reset email failed for ${email}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return {
      success: true,
      message:
        'If an account exists, a password reset link has been sent to the email address.',
    };
  }

  async getPasswordActionTokenStatus(
    token: string,
  ): Promise<{ valid: true; purpose: PasswordActionPurpose; expiresAt: string }> {
    const record = await this.getPasswordActionTokenRecord(token);
    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Token is invalid or expired');
    }

    return {
      valid: true,
      purpose: record.purpose,
      expiresAt: record.expiresAt.toISOString(),
    };
  }

  async confirmPasswordAction(dto: {
    token: string;
    password: string;
  }): Promise<{ success: true; purpose: PasswordActionPurpose }> {
    const consumed = await this.consumePasswordActionToken(dto.token);

    const user = await this.prisma.user.findUnique({
      where: { id: consumed.userId },
      select: {
        id: true,
        email: true,
        preferredLanguage: true,
        languageChosenAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Account no longer exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    try {
      await this.notifications.sendPasswordChangedEmail({
        to: user.email,
        changedAt: new Date(),
        preferredLanguage: user.preferredLanguage,
        languageChosenAt: user.languageChosenAt,
      });
    } catch (error) {
      this.logger.warn(
        `Password changed notification failed for ${user.email}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return {
      success: true,
      purpose: consumed.purpose,
    };
  }

  async refresh(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    const refreshSecret =
      this.configService.get<string>('REFRESH_TOKEN_SECRET');
    if (!refreshSecret) throw new Error('Missing REFRESH_TOKEN_SECRET');

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
      this.configService.get<string>('REFRESH_TOKEN_SECRET');
    if (!refreshSecret) throw new Error('Missing REFRESH_TOKEN_SECRET');
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
        select: { orgId: true, role: true, platformRole: true, systemRole: true, isSuperAdmin: true, email: true },
      });
      if (!user) {
        throw new UnauthorizedException('Not a member of this organization');
      }
      const canCrossOrg = isPlatformPowerUser(user);
      if (!canCrossOrg && user.orgId !== orgId) {
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
    const siteRole = this.mapRoleToSiteRole(finalRole);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId,
      role: finalRole,
      siteRole,
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

    // First check if user is super_admin - they have access to all sites
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, orgId: true, role: true, platformRole: true, email: true, isSuperAdmin: true, systemRole: true },
    });

    if (!currentUser) {
      throw new UnauthorizedException('User not found');
    }

    const isSuperAdmin = isPlatformPowerUser(currentUser) || currentUser.systemRole === 'super_admin';

    let role: string | undefined;
    if (isSuperAdmin) {
      // Super admins get super_admin role for all sites
      role = isPlatformAdminValue(currentUser.platformRole) || isPlatformAdminValue(currentUser.role)
        ? 'platform_admin'
        : 'super_admin';
    } else {
      const membership = await this.prisma.userOrg.findUnique({
        where: { userId_orgId: { userId, orgId: site.orgId } },
        select: { role: true },
      });

      role = membership?.role;
      if (!role) {
        if (currentUser.orgId !== site.orgId) {
          throw new UnauthorizedException('Not a member of the organization that owns this site');
        }
        role = currentUser.role;
      }
    }

    const finalRole = role ?? 'viewer';
    const platformRole = this.mapRoleToPlatformRole(finalRole);
    const siteRole = this.mapRoleToSiteRole(finalRole);

    const payload: JwtPayload = {
      sub: currentUser.id,
      email: currentUser.email,
      orgId: site.orgId,
      siteId: site.id,
      role: finalRole,
      siteRole,
      platformRole,
      isSuperAdmin: isSuperAdmin || undefined,
      systemRole: currentUser.systemRole || undefined,
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

    // Check if user is super_admin - they have access to all organizations
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { orgId: true, isSuperAdmin: true, systemRole: true, platformRole: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isSuperAdmin = isPlatformPowerUser(user) || user.systemRole === 'super_admin';
    if (isSuperAdmin) {
      // Super admins have access to all organizations
      return organization;
    }

    const membership = await this.prisma.userOrg.findUnique({
      where: { userId_orgId: { userId, orgId: organization.id } },
      select: { role: true },
    });

    if (!membership && user.orgId !== organization.id) {
      throw new UnauthorizedException('Not a member of this organization');
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
        languageChosenAt: true,
        mustCompleteOnboarding: true,
        onboardingCompletedAt: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const onboarding = this.getOnboardingState({
      preferredLanguage: user.preferredLanguage,
      languageChosenAt: user.languageChosenAt,
      mustCompleteOnboarding: user.mustCompleteOnboarding,
      onboardingCompletedAt: user.onboardingCompletedAt,
      mustChangePassword: user.mustChangePassword,
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
      preferredLanguage: onboarding.preferredLanguage,
      onboardingRequired: onboarding.onboardingRequired,
      mustChangePassword: onboarding.mustChangePassword,
      onboardingCompletedAt: onboarding.onboardingCompletedAt,
      languageChosen: onboarding.languageChosen,
    };
  }
}
