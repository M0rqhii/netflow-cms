/**
 * ButtonBlock
 * 
 * Blok przycisku z walidacją linku.
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles } from '@/lib/page-builder/style-utils';
import { createSafeLink } from '@/lib/page-builder/sanitize';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';
import styles from './ButtonBlock.module.css';

export const ButtonBlock: React.FC<BlockComponentProps> = ({ 
  node,
  isPreview,
}) => {
  const breakpoint = useCurrentBreakpoint();
  
  const text = (node.props.content.text as string) || 'Click me';
  const url = (node.props.content.url as string) || '#';
  const targetProp = (node.props.content.target as string) || '_self';
  
  // Safe link
  const safeLinkData = createSafeLink(url);
  const safeUrl = safeLinkData.href;
  const target = targetProp === '_self' ? undefined : targetProp;
  
  // Merge styles for current breakpoint
  const mergedStyles = mergeBlockStyles(node.props.style, breakpoint);
  
  const buttonStyle: React.CSSProperties = {
    backgroundColor: mergedStyles.backgroundColor as string,
    color: mergedStyles.color as string,
    padding: mergedStyles.padding as string,
    borderRadius: mergedStyles.borderRadius as string,
    fontSize: mergedStyles.fontSize as string,
    textAlign: mergedStyles.textAlign as React.CSSProperties['textAlign'],
  };
  
  const handleClick = (e: React.MouseEvent) => {
    if (!isPreview) {
      e.preventDefault();
    }
  };
  
  return (
    <div 
      className={styles.wrapper}
      style={{ textAlign: mergedStyles.textAlign as React.CSSProperties['textAlign'] }}
      data-block-type="button"
    >
      <a
        href={safeUrl}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        className={styles.button}
        style={buttonStyle}
        onClick={handleClick}
      >
        {text}
      </a>
    </div>
  );
};

export default ButtonBlock;
