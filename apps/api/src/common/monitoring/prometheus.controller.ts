import { Controller, Get, Header, ForbiddenException, Req } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';
import { Public } from '../auth/decorators/public.decorator';
import { Request } from 'express';

/**
 * Prometheus Metrics Controller
 * Exposes /metrics endpoint for Prometheus scraping
 * Access restricted to localhost in production
 */
@Controller('metrics')
@Public()
export class PrometheusController {
  private readonly isProd = process.env.NODE_ENV === 'production';

  constructor(private readonly prometheusService: PrometheusService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getMetrics(@Req() req: Request): Promise<string> {
    if (this.isProd) {
      const ip = req.ip || req.socket?.remoteAddress || '';
      const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
      if (!isLocal) {
        throw new ForbiddenException('Metrics endpoint is restricted to localhost in production');
      }
    }
    return this.prometheusService.getMetrics();
  }
}

