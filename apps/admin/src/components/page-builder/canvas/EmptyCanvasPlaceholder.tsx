/**
 * Empty Canvas Placeholder
 * 
 * Wyświetlany gdy canvas jest pusty.
 * Dropzone dla pierwszego bloku.
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { FiPlus, FiLayers } from 'react-icons/fi';
import styles from './EmptyCanvasPlaceholder.module.css';

type EmptyCanvasPlaceholderProps = {
  rootId: string;
};

export const EmptyCanvasPlaceholder: React.FC<EmptyCanvasPlaceholderProps> = ({
  rootId,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `empty-canvas-${rootId}`,
    data: {
      isDropZone: true,
      parentId: rootId,
      index: 0,
    },
  });
  
  return (
    <div
      ref={setNodeRef}
      className={`${styles.placeholder} ${isOver ? styles.isOver : ''}`}
    >
      <div className={styles.icon}>
        <FiLayers />
      </div>
      <h3 className={styles.title}>Start Building Your Page</h3>
      <p className={styles.description}>
        Drag a block from the left panel or click below to add your first section
      </p>
      <div className={styles.dropHint}>
        <FiPlus />
        <span>Drop a block here</span>
      </div>
    </div>
  );
};

export default EmptyCanvasPlaceholder;
