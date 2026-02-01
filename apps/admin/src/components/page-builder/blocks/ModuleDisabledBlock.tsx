
"use client";

import React from 'react';
import Link from 'next/link';
import { FiLock, FiZap } from 'react-icons/fi';
import { usePageBuilderContext } from '../PageBuilderContext';
import { useTranslations } from '@/hooks/useTranslations';
import styles from './ModuleDisabledBlock.module.css';

interface ModuleDisabledBlockProps {
  moduleKey: string;
  blockLabel?: string;
}

export const ModuleDisabledBlock: React.FC<ModuleDisabledBlockProps> = ({ moduleKey, blockLabel }) => {
  const { siteSlug } = usePageBuilderContext();
  const t = useTranslations();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <FiLock className={styles.icon} />
        <div className={styles.title}>{blockLabel || t('builderBlocks.modulePlaceholderTitle')}</div>
      </div>
      <div className={styles.message}>
        {t('builderBlocks.moduleDisabledMessage', { moduleKey })}
      </div>
      <div className={styles.actions}>
        {siteSlug ? (
          <Link href={`/sites/${siteSlug}/panel/modules`} className={styles.button}>
            <FiZap className={styles.buttonIcon} />
            {t('builderBlocks.enableModuleCta')}
          </Link>
        ) : (
          <span className={styles.hint}>{t('builderBlocks.enableModuleHint')}</span>
        )}
      </div>
    </div>
  );
};

export default ModuleDisabledBlock;
