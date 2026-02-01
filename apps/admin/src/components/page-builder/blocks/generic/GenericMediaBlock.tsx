
"use client";

import React from 'react';
import Image from 'next/image';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';

export const GenericMediaBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const breakpoint = useCurrentBreakpoint();
  const { content, style } = node.props;
  const merged = mergeBlockStyles(style, breakpoint);

  const src = (content.src as string) || '';
  const alt = (content.alt as string) || '';
  const kind = (content.kind as string) || node.type;

  const styleObj: React.CSSProperties = {
    padding: merged.padding ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin ? toSpacingCSS(merged.margin) : undefined,
    borderRadius: merged.borderRadius as string | undefined,
    width: merged.width as string | undefined,
    maxWidth: merged.maxWidth as string | undefined,
  };

  if (kind.includes('video')) {
    return <video style={styleObj} controls src={src} />;
  }

  if (kind.includes('audio')) {
    return <audio style={styleObj} controls src={src} />;
  }

  if (kind.includes('iframe') || kind.includes('embed')) {
    return (
      <iframe
        style={styleObj}
        src={src}
        title={alt || node.type}
        sandbox="allow-scripts allow-same-origin allow-popups"
      />
    );
  }

  if (!src) {
    return <div style={styleObj} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1}
      height={1}
      sizes="100vw"
      unoptimized
      style={{
        ...styleObj,
        width: styleObj.width || '100%',
        height: styleObj.height || 'auto',
      }}
    />
  );
};

export default GenericMediaBlock;
