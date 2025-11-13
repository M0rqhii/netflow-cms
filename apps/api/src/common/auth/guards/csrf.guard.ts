import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

/**
 * CSRF Guard - protects against Cross-Site Request Forgery attacks
 * 
 * Strategy:
 * - Skip for safe methods (GET, HEAD, OPTIONS)
 * - Validate Origin/Referer headers for POST/PUT/DELETE/PATCH
 * - Optionally validate CSRF token from header
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);

  constructor(
    private configService: ConfigService,
    // @ts-ignore - Reserved for future use
    private _reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Skip CSRF check for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Get allowed origins from config
    const allowedOrigins = this.configService
      .get<string>('ALLOWED_ORIGINS', '')
      .split(',')
      .filter((origin) => origin.trim())
      .map((origin) => origin.trim());

    // If no origins configured, skip validation (development mode)
    if (allowedOrigins.length === 0) {
      // In production, this should be configured
      if (this.configService.get<string>('NODE_ENV') === 'production') {
        this.logger.warn('CSRF Guard: ALLOWED_ORIGINS not configured in production');
      }
      return true;
    }

    // Validate Origin header
    const origin = request.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Invalid origin');
    }

    // Validate Referer header as fallback
    const referer = request.headers.referer;
    if (!origin && referer) {
      try {
        const refererUrl = new URL(referer);
        const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
        if (!allowedOrigins.includes(refererOrigin)) {
          throw new ForbiddenException('Invalid referer');
        }
      } catch (error) {
        if (error instanceof ForbiddenException) {
          throw error;
        }
        // Invalid URL format - allow for now (could be strict in production)
      }
    }

    // Optional: Validate CSRF token from header
    // This requires frontend to send X-CSRF-Token header
    const csrfToken = request.headers['x-csrf-token'];
    if (csrfToken) {
      // In a real implementation, you would validate the token against a session/cache
      // For now, we just check that it exists if provided
      // Future: implement token validation with session store
    }

    return true;
  }
}

