/**
 * Image Block Component
 * 
 * Blok obrazu z walidacją URL i placeholder.
 */

import React from 'react';
import Image from 'next/image';
import { FiImage } from 'react-icons/fi';
import { isValidLink } from '@/lib/page-builder/sanitize';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';
import styles from './ImageBlock.module.css';

export const ImageBlock: React.FC<BlockComponentProps> = ({ node, isPreview, isStructure }) => {
  const currentBreakpoint = useCurrentBreakpoint();
  
  const content = node.props?.content ?? {};
  const src = content.src as string | undefined;
  const alt = (content.alt as string) || '';
  const caption = content.caption as string | undefined;
  const linkUrl = content.linkUrl as string | undefined;
  const openInLightbox = content.openInLightbox === true;

  const mergedStyles = mergeBlockStyles(node.props?.style, currentBreakpoint);
  const containerStyle: React.CSSProperties = {
    textAlign: (mergedStyles.textAlign as React.CSSProperties['textAlign']) || 'center',
    padding: mergedStyles.padding != null ? toSpacingCSS(mergedStyles.padding) : undefined,
    margin: mergedStyles.margin != null ? toSpacingCSS(mergedStyles.margin) : undefined,
  };

  if (isStructure) {
    return (
      <div className={styles.placeholder} style={containerStyle}>
        <FiImage className={styles.placeholderIcon} />
        <span className={styles.placeholderText}>[Image]</span>
      </div>
    );
  }

  
  const imageStyle: React.CSSProperties = {
    maxWidth: (mergedStyles.maxWidth as string) || '100%',
    width: (mergedStyles.width as string) || undefined,
    height: (mergedStyles.height as string) || undefined,
    borderRadius: (mergedStyles.borderRadius as string) || undefined,
    objectFit: (mergedStyles.objectFit as React.CSSProperties['objectFit']) || 'cover',
    objectPosition: (mergedStyles.objectPosition as string) || undefined,
    aspectRatio: (mergedStyles.aspectRatio as string) || undefined,
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
    <Image
      src={validSrc}
      alt={alt}
      width={1}
      height={1}
      sizes="100vw"
      style={imageStyle}
      className={styles.image}
      unoptimized
      priority={false}
    />
  );
  
  // Wrap: external link > lightbox > plain image
  const linkedImage =
    linkUrl && isValidLink(linkUrl)
      ? (
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
        )
      : openInLightbox
        ? (
            <a
              href={validSrc}
              data-lightbox="true"
              data-caption={caption ?? ''}
              className={styles.link}
              onClick={(e) => {
                if (!isPreview) e.preventDefault();
              }}
            >
              {imageElement}
            </a>
          )
        : imageElement;
  
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
      openInLightbox: false,
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
      openInLightbox: { type: 'boolean' as const, label: 'Open in lightbox' },
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
      padding: { type: 'spacing' as const, label: 'Padding' },
      margin: { type: 'spacing' as const, label: 'Margin' },
      maxWidth: { type: 'text' as const, label: 'Max Width', placeholder: '100%' },
      width: { type: 'text' as const, label: 'Width', placeholder: '100%' },
      height: { type: 'text' as const, label: 'Height', placeholder: 'auto' },
      borderRadius: { type: 'text' as const, label: 'Border Radius', placeholder: '0px' },
      objectFit: {
        type: 'select' as const,
        label: 'Object Fit',
        options: [
          { value: 'cover', label: 'Cover' },
          { value: 'contain', label: 'Contain' },
          { value: 'fill', label: 'Fill' },
          { value: 'none', label: 'None' },
        ],
      },
      objectPosition: { type: 'text' as const, label: 'Object Position', placeholder: 'center' },
      aspectRatio: { type: 'text' as const, label: 'Aspect Ratio', placeholder: 'auto' },
    },
  },
};

export default ImageBlock;


