
"use client";

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';

export const GenericAlertBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const breakpoint = useCurrentBreakpoint();
  const { content, style } = node.props;
  const merged = mergeBlockStyles(style, breakpoint);

  const title = (content.title as string) || 'Alert title';
  const message = (content.message as string) || 'Alert message goes here.';

  const styleObj: React.CSSProperties = {
    padding: merged.padding ? toSpacingCSS(merged.padding) : '12px 14px',
    borderRadius: merged.borderRadius as string | undefined || '12px',
    backgroundColor: merged.backgroundColor as string | undefined || '#0f172a',
    color: merged.color as string | undefined || '#e2e8f0',
  };

  return (
    <div style={styleObj}>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 13, opacity: 0.85 }}>{message}</div>
    </div>
  );
};

export default GenericAlertBlock;
