import React from 'react';
import { Button } from './Button';

export interface UpgradePlanBannerProps {
  currentPlan: 'free' | 'professional' | 'enterprise';
  limitType: string;
  currentUsage: number;
  limit: number;
  onUpgrade?: () => void;
  className?: string;
}

/**
 * UpgradePlanBanner Component
 * AI Note: Displays plan limit warnings and upgrade prompts
 */
export const UpgradePlanBanner: React.FC<UpgradePlanBannerProps> = ({
  currentPlan,
  limitType,
  currentUsage,
  limit,
  onUpgrade,
  className,
}) => {
  const usagePercentage = (currentUsage / limit) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = usagePercentage >= 100;

  if (!isNearLimit) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border p-4 ${
        isAtLimit
          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
          : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm">
            {isAtLimit ? 'Plan Limit Reached' : 'Approaching Plan Limit'}
          </h3>
          <p className="text-sm text-muted mt-1">
            You've used {currentUsage} of {limit === Infinity ? 'unlimited' : limit} {limitType}
            {isAtLimit && '. Upgrade to continue.'}
          </p>
        </div>
        {onUpgrade && (
          <Button variant="primary" size="sm" onClick={onUpgrade}>
            Upgrade Plan
          </Button>
        )}
      </div>
      <div className="mt-3 w-full bg-surface rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isAtLimit ? 'bg-red-500' : 'bg-yellow-500'
          }`}
          style={{ width: `${Math.min(usagePercentage, 100)}%` }}
        />
      </div>
    </div>
  );
};




