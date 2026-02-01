/**
 * AccordionItemBlock Component
 * 
 * Pojedynczy element akordeon - item node dla AccordionBlock.
 * Może zawierać inne bloki.
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import styles from './AccordionItemBlock.module.css';

export const AccordionItemBlock: React.FC<BlockComponentProps> = ({ children }) => {
  return (
    <div 
      className={styles.accordionItem}
      data-block-type="accordion-item"
    >
      {children}
      
      {/* Empty state */}
      {!children && (
        <div className={styles.emptyContent}>
          <p>Drop content here</p>
        </div>
      )}
    </div>
  );
};

export default AccordionItemBlock;
