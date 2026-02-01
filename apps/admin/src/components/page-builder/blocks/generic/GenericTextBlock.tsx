
"use client";

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';

export const GenericTextBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const breakpoint = useCurrentBreakpoint();
  const { content, style } = node.props;
  const merged = mergeBlockStyles(style, breakpoint);

  const tag = (content.tag as keyof JSX.IntrinsicElements) || 'p';
  const text = (content.text as string) || '';
  const html = (content.html as string) || '';

  const styleObj: React.CSSProperties = {
    padding: merged.padding ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin ? toSpacingCSS(merged.margin) : undefined,
    color: merged.color as string | undefined,
    fontSize: merged.fontSize as string | undefined,
    fontWeight: merged.fontWeight as string | undefined,
    textAlign: merged.textAlign as React.CSSProperties['textAlign'] | undefined,
    lineHeight: merged.lineHeight as string | undefined,
  };

  if (html) {
    return React.createElement(tag, { style: styleObj, dangerouslySetInnerHTML: { __html: html } });
  }

  return React.createElement(tag, { style: styleObj }, text);
};

export default GenericTextBlock;
