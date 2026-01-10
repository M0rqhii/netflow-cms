/**
 * TextBlock
 * 
 * Blok tekstu z sanityzacją HTML.
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles } from '@/lib/page-builder/style-utils';
import { sanitizeHtml } from '@/lib/page-builder/sanitize';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';
import styles from './TextBlock.module.css';

export const TextBlock: React.FC<BlockComponentProps> = ({ 
  node,
  isPreview,
}) => {
  const breakpoint = useCurrentBreakpoint();
  
  const html = (node.props.content.html as string) || '<p>Enter text here...</p>';
  
  // Sanitize HTML
  const sanitizedHtml = sanitizeHtml(html);
  
  // Merge styles for current breakpoint
  const mergedStyles = mergeBlockStyles(node.props.style, breakpoint);
  
  const textStyle: React.CSSProperties = {
    textAlign: mergedStyles.textAlign as React.CSSProperties['textAlign'],
    color: mergedStyles.color as string,
    fontSize: mergedStyles.fontSize as string,
    lineHeight: mergedStyles.lineHeight as string,
    margin: mergedStyles.margin as string,
  };
  
  return (
    <div 
      className={styles.text}
      style={textStyle}
      data-block-type="text"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default TextBlock;
