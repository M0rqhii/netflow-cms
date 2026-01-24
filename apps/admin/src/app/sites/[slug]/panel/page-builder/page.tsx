"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { fetchMySites, exchangeSiteToken, getSiteToken } from '@/lib/api';
import { trackOnboardingSuccess } from '@/lib/onboarding';
import { createApiClient } from '@repo/sdk';
import type { SiteInfo, SitePage, SiteEnvironment } from '@repo/sdk';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import { Button, LoadingSpinner } from '@repo/ui';
import { PageBuilderProvider } from '@/components/page-builder/PageBuilderContext';
import { usePageBuilderStore } from '@/stores/page-builder-store';
import { registerAllBlocks } from '@/components/page-builder/blocks/registerBlocks';
import { isNewBlockDrag, getDraggedType, validateDrop, type DragData } from '@/lib/page-builder/dnd-utils';

const BlockBrowser = dynamic(
  () => import('@/components/page-builder/sidebar-left/BlockBrowser').then(mod => ({ default: mod.BlockBrowser })),
  { ssr: false }
);

const PageBuilderCanvas = dynamic(
  () => import('@/components/page-builder/canvas/PageBuilderCanvas').then(mod => ({ default: mod.PageBuilderCanvas })),
  { ssr: false }
);

const PropertiesPanel = dynamic(
  () => import('@/components/page-builder/sidebar-right/PropertiesPanel').then(mod => ({ default: mod.PropertiesPanel })),
  { ssr: false }
);

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
  const [siteId, setSiteId] = useState<string | null>(null);

  const apiClient = useMemo(() => createApiClient(), []);

  useEffect(() => {
    trackOnboardingSuccess('editor_opened');
  }, []);

  // GUARDRAIL: Redirect jeśli brak pageId
  useEffect(() => {
    if (!pageId) {
      toast.push({
        tone: 'info',
        message: 'Wybierz stronę do edycji',
      });
      router.push(`/sites/${slug}/panel/pages`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, slug, router]); // toast.push is stable, no need to include in dependencies

  const loadPage = useCallback(async () => {
    if (!slug || !pageId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const sites = await fetchMySites();
      const site = sites.find((s: SiteInfo) => s.site.slug === slug);

      if (!site) {
        throw new Error(`Site with slug "${slug}" not found`);
      }

      const id = site.siteId;
      setSiteId(id);

      let token = getSiteToken(id);
      if (!token) {
        token = await exchangeSiteToken(id);
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
    if (!siteId || !pageId) return;

    try {
      setSaving(true);

      let token = getSiteToken(siteId);
      if (!token) {
        token = await exchangeSiteToken(siteId);
      }

      await apiClient.updatePageContent(token, siteId, pageId, content);

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
    if (!siteId || !pageId) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        let token = getSiteToken(siteId);
        if (!token) {
          token = await exchangeSiteToken(siteId);
        }
        await apiClient.updatePageContent(token, siteId, pageId, content);
        setLastSaved(new Date());
      } catch (err) {
        // Silent fail for auto-save
        console.error('Auto-save failed:', err);
      }
    }, 30000); // Auto-save after 30 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [content, siteId, pageId, apiClient]);

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
    if (!siteId || !pageId || !page) return;

    // GUARDRAIL 1: Sprawdź czy strona ma treść
    const hasContent = content && 
      (typeof content === 'object' && Object.keys(content).length > 0);

    if (!hasContent) {
      toast.push({
        tone: 'error',
        message: 'Dodaj treść, aby opublikować.',
      });
      setShowPublishModal(false);
      return;
    }

    // GUARDRAIL 2: Sprawdź czy strona ma tytuł
    if (!page.title || page.title.trim().length === 0) {
      toast.push({
        tone: 'error',
        message: 'Tytuł strony jest wymagany. Dodaj tytuł przed publikacją.',
      });
      setShowPublishModal(false);
      return;
    }

    // GUARDRAIL 3: Sprawdź czy strona ma slug
    if (!page.slug || page.slug.trim().length === 0) {
      toast.push({
        tone: 'error',
        message: 'Slug strony jest wymagany. Dodaj slug przed publikacją.',
      });
      setShowPublishModal(false);
      return;
    }

    setShowPublishModal(false);

    try {
      setSaving(true);

      // Zapisz przed publikacją
      let token = getSiteToken(siteId);
      if (!token) {
        token = await exchangeSiteToken(siteId);
      }

      await apiClient.updatePageContent(token, siteId, pageId, content);
      await apiClient.publishPage(token, siteId, pageId);

      toast.push({
        tone: 'success',
        message: 'Strona opublikowana pomyślnie',
      });

      await loadPage();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Błąd podczas publikacji';
      toast.push({
        tone: 'error',
        message,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageBuilderProvider siteId={siteId!} siteSlug={slug}>
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
    </PageBuilderProvider>
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
  const [initialContent] = useState(content);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const hasUnsavedChanges = JSON.stringify(content) !== JSON.stringify(initialContent);
  
  // Store actions
  const storeContent = usePageBuilderStore((s) => s.content);
  const addBlock = usePageBuilderStore((s) => s.addBlock);
  const moveBlock = usePageBuilderStore((s) => s.moveBlock);
  const commit = usePageBuilderStore((s) => s.commit);
  const selectBlock = usePageBuilderStore((s) => s.selectBlock);
  
  // Register blocks on mount
  useEffect(() => {
    registerAllBlocks();
  }, []);
  
  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );
  
  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData;
    setActiveDrag(data);
    selectBlock(null);
  }, [selectBlock]);
  
  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveDrag(null);
    
    if (!over) return;
    
    const dragData = active.data.current as DragData;
    const dropData = over.data.current as { parentId: string; index?: number } | undefined;
    
    if (!dropData?.parentId) return;
    
    const targetParentId = dropData.parentId;
    const targetIndex = dropData.index ?? 0;
    
    // Get block type
    const blockType = getDraggedType(dragData);
    if (!blockType) return;
    
    // Get target parent for validation
    const targetParent = storeContent.nodes[targetParentId];
    if (!targetParent) return;
    
    const draggedNodeId = dragData.dragType === 'existing-node' ? dragData.nodeId : undefined;
    const validation = validateDrop(blockType, targetParent.type, storeContent, draggedNodeId, targetParentId);
    if (!validation.valid) return;
    
    // Perform action
    if (isNewBlockDrag(dragData)) {
      addBlock(targetParentId, blockType, targetIndex);
    } else if (dragData.dragType === 'existing-node' && dragData.nodeId) {
      moveBlock(dragData.nodeId, targetParentId, targetIndex);
    }
    
    commit('dnd');
  }, [storeContent, addBlock, moveBlock, commit]);

  const handlePublishWithCheck = () => {
    if (hasUnsavedChanges && onPublish) {
      const confirmed = confirm(
        'Masz niezapisane zmiany. Czy chcesz zapisać przed publikacją?'
      );
      if (confirmed) {
        onSave();
        setTimeout(() => {
          onPublish();
        }, 500);
      } else {
        onPublish();
      }
    } else if (onPublish) {
      onPublish();
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Custom Topbar with Save Button */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{pageName}</h1>
              <Badge tone={environment === 'production' ? 'success' : 'warning'}>
                {environment === 'production' ? 'Production' : 'Draft'}
              </Badge>
              {hasUnsavedChanges && (
                <Badge tone="error">Niezapisane zmiany</Badge>
              )}
              {lastSaved && !hasUnsavedChanges && (
                <span className="text-xs text-muted">
                  Zapisano {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onSave}
              disabled={saving || !hasUnsavedChanges}
            >
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
            {onPublish && environment === 'draft' && (
              <Tooltip content={hasUnsavedChanges ? "Zapisz zmiany przed publikacją" : undefined}>
                <Button
                  variant="primary"
                  onClick={handlePublishWithCheck}
                  disabled={saving}
                >
                  Publikuj
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Block Browser */}
          <div className="w-64 border-r border-gray-200 bg-white flex-shrink-0">
            <Suspense fallback={<div className="p-4"><LoadingSpinner /></div>}>
              <BlockBrowser />
            </Suspense>
          </div>

          {/* Canvas Area */}
          <div className="flex-1 overflow-hidden">
            <Suspense fallback={<div className="flex items-center justify-center h-full"><LoadingSpinner text="Loading canvas..." /></div>}>
              <PageBuilderCanvas content={content} onContentChange={onContentChange} />
            </Suspense>
          </div>

          {/* Right Sidebar - Properties Panel */}
          <div className="w-80 border-l border-gray-200 bg-white flex-shrink-0">
            <Suspense fallback={<div className="p-4"><LoadingSpinner /></div>}>
              <PropertiesPanel />
            </Suspense>
          </div>
        </div>
        
        {/* Drag overlay */}
        <DragOverlay>
          {activeDrag && (
            <div className="px-4 py-2 bg-white border border-blue-400 rounded shadow-lg text-sm font-medium text-blue-600">
              {getDraggedType(activeDrag) || 'Block'}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}


