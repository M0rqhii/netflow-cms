/**
 * TextBlock
 *
 * Rich text with sanitized HTML and full style customization.
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { sanitizeHtml } from '@/lib/page-builder/sanitize';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';
import styles from './TextBlock.module.css';

export const TextBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const breakpoint = useCurrentBreakpoint();
  const content = node.props?.content ?? {};
  const html = (content.html as string) || '<p>Enter text here...</p>';
  const sanitizedHtml = sanitizeHtml(html);
  const merged = mergeBlockStyles(node.props?.style, breakpoint);

  const textStyle: React.CSSProperties = {
    textAlign: (merged.textAlign as React.CSSProperties['textAlign']) || undefined,
    color: (merged.color as string) || undefined,
    fontSize: (merged.fontSize as string) || undefined,
    fontWeight: (merged.fontWeight as string) || undefined,
    lineHeight: (merged.lineHeight as string) || undefined,
    letterSpacing: (merged.letterSpacing as string) || undefined,
    margin: merged.margin != null ? toSpacingCSS(merged.margin) : undefined,
    padding: merged.padding != null ? toSpacingCSS(merged.padding) : undefined,
    maxWidth: (merged.maxWidth as string) || undefined,
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


