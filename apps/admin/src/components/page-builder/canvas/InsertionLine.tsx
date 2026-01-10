/**
 * Insertion Line Component
 * 
 * Wizualna linia wskazująca miejsce wstawienia bloku podczas drag & drop.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useBlockChildren } from '@/stores/page-builder-store';
import styles from './InsertionLine.module.css';

type InsertionLineProps = {
  parentId: string;
  index: number;
};

export const InsertionLine: React.FC<InsertionLineProps> = ({ parentId, index }) => {
  const lineRef = useRef<HTMLDivElement>(null);
  const childIds = useBlockChildren(parentId);
  const [position, setPosition] = useState({ top: 0, visible: false });
  
  useEffect(() => {
    // Find parent element and children
    const parentEl = document.querySelector(`[data-block-id="${parentId}"]`);
    if (!parentEl) return;
    
    const childElements = Array.from(
      parentEl.querySelectorAll(':scope > [data-block-wrapper]')
    );
    
    let top = 0;
    
    if (childElements.length === 0) {
      // Empty parent - show at top
      const rect = parentEl.getBoundingClientRect();
      const canvasEl = document.querySelector('[class*="canvas"]');
      if (canvasEl) {
        const canvasRect = canvasEl.getBoundingClientRect();
        top = rect.top - canvasRect.top + 16;
      }
    } else if (index === 0) {
      // Before first child
      const firstChild = childElements[0];
      const rect = firstChild.getBoundingClientRect();
      const canvasEl = document.querySelector('[class*="canvas"]');
      if (canvasEl) {
        const canvasRect = canvasEl.getBoundingClientRect();
        top = rect.top - canvasRect.top - 4;
      }
    } else if (index >= childElements.length) {
      // After last child
      const lastChild = childElements[childElements.length - 1];
      const rect = lastChild.getBoundingClientRect();
      const canvasEl = document.querySelector('[class*="canvas"]');
      if (canvasEl) {
        const canvasRect = canvasEl.getBoundingClientRect();
        top = rect.bottom - canvasRect.top + 4;
      }
    } else {
      // Between children
      const prevChild = childElements[index - 1];
      const nextChild = childElements[index];
      const prevRect = prevChild.getBoundingClientRect();
      const nextRect = nextChild.getBoundingClientRect();
      const canvasEl = document.querySelector('[class*="canvas"]');
      if (canvasEl) {
        const canvasRect = canvasEl.getBoundingClientRect();
        top = (prevRect.bottom + nextRect.top) / 2 - canvasRect.top;
      }
    }
    
    setPosition({ top, visible: true });
  }, [parentId, index, childIds]);
  
  if (!position.visible) return null;
  
  return (
    <div
      ref={lineRef}
      className={styles.insertionLine}
      style={{ top: position.top }}
    >
      <div className={styles.dot} />
      <div className={styles.line} />
      <div className={styles.dot} />
    </div>
  );
};

export default InsertionLine;
