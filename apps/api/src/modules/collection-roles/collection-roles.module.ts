import { Module } from '@nestjs/common';
import { CollectionRolesController } from './collection-roles.controller';
import { CollectionRolesService } from './collection-roles.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PrismaOptimizationService } from '../../common/prisma/prisma-optimization.service';

/**
 * Collection Roles Module
 * AI Note: Module for per-collection RBAC management
 */
@Module({
  controllers: [CollectionRolesController],
  providers: [CollectionRolesService, PrismaService, PrismaOptimizationService],
  exports: [CollectionRolesService],
})
export class CollectionRolesModule {}

