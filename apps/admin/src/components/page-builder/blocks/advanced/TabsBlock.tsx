/**
 * TabsBlock Component
 *
 * Tabs block with item nodes pattern.
 * TabsBlock contains TabItem children.
 */

import React, { useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
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
  const mergedStyles = mergeBlockStyles(node.props?.style, breakpoint);

  const containerStyle: React.CSSProperties = {
    backgroundColor: (mergedStyles.backgroundColor as string) || undefined,
    borderRadius: (mergedStyles.borderRadius as string) || undefined,
    padding: mergedStyles.padding != null ? toSpacingCSS(mergedStyles.padding) : undefined,
    margin: mergedStyles.margin != null ? toSpacingCSS(mergedStyles.margin) : undefined,
    border: (mergedStyles.border as string) || undefined,
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

  const tabListId = `tabs-${node.id}`;
  return (
    <div className={styles.tabs} style={containerStyle} data-block-type="tabs">
      <div className={styles.tabHeaders} role="tablist" id={tabListId} aria-label="Tabs">
        {childIds.map((childId, index) => {
          const tabNode = content.nodes[childId];
          const tabTitle = (tabNode?.props?.content?.title as string) || `Tab ${index + 1}`;
          const isActive = childId === activeTabId;
          const panelId = `tabpanel-${childId}`;
          const tabId = `tab-${childId}`;

          return (
            <button
              key={childId}
              id={tabId}
              role="tab"
              aria-selected={isActive}
              aria-controls={panelId}
              tabIndex={isActive ? 0 : -1}
              className={`${styles.tabHeader} ${isActive ? styles.active : ''}`}
              onClick={() => setActiveTabId(childId)}
              type="button"
            >
              {tabTitle}
            </button>
          );
        })}
        {!isPreview && (
          <button className={styles.addTabBtn} onClick={handleAddTab} title="Add tab" type="button" aria-label="Add tab">
            <FiPlus />
          </button>
        )}
      </div>

      <div className={styles.tabContent}>
        {React.Children.map(children, (child, index) => {
          const childId = childIds[index];
          const isActive = childId === activeTabId;
          const panelId = `tabpanel-${childId}`;
          const tabId = `tab-${childId}`;

          return (
            <div
              id={panelId}
              role="tabpanel"
              aria-labelledby={tabId}
              tabIndex={0}
              className={`${styles.tabPanel} ${isActive ? styles.visible : ''}`}
              hidden={!isActive}
            >
              {child}
            </div>
          );
        })}

        {childIds.length === 0 && (
          <div className={styles.emptyState}>
            <p>No tabs yet. Click + to add one.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TabsBlock;
