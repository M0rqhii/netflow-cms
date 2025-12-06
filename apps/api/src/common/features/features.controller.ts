import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { FeaturesService } from './features.service';

/**
 * Features Controller
 * 
 * Provides endpoint to check feature flags (dev/debugging only)
 */
@Controller('features')
@UseGuards(AuthGuard)
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Get()
  getAllFlags() {
    return {
      flags: this.featuresService.getAllFlags(),
    };
  }

  @Get(':feature')
  checkFeature(@Param('feature') feature: string) {
    return {
      feature,
      enabled: this.featuresService.isFeatureEnabled(feature),
    };
  }
}

