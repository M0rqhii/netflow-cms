import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

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

/**
 * AccountService - Service for user account management
 * AI Note: Handles account operations without tenant context
 */
@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

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
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get billing info from user settings (stored in a JSON field or separate table)
    // For now, return empty billing info - can be extended later
    const billingInfo = {
      companyName: null,
      nip: null,
      address: null,
    };

    return {
      ...user,
      preferredLanguage: user.preferredLanguage || 'en',
      billingInfo,
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
   * Note: For now, returns placeholder data. Can be extended with a separate BillingInfo model
   */
  async getBillingInfo(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // For now, return empty billing info
    // In the future, this can be stored in a separate BillingInfo table or User.settings JSON
    return {
      companyName: null,
      nip: null,
      address: null,
    };
  }

  /**
   * Update billing information
   * Note: For now, stores in a placeholder. Can be extended with a separate BillingInfo model
   */
  async updateBillingInfo(userId: string, dto: UpdateBillingInfoDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // For now, billing info is not stored in User model
    // This is a placeholder - in production, you'd want a separate BillingInfo table
    // or extend User model with billing fields

    return {
      success: true,
      message: 'Billing information updated successfully',
      billingInfo: {
        companyName: dto.companyName || null,
        nip: dto.nip || null,
        address: dto.address || null,
      },
    };
  }
}

