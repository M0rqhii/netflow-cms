# Database Schema Documentation

## Overview

This document describes the database schema for Netflow CMS - a multi-tenant headless CMS. The schema is designed with **row-level security (RLS)** and **tenant isolation** as core principles.

## Multi-Tenancy Strategy

The database uses a **shared database with row-level security** approach:
- All tenant-scoped tables include a `tenantId` column
- PostgreSQL Row-Level Security (RLS) policies enforce tenant isolation
- Application middleware sets `app.current_tenant_id` for each request
- All queries are automatically filtered by tenant

## Schema Diagram

```
┌─────────────┐
│   Tenant    │
└──────┬──────┘
       │
       ├─── User
       ├─── ContentType
       ├─── ContentEntry
       ├─── Collection
       ├─── CollectionItem
       └─── MediaFile
```

## Models

### Tenant

Organizations using the platform.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | String | Tenant name |
| `slug` | String (unique) | URL-friendly identifier |
| `plan` | String | Subscription plan (free, professional, enterprise) |
| `settings` | JSON | Tenant-specific settings |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Relations:**
- `users` - Users belonging to this tenant
- `contentTypes` - Content types defined by this tenant
- `contentEntries` - Content entries created by this tenant
- `collections` - Collections defined by this tenant
- `collectionItems` - Items in collections
- `mediaFiles` - Media files uploaded by this tenant

**Indexes:**
- `slug` (unique)

---

### User

Users in the system, scoped to a tenant.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenantId` | UUID (FK) | Tenant this user belongs to |
| `email` | String | User email (unique per tenant) |
| `passwordHash` | String | Hashed password |
| `role` | String | User role (super_admin, tenant_admin, editor, viewer) |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Relations:**
- `tenant` - Tenant this user belongs to

**Indexes:**
- `tenantId`
- `tenantId + email` (unique)

**RLS Policy:** `tenant_isolation_users`

---

### ContentType

Definitions of content types (schemas).

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenantId` | UUID (FK) | Tenant this content type belongs to |
| `name` | String | Display name |
| `slug` | String | URL-friendly identifier (unique per tenant) |
| `schema` | JSON | Zod schema definition as JSON |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Relations:**
- `tenant` - Tenant this content type belongs to
- `contentEntries` - Entries using this content type

**Indexes:**
- `tenantId`
- `tenantId + slug` (unique)

**RLS Policy:** `tenant_isolation_content_types`

---

### ContentEntry

Content entries conforming to a content type.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenantId` | UUID (FK) | Tenant this entry belongs to |
| `contentTypeId` | UUID (FK) | Content type this entry conforms to |
| `data` | JSON | Content data (validated against ContentType.schema) |
| `status` | String | Entry status (draft, published, archived) |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Relations:**
- `tenant` - Tenant this entry belongs to
- `contentType` - Content type definition

**Indexes:**
- `tenantId`
- `tenantId + contentTypeId`
- `tenantId + status`
- `tenantId + createdAt`

**RLS Policy:** `tenant_isolation_content_entries`

---

### Collection

Collections of content items with versioning support.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenantId` | UUID (FK) | Tenant this collection belongs to |
| `slug` | String | URL-friendly identifier (unique per tenant) |
| `name` | String | Display name |
| `schemaJson` | JSON | Zod schema definition as JSON |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Relations:**
- `tenant` - Tenant this collection belongs to
- `items` - Items in this collection

**Indexes:**
- `tenantId`
- `tenantId + slug` (unique)

**RLS Policy:** `tenant_isolation_collections`

---

### CollectionItem

Items in collections with versioning and optimistic locking.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenantId` | UUID (FK) | Tenant this item belongs to |
| `collectionId` | UUID (FK) | Collection this item belongs to |
| `status` | ItemStatus | Item status (DRAFT, PUBLISHED) |
| `data` | JSON | Item data (validated against Collection.schemaJson) |
| `createdById` | UUID? | User who created this item |
| `updatedById` | UUID? | User who last updated this item |
| `createdAt` | DateTime | Creation timestamp |
| `updatedAt` | DateTime | Last update timestamp |
| `version` | Int | Version number (for optimistic locking) |
| `publishedAt` | DateTime? | Publication timestamp |
| `etag` | String | ETag for cache validation |

**Relations:**
- `tenant` - Tenant this item belongs to
- `collection` - Collection this item belongs to

**Indexes:**
- `tenantId + collectionId`
- `tenantId + status`
- `tenantId + createdAt`
- `collectionId + status`

**RLS Policy:** `tenant_isolation_collection_items`

---

### MediaFile

Media files (images, videos, documents) uploaded by tenants.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `tenantId` | UUID (FK) | Tenant this file belongs to |
| `filename` | String | Original filename |
| `url` | String | URL to file (S3/CDN) |
| `mimeType` | String | MIME type (image/jpeg, video/mp4, etc.) |
| `size` | Int | File size in bytes |
| `width` | Int? | Image width (for images) |
| `height` | Int? | Image height (for images) |
| `alt` | String? | Alt text (for images) |
| `metadata` | JSON | Additional metadata (EXIF, etc.) |
| `uploadedById` | UUID? | User who uploaded this file |
| `createdAt` | DateTime | Upload timestamp |
| `updatedAt` | DateTime | Last update timestamp |

**Relations:**
- `tenant` - Tenant this file belongs to

**Indexes:**
- `tenantId`
- `tenantId + mimeType`
- `tenantId + createdAt`

**RLS Policy:** `tenant_isolation_media_files`

---

## Enums

### ItemStatus

Status values for collection items:
- `DRAFT` - Item is in draft state
- `PUBLISHED` - Item is published

---

## Row-Level Security (RLS)

All tenant-scoped tables have RLS enabled with policies that enforce tenant isolation using PostgreSQL's `current_setting('app.current_tenant_id')`.

### How RLS Works

1. Application middleware extracts `tenantId` from request (header/subdomain)
2. Middleware sets `app.current_tenant_id` in PostgreSQL session
3. RLS policies automatically filter all queries to only return rows matching the current tenant
4. Prevents data leakage between tenants at the database level

### RLS Policies

All policies follow this pattern:
```sql
CREATE POLICY tenant_isolation_<table> ON "<table>"
  FOR ALL
  USING ("tenantId" = current_setting('app.current_tenant_id', true)::TEXT);
