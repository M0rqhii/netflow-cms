/**
 * HeadingBlock
 *
 * H1–H6 with full style customization and responsive support.
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';
import styles from './HeadingBlock.module.css';

const VALID_LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;
type HeadingLevel = (typeof VALID_LEVELS)[number];

export const HeadingBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const breakpoint = useCurrentBreakpoint();
  const content = node.props?.content ?? {};
  const text = (content.text as string) || 'Heading';
  const rawLevel = (content.level as string) || 'h2';
  const level: HeadingLevel = VALID_LEVELS.includes(rawLevel as HeadingLevel) ? (rawLevel as HeadingLevel) : 'h2';
  const merged = mergeBlockStyles(node.props?.style, breakpoint);

  const headingStyle: React.CSSProperties = {
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

  const Tag = level;
  return (
    <Tag className={styles.heading} style={headingStyle} data-block-type="heading">
      {text}
    </Tag>
  );
};

export default HeadingBlock;


