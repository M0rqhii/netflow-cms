# Content Entries Module

Module for managing content entries based on content types in a multi-tenant headless CMS.

## Overview

The Content Entries module provides a complete RESTful API for creating, reading, updating, and deleting content entries. Each entry is validated against its content type schema and is isolated per tenant.

## Features

- ✅ Full CRUD operations for content entries
- ✅ Schema-based validation against content types
- ✅ Multi-tenant isolation
- ✅ Advanced filtering and sorting
- ✅ Full-text search
- ✅ Pagination support
- ✅ Role-based access control
- ✅ Content type caching for performance

## API Endpoints

All endpoints are prefixed with `/api/v1/content/:contentTypeSlug`

### Create Entry
```
POST /api/v1/content/:contentTypeSlug
```

### List Entries
```
GET /api/v1/content/:contentTypeSlug?page=1&pageSize=20&status=published&sort=-createdAt&search=test
```

### Get Entry
```
GET /api/v1/content/:contentTypeSlug/:id
```

### Update Entry
```
PATCH /api/v1/content/:contentTypeSlug/:id
```

### Delete Entry
```
DELETE /api/v1/content/:contentTypeSlug/:id
```

## Query Parameters

### List Endpoint Query Parameters

- `page` (number, default: 1) - Page number
- `pageSize` (number, default: 20, max: 100) - Items per page
- `status` (string, optional) - Filter by status: `draft`, `published`, `archived`
- `sort` (string, optional) - Sort fields: `-createdAt`, `updatedAt`, `status` (prefix with `-` for descending)
- `filter` (object, optional) - Filter by JSON data fields: `filter[field]=value`
- `search` (string, optional) - Full-text search across all string fields

## Examples

### Create Entry
```bash
curl -X POST http://localhost:4000/api/v1/content/article \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-ID: tenant-123' \
  -H 'Authorization: Bearer <token>' \
  -d '{
    "data": {
      "title": "My Article",
      "content": "Article content"
    },
    "status": "draft"
  }'
```

### List Entries with Filters
```bash
curl "http://localhost:4000/api/v1/content/article?status=published&page=1&pageSize=10&sort=-createdAt" \
  -H 'X-Tenant-ID: tenant-123' \
  -H 'Authorization: Bearer <token>'
```

### Search Entries
```bash
curl "http://localhost:4000/api/v1/content/article?search=test" \
  -H 'X-Tenant-ID: tenant-123' \
  -H 'Authorization: Bearer <token>'
```

## Validation

Content entries are validated against their content type schema:

- Required fields are enforced
- Field types are validated (string, number, boolean, object)
- String constraints (minLength, maxLength) are enforced
- Number constraints (minimum, maximum) are enforced

## Permissions

- `CONTENT_READ` - Read content entries
- `CONTENT_WRITE` - Create/Update content entries
- `CONTENT_DELETE` - Delete content entries

## Testing

Run unit tests:
```bash
pnpm test content-entries.service.spec.ts
```

Run E2E tests:
```bash
pnpm test:e2e content-entries.e2e-spec.ts
```

## Related Modules

- **ContentTypesModule** - Manages content type definitions
- **TenantModule** - Provides tenant isolation
- **AuthModule** - Provides authentication and authorization

## See Also

- [TNT-008 Completion Report](./TNT-008_COMPLETION.md)
- [Content Types Module](../content-types/README.md)





