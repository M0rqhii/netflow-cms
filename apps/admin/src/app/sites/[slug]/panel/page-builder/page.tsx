"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { fetchMySites, exchangeSiteToken, getSiteToken } from '@/lib/api';
import { trackOnboardingSuccess } from '@/lib/onboarding';
import { createApiClient } from '@repo/sdk';
import { useSiteFeatures } from '@/lib/site-features';
import { validatePublish } from '@/lib/page-builder/publish-validation';
import type { PageContent } from '@/lib/page-builder/types';
import type { SiteInfo, SitePage, SiteEnvironment } from '@repo/sdk';
import { useToast } from '@/components/ui/Toast';
import { useTranslations } from '@/hooks/useTranslations';
import { Button, LoadingSpinner } from '@repo/ui';
import { FiMonitor, FiTablet, FiSmartphone, FiEye, FiEdit3, FiGrid, FiPlus, FiMinus, FiRotateCcw, FiMove, FiMaximize } from 'react-icons/fi';
import { PageBuilderProvider } from '@/components/page-builder/PageBuilderContext';
import { usePageBuilderStore, useSelectedBlock, useHistoryInfo } from '@/stores/page-builder-store';
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

const LayersPanel = dynamic(
  () => import('@/components/page-builder/sidebar-left/LayersPanel').then(mod => ({ default: mod.LayersPanel })),
  { ssr: false }
);

const AssetsPanel = dynamic(
  () => import('@/components/page-builder/sidebar-left/AssetsPanel').then(mod => ({ default: mod.AssetsPanel })),
  { ssr: false }
);

