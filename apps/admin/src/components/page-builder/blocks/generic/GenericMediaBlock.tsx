"use client";

import React from 'react';
import Image from 'next/image';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { isValidLink } from '@/lib/page-builder/sanitize';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';

const PLACEHOLDER_STYLE: React.CSSProperties = {
  minHeight: 120,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--surface-2, #1e293b)',
  color: 'var(--text-muted, #94a3b8)',
  fontSize: 14,
};

function isValidImageSrc(src: string): boolean {
  if (!src || typeof src !== 'string' || !src.trim()) return false;
  const s = src.trim();
  return s.startsWith('/') || s.startsWith('data:image/') || s.startsWith('data:') || isValidLink(s);
}

function isValidMediaSrc(src: string): boolean {
  if (!src || typeof src !== 'string' || !src.trim()) return false;
  const s = src.trim();
  return s.startsWith('/') || s.startsWith('data:') || isValidLink(s);
}

export const GenericMediaBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const breakpoint = useCurrentBreakpoint();
  const props = node.props ?? { content: {}, style: { base: {} } };
  const content = props.content ?? {};
  const merged = mergeBlockStyles(props.style, breakpoint);

  const src = (content.src as string) || '';
  const alt = (content.alt as string) || '';
  const kind = (content.kind as string) || 'image';

  const styleObj: React.CSSProperties = {
    padding: merged.padding != null ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin != null ? toSpacingCSS(merged.margin) : undefined,
    borderRadius: (merged.borderRadius as string) || undefined,
    width: (merged.width as string) || undefined,
    maxWidth: (merged.maxWidth as string) || undefined,
    minHeight: (merged.minHeight as string) || undefined,
    objectFit: (merged.objectFit as React.CSSProperties['objectFit']) || undefined,
  };

  if (kind.includes('video')) {
    if (!isValidMediaSrc(src)) return <div style={{ ...styleObj, ...PLACEHOLDER_STYLE }}>Video URL</div>;
    return <video style={styleObj} controls src={src} title={alt || 'Video'} />;
  }

  if (kind.includes('audio')) {
    if (!isValidMediaSrc(src)) return <div style={{ ...styleObj, ...PLACEHOLDER_STYLE }}>Audio URL</div>;
    return <audio style={styleObj} controls src={src} title={alt || 'Audio'} />;
  }

  if (kind.includes('iframe') || kind.includes('embed')) {
    const iframeStyle: React.CSSProperties = {
      ...styleObj,
      width: (styleObj.width as string) || '100%',
      minHeight: (styleObj.minHeight as string) || 320,
      border: 0,
    };
    const safeEmbedSrc = src && (src.startsWith('/') || isValidLink(src)) ? src : '';
    if (!safeEmbedSrc) {
      return <div style={{ ...iframeStyle, ...PLACEHOLDER_STYLE }}>Embed URL</div>;
    }
    return (
      <iframe
        style={iframeStyle}
        src={safeEmbedSrc}
        title={alt || 'Embed'}
        sandbox="allow-scripts allow-popups allow-forms"
      />
    );
  }

  if (!src || !isValidImageSrc(src)) {
    return <div style={{ ...styleObj, ...PLACEHOLDER_STYLE }}>Image URL</div>;
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
        width: (styleObj.width as string) || '100%',
        height: styleObj.height || 'auto',
      }}
    />
  );
};

export default GenericMediaBlock;


