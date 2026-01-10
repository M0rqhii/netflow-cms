/**
 * ColumnBlock
 * 
 * Kolumna w sekcji - kontener dla bloków treści.
 * - type: 'column'
 * - allowedChildren: ['heading', 'text', 'image', 'button']
 * - allowedParents: ['section']
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';
import styles from './ColumnBlock.module.css';

export const ColumnBlock: React.FC<BlockComponentProps> = ({ 
  node, 
  children,
  isPreview,
}) => {
  const breakpoint = useCurrentBreakpoint();
  
  // Get width from content
  const width = (node.props.content.width as string) || '50%';
  
  // Merge styles for current breakpoint
  const mergedStyles = mergeBlockStyles(node.props.style, breakpoint);
  
  // Mobile: full width
  const effectiveWidth = breakpoint === 'mobile' ? '100%' : width;
  
  const containerStyle: React.CSSProperties = {
    width: effectiveWidth,
    flexBasis: effectiveWidth,
    padding: mergedStyles.padding as string,
    backgroundColor: mergedStyles.backgroundColor as string,
  };
  
  return (
    <div 
      className={styles.column}
      style={containerStyle}
      data-block-type="column"
    >
      {children}
    </div>
  );
};

export default ColumnBlock;
