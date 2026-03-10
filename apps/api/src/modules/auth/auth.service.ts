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
  finalOrgId?: string;
  isGlobalLogin: boolean;
  twoFactorMethod: TwoFactorMethod;
  codeDelivery: TwoFactorCodeDelivery;
  oneTimeCode?: string;
};

type PasswordActionPurpose = 'reset_password' | 'account_setup';

type EffectivePlatformAuthProfile = {
  role: string;
  isSuperAdmin: boolean;
  isPlatformPowerUser: boolean;
  platformRbacRoles: string[];
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    private auditService: AuditService,
    private readonly rbacService: RbacService,
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
    finalOrgId?: string;
    baseOrgId: string;
    preferredLanguage?: string | null;
    languageChosenAt?: Date | null;
    mustCompleteOnboarding?: boolean | null;
    onboardingCompletedAt?: Date | null;
    mustChangePassword?: boolean | null;
    platformProfile?: EffectivePlatformAuthProfile;
  }): Promise<LoginSuccessResponse> {
    const platformProfile =
      params.platformProfile ||
      (await this.getEffectivePlatformAuthProfile(params.userId));

    const payload = await this.buildJwtPayload({
      userId: params.userId,
      email: params.email,
      orgId: params.finalOrgId,
      platformProfile,
    });

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
        role: platformProfile.role,
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

  private async resolvePublicInviteRole(
    orgId: string,
    roleKey: string,
    scope: PublicRbacUserRoleScope,
  ): Promise<PublicRbacUserRoleDefinition & { id: string }> {
    const normalizedRoleKey = coercePublicRbacUserRoleKey(roleKey, scope) || roleKey;
    const definition = getPublicRbacUserRole(normalizedRoleKey);
    if (!definition || definition.scope !== scope) {
      throw new BadRequestException('Invite role is not allowed');
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

  private async getPrimaryOrgRoleKey(
    orgId: string,
    userId: string,
  ): Promise<PublicRbacUserRoleKey> {
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

  private async syncCompatibilityForOrgRole(
    orgId: string,
    userId: string,
    roleKey: PublicRbacUserRoleKey,
  ) {
    const role = getPublicRbacUserRole(roleKey);
    if (!role || role.scope !== 'ORG') {
      return;
    }

    await this.prisma.userOrg.upsert({
      where: { userId_orgId: { userId, orgId } },
      update: { role: role.key },
      create: { userId, orgId, role: role.key },
    });
  }

  private async syncCompatibilityForSiteRole(
    orgId: string,
    userId: string,
    roleKey: PublicRbacUserRoleKey,
  ) {
    const siteRole = getPublicRbacUserRole(roleKey);
    if (!siteRole || siteRole.scope !== 'SITE') {
      return;
    }

    const orgRoleKey = await this.getPrimaryOrgRoleKey(orgId, userId);

    await this.prisma.userOrg.upsert({
      where: { userId_orgId: { userId, orgId } },
      update: { role: orgRoleKey },
      create: { userId, orgId, role: orgRoleKey },
    });
  }

  private getSiteRolePriority(roleKey?: string | null): number {
    switch (roleKey) {
      case 'site_admin':
        return 100;
      case 'editor_in_chief':
        return 80;
      case 'editor':
        return 70;
      case 'marketing_manager':
        return 60;
      case 'publisher':
        return 50;
      case 'marketing_editor':
        return 40;
      case 'marketing_publisher':
        return 35;
      case 'marketing_viewer':
        return 20;
      case 'viewer':
        return 10;
      default:
        return 0;
    }
  }

  private async getJwtTenantRoleClaims(params: {
    userId: string;
    orgId?: string;
    siteId?: string;
    fallbackOrgRoleKey?: PublicRbacUserRoleKey | null;
    fallbackSiteRoleKey?: PublicRbacUserRoleKey | null;
  }) {
    if (!params.orgId) {
      return {
        orgRoleKey: params.fallbackOrgRoleKey ?? undefined,
        orgRoleName: undefined,
        siteRoleKey: params.fallbackSiteRoleKey ?? undefined,
        siteRoleName: undefined,
      };
    }

    await this.rbacService.backfillLegacyOrgAssignments(params.userId, params.orgId);

    const assignments = await this.prisma.userRole.findMany({
      where: {
        userId: params.userId,
        orgId: params.orgId,
        OR: params.siteId ? [{ siteId: null }, { siteId: params.siteId }] : [{ siteId: null }],
      },
      select: {
        siteId: true,
        role: {
          select: {
            name: true,
            scope: true,
          },
        },
      },
    });

    const orgAssignments = assignments.filter(
      (assignment) => assignment.role.scope === 'ORG' && assignment.siteId === null,
    );
    const orgAssignment =
      orgAssignments.find(
        (assignment) => getPublicRbacUserRoleByName(assignment.role.name, 'ORG')?.key === 'org_admin',
      ) || orgAssignments[0];

    const siteAssignments = params.siteId
      ? assignments.filter(
          (assignment) => assignment.role.scope === 'SITE' && assignment.siteId === params.siteId,
        )
      : [];
    const siteAssignment = [...siteAssignments].sort((left, right) => {
      const leftKey = getPublicRbacUserRoleByName(left.role.name, 'SITE')?.key;
      const rightKey = getPublicRbacUserRoleByName(right.role.name, 'SITE')?.key;
      return this.getSiteRolePriority(rightKey) - this.getSiteRolePriority(leftKey);
    })[0];

    return {
      orgRoleKey:
        getPublicRbacUserRoleByName(orgAssignment?.role.name || '', 'ORG')?.key ||
        params.fallbackOrgRoleKey ||
        undefined,
      orgRoleName: orgAssignment?.role.name,
      siteRoleKey:
        getPublicRbacUserRoleByName(siteAssignment?.role.name || '', 'SITE')?.key ||
        params.fallbackSiteRoleKey ||
        undefined,
      siteRoleName: siteAssignment?.role.name,
    };
  }

  private async getEffectivePlatformAuthProfile(userId: string): Promise<EffectivePlatformAuthProfile> {
    const platformProfile = await this.rbacService.getEffectivePlatformProfile(userId);

    return {
      role: platformProfile.legacyRole || 'viewer',
      isSuperAdmin: platformProfile.isSuperAdmin,
      isPlatformPowerUser: platformProfile.isPlatformPowerUser,
      platformRbacRoles: platformProfile.roleNames,
    };
  }

  private async buildJwtPayload(params: {
    userId: string;
    email: string;
    orgId?: string;
    siteId?: string;
    platformProfile?: EffectivePlatformAuthProfile;
    fallbackOrgRoleKey?: PublicRbacUserRoleKey | null;
    fallbackSiteRoleKey?: PublicRbacUserRoleKey | null;
  }): Promise<JwtPayload> {
    const platformProfile =
      params.platformProfile ||
      (await this.getEffectivePlatformAuthProfile(params.userId));
    const tenantRoleClaims = await this.getJwtTenantRoleClaims({
      userId: params.userId,
      orgId: params.orgId,
      siteId: params.siteId,
      fallbackOrgRoleKey: params.fallbackOrgRoleKey ?? (params.orgId ? 'org_member' : undefined),
      fallbackSiteRoleKey: params.fallbackSiteRoleKey ?? (params.siteId ? 'viewer' : undefined),
    });

    return {
      sub: params.userId,
      email: params.email,
      orgId: params.orgId,
      siteId: params.siteId,
      isSuperAdmin: platformProfile.isSuperAdmin,
      orgRoleKey: tenantRoleClaims.orgRoleKey,
      orgRoleName: tenantRoleClaims.orgRoleName,
      siteRoleKey: tenantRoleClaims.siteRoleKey,
      siteRoleName: tenantRoleClaims.siteRoleName,
      platformRbacRoles: platformProfile.platformRbacRoles,
    };
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

    const platformProfile = await this.getEffectivePlatformAuthProfile(user.id);

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
        finalOrgId,
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
      finalOrgId,
      baseOrgId: user.orgId,
      preferredLanguage: user.preferredLanguage,
      languageChosenAt: user.languageChosenAt,
      mustCompleteOnboarding: user.mustCompleteOnboarding,
      onboardingCompletedAt: user.onboardingCompletedAt,
      mustChangePassword: user.mustChangePassword,
      platformProfile,
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

    const platformProfile = await this.getEffectivePlatformAuthProfile(currentUser.id);

    const response = await this.buildLoginResponse({
      userId: currentUser.id,
      email: currentUser.email,
      finalOrgId: challenge.finalOrgId,
      baseOrgId: currentUser.orgId,
      preferredLanguage: currentUser.preferredLanguage,
      languageChosenAt: currentUser.languageChosenAt,
      mustCompleteOnboarding: currentUser.mustCompleteOnboarding,
      onboardingCompletedAt: currentUser.onboardingCompletedAt,
      mustChangePassword: currentUser.mustChangePassword,
      platformProfile,
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

    const publicRole = await this.resolvePublicInviteRole(
      orgId,
      registerDto.role || 'org_member',
      'ORG',
    );
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
        preferredLanguage,
        languageChosenAt,
        mustCompleteOnboarding: true,
        mustChangePassword: false,
      },
    });

    await this.rbacService.createAssignment(
      orgId,
      { userId: user.id, roleId: publicRole.id, siteId: null },
      user.id,
    );
    await this.syncCompatibilityForOrgRole(orgId, user.id, publicRole.key);

    const payload = await this.buildJwtPayload({
      userId: user.id,
      email: user.email,
      orgId: user.orgId,
      fallbackOrgRoleKey: publicRole.scope === 'ORG' ? publicRole.key : 'org_member',
      fallbackSiteRoleKey: publicRole.scope === 'SITE' ? publicRole.key : undefined,
    });

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
        role: publicRole.legacyRole,
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
        role: publicRole.key,
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
      role: coercePublicRbacUserRoleKey(invite.role, invite.site ? 'SITE' : 'ORG') || invite.role,
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

    const inviteScope: PublicRbacUserRoleScope = invite.siteId ? 'SITE' : 'ORG';
    const publicRole = await this.resolvePublicInviteRole(invite.orgId, invite.role, inviteScope);
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const preferredLanguage = dto.preferredLanguage || 'en';
    const languageChosenAt = dto.preferredLanguage ? new Date() : null;

    const createdUser = await this.prisma.user.create({
      data: {
        email: invite.email,
        passwordHash,
        orgId: invite.orgId,
        preferredLanguage,
        languageChosenAt,
        mustCompleteOnboarding: true,
        mustChangePassword: false,
      },
      select: {
        id: true,
        email: true,
        orgId: true,
        preferredLanguage: true,
        languageChosenAt: true,
        mustCompleteOnboarding: true,
        onboardingCompletedAt: true,
        mustChangePassword: true,
      },
    });

    await this.rbacService.createAssignment(
      invite.orgId,
      {
        userId: createdUser.id,
        roleId: publicRole.id,
        siteId: invite.siteId || null,
      },
      createdUser.id,
    );

    if (publicRole.scope === 'ORG') {
      await this.syncCompatibilityForOrgRole(invite.orgId, createdUser.id, publicRole.key);
    } else {
      await this.syncCompatibilityForSiteRole(invite.orgId, createdUser.id, publicRole.key);
    }

    await this.prisma.userInvite.update({
      where: { id: invite.id },
      data: { status: 'accepted', acceptedAt: new Date() },
    });

    const platformProfile = await this.getEffectivePlatformAuthProfile(createdUser.id);

    const payload = await this.buildJwtPayload({
      userId: createdUser.id,
      email: createdUser.email,
      orgId: createdUser.orgId,
      platformProfile,
    });

    const onboarding = this.getOnboardingState({
      preferredLanguage: createdUser.preferredLanguage,
      languageChosenAt: createdUser.languageChosenAt,
      mustCompleteOnboarding: createdUser.mustCompleteOnboarding,
      onboardingCompletedAt: createdUser.onboardingCompletedAt,
      mustChangePassword: createdUser.mustChangePassword,
    });

    const response = {
      access_token: await this.issueAccessToken(payload),
      refresh_token: await this.issueRefreshToken(payload),
      user: {
        id: createdUser.id,
        email: createdUser.email,
        role: platformProfile.role,
        orgId: createdUser.orgId,
        preferredLanguage: onboarding.preferredLanguage,
        onboardingRequired: onboarding.onboardingRequired,
        mustChangePassword: onboarding.mustChangePassword,
        onboardingCompletedAt: onboarding.onboardingCompletedAt,
        languageChosen: onboarding.languageChosen,
      },
    };

    await this.auditService.log({
      event: AuditEvent.USER_INVITE,
      userId: createdUser.id,
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
    const { sub, orgId, siteId, jti } = decoded as JwtPayload & { jti: string };
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
        orgId: true 
      } 
    });
    if (!user) throw new UnauthorizedException('User not found');

    const platformProfile = await this.getEffectivePlatformAuthProfile(user.id);
    const finalOrgId = orgId ?? user.orgId;

    const payload = await this.buildJwtPayload({
      userId: user.id,
      email: user.email,
      orgId: finalOrgId,
      siteId,
      platformProfile,
    });
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        orgId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return null;
    }

    const platformProfile = await this.getEffectivePlatformAuthProfile(user.id);
    return {
      ...user,
      role: platformProfile.role,
    };
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
        orgId: true,
        organization: { select: { id: true, name: true, slug: true, plan: true } },
      },
    });
    if (!legacy?.orgId) return [];
    return [
      {
        orgId: legacy.orgId,
        role: 'org_member',
        organization: legacy.organization,
      },
    ];
  }

  async issueOrgToken(userId: string, orgId: string) {
    const membership = await this.prisma.userOrg.findUnique({
      where: { userId_orgId: { userId, orgId } },
      select: { role: true },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        orgId: true,
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const platformProfile = await this.getEffectivePlatformAuthProfile(user.id);

    if (!membership && !platformProfile.isPlatformPowerUser && user.orgId !== orgId) {
      throw new UnauthorizedException('Not a member of this organization');
    }

    const payload = await this.buildJwtPayload({
      userId: user.id,
      email: user.email,
      orgId,
      platformProfile,
    });
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
      select: {
        id: true,
        orgId: true,
        email: true,
      },
    });

    if (!currentUser) {
      throw new UnauthorizedException('User not found');
    }

    const platformProfile = await this.getEffectivePlatformAuthProfile(currentUser.id);

    if (!platformProfile.isPlatformPowerUser) {
      const membership = await this.prisma.userOrg.findUnique({
        where: { userId_orgId: { userId, orgId: site.orgId } },
        select: { role: true },
      });

      if (!membership && currentUser.orgId !== site.orgId) {
        throw new UnauthorizedException('Not a member of the organization that owns this site');
      }
    }

    const payload = await this.buildJwtPayload({
      userId: currentUser.id,
      email: currentUser.email,
      orgId: site.orgId,
      siteId: site.id,
      platformProfile,
    });
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
      select: {
        id: true,
        orgId: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const platformProfile = await this.getEffectivePlatformAuthProfile(user.id);
    if (platformProfile.isPlatformPowerUser) {
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

    const platformProfile = await this.getEffectivePlatformAuthProfile(user.id);
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
      role: platformProfile.role,
      orgId: user.orgId,
      preferredLanguage: onboarding.preferredLanguage,
      onboardingRequired: onboarding.onboardingRequired,
      mustChangePassword: onboarding.mustChangePassword,
      onboardingCompletedAt: onboarding.onboardingCompletedAt,
      languageChosen: onboarding.languageChosen,
    };
  }
}
