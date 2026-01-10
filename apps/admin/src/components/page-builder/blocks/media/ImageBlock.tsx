/**
 * Image Block Component
 * 
 * Blok obrazu z walidacją URL i placeholder.
 */

import React from 'react';
import { FiImage } from 'react-icons/fi';
import { isValidLink } from '@/lib/page-builder/sanitize';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeStyles } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';
import styles from './ImageBlock.module.css';

export const ImageBlock: React.FC<BlockComponentProps> = ({ node, isPreview }) => {
  const currentBreakpoint = useCurrentBreakpoint();
  
  const { content, style } = node.props;
  const src = content.src as string | undefined;
  const alt = (content.alt as string) || '';
  const caption = content.caption as string | undefined;
  const linkUrl = content.linkUrl as string | undefined;
  
  // Merge styles for current breakpoint
  const mergedStyles = mergeStyles(
    style.base,
    style.responsive?.[currentBreakpoint as 'tablet' | 'mobile'],
    currentBreakpoint
  );
  
  const containerStyle: React.CSSProperties = {
    textAlign: mergedStyles.textAlign as React.CSSProperties['textAlign'] || 'center',
    padding: mergedStyles.padding as string,
    margin: mergedStyles.margin as string,
  };
  
  const imageStyle: React.CSSProperties = {
    maxWidth: mergedStyles.maxWidth as string || '100%',
    width: mergedStyles.width as string,
    height: mergedStyles.height as string,
    borderRadius: mergedStyles.borderRadius as string,
    objectFit: mergedStyles.objectFit as React.CSSProperties['objectFit'] || 'cover',
  };
  
  // Empty state
  if (!src) {
    return (
      <div className={styles.placeholder} style={containerStyle}>
        <FiImage className={styles.placeholderIcon} />
        <span className={styles.placeholderText}>
          {isPreview ? 'No image selected' : 'Click to add image'}
        </span>
      </div>
    );
  }
  
  // Validate URL
  const validSrc = isValidLink(src) || src.startsWith('/') || src.startsWith('data:')
    ? src
    : '';
  
  if (!validSrc) {
    return (
      <div className={`${styles.placeholder} ${styles.error}`} style={containerStyle}>
        <FiImage className={styles.placeholderIcon} />
        <span className={styles.placeholderText}>Invalid image URL</span>
      </div>
    );
  }
  
  const imageElement = (
    <img
      src={validSrc}
      alt={alt}
      style={imageStyle}
      className={styles.image}
      loading="lazy"
    />
  );
  
  // Wrap in link if provided
  const linkedImage = linkUrl && isValidLink(linkUrl) ? (
    <a
      href={linkUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.link}
      onClick={(e) => {
        if (!isPreview) e.preventDefault();
      }}
    >
      {imageElement}
    </a>
  ) : (
    imageElement
  );
  
  return (
    <figure className={styles.figure} style={containerStyle}>
      {linkedImage}
      {caption && (
        <figcaption className={styles.caption}>{caption}</figcaption>
      )}
    </figure>
  );
};

// Block definition
export const imageBlockDefinition = {
  type: 'image',
  title: 'Image',
  description: 'Add an image with optional caption',
  icon: <FiImage />,
  category: 'media' as const,
  component: ImageBlock,
  canHaveChildren: false,
  defaultProps: {
    content: {
      src: '',
      alt: '',
      caption: '',
      linkUrl: '',
    },
    style: {
      base: {
        textAlign: 'center',
        maxWidth: '100%',
      },
    },
  },
  propsSchema: {
    content: {
      src: { type: 'image' as const, label: 'Image URL' },
      alt: { type: 'text' as const, label: 'Alt Text', placeholder: 'Describe the image...' },
      caption: { type: 'text' as const, label: 'Caption' },
      linkUrl: { type: 'link' as const, label: 'Link URL' },
    },
    style: {
      textAlign: {
        type: 'select' as const,
        label: 'Alignment',
        options: [
          { value: 'left', label: 'Left' },
          { value: 'center', label: 'Center' },
          { value: 'right', label: 'Right' },
        ],
      },
      maxWidth: { type: 'text' as const, label: 'Max Width', placeholder: '100%' },
      borderRadius: { type: 'text' as const, label: 'Border Radius', placeholder: '0px' },
    },
  },
};

export default ImageBlock;
