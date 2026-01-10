/**
 * BlockControls Component
 * 
 * Kontrolki bloku widoczne po selekcji (duplicate, delete, move).
 */

import React, { memo } from 'react';
import { FiCopy, FiTrash2, FiChevronUp, FiChevronDown } from 'react-icons/fi';
import { usePageBuilderStore, useBlockNode } from '@/stores/page-builder-store';
import styles from './BlockControls.module.css';

type BlockControlsProps = {
  nodeId: string;
};

export const BlockControls: React.FC<BlockControlsProps> = memo(({ nodeId }) => {
  const node = useBlockNode(nodeId);
  const copyBlock = usePageBuilderStore((state) => state.copyBlock);
  const pasteBlock = usePageBuilderStore((state) => state.pasteBlock);
  const deleteBlock = usePageBuilderStore((state) => state.deleteBlock);
  const moveBlockUp = usePageBuilderStore((state) => state.moveBlockUp);
  const moveBlockDown = usePageBuilderStore((state) => state.moveBlockDown);
  const commit = usePageBuilderStore((state) => state.commit);
  
  if (!node || !node.parentId) return null;
  
  const isLocked = node.meta?.locked;
  
  const handleDuplicate = (e: React.MouseEvent) => {
    e.stopPropagation();
    copyBlock(nodeId);
    pasteBlock(node.parentId!, undefined);
    commit('paste');
  };
  
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteBlock(nodeId);
    commit('delete');
  };
  
  const handleMoveUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    moveBlockUp(nodeId);
    commit('shortcut');
  };
  
  const handleMoveDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    moveBlockDown(nodeId);
    commit('shortcut');
  };
  
  return (
    <div className={styles.controls}>
      <button
        className={styles.controlBtn}
        onClick={handleMoveUp}
        title="Move up (Alt+↑)"
        disabled={isLocked}
      >
        <FiChevronUp />
      </button>
      <button
        className={styles.controlBtn}
        onClick={handleMoveDown}
        title="Move down (Alt+↓)"
        disabled={isLocked}
      >
        <FiChevronDown />
      </button>
      <button
        className={styles.controlBtn}
        onClick={handleDuplicate}
        title="Duplicate (Ctrl+D)"
      >
        <FiCopy />
      </button>
      <button
        className={`${styles.controlBtn} ${styles.danger}`}
        onClick={handleDelete}
        title="Delete (Delete)"
        disabled={isLocked}
      >
        <FiTrash2 />
      </button>
    </div>
  );
});

BlockControls.displayName = 'BlockControls';

export default BlockControls;
