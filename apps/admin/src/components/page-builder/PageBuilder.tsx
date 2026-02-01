/**
 * Page Builder Main Component
 * 
 * Główny komponent page buildera.
 * Łączy wszystkie elementy: Toolbar, BlockBrowser, Canvas, PropertiesPanel.
 */

import React, { useEffect, useCallback } from 'react';
import { usePageBuilderStore } from '@/stores/page-builder-store';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Toolbar } from './toolbar';
import { BlockBrowser, PropertiesPanel } from './sidebar';
import { Canvas } from './canvas';
import { DebugPanel } from './dev';
import { registerAllBlocks } from './blocks/registerBlocks';
import { PageBuilderProvider } from './PageBuilderContext';
import type { PageContent } from '@/lib/page-builder/types';
import styles from './PageBuilder.module.css';

// =============================================================================
// TYPES
// =============================================================================

type PageBuilderProps = {
  /** ID site'u - wymagane do pobierania mediów per-site */
  siteId: string;
  /** Slug site'u - opcjonalny */
  siteSlug?: string;
  initialContent?: PageContent;
  onSave?: (content: PageContent) => Promise<void>;
  title?: string;
  /** Tryb read-only - wyłącza edycję */
  readOnly?: boolean;
};

// =============================================================================
// PAGE BUILDER
// =============================================================================

export const PageBuilder: React.FC<PageBuilderProps> = ({
  siteId,
  siteSlug,
  initialContent,
  onSave,
  title = 'Page Builder',
  readOnly = false,
}) => {
  const initContent = usePageBuilderStore((state) => state.initContent);
  const content = usePageBuilderStore((state) => state.content);
  const setSaveStatus = usePageBuilderStore((state) => state.setSaveStatus);
  const markSaved = usePageBuilderStore((state) => state.markSaved);
  const propertiesPanelOpen = usePageBuilderStore((state) => state.propertiesPanelOpen);
  
  // Register blocks on mount
  useEffect(() => {
    registerAllBlocks();
  }, []);
  
  // Initialize content
  useEffect(() => {
    if (initialContent) {
      initContent(initialContent);
    }
  }, [initialContent, initContent]);
  
  // Save handler
  const handleSave = useCallback(async () => {
    if (!onSave) return;
    
    try {
      setSaveStatus('saving');
      await onSave(content);
      markSaved();
    } catch (error) {
      console.error('[PageBuilder] Save failed:', error);
      setSaveStatus('error');
    }
  }, [content, onSave, setSaveStatus, markSaved]);
  
  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: handleSave,
    enabled: true,
  });
  
  // Warn on unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isDirty = usePageBuilderStore.getState().isDirty;
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
  
  return (
    <PageBuilderProvider siteId={siteId} siteSlug={siteSlug} readOnly={readOnly}>
      <div className={styles.pageBuilder}>
        {/* Toolbar */}
        <Toolbar onSave={handleSave} title={title} />
        
        {/* Main content */}
        <div className={styles.main}>
          {/* Left sidebar - Block Browser */}
          <aside className={styles.leftSidebar}>
            <div className={styles.sidebarHeader}>
              <h2 className={styles.sidebarTitle}>Blocks</h2>
            </div>
            <div className={styles.sidebarContent}>
              <BlockBrowser />
            </div>
          </aside>
          
          {/* Canvas */}
          <main className={styles.canvasArea}>
            <Canvas />
          </main>
          
          {/* Right sidebar - Properties Panel */}
          {propertiesPanelOpen && (
            <aside className={styles.rightSidebar}>
              <PropertiesPanel />
            </aside>
          )}
        </div>
        
        {/* Debug Panel (dev only) */}
        <DebugPanel />
      </div>
    </PageBuilderProvider>
  );
};

export default PageBuilder;
