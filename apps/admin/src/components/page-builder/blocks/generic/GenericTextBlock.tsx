"use client";

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { sanitizeHtml } from '@/lib/page-builder/sanitize';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';

const SAFE_TAGS = ['p', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'a'] as const;
type SafeTag = (typeof SAFE_TAGS)[number];

export const GenericTextBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const breakpoint = useCurrentBreakpoint();
  const props = node.props ?? { content: {}, style: { base: {} } };
  const content = props.content ?? {};
  const merged = mergeBlockStyles(props.style, breakpoint);

  const rawTag = (content.tag as string) || 'p';
  const tag = (SAFE_TAGS.includes(rawTag as SafeTag) ? rawTag : 'p') as keyof JSX.IntrinsicElements;
  const text = (content.text as string) || '';
  const html = (content.html as string) || '';

  const styleObj: React.CSSProperties = {
    padding: merged.padding != null ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin != null ? toSpacingCSS(merged.margin) : undefined,
    color: (merged.color as string) || undefined,
    fontSize: (merged.fontSize as string) || undefined,
    fontWeight: (merged.fontWeight as string) || undefined,
    textAlign: (merged.textAlign as React.CSSProperties['textAlign']) || undefined,
    lineHeight: (merged.lineHeight as string) || undefined,
  };

  if (html) {
    const safeHtml = sanitizeHtml(html);
    return React.createElement(tag, { style: styleObj, dangerouslySetInnerHTML: { __html: safeHtml } });
  }
  return React.createElement(tag, { style: styleObj }, text);
};

export default GenericTextBlock;


