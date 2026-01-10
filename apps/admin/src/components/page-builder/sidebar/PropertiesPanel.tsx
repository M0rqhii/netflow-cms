/**
 * Properties Panel Component
 * 
 * Panel edycji właściwości wybranego bloku.
 * Features: tabs (Content/Style/Advanced), draft state, debounced commit.
 */

import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  FiType,
  FiPenTool,
  FiSettings,
  FiTrash2,
  FiCopy,
  FiLock,
  FiUnlock,
  FiX,
} from 'react-icons/fi';
import {
  useSelectedBlock,
  usePageBuilderStore,
  useCurrentBreakpoint,
} from '@/stores/page-builder-store';
import { blockRegistry } from '@/lib/page-builder/block-registry';
import { ContentEditor } from './editors/ContentEditor';
import { StyleEditor } from './editors/StyleEditor';
import { AdvancedEditor } from './editors/AdvancedEditor';
import type { BlockNode, BlockProps } from '@/lib/page-builder/types';
import styles from './PropertiesPanel.module.css';

// =============================================================================
// TYPES
// =============================================================================

type Tab = 'content' | 'style' | 'advanced';

// =============================================================================
// PROPERTIES PANEL
// =============================================================================

export const PropertiesPanel: React.FC = () => {
  const selectedBlock = useSelectedBlock();
  const currentBreakpoint = useCurrentBreakpoint();
  
  const updateBlockProps = usePageBuilderStore((state) => state.updateBlockProps);
  const updateBlockMeta = usePageBuilderStore((state) => state.updateBlockMeta);
  const deleteBlock = usePageBuilderStore((state) => state.deleteBlock);
  const copyBlock = usePageBuilderStore((state) => state.copyBlock);
  const selectBlock = usePageBuilderStore((state) => state.selectBlock);
  const commit = usePageBuilderStore((state) => state.commit);
  const scheduleCommit = usePageBuilderStore((state) => state.scheduleCommit);
  
  const [activeTab, setActiveTab] = useState<Tab>('content');
  const [draftProps, setDraftProps] = useState<BlockProps | null>(null);
  
  // Get block definition
  const definition = selectedBlock ? blockRegistry.getBlock(selectedBlock.type) : null;
  
  // Reset draft when selection changes
  useEffect(() => {
    if (selectedBlock) {
      setDraftProps(structuredClone(selectedBlock.props));
    } else {
      setDraftProps(null);
    }
  }, [selectedBlock?.id]);
  
  // Handle prop change (draft)
  const handlePropChange = useCallback((
    section: 'content' | 'style' | 'advanced',
    key: string,
    value: unknown
  ) => {
    if (!selectedBlock || !draftProps) return;
    
    const newDraftProps = structuredClone(draftProps);
    
    if (section === 'style') {
      // Handle responsive styles
      if (currentBreakpoint === 'desktop') {
        (newDraftProps.style.base as Record<string, unknown>)[key] = value;
      } else {
        if (!newDraftProps.style.responsive) {
          newDraftProps.style.responsive = {};
        }
        if (!newDraftProps.style.responsive[currentBreakpoint]) {
          newDraftProps.style.responsive[currentBreakpoint] = {};
        }
        (newDraftProps.style.responsive[currentBreakpoint] as Record<string, unknown>)[key] = value;
      }
    } else if (section === 'content') {
      (newDraftProps.content as Record<string, unknown>)[key] = value;
    } else if (section === 'advanced') {
      if (!newDraftProps.advanced) {
        newDraftProps.advanced = {};
      }
      (newDraftProps.advanced as Record<string, unknown>)[key] = value;
    }
    
    setDraftProps(newDraftProps);
    
    // Update store (triggers re-render)
    updateBlockProps(selectedBlock.id, newDraftProps);
    
    // Schedule commit for history
    scheduleCommit();
  }, [selectedBlock, draftProps, currentBreakpoint, updateBlockProps, scheduleCommit]);
  
  // Clear style override
  const handleClearOverride = useCallback((key: string) => {
    if (!selectedBlock || !draftProps || currentBreakpoint === 'desktop') return;
    
    const newDraftProps = structuredClone(draftProps);
    
    if (newDraftProps.style.responsive?.[currentBreakpoint]) {
      delete (newDraftProps.style.responsive[currentBreakpoint] as Record<string, unknown>)[key];
      
      // Clean up empty objects
      if (Object.keys(newDraftProps.style.responsive[currentBreakpoint]!).length === 0) {
        delete newDraftProps.style.responsive[currentBreakpoint];
      }
      if (Object.keys(newDraftProps.style.responsive).length === 0) {
        delete newDraftProps.style.responsive;
      }
    }
    
    setDraftProps(newDraftProps);
    updateBlockProps(selectedBlock.id, newDraftProps);
    scheduleCommit();
  }, [selectedBlock, draftProps, currentBreakpoint, updateBlockProps, scheduleCommit]);
  
  // Handle delete
  const handleDelete = useCallback(() => {
    if (!selectedBlock) return;
    
    deleteBlock(selectedBlock.id);
    commit('delete');
  }, [selectedBlock, deleteBlock, commit]);
  
  // Handle copy
  const handleCopy = useCallback(() => {
    if (!selectedBlock) return;
    copyBlock(selectedBlock.id);
  }, [selectedBlock, copyBlock]);
  
  // Handle lock toggle
  const handleLockToggle = useCallback(() => {
    if (!selectedBlock) return;
    
    updateBlockMeta(selectedBlock.id, {
      locked: !selectedBlock.meta?.locked,
    });
    commit('apply');
  }, [selectedBlock, updateBlockMeta, commit]);
  
  // Handle close
  const handleClose = useCallback(() => {
    selectBlock(null);
  }, [selectBlock]);
  
  // Empty state
  if (!selectedBlock || !draftProps) {
    return (
      <div className={styles.panel}>
        <div className={styles.emptyState}>
          <FiPenTool className={styles.emptyIcon} />
          <p>Select a block to edit its properties</p>
        </div>
      </div>
    );
  }
  
  const isLocked = selectedBlock.meta?.locked;
  
  return (
    <div className={styles.panel}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <div className={styles.blockIcon}>
            {definition?.icon}
          </div>
          <div className={styles.blockDetails}>
            <span className={styles.blockTitle}>
              {selectedBlock.meta?.label || definition?.title || selectedBlock.type}
            </span>
            <span className={styles.blockType}>{selectedBlock.type}</span>
          </div>
        </div>
        
        <div className={styles.headerActions}>
          <button
            className={styles.actionBtn}
            onClick={handleCopy}
            title="Copy block"
          >
            <FiCopy />
          </button>
          <button
            className={`${styles.actionBtn} ${isLocked ? styles.active : ''}`}
            onClick={handleLockToggle}
            title={isLocked ? 'Unlock block' : 'Lock block'}
          >
            {isLocked ? <FiLock /> : <FiUnlock />}
          </button>
          <button
            className={`${styles.actionBtn} ${styles.danger}`}
            onClick={handleDelete}
            title="Delete block"
            disabled={isLocked}
          >
            <FiTrash2 />
          </button>
          <button
            className={styles.closeBtn}
            onClick={handleClose}
            title="Close panel"
          >
            <FiX />
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'content' ? styles.active : ''}`}
          onClick={() => setActiveTab('content')}
        >
          <FiType />
          <span>Content</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'style' ? styles.active : ''}`}
          onClick={() => setActiveTab('style')}
        >
          <FiPenTool />
          <span>Style</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'advanced' ? styles.active : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          <FiSettings />
          <span>Advanced</span>
        </button>
      </div>
      
      {/* Tab content */}
      <div className={styles.tabContent}>
        {activeTab === 'content' && (
          <ContentEditor
            node={selectedBlock}
            props={draftProps}
            schema={definition?.propsSchema?.content}
            onChange={(key, value) => handlePropChange('content', key, value)}
          />
        )}
        
        {activeTab === 'style' && (
          <StyleEditor
            node={selectedBlock}
            props={draftProps}
            schema={definition?.propsSchema?.style}
            currentBreakpoint={currentBreakpoint}
            onChange={(key, value) => handlePropChange('style', key, value)}
            onClearOverride={handleClearOverride}
          />
        )}
        
        {activeTab === 'advanced' && (
          <AdvancedEditor
            node={selectedBlock}
            props={draftProps}
            schema={definition?.propsSchema?.advanced}
            onChange={(key, value) => handlePropChange('advanced', key, value)}
          />
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;
