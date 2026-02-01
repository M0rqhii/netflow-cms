"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button } from '@repo/ui';
import { Input } from '@repo/ui';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from '@/hooks/useTranslations';
import { createSite } from '@/lib/api';
import { trackOnboardingSuccess } from '@/lib/onboarding';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 3;
}

export default function NewSitePage() {
  const t = useTranslations();
  const router = useRouter();
  const { push } = useToast();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [autoGenerateSlug, setAutoGenerateSlug] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (value: string) => {
    setName(value);
    if (autoGenerateSlug) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlug(value);
    setAutoGenerateSlug(false);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const normalizedName = name.trim();
    const normalizedSlug = slugify(slug.trim());

    // Validation
    if (!normalizedName || normalizedName.length < 3) {
      setError(t('newSite.nameMustBeAtLeast3Characters'));
      return;
    }

    if (!normalizedSlug || !isValidSlug(normalizedSlug)) {
      setSlug(normalizedSlug);
      setError(t('newSite.slugMustBeAtLeast3Characters'));
      return;
    }

    setSlug(normalizedSlug);
    setLoading(true);

    try {
      const created = await createSite({ name: normalizedName, slug: normalizedSlug });
      const createdObj = created as { slug?: string; site?: { slug?: string } } | null;
      const redirectSlug = createdObj?.slug || createdObj?.site?.slug || normalizedSlug;

      push({
        tone: 'success',
        message: t('newSite.siteCreatedSuccessfully'),
      });
      trackOnboardingSuccess('site_created');

      router.push(redirectSlug ? `/sites/${redirectSlug}` : '/sites');
    } catch (err) {
      const message = err instanceof Error ? err.message : t('newSite.failedToCreateSite');
      setError(message);
      push({
        tone: 'error',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-3">
        {/* Header */}
        <div className="mb-2 sm:mb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-1.5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mb-0.5 sm:mb-1">
                {t('newSite.title')}
              </h1>
              <p className="text-xs sm:text-sm text-muted">
                Utwórz nową stronę w systemie
              </p>
            </div>
            <Link href="/sites">
              <Button variant="outline" className="w-full sm:w-auto text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3">{t('common.cancel')}</Button>
            </Link>
          </div>
        </div>

        <Card className="border-0 shadow-sm max-w-2xl">
          <CardHeader className="pb-1.5 sm:pb-2 px-3 sm:px-4 pt-2 sm:pt-3">
            <CardTitle className="text-sm sm:text-base font-semibold">{t('newSite.siteInformation')}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4 pb-2 sm:pb-3">
            <form onSubmit={onSubmit} className="space-y-2 max-w-lg">
            <Input
              label={t('newSite.siteName')}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              minLength={3}
              placeholder={t('newSite.siteNamePlaceholder')}
              helperText={t('newSite.siteNameHelperText')}
            />

            <Input
              label={t('sites.slug')}
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              minLength={3}
              pattern="[a-z0-9\-]+"
              placeholder={t('sites.slugPlaceholder')}
              helperText={t('newSite.slugHelperText')}
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="autoSlug"
                checked={autoGenerateSlug}
                onChange={(e) => {
                  setAutoGenerateSlug(e.target.checked);
                  if (e.target.checked) {
                    setSlug(slugify(name));
                  }
                }}
                className="w-4 h-4"
              />
              <label htmlFor="autoSlug" className="text-sm text-muted">
                {t('newSite.autoGenerateSlugFromName')}
              </label>
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-xs sm:text-sm bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md p-3">
                {error}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <Button type="submit" variant="primary" disabled={loading} className="w-full sm:w-auto text-xs sm:text-sm">
                {loading ? t('newSite.creating') : t('newSite.create')}
              </Button>
              <Link href="/sites" className="w-full sm:w-auto">
                <Button type="button" variant="outline" className="w-full sm:w-auto text-xs sm:text-sm">{t('common.cancel')}</Button>
              </Link>
            </div>
          </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