```

**Note:** RLS policies use `true` parameter to allow NULL values (for super admin access). Application should handle super admin access separately.

---

## Indexes Strategy

### Tenant Isolation Indexes
All tenant-scoped tables have indexes on `tenantId` for fast tenant filtering.

### Composite Indexes
- `tenantId + slug` - For unique lookups per tenant
- `tenantId + contentTypeId` - For filtering entries by type
- `tenantId + status` - For filtering by status
- `tenantId + createdAt` - For time-based queries
- `collectionId + status` - For collection-specific status filtering

### Query Optimization
Indexes are designed to support common query patterns:
- List all items for a tenant
- Filter by status within a tenant
- Sort by creation date within a tenant
- Lookup by slug within a tenant

---

## Migrations

### Initial Migration (`20251109032905_init`)
Creates base schema with:
- Tenant, User, ContentType, ContentEntry, Collection, CollectionItem tables
- Basic indexes
- Foreign key constraints

### Media Files Migration (`20251109042018_add_media_files_and_indexes`)
Adds:
- MediaFile table
- Additional indexes for performance
- Row-Level Security policies for all tenant-scoped tables

---

## Seed Data

Seed data is available in `prisma/seed.ts` for development purposes.

**Default Seed Data:**
- 2 Tenants (acme-corp, demo-company)
- 4 Users (3 for acme-corp, 1 for demo-company)
- 1 Content Type (article)
- 2 Content Entries
- 1 Collection (blog-posts)
- 2 Collection Items
- 2 Media Files

**Default Password:** `password123` (for all seed users)

**Run Seed:**
```bash
pnpm db:seed
```

---

## Best Practices

### 1. Always Include tenantId
Every query on tenant-scoped tables should include `tenantId` in the WHERE clause, even though RLS enforces it.

### 2. Use Indexes
Leverage composite indexes for common query patterns:
```typescript
// Good: Uses tenantId + status index
await prisma.contentEntry.findMany({
  where: { tenantId, status: 'published' }
});

// Good: Uses tenantId + createdAt index
await prisma.contentEntry.findMany({
  where: { tenantId },
  orderBy: { createdAt: 'desc' }
});
```

### 3. Cascade Deletes
All foreign keys use `ON DELETE CASCADE` to ensure data consistency when tenants are deleted.

### 4. JSON Fields
Use JSON fields for flexible schemas:
- `ContentType.schema` - Zod schema definition
- `ContentEntry.data` - Content data
- `Collection.schemaJson` - Collection schema
- `CollectionItem.data` - Item data
- `MediaFile.metadata` - File metadata

### 5. Versioning
Collection items use `version` field for optimistic locking. Always increment version on updates.

### 6. ETags
Collection items include `etag` field for cache validation. Generate ETag based on item data hash.

---

## Security Considerations

1. **RLS Enforcement**: RLS policies provide defense-in-depth, but application should also enforce tenant isolation
2. **Password Hashing**: Use bcrypt or argon2 for password hashing (not SHA256 used in seed)
3. **Super Admin Access**: Super admins may need to bypass RLS - handle this at application level
4. **SQL Injection**: Prisma protects against SQL injection, but always use parameterized queries
5. **Data Validation**: Validate JSON data against schemas before storing

---

## Future Enhancements

Potential schema additions:
- **Audit Logs** - Track all data changes
- **Webhooks** - Webhook configurations per tenant
- **API Keys** - API key management
- **Roles & Permissions** - Granular permission system
- **Soft Deletes** - Add `deletedAt` field for soft deletes
- **Content Relations** - Relations between content entries
- **Media Variants** - Different sizes/formats of media files

---

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Row-Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Multi-Tenancy Patterns](https://docs.microsoft.com/en-us/azure/sql-database/saas-tenancy-app-design-patterns)

---

**Last Updated:** 2024-11-09  
**Schema Version:** 1.0.0


