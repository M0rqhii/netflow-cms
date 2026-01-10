/**
 * SectionBlock
 * 
 * Sekcja strony - kontener dla kolumn i innych bloków.
 * - type: 'section'
 * - allowedChildren: ['column', 'heading', 'text', 'image', 'button']
 * - allowedParents: ['root']
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';
import styles from './SectionBlock.module.css';

export const SectionBlock: React.FC<BlockComponentProps> = ({ 
  node, 
  children,
  isPreview,
}) => {
  const breakpoint = useCurrentBreakpoint();
  
  // Merge styles for current breakpoint
  const mergedStyles = mergeBlockStyles(node.props.style, breakpoint);
  
  const containerStyle: React.CSSProperties = {
    padding: mergedStyles.padding as string,
    backgroundColor: mergedStyles.backgroundColor as string,
    maxWidth: mergedStyles.maxWidth as string,
  };
  
  return (
    <section 
      className={styles.section}
      style={containerStyle}
      data-block-type="section"
    >
      <div className={styles.inner}>
        {children}
      </div>
    </section>
  );
};

export default SectionBlock;
