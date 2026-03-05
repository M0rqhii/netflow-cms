
"use client";

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';

export const GenericProgressBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const breakpoint = useCurrentBreakpoint();
  const content = node.props?.content ?? {};
  const merged = mergeBlockStyles(node.props?.style, breakpoint);
  const value = Number(content.value ?? 50);
  const clamped = Math.min(Math.max(value, 0), 100);
  const label = (content.label as string) || `${clamped}%`;

  const trackBg = (merged.backgroundColor as string) || '#e2e8f0';
  const fillBg = (merged.color as string) || '#22c55e';
  const height = (merged.height as string) || '10px';
  const borderRadius = (merged.borderRadius as string) || '999px';

  const wrapperStyle: React.CSSProperties = {
    padding: merged.padding != null ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin != null ? toSpacingCSS(merged.margin) : undefined,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: (merged.fontSize as string) || '12px',
    color: (merged.labelColor as string) || 'inherit',
    marginBottom: '6px',
  };

  return (
    <div style={wrapperStyle}>
      {label && <div style={labelStyle}>{label}</div>}
      <div style={{ background: trackBg, borderRadius, height, overflow: 'hidden' }}>
        <div style={{ width: `${clamped}%`, background: fillBg, height: '100%', transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
};

export default GenericProgressBlock;


