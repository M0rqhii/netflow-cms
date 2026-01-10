"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button, Input, Textarea, LoadingSpinner } from '@repo/ui';
import { useToast } from '@/components/ui/Toast';
import { fetchMySites, exchangeSiteToken, getSiteToken, getSeoSettings, updateSeoSettings, type SeoSettings, type UpdateSeoSettingsDto } from '@/lib/api';
import type { SiteInfo } from '@repo/sdk';

export default function SettingsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [seoSettings, setSeoSettings] = useState<SeoSettings | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);

  // SEO form state
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [seoOgTitle, setSeoOgTitle] = useState('');
  const [seoOgDescription, setSeoOgDescription] = useState('');
  const [seoOgImage, setSeoOgImage] = useState('');
  const [seoTwitterCard, setSeoTwitterCard] = useState('summary_large_image');

  const loadData = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const sites = await fetchMySites();
      const foundSite = sites.find((s: SiteInfo) => s.site.slug === slug);

      if (!foundSite) {
        throw new Error(`Site with slug "${slug}" not found`);
      }

      const id = foundSite.siteId;
      setSiteId(id);
      setSite(foundSite);

      let token = getSiteToken(id);
      if (!token) {
        token = await exchangeSiteToken(id);
      }

      const seo = await getSeoSettings(id);
      setSeoSettings(seo);
      setSeoTitle(seo.title || '');
      setSeoDescription(seo.description || '');
      setSeoOgTitle(seo.ogTitle || '');
      setSeoOgDescription(seo.ogDescription || '');
      setSeoOgImage(seo.ogImage || '');
      setSeoTwitterCard(seo.twitterCard || 'summary_large_image');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load settings';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [slug, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSeoSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteId) return;

    try {
      setSaving(true);

      const payload: UpdateSeoSettingsDto = {
        title: seoTitle || null,
        description: seoDescription || null,
        ogTitle: seoOgTitle || null,
        ogDescription: seoOgDescription || null,
        ogImage: seoOgImage || null,
        twitterCard: seoTwitterCard || null,
      };

      const updated = await updateSeoSettings(siteId, payload);
      setSeoSettings(updated);

      toast.push({
        tone: 'success',
        message: 'SEO settings saved successfully',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save SEO settings';
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
      <SitePanelLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner text="Loading settings..." />
        </div>
      </SitePanelLayout>
    );
  }

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Settings"
          description="Manage your site settings, SEO configuration, and domains."
        />

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Site Name</label>
              <Input
                value={site?.site.name || ''}
                disabled
                helperText="Site name cannot be changed here. Contact support to change it."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <Input
                value={site?.site.slug || ''}
                disabled
                helperText="Site slug cannot be changed after creation."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Site ID</label>
              <code className="block text-xs bg-gray-100 px-3 py-2 rounded">
                {siteId || 'N/A'}
              </code>
            </div>
          </CardContent>
        </Card>

        {/* SEO Settings */}
        <Card>
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSeoSave} className="space-y-4">
              <div>
                <Input
                  label="Meta Title"
                  placeholder="e.g., My Awesome Site"
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  helperText="The title that appears in search engine results and browser tabs."
                />
              </div>

              <div>
                <Textarea
                  label="Meta Description"
                  placeholder="e.g., A brief description of your site"
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  rows={3}
                  helperText="A brief description that appears in search engine results (recommended: 150-160 characters)."
                />
              </div>

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-3">Open Graph (Social Media)</h3>
                <div className="space-y-4">
                  <div>
                    <Input
                      label="OG Title"
                      placeholder="e.g., My Awesome Site - Share Title"
                      value={seoOgTitle}
                      onChange={(e) => setSeoOgTitle(e.target.value)}
                      helperText="Title for social media shares (defaults to Meta Title if empty)."
                    />
                  </div>

                  <div>
                    <Textarea
                      label="OG Description"
                      placeholder="e.g., A description for social media shares"
                      value={seoOgDescription}
                      onChange={(e) => setSeoOgDescription(e.target.value)}
                      rows={2}
                      helperText="Description for social media shares (defaults to Meta Description if empty)."
                    />
                  </div>

                  <div>
                    <Input
                      label="OG Image URL"
                      placeholder="https://example.com/image.jpg"
                      value={seoOgImage}
                      onChange={(e) => setSeoOgImage(e.target.value)}
                      helperText="URL to an image for social media shares (recommended: 1200x630px)."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Twitter Card Type</label>
                    <select
                      value={seoTwitterCard}
                      onChange={(e) => setSeoTwitterCard(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="summary">Summary</option>
                      <option value="summary_large_image">Summary with Large Image</option>
                    </select>
                    <p className="text-xs text-muted mt-1">
                      Choose how your site appears when shared on Twitter.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save SEO Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Domains */}
        <Card>
          <CardHeader>
            <CardTitle>Custom Domains</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-12 w-12 mx-auto mb-4 text-muted"
              >
                <path d="M12 8a4 4 0 110 8 4 4 0 010-8z" />
                <path d="M4.5 12a7.5 7.5 0 1115 0 7.5 7.5 0 01-15 0z" />
              </svg>
              <h3 className="text-lg font-semibold mb-2">Custom Domains</h3>
              <p className="text-sm text-muted mb-4">
                Connect your custom domain to this site. This feature is available on Pro and Enterprise plans.
              </p>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Publishing Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Publishing Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="py-8 text-center">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-12 w-12 mx-auto mb-4 text-muted"
              >
                <path d="M5 4.5h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z" />
                <path d="M6.5 7h11M6.5 10h11M6.5 13h7" strokeLinecap="round" />
              </svg>
              <h3 className="text-lg font-semibold mb-2">Publishing Controls</h3>
              <p className="text-sm text-muted mb-4">
                Configure publishing rules, environments, and deployment settings.
              </p>
              <Button variant="outline" disabled>
                Coming Soon
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SitePanelLayout>
  );
}
