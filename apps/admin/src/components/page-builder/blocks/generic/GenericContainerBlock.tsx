
"use client";

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';

export const GenericContainerBlock: React.FC<BlockComponentProps> = ({ node, children }) => {
  const breakpoint = useCurrentBreakpoint();
  const props = node.props ?? { content: {}, style: { base: {} } };
  const content = props.content ?? {};
  const merged = mergeBlockStyles(props.style, breakpoint);

  const SAFE_TAGS = ['div', 'section', 'header', 'nav', 'main', 'footer', 'aside', 'article'] as const;
  const rawTag = (content.tag as string) || 'div';
  const tag = (SAFE_TAGS.includes(rawTag as typeof SAFE_TAGS[number]) ? rawTag : 'div') as keyof JSX.IntrinsicElements;

  const layoutVariant = content.layoutVariant as string | undefined;
  const variantFromType = node.type === 'divider' ? 'divider' : node.type === 'shape-divider' ? 'shape' : node.type === 'spacer' ? 'spacer' : undefined;
  const variant = layoutVariant || variantFromType;
  const variantStyles: React.CSSProperties =
    variant === 'divider'
      ? { minHeight: '1px', backgroundColor: '#1f2a3a' }
      : variant === 'shape'
        ? { minHeight: '48px', backgroundColor: '#1f2a3a' }
        : variant === 'spacer'
          ? { minHeight: '24px' }
          : {};

  const display = (content.display ?? merged.display) as React.CSSProperties['display'];
  const columns = content.columns as number | undefined;
  const proportions = content.proportions as string | undefined;
  let gridTemplateColumns = (content.gridTemplateColumns ?? merged.gridTemplateColumns) as string | undefined;
  if (display === 'grid') {
    if (proportions === '50/50') gridTemplateColumns = '1fr 1fr';
    else if (proportions === '30/70') gridTemplateColumns = '3fr 7fr';
    else if (proportions === '70/30') gridTemplateColumns = '7fr 3fr';
    else if (columns != null && columns >= 1) gridTemplateColumns = `repeat(${Math.min(12, Math.max(1, columns))}, 1fr)`;
  }

  const layoutStyle: React.CSSProperties = {
    display,
    gap: (content.gap ?? merged.gap) as React.CSSProperties['gap'],
    alignItems: (content.alignItems ?? merged.alignItems) as React.CSSProperties['alignItems'],
    justifyContent: (content.justifyContent ?? merged.justifyContent) as React.CSSProperties['justifyContent'],
    flexDirection: (content.flexDirection ?? merged.flexDirection) as React.CSSProperties['flexDirection'],
    flexWrap: (content.flexWrap ?? merged.flexWrap) as React.CSSProperties['flexWrap'],
    gridTemplateColumns,
    position: (content.position ?? merged.position) as React.CSSProperties['position'],
    top: (content.top ?? merged.top) as React.CSSProperties['top'],
    right: (content.right ?? merged.right) as React.CSSProperties['right'],
    bottom: (content.bottom ?? merged.bottom) as React.CSSProperties['bottom'],
    left: (content.left ?? merged.left) as React.CSSProperties['left'],
    overflow: (content.overflow ?? merged.overflow) as React.CSSProperties['overflow'],
  };

  const styleObj: React.CSSProperties = {
    padding: merged.padding != null ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin != null ? toSpacingCSS(merged.margin) : undefined,
    backgroundColor: ((variantStyles.backgroundColor as string) ?? (merged.backgroundColor as string)) || undefined,
    color: (merged.color as string) || undefined,
    borderRadius: (merged.borderRadius as string) || undefined,
    width: (merged.width as string) || undefined,
    maxWidth: (merged.maxWidth as string) || undefined,
    minHeight: ((variantStyles.minHeight as string) ?? (merged.minHeight as string)) || undefined,
    border: (merged.border as string) || undefined,
    boxShadow: (merged.boxShadow as string) || undefined,
    ...layoutStyle,
  };

  return React.createElement(tag, { style: styleObj }, children);
};

export default GenericContainerBlock;



