/**
 * Content Editor Component
 * 
 * Edycja content props bloku.
 */

import React from 'react';
import type { BlockNode, BlockProps, PropFieldSchema } from '@/lib/page-builder/types';
import { FieldRenderer } from './FieldRenderer';
import styles from './Editors.module.css';

type ContentEditorProps = {
  node: BlockNode;
  props: BlockProps;
  schema?: Record<string, PropFieldSchema>;
  onChange: (key: string, value: unknown) => void;
};

export const ContentEditor: React.FC<ContentEditorProps> = ({
  node,
  props,
  schema,
  onChange,
}) => {
  // If no schema, show raw content editor
  if (!schema || Object.keys(schema).length === 0) {
    const contentKeys = Object.keys(props.content);
    
    if (contentKeys.length === 0) {
      return (
        <div className={styles.emptyEditor}>
          <p>No content properties for this block</p>
        </div>
      );
    }
    
    // Auto-generate fields based on content
    return (
      <div className={styles.editor}>
        {contentKeys.map((key) => (
          <div key={key} className={styles.field}>
            <label className={styles.fieldLabel}>{formatLabel(key)}</label>
            <FieldRenderer
              type={inferFieldType(props.content[key])}
              value={props.content[key]}
              onChange={(value) => onChange(key, value)}
            />
          </div>
        ))}
      </div>
    );
  }
  
  // Render based on schema
  return (
    <div className={styles.editor}>
      {Object.entries(schema).map(([key, fieldSchema]) => (
        <div key={key} className={styles.field}>
          <label className={styles.fieldLabel}>{fieldSchema.label}</label>
          <FieldRenderer
            type={fieldSchema.type}
            value={props.content[key] ?? fieldSchema.defaultValue}
            onChange={(value) => onChange(key, value)}
            options={fieldSchema.options}
            placeholder={fieldSchema.placeholder}
            min={fieldSchema.min}
            max={fieldSchema.max}
          />
        </div>
      ))}
    </div>
  );
};

// Helpers
function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function inferFieldType(value: unknown): PropFieldSchema['type'] {
  if (typeof value === 'string') {
    if (value.startsWith('<') || value.includes('</')) return 'rich-text';
    if (value.startsWith('http') || value.startsWith('/')) return 'link';
    return 'text';
  }
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'text';
}

export default ContentEditor;
