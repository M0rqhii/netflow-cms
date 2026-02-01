
"use client";

/**
 * ModulePlaceholderBlock
 *
 * Lightweight placeholder used for module-specific blocks
 * that are not yet fully implemented. Keeps the editor stable
 * and makes gated components discoverable in the library.
 */

import React from 'react';
import { blockRegistry } from '@/lib/page-builder/block-registry';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { useTranslations } from '@/hooks/useTranslations';
import styles from './ModulePlaceholderBlock.module.css';

export const ModulePlaceholderBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const t = useTranslations();
  const definition = blockRegistry.getBlock(node.type);
  const label = node.meta?.label || definition?.title || node.type;

  return (
    <div className={styles.placeholder}>
      <div className={styles.title}>{label}</div>
      <div className={styles.subtitle}>{t('builderBlocks.modulePlaceholderSubtitle')}</div>
    </div>
  );
};

export default ModulePlaceholderBlock;
