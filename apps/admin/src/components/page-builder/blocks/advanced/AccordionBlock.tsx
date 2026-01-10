/**
 * AccordionBlock Component
 * 
 * Blok akordeon z item nodes pattern.
 * AccordionBlock → zawiera AccordionItem children
 */

import React, { useState } from 'react';
import { FiPlus, FiChevronDown } from 'react-icons/fi';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint, usePageBuilderStore, useBlockChildren } from '@/stores/page-builder-store';
import styles from './AccordionBlock.module.css';

export const AccordionBlock: React.FC<BlockComponentProps> = ({ 
  node,
  children,
  isPreview,
}) => {
  const breakpoint = useCurrentBreakpoint();
  const childIds = useBlockChildren(node.id);
  const addBlock = usePageBuilderStore((state) => state.addBlock);
  const commit = usePageBuilderStore((state) => state.commit);
  const content = usePageBuilderStore((state) => state.content);
  
  // Multiple items can be open (controlled by allowMultiple prop)
  const allowMultiple = node.props.content.allowMultiple as boolean ?? true;
  const [openItems, setOpenItems] = useState<Set<string>>(new Set([childIds[0]]));
  
  // Merge styles
  const mergedStyles = mergeBlockStyles(node.props.style, breakpoint);
  
  const containerStyle: React.CSSProperties = {
    backgroundColor: mergedStyles.backgroundColor as string,
    borderRadius: mergedStyles.borderRadius as string,
  };
  
  // Toggle item
  const toggleItem = (itemId: string) => {
    setOpenItems(prev => {
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
      setOpenItems(prev => new Set(prev).add(newId));
    }
  };
  
  return (
    <div 
      className={styles.accordion}
      style={containerStyle}
      data-block-type="accordion"
    >
      {childIds.map((childId, index) => {
        const itemNode = content.nodes[childId];
        const itemTitle = (itemNode?.props.content.title as string) || `Item ${index + 1}`;
        const isOpen = openItems.has(childId);
        
        // Get corresponding child component
        const childComponent = React.Children.toArray(children)[index];
        
        return (
          <div 
            key={childId} 
            className={`${styles.item} ${isOpen ? styles.open : ''}`}
          >
            <button
              className={styles.itemHeader}
              onClick={() => toggleItem(childId)}
              type="button"
              aria-expanded={isOpen}
            >
              <span className={styles.itemTitle}>{itemTitle}</span>
              <FiChevronDown className={styles.itemIcon} />
            </button>
            
            <div className={styles.itemContent}>
              <div className={styles.itemInner}>
                {childComponent}
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Add item button (edit mode only) */}
      {!isPreview && (
        <button
          className={styles.addItemBtn}
          onClick={handleAddItem}
          type="button"
        >
          <FiPlus />
          <span>Add item</span>
        </button>
      )}
      
      {childIds.length === 0 && (
        <div className={styles.emptyState}>
          <p>No items yet. Click to add an item.</p>
        </div>
      )}
    </div>
  );
};

export default AccordionBlock;
