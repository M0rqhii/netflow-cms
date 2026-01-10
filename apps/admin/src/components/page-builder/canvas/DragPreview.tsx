/**
 * Drag Preview Component
 * 
 * Preview pokazywany podczas przeciągania bloku.
 */

import React from 'react';
import { blockRegistry } from '@/lib/page-builder/block-registry';
import { DragData, isNewBlockDrag } from '@/lib/page-builder/dnd-utils';
import { usePageBuilderStore } from '@/stores/page-builder-store';
import styles from './DragPreview.module.css';

type DragPreviewProps = {
  data: DragData;
};

export const DragPreview: React.FC<DragPreviewProps> = ({ data }) => {
  if (isNewBlockDrag(data)) {
    // New block from palette
    const definition = blockRegistry.getBlock(data.blockType);
    
    return (
      <div className={styles.preview}>
        <div className={styles.icon}>
          {definition?.icon}
        </div>
        <span className={styles.label}>
          {definition?.title || data.blockType}
        </span>
      </div>
    );
  }
  
  // Existing block
  const content = usePageBuilderStore.getState().content;
  const node = content.nodes[data.nodeId];
  const definition = node ? blockRegistry.getBlock(node.type) : null;
  
  return (
    <div className={styles.preview}>
      <div className={styles.icon}>
        {definition?.icon}
      </div>
      <span className={styles.label}>
        {node?.meta?.label || definition?.title || node?.type || 'Block'}
      </span>
    </div>
  );
};

export default DragPreview;
