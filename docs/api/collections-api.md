# Collections API Documentation

## Overview

Collections API umo?liwia zarz?dzanie kolekcjami tre?ci z pe?n? izolacj? org/site, wersjonowaniem i cache'owaniem.

**Base URL:** `/api/v1/collections`

**Authentication:** Bearer token wymagany. Dla endpoint?w site-scoped u?yj:
- **Site token** (rekomendowane): `POST /api/v1/auth/site-token` ? `Authorization: Bearer <site-token>`
- **Global token + headers**: `Authorization: Bearer <auth-token>` oraz `X-Org-ID`, `X-Site-ID`

---

## Collections Endpoints

### Create Collection

```http
POST /api/v1/collections
Authorization: Bearer <token>
X-Org-ID: <org-id>
X-Site-ID: <site-id>
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
  "siteId": "site-id",
  "slug": "articles",
  "name": "Articles",
  "schemaJson": {},
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### List Collections

```http
GET /api/v1/collections
Authorization: Bearer <token>
X-Org-ID: <org-id>
X-Site-ID: <site-id>
```

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "slug": "articles",
    "name": "Articles"
  }
]
```

### Get Collection

```http
GET /api/v1/collections/:slug
Authorization: Bearer <token>
X-Org-ID: <org-id>
X-Site-ID: <site-id>
```

**Response:** `200 OK` lub `404 Not Found`

### Update Collection

```http
PUT /api/v1/collections/:slug
Authorization: Bearer <token>
X-Org-ID: <org-id>
X-Site-ID: <site-id>
Content-Type: application/json

{
  "name": "Updated Name",
  "schemaJson": {}
}
```

**Response:** `200 OK`

### Delete Collection

```http
DELETE /api/v1/collections/:slug
Authorization: Bearer <token>
X-Org-ID: <org-id>
X-Site-ID: <site-id>
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
Authorization: Bearer <token>
X-Org-ID: <org-id>
X-Site-ID: <site-id>
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
  "siteId": "site-id",
  "collectionId": "uuid",
  "status": "DRAFT",
  "data": {},
  "version": 1,
  "etag": "sha1-hash",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### List Items

```http
GET /api/v1/collections/:slug/items?page=1&pageSize=20&status=DRAFT
Authorization: Bearer <token>
X-Org-ID: <org-id>
X-Site-ID: <site-id>
```

**Query Parameters:**
- `page` (number, default: 1) - numer strony
- `pageSize` (number, default: 20, max: 100) - liczba items na stron?
- `status` (enum: DRAFT | PUBLISHED) - filtrowanie po statusie
- `sort` (string) - sortowanie (np. "-createdAt,name")
- `filter` (object) - dodatkowe filtry

**Response:** `200 OK`
```json
{
  "total": 100,
  "page": 1,
  "pageSize": 20,
  "items": []
}
```

### Get Item

```http
GET /api/v1/collections/:slug/items/:id
Authorization: Bearer <token>
X-Org-ID: <org-id>
X-Site-ID: <site-id>
If-None-Match: <etag> (opcjonalnie)
```

**Response:** `200 OK` lub `304 Not Modified` (je?li ETag matches)

### Update Item

```http
PUT /api/v1/collections/:slug/items/:id
Authorization: Bearer <token>
X-Org-ID: <org-id>
X-Site-ID: <site-id>
Content-Type: application/json

{
  "data": {
    "title": "Updated Title"
  },
  "status": "PUBLISHED",
  "version": 1
}
```

**Optimistic Locking:** Je?li `version` nie pasuje do aktualnej wersji, zwraca `409 Conflict`

**Response:** `200 OK` lub `409 Conflict`

### Delete Item

```http
DELETE /api/v1/collections/:slug/items/:id
Authorization: Bearer <token>
X-Org-ID: <org-id>
X-Site-ID: <site-id>
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
  "message": "Missing site or organization context"
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
curl -X POST http://localhost:4000/api/v1/collections   -H "Authorization: Bearer $TOKEN"   -H "X-Org-ID: $ORG_ID"   -H "X-Site-ID: $SITE_ID"   -H "Content-Type: application/json"   -d '{"slug":"articles","name":"Articles","schemaJson":{"title":"string","content":"string"}}'
```
