import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { StructuredLoggerService } from './structured-logger.service';

/**
 * Trace ID Middleware
 * AI Note: Adds traceId to requests for correlation across services
 * Sets traceId from X-Trace-Id header or generates new one
 */
@Injectable()
export class TraceIdMiddleware implements NestMiddleware {
  constructor(private readonly structuredLogger: StructuredLoggerService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Get trace ID from header or generate new one
    const traceId = (req.headers['x-trace-id'] as string) || this.structuredLogger.generateTraceId();
    
    // Set trace ID in logger
    this.structuredLogger.setTraceId(traceId);
    
    // Add trace ID to response header
    res.setHeader('X-Trace-Id', traceId);
    
    // Add trace ID to request object for access in controllers
    (req as any).traceId = traceId;
    
    next();
  }
}




