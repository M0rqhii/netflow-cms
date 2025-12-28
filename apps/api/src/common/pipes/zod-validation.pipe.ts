import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException, Logger } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

/**
 * ZodValidationPipe - validates request data using Zod schemas
 * AI Note: Use this pipe to validate DTOs with Zod schemas
 * Example: @Body(new ZodValidationPipe(loginSchema)) loginDto: LoginDto
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  private readonly logger = new Logger(ZodValidationPipe.name);

  constructor(private schema: ZodSchema) {}

  transform(value: unknown, _metadata: ArgumentMetadata) {
    this.logger.debug(`Validating input: ${JSON.stringify(value)}`);
    try {
      const parsedValue = this.schema.parse(value);
      this.logger.debug(`Validation successful: ${JSON.stringify(parsedValue)}`);
      return parsedValue;
    } catch (error) {
      this.logger.error(`Validation error caught: ${error instanceof Error ? error.constructor.name : typeof error}`);
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        // Log validation errors for debugging
        this.logger.warn(`Validation failed: ${JSON.stringify(errors)}`);
        this.logger.debug(`Input value: ${JSON.stringify(value)}`);
        
        throw new BadRequestException({
          message: 'Validation failed',
          errors,
        });
      }
      // Log non-ZodError for debugging
      this.logger.error(`Non-ZodError validation failure: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        this.logger.error(`Stack trace: ${error.stack}`);
      }
      // If it's an Error but not ZodError, try to extract useful info
      if (error instanceof Error) {
        throw new BadRequestException({
          message: 'Validation failed',
          error: error.message,
          name: error.name,
        });
      }
      throw new BadRequestException('Validation failed');
    }
  }
}





