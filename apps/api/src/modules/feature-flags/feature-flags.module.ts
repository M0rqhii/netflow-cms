import { Module } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * FeatureFlagsModule - Module for feature flags and plan-based features
 * AI Note: Provides feature flag management for sites
 */
@Module({
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, PrismaService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}









