
"use client";

import React from 'react';
import type { BlockComponentProps } from '@/lib/page-builder/types';

export const GenericFormFieldBlock: React.FC<BlockComponentProps> = ({ node }) => {
  const fieldType = (node.props.content.fieldType as string) || node.type;
  const label = (node.props.content.label as string) || 'Field label';
  const placeholder = (node.props.content.placeholder as string) || '';
  const options = (node.props.content.options as string[]) || ['Option 1', 'Option 2'];

  const inputClass = 'w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm';

  return (
    <label className="block text-xs text-muted">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
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
    </label>
  );
};

export default GenericFormFieldBlock;
