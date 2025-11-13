# Collections API Documentation

## Overview

Collections API umożliwia zarządzanie kolekcjami treści z pełną izolacją multi-tenant, wersjonowaniem i cache'owaniem.

**Base URL:** `/api/v1/collections`

**Authentication:** Wymagany nagłówek `X-Tenant-ID`

---

## Collections Endpoints

### Create Collection

```http
POST /api/v1/collections
X-Tenant-ID: <tenant-id>
Content-Type: application/json

{
  "slug": "articles",
  "name": "Articles",
  "schemaJson": {
    "title": "string",
    "content": "string"
  }
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "tenantId": "tenant-id",
  "slug": "articles",
  "name": "Articles",
  "schemaJson": {...},
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### List Collections

```http
GET /api/v1/collections
X-Tenant-ID: <tenant-id>
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "slug": "articles",
    "name": "Articles",
    ...
  }
]
```

### Get Collection

```http
GET /api/v1/collections/:slug
X-Tenant-ID: <tenant-id>
```

**Response:** `200 OK` lub `404 Not Found`

### Update Collection

```http
PUT /api/v1/collections/:slug
X-Tenant-ID: <tenant-id>
Content-Type: application/json

{
  "name": "Updated Name",
  "schemaJson": {...}
}
```

**Response:** `200 OK`

### Delete Collection

```http
DELETE /api/v1/collections/:slug
X-Tenant-ID: <tenant-id>
```

**Response:** `200 OK`
```json
{
  "ok": true
}
```

---

## Collection Items Endpoints

### Create Item

```http
POST /api/v1/collections/:slug/items
X-Tenant-ID: <tenant-id>
Content-Type: application/json

{
  "data": {
    "title": "Hello World",
    "content": "Article content"
  },
  "status": "DRAFT"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "tenantId": "tenant-id",
  "collectionId": "uuid",
  "status": "DRAFT",
  "data": {...},
  "version": 1,
  "etag": "sha1-hash",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### List Items

```http
GET /api/v1/collections/:slug/items?page=1&pageSize=20&status=DRAFT
X-Tenant-ID: <tenant-id>
```

**Query Parameters:**
- `page` (number, default: 1) - numer strony
- `pageSize` (number, default: 20, max: 100) - liczba items na stronę
- `status` (enum: DRAFT | PUBLISHED) - filtrowanie po statusie
- `sort` (string) - sortowanie (np. "-createdAt,name")
- `filter` (object) - dodatkowe filtry

**Response:** `200 OK`
```json
{
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "items": [...]
}
```

### Get Item

```http
GET /api/v1/collections/:slug/items/:id
X-Tenant-ID: <tenant-id>
If-None-Match: <etag> (opcjonalnie)
```

**Response:** `200 OK` lub `304 Not Modified` (jeśli ETag matches)

### Update Item

```http
PUT /api/v1/collections/:slug/items/:id
X-Tenant-ID: <tenant-id>
Content-Type: application/json

{
  "data": {
    "title": "Updated Title"
  },
  "status": "PUBLISHED",
  "version": 1
}
```

**Optimistic Locking:** Jeśli `version` nie pasuje do aktualnej wersji, zwraca `409 Conflict`

**Response:** `200 OK` lub `409 Conflict`

### Delete Item

```http
DELETE /api/v1/collections/:slug/items/:id
X-Tenant-ID: <tenant-id>
```

**Response:** `200 OK`
```json
{
  "ok": true
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Missing X-Tenant-Id header"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Collection not found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Version mismatch - item was modified"
}
```

---

## Examples

### cURL Examples

```bash
# Create collection
curl -X POST http://localhost:4000/api/v1/collections \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-ID: tenant-123' \
  -d '{
    "slug": "articles",
    "name": "Articles",
    "schemaJson": {"title": "string"}
  }'

# Create item
curl -X POST http://localhost:4000/api/v1/collections/articles/items \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-ID: tenant-123' \
  -d '{
    "data": {"title": "Hello World"},
    "status": "DRAFT"
  }'

# Get item with ETag
curl -i http://localhost:4000/api/v1/collections/articles/items/item-id \
  -H 'X-Tenant-ID: tenant-123' \
  -H 'If-None-Match: <etag>'
```

---

## Notes

- Wszystkie endpointy wymagają nagłówka `X-Tenant-ID`
- Multi-tenant isolation jest wymuszane automatycznie
- ETag jest automatycznie generowany dla items
- Redis cache działa dla metadanych kolekcji (30s TTL)
- Optimistic locking przez pole `version`

