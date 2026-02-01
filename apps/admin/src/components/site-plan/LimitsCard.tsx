import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@repo/ui';
import type { SitePlanLimits, UsageStats } from './types';

function formatLimit(value?: number): string {
  if (typeof value !== 'number' || value < 0) return 'Unlimited';
  return value.toLocaleString();
}

function renderItem(label: string, current: number, max?: number) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="text-lg font-semibold">{current.toLocaleString()}</p>
      </div>
      <div className="text-sm text-muted">/ {formatLimit(max)}</div>
    </div>
  );
}

type LegacyLimits = {
  maxPageCount?: number;
  pages?: number;
  maxMedia?: number;
  maxMediaItems?: number;
  mediaFiles?: number;
};

type LimitsCardProps = {
  limits?: SitePlanLimits;
  usage: UsageStats;
  loading?: boolean;
  planLabel: string;
};

export function LimitsCard({ limits, usage, loading, planLabel }: LimitsCardProps) {
  const legacy = limits as LegacyLimits | undefined;
  const pageLimit = limits && 'maxPages' in limits
    ? limits.maxPages
    : legacy?.maxPageCount ?? legacy?.pages;
  const mediaLimit = limits && 'maxMediaFiles' in limits
    ? limits.maxMediaFiles
    : legacy?.maxMedia ?? legacy?.maxMediaItems ?? legacy?.mediaFiles;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Limits for {planLabel}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton variant="rectangular" width="100%" height={64} />
            <Skeleton variant="rectangular" width="100%" height={64} />
          </div>
        ) : (
          <div className="space-y-3">
            {renderItem('Pages', usage.pages, pageLimit)}
            {renderItem('Media', usage.media, mediaLimit)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
