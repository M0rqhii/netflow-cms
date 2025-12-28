"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { Card, CardContent, EmptyState, Skeleton, Button as UiButton } from '@repo/ui';
import type { TenantInfo } from '@repo/sdk';
import { createApiClient } from '@repo/sdk';
import { getFeatureByKey, getPlanConfig, getPlanLimits } from '@repo/schemas';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { FeatureMatrix } from '@/components/site-plan/FeatureMatrix';
import { LimitsCard } from '@/components/site-plan/LimitsCard';
import type { FeatureMatrixRow, SiteFeaturesResponse, UsageStats } from '@/components/site-plan/types';
import { fetchMyTenants, exchangeTenantToken, getTenantToken, fetchTenantStats } from '@/lib/api';

export default function SitePlanPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;

  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [features, setFeatures] = useState<SiteFeaturesResponse | null>(null);
  const [usage, setUsage] = useState<UsageStats>({ pages: 0, media: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const toast = useToast();

  const apiClient = useMemo(() => createApiClient(), []);

  const load = useCallback(async () => {
    if (!slug) return;

    setLoading(true);
    setError(null);

    try {
      const sites = await fetchMyTenants();
      const current = sites.find((item) => item.tenant.slug === slug) || null;

      if (!current) {
        setTenant(null);
        setFeatures(null);
        setError('Site not found');
        return;
      }

      setTenant(current);

      let token = getTenantToken(current.tenantId);
      if (!token) {
        token = await exchangeTenantToken(current.tenantId);
      }

      const [featuresResponse, stats, pages] = await Promise.all([
        apiClient.getSiteFeatures(token, current.tenantId) as Promise<SiteFeaturesResponse>,
        fetchTenantStats(current.tenantId).catch(() => null),
        apiClient.listPages(token, current.tenantId).catch(() => []),
      ]);

      const limits = featuresResponse.limits ?? getPlanLimits(featuresResponse.plan);
      setFeatures({ ...featuresResponse, limits });
      setUsage({
        pages: Array.isArray(pages) ? pages.length : 0,
        media: (stats as any)?.media ?? 0,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load plan data';
      setError(message);
      toast.push({ tone: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [slug, apiClient, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const featureRows = useMemo<FeatureMatrixRow[]>(() => {
    if (!features) return [];

    const keys = new Set<string>();
    features.planFeatures.forEach((k) => keys.add(k));
    features.overrides.forEach((o) => keys.add(o.featureKey));
    features.effective.forEach((k) => keys.add(k));

    return Array.from(keys)
      .map((key) => {
        const meta = getFeatureByKey(key);
        const override = features.overrides.find((o) => o.featureKey === key) || null;

        return {
          key,
          name: meta?.name ?? key,
          description: meta?.description ?? 'No description provided yet',
          inPlan: features.planFeatures.includes(key),
          overrideState: override ? override.enabled : null,
          effective: features.effective.includes(key),
          experimental: meta?.experimental,
        } as FeatureMatrixRow;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [features]);

  const planLabel = useMemo(() => {
    if (!features) return '';
    return getPlanConfig(features.plan)?.name ?? features.plan;
  }, [features]);

  const handleToggle = async (featureKey: string, nextEnabled: boolean) => {
    if (!tenant || !features) return;

    let token = getTenantToken(tenant.tenantId);
    if (!token) {
      try {
        token = await exchangeTenantToken(tenant.tenantId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to authenticate';
        toast.push({ tone: 'error', message });
        return;
      }
    }

    setPendingKey(featureKey);
    try {
      await apiClient.setFeatureOverride(token, tenant.tenantId, featureKey, nextEnabled);
      toast.push({ tone: 'success', message: 'Override updated' });
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update override';
      toast.push({ tone: 'error', message });
    } finally {
      setPendingKey(null);
    }
  };

  const renderHeader = () => (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <Breadcrumbs
          items={[
            { label: 'Sites', href: '/sites' },
            { label: slug, href: `/sites/${encodeURIComponent(slug)}` },
            { label: 'Plan & Features' },
          ]}
        />
        <h1 className="text-2xl font-bold mt-2">Plan & Features</h1>
        <p className="text-sm text-muted mt-1">Review plan features, limits, and overrides for this site.</p>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {planLabel ? <Badge>Plan: {planLabel}</Badge> : null}
          {tenant ? <Badge tone="default">Slug: {tenant.tenant.slug}</Badge> : null}
          {features ? <Badge tone="default">Effective features: {features.effective.length}</Badge> : null}
        </div>
      </div>
      <div className="flex gap-2">
        <UiButton variant="outline" disabled>Change plan</UiButton>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="container py-8">
        {renderHeader()}
        <div className="space-y-6">
          <Card>
            <CardContent>
              <div className="py-6 space-y-3">
                <Skeleton variant="text" width={240} height={20} />
                <Skeleton variant="rectangular" width="100%" height={72} />
                <Skeleton variant="rectangular" width="100%" height={72} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <Skeleton variant="rectangular" width="100%" height={320} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !tenant || !features) {
    return (
      <div className="container py-8">
        {renderHeader()}
        <Card>
          <CardContent>
            <EmptyState
              title={error || 'No data found'}
              description="We could not load plan & features for this site."
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {renderHeader()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-1">
          <LimitsCard
            planLabel={planLabel}
            limits={features.limits}
            usage={usage}
            loading={false}
          />
        </div>
        <div className="lg:col-span-2">
          <Card>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted">Current plan</p>
                    <p className="text-lg font-semibold">{planLabel}</p>
                  </div>
                  <Badge tone="default">{features.planFeatures.length} features included</Badge>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    <strong>Feature Overrides:</strong> Effective features show what is active after applying overrides. Enabling a feature here sets an override, even if it is not included in your plan. This may result in additional charges or require a plan upgrade.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <FeatureMatrix
        rows={featureRows}
        onToggle={(key, nextEnabled) => handleToggle(key, nextEnabled)}
        pendingKey={pendingKey}
      />
    </div>
  );
}
