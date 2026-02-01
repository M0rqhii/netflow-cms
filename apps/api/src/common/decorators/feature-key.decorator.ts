
import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'featureKey';

export function FeatureKey(featureKey: string) {
  return SetMetadata(FEATURE_KEY, featureKey);
}
