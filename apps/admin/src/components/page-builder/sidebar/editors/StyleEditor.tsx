/**
 * Style Editor Component
 * 
 * Edycja style props z responsive overrides.
 * Features: clear override UI, isOverridden indicator.
 */

import React, { useMemo } from 'react';
import { FiX, FiSmartphone, FiTablet, FiMonitor } from 'react-icons/fi';
import type { BlockNode, BlockProps, PropFieldSchema, Breakpoint } from '@/lib/page-builder/types';
import { mergeStyles, isOverridden } from '@/lib/page-builder/style-utils';
import { FieldRenderer } from './FieldRenderer';
import styles from './Editors.module.css';

type StyleEditorProps = {
  node: BlockNode;
  props: BlockProps;
  schema?: Record<string, PropFieldSchema>;
  currentBreakpoint: Breakpoint;
  onChange: (key: string, value: unknown) => void;
  onClearOverride: (key: string) => void;
};

// Default style fields if no schema
const DEFAULT_STYLE_FIELDS: Record<string, PropFieldSchema> = {
  padding: { type: 'spacing', label: 'Padding' },
  margin: { type: 'spacing', label: 'Margin' },
  backgroundColor: { type: 'color', label: 'Background Color' },
  textAlign: {
    type: 'select',
    label: 'Text Align',
    options: [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' },
    ],
  },
};

export const StyleEditor: React.FC<StyleEditorProps> = ({
  node,
  props,
  schema,
  currentBreakpoint,
  onChange,
  onClearOverride,
}) => {
  // Merge styles for current breakpoint
  const mergedStyles = useMemo(() => {
    return mergeStyles(
      props.style.base,
      props.style.responsive?.[currentBreakpoint as 'tablet' | 'mobile'],
      currentBreakpoint
    );
  }, [props.style, currentBreakpoint]);
  
  // Use schema or defaults
  const effectiveSchema = schema && Object.keys(schema).length > 0 
    ? schema 
    : DEFAULT_STYLE_FIELDS;
  
  const isNotDesktop = currentBreakpoint !== 'desktop';
  
  return (
    <div className={styles.editor}>
      {/* Breakpoint indicator */}
      <div className={styles.breakpointIndicator}>
        <span className={styles.breakpointIcon}>
          {currentBreakpoint === 'desktop' && <FiMonitor />}
          {currentBreakpoint === 'tablet' && <FiTablet />}
          {currentBreakpoint === 'mobile' && <FiSmartphone />}
        </span>
        <span className={styles.breakpointLabel}>
          Editing: {currentBreakpoint.charAt(0).toUpperCase() + currentBreakpoint.slice(1)}
        </span>
        {isNotDesktop && (
          <span className={styles.inheritanceHint}>
            Empty fields inherit from Desktop
          </span>
        )}
      </div>
      
      {/* Style fields */}
      {Object.entries(effectiveSchema).map(([key, fieldSchema]) => {
        const hasOverride = isNotDesktop && isOverridden(props, currentBreakpoint as 'tablet' | 'mobile', key);
        const value = mergedStyles[key] ?? fieldSchema.defaultValue;
        
        return (
          <div 
            key={key} 
            className={`${styles.field} ${hasOverride ? styles.hasOverride : ''}`}
          >
            <div className={styles.fieldHeader}>
              <label className={styles.fieldLabel}>{fieldSchema.label}</label>
              {hasOverride && (
                <button
                  className={styles.clearOverrideBtn}
                  onClick={() => onClearOverride(key)}
                  title="Clear override (inherit from desktop)"
                >
                  <FiX />
                </button>
              )}
            </div>
            <FieldRenderer
              type={fieldSchema.type}
              value={value}
              onChange={(newValue) => onChange(key, newValue)}
              options={fieldSchema.options}
              placeholder={fieldSchema.placeholder}
              min={fieldSchema.min}
              max={fieldSchema.max}
            />
            {hasOverride && (
              <span className={styles.overrideIndicator}>
                Overridden for {currentBreakpoint}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default StyleEditor;
