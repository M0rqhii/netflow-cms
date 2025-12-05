import type { FieldDefinition } from '@/components/content/FieldsEditor';

/**
 * Converts a simple schema object (Record<string, string>) to FieldDefinition[]
 * This is used for collections that have simple schemas
 */
export function simpleSchemaToFields(schema: Record<string, unknown>): FieldDefinition[] {
  return Object.entries(schema).map(([name, type]) => {
    const typeStr = typeof type === 'string' ? type : String(type);
    
    // Try to infer field type from value or type string
    let fieldType: FieldDefinition['type'] = 'text';
    
    if (typeStr === 'number' || typeStr === 'Number') {
      fieldType = 'number';
    } else if (typeStr === 'boolean' || typeStr === 'Boolean') {
      fieldType = 'boolean';
    } else if (typeStr === 'date' || typeStr === 'Date') {
      fieldType = 'date';
    } else if (typeStr === 'datetime' || typeStr === 'DateTime') {
      fieldType = 'datetime';
    } else if (typeStr === 'richtext' || typeStr === 'RichText') {
      fieldType = 'richtext';
    } else if (typeStr === 'json' || typeStr === 'JSON') {
      fieldType = 'json';
    } else if (typeStr === 'select' || typeStr === 'Select') {
      fieldType = 'select';
    } else if (typeStr === 'relation' || typeStr === 'Relation') {
      fieldType = 'relation';
    } else if (typeStr === 'media' || typeStr === 'Media') {
      fieldType = 'media';
    }
    
    return {
      name,
      type: fieldType,
      required: false,
      description: `Field: ${name}`,
    };
  });
}

/**
 * Converts FieldDefinition[] back to simple schema object
 */
export function fieldsToSimpleSchema(fields: FieldDefinition[]): Record<string, string> {
  const schema: Record<string, string> = {};
  fields.forEach(field => {
    schema[field.name] = field.type;
  });
  return schema;
}




