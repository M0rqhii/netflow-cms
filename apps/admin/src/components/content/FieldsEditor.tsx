"use client";

import { useState } from 'react';

export type FieldDefinition = {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'date' | 'datetime' | 'richtext' | 'media' | 'relation' | 'json' | 'object' | 'array' | 'select';
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: unknown;
  description?: string;
  relationType?: 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany';
  relatedContentTypeId?: string;
  options?: Array<{ value: string; label: string }>;
  fields?: FieldDefinition[];
  items?: FieldDefinition;
};

interface FieldsEditorProps {
  fields: FieldDefinition[];
  onChange: (fields: FieldDefinition[]) => void;
  availableContentTypes?: { id: string; name: string; slug: string }[];
}

export function FieldsEditor({ fields, onChange, availableContentTypes = [] }: FieldsEditorProps) {
  const [expandedField, setExpandedField] = useState<number | null>(null);

  const addField = () => {
    // Check for duplicate names
    const existingNames = new Set(fields.map((f) => f.name.toLowerCase()));
    let newName = 'field';
    let counter = 1;
    while (existingNames.has(newName.toLowerCase())) {
      newName = `field${counter}`;
      counter++;
    }
    onChange([...fields, { name: newName, type: 'text', required: false }]);
  };

  const updateField = (index: number, updates: Partial<FieldDefinition>) => {
    const newFields = [...fields];
    // If updating name, check for duplicates (case-insensitive)
    if (updates.name !== undefined) {
      const existingNames = new Set(
        fields
          .map((f, i) => (i !== index ? f.name.toLowerCase() : null))
          .filter((n): n is string => n !== null)
      );
      if (updates.name && existingNames.has(updates.name.toLowerCase())) {
        // Don't update if duplicate (user will see validation error)
        return;
      }
    }
    newFields[index] = { ...newFields[index], ...updates };
    onChange(newFields);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const addNestedField = (fieldIndex: number) => {
    const newFields = [...fields];
    if (!newFields[fieldIndex].fields) {
      newFields[fieldIndex].fields = [];
    }
    newFields[fieldIndex].fields = [...(newFields[fieldIndex].fields || []), { name: '', type: 'text', required: false }];
    onChange(newFields);
  };

  const updateNestedField = (fieldIndex: number, nestedIndex: number, updates: Partial<FieldDefinition>) => {
    const newFields = [...fields];
    if (!newFields[fieldIndex].fields) return;
    const nestedFields = [...newFields[fieldIndex].fields!];
    nestedFields[nestedIndex] = { ...nestedFields[nestedIndex], ...updates };
    newFields[fieldIndex].fields = nestedFields;
    onChange(newFields);
  };

  const removeNestedField = (fieldIndex: number, nestedIndex: number) => {
    const newFields = [...fields];
    if (!newFields[fieldIndex].fields) return;
    newFields[fieldIndex].fields = newFields[fieldIndex].fields!.filter((_, i) => i !== nestedIndex);
    onChange(newFields);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium">Fields</label>
        <button type="button" className="btn btn-outline btn-sm" onClick={addField}>
          + Add Field
        </button>
      </div>

      {fields.length === 0 ? (
        <p className="text-sm text-muted">No fields yet. Click "Add Field" to start.</p>
      ) : (
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={index} className="border rounded p-3 bg-gray-50">
              <div className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      className="border rounded w-full p-1 text-sm"
                      value={field.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Validate field name (alphanumeric and underscore, or empty)
                        if (value === '' || /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) {
                          updateField(index, { name: value });
                        }
                      }}
                      placeholder="field_name"
                      required
                      pattern="^[a-zA-Z_][a-zA-Z0-9_]*$"
                      title="Field name must start with a letter or underscore and contain only letters, numbers, and underscores"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Type *</label>
                    <select
                      className="border rounded w-full p-1 text-sm"
                      value={field.type}
                      onChange={(e) => updateField(index, { type: e.target.value as FieldDefinition['type'] })}
                      required
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="boolean">Boolean</option>
                      <option value="date">Date</option>
                      <option value="datetime">DateTime</option>
                      <option value="richtext">Rich Text</option>
                      <option value="media">Media</option>
                      <option value="relation">Relation</option>
                      <option value="json">JSON</option>
                      <option value="object">Object</option>
                      <option value="array">Array</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={field.required || false}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                      />
                      Required
                    </label>
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setExpandedField(expandedField === index ? null : index)}
                    >
                      {expandedField === index ? '−' : '+'}
                    </button>
                    <button type="button" className="btn btn-outline btn-sm text-red-600" onClick={() => removeField(index)}>
                      ×
                    </button>
                  </div>
                </div>
              </div>

              {expandedField === index && (
                <div className="mt-3 pt-3 border-t space-y-2">
                  <div>
                    <label className="block text-xs font-medium mb-1">Description</label>
                    <input
                      type="text"
                      className="border rounded w-full p-1 text-sm"
                      value={field.description || ''}
                      onChange={(e) => updateField(index, { description: e.target.value })}
                      placeholder="Field description"
                    />
                  </div>

                  {field.type === 'text' || field.type === 'richtext' ? (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium mb-1">Min Length</label>
                          <input
                            type="number"
                            className="border rounded w-full p-1 text-sm"
                            value={field.minLength || ''}
                            onChange={(e) => updateField(index, { minLength: e.target.value ? parseInt(e.target.value) : undefined })}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">Max Length</label>
                          <input
                            type="number"
                            className="border rounded w-full p-1 text-sm"
                            value={field.maxLength || ''}
                            onChange={(e) => updateField(index, { maxLength: e.target.value ? parseInt(e.target.value) : undefined })}
                          />
                        </div>
                      </div>
                    </>
                  ) : field.type === 'number' ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium mb-1">Min</label>
                        <input
                          type="number"
                          className="border rounded w-full p-1 text-sm"
                          value={field.min || ''}
                          onChange={(e) => updateField(index, { min: e.target.value ? parseFloat(e.target.value) : undefined })}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium mb-1">Max</label>
                        <input
                          type="number"
                          className="border rounded w-full p-1 text-sm"
                          value={field.max || ''}
                          onChange={(e) => updateField(index, { max: e.target.value ? parseFloat(e.target.value) : undefined })}
                        />
                      </div>
                    </div>
                  ) : field.type === 'relation' ? (
                    <>
                      <div>
                        <label className="block text-xs font-medium mb-1">Relation Type</label>
                        <select
                          className="border rounded w-full p-1 text-sm"
                          value={field.relationType || 'manyToOne'}
                          onChange={(e) => updateField(index, { relationType: e.target.value as FieldDefinition['relationType'] })}
                        >
                          <option value="oneToOne">One to One</option>
                          <option value="oneToMany">One to Many</option>
                          <option value="manyToOne">Many to One</option>
                          <option value="manyToMany">Many to Many</option>
                        </select>
                      </div>
                      {availableContentTypes.length > 0 && (
                        <div>
                          <label className="block text-xs font-medium mb-1">Related Content Type</label>
                          <select
                            className="border rounded w-full p-1 text-sm"
                            value={field.relatedContentTypeId || ''}
                            onChange={(e) => updateField(index, { relatedContentTypeId: e.target.value || undefined })}
                          >
                            <option value="">None</option>
                            {availableContentTypes.map((ct) => (
                              <option key={ct.id} value={ct.id}>
                                {ct.name} ({ct.slug})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </>
                  ) : field.type === 'object' ? (
                    <div>
                      <label className="block text-xs font-medium mb-1">Nested Fields</label>
                      <div className="space-y-2 mt-2 pl-4 border-l-2">
                        {field.fields?.map((nestedField, nestedIndex) => (
                          <div key={nestedIndex} className="border rounded p-2 bg-white">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                className="border rounded w-full p-1 text-xs"
                                value={nestedField.name}
                                onChange={(e) => updateNestedField(index, nestedIndex, { name: e.target.value })}
                                placeholder="name"
                              />
                              <select
                                className="border rounded w-full p-1 text-xs"
                                value={nestedField.type}
                                onChange={(e) => updateNestedField(index, nestedIndex, { type: e.target.value as FieldDefinition['type'] })}
                              >
                                <option value="text">Text</option>
                                <option value="number">Number</option>
                                <option value="boolean">Boolean</option>
                              </select>
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm mt-1 text-red-600"
                              onClick={() => removeNestedField(index, nestedIndex)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => addNestedField(index)}>
                          + Add Nested Field
                        </button>
                      </div>
                    </div>
                  ) : field.type === 'array' ? (
                    <div>
                      <label className="block text-xs font-medium mb-1">Array Item Type</label>
                      <select
                        className="border rounded w-full p-1 text-sm"
                        value={field.items?.type || 'text'}
                        onChange={(e) => updateField(index, { items: { ...field.items, type: e.target.value as FieldDefinition['type'], name: field.items?.name || 'item' } })}
                      >
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                      </select>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

