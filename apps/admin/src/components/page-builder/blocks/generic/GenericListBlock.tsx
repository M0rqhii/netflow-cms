
"use client";

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';

export const GenericListBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const breakpoint = useCurrentBreakpoint();
  const { content, style } = node.props;
  const merged = mergeBlockStyles(style, breakpoint);

  const items = (content.items as string[]) || ['Item 1', 'Item 2', 'Item 3'];
  const ordered = Boolean(content.ordered);
  const Tag = ordered ? 'ol' : 'ul';

  const styleObj: React.CSSProperties = {
    padding: merged.padding ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin ? toSpacingCSS(merged.margin) : undefined,
    color: merged.color as string | undefined,
  };

  return (
    <Tag style={styleObj}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </Tag>
  );
};

export default GenericListBlock;
