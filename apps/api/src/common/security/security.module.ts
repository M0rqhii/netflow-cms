import { Module } from '@nestjs/common';
import { FileValidatorService } from './file-validator.service';

/**
 * Security Module
 * Provides security-related services (file validation, etc.)
 */
@Module({
  providers: [FileValidatorService],
  exports: [FileValidatorService],
})
export class SecurityModule {}
