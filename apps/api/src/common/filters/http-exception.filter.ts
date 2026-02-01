import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Global HTTP Exception Filter
 * Catches all HTTP exceptions and formats error responses consistently
 * 
 * Features:
 * - Consistent error response format
 * - Detailed error messages in development
 * - Sanitized error messages in production
 * - Request logging for debugging
 * - Pretty error formatting in non-production
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isProduction: boolean;

  constructor() {
    const profile = process.env.APP_PROFILE || process.env.NODE_ENV || 'development';
    this.isProduction = profile === 'production';
  }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error: string | object | null = null;
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        error = responseObj.error || null;
        // Include validation errors - check both 'errors' and 'details' fields
        if (responseObj.errors) {
          details = responseObj.errors;
        } else if (responseObj.details) {
          details = responseObj.details;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
      
      // In non-production, include extended metadata
      if (!this.isProduction) {
        details = {
          stack: this.formatStack(exception.stack),
          name: exception.name,
          ...(exception.cause && typeof exception.cause === 'object' ? { cause: exception.cause } : {}),
        };
      }
    }

    // Log error for debugging
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${message}`,
      );
    }

    // Format response
    const responseBody: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    // Add error field if present
    if (error) {
      responseBody.error = error;
    }

    // Add extended details in non-production mode or validation errors
    if (details) {
      responseBody.details = details;
    }
    
    // Add request metadata for debugging (only in non-production)
    if (!this.isProduction) {
      responseBody.request = {
        method: request.method,
        url: request.url,
        headers: this.sanitizeHeaders(request.headers),
        query: request.query,
        body: this.sanitizeBody(request.body),
      };
    }

    response.status(status).json(responseBody);
  }

  /**
   * Format stack trace for better readability
   */
  private formatStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    
    // In non-production, return formatted stack
    if (!this.isProduction) {
      return stack
        .split('\n')
        .map((line, index) => {
          // Highlight first line (error message)
          if (index === 0) {
            return `\x1b[31m${line}\x1b[0m`; // Red color
          }
          return line;
        })
        .join('\n');
    }
    
    return stack;
  }

  /**
   * Sanitize headers (remove sensitive data)
   */
  private sanitizeHeaders(headers: any): Record<string, any> {
    const sanitized: Record<string, any> = {};
    const sensitive = ['authorization', 'cookie', 'x-api-key'];
    
    for (const [key, value] of Object.entries(headers)) {
      if (sensitive.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Sanitize request body (remove sensitive data)
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }
    
    const sanitized = { ...body };
    const sensitive = ['password', 'token', 'secret', 'apiKey', 'api_key'];
    
    for (const key of Object.keys(sanitized)) {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}

