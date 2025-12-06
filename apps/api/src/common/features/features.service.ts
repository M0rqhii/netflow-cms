import { Injectable } from '@nestjs/common';

/**
 * Feature Flags Service
 * 
 * Provides feature flag functionality using static configuration.
 * No UI toggle yet - just static config.
 * 
 * Usage:
 * - isFeatureEnabled('pageBuilder')
 * - isFeatureEnabled('advancedSeo')
 */
@Injectable()
export class FeaturesService {
  private readonly flags: Record<string, boolean>;

  constructor() {
    // Static feature flags configuration
    // In the future, this could be loaded from database or environment variables
    this.flags = {
      pageBuilder: true,
      advancedSeo: true,
      // Add more feature flags here as needed
    };
  }

  /**
   * Check if a feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    return this.flags[feature] === true;
  }

  /**
   * Get all feature flags (for debugging)
   */
  getAllFlags(): Record<string, boolean> {
    return { ...this.flags };
  }
}

