"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { EmptyState, Skeleton } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';

// Mock data
const mockSubscription = {
  id: '1',
  plan: 'professional',
  status: 'active',
  currentPeriodEnd: new Date(Date.now() + 86400000 * 30).toISOString(),
};

const mockInvoices = [
  { id: '1', amount: 29.99, currency: 'USD', status: 'paid', createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
  { id: '2', amount: 29.99, currency: 'USD', status: 'paid', createdAt: new Date(Date.now() - 86400000 * 60).toISOString() },
  { id: '3', amount: 29.99, currency: 'USD', status: 'pending', createdAt: new Date(Date.now() - 86400000 * 90).toISOString() },
];

export default function SiteBillingPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const [loading] = useState(false);

  return (
    <div className="container py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Link href={`/sites/${slug}`} className="text-sm text-muted hover:text-foreground">
            ← Back to Site
          </Link>
        </div>
        <h1 className="text-2xl font-bold">Billing</h1>
      </div>

      <Card>
        <CardContent>
          {loading ? (
            <div className="py-8">
              <Skeleton variant="text" width={200} height={24} className="mb-4" />
              <Skeleton variant="rectangular" width="100%" height={200} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Plan */}
              <div>
                <h2 className="font-semibold mb-4">Current Plan</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <dt className="text-sm text-muted mb-1">Plan</dt>
                    <dd className="text-lg font-semibold">{mockSubscription.plan}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted mb-1">Status</dt>
                    <dd className="text-lg">
                      <Badge tone="success">{mockSubscription.status}</Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted mb-1">Next Renewal</dt>
                    <dd className="text-lg">
                      {new Date(mockSubscription.currentPeriodEnd).toLocaleDateString()}
                    </dd>
                  </div>
                </div>
              </div>

              {/* Change Plan Button */}
              <div>
                <Button
                  variant="primary"
                  onClick={() => alert('Change plan feature coming soon (UI only)')}
                >
                  Change Plan
                </Button>
              </div>

              {/* Billing History */}
              <div>
                <h2 className="font-semibold mb-4">Billing History</h2>
                {mockInvoices.length === 0 ? (
                  <EmptyState
                    title="No billing history"
                    description="Invoices will appear here once available"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-muted border-b">
                          <th className="py-2">Date</th>
                          <th className="py-2">Amount</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockInvoices.map((inv) => (
                          <tr key={inv.id} className="border-b border-gray-200">
                            <td className="py-2">{new Date(inv.createdAt).toLocaleDateString()}</td>
                            <td className="py-2">
                              {inv.amount} {inv.currency}
                            </td>
                            <td className="py-2">
                              <Badge tone={inv.status === 'paid' ? 'success' : 'default'}>
                                {inv.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
