import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AccountNotificationsService } from '../../common/notifications/account-notifications.service';

interface UpdateAccountDto {
  name?: string;
  preferredLanguage?: 'pl' | 'en';
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

interface UpdateBillingInfoDto {
  companyName?: string;
  nip?: string;
  address?: string;
}

interface UpdateSecuritySettingsDto {
  twoFactorEnabled?: boolean;
  twoFactorMethod?: 'auth_app' | 'email';
  loginAlerts?: boolean;
  sessionTimeoutMinutes?: number;
}

interface CompleteOnboardingDto {
  preferredLanguage: 'pl' | 'en';
  firstName?: string;
  lastName?: string;
  phone?: string;
}

type AccountSecuritySettings = {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'auth_app' | 'email';
  loginAlerts: boolean;
  sessionTimeoutMinutes: number;
  recoveryCodes: string[];
  updatedAt: string;
};

@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: AccountNotificationsService,
  ) {}

  private asJsonObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {};
    }
    return value as Record<string, unknown>;
  }

  private generateRecoveryCodes(count = 8): string[] {
    return Array.from({ length: count }, () => {
      const partA = randomBytes(2).toString('hex').toUpperCase();
      const partB = randomBytes(2).toString('hex').toUpperCase();
      return `${partA}-${partB}`;
    });
  }

  private normalizeName(value?: string | null): string | null {
    if (!value) return null;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizePhone(value?: string | null): string | null {
    if (value === undefined) return null;
    if (value === null) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const compact = trimmed.replace(/\s+/g, '');
    if (!/^\+?[0-9().-]{7,20}$/.test(compact)) {
      throw new BadRequestException('Phone number format is invalid');
    }
    return compact;
  }

  private readSecuritySettings(rawBilling: Record<string, unknown>): AccountSecuritySettings {
    const rawSecurity = this.asJsonObject(rawBilling.security);
    const maybeCodes = Array.isArray(rawSecurity.recoveryCodes) ? rawSecurity.recoveryCodes : [];
    const recoveryCodes = maybeCodes
      .filter((code): code is string => typeof code === 'string' && code.length > 0)
      .slice(0, 20);

    const rawMethod = rawSecurity.twoFactorMethod;
    const twoFactorMethod: 'auth_app' | 'email' = rawMethod === 'email' ? 'email' : 'auth_app';

    const parsedTimeout = Number(rawSecurity.sessionTimeoutMinutes);
    const sessionTimeoutMinutes =
      Number.isFinite(parsedTimeout) && parsedTimeout >= 5 && parsedTimeout <= 1440
        ? Math.round(parsedTimeout)
        : 30;

    return {
      twoFactorEnabled: Boolean(rawSecurity.twoFactorEnabled),
      twoFactorMethod,
      loginAlerts: rawSecurity.loginAlerts === false ? false : true,
      sessionTimeoutMinutes,
      recoveryCodes,
      updatedAt:
        typeof rawSecurity.updatedAt === 'string'
          ? rawSecurity.updatedAt
          : new Date().toISOString(),
    };
  }

  private deriveOnboardingState(user: {
    preferredLanguage?: string | null;
    languageChosenAt?: Date | null;
    mustCompleteOnboarding?: boolean | null;
    onboardingCompletedAt?: Date | null;
    mustChangePassword?: boolean | null;
  }) {
    const preferredLanguage = user.preferredLanguage === 'pl' ? 'pl' : 'en';
    const languageChosen = Boolean(user.languageChosenAt);
    const mustChangePassword = Boolean(user.mustChangePassword);
    const mustCompleteOnboarding = Boolean(user.mustCompleteOnboarding);
    const onboardingRequired = mustChangePassword || mustCompleteOnboarding || !languageChosen;

    return {
      preferredLanguage,
      languageChosen,
      mustChangePassword,
      mustCompleteOnboarding,
      onboardingRequired,
      onboardingCompletedAt: user.onboardingCompletedAt
        ? user.onboardingCompletedAt.toISOString()
        : null,
    };
  }

  async getAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        preferredLanguage: true,
        firstName: true,
        lastName: true,
        phone: true,
        languageChosenAt: true,
        mustCompleteOnboarding: true,
        onboardingCompletedAt: true,
        mustChangePassword: true,
        billingInfo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const rawBilling = (user.billingInfo as Record<string, any> | null) || {};
    const billingInfo = {
      companyName: rawBilling.companyName ?? null,
      nip: rawBilling.nip ?? null,
      address: rawBilling.address ?? null,
    };
    const security = this.readSecuritySettings(rawBilling);
    const onboarding = this.deriveOnboardingState(user);

    return {
      ...user,
      preferredLanguage: onboarding.preferredLanguage,
      firstName: user.firstName || null,
      lastName: user.lastName || null,
      phone: user.phone || null,
      billingInfo,
      onboarding: {
        required: onboarding.onboardingRequired,
        languageChosen: onboarding.languageChosen,
        mustChangePassword: onboarding.mustChangePassword,
        completedAt: onboarding.onboardingCompletedAt,
      },
      security: {
        twoFactorEnabled: security.twoFactorEnabled,
        twoFactorMethod: security.twoFactorMethod,
        loginAlerts: security.loginAlerts,
        sessionTimeoutMinutes: security.sessionTimeoutMinutes,
        recoveryCodesCount: security.recoveryCodes.length,
        updatedAt: security.updatedAt,
      },
    };
  }

  async updateAccount(userId: string, dto: UpdateAccountDto) {
    const updateData: {
      preferredLanguage?: string;
      languageChosenAt?: Date;
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
    } = {};

    if (dto.preferredLanguage !== undefined) {
      updateData.preferredLanguage = dto.preferredLanguage;
      updateData.languageChosenAt = new Date();
    }

    if (dto.firstName !== undefined) {
      updateData.firstName = this.normalizeName(dto.firstName);
    }

    if (dto.lastName !== undefined) {
      updateData.lastName = this.normalizeName(dto.lastName);
    }

    if (dto.phone !== undefined) {
      updateData.phone = this.normalizePhone(dto.phone);
    }

    if (dto.name !== undefined && dto.firstName === undefined && dto.lastName === undefined) {
      const normalized = this.normalizeName(dto.name);
      if (normalized) {
        const parts = normalized.split(/\s+/);
        updateData.firstName = parts.shift() || null;
        updateData.lastName = parts.join(' ') || null;
      } else {
        updateData.firstName = null;
        updateData.lastName = null;
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        preferredLanguage: true,
        firstName: true,
        lastName: true,
        phone: true,
        languageChosenAt: true,
        mustCompleteOnboarding: true,
        onboardingCompletedAt: true,
        mustChangePassword: true,
        updatedAt: true,
      },
    });

    const onboarding = this.deriveOnboardingState(user);

    return {
      ...user,
      preferredLanguage: onboarding.preferredLanguage,
      onboarding: {
        required: onboarding.onboardingRequired,
        languageChosen: onboarding.languageChosen,
        mustChangePassword: onboarding.mustChangePassword,
        completedAt: onboarding.onboardingCompletedAt,
      },
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        preferredLanguage: true,
        languageChosenAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Invalid old password');
    }

    const newPasswordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
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
    } catch {
      // Keep password change successful even if notification delivery fails.
    }

    return { success: true, message: 'Password changed successfully' };
  }

  async getOnboardingStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        preferredLanguage: true,
        firstName: true,
        lastName: true,
        phone: true,
        languageChosenAt: true,
        mustCompleteOnboarding: true,
        onboardingCompletedAt: true,
        mustChangePassword: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const onboarding = this.deriveOnboardingState(user);
    return {
      required: onboarding.onboardingRequired,
      preferredLanguage: onboarding.preferredLanguage,
      languageChosen: onboarding.languageChosen,
      mustChangePassword: onboarding.mustChangePassword,
      mustCompleteOnboarding: onboarding.mustCompleteOnboarding,
      completedAt: onboarding.onboardingCompletedAt,
      profile: {
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        phone: user.phone || null,
      },
    };
  }

  async completeOnboarding(userId: string, dto: CompleteOnboardingDto) {
    const phone = dto.phone !== undefined ? this.normalizePhone(dto.phone) : undefined;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferredLanguage: dto.preferredLanguage,
        languageChosenAt: new Date(),
        firstName:
          dto.firstName !== undefined ? this.normalizeName(dto.firstName) : undefined,
        lastName:
          dto.lastName !== undefined ? this.normalizeName(dto.lastName) : undefined,
        phone,
        mustCompleteOnboarding: false,
        onboardingCompletedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        preferredLanguage: true,
        firstName: true,
        lastName: true,
        phone: true,
        languageChosenAt: true,
        mustCompleteOnboarding: true,
        onboardingCompletedAt: true,
        mustChangePassword: true,
      },
    });

    try {
      await this.notifications.sendOnboardingCompletedEmail({
        to: user.email,
        firstName: user.firstName,
        preferredLanguage: user.preferredLanguage,
        languageChosenAt: user.languageChosenAt,
      });
    } catch {
      // Onboarding completion should not fail because of a notification transport issue.
    }

    const onboarding = this.deriveOnboardingState(user);
    return {
      success: true,
      required: onboarding.onboardingRequired,
      completedAt: onboarding.onboardingCompletedAt,
      profile: {
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        phone: user.phone || null,
      },
    };
  }

  async getBillingInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        billingInfo: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const rawBilling = (user.billingInfo as Record<string, any> | null) || {};
    return {
      companyName: rawBilling.companyName ?? null,
      nip: rawBilling.nip ?? null,
      address: rawBilling.address ?? null,
    };
  }

  async updateBillingInfo(userId: string, dto: UpdateBillingInfoDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        billingInfo: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const rawBilling = (user.billingInfo as Record<string, any> | null) || {};
    const nextBilling = {
      ...rawBilling,
      companyName: dto.companyName ?? rawBilling.companyName ?? null,
      nip: dto.nip ?? rawBilling.nip ?? null,
      address: dto.address ?? rawBilling.address ?? null,
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { billingInfo: nextBilling },
    });

    return {
      success: true,
      message: 'Billing information updated successfully',
      billingInfo: nextBilling,
    };
  }

  async getSecuritySettings(userId: string): Promise<AccountSecuritySettings> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        billingInfo: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const rawBilling = this.asJsonObject(user.billingInfo);
    return this.readSecuritySettings(rawBilling);
  }

  async updateSecuritySettings(
    userId: string,
    dto: UpdateSecuritySettingsDto,
  ): Promise<AccountSecuritySettings> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        billingInfo: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const rawBilling = this.asJsonObject(user.billingInfo);
    const current = this.readSecuritySettings(rawBilling);
    const next: AccountSecuritySettings = {
      ...current,
      twoFactorEnabled: dto.twoFactorEnabled ?? current.twoFactorEnabled,
      twoFactorMethod: dto.twoFactorMethod ?? current.twoFactorMethod,
      loginAlerts: dto.loginAlerts ?? current.loginAlerts,
      sessionTimeoutMinutes:
        dto.sessionTimeoutMinutes ?? current.sessionTimeoutMinutes,
      updatedAt: new Date().toISOString(),
      recoveryCodes: [...current.recoveryCodes],
    };

    if (next.twoFactorEnabled && next.recoveryCodes.length === 0) {
      next.recoveryCodes = this.generateRecoveryCodes();
    }

    if (!next.twoFactorEnabled) {
      next.recoveryCodes = [];
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        billingInfo: {
          ...rawBilling,
          security: next,
        },
      },
    });

    return next;
  }

  async regenerateRecoveryCodes(userId: string): Promise<{
    recoveryCodes: string[];
    generatedAt: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        billingInfo: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const rawBilling = this.asJsonObject(user.billingInfo);
    const current = this.readSecuritySettings(rawBilling);

    if (!current.twoFactorEnabled) {
      throw new BadRequestException('Enable two-factor authentication first');
    }

    const updatedAt = new Date().toISOString();
    const next = {
      ...current,
      recoveryCodes: this.generateRecoveryCodes(),
      updatedAt,
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        billingInfo: {
          ...rawBilling,
          security: next,
        },
      },
    });

    return {
      recoveryCodes: next.recoveryCodes,
      generatedAt: updatedAt,
    };
  }
}
