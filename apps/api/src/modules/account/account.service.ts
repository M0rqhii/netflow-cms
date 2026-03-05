import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

interface UpdateAccountDto {
  name?: string;
  preferredLanguage?: 'pl' | 'en';
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

type AccountSecuritySettings = {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'auth_app' | 'email';
  loginAlerts: boolean;
  sessionTimeoutMinutes: number;
  recoveryCodes: string[];
  updatedAt: string;
};

/**
 * AccountService - Service for user account management
 * AI Note: Handles account operations without org/site context
 */
@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

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

  /**
   * Get account information for user
   */
  async getAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        preferredLanguage: true,
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

    return {
      ...user,
      preferredLanguage: user.preferredLanguage || 'en',
      billingInfo,
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

  /**
   * Update account information
   */
  async updateAccount(userId: string, dto: UpdateAccountDto) {
    const updateData: { preferredLanguage?: string } = {};

    if (dto.preferredLanguage !== undefined) {
      updateData.preferredLanguage = dto.preferredLanguage;
    }

    // Note: User model doesn't have a 'name' field yet
    // For now, we'll skip it or store it in settings JSON
    // This can be extended when User model is updated

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        role: true,
        preferredLanguage: true,
        updatedAt: true,
      },
    });

    return {
      ...user,
      preferredLanguage: user.preferredLanguage || 'en',
    };
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(dto.oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Invalid old password');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    return { success: true, message: 'Password changed successfully' };
  }

  /**
   * Get billing information
   * Stored on User.billingInfo JSON field
   */
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

  /**
   * Update billing information
   * Stored on User.billingInfo JSON field
   */
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

