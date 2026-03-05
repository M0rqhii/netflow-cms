/**
 * ButtonBlock
 *
 * Link/button with full style customization and safe URL handling.
 */

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { createSafeLink } from '@/lib/page-builder/sanitize';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';
import styles from './ButtonBlock.module.css';

export const ButtonBlock: React.FC<BlockComponentProps> = ({ node, isPreview }) => {
  const breakpoint = useCurrentBreakpoint();
  const content = node.props?.content ?? {};
  const text = (content.text as string) || 'Click me';
  const url = (content.url as string) || '#';
  const targetProp = (content.target as string) || '_self';
  const safeLinkData = createSafeLink(url);
  const safeUrl = safeLinkData.href;
  const target = targetProp === '_blank' ? '_blank' : undefined;
  const merged = mergeBlockStyles(node.props?.style, breakpoint);

  const buttonStyle: React.CSSProperties = {
    backgroundColor: (merged.backgroundColor as string) || undefined,
    color: (merged.color as string) || undefined,
    padding: merged.padding != null ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin != null ? toSpacingCSS(merged.margin) : undefined,
    borderRadius: (merged.borderRadius as string) || undefined,
    border: (merged.border as string) || undefined,
    fontSize: (merged.fontSize as string) || undefined,
    fontWeight: (merged.fontWeight as string) || undefined,
    textAlign: (merged.textAlign as React.CSSProperties['textAlign']) || undefined,
    display: 'inline-block',
    textDecoration: 'none',
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isPreview) e.preventDefault();
  };

  return (
    <div
      className={styles.wrapper}
      style={{ textAlign: (merged.textAlign as React.CSSProperties['textAlign']) || undefined }}
      data-block-type="button"
    >
      <a
        href={safeUrl}
        target={target}
        rel={target === '_blank' ? 'noopener noreferrer' : undefined}
        className={styles.button}
        style={buttonStyle}
        onClick={handleClick}
      >
        {text}
      </a>
    </div>
  );
};

export default ButtonBlock;


