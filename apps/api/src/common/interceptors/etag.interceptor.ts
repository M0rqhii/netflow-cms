import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * ETagInterceptor - automatycznie ustawia ETag header dla CollectionItem responses
 * AI Note: Używaj w controllerach które zwracają CollectionItem
 */
@Injectable()
export class ETagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        // Jeśli response zawiera CollectionItem z etag, ustaw header
        if (
          data &&
          typeof data === 'object' &&
          data !== null &&
          'etag' in data &&
          typeof (data as { etag?: unknown }).etag === 'string'
        ) {
          const response = context.switchToHttp().getResponse();
          response.setHeader('ETag', (data as { etag: string }).etag);
        }
        return data;
      })
    );
  }
}

