
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from '../../decorators/feature-key.decorator';
import { FeatureFlagsService } from '../../../modules/feature-flags/feature-flags.service';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const featureKey = this.reflector.getAllAndOverride<string | undefined>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!featureKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const siteId = request?.params?.siteId || request?.currentSiteId;
    if (!siteId) {
      return true;
    }

    const enabled = await this.featureFlags.isFeatureEnabled(siteId, featureKey);
    if (!enabled) {
      throw new ForbiddenException(`Feature "${featureKey}" is disabled for this site`);
    }

    return true;
  }
}
