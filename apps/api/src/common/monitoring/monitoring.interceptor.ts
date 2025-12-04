import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MonitoringService } from './monitoring.service';
import { PrometheusService } from './prometheus.service';

/**
 * Monitoring Interceptor
 * Tracks request performance and cache usage
 */
@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MonitoringInterceptor.name);

  constructor(
    private monitoringService: MonitoringService,
    private prometheusService: PrometheusService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (response) => {
          const duration = Date.now() - startTime;
          const route = this.getRoute(url);
          const statusCode = response?.statusCode || 200;
          
          // Track in Prometheus
          this.prometheusService.trackHttpRequest(method, route, statusCode, duration);
          
          // Track in monitoring service
          this.monitoringService.trackQuery('http', method, duration);
          
          // Track slow requests (> 1000ms)
          if (duration > 1000) {
            this.logger.warn(`Slow request: ${method} ${route} took ${duration}ms`);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const route = this.getRoute(url);
          const statusCode = error?.status || 500;
          
          // Track error in Prometheus
          this.prometheusService.trackHttpRequest(method, route, statusCode, duration);
          
          this.logger.error(`Request failed: ${method} ${route} took ${duration}ms`, error.stack);
        },
      }),
    );
  }

  /**
   * Extract route from URL (remove query params and IDs)
   */
  private getRoute(url: string): string {
    // Remove query parameters
    const path = url.split('?')[0];
    // Replace UUIDs with :id
    return path.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id');
  }
}

