"use client";

import React, { useState } from 'react';
import type { FieldDefinition } from './FieldsEditor';

// Extend FieldDefinition to include options for select
type ExtendedFieldDefinition = FieldDefinition & {
  options?: Array<{ value: string; label: string }>;
};

type DynamicFormFieldProps = {
  field: ExtendedFieldDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  onLoadRelations?: (contentTypeSlug: string) => Promise<Array<{ id: string; [key: string]: unknown }>>;
};

export default function DynamicFormField({
  field,
  value,
  onChange,
  error,
  onLoadRelations,
}: DynamicFormFieldProps) {
  const [relationOptions, setRelationOptions] = useState<Array<{ id: string; [key: string]: unknown }>>([]);
  const [loadingRelations, setLoadingRelations] = useState(false);

  React.useEffect(() => {
    if (field.type === 'relation' && field.relationType && onLoadRelations) {
      setLoadingRelations(true);
      onLoadRelations(field.relationType)
        .then(setRelationOptions)
        .catch((_error) => {
          // Silently handle relation loading errors
          // The field will just show empty options
        })
        .finally(() => setLoadingRelations(false));
    }
  }, [field.type, field.relationType, onLoadRelations]);

  const handleChange = (newValue: unknown) => {
    onChange(newValue);
  };

  const renderField = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            className={`border rounded w-full p-2 ${error ? 'border-red-500' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.description}
            required={field.required}
            minLength={field.minLength}
            maxLength={field.maxLength}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            className={`border rounded w-full p-2 ${error ? 'border-red-500' : ''}`}
            value={value !== null && value !== undefined ? Number(value) : ''}
            onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.description}
            required={field.required}
            min={field.min}
            max={field.max}
            step={field.step || 1}
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4"
              checked={Boolean(value)}
              onChange={(e) => handleChange(e.target.checked)}
            />
            <span className="text-sm text-muted">{field.description || 'Enabled'}</span>
          </label>
        );

      case 'date':
        return (
          <input
            type="date"
            className={`border rounded w-full p-2 ${error ? 'border-red-500' : ''}`}
            value={value ? new Date(value as string).toISOString().split('T')[0] : ''}
            onChange={(e) => handleChange(e.target.value || null)}
            required={field.required}
          />
        );

      case 'datetime':
        return (
          <input
            type="datetime-local"
            className={`border rounded w-full p-2 ${error ? 'border-red-500' : ''}`}
            value={value ? new Date(value as string).toISOString().slice(0, 16) : ''}
            onChange={(e) => handleChange(e.target.value || null)}
            required={field.required}
          />
        );

      case 'richtext':
        return (
          <textarea
            className={`border rounded w-full p-2 min-h-[120px] ${error ? 'border-red-500' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.description}
            required={field.required}
            minLength={field.minLength}
            maxLength={field.maxLength}
          />
        );

      case 'select':
        if (!field.options || field.options.length === 0) {
          return <div className="text-sm text-muted">No options defined</div>;
        }
        return (
          <select
            className={`border rounded w-full p-2 ${error ? 'border-red-500' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleChange(e.target.value)}
            required={field.required}
          >
            {!field.required && <option value="">— Select —</option>}
            {field.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'relation':
        if (loadingRelations) {
          return <div className="text-sm text-muted">Loading...</div>;
        }
        return (
          <select
            className={`border rounded w-full p-2 ${error ? 'border-red-500' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleChange(e.target.value || null)}
            required={field.required}
          >
            {!field.required && <option value="">— Select —</option>}
            {relationOptions.map((item) => {
              const displayValue = String(item.title ?? item.name ?? item.id);
              return (
                <option key={item.id} value={item.id}>
                  {displayValue}
                </option>
              );
            })}
          </select>
        );

      case 'json':
        return (
          <textarea
            className={`border rounded w-full p-2 font-mono text-sm min-h-[120px] ${error ? 'border-red-500' : ''}`}
            value={value ? JSON.stringify(value, null, 2) : ''}
            onChange={(e) => {
              try {
                const parsed = e.target.value ? JSON.parse(e.target.value) : null;
                handleChange(parsed);
              } catch {
                // Invalid JSON, but allow typing
                handleChange(e.target.value);
              }
            }}
            placeholder={field.description || '{}'}
            required={field.required}
          />
        );

      case 'media':
        return (
          <div>
            <input
              type="text"
              className={`border rounded w-full p-2 ${error ? 'border-red-500' : ''}`}
              value={String(value || '')}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Media URL or ID"
              required={field.required}
            />
            {(value !== undefined && value !== null && String(value) !== '') && (
              <div className="mt-2">
                {/* Could add media picker here */}
                <a href={String(value)} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  View media
                </a>
              </div>
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            className={`border rounded w-full p-2 ${error ? 'border-red-500' : ''}`}
            value={String(value || '')}
            onChange={(e) => handleChange(e.target.value)}
            placeholder={field.description}
            required={field.required}
          />
        );
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {field.name}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderField()}
      {field.description && !['boolean', 'richtext'].includes(field.type) && (
        <p className="text-xs text-muted mt-1">{field.description}</p>
      )}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

