"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardContent } from '@repo/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@repo/ui';
import { EmptyState, Button } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { fetchMyTenants, exchangeTenantToken, getTenantToken } from '@/lib/api';
import { createApiClient } from '@repo/sdk';
import type { TenantInfo, SiteDeployment } from '@repo/sdk';

export default function DeploymentsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [deployments, setDeployments] = useState<SiteDeployment[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const apiClient = createApiClient();

  const loadData = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const tenants = await fetchMyTenants();
      const tenant = tenants.find((t: TenantInfo) => t.tenant.slug === slug);

      if (!tenant) {
        throw new Error(`Site with slug "${slug}" not found`);
      }

      const id = tenant.tenantId;
      setTenantId(id);

      let token = getTenantToken(id);
      if (!token) {
        token = await exchangeTenantToken(id);
      }

      const deploymentsData = await apiClient.listDeployments(token, id, { limit: 100 });
      setDeployments(deploymentsData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load deployments';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [slug, apiClient, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge tone={status === 'success' ? 'success' : 'error'}>
        {status === 'success' ? 'Success' : 'Failed'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <SitePanelLayout>
        <div className="space-y-6">
          <SectionHeader
            title="Deployments"
            description="History of publish and deployment operations."
          />
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">Loading...</div>
            </CardContent>
          </Card>
        </div>
      </SitePanelLayout>
    );
  }

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <Breadcrumbs
          items={[
            { label: 'Sites', href: '/sites' },
            { label: slug, href: `/sites/${encodeURIComponent(slug)}` },
            { label: 'Panel', href: `/sites/${encodeURIComponent(slug)}/panel` },
            { label: 'Deployments' },
          ]}
        />
        <SectionHeader
          title={
            <div className="flex items-center gap-2">
              Deployments
              <span
                className="text-sm text-muted cursor-help"
                title="Deployments are automatic processes that publish your changes to hosting. Each publish action creates a deployment record showing success or failure."
              >
                ℹ️
              </span>
            </div>
          }
          description={
            <div>
              <p className="mb-2">History of publish and deployment operations.</p>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2 text-xs text-blue-900 dark:text-blue-100">
                <strong>How it works:</strong> When you publish a page, a deployment is automatically created. Successful deployments make your changes live, failed ones need attention. Check the status and message columns for details.
              </div>
            </div>
          }
        />

        <Card>
          <CardContent className="pt-6">
            {deployments.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title="No deployments yet"
                  description="Deployments will appear here after you publish pages."
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
                      <path d="M5 4.5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1v-13a1 1 0 011-1z" />
                      <path d="M8.5 8h7M8.5 11h7M8.5 14h4" strokeLinecap="round" />
                    </svg>
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deployments.map((deployment) => (
                      <TableRow key={deployment.id}>
                        <TableCell className="font-medium">
                          {formatDate(deployment.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{deployment.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{deployment.env}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(deployment.status)}</TableCell>
                        <TableCell className="text-muted text-sm">
                          {deployment.message || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SitePanelLayout>
  );
}





