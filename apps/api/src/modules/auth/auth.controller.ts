import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Param, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, loginSchema, registerSchema } from './dto';
import { Public } from '../../common/auth/decorators/public.decorator';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditService, AuditEvent } from '../../common/audit/audit.service';
import { z } from 'zod';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private auditService: AuditService,
  ) {}

  @Public()
  @Throttle(5, 60) // 5 requests per minute
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(new ZodValidationPipe(loginSchema)) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Throttle(3, 60) // 3 requests per minute
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body(new ZodValidationPipe(registerSchema)) registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body(new ZodValidationPipe(z.object({ refreshToken: z.string().min(10) })))
    body: { refreshToken: string },
  ) {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Body(new ZodValidationPipe(z.object({ refreshToken: z.string().min(10) })))
    body: { refreshToken: string },
  ) {
    await this.authService.logout(body.refreshToken);
    return;
  }

  @UseGuards(AuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getProfile(user.id);
  }

  @UseGuards(AuthGuard)
  @Throttle(30, 60) // 30 requests per minute
  @Get('me/tenants')
  async getMyTenants(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    const tenants = await this.authService.getUserTenants(user.id);
    
    // Audit log: Hub access
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = req.ip || (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || 'unknown';
    
    await this.auditService.log({
      event: AuditEvent.HUB_ACCESS,
      userId: user.id,
      tenantId: null, // Hub is global, no tenant
      metadata: {
        ip,
        userAgent: req.headers['user-agent'],
        tenantCount: tenants.length,
      },
    });
    
    return tenants;
  }

  @UseGuards(AuthGuard)
  @Throttle(10, 60) // 10 requests per minute
  @Post('tenant-token')
  @HttpCode(HttpStatus.OK)
  async issueTenantToken(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(z.object({ tenantId: z.string().uuid() })))
    body: { tenantId: string },
    @Req() req: Request
  ) {
    const result = await this.authService.issueTenantToken(user.id, body.tenantId);
    
    // Audit log: Tenant token exchange (tenant switch)
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = req.ip || (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || 'unknown';
    
    await this.auditService.log({
      event: AuditEvent.TENANT_TOKEN_EXCHANGE,
      userId: user.id,
      tenantId: body.tenantId,
      metadata: {
        ip,
        userAgent: req.headers['user-agent'],
        action: 'tenant_switch',
      },
    });
    
    return result;
  }

  @UseGuards(AuthGuard)
  @Get('resolve-tenant/:slug')
  async resolveTenantForUser(
    @CurrentUser() user: CurrentUserPayload,
    @Param('slug') slug: string,
  ) {
    return this.authService.resolveTenantForUser(user.id, slug);
  }
}
