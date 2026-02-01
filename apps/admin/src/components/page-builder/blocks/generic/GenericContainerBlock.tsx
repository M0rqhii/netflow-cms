
"use client";

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';

export const GenericContainerBlock: React.FC<BlockComponentProps> = ({ node, children }) => {
  const breakpoint = useCurrentBreakpoint();
  const { content, style } = node.props;
  const merged = mergeBlockStyles(style, breakpoint);

  const tag = (content.tag as keyof JSX.IntrinsicElements) || 'div';

  const layoutStyle: React.CSSProperties = {
    display: (content.display || merged.display) as React.CSSProperties["display"],
    gap: (content.gap || merged.gap) as React.CSSProperties["gap"],
    alignItems: (content.alignItems || merged.alignItems) as React.CSSProperties["alignItems"],
    justifyContent: (content.justifyContent || merged.justifyContent) as React.CSSProperties["justifyContent"],
    flexDirection: (content.flexDirection || merged.flexDirection) as React.CSSProperties["flexDirection"],
    flexWrap: (content.flexWrap || merged.flexWrap) as React.CSSProperties["flexWrap"],
    gridTemplateColumns: (content.gridTemplateColumns || merged.gridTemplateColumns) as React.CSSProperties["gridTemplateColumns"],
    position: (content.position || merged.position) as React.CSSProperties["position"],
    top: (content.top || merged.top) as React.CSSProperties["top"],
    right: (content.right || merged.right) as React.CSSProperties["right"],
    bottom: (content.bottom || merged.bottom) as React.CSSProperties["bottom"],
    left: (content.left || merged.left) as React.CSSProperties["left"],
    overflow: (content.overflow || merged.overflow) as React.CSSProperties["overflow"],
  };

  const styleObj: React.CSSProperties = {
    padding: merged.padding ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin ? toSpacingCSS(merged.margin) : undefined,
    backgroundColor: merged.backgroundColor as string | undefined,
    color: merged.color as string | undefined,
    borderRadius: merged.borderRadius as string | undefined,
    width: merged.width as string | undefined,
    maxWidth: merged.maxWidth as string | undefined,
    minHeight: merged.minHeight as string | undefined,
    ...layoutStyle,
  };

  return React.createElement(tag, { style: styleObj }, children);
};

export default GenericContainerBlock;
