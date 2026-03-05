"use client";

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';
import { mergeBlockStyles, toSpacingCSS } from '@/lib/page-builder/style-utils';
import { useCurrentBreakpoint } from '@/stores/page-builder-store';

export const GenericFormFieldBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const breakpoint = useCurrentBreakpoint();
  const content = node.props?.content ?? {};
  const merged = mergeBlockStyles(node.props?.style, breakpoint);
  const fieldType = (content.fieldType as string) || node.type;
  const label = (content.label as string) || 'Field label';
  const placeholder = (content.placeholder as string) || '';
  const rawOptions = content.options;
  const options = Array.isArray(rawOptions)
    ? rawOptions
    : typeof rawOptions === 'string'
      ? rawOptions.split(',').map((s) => s.trim()).filter(Boolean)
      : ['Option 1', 'Option 2'];

  const wrapperStyle: React.CSSProperties = {
    padding: merged.padding != null ? toSpacingCSS(merged.padding) : undefined,
    margin: merged.margin != null ? toSpacingCSS(merged.margin) : undefined,
  };

  const inputClass = 'w-full rounded-[14px] border border-border bg-surface-2 px-3 py-2 text-sm';

  return (
    <div style={wrapperStyle}>
      <label className="block text-xs text-muted">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">{label}</span>
      {fieldType === 'textarea' && <textarea className={inputClass} rows={3} placeholder={placeholder} />}
      {fieldType === 'select' && (
        <select className={inputClass}>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}
      {fieldType === 'checkbox' && <input type="checkbox" />}
      {fieldType === 'radio-group' && (
        <div className="flex flex-col gap-2">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <input type="radio" name={node.id} />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
      {['input', 'text', 'email', 'phone', 'date', 'number', 'file', 'range', 'rating', 'password'].includes(fieldType) && (
        <input
          className={inputClass}
          type={fieldType === 'phone' ? 'tel' : fieldType === 'rating' ? 'number' : fieldType}
          placeholder={placeholder}
        />
      )}
      {!['textarea', 'select', 'checkbox', 'radio-group', 'input', 'text', 'email', 'phone', 'date', 'number', 'file', 'range', 'rating', 'password'].includes(fieldType) && (
        <input className={inputClass} type="text" placeholder={placeholder} />
      )}
      </label>
    </div>
  );
};

export default GenericFormFieldBlock;




