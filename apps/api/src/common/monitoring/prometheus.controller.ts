import { Controller, Get } from '@nestjs/common';
import { PrometheusService } from './prometheus.service';

/**
 * Prometheus Metrics Controller
 * AI Note: Exposes /metrics endpoint for Prometheus scraping
 */
@Controller('metrics')
export class PrometheusController {
  constructor(private readonly prometheusService: PrometheusService) {}

  @Get()
  getMetrics() {
    return this.prometheusService.getMetrics();
  }
}

