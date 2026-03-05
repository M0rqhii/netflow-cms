/**
 * SectionBlock
 *
 * Full-width section container. Responsive styles, full customization.
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';
import styles from './SectionBlock.module.css';

export const SectionBlock: React.FC<BlockComponentProps> = ({ node, children, isPreview }) => {
  const breakpoint = useCurrentBreakpoint();
  const merged = mergeBlockStyles(node.props?.style, breakpoint);
  const isEmpty = !node.childIds || node.childIds.length === 0;

  const sectionStyle: React.CSSProperties = {
    padding: merged.padding != null ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin != null ? toSpacingCSS(merged.margin) : undefined,
    backgroundColor: (merged.backgroundColor as string) || undefined,
    color: (merged.color as string) || undefined,
    minHeight: (merged.minHeight as string) || undefined,
    width: (merged.width as string) || undefined,
    borderRadius: (merged.borderRadius as string) || undefined,
    border: (merged.border as string) || undefined,
    borderTop: (merged.borderTop as string) || undefined,
    borderBottom: (merged.borderBottom as string) || undefined,
    boxShadow: (merged.boxShadow as string) || undefined,
    position: (merged.position as React.CSSProperties['position']) || undefined,
    overflow: (merged.overflow as React.CSSProperties['overflow']) || undefined,
  };

  const innerMaxWidth = (merged.maxWidth as string) || undefined;

  return (
    <section
      className={styles.section}
      style={sectionStyle}
      data-block-type="section"
      data-empty={!isPreview && isEmpty ? 'true' : 'false'}
    >
      <div
        className={styles.inner}
        style={{
          maxWidth: innerMaxWidth || undefined,
        }}
      >
        {children}
      </div>
    </section>
  );
};

export default SectionBlock;
