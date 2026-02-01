import { z } from 'zod';
import { FormField, FieldType } from '@repo/ui';
import type { FieldDefinition } from '@/components/content/FieldsEditor';

export function fieldDefinitionToZod(field: FieldDefinition): z.ZodTypeAny {
  let zodType: z.ZodTypeAny;
  
  switch (field.type) {
    case 'number':
      zodType = z.number();
      if (field.min !== undefined) zodType = (zodType as z.ZodNumber).min(field.min);
      if (field.max !== undefined) zodType = (zodType as z.ZodNumber).max(field.max);
      break;
    case 'boolean':
      zodType = z.boolean();
      break;
    case 'date':
    case 'datetime':
      zodType = z.string(); // Dates as strings for now
      break;
    case 'json':
    case 'object':
      zodType = z.any();
      break;
    case 'array':
      zodType = z.array(z.any());
      break;
    default:
      zodType = z.string();
      if (field.minLength !== undefined) zodType = (zodType as z.ZodString).min(field.minLength);
      if (field.maxLength !== undefined) zodType = (zodType as z.ZodString).max(field.maxLength);
  }
  
  if (!field.required) {
    zodType = zodType.optional();
  }
  
  return zodType;
}

export function fieldsToZodSchema(fields: FieldDefinition[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach((field) => {
    shape[field.name] = fieldDefinitionToZod(field);
  });
  return z.object(shape);
}

export function fieldDefinitionToFormField(field: FieldDefinition): FormField {
  let type: FieldType = 'text';
  
  switch (field.type) {
    case 'number':
      type = 'number';
      break;
    case 'boolean':
      type = 'checkbox';
      break;
    case 'richtext':
      type = 'textarea';
      break;
    case 'json':
      type = 'json';
      break;
    case 'date':
    case 'datetime':
      type = 'date';
      break;
    default:
      type = 'text';
  }
  
  return {
    name: field.name,
    label: field.name.charAt(0).toUpperCase() + field.name.slice(1).replace(/([A-Z])/g, ' $1'),
    type,
    required: field.required,
    placeholder: field.description,
    helperText: field.description,
    defaultValue: field.defaultValue,
  };
}

export function fieldsToFormFields(fields: FieldDefinition[]): FormField[] {
  return fields.map(fieldDefinitionToFormField);
}




