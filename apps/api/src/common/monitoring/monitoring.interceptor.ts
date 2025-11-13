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

/**
 * Monitoring Interceptor
 * Tracks request performance and cache usage
 */
@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MonitoringInterceptor.name);

  constructor(
    // @ts-ignore - Reserved for future use
    private _monitoringService: MonitoringService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const route = `${method} ${url}`;
          
          // Track slow requests (> 1000ms)
          if (duration > 1000) {
            this.logger.warn(`Slow request: ${route} took ${duration}ms`);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const route = `${method} ${url}`;
          this.logger.error(`Request failed: ${route} took ${duration}ms`, error.stack);
        },
      }),
    );
  }
}

