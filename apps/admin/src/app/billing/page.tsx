"use client";

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { EmptyState, Skeleton } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';

// Mock data
const mockSubscriptions = [
  {
    id: '1',
    plan: 'professional',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 86400000 * 30).toISOString(),
    tenant: { name: 'Acme Corporation' },
  },
  {
    id: '2',
    plan: 'free',
    status: 'active',
    currentPeriodEnd: new Date(Date.now() + 86400000 * 15).toISOString(),
    tenant: { name: 'Tech Startup' },
  },
];

const mockInvoices = [
  {
    id: '1',
    amount: 29.99,
    currency: 'USD',
    status: 'paid',
    createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
    tenant: { name: 'Acme Corporation' },
  },
  {
    id: '2',
    amount: 0,
    currency: 'USD',
    status: 'paid',
    createdAt: new Date(Date.now() - 86400000 * 60).toISOString(),
    tenant: { name: 'Tech Startup' },
  },
];

export default function BillingPage() {
  const [loading] = useState(false);

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Billing</h1>

      {/* Active Subscriptions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Current Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8">
              <Skeleton variant="rectangular" width="100%" height={200} />
            </div>
          ) : mockSubscriptions.length === 0 ? (
            <EmptyState
              title="No active subscriptions"
              description="Subscriptions will appear here once created"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b">
                    <th className="py-2">Site</th>
                    <th className="py-2">Plan</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Next Renewal</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSubscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-gray-200">
                      <td className="py-2">{sub.tenant?.name || '-'}</td>
                      <td className="py-2">{sub.plan}</td>
                      <td className="py-2">
                        <Badge tone="success">{sub.status}</Badge>
                      </td>
                      <td className="py-2">
                        {sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8">
              <Skeleton variant="rectangular" width="100%" height={200} />
            </div>
          ) : mockInvoices.length === 0 ? (
            <EmptyState
              title="No payment history"
              description="Invoices will appear here once available"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted border-b">
                    <th className="py-2">Site</th>
                    <th className="py-2">Date</th>
                    <th className="py-2">Amount</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mockInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-200">
                      <td className="py-2">{inv.tenant?.name || '-'}</td>
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
        </CardContent>
      </Card>
    </div>
  );
}
