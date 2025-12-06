import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ConfigService } from '@nestjs/config';
import { DebugService } from './debug.service';

/**
 * Request Profiling Interceptor
 * 
 * Logs request path, duration, and status code.
 * Only active when APP_PROFILE !== 'production'.
 */
@Injectable()
export class ProfilingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ProfilingInterceptor.name);
  private readonly isProduction: boolean;

  constructor(
    private configService: ConfigService,
    private debugService: DebugService,
  ) {
    const profile = this.configService.get<string>('APP_PROFILE') || 
                   (this.configService.get<string>('NODE_ENV') === 'production' ? 'production' : 'dev');
    this.isProduction = profile === 'production';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Skip profiling in production
    if (this.isProduction) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, path } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode || 200;
          
          // Log to debug service
          this.debugService.info(
            'ProfilingInterceptor',
            `${method} ${path || url}`,
            {
              method,
              path: path || url,
              duration,
              statusCode,
            },
          );

          // Also log to console for immediate visibility
          this.logger.log(
            `[PROFILE] ${method} ${path || url} - ${statusCode} - ${duration}ms`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error?.status || response.statusCode || 500;
          
          // Log to debug service
          this.debugService.error(
            'ProfilingInterceptor',
            `${method} ${path || url}`,
            {
              method,
              path: path || url,
              duration,
              statusCode,
              error: error?.message,
            },
          );

          // Also log to console
          this.logger.warn(
            `[PROFILE] ${method} ${path || url} - ${statusCode} - ${duration}ms (ERROR)`,
          );
        },
      }),
    );
  }
}

