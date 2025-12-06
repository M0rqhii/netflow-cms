import { Module, Global } from '@nestjs/common';
import { FeaturesService } from './features.service';
import { FeaturesController } from './features.controller';

/**
 * Features Module
 * 
 * Provides feature flags functionality.
 * Global module - can be injected anywhere.
 */
@Global()
@Module({
  controllers: [FeaturesController],
  providers: [FeaturesService],
  exports: [FeaturesService],
})
export class FeaturesModule {}

