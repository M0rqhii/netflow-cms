import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Permission } from '../../common/auth/roles.enum';
import { CurrentUser } from '../../common/auth/decorators/current-user.decorator';
import { AccountService } from './account.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { z } from 'zod';

const UpdateAccountDtoSchema = z.object({
  name: z.string().min(1).optional(),
  preferredLanguage: z.enum(['pl', 'en']).optional(),
});

const ChangePasswordDtoSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

const UpdateBillingInfoDtoSchema = z.object({
  companyName: z.string().optional(),
  nip: z.string().optional(),
  address: z.string().optional(),
});

const UpdateSecuritySettingsDtoSchema = z.object({
  twoFactorEnabled: z.boolean().optional(),
  twoFactorMethod: z.enum(['auth_app', 'email']).optional(),
  loginAlerts: z.boolean().optional(),
  sessionTimeoutMinutes: z.number().int().min(5).max(1440).optional(),
});

type UpdateAccountDto = z.infer<typeof UpdateAccountDtoSchema>;
type ChangePasswordDto = z.infer<typeof ChangePasswordDtoSchema>;
type UpdateBillingInfoDto = z.infer<typeof UpdateBillingInfoDtoSchema>;
type UpdateSecuritySettingsDto = z.infer<typeof UpdateSecuritySettingsDtoSchema>;

/**
 * AccountController - RESTful API for user account management
 * AI Note: All endpoints are global (no org/site context required)
 */
@Controller('account')
@UseGuards(AuthGuard, PermissionsGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  /**
   * GET /api/v1/account
   * Get current user account information
   */
  @Get()
  @Permissions(Permission.USERS_READ)
  async getAccount(@CurrentUser() user: { id: string }) {
    return this.accountService.getAccount(user.id);
  }

  /**
   * PATCH /api/v1/account
   * Update current user account information
   */
  @Patch()
  @Permissions(Permission.USERS_WRITE)
  async updateAccount(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UpdateAccountDtoSchema)) dto: UpdateAccountDto,
  ) {
    return this.accountService.updateAccount(user.id, dto);
  }

  /**
   * PATCH /api/v1/account/password
   * Change user password
   */
  @Patch('password')
  @Permissions(Permission.USERS_WRITE)
  async changePassword(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(ChangePasswordDtoSchema)) dto: ChangePasswordDto,
  ) {
    return this.accountService.changePassword(user.id, dto);
  }

  /**
   * GET /api/v1/account/billing-info
   * Get billing information for current user
   * Note: Users can always access their own billing information, no special permission required
   */
  @Get('billing-info')
  async getBillingInfo(@CurrentUser() user: { id: string }) {
    return this.accountService.getBillingInfo(user.id);
  }

  /**
   * PATCH /api/v1/account/billing-info
   * Update billing information for current user
   * Note: Users can always update their own billing information, no special permission required
   */
  @Patch('billing-info')
  async updateBillingInfo(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UpdateBillingInfoDtoSchema)) dto: UpdateBillingInfoDto,
  ) {
    return this.accountService.updateBillingInfo(user.id, dto);
  }

  /**
   * GET /api/v1/account/security
   * Get account security settings (2FA, alerts, session timeout)
   */
  @Get('security')
  @Permissions(Permission.USERS_READ)
  async getSecuritySettings(@CurrentUser() user: { id: string }) {
    return this.accountService.getSecuritySettings(user.id);
  }

  /**
   * PATCH /api/v1/account/security
   * Update account security settings
   */
  @Patch('security')
  @Permissions(Permission.USERS_WRITE)
  async updateSecuritySettings(
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(UpdateSecuritySettingsDtoSchema)) dto: UpdateSecuritySettingsDto,
  ) {
    return this.accountService.updateSecuritySettings(user.id, dto);
  }

  /**
   * POST /api/v1/account/security/recovery-codes/regenerate
   * Regenerate account 2FA recovery codes
   */
  @Post('security/recovery-codes/regenerate')
  @Permissions(Permission.USERS_WRITE)
  async regenerateRecoveryCodes(@CurrentUser() user: { id: string }) {
    return this.accountService.regenerateRecoveryCodes(user.id);
  }
}

