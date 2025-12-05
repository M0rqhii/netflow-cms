"use client";

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { fetchMyTenants } from '@/lib/api';
import type { TenantInfo } from '@repo/sdk';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from '@/hooks/useTranslations';
import { Button, Input, Card, CardContent } from '@repo/ui';

export default function TenantSettingsPage() {
  const t = useTranslations();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    plan: 'free' as 'free' | 'professional' | 'enterprise',
    branding: {
      logo: '',
      primaryColor: '#2ea0ff',
      secondaryColor: '#18e7b4',
    },
    domains: [] as string[],
  });
  const [newDomain, setNewDomain] = useState('');
  const { push } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const tenants = await fetchMyTenants();
        const foundTenant = tenants.find((t) => t.tenant.slug === slug);
        if (!foundTenant) {
          push({ tone: 'error', message: 'Tenant not found' });
          return;
        }
        setTenant(foundTenant);
        
        // Load tenant settings
        const settings = (foundTenant.tenant as any).settings || {};
        setFormData({
          name: foundTenant.tenant.name,
          slug: foundTenant.tenant.slug,
          plan: (foundTenant.tenant as any).plan || 'free',
          branding: settings.branding || {
            logo: '',
            primaryColor: '#2ea0ff',
            secondaryColor: '#18e7b4',
          },
          domains: settings.domains || [],
        });
      } catch (e) {
        push({ tone: 'error', message: e instanceof Error ? e.message : 'Failed to load tenant' });
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, push]);

  const updateTenant = async () => {
    if (!tenant) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Missing auth token');
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const response = await fetch(`${baseUrl}/tenants/${tenant.tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': tenant.tenantId,
        },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          plan: formData.plan,
          settings: {
            branding: formData.branding,
            domains: formData.domains,
          },
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || response.statusText);
      }

      push({ tone: 'success', message: 'Settings updated successfully' });
      
      // Reload tenant data
      const tenants = await fetchMyTenants();
      const updatedTenant = tenants.find((t) => t.tenantId === tenant.tenantId);
      if (updatedTenant) {
        setTenant(updatedTenant);
      }
    } catch (err) {
      push({ tone: 'error', message: err instanceof Error ? err.message : 'Failed to update settings' });
    } finally {
      setSaving(false);
    }
  };

  const addDomain = () => {
    if (newDomain.trim() && !formData.domains.includes(newDomain.trim())) {
      setFormData({
        ...formData,
        domains: [...formData.domains, newDomain.trim()],
      });
      setNewDomain('');
    }
  };

  const removeDomain = (domain: string) => {
    setFormData({
      ...formData,
      domains: formData.domains.filter(d => d !== domain),
    });
  };

  if (loading) {
    return (
      <div className="container py-8">
        <p className="text-muted">{t('common.loading')}</p>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="container py-8">
        <p className="text-red-600">Tenant not found</p>
        <Link href="/dashboard" className="btn btn-outline mt-4">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Breadcrumbs
        items={[
          { label: t('dashboard.title'), href: '/dashboard' },
          { label: tenant.tenant.name, href: `/tenant/${slug}` },
          { label: t('settings.title') },
        ]}
      />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('settings.title')} · {tenant.tenant.name}</h1>
        <Link href={`/tenant/${slug}`} className="btn btn-outline">{t('common.back')}</Link>
      </div>

      <div className="space-y-6">
        {/* Basic Settings */}
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold mb-4">Podstawowe ustawienia</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nazwa <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Slug <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                  required
                />
                <p className="text-xs text-muted mt-1">Tylko małe litery, cyfry i myślniki</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Plan</label>
                <select
                  className="border rounded w-full p-2 bg-gray-50 dark:bg-gray-800"
                  value={formData.plan}
                  onChange={(e) => setFormData({ ...formData, plan: e.target.value as 'free' | 'professional' | 'enterprise' })}
                >
                  <option value="free">Free</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold mb-4">Branding</h2>
            <div className="space-y-4">
              <Input
                label="Logo URL"
                value={formData.branding.logo}
                onChange={(e) => setFormData({
                  ...formData,
                  branding: { ...formData.branding, logo: e.target.value },
                })}
                placeholder="https://example.com/logo.png"
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Kolor podstawowy</label>
                  <input
                    type="color"
                    className="w-full h-10 border rounded"
                    value={formData.branding.primaryColor}
                    onChange={(e) => setFormData({
                      ...formData,
                      branding: { ...formData.branding, primaryColor: e.target.value },
                    })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Kolor dodatkowy</label>
                  <input
                    type="color"
                    className="w-full h-10 border rounded"
                    value={formData.branding.secondaryColor}
                    onChange={(e) => setFormData({
                      ...formData,
                      branding: { ...formData.branding, secondaryColor: e.target.value },
                    })}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domains */}
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold mb-4">Domeny</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="border rounded w-full p-2"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="example.com"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addDomain())}
                />
                <Button type="button" onClick={addDomain}>Dodaj</Button>
              </div>
              {formData.domains.length > 0 && (
                <div className="space-y-2">
                  {formData.domains.map((domain) => (
                    <div key={domain} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{domain}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeDomain(domain)}
                      >
                        Usuń
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={updateTenant} disabled={saving} isLoading={saving}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

