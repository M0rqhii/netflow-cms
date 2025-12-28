"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input } from '@repo/ui';
import { SeoPreviewCard } from './SeoPreviewCard';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from '@/hooks/useTranslations';

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
  const t = useTranslations();
  const [form, setForm] = useState<SeoFormState>(emptyState);
  const { push } = useToast();

  const handleChange = (key: keyof SeoFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('seo.basicSeo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-2xl">
          <Input
            label={t('seo.metaTitle')}
            placeholder={t('seo.metaTitlePlaceholder')}
            value={form.title}
            onChange={handleChange('title')}
          />
          <div>
            <label htmlFor="meta-description" className="block text-sm font-medium mb-1">{t('seo.metaDescription')}</label>
            <textarea
              id="meta-description"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder={t('seo.metaDescriptionPlaceholder')}
              value={form.description}
              onChange={handleChange('description')}
              aria-describedby="meta-description-hint"
            />
            <p id="meta-description-hint" className="mt-1 text-xs text-muted">{t('seo.metaDescriptionHint')}</p>
          </div>
          <Button variant="primary" disabled className="w-full sm:w-auto" onClick={() => push({ tone: 'info', message: t('seo.savingDisabledInPreview') })}>
            {t('seo.saveSeo')}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('seo.socialAndSharing')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            label={t('seo.openGraphTitle')}
            placeholder={t('seo.openGraphTitlePlaceholder')}
            value={form.ogTitle}
            onChange={handleChange('ogTitle')}
          />
          <div>
            <label htmlFor="og-description" className="block text-sm font-medium mb-1">{t('seo.openGraphDescription')}</label>
            <textarea
              id="og-description"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder={t('seo.openGraphDescriptionPlaceholder')}
              value={form.ogDescription}
              onChange={handleChange('ogDescription')}
            />
          </div>
          <Input
            label={t('seo.openGraphImage')}
            placeholder={t('seo.openGraphImagePlaceholder')}
            value={form.ogImage}
            onChange={handleChange('ogImage')}
          />
          <div>
            <label htmlFor="twitter-card" className="block text-sm font-medium mb-1">{t('seo.twitterCard')}</label>
            <select
              id="twitter-card"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.twitterCard}
              onChange={(e) => setForm((prev) => ({ ...prev, twitterCard: e.target.value }))}
            >
              <option value="" disabled>
                {t('seo.selectCardType')}
              </option>
              <option value="summary">{t('seo.summary')}</option>
              <option value="summary_large_image">{t('seo.summaryLargeImage')}</option>
            </select>
          </div>

          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-semibold">{t('seo.preview')}</h3>
            <SeoPreviewCard
              title={t('seo.socialPreviewWillAppearHere')}
              description={t('seo.configureOpenGraphSettings')}
              imageUrl={undefined}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('seo.advancedSettings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t('seo.robotsTxt')}
              placeholder={t('seo.robotsTxtPlaceholder')}
              value={form.robots}
              onChange={handleChange('robots')}
            />
            <Input
              label={t('seo.sitemapUrl')}
              placeholder={t('seo.sitemapUrlPlaceholder')}
              value={form.sitemap}
              onChange={handleChange('sitemap')}
            />
          </div>
          <Input
            label={t('seo.canonicalUrl')}
            placeholder={t('seo.canonicalUrlPlaceholder')}
            value={form.canonical}
            onChange={handleChange('canonical')}
          />
          <div className="pt-2">
            <Button variant="outline" onClick={() => push({ tone: 'info', message: t('seo.redirectsComingSoon') })}>
              {t('seo.manageRedirects')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('seo.seoChecklist')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            t('seo.siteTitleConfigured'),
            t('seo.metaDescriptionAdded'),
            t('seo.faviconUploaded'),
            t('seo.openGraphTagsConfigured'),
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
