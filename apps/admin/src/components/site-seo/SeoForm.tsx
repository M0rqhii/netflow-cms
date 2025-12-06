"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@repo/ui';
import { SeoPreviewCard } from './SeoPreviewCard';

type SeoFormState = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  twitterCard: string;
  robots: string;
  sitemap: string;
  canonical: string;
};

const emptyState: SeoFormState = {
  title: '',
  description: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  twitterCard: 'summary_large_image',
  robots: '',
  sitemap: '',
  canonical: '',
};

export function SeoForm() {
  const [form, setForm] = useState<SeoFormState>(emptyState);

  const handleChange = (key: keyof SeoFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic SEO</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-2xl">
          <Input
            label="Site Title"
            placeholder="My Awesome Site"
            value={form.title}
            onChange={handleChange('title')}
          />
          <div>
            <label className="block text-sm font-medium mb-1">Meta Description</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="A brief description of your site"
              value={form.description}
              onChange={handleChange('description')}
            />
            <p className="mt-1 text-xs text-muted">Shown in search results and browser previews.</p>
          </div>
          <Button variant="primary" disabled className="w-full sm:w-auto">
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Social Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label="Open Graph Title"
            placeholder="Title for social media shares"
            value={form.ogTitle}
            onChange={handleChange('ogTitle')}
          />
          <div>
            <label className="block text-sm font-medium mb-1">Open Graph Description</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Description for social media shares"
              value={form.ogDescription}
              onChange={handleChange('ogDescription')}
            />
          </div>
          <Input
            label="Open Graph Image URL"
            placeholder="https://example.com/image.jpg"
            value={form.ogImage}
            onChange={handleChange('ogImage')}
          />
          <div>
            <label className="block text-sm font-medium mb-1">Twitter Card</label>
            <select
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.twitterCard}
              onChange={(e) => setForm((prev) => ({ ...prev, twitterCard: e.target.value }))}
            >
              <option value="" disabled>
                Select card type
              </option>
              <option value="summary">summary</option>
              <option value="summary_large_image">summary_large_image</option>
            </select>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">Preview</h3>
            <SeoPreviewCard
              title="Social preview will appear here."
              description="Configure Open Graph settings to see how your site will look when shared."
              imageUrl={undefined}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Robots.txt"
              placeholder="/robots.txt"
              value={form.robots}
              onChange={handleChange('robots')}
            />
            <Input
              label="Sitemap URL"
              placeholder="/sitemap.xml"
              value={form.sitemap}
              onChange={handleChange('sitemap')}
            />
          </div>
          <Input
            label="Canonical URL"
            placeholder="https://example.com"
            value={form.canonical}
            onChange={handleChange('canonical')}
          />
          <div className="pt-2">
            <Button variant="outline" onClick={() => push({ tone: 'info', message: 'Redirects coming soon.' })}>
              Manage Redirects
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO Checklist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            'Site title configured',
            'Meta description added',
            'Favicon uploaded',
            'Open Graph tags configured',
          ].map((item) => (
            <label key={item} className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" disabled className="rounded" />
              {item}
            </label>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
