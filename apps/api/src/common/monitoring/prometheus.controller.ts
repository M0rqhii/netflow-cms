import { Controller, Get, Header } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Prometheus Metrics Controller
 * Exposes /metrics endpoint for Prometheus scraping
 */
@Controller('metrics')
@Public() // Metrics endpoint should be public for Prometheus scraping
export class PrometheusController {
  constructor(private readonly prometheusService: PrometheusService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4')
  async getMetrics(): Promise<string> {
    return this.prometheusService.getMetrics();
  }
}

