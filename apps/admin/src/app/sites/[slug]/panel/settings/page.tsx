"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@repo/ui';
import { Button, Input, Textarea, LoadingSpinner } from '@repo/ui';
import { useToast } from '@/components/ui/Toast';
import { fetchMySites, getSeoSettings, updateSeoSettings, type UpdateSeoSettingsDto } from '@/lib/api';
import type { SiteInfo } from '@repo/sdk';

export default function SettingsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [siteId, setSiteId] = useState<string | null>(null);

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
        throw new Error(`Nie znaleziono strony o slug: "${slug}"`);
      }

      const id = foundSite.siteId;
      setSiteId(id);
      setSite(foundSite);

      const seo = await getSeoSettings(id);
      setSeoTitle(seo.title || '');
      setSeoDescription(seo.description || '');
      setSeoOgTitle(seo.ogTitle || '');
      setSeoOgDescription(seo.ogDescription || '');
      setSeoOgImage(seo.ogImage || '');
      setSeoTwitterCard(seo.twitterCard || 'summary_large_image');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się pobrać ustawień';
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

      await updateSeoSettings(siteId, payload);

      toast.push({
        tone: 'success',
        message: 'Ustawienia SEO zapisane',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się zapisać ustawień SEO';
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
          <LoadingSpinner text="Wczytywanie ustawień..." />
        </div>
      </SitePanelLayout>
    );
  }

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title="Ustawienia"
          description="Zarządzaj ustawieniami strony, SEO oraz domenami."
        />

        <Card>
          <CardHeader>
            <CardTitle>Ogólne</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nazwa strony</label>
              <Input
                value={site?.site.name || ''}
                disabled
                helperText="Nazwy strony nie można zmienić tutaj. Skontaktuj się z supportem."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Slug</label>
              <Input
                value={site?.site.slug || ''}
                disabled
                helperText="Slug jest stały po utworzeniu strony."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">ID strony</label>
              <code className="block text-xs bg-gray-100 px-3 py-2 rounded">
                {siteId || '—'}
              </code>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSeoSave} className="space-y-4">
              <Input
                label="Meta tytuł"
                placeholder="np. Nowoczesna strona firmowa"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                helperText="Tytuł widoczny w wynikach wyszukiwania i w karcie przeglądarki."
              />

              <Textarea
                label="Meta opis"
                placeholder="np. Krótki opis strony (150–160 znaków)"
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
                rows={3}
                helperText="Opis widoczny w wynikach wyszukiwania."
              />

              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold mb-3">Open Graph (social media)</h3>
                <div className="space-y-4">
                  <Input
                    label="OG tytuł"
                    placeholder="np. Nowoczesna strona firmowa"
                    value={seoOgTitle}
                    onChange={(e) => setSeoOgTitle(e.target.value)}
                    helperText="Tytuł dla podglądu w social mediach (domyślnie Meta tytuł)."
                  />

                  <Textarea
                    label="OG opis"
                    placeholder="np. Opis do udostępnień"
                    value={seoOgDescription}
                    onChange={(e) => setSeoOgDescription(e.target.value)}
                    rows={2}
                    helperText="Opis dla podglądu w social mediach."
                  />

                  <Input
                    label="Adres obrazka OG"
                    placeholder="https://example.com/cover.jpg"
                    value={seoOgImage}
                    onChange={(e) => setSeoOgImage(e.target.value)}
                    helperText="Rekomendowany rozmiar: 1200x630 px."
                  />

                  <div>
                    <label className="block text-sm font-medium mb-1">Typ karty Twitter</label>
                    <select
                      value={seoTwitterCard}
                      onChange={(e) => setSeoTwitterCard(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="summary">Summary</option>
                      <option value="summary_large_image">Summary z dużym obrazem</option>
                    </select>
                    <p className="text-xs text-muted mt-1">
                      Wybierz sposób prezentacji strony po udostępnieniu na X (Twitter).
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Zapisywanie...' : 'Zapisz ustawienia SEO'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Domeny</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Moduł domen jest dostępny w planach Pro/Enterprise. Jeśli chcesz go aktywować, skontaktuj się z zespołem.
              </div>
              <div className="grid gap-3">
                <Input
                  label="Podłącz domenę"
                  placeholder="np. www.twojadomena.pl"
                  disabled
                  helperText="Włącz plan Pro/Enterprise, aby dodać domenę."
                />
                <Button variant="outline" disabled>
                  Dodaj domenę
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Publikacja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 px-4 py-3 text-sm text-muted">
                Wkrótce: reguły publikacji, środowiska i walidatory publikacji.
              </div>
              <Button variant="outline" disabled>
                Konfiguruj publikację
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </SitePanelLayout>
  );
}
