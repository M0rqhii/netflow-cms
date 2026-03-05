/**
 * AccordionItemBlock – single accordion panel. Supports style (padding, background) for the content area.
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';
import styles from './AccordionItemBlock.module.css';

export const AccordionItemBlock: React.FC<BlockComponentProps> = ({ node, children }) => {
  const breakpoint = useCurrentBreakpoint();
  const merged = mergeBlockStyles(node.props?.style, breakpoint);

  const style: React.CSSProperties = {
    padding: merged.padding != null ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin != null ? toSpacingCSS(merged.margin) : undefined,
    backgroundColor: (merged.backgroundColor as string) || undefined,
    color: (merged.color as string) || undefined,
    borderRadius: (merged.borderRadius as string) || undefined,
  };

  return (
    <div className={styles.accordionItem} style={style} data-block-type="accordion-item">
      {children}
      {!children && (
        <div className={styles.emptyContent}>
          <p>Drop content here</p>
        </div>
      )}
    </div>
  );
};

export default AccordionItemBlock;


