/**
 * ColumnBlock
 *
 * Column in section. Width from content, full style customization, responsive.
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';
import styles from './ColumnBlock.module.css';

export const ColumnBlock: React.FC<BlockComponentProps> = ({ node, children, isPreview }) => {
  const breakpoint = useCurrentBreakpoint();
  const content = node.props?.content ?? {};
  const width = (content.width as string) || '50%';
  const merged = mergeBlockStyles(node.props?.style, breakpoint);
  const isEmpty = !node.childIds || node.childIds.length === 0;

  const effectiveWidth = breakpoint === 'mobile' ? '100%' : width;

  const columnStyle: React.CSSProperties = {
    width: effectiveWidth,
    flexBasis: effectiveWidth,
    minWidth: 0,
    padding: merged.padding != null ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin != null ? toSpacingCSS(merged.margin) : undefined,
    backgroundColor: (merged.backgroundColor as string) || undefined,
    color: (merged.color as string) || undefined,
    borderRadius: (merged.borderRadius as string) || undefined,
    border: (merged.border as string) || undefined,
    minHeight: (merged.minHeight as string) || undefined,
    alignSelf: (merged.alignSelf as React.CSSProperties['alignSelf']) || undefined,
  };

  return (
    <div
      className={styles.column}
      style={columnStyle}
      data-block-type="column"
      data-empty={!isPreview && isEmpty ? 'true' : 'false'}
    >
      {children}
    </div>
  );
};

export default ColumnBlock;
