"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SitePanelLayout } from '@/components/site-panel/SitePanelLayout';
import { SectionHeader } from '@/components/site-panel/SectionHeader';
import { Card, CardContent } from '@repo/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@repo/ui';
import { EmptyState, Button, Input } from '@repo/ui';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from '@/hooks/useTranslations';
import { fetchMyTenants, exchangeTenantToken, getTenantToken } from '@/lib/api';
import { createApiClient } from '@repo/sdk';
import type { TenantInfo, SitePage, SiteEnvironment } from '@repo/sdk';

type PageWithEnvironment = SitePage & {
  environment?: SiteEnvironment;
};

export default function PagesPage() {
  const t = useTranslations();
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<PageWithEnvironment[]>([]);
  const [environments, setEnvironments] = useState<SiteEnvironment[]>([]);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPage, setEditingPage] = useState<PageWithEnvironment | null>(null);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);

  // Create form state
  const [createTitle, setCreateTitle] = useState('');
  const [createSlug, setCreateSlug] = useState('');
  const [createEnvironmentId, setCreateEnvironmentId] = useState<string>('');

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');

  const apiClient = createApiClient();

  const loadData = useCallback(async () => {
    if (!slug) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const tenants = await fetchMyTenants();
      const tenant = tenants.find((t: TenantInfo) => t.tenant.slug === slug);

      if (!tenant) {
        throw new Error(`Site with slug "${slug}" not found`);
      }

      const id = tenant.tenantId;
      setTenantId(id);

      let token = getTenantToken(id);
      if (!token) {
        token = await exchangeTenantToken(id);
      }

      const [pagesData, environmentsData] = await Promise.all([
        apiClient.listPages(token, id, { environmentType: 'draft' }),
        apiClient.listSiteEnvironments(token, id),
      ]);

      // Map pages with their environments
      const pagesWithEnv: PageWithEnvironment[] = pagesData.map((page) => ({
        ...page,
        environment: environmentsData.find((env) => env.id === page.environmentId),
      }));

      setPages(pagesWithEnv);
      setEnvironments(environmentsData);

      // Set default environment for create form
      if (environmentsData.length > 0 && !createEnvironmentId) {
        const draftEnv = environmentsData.find((e) => e.type === 'draft');
        if (draftEnv) {
          setCreateEnvironmentId(draftEnv.id);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('pages.failedToLoadPages');
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setLoading(false);
    }
  }, [slug, apiClient, toast, createEnvironmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !createEnvironmentId) return;

    try {
      let token = getTenantToken(tenantId);
      if (!token) {
        token = await exchangeTenantToken(tenantId);
      }

      await apiClient.createPage(token, tenantId, {
        environmentId: createEnvironmentId,
        slug: createSlug || createTitle.toLowerCase().replace(/\s+/g, '-'),
        title: createTitle,
        status: 'draft',
        content: {},
      });

      toast.push({
        tone: 'success',
        message: t('pages.pageCreatedSuccessfully'),
      });

      setShowCreateModal(false);
      setCreateTitle('');
      setCreateSlug('');
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('pages.failedToCreatePage');
      toast.push({
        tone: 'error',
        message,
      });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !editingPage) return;

    try {
      let token = getTenantToken(tenantId);
      if (!token) {
        token = await exchangeTenantToken(tenantId);
      }

      await apiClient.updatePage(token, tenantId, editingPage.id, {
        title: editTitle,
        slug: editSlug,
      });

      toast.push({
        tone: 'success',
        message: t('pages.pageUpdatedSuccessfully'),
      });

      setEditingPage(null);
      setEditTitle('');
      setEditSlug('');
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('pages.failedToUpdatePage');
      toast.push({
        tone: 'error',
        message,
      });
    }
  };

  const handleDelete = async (pageId: string) => {
    if (!tenantId) return;

    try {
      let token = getTenantToken(tenantId);
      if (!token) {
        token = await exchangeTenantToken(tenantId);
      }

      await apiClient.deletePage(token, tenantId, pageId);

      toast.push({
        tone: 'success',
        message: t('pages.pageDeletedSuccessfully'),
      });

      setDeletingPageId(null);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('pages.failedToDeletePage');
      toast.push({
        tone: 'error',
        message,
      });
      setDeletingPageId(null);
    }
  };

  const openEditModal = (page: PageWithEnvironment) => {
    setEditingPage(page);
    setEditTitle(page.title);
    setEditSlug(page.slug);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning'> = {
      draft: 'default',
      published: 'success',
      archived: 'warning',
    };
    return (
      <Badge variant={variants[status] || 'default'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <SitePanelLayout>
        <div className="space-y-6">
          <SectionHeader title={t('pages.title')} description={t('pages.description')} />
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">{t('common.loading')}</div>
            </CardContent>
          </Card>
        </div>
      </SitePanelLayout>
    );
  }

  return (
    <SitePanelLayout>
      <div className="space-y-6">
        <SectionHeader
          title={t('pages.title')}
          description={t('pages.description')}
          action={{
            label: t('pages.newPage'),
            onClick: () => setShowCreateModal(true),
          }}
        />

        <Card>
          <CardContent className="pt-6">
            {pages.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  title={t('pages.noPagesYet')}
                  description={t('pages.createPageToStart')}
                  icon={
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-8 w-8">
                      <rect x="5" y="4" width="12" height="15" rx="2" />
                      <path d="M8 9h6M8 13h4" strokeLinecap="round" />
                    </svg>
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('pages.titleLabel')}</TableHead>
                      <TableHead>{t('pages.slugLabel')}</TableHead>
                      <TableHead>{t('pages.status')}</TableHead>
                      <TableHead>{t('pages.environment')}</TableHead>
                      <TableHead>{t('pages.lastEdited')}</TableHead>
                      <TableHead className="text-right">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pages.map((page) => (
                      <TableRow key={page.id}>
                        <TableCell className="font-medium">{page.title}</TableCell>
                        <TableCell className="text-muted font-mono text-sm">{page.slug}</TableCell>
                        <TableCell>{getStatusBadge(page.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {page.environment?.type === 'production' ? t('pages.production') : t('pages.draft')}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted text-sm">
                          {formatDate(page.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(page)}
                            >
                              {t('pages.edit')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/sites/${slug}/panel/page-builder?pageId=${page.id}`)}
                            >
                              {t('pages.openInBuilder')}
                            </Button>
                            {page.environment?.type === 'draft' && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={async () => {
                                  if (!tenantId) return;
                                  try {
                                    let token = getTenantToken(tenantId);
                                    if (!token) {
                                      token = await exchangeTenantToken(tenantId);
                                    }
                                    await apiClient.publishPage(token, tenantId, page.id);
                                    toast.push({
                                      tone: 'success',
                                      message: t('pages.pagePublishedSuccessfully'),
                                    });
                                    await loadData();
                                  } catch (err) {
                                    const message = err instanceof Error ? err.message : t('pages.failedToPublishPage');
                                    toast.push({
                                      tone: 'error',
                                      message,
                                    });
                                  }
                                }}
                              >
                                {t('pages.publish')}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingPageId(page.id)}
                            >
                              {t('pages.delete')}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">{t('pages.createNewPage')}</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <Input
                  label={t('pages.titleLabel')}
                  placeholder={t('pages.titlePlaceholder')}
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  required
                />
                <Input
                  label={t('pages.slugLabel')}
                  placeholder={t('pages.slugPlaceholder')}
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value)}
                  hint={createSlug || createTitle ? `${t('pages.willBe')}: ${createSlug || createTitle.toLowerCase().replace(/\s+/g, '-')}` : undefined}
                />
                <div>
                  <label htmlFor="create-page-environment" className="block text-sm font-medium mb-1">
                    {t('pages.environment')}
                    <span className="text-red-500 ml-1" aria-label="required">*</span>
                  </label>
                  <select
                    id="create-page-environment"
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={createEnvironmentId}
                    onChange={(e) => setCreateEnvironmentId(e.target.value)}
                    required
                    aria-required="true"
                  >
                    {environments.map((env) => (
                      <option key={env.id} value={env.id}>
                        {env.type === 'production' ? t('pages.production') : t('pages.draft')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateTitle('');
                      setCreateSlug('');
                    }}
                  >
                    {t('pages.cancel')}
                  </Button>
                  <Button type="submit" variant="primary">
                    {t('pages.create')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {editingPage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">{t('pages.edit')} {t('pages.title')}</h2>
              <form onSubmit={handleEdit} className="space-y-4">
                <Input
                  label={t('pages.titleLabel')}
                  placeholder={t('pages.titlePlaceholder')}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  required
                />
                <Input
                  label={t('pages.slugLabel')}
                  placeholder={t('pages.slugPlaceholder')}
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  required
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingPage(null);
                      setEditTitle('');
                      setEditSlug('');
                    }}
                  >
                    {t('pages.cancel')}
                  </Button>
                  <Button type="submit" variant="primary">
                    {t('pages.save')}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deletingPageId && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-xl font-semibold mb-4">{t('pages.delete')} {t('pages.title')}</h2>
              <p className="text-muted mb-6">
                {t('pages.areYouSureDeletePage')}
              </p>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeletingPageId(null)}
                >
                  {t('pages.cancel')}
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleDelete(deletingPageId)}
                >
                  {t('pages.delete')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SitePanelLayout>
  );
}
