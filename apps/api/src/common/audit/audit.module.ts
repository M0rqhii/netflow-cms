import { Module, Global } from '@nestjs/common';
import { AuditLoggerService } from './audit-logger.service';
import { AuditService } from './audit.service';
import { StructuredLoggerService } from '../logging/structured-logger.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Audit Module
 * AI Note: Provides separate audit logging for compliance
 */
@Global()
@Module({
  providers: [AuditLoggerService, AuditService, StructuredLoggerService, PrismaService],
  exports: [AuditLoggerService, AuditService],
})
export class AuditModule {}
