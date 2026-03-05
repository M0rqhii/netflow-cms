
"use client";

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';

export const GenericAlertBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const breakpoint = useCurrentBreakpoint();
  const props = node.props ?? { content: {}, style: { base: {} } };
  const content = props.content ?? {};
  const merged = mergeBlockStyles(props.style, breakpoint);

  const title = (content.title as string) || 'Alert title';
  const message = (content.message as string) || 'Alert message goes here.';

  const styleObj: React.CSSProperties = {
    padding: merged.padding != null ? toSpacingCSS(merged.padding) : '12px 14px',
    margin: merged.margin != null ? toSpacingCSS(merged.margin) : undefined,
    borderRadius: (merged.borderRadius as string) || '12px',
    backgroundColor: (merged.backgroundColor as string) || '#0f172a',
    color: (merged.color as string) || '#e2e8f0',
    border: (merged.border as string) || undefined,
  };

  return (
    <div style={styleObj}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, opacity: 0.85 }}>{message}</div>
    </div>
  );
};

export default GenericAlertBlock;


