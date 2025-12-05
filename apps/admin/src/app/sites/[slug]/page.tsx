"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@repo/ui';

// Mock data
const mockSite = {
  tenantId: '1',
  role: 'admin',
  tenant: {
    id: '1',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    plan: 'professional',
  },
};

export default function SiteOverviewPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const [loading] = useState(false);

  // In real app, we'd fetch site by slug
  const siteInfo = mockSite;

  if (loading) {
    return (
      <div className="container py-8">
        <div className="space-y-4">
          <Skeleton variant="text" width={200} height={32} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent>
                <Skeleton variant="text" width={150} height={24} className="mb-4" />
                <Skeleton variant="text" width={100} height={16} />
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <Skeleton variant="text" width={150} height={24} className="mb-4" />
                <Skeleton variant="text" width={100} height={16} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/sites" className="text-sm text-muted hover:text-foreground">
            ← Sites
          </Link>
        </div>
        <h1 className="text-2xl font-bold">{siteInfo.tenant.name}</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge>{siteInfo.role}</Badge>
          <span className="text-sm text-muted">•</span>
          <span className="text-sm text-muted">Plan: {siteInfo.tenant.plan || 'Basic'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-muted">Name</dt>
                <dd className="font-medium">{siteInfo.tenant.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Slug</dt>
                <dd className="font-mono text-sm">{siteInfo.tenant.slug}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted">Plan</dt>
                <dd>{siteInfo.tenant.plan || 'Basic'}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href={`/sites/${slug}/users`} className="block">
                <Button variant="outline" className="w-full">Manage Users</Button>
              </Link>
              <Link href={`/sites/${slug}/billing`} className="block">
                <Button variant="outline" className="w-full">Billing</Button>
              </Link>
              <div className="opacity-50 cursor-not-allowed">
                <Button variant="outline" className="w-full" disabled>
                  Open Site Panel (Coming Soon)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
