import { Module, Global } from '@nestjs/common';
import { StructuredLoggerService } from './structured-logger.service';
import { TraceIdMiddleware } from './trace-id.middleware';

/**
 * Logging Module
 * AI Note: Provides structured logging with request correlation
 */
@Global()
@Module({
  providers: [StructuredLoggerService, TraceIdMiddleware],
  exports: [StructuredLoggerService, TraceIdMiddleware],
})
export class LoggingModule {}




