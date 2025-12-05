"use client";

import React, { useState, useMemo } from 'react';
import DynamicFormField from './DynamicFormField';
import type { FieldDefinition } from './FieldsEditor';
import { fetchContentEntries } from '@/lib/api';

type DynamicFormProps = {
  fields: FieldDefinition[];
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  errors?: Record<string, string>;
  tenantId?: string;
  availableContentTypes?: Array<{ id: string; name: string; slug: string }>;
};

export default function DynamicForm({
  fields,
  data,
  onChange,
  errors = {},
  tenantId,
  availableContentTypes = [],
}: DynamicFormProps) {
  const handleFieldChange = (fieldName: string, value: unknown) => {
    onChange({ ...data, [fieldName]: value });
  };

  const loadRelations = async (contentTypeSlug: string) => {
    if (!tenantId) return [];
    try {
      const entries = await fetchContentEntries(tenantId, contentTypeSlug);
      return entries.map(entry => ({
        id: entry.id,
        ...entry.data,
      }));
    } catch (error) {
      // Silently fail - return empty array if relations can't be loaded
      return [];
    }
  };

  return (
    <div className="space-y-4">
      {fields.map((field) => {
        const fieldValue = data[field.name] !== undefined ? data[field.name] : field.defaultValue;
        const fieldError = errors[field.name];

        return (
          <DynamicFormField
            key={field.name}
            field={field}
            value={fieldValue}
            onChange={(value) => handleFieldChange(field.name, value)}
            error={fieldError}
            availableContentTypes={availableContentTypes}
            onLoadRelations={field.type === 'relation' && field.relatedContentTypeId 
              ? async () => {
                  const contentType = availableContentTypes.find(ct => ct.id === field.relatedContentTypeId);
                  if (contentType) {
                    return loadRelations(contentType.slug);
                  }
                  return [];
                }
              : undefined}
          />
        );
      })}
    </div>
  );
}




