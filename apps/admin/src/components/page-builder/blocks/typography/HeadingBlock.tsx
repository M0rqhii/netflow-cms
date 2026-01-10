/**
 * HeadingBlock
 * 
 * Blok nagłówka (H1-H6).
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';
import styles from './HeadingBlock.module.css';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

export const HeadingBlock: React.FC<BlockComponentProps> = ({ 
  node,
  isPreview,
}) => {
  const breakpoint = useCurrentBreakpoint();
  
  const text = (node.props.content.text as string) || 'Heading';
  const level = (node.props.content.level as HeadingLevel) || 'h2';
  
  // Merge styles for current breakpoint
  const mergedStyles = mergeBlockStyles(node.props.style, breakpoint);
  
  const headingStyle: React.CSSProperties = {
    textAlign: mergedStyles.textAlign as React.CSSProperties['textAlign'],
    color: mergedStyles.color as string,
    fontSize: mergedStyles.fontSize as string,
    margin: mergedStyles.margin as string,
  };
  
  const Tag = level;
  
  return (
    <Tag 
      className={styles.heading}
      style={headingStyle}
      data-block-type="heading"
    >
      {text}
    </Tag>
  );
};

export default HeadingBlock;
