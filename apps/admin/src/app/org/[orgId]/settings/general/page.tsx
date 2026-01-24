"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button, Input, LoadingSpinner } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { getAuthToken } from '@/lib/api';

type OrganizationData = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export default function OrgGeneralSettingsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params?.orgId as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const loadData = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error('Missing auth token. Please login.');
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

      const res = await fetch(`${baseUrl}/organizations/${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}` ,
          'X-Org-ID': orgId,
        },
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(errorText || 'Failed to load organization');
      }

      const data = await res.json();
      setOrganization(data);
      setName(data.name || '');
      setSlug(data.slug || '');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load organization';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [orgId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !name) return;

    try {
      setSaving(true);

      const token = getAuthToken();
      if (!token) {
        throw new Error('Missing auth token. Please login.');
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${baseUrl}/organizations/${orgId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}` ,
          'Content-Type': 'application/json',
          'X-Org-ID': orgId,
        },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => '');
        throw new Error(errorText || 'Failed to save organization settings');
      }

      toast.push({
        tone: 'success',
        message: 'Organization settings saved successfully',
      });

      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save organization settings';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner text="Loading organization settings..." />
      </div>
    );
  }

  if (!organization) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <p className="text-muted">Organization not found</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Input
                label="Organization Name"
                placeholder="e.g., My Company"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                helperText="The display name of your organization."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <Input
                value={slug}
                onChange={(e) => {
                  const newSlug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                  setSlug(newSlug);
                }}
                pattern="[a-z0-9-]+"
                helperText="URL-friendly identifier (lowercase, hyphens only). Cannot be changed after creation."
                disabled
              />
              <p className="text-xs text-muted mt-1">Slug cannot be changed after creation.</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Organization ID</label>
              <code className="block text-xs bg-gray-100 px-3 py-2 rounded">
                {organization.id}
              </code>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Plan</label>
              <div className="flex items-center gap-2">
                <Badge tone="default">{organization.plan}</Badge>
                <span className="text-sm text-muted">
                  Plan management is available in the Billing section.
                </span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <h3 className="font-semibold text-red-900 mb-2">Delete Organization</h3>
              <p className="text-sm text-red-700 mb-4">
                Once you delete an organization, there is no going back. Please be certain.
              </p>
              <Button variant="danger" disabled>
                Delete Organization
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
