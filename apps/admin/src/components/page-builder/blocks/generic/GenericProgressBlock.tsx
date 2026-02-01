
"use client";

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';

export const GenericProgressBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const value = Number(node.props.content.value ?? 50);
  const label = (node.props.content.label as string) || `${value}%`;

  return (
    <div>
      <div style={{ fontSize: 12, marginBottom: 6 }}>{label}</div>
      <div style={{ background: '#e2e8f0', borderRadius: 999, height: 10, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, background: '#22c55e', height: '100%' }} />
      </div>
    </div>
  );
};

export default GenericProgressBlock;
