import { Module } from '@nestjs/common';
import { RbacController } from './rbac.controller';
import { SiteRbacController } from './site-rbac.controller';
import { RbacService } from './rbac.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RbacEvaluatorService } from './rbac-evaluator.service';

/**
 * RBAC Module
 * 
 * Provides endpoints for:
 * - Organization-level RBAC (orgs/:orgId/rbac) - manages ORG and SITE scope roles
 * - Site-level RBAC (sites/:siteId/rbac) - manages only SITE scope roles
 * - Capabilities registry
 * - Roles (system + custom)
 * - Role assignments
 * - Organization policies
 */
@Module({
  controllers: [RbacController, SiteRbacController],
  providers: [RbacService, RbacEvaluatorService, PrismaService],
  exports: [RbacService, RbacEvaluatorService],
})
export class RbacModule {}





