import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { RbacService } from './rbac.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RbacEvaluatorService } from './rbac-evaluator.service';

/**
 * RBAC Module
 * 
 * Provides endpoints for:
 * - Capabilities registry
 * - Roles (system + custom)
 * - Role assignments
 * - Organization policies
 */
@Module({
  controllers: [RbacController],
  providers: [RbacService, RbacEvaluatorService, PrismaService],
  exports: [RbacService, RbacEvaluatorService],
})
export class RbacModule {}

