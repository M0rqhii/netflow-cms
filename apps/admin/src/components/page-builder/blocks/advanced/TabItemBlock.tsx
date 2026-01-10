/**
 * TabItemBlock Component
 * 
 * Pojedyncza zakładka - item node dla TabsBlock.
 * Może zawierać inne bloki.
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import styles from './TabItemBlock.module.css';

export const TabItemBlock: React.FC<BlockComponentProps> = ({ 
  node,
  children,
  isPreview,
}) => {
  return (
    <div 
      className={styles.tabItem}
      data-block-type="tab-item"
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

export default TabItemBlock;
