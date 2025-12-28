"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { fetchMyTenants, exchangeTenantToken, getTenantToken } from '@/lib/api';
import { createApiClient } from '@repo/sdk';
import type { TenantInfo, SitePage, SiteEnvironment } from '@repo/sdk';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@repo/ui';
import { BlockBrowser } from '@/components/page-builder/sidebar-left/BlockBrowser';
import { PageBuilderCanvas } from '@/components/page-builder/canvas/PageBuilderCanvas';
import { PropertiesPanel } from '@/components/page-builder/sidebar-right/PropertiesPanel';

export default function PageBuilderPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const pageId = searchParams?.get('pageId') || null;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<SitePage | null>(null);
  const [environment, setEnvironment] = useState<SiteEnvironment | null>(null);
  const [content, setContent] = useState<unknown>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const apiClient = createApiClient();

  const loadPage = useCallback(async () => {
    if (!slug || !pageId) {
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

      const [pageData, environmentsData] = await Promise.all([
        apiClient.getPage(token, id, pageId),
        apiClient.listSiteEnvironments(token, id),
      ]);

      setPage(pageData);
      setContent(pageData.content || {});
      
      const pageEnv = environmentsData.find((e) => e.id === pageData.environmentId);
      setEnvironment(pageEnv || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load page';
      toast.push({
        tone: 'error',
        message,
      });
      // Redirect back to pages list on error
      router.push(`/sites/${slug}/panel/pages`);
    } finally {
      setLoading(false);
    }
  }, [slug, pageId, apiClient, toast, router]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const handleSave = async () => {
    if (!tenantId || !pageId) return;

    try {
      setSaving(true);

      let token = getTenantToken(tenantId);
      if (!token) {
        token = await exchangeTenantToken(tenantId);
      }

      await apiClient.updatePageContent(token, tenantId, pageId, content);

      setLastSaved(new Date());
      toast.push({
        tone: 'success',
        message: 'Page saved successfully',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save page';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  // Auto-save effect
  useEffect(() => {
    if (!tenantId || !pageId) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        let token = getTenantToken(tenantId);
        if (!token) {
          token = await exchangeTenantToken(tenantId);
        }
        await apiClient.updatePageContent(token, tenantId, pageId, content);
        setLastSaved(new Date());
      } catch (err) {
        // Silent fail for auto-save
        console.error('Auto-save failed:', err);
      }
    }, 30000); // Auto-save after 30 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [content, tenantId, pageId, apiClient]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Loading page...</div>
          <div className="text-sm text-muted">Please wait</div>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">Page not found</div>
          <button
            onClick={() => router.push(`/sites/${slug}/panel/pages`)}
            className="text-blue-600 hover:underline"
          >
            Back to Pages
          </button>
        </div>
      </div>
    );
  }

  const handlePublishClick = () => {
    setShowPublishModal(true);
  };

  const handlePublishConfirm = async () => {
    if (!tenantId || !pageId) return;

    setShowPublishModal(false);

    try {
      setSaving(true);

      // Save before publishing
      let token = getTenantToken(tenantId);
      if (!token) {
        token = await exchangeTenantToken(tenantId);
      }

      await apiClient.updatePageContent(token, tenantId, pageId, content);
      await apiClient.publishPage(token, tenantId, pageId);

      toast.push({
        tone: 'success',
        message: 'Page published successfully',
      });

      // Reload page to update environment
      await loadPage();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to publish page';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageBuilderWithSave
        pageName={page.title}
        environment={environment?.type === 'production' ? 'production' : 'draft'}
        content={content}
        onContentChange={setContent}
        onSave={handleSave}
        onPublish={environment?.type === 'draft' ? handlePublishClick : undefined}
        saving={saving}
        lastSaved={lastSaved}
      />
      {showPublishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Publish Page</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-900 mb-2">
                <strong>What happens:</strong> Publishing moves your draft changes to production, making them visible to visitors immediately.
              </p>
            </div>
            <p className="text-sm text-muted mb-4">
              Are you sure you want to publish this page? The page will be visible publicly at: <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{page.slug}</code>
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPublishModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handlePublishConfirm} disabled={saving}>
                {saving ? 'Publishing...' : 'Publish'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface PageBuilderWithSaveProps {
  pageName: string;
  environment: 'draft' | 'production';
  content: unknown;
  onContentChange: (content: unknown) => void;
  onSave: () => void;
  onPublish?: () => void;
  saving: boolean;
  lastSaved?: Date | null;
}

function PageBuilderWithSave({
  pageName,
  environment,
  content,
  onContentChange,
  onSave,
  onPublish,
  saving,
  lastSaved,
}: PageBuilderWithSaveProps) {
  return (
    <div className="h-screen flex flex-col">
      {/* Custom Topbar with Save Button */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{pageName}</h1>
              <div className="flex items-center gap-2">
                <Badge tone={environment === 'production' ? 'success' : 'warning'}>
                  {environment === 'production' ? 'Production' : 'Draft'}
                </Badge>
                <span
                  className="text-xs text-muted cursor-help"
                  title={environment === 'production' 
                    ? 'Production environment: This is the live version visible to visitors. Changes here are immediately public.'
                    : 'Draft environment: Your changes are saved but not visible to visitors. Use this to work on pages before publishing.'}
                >
                  ℹ️
                </span>
              </div>
              {lastSaved && (
                <span className="text-xs text-muted">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            {onPublish && environment === 'draft' && (
              <Button
                variant="primary"
                onClick={onPublish}
                disabled={saving}
                title="Publishing moves your draft changes to production, making them visible to visitors. This action cannot be easily undone."
              >
                Publish
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Block Browser */}
        <div className="w-64 border-r border-gray-200 bg-white flex-shrink-0">
          <BlockBrowser />
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden">
          <PageBuilderCanvas content={content} onContentChange={onContentChange} />
        </div>

        {/* Right Sidebar - Properties Panel */}
        <div className="w-80 border-l border-gray-200 bg-white flex-shrink-0">
          <PropertiesPanel selectedBlockId={undefined} />
        </div>
      </div>
    </div>
  );
}

