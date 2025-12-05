import React, { useMemo, useCallback } from 'react';
import { z } from 'zod';
import { Form, FormField } from './Form';

export interface SchemaFormProps {
  schema: z.ZodObject<any> | Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void | Promise<void>;
  defaultValues?: Record<string, unknown>;
  submitLabel?: string;
  isLoading?: boolean;
  className?: string;
}

const zodTypeToFieldType = (zodType: z.ZodTypeAny): FormField['type'] => {
  if (zodType instanceof z.ZodString) {
    if (zodType._def.checks?.some((check: any) => check.kind === 'email')) return 'email';
    return 'text';
  }
  if (zodType instanceof z.ZodNumber) return 'number';
  if (zodType instanceof z.ZodBoolean) return 'checkbox';
  if (zodType instanceof z.ZodEnum) return 'select';
  if (zodType instanceof z.ZodObject) return 'json';
  return 'text';
};

const extractFieldFromZod = (key: string, zodType: z.ZodTypeAny): FormField | null => {
  const type = zodTypeToFieldType(zodType);
  
  let options: FormField['options'];
  if (zodType instanceof z.ZodEnum) {
    options = zodType._def.values.map((value: string) => ({
      value,
      label: value.charAt(0).toUpperCase() + value.slice(1),
    }));
  }

  const isOptional = zodType instanceof z.ZodOptional || zodType instanceof z.ZodNullable;
  const innerType = isOptional ? (zodType as z.ZodOptional<any>)._def.innerType : zodType;
  
  return {
    name: key,
    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
    type,
    required: !isOptional,
    options,
  };
};

export const SchemaForm: React.FC<SchemaFormProps> = ({
  schema,
  onSubmit,
  defaultValues = {},
  submitLabel = 'Submit',
  isLoading = false,
  className,
}) => {
  const zodSchema = useMemo(() => {
    if (schema instanceof z.ZodObject) {
      return schema;
    }
    const shape: Record<string, z.ZodTypeAny> = {};
    Object.entries(schema).forEach(([key, value]) => {
      if (typeof value === 'string') {
        shape[key] = z.string();
      } else if (typeof value === 'number') {
        shape[key] = z.number();
      } else if (typeof value === 'boolean') {
        shape[key] = z.boolean();
      } else {
        shape[key] = z.any();
      }
    });
    return z.object(shape);
  }, [schema]);

  const fields = useMemo(() => {
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape;
      return Object.entries(shape)
        .map(([key, zodType]) => extractFieldFromZod(key, zodType as z.ZodTypeAny))
        .filter((field): field is FormField => field !== null);
    }
    return Object.entries(schema).map(([key, value]) => ({
      name: key,
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
      type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'checkbox' : 'text' as FormField['type'],
      required: false,
    }));
  }, [schema]);

  return (
    <Form
      schema={zodSchema}
      fields={fields}
      onSubmit={onSubmit}
      defaultValues={defaultValues}
      submitLabel={submitLabel}
      isLoading={isLoading}
      className={className}
    />
  );
};




