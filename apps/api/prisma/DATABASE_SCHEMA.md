# Database Schema Documentation

## Overview

This document describes the current database schema for Netflow CMS. The system is organization + site scoped, with row-level security (RLS) enforcing isolation at both levels.

## Org + Site Strategy

The database uses a shared schema with scoped data:
- Org-scoped tables include `orgId` (organizations, billing, RBAC, org policies)
- Site-scoped tables include `siteId` (content types, entries, collections, media, pages)
- The API sets `app.current_org_id` and `app.current_site_id` for each request
- RLS policies enforce org/site isolation

## High-Level Diagram

```
Organization
  |-- Sites
  |     |-- ContentTypes
  |     |-- ContentEntries
  |     |-- Collections
  |     |-- CollectionItems
  |     |-- MediaItems
  |     |-- Pages / Environments / Deployments
  |
  |-- Users
  |-- UserOrg (memberships)
  |-- Roles / Capabilities / Policies
  |-- Billing (Subscriptions / Invoices / Payments)
```

## Core Models

### Organization
Top-level account that owns sites and billing.

Key fields: `id`, `name`, `slug`, `plan`, `settings`.

Relations:
- `sites` (one-to-many)
- `users` (org primary membership)
- `memberships` (UserOrg)
- `roles`, `orgPolicies`
- `subscriptions`, `invoices`, `payments`, `usageTracking`

### Site
A specific site managed inside an organization.

Key fields: `id`, `orgId`, `name`, `slug`, `settings`.

Relations (site-scoped):
- `contentTypes`, `contentEntries`
- `collections`, `collectionItems`, `collectionItemVersions`
- `mediaFiles`
- `pages`, `siteEnvironments`, `deployments`, `snapshots`, `siteEvents`

### User
Users belong to an organization and can be members of multiple orgs.

Key fields: `id`, `orgId`, `email`, `role`, `siteRole`, `platformRole`, `systemRole`.

Relations:
- `organization` (primary org)
- `memberships` (UserOrg)
- `userRoles` (RBAC role assignments)

### ContentType / ContentEntry
Content models and entries are scoped to `siteId`.

- ContentType: `siteId`, `name`, `slug`, `schema`
- ContentEntry: `siteId`, `contentTypeId`, `data`, `status`

### Collection / CollectionItem
Collections and items are scoped to `siteId` and support versioning.

- Collection: `siteId`, `slug`, `name`, `schemaJson`
- CollectionItem: `siteId`, `collectionId`, `status`, `data`, `version`

### MediaItem
Media assets are scoped to `siteId`.

Key fields: `siteId`, `fileName`, `url`, `mimeType`, `size`, `metadata`.

## Row-Level Security (RLS)

RLS is enabled to enforce isolation by org and site:

- Org-scoped policies use `current_setting('app.current_org_id')`
- Site-scoped policies use `current_setting('app.current_site_id')`

Examples:
```sql
CREATE POLICY org_isolation_roles ON "roles"
  FOR ALL
  USING ("orgId" = current_setting('app.current_org_id', true)::text);

CREATE POLICY site_isolation_content_entries ON "content_entries"
  FOR ALL
  USING ("siteId" = current_setting('app.current_site_id', true)::text);
```

Note: the `true` parameter allows NULL values so super-admin flows can bypass RLS at the application layer when explicitly intended.

## Indexing Strategy

- Org-level lookups: `orgId`, `orgId + slug` (for sites), `orgId + email` (users)
- Site-level lookups: `siteId`, `siteId + slug`, `siteId + status`, `siteId + createdAt`
- Collection item lookups: `siteId + collectionId`, `collectionId + status`

## Seed Data

Seed data is defined in `prisma/seed.ts` and includes:
- Demo orgs (e.g. `acme-corp`, `demo-company`) and a platform admin org
- Demo sites per org
- Demo users with org membership
- Sample content types, entries, collections, items, and media
- RBAC capabilities, system roles, and org policies

Default password for demo users: `password123`.

## Best Practices

1. Always include `orgId` or `siteId` in queries, even with RLS enabled.
2. Use composite indexes for status and time-based filters.
3. Keep JSON fields validated at the API layer.
4. Prefer org-scoped APIs for billing/RBAC and site-scoped APIs for content.

## References

- Prisma Documentation
- PostgreSQL Row-Level Security

---

Last Updated: 2026-01-24
Schema Version: 2.0.0
