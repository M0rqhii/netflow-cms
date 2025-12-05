import { Injectable, LoggerService, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';

/**
 * Structured Logger Service
 * AI Note: Provides JSON structured logging with request correlation (traceId)
 * 
 * Features:
 * - JSON formatted logs for easy parsing
 * - Request correlation via traceId
 * - Contextual logging with metadata
 * - Audit log separation
 */
@Injectable()
export class StructuredLoggerService implements LoggerService {
  private readonly logger = new Logger(StructuredLoggerService.name);
  private traceId: string | null = null;

  /**
   * Set trace ID for request correlation
   */
  setTraceId(traceId: string): void {
    this.traceId = traceId;
  }

  /**
   * Generate new trace ID
   */
  generateTraceId(): string {
    return randomUUID();
  }

  /**
   * Get current trace ID
   */
  getTraceId(): string | null {
    return this.traceId;
  }

  /**
   * Log with structured format
   */
  private logStructured(
    level: 'log' | 'error' | 'warn' | 'debug' | 'verbose',
    message: string,
    context?: string,
    metadata?: Record<string, any>,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      traceId: this.traceId,
      context: context || 'Application',
      message,
      ...metadata,
    };

    const logString = JSON.stringify(logEntry);
    
    switch (level) {
      case 'error':
        this.logger.error(logString);
        break;
      case 'warn':
        this.logger.warn(logString);
        break;
      case 'debug':
        this.logger.debug(logString);
        break;
      case 'verbose':
        this.logger.verbose(logString);
        break;
      default:
        this.logger.log(logString);
    }
  }

  /**
   * Log audit event (separate from application logs)
   */
  audit(event: string, metadata: Record<string, any>): void {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      type: 'AUDIT',
      traceId: this.traceId,
      event,
      ...metadata,
    };

    // In production, send to separate audit log storage
    // For now, log with AUDIT prefix
    this.logger.log(JSON.stringify(auditEntry));
  }

  log(message: any, context?: string): void {
    this.logStructured('log', typeof message === 'string' ? message : JSON.stringify(message), context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.logStructured('error', typeof message === 'string' ? message : JSON.stringify(message), context, {
      trace,
    });
  }

  warn(message: any, context?: string): void {
    this.logStructured('warn', typeof message === 'string' ? message : JSON.stringify(message), context);
  }

  debug(message: any, context?: string): void {
    this.logStructured('debug', typeof message === 'string' ? message : JSON.stringify(message), context);
  }

  verbose(message: any, context?: string): void {
    this.logStructured('verbose', typeof message === 'string' ? message : JSON.stringify(message), context);
  }
}




