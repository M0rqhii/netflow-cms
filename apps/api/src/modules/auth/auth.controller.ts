import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Get, Param, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, loginSchema, registerSchema } from './dto';
import { Public } from '../../common/auth/decorators/public.decorator';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuditService, AuditEvent } from '../../common/audit/audit.service';
import { z } from 'zod';
import { Request } from 'express';

@ApiTags('auth')
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
  @ApiOperation({ summary: 'User login', description: 'Authenticate user and return JWT token' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiBody({ description: 'Login credentials', schema: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' }, orgId: { type: 'string' } } } })
  async login(@Body(new ZodValidationPipe(loginSchema)) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Public()
  @Throttle(20, 60) // 20 requests per minute
  @Get('invite/:token')
  async getInvite(@Param('token') token: string) {
    return this.authService.getInviteDetails(token);
  }

  @Public()
  @Throttle(5, 60) // 5 requests per minute
  @Post('invite/accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(
    @Body(new ZodValidationPipe(z.object({
      token: z.string().min(10),
      password: z.string().min(6),
      preferredLanguage: z.enum(['pl', 'en']).optional(),
    }))) body: { token: string; password: string; preferredLanguage?: 'pl' | 'en' }
  ) {
    return this.authService.acceptInvite(body);
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
  @Throttle(1000, 60) // 1000 requests per minute (very high limit for development)
  @Get('me/orgs')
  async getMyOrgs(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    const orgs = await this.authService.getUserOrgs(user.id);
    
    // Audit log: Hub access
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = req.ip || (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || 'unknown';
    
    await this.auditService.log({
      event: AuditEvent.HUB_ACCESS,
      userId: user.id,
      orgId: null, // Hub is global
      metadata: {
        ip,
        userAgent: req.headers['user-agent'],
        orgCount: orgs.length,
      },
    });
    
    return orgs;
  }

  @UseGuards(AuthGuard)
  @Throttle(10, 60) // 10 requests per minute
  @Post('org-token')
  @HttpCode(HttpStatus.OK)
  async issueOrgToken(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(z.object({ orgId: z.string().uuid() })))
    body: { orgId: string },
    @Req() req: Request
  ) {
    const result = await this.authService.issueOrgToken(user.id, body.orgId);
    
    // Audit log: Org token exchange
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = req.ip || (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || 'unknown';
    
    await this.auditService.log({
      event: AuditEvent.ORG_TOKEN_EXCHANGE,
      userId: user.id,
      orgId: body.orgId,
      metadata: {
        ip,
        userAgent: req.headers['user-agent'],
        action: 'org_switch',
      },
    });
    
    return result;
  }

  @UseGuards(AuthGuard)
  @Get('resolve-org/:slug')
  async resolveOrgForUser(
    @CurrentUser() user: CurrentUserPayload,
    @Param('slug') slug: string,
  ) {
    return this.authService.resolveOrgForUser(user.id, slug);
  }

  @UseGuards(AuthGuard)
  @Throttle(10, 60) // 10 requests per minute
  @Post('site-token')
  @HttpCode(HttpStatus.OK)
  async issueSiteToken(
    @CurrentUser() user: CurrentUserPayload,
    @Body(new ZodValidationPipe(z.object({ siteId: z.string().uuid() })))
    body: { siteId: string },
    @Req() req: Request
  ) {
    const result = await this.authService.issueSiteToken(user.id, body.siteId);
    
    // Audit log: Site token exchange
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = req.ip || (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor) || 'unknown';
    
    await this.auditService.log({
      event: AuditEvent.ORG_TOKEN_EXCHANGE, // Reuse same event type for backward compatibility
      userId: user.id,
      orgId: user.orgId || null,
      siteId: body.siteId,
      metadata: {
        ip,
        userAgent: req.headers['user-agent'],
        action: 'site_switch',
        siteId: body.siteId,
      },
    });
    
    return result;
  }
}