export default function PageBuilderPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const pageId = searchParams?.get('pageId') || null;
  const toast = useToast();
  const t = useTranslations();

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<SitePage | null>(null);
  const [environment, setEnvironment] = useState<SiteEnvironment | null>(null);
  const [content, setContent] = useState<unknown>({});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [siteId, setSiteId] = useState<string | null>(null);

  const apiClient = useMemo(() => createApiClient(), []);
  const { features } = useSiteFeatures(siteId);

  useEffect(() => {
    trackOnboardingSuccess('editor_opened');

  }, []);
  useEffect(() => {
    if (!pageId) {
      toast.push({
        tone: 'info',
        message: t('sitePanelShell.pageBuilderUi.toasts.selectPageToEdit'),
      });
      router.push(`/sites/${slug}/panel/pages`);
    }
  }, [pageId, slug, router, toast, t]);

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
        throw new Error(t('sitePanelShell.pageBuilderUi.toasts.siteNotFound', { slug }));
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
      const message = err instanceof Error ? err.message : t('sitePanelShell.pageBuilderUi.toasts.failedToLoadPage');
      toast.push({ tone: 'error', message });
      router.push(`/sites/${slug}/panel/pages`);
    } finally {
      setLoading(false);
    }
  }, [slug, pageId, apiClient, toast, router, t]);

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
        message: t('sitePanelShell.pageBuilderUi.toasts.pageSavedSuccessfully'),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('sitePanelShell.pageBuilderUi.toasts.failedToSavePage');
      toast.push({ tone: 'error', message });
    } finally {
      setSaving(false);
    }
  };

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
        console.error('Auto-save failed:', err);
      }
    }, 30000);
  return () => clearTimeout(autoSaveTimer);
  }, [content, siteId, pageId, apiClient]);

  if (loading) {
  return (
      <div className="h-full min-h-[460px] flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">{t('sitePanelShell.pageBuilderUi.loading.loadingPage')}</div>
          <div className="text-sm text-muted">{t('sitePanelShell.pageBuilderUi.loading.pleaseWait')}</div>
        </div>
      </div>
    );
  }

  if (!page) {
  return (
      <div className="h-full min-h-[460px] flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg font-medium mb-2">{t('sitePanelShell.pageBuilderUi.loading.pageNotFound')}</div>
          <button onClick={() => router.push(`/sites/${slug}/panel/pages`)} className="text-primary hover:underline">
            {t('sitePanelShell.pageBuilderUi.actions.backToPages')}
          </button>
        </div>
      </div>
    );
  }

  const handlePublishClick = () => setShowPublishModal(true);

  const handlePublishConfirm = async () => {
    if (!siteId || !pageId || !page) return;

    const hasContent = content && typeof content === 'object' && Object.keys(content).length > 0;
    if (!hasContent) {
      toast.push({ tone: 'error', message: t('sitePanelShell.pageBuilderUi.toasts.addContentBeforePublish') });
      setShowPublishModal(false);
      return;
    }

    if (!page.title || page.title.trim().length === 0) {
      toast.push({ tone: 'error', message: t('sitePanelShell.pageBuilderUi.toasts.pageTitleRequired') });
      setShowPublishModal(false);
      return;
    }

    if (!page.slug || page.slug.trim().length === 0) {
      toast.push({ tone: 'error', message: t('sitePanelShell.pageBuilderUi.toasts.pageSlugRequired') });
      setShowPublishModal(false);
      return;
    }

    const enabledModules = features?.effective || [];
    const validation = validatePublish(content as PageContent, enabledModules);
    if (!validation.valid) {
      const missingAlt = validation.errors.filter((e) => e.type === 'missing_alt');
      const disabledModules = validation.errors.filter((e) => e.type === 'module_disabled');

      if (missingAlt.length > 0) {
        toast.push({
          tone: 'error',
          message: t('sitePanelShell.pageBuilderUi.toasts.missingAlt', { count: missingAlt.length }),
        });
      }

      if (disabledModules.length > 0) {
        const modules = Array.from(new Set(disabledModules.map((e) => e.moduleKey).filter(Boolean)));
        toast.push({
          tone: 'error',
          message: t('sitePanelShell.pageBuilderUi.toasts.disabledModules', { modules: modules.join(', ') }),
        });
      }

      setShowPublishModal(false);
      return;
    }

    setShowPublishModal(false);

    try {
      setSaving(true);

      let token = getSiteToken(siteId);
      if (!token) {
        token = await exchangeSiteToken(siteId);
      }

      await apiClient.updatePageContent(token, siteId, pageId, content);
      await apiClient.publishPage(token, siteId, pageId);

      toast.push({ tone: 'success', message: t('sitePanelShell.pageBuilderUi.toasts.pagePublishedSuccessfully') });
      await loadPage();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('sitePanelShell.pageBuilderUi.toasts.publishFailed');
      toast.push({ tone: 'error', message });
    } finally {
      setSaving(false);
    }
  };

  const environmentType = (environment?.type || '').toLowerCase();
  return (
    <PageBuilderProvider siteId={siteId!} siteSlug={slug} enabledModules={features?.effective ?? []}>
      <PageBuilderWithSave
        pageName={page.title}
        pageSlug={page.slug}
        siteSlug={slug}
        environment={environmentType === 'production' ? 'production' : 'draft'}
        content={content}
        onContentChange={setContent}
        onSave={handleSave}
        onPublish={environmentType === 'draft' ? handlePublishClick : undefined}
        saving={saving}
        lastSaved={lastSaved}
      />
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="glass glass-border rounded-[22px] p-6 max-w-md w-full mx-4 shadow-soft">
            <h2 className="text-xl font-semibold mb-4">{t('sitePanelShell.pageBuilderUi.publishModal.title')}</h2>
            <div className="border border-[rgba(0,163,255,0.25)] bg-[rgba(0,163,255,0.08)] rounded-[18px] p-3 mb-4">
              <p className="text-xs text-text mb-2">
                <strong>{t('sitePanelShell.pageBuilderUi.publishModal.whatHappensLabel')}</strong>{' '}
                {t('sitePanelShell.pageBuilderUi.publishModal.whatHappensDescription')}
              </p>
            </div>
            <p className="text-sm text-muted mb-4">
              {t('sitePanelShell.pageBuilderUi.publishModal.confirmQuestion')}{' '}
              <code className="text-xs bg-surface-2 px-1.5 py-0.5 rounded-[8px]">{page.slug}</code>
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowPublishModal(false)}>{t('common.cancel')}</Button>
              <Button variant="primary" onClick={handlePublishConfirm} disabled={saving}>
                {saving ? t('sitePanelShell.pageBuilderUi.actions.publishing') : t('sitePanelShell.pageBuilderUi.actions.publish')}
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
  pageSlug?: string | null;
  siteSlug: string;
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
  pageSlug,
  siteSlug,
  environment,
  content,
  onContentChange,
  onSave,
  onPublish,
  saving,
  lastSaved,
}: PageBuilderWithSaveProps) {
  const MIN_ZOOM = 0.45;
  const MAX_ZOOM = 2;
  const [initialContent] = useState(content);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [copyMode, setCopyMode] = useState(false);
  const [leftTab, setLeftTab] = useState<'library' | 'layers' | 'assets'>('library');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panEnabled, setPanEnabled] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const panSessionRef = useRef<{ pointerId: number; startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const panRafRef = useRef<number | null>(null);
  const pendingPanRef = useRef<{ x: number; y: number } | null>(null);
  const hasUnsavedChanges = JSON.stringify(content) !== JSON.stringify(initialContent);
  const t = useTranslations();

  const selectedBlock = useSelectedBlock();
  const { canUndo, canRedo } = useHistoryInfo();
  const undo = usePageBuilderStore((s) => s.undo);
  const redo = usePageBuilderStore((s) => s.redo);
  const deleteBlock = usePageBuilderStore((s) => s.deleteBlock);

  const storeContent = usePageBuilderStore((s) => s.content);
  const addBlock = usePageBuilderStore((s) => s.addBlock);
  const currentBreakpoint = usePageBuilderStore((s) => s.currentBreakpoint);
  const setBreakpoint = usePageBuilderStore((s) => s.setBreakpoint);
  const editorMode = usePageBuilderStore((s) => s.mode);
  const setMode = usePageBuilderStore((s) => s.setMode);
  const moveBlock = usePageBuilderStore((s) => s.moveBlock);
  const copyBlock = usePageBuilderStore((s) => s.copyBlock);
  const pasteBlock = usePageBuilderStore((s) => s.pasteBlock);
  const commit = usePageBuilderStore((s) => s.commit);
  const selectBlock = usePageBuilderStore((s) => s.selectBlock);
  const previewWidth = currentBreakpoint === 'mobile' ? '420px' : currentBreakpoint === 'tablet' ? '860px' : '100%';
  const zoomPercent = Math.round(zoom * 100);
  useEffect(() => {
    registerAllBlocks();
  }, []);

  useEffect(() => {
    return () => {
      const rafId = panRafRef.current;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragData;
    setActiveDrag(data);
    const activator = event.activatorEvent as (PointerEvent | KeyboardEvent | null);
    const shouldCopy = Boolean(activator && 'altKey' in activator && activator.altKey);
    setCopyMode(shouldCopy);
    selectBlock(null);
  }, [selectBlock]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    setActiveDrag(null);
    setCopyMode(false);

    if (!over) return;

    const dragData = active.data.current as DragData;
    const dropData = over.data.current as { parentId: string; index?: number } | undefined;

    if (!dropData?.parentId) return;

    const targetParentId = dropData.parentId;
    const targetIndex = dropData.index ?? 0;

    const blockType = getDraggedType(dragData);
    if (!blockType) return;

    const targetParent = storeContent.nodes[targetParentId];
    if (!targetParent) return;

    const draggedNodeId = dragData.dragType === 'existing-node' ? dragData.nodeId : undefined;
    const validation = validateDrop(blockType, targetParent.type, storeContent, draggedNodeId, targetParentId);
    if (!validation.valid) return;

    if (isNewBlockDrag(dragData)) {
      const newId = addBlock(targetParentId, blockType, targetIndex);
      if (newId) {
        selectBlock(newId);
        commit('add');
      }
    } else if (dragData.dragType === 'existing-node' && dragData.nodeId) {
      if (copyMode) {
        copyBlock(dragData.nodeId);
        pasteBlock(targetParentId, targetIndex);
        commit('paste');
      } else {
        moveBlock(dragData.nodeId, targetParentId, targetIndex);
        commit('dnd');
      }
    }
  }, [storeContent, addBlock, moveBlock, copyBlock, pasteBlock, commit, copyMode, selectBlock]);

  const handlePublishWithCheck = () => {
    if (hasUnsavedChanges && onPublish) {
      const confirmed = confirm(t('sitePanelShell.pageBuilderUi.confirm.unsavedBeforePublish'));
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


  const clampZoom = useCallback((value: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value)), []);

  const clampPan = useCallback((nextPan: { x: number; y: number }, zoomLevel: number) => {
    const viewportEl = viewportRef.current;
    const pageEl = pageRef.current;
    if (!viewportEl || !pageEl) return nextPan;

    const scaledWidth = pageEl.offsetWidth * zoomLevel;
    const scaledHeight = pageEl.offsetHeight * zoomLevel;
    const viewportWidth = viewportEl.clientWidth;
    const viewportHeight = viewportEl.clientHeight;

    const minVisibleX = Math.min(220, Math.max(96, viewportWidth * 0.2));
    const minVisibleY = Math.min(220, Math.max(96, viewportHeight * 0.2));

    const maxOffsetX = Math.max(0, (scaledWidth / 2) + (viewportWidth / 2) - minVisibleX);
    const minX = -maxOffsetX;
    const maxX = maxOffsetX;

    const minY = Math.min(80, viewportHeight * 0.12) - Math.max(0, scaledHeight - minVisibleY);
    const maxY = Math.max(80, viewportHeight * 0.35);

    return {
      x: Math.min(maxX, Math.max(minX, nextPan.x)),
      y: Math.min(maxY, Math.max(minY, nextPan.y)),
    };
  }, []);

  useEffect(() => {
    setPan((current) => clampPan(current, zoom));
  }, [clampPan, zoom, previewWidth]);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => {
      const nextZoom = clampZoom(z + 0.1);
      setPan((p) => clampPan(p, nextZoom));
      return nextZoom;
    });
  }, [clampZoom, clampPan]);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => {
      const nextZoom = clampZoom(z - 0.1);
      setPan((p) => clampPan(p, nextZoom));
      return nextZoom;
    });
  }, [clampZoom, clampPan]);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });

  }, []);
  const handleFitToViewport = useCallback(() => {
    const viewportEl = viewportRef.current;
    const pageEl = pageRef.current;
    if (!viewportEl || !pageEl) {
      handleZoomReset();
      return;
    }

    const availableWidth = Math.max(280, viewportEl.clientWidth - 48);
    const fitZoom = clampZoom(availableWidth / Math.max(1, pageEl.offsetWidth));
    setZoom(fitZoom);
    setPan({ x: 0, y: 0 });
  }, [clampZoom, handleZoomReset]);

  const handleViewportWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!(e.altKey && e.shiftKey)) return;
    e.preventDefault();
    setZoom((z) => {
      const nextZoom = clampZoom(z - e.deltaY * 0.0015);
      setPan((p) => clampPan(p, nextZoom));
      return nextZoom;
    });
  }, [clampZoom, clampPan]);

  const handleViewportPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const canPan = panEnabled || e.shiftKey || e.button === 1;
    if (!canPan) return;


    panSessionRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseX: pan.x,
      baseY: pan.y,
    };
    setIsPanning(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  }, [panEnabled, pan.x, pan.y]);
  const handleViewportPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;

    pendingPanRef.current = clampPan({
      x: session.baseX + (e.clientX - session.startX),
      y: session.baseY + (e.clientY - session.startY),
    }, zoom);

    if (panRafRef.current !== null) return;

    panRafRef.current = requestAnimationFrame(() => {
      panRafRef.current = null;
      if (pendingPanRef.current) {
        setPan(pendingPanRef.current);
      }
    });
  }, [clampPan, zoom]);

  const handleViewportPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const session = panSessionRef.current;
    if (!session || session.pointerId !== e.pointerId) return;

    if (panRafRef.current !== null) {
      cancelAnimationFrame(panRafRef.current);
      panRafRef.current = null;
    }

    if (pendingPanRef.current) {
      setPan(pendingPanRef.current);
      pendingPanRef.current = null;
    }

    panSessionRef.current = null;
    setIsPanning(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  return (
    <div className="site-builder h-full min-h-0 flex flex-col">
      <div className="site-builder-head card card-pad">
        <div className="builder-topbar">
          <div className="builder-topbar-left">
            <div className="view-title">{t('sitePanelShell.pageBuilderUi.header.title', { site: siteSlug })}</div>
            <div className="view-sub">
              {t('sitePanelShell.pageBuilderUi.header.editing', {
                page: pageName,
                slug: pageSlug ? ` (${pageSlug})` : '',
              })}
            </div>
            <div className="detail-label" style={{ marginTop: 8 }}>
              {lastSaved && !hasUnsavedChanges
                ? t('sitePanelShell.pageBuilderUi.header.savedAt', { time: lastSaved.toLocaleTimeString() })
                : hasUnsavedChanges
                  ? t('sitePanelShell.pageBuilderUi.header.unsavedChanges')
                  : t('sitePanelShell.pageBuilderUi.header.ready')}
            </div>
          </div>

          <div className="builder-topbar-right">
            <div className="builder-state-row">
              <span className={environment === 'production' ? 'badge green' : 'badge orange'}>
                {environment === 'production'
                  ? t('sitePanelShell.pageBuilderUi.header.environmentProduction')
                  : t('sitePanelShell.pageBuilderUi.header.environmentDraft')}
              </span>
              <span className={hasUnsavedChanges ? 'badge orange' : 'badge gray'}>
                {hasUnsavedChanges
                  ? t('sitePanelShell.pageBuilderUi.header.unsaved')
                  : t('sitePanelShell.pageBuilderUi.header.saved')}
              </span>
            </div>

            <div className="builder-actions-row">
              <Link className="btn" href={`/sites/${encodeURIComponent(siteSlug)}/panel/pages`}>
                {t('sitePanelShell.pageBuilderUi.actions.backToPages')}
              </Link>
              <button className="btn" onClick={onSave} disabled={saving || !hasUnsavedChanges}>
                {saving ? t('sitePanelShell.pageBuilderUi.actions.saving') : t('common.save')}
              </button>
              {onPublish && environment === 'draft' && (
                <button className="btn btn-primary" onClick={handlePublishWithCheck} disabled={saving}>
                  {t('sitePanelShell.pageBuilderUi.actions.publish')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="spacer" />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="builder">
          <aside className="card panel builder-left-panel" aria-label={t('sitePanelShell.pageBuilderUi.panels.componentsLibrary')}>
            <h3>{t('sitePanelShell.pageBuilderUi.panels.componentsLibrary')}</h3>
            <div className="slot" style={{ minHeight: 0 }}>
              <div className="pill-row">
                {([
                  { id: 'library', label: t('sitePanelShell.pageBuilderUi.panels.library') },
                  { id: 'layers', label: t('sitePanelShell.pageBuilderUi.panels.layers') },
                  { id: 'assets', label: t('sitePanelShell.pageBuilderUi.panels.assets') },
                ] as const).map((tab) => (
                  <button
                    key={tab.id}
                    className="btn"
                    style={leftTab === tab.id ? { background: 'rgba(0,163,255,.14)', borderColor: 'rgba(0,163,255,.30)' } : undefined}
                    onClick={() => setLeftTab(tab.id)}
                    type="button"
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <Suspense fallback={<div className="card" style={{ padding: 12 }}><LoadingSpinner /></div>}>
                  {leftTab === 'library' && <BlockBrowser />}
                  {leftTab === 'layers' && <LayersPanel />}
                  {leftTab === 'assets' && <AssetsPanel />}
                </Suspense>
              </div>

            </div>
          </aside>

          <div className="canvas-wrap card builder-canvas-shell" aria-label={t('sitePanelShell.pageBuilderUi.toolbar.canvasAria')}>
            <div className="canvas-toolbar" role="toolbar" aria-label={t('sitePanelShell.pageBuilderUi.toolbar.builderToolbar')} data-no-pan="true">
              <button
                className="icon-btn"
                type="button"
                aria-pressed={currentBreakpoint === 'desktop'}
                onClick={() => setBreakpoint('desktop')}
                title={t('sitePanelShell.pageBuilderUi.toolbar.desktop')}
              >
                <FiMonitor />
              </button>
              <button
                className="icon-btn"
                type="button"
                aria-pressed={currentBreakpoint === 'tablet'}
                onClick={() => setBreakpoint('tablet')}
                title={t('sitePanelShell.pageBuilderUi.toolbar.tablet')}
              >
                <FiTablet />
              </button>
              <button
                className="icon-btn"
                type="button"
                aria-pressed={currentBreakpoint === 'mobile'}
                onClick={() => setBreakpoint('mobile')}
                title={t('sitePanelShell.pageBuilderUi.toolbar.mobile')}
              >
                <FiSmartphone />
              </button>
              <div className="divider" style={{ width: 1, height: 22, margin: '0 6px' }} />
              <button
                className="icon-btn"
                type="button"
                aria-pressed={editorMode === 'edit'}
                onClick={() => setMode('edit')}
                title={t('sitePanelShell.pageBuilderUi.toolbar.edit')}
              >
                <FiEdit3 />
              </button>
              <button
                className="icon-btn"
                type="button"
                aria-pressed={editorMode === 'preview'}
                onClick={() => setMode('preview')}
                title={t('sitePanelShell.pageBuilderUi.toolbar.preview')}
              >
                <FiEye />
              </button>
              <button
                className="icon-btn"
                type="button"
                aria-pressed={editorMode === 'structure'}
                onClick={() => setMode('structure')}
                title={t('sitePanelShell.pageBuilderUi.toolbar.structure')}
              >
                <FiGrid />
              </button>
              <div className="divider" style={{ width: 1, height: 22, margin: '0 6px' }} />
              <button className="icon-btn" type="button" onClick={handleZoomOut} title={t('sitePanelShell.pageBuilderUi.toolbar.zoomOut')}>
                <FiMinus />
              </button>
              <button className="icon-btn" type="button" onClick={handleZoomIn} title={t('sitePanelShell.pageBuilderUi.toolbar.zoomIn')}>
                <FiPlus />
              </button>
              <button className="icon-btn" type="button" onClick={handleZoomReset} title={t('sitePanelShell.pageBuilderUi.toolbar.resetView')}>
                <FiRotateCcw />
              </button>
              <button className="icon-btn" type="button" onClick={handleFitToViewport} title={t('sitePanelShell.pageBuilderUi.toolbar.fitToViewport')}>
                <FiMaximize />
              </button>
              <button
                className="icon-btn"
                type="button"
                aria-pressed={panEnabled}
                onClick={() => setPanEnabled((prev) => !prev)}
                title={t('sitePanelShell.pageBuilderUi.toolbar.panMode')}
              >
                <FiMove />
              </button>
              <span className="detail-label" style={{ padding: '0 6px', fontWeight: 800, minWidth: 46, textAlign: 'center' }}>
                {zoomPercent}%
              </span>
            </div>

            <div
              ref={viewportRef}
              className={`builder-canvas-viewport${panEnabled ? ' pan-enabled' : ''}${isPanning ? ' is-panning' : ''}`}
              onWheel={handleViewportWheel}
              onDoubleClick={handleFitToViewport}
              onPointerDown={handleViewportPointerDown}
              onPointerMove={handleViewportPointerMove}
              onPointerUp={handleViewportPointerUp}
              onPointerCancel={handleViewportPointerUp}
            >

              <div
                ref={pageRef}
                className="page-float"
                aria-label={t('sitePanelShell.pageBuilderUi.toolbar.floatingPreview')}
                id="builder-page"
                style={{
                  width: previewWidth,
                  maxWidth: '100%',
                  marginInline: 'auto',
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'top center',
                }}
              >
                <div className="bar">
                  <div className="skel a"></div>
                  <div className="pill-row">
                    <div className="skel b" style={{ width: 36 }}></div>
                    <div className="skel b" style={{ width: 36 }}></div>
                  </div>
                </div>
                <div className={`builder-page-canvas mode-${editorMode}`} id="builder-canvas" style={{ padding: '26px 28px 40px 28px' }}>
                  <Suspense fallback={<div className="flex items-center justify-center h-full"><LoadingSpinner text={t('sitePanelShell.pageBuilderUi.canvas.loadingCanvas')} /></div>}>
                    <PageBuilderCanvas content={content} onContentChange={onContentChange} />
                  </Suspense>
                </div>
              </div>
              <div className="canvas-help" data-no-pan="true">{t('sitePanelShell.pageBuilderUi.canvas.helpText')}</div>
            </div>
          </div>

          <aside className="card panel builder-right-panel" aria-label={t('sitePanelShell.pageBuilderUi.panels.properties')}>
            <h3>{t('sitePanelShell.pageBuilderUi.panels.properties')}</h3>
            <div className="slot builder-right-stack">
              <Suspense fallback={<div className="card" style={{ padding: 12 }}><LoadingSpinner /></div>}>
                <PropertiesPanel />
              </Suspense>

              <div className="card builder-history-card">
                <div className="row-between">
                  <div style={{ fontWeight: 900 }}>{t('sitePanelShell.pageBuilderUi.panels.history')}</div>
                  <div className="detail-label">
                    {canUndo || canRedo
                      ? t('sitePanelShell.pageBuilderUi.panels.changesReady')
                      : t('sitePanelShell.pageBuilderUi.panels.noHistoryYet')}
                  </div>
                </div>
                <div className="builder-history-grid" style={{ marginTop: 10 }}>
                  <button className="btn" type="button" onClick={undo} disabled={!canUndo}>{t('sitePanelShell.pageBuilderUi.historyActions.undo')}</button>
                  <button className="btn" type="button" onClick={redo} disabled={!canRedo}>{t('sitePanelShell.pageBuilderUi.historyActions.redo')}</button>
                  <button
                    className="btn"
                    type="button"
                    onClick={() => selectedBlock && deleteBlock(selectedBlock.id)}
                    disabled={!selectedBlock}
                  >
                    {t('sitePanelShell.pageBuilderUi.historyActions.deleteSelected')}
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <DragOverlay>
          {activeDrag && (
            <div className="px-4 py-3 bg-surface-2 border border-[rgba(0,163,255,0.35)] rounded-[14px] shadow-soft text-sm font-semibold text-primary">
              {getDraggedType(activeDrag) || t('sitePanelShell.pageBuilderUi.drag.block')}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}














