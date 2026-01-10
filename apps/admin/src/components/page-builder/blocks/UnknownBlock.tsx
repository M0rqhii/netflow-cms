/**
 * UnknownBlock Component
 * 
 * Fallback dla nieznanych/deprecated typów bloków.
 * Pozwala na usunięcie lub konwersję.
 */

import React, { useState } from 'react';
import { FiAlertTriangle, FiChevronDown, FiChevronUp, FiTrash2 } from 'react-icons/fi';
import type { BlockNode } from '@/lib/page-builder/types';
import { usePageBuilderStore } from '@/stores/page-builder-store';
import styles from './UnknownBlock.module.css';

type UnknownBlockProps = {
  node: BlockNode;
};

export const UnknownBlock: React.FC<UnknownBlockProps> = ({ node }) => {
  const [showDetails, setShowDetails] = useState(false);
  const deleteBlock = usePageBuilderStore((state) => state.deleteBlock);
  const commit = usePageBuilderStore((state) => state.commit);
  
  const handleDelete = () => {
    deleteBlock(node.id);
    commit('delete');
  };
  
  return (
    <div className={styles.unknown}>
      <div className={styles.header}>
        <FiAlertTriangle className={styles.icon} />
        <div className={styles.info}>
          <span className={styles.title}>Unknown Block</span>
          <span className={styles.type}>Type: {node.type}</span>
        </div>
        <div className={styles.actions}>
          <button
            className={styles.toggleBtn}
            onClick={() => setShowDetails(!showDetails)}
            title={showDetails ? 'Hide details' : 'Show details'}
          >
            {showDetails ? <FiChevronUp /> : <FiChevronDown />}
          </button>
          <button
            className={`${styles.actionBtn} ${styles.danger}`}
            onClick={handleDelete}
            title="Delete this block"
          >
            <FiTrash2 />
          </button>
        </div>
      </div>
      
      {showDetails && (
        <div className={styles.details}>
          <p className={styles.detailsTitle}>Block Properties:</p>
          <pre className={styles.code}>
            {JSON.stringify(node.props, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default UnknownBlock;
