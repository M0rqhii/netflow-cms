/**
 * Advanced Editor Component
 * 
 * Edycja advanced props (CSS classes, ID, animations, etc.)
 */

import React from 'react';
import type { BlockNode, BlockProps, PropFieldSchema } from '@/lib/page-builder/types';
import { FieldRenderer } from './FieldRenderer';
import styles from './Editors.module.css';

type AdvancedEditorProps = {
  node: BlockNode;
  props: BlockProps;
  schema?: Record<string, PropFieldSchema>;
  onChange: (key: string, value: unknown) => void;
};

// Default advanced fields
const DEFAULT_ADVANCED_FIELDS: Record<string, PropFieldSchema> = {
  cssClass: { type: 'text', label: 'CSS Classes', placeholder: 'custom-class another-class' },
  cssId: { type: 'text', label: 'CSS ID', placeholder: 'my-element' },
  customAttributes: { type: 'text', label: 'Custom Attributes', placeholder: 'data-attr="value"' },
};

export const AdvancedEditor: React.FC<AdvancedEditorProps> = ({
  node,
  props,
  schema,
  onChange,
}) => {
  // Use schema or defaults
  const effectiveSchema = schema && Object.keys(schema).length > 0 
    ? schema 
    : DEFAULT_ADVANCED_FIELDS;
  
  const advancedProps = props.advanced || {};
  
  return (
    <div className={styles.editor}>
      {/* Node info */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Node Information</h4>
        <div className={styles.infoGrid}>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>ID</span>
            <code className={styles.infoValue}>{node.id}</code>
          </div>
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Type</span>
            <code className={styles.infoValue}>{node.type}</code>
          </div>
          {node.parentId && (
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Parent</span>
              <code className={styles.infoValue}>{node.parentId}</code>
            </div>
          )}
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Children</span>
            <span className={styles.infoValue}>{node.childIds.length}</span>
          </div>
        </div>
      </div>
      
      {/* Advanced fields */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Advanced Settings</h4>
        {Object.entries(effectiveSchema).map(([key, fieldSchema]) => (
          <div key={key} className={styles.field}>
            <label className={styles.fieldLabel}>{fieldSchema.label}</label>
            <FieldRenderer
              type={fieldSchema.type}
              value={advancedProps[key] ?? fieldSchema.defaultValue}
              onChange={(value) => onChange(key, value)}
              options={fieldSchema.options}
              placeholder={fieldSchema.placeholder}
            />
          </div>
        ))}
      </div>
      
      {/* Meta */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Block Meta</h4>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Label (for structure view)</label>
          <FieldRenderer
            type="text"
            value={node.meta?.label ?? ''}
            onChange={(value) => {
              // This would need special handling through updateBlockMeta
              // For now, we'll skip meta editing here
            }}
            placeholder="Custom label..."
          />
        </div>
      </div>
    </div>
  );
};

export default AdvancedEditor;
