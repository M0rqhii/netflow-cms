
"use client";

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';

export const GenericBadgeBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const breakpoint = useCurrentBreakpoint();
  const props = node.props ?? { content: {}, style: { base: {} } };
  const content = props.content ?? {};
  const merged = mergeBlockStyles(props.style, breakpoint);

  const text = (content.text as string) || 'Badge';

  const styleObj: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: merged.padding != null ? toSpacingCSS(merged.padding) : '4px 10px',
    margin: merged.margin != null ? toSpacingCSS(merged.margin) : undefined,
    borderRadius: merged.borderRadius as string | undefined || '999px',
    backgroundColor: merged.backgroundColor as string | undefined || '#e2e8f0',
    color: merged.color as string | undefined || '#0f172a',
    fontSize: merged.fontSize as string | undefined || '12px',
    fontWeight: merged.fontWeight as string | undefined || '600',
  };

  return <span style={styleObj}>{text}</span>;
};

export default GenericBadgeBlock;


