/**
 * DropZone Component
 * 
 * Strefa zrzutu dla bloków (używana wewnątrz container blocks).
 */

import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import styles from './DropZone.module.css';

type DropZoneProps = {
  parentId: string;
  index?: number;
  className?: string;
  children?: React.ReactNode;
};

export const DropZone: React.FC<DropZoneProps> = ({
  parentId,
  index,
  className,
  children,
}) => {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `dropzone-${parentId}-${index ?? 'end'}`,
    data: {
      isDropZone: true,
      parentId,
      index,
    },
  });
  
  return (
    <div
      ref={setNodeRef}
      className={`${styles.dropZone} ${isOver ? styles.isOver : ''} ${active ? styles.hasActive : ''} ${className || ''}`}
      data-drop-zone
      data-parent-id={parentId}
    >
      {children}
    </div>
  );
};

export default DropZone;
