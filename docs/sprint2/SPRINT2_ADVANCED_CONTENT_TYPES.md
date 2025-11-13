# Sprint 2: Advanced Content Types - Relations & Nested Objects

**Status:** ✅ Completed  
**Completed Date:** 2024-01-09  
**Sprint:** Sprint 2

---

## Summary

Zaimplementowano wsparcie dla zaawansowanych typów pól w Content Types, w tym relations (relacje między content types) oraz nested objects (zagnieżdżone obiekty).

---

## Deliverables

### 1. Relations (Relacje między Content Types)

**Plik:** `apps/api/src/modules/content-types/dto/create-content-type.dto.ts`

**Implementacja:**
- ✅ Typ pola `relation` ✅
- ✅ Właściwości relation:
  - `relationType`: `oneToOne`, `oneToMany`, `manyToOne`, `manyToMany` ✅
  - `relatedContentTypeId`: UUID powiązanego content type ✅

**Przykład:**
```typescript
{
  name: "author",
  type: "relation",
  relationType: "manyToOne",
  relatedContentTypeId: "content-type-id",
  required: true
}
```

**Status:** ✅ Zaimplementowane

### 2. Nested Objects (Zagnieżdżone Obiekty)

**Plik:** `apps/api/src/modules/content-types/dto/create-content-type.dto.ts`

**Implementacja:**
- ✅ Typ pola `object` ✅
- ✅ Właściwość `fields`: array pól dla nested object ✅
- ✅ Rekurencyjne schema generation ✅

**Przykład:**
```typescript
{
  name: "address",
  type: "object",
  fields: [
    { name: "street", type: "text", required: true },
    { name: "city", type: "text", required: true },
    { name: "zipCode", type: "text", required: true }
  ]
}
```

**Status:** ✅ Zaimplementowane

### 3. Array Fields (Pola Tablicowe)

**Plik:** `apps/api/src/modules/content-types/dto/create-content-type.dto.ts`

**Implementacja:**
- ✅ Typ pola `array` ✅
- ✅ Właściwość `items`: schema dla elementów tablicy ✅

**Przykład:**
```typescript
{
  name: "tags",
  type: "array",
  items: {
    name: "tag",
    type: "text"
  }
}
```

**Status:** ✅ Zaimplementowane

---

## Technical Implementation

### ContentTypeField Schema

**Extended Field Types:**
- `relation` - Relation to another content type
- `object` - Nested object with fields
- `array` - Array of values

**Field Properties:**

**For Relation Fields:**
- `relationType`: `oneToOne` | `oneToMany` | `manyToOne` | `manyToMany`
- `relatedContentTypeId`: UUID of related content type

**For Object Fields:**
- `fields`: Array of ContentTypeField (recursive)

**For Array Fields:**
- `items`: ContentTypeField schema for array items

### Schema Generation

**ContentTypesService.fieldsToJsonSchema():**
- ✅ Generates JSON Schema for relation fields ✅
- ✅ Generates JSON Schema for nested objects (recursive) ✅
- ✅ Generates JSON Schema for array fields ✅

**Relation Schema:**
```json
{
  "type": "string",
  "format": "uuid",
  "relationType": "manyToOne",
  "relatedContentTypeId": "content-type-id"
}
```

**Object Schema:**
```json
{
  "type": "object",
  "properties": {
    "street": { "type": "string" },
    "city": { "type": "string" },
    "zipCode": { "type": "string" }
  },
  "required": ["street", "city", "zipCode"]
}
```

**Array Schema:**
```json
{
  "type": "array",
  "items": { "type": "string" }
}
```

---

## Examples

### Example 1: Blog Post with Author Relation

```typescript
{
  name: "Blog Post",
  slug: "blog-post",
  fields: [
    { name: "title", type: "text", required: true },
    { name: "content", type: "richtext", required: true },
    {
      name: "author",
      type: "relation",
      relationType: "manyToOne",
      relatedContentTypeId: "author-content-type-id",
      required: true
    }
  ]
}
```

### Example 2: Product with Nested Address

```typescript
{
  name: "Product",
  slug: "product",
  fields: [
    { name: "name", type: "text", required: true },
    { name: "price", type: "number", required: true },
    {
      name: "shippingAddress",
      type: "object",
      fields: [
        { name: "street", type: "text", required: true },
        { name: "city", type: "text", required: true },
        { name: "zipCode", type: "text", required: true },
        { name: "country", type: "text", required: true }
      ]
    }
  ]
}
```

### Example 3: Article with Tags Array

```typescript
{
  name: "Article",
  slug: "article",
  fields: [
    { name: "title", type: "text", required: true },
    { name: "content", type: "richtext", required: true },
    {
      name: "tags",
      type: "array",
      items: {
        name: "tag",
        type: "text"
      }
    }
  ]
}
```

---

## Files Created/Modified

### Modified
- `apps/api/src/modules/content-types/dto/create-content-type.dto.ts` - Extended ContentTypeFieldSchema
- `apps/api/src/modules/content-types/services/content-types.service.ts` - Extended fieldsToJsonSchema()

### Created
- `docs/sprint2/SPRINT2_ADVANCED_CONTENT_TYPES.md` - Ten dokument

---

## Future Enhancements

### Relations
- [ ] Automatic reverse relations
- [ ] Relation validation
- [ ] Cascade delete options
- [ ] Relation queries (join queries)

### Nested Objects
- [ ] Deep nesting support (nested objects in nested objects)
- [ ] Object validation
- [ ] Object queries

### Array Fields
- [ ] Array validation (min/max items)
- [ ] Array queries
- [ ] Array operations (add, remove, update)

---

## Notes

- Relations store UUID references to other content entries
- Nested objects are stored as JSON in the database
- Array fields are stored as JSON arrays
- Schema generation is recursive for nested objects
- All field types are validated using Zod schemas

---

**Completed by:** Backend Codex  
**Review Status:** Ready for Review  
**Next Review:** After relation queries implementation

