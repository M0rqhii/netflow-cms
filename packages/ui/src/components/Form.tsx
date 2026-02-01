import React, { useCallback } from 'react';
import { z } from 'zod';
import { Input } from './Input';
import { Select, SelectOption } from './Select';
import { Textarea } from './Textarea';
import { Button } from './Button';
import { RichTextEditor } from './RichTextEditor';
import { MediaPicker, MediaItem } from './MediaPicker';
import { RelationPicker, RelationOption } from './RelationPicker';

export type FieldType = 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'date' | 'datetime' | 'json' | 'richtext' | 'media' | 'relation';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  helperText?: string;
  options?: SelectOption[];
  defaultValue?: unknown;
  validation?: z.ZodTypeAny;
  props?: Record<string, unknown>;
  // For media fields
  fetchMedia?: () => Promise<MediaItem[]>;
  multiple?: boolean;
  // For relation fields
  fetchRelations?: () => Promise<RelationOption[]>;
  displayField?: string;
  relationMultiple?: boolean;
}

export interface FormProps {
  schema: z.ZodObject<Record<string, z.ZodTypeAny>>;
  fields: FormField[];
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  defaultValues?: Record<string, unknown>;
  submitLabel?: string;
  isLoading?: boolean;
  className?: string;
}

export const Form: React.FC<FormProps> = ({
  schema,
  fields,
  onSubmit,
  defaultValues = {},
  submitLabel = 'Submit',
  isLoading = false,
  className,
}) => {
  const [formData, setFormData] = React.useState<Record<string, unknown>>(defaultValues);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleChange = useCallback((name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = schema.parse(formData);
      setErrors({});
      await onSubmit(validated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path.length > 0) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
      }
    }
  }, [formData, schema, onSubmit]);

  const renderField = (field: FormField) => {
    const value = formData[field.name] ?? field.defaultValue ?? '';
    const error = errors[field.name];
    const commonProps = {
      id: field.name,
      name: field.name,
      required: field.required,
      error,
      helperText: field.helperText,
      ...field.props,
    };
    const { id: fieldId, ...inputProps } = commonProps;

    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            key={field.name}
            label={field.label}
            value={String(value)}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            {...commonProps}
          />
        );
      
      case 'select':
        return (
          <Select
            key={field.name}
            label={field.label}
            value={String(value)}
            onChange={(e) => handleChange(field.name, e.target.value)}
            options={field.options || []}
            placeholder={field.placeholder}
            {...commonProps}
          />
        );
      
      case 'checkbox':
        return (
          <div key={field.name} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={fieldId}
              checked={Boolean(value)}
              onChange={(e) => handleChange(field.name, e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
              {...inputProps}
            />
            <label htmlFor={field.name} className="text-sm font-medium text-foreground">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        );
      
      case 'number':
        return (
          <Input
            key={field.name}
            label={field.label}
            type="number"
            value={String(value)}
            onChange={(e) => handleChange(field.name, parseFloat(e.target.value) || 0)}
            placeholder={field.placeholder}
            {...commonProps}
          />
        );
      
      case 'json':
        return (
          <Textarea
            key={field.name}
            label={field.label}
            value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleChange(field.name, parsed);
              } catch {
                handleChange(field.name, e.target.value);
              }
            }}
            placeholder={field.placeholder || '{}'}
            className="font-mono text-sm"
            {...commonProps}
          />
        );
      
      case 'richtext':
        return (
          <div key={field.name}>
            <RichTextEditor
              value={String(value || '')}
              onChange={(html) => handleChange(field.name, html)}
              placeholder={field.placeholder}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            {field.helperText && !error && <p className="mt-1 text-sm text-muted">{field.helperText}</p>}
          </div>
        );
      
      case 'media':
        if (!field.fetchMedia) {
          return (
            <div key={field.name} className="text-sm text-red-600">
              Media field requires fetchMedia function
            </div>
          );
        }
        return (
          <MediaPicker
            key={field.name}
            value={field.multiple ? (Array.isArray(value) ? value : value ? [String(value)] : []) : String(value || '')}
            onChange={(val) => handleChange(field.name, val)}
            multiple={field.multiple}
            label={field.label}
            required={field.required}
            error={error}
            helperText={field.helperText}
            fetchMedia={field.fetchMedia}
          />
        );
      
      case 'relation':
        if (!field.fetchRelations) {
          return (
            <div key={field.name} className="text-sm text-red-600">
              Relation field requires fetchRelations function
            </div>
          );
        }
        return (
          <RelationPicker
            key={field.name}
            value={field.relationMultiple ? (Array.isArray(value) ? value : value ? [String(value)] : []) : String(value || '')}
            onChange={(val) => handleChange(field.name, val)}
            multiple={field.relationMultiple}
            label={field.label}
            required={field.required}
            error={error}
            helperText={field.helperText}
            fetchOptions={field.fetchRelations}
            displayField={field.displayField}
          />
        );
      
      default:
        return (
          <Input
            key={field.name}
            label={field.label}
            type={field.type}
            value={String(value)}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            {...commonProps}
          />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        {fields.map((field) => renderField(field))}
      </div>
      <div className="mt-6 flex justify-end">
        <Button type="submit" isLoading={isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

