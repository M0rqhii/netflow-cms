/**
 * Debug Panel Component
 * 
 * Narzędzia deweloperskie dla page buildera.
 * Wyświetla: tree structure, validation errors, state info.
 * 
 * Pokazuje się tylko w development mode.
 */

import React, { useState, useMemo } from 'react';
import { FiChevronDown, FiChevronRight, FiAlertTriangle, FiCheck, FiInfo } from 'react-icons/fi';
import { usePageBuilderStore } from '@/stores/page-builder-store';
import { validateTree } from '@/lib/page-builder/tree-ops';
import type { PageContent, BlockNode, ValidationError } from '@/lib/page-builder/types';
import styles from './DebugPanel.module.css';

// =============================================================================
// TREE NODE COMPONENT
// =============================================================================

type TreeNodeProps = {
  node: BlockNode;
  content: PageContent;
  depth: number;
};

const TreeNode: React.FC<TreeNodeProps> = ({ node, content, depth }) => {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = node.childIds.length > 0;
  
  return (
    <div className={styles.treeNode} style={{ paddingLeft: depth * 16 }}>
      <div className={styles.nodeHeader}>
        {hasChildren ? (
          <button
            className={styles.expandBtn}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
          </button>
        ) : (
          <span className={styles.expandPlaceholder} />
        )}
        
        <span className={styles.nodeType}>{node.type}</span>
        <span className={styles.nodeId}>{node.id.slice(0, 8)}...</span>
        
        {node.meta?.locked && <span className={styles.badge}>locked</span>}
        {node.meta?.hidden && <span className={styles.badge}>hidden</span>}
      </div>
      
      {isExpanded && hasChildren && (
        <div className={styles.nodeChildren}>
          {node.childIds.map(childId => {
            const childNode = content.nodes[childId];
            if (!childNode) return null;
            return (
              <TreeNode
                key={childId}
                node={childNode}
                content={content}
                depth={depth + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// DEBUG PANEL
// =============================================================================

export const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tree' | 'validation' | 'state'>('tree');
  
  const content = usePageBuilderStore((state) => state.content);
  const isDirty = usePageBuilderStore((state) => state.isDirty);
  const selectedBlockId = usePageBuilderStore((state) => state.selectedBlockId);
  const history = usePageBuilderStore((state) => state.history);
  
  // Validate tree
  const validationErrors = useMemo(() => {
    return validateTree(content);
  }, [content]);
  
  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }
  
  const rootNode = content.nodes[content.rootId];
  
  return (
    <div className={`${styles.panel} ${isOpen ? styles.open : ''}`}>
      {/* Toggle button */}
      <button
        className={styles.toggle}
        onClick={() => setIsOpen(!isOpen)}
      >
        <FiInfo />
        <span>Debug</span>
        {validationErrors.length > 0 && (
          <span className={styles.errorBadge}>{validationErrors.length}</span>
        )}
      </button>
      
      {isOpen && (
        <div className={styles.content}>
          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${activeTab === 'tree' ? styles.active : ''}`}
              onClick={() => setActiveTab('tree')}
            >
              Tree
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'validation' ? styles.active : ''}`}
              onClick={() => setActiveTab('validation')}
            >
              Validation
              {validationErrors.length > 0 && (
                <span className={styles.tabBadge}>{validationErrors.length}</span>
              )}
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'state' ? styles.active : ''}`}
              onClick={() => setActiveTab('state')}
            >
              State
            </button>
          </div>
          
          {/* Tab content */}
          <div className={styles.tabContent}>
            {activeTab === 'tree' && rootNode && (
              <div className={styles.treeView}>
                <TreeNode node={rootNode} content={content} depth={0} />
              </div>
            )}
            
            {activeTab === 'validation' && (
              <div className={styles.validationView}>
                {validationErrors.length === 0 ? (
                  <div className={styles.validationSuccess}>
                    <FiCheck />
                    <span>Tree is valid</span>
                  </div>
                ) : (
                  <div className={styles.validationErrors}>
                    {validationErrors.map((error, i) => (
                      <div key={i} className={styles.validationError}>
                        <FiAlertTriangle />
                        <div>
                          <strong>{error.type}</strong>
                          <p>{error.message}</p>
                          {error.nodeId && (
                            <code>Node: {error.nodeId}</code>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'state' && (
              <div className={styles.stateView}>
                <div className={styles.stateItem}>
                  <span>Version:</span>
                  <code>{content.version}</code>
                </div>
                <div className={styles.stateItem}>
                  <span>Root ID:</span>
                  <code>{content.rootId}</code>
                </div>
                <div className={styles.stateItem}>
                  <span>Total nodes:</span>
                  <code>{Object.keys(content.nodes).length}</code>
                </div>
                <div className={styles.stateItem}>
                  <span>Is dirty:</span>
                  <code>{isDirty ? 'Yes' : 'No'}</code>
                </div>
                <div className={styles.stateItem}>
                  <span>Selected:</span>
                  <code>{selectedBlockId || 'None'}</code>
                </div>
                <div className={styles.stateItem}>
                  <span>History:</span>
                  <code>{history.past.length} past, {history.future.length} future</code>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;
