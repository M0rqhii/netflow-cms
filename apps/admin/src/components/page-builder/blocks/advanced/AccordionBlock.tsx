/**
 * AccordionBlock Component
 *
 * Accordion block with item nodes pattern.
 * AccordionBlock contains AccordionItem children.
 */

import React, { useState } from 'react';
import { FiPlus, FiChevronDown } from 'react-icons/fi';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint, usePageBuilderStore, useBlockChildren } from '@/stores/page-builder-store';
import styles from './AccordionBlock.module.css';

export const AccordionBlock: React.FC<BlockComponentProps> = ({ node, children, isPreview }) => {
  const breakpoint = useCurrentBreakpoint();
  const childIds = useBlockChildren(node.id);
  const addBlock = usePageBuilderStore((state) => state.addBlock);
  const commit = usePageBuilderStore((state) => state.commit);
  const content = usePageBuilderStore((state) => state.content);

  // Multiple items can be open (controlled by allowMultiple prop)
  const allowMultiple = (node.props?.content?.allowMultiple as boolean) ?? true;
  const [openItems, setOpenItems] = useState<Set<string>>(() =>
    childIds.length > 0 ? new Set([childIds[0]]) : new Set()
  );

  // Merge styles
  const mergedStyles = mergeBlockStyles(node.props?.style, breakpoint);

  const containerStyle: React.CSSProperties = {
    backgroundColor: (mergedStyles.backgroundColor as string) || undefined,
    borderRadius: (mergedStyles.borderRadius as string) || undefined,
    padding: mergedStyles.padding != null ? toSpacingCSS(mergedStyles.padding) : undefined,
    margin: mergedStyles.margin != null ? toSpacingCSS(mergedStyles.margin) : undefined,
    border: (mergedStyles.border as string) || undefined,
  };

  // Toggle item
  const toggleItem = (itemId: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(itemId);
      }

      return next;
    });
  };

  // Add new item
  const handleAddItem = () => {
    const newId = addBlock(node.id, 'accordion-item');
    if (newId) {
      commit('add');
      setOpenItems((prev) => new Set(prev).add(newId));
    }
  };

  // When children change: clear when none; open first when items exist but none open
  React.useEffect(() => {
    if (childIds.length === 0) {
      setOpenItems(new Set());
      return;
    }
    setOpenItems((prev) => {
      const hasAnyOpen = childIds.some((id) => prev.has(id));
      if (!hasAnyOpen) return new Set([childIds[0]]);
      return prev;
    });
  }, [childIds]);

  return (
    <div className={styles.accordion} style={containerStyle} data-block-type="accordion">
      {childIds.map((childId, index) => {
        const itemNode = content.nodes[childId];
        const itemTitle = (itemNode?.props?.content?.title as string) || `Item ${index + 1}`;
        const isOpen = openItems.has(childId);

        // Get corresponding child component
        const childComponent = React.Children.toArray(children)[index];

        const headerId = `accordion-header-${childId}`;
        const panelId = `accordion-panel-${childId}`;
        return (
          <div key={childId} className={`${styles.item} ${isOpen ? styles.open : ''}`}>
            <button
              id={headerId}
              className={styles.itemHeader}
              onClick={() => toggleItem(childId)}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
            >
              <span className={styles.itemTitle}>{itemTitle}</span>
              <FiChevronDown className={styles.itemIcon} aria-hidden />
            </button>

            <div
              id={panelId}
              role="region"
              aria-labelledby={headerId}
              aria-hidden={!isOpen}
              className={styles.itemContent}
            >
              <div className={styles.itemInner}>{childComponent}</div>
            </div>
          </div>
        );
      })}

      {/* Add item button (edit mode only) */}
      {!isPreview && (
        <button className={styles.addItemBtn} onClick={handleAddItem} type="button">
          <FiPlus />
          <span>Add item</span>
        </button>
      )}

      {childIds.length === 0 && (
        <div className={styles.emptyState}>
          <p>No items yet. Click to add one.</p>
        </div>
      )}
    </div>
  );
};

export default AccordionBlock;
