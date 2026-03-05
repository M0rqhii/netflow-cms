
"use client";

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';

export const GenericListBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const breakpoint = useCurrentBreakpoint();
  const props = node.props ?? { content: {}, style: { base: {} } };
  const content = props.content ?? {};
  const merged = mergeBlockStyles(props.style, breakpoint);

  const rawItems = content.items;
  const items = Array.isArray(rawItems)
    ? rawItems
    : typeof rawItems === 'string'
      ? rawItems.split(',').map((s) => s.trim()).filter(Boolean)
      : ['Item 1', 'Item 2', 'Item 3'];
  const ordered = Boolean(content.ordered);
  const Tag = ordered ? 'ol' : 'ul';

  const styleObj: React.CSSProperties = {
    padding: merged.padding != null ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin != null ? toSpacingCSS(merged.margin) : undefined,
    color: (merged.color as string) || undefined,
    listStylePosition: (merged.listStylePosition as React.CSSProperties['listStylePosition']) || undefined,
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


