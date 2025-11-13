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
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
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
        details = responseObj.details || null;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
      
      // In development, include stack trace
      if (process.env.NODE_ENV === 'development') {
        details = {
          stack: exception.stack,
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
      message,
    };

    // Add error field if present
    if (error) {
      responseBody.error = error;
    }

    // Add details in development mode only
    if (details && process.env.NODE_ENV === 'development') {
      responseBody.details = details;
    }

    response.status(status).json(responseBody);
  }
}

