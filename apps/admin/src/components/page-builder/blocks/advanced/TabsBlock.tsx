/**
 * TabsBlock Component
 * 
 * Blok zakładek z item nodes pattern.
 * TabsBlock → zawiera TabItem children
 */

import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint, usePageBuilderStore, useBlockChildren } from '@/stores/page-builder-store';
import styles from './TabsBlock.module.css';

export const TabsBlock: React.FC<BlockComponentProps> = ({ node, children, isPreview }) => {
  const breakpoint = useCurrentBreakpoint();
  const childIds = useBlockChildren(node.id);
  const addBlock = usePageBuilderStore((state) => state.addBlock);
  const commit = usePageBuilderStore((state) => state.commit);
  const content = usePageBuilderStore((state) => state.content);
  
  // Active tab (default to first)
  const [activeTabId, setActiveTabId] = useState<string | null>(childIds[0] || null);
  
  // Merge styles
  const mergedStyles = mergeBlockStyles(node.props.style, breakpoint);
  
  const containerStyle: React.CSSProperties = {
    backgroundColor: mergedStyles.backgroundColor as string,
    borderRadius: mergedStyles.borderRadius as string,
  };
  
  // Add new tab
  const handleAddTab = () => {
    const newId = addBlock(node.id, 'tab-item');
    if (newId) {
      commit('add');
      setActiveTabId(newId);
    }
  };
  
  // Update active tab when childIds change
  React.useEffect(() => {
    if (!activeTabId || !childIds.includes(activeTabId)) {
      setActiveTabId(childIds[0] || null);
    }
  }, [childIds, activeTabId]);
  
  return (
    <div 
      className={styles.tabs}
      style={containerStyle}
      data-block-type="tabs"
    >
      {/* Tab headers */}
      <div className={styles.tabHeaders}>
        {childIds.map((childId, index) => {
          const tabNode = content.nodes[childId];
          const tabTitle = (tabNode?.props.content.title as string) || `Tab ${index + 1}`;
          
          return (
            <button
              key={childId}
              className={`${styles.tabHeader} ${activeTabId === childId ? styles.active : ''}`}
              onClick={() => setActiveTabId(childId)}
              type="button"
            >
              {tabTitle}
            </button>
          );
        })}
        
        {/* Dodaj zak�adk� button (edit mode only) */}
        {!isPreview && (
          <button
            className={styles.addTabBtn}
            onClick={handleAddTab}
            title="Dodaj zak�adk�"
            type="button"
          >
            <FiPlus />
          </button>
        )}
      </div>
      
      {/* Tab content */}
      <div className={styles.tabContent}>
        {React.Children.map(children, (child, index) => {
          const childId = childIds[index];
          const isActive = childId === activeTabId;
          
          return (
            <div 
              className={`${styles.tabPanel} ${isActive ? styles.visible : ''}`}
              role="tabpanel"
              hidden={!isActive}
            >
              {child}
            </div>
          );
        })}
        
        {childIds.length === 0 && (
          <div className={styles.emptyState}>
            <p>Brak zak�adek. Kliknij +, aby doda� zak�adk�.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TabsBlock;


