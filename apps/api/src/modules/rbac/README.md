# RBAC Module

## Overview

Complete RBAC (Role-Based Access Control) implementation for the netflow-cms platform.

## Structure

```
rbac/
├── capability-registry.ts      # Source of truth for all capabilities
├── capability-sync.service.ts  # Syncs capabilities from registry to DB
├── rbac.service.ts             # Business logic
├── rbac.controller.ts          # API endpoints
├── rbac.module.ts              # NestJS module
├── rbac.service.spec.ts        # Unit tests
└── dto/
    ├── create-role.dto.ts
    ├── update-role.dto.ts
    ├── create-assignment.dto.ts
    ├── update-policy.dto.ts
    └── index.ts
```

## Features

### 1. Capability Registry
- Single source of truth for all capabilities
- Defined in `capability-registry.ts`
- All capabilities must be registered here before use

### 2. Roles
- **System Roles**: Immutable preset roles (Org Owner, Org Admin, Site Admin, etc.)
- **Custom Roles**: User-defined roles with selected capabilities
- **Scope**: ORG (organization-wide) or SITE (site-specific)

### 3. Assignments
- Assign roles to users
- ORG scope: applies to entire organization
- SITE scope: applies to specific site

### 4. Policies
- Organization-level toggles for capabilities
- Marked with ⚠️ in registry
- Can enable/disable capabilities globally for organization

## API Endpoints

All endpoints are under `/orgs/:orgId/rbac`:

- `GET /capabilities` - List all capabilities with policy status
- `GET /roles?scope=ORG|SITE` - List roles
- `POST /roles` - Create custom role
- `PATCH /roles/:roleId` - Update custom role
- `DELETE /roles/:roleId?force=true` - Delete custom role
- `GET /assignments?userId=&siteId=` - List assignments
- `POST /assignments` - Assign role to user
- `DELETE /assignments/:assignmentId` - Remove assignment
- `GET /policies` - List policies
- `PUT /policies/:capabilityKey` - Update policy

See `docs/rbac/api.md` for detailed API documentation.

## Authorization

### Owner
- Full access to all operations
- Can manage roles, policies, assignments

### Org Admin
- Can manage RBAC in SITE/technical scope
- Cannot access billing operations
- Can manage policies only if Owner enabled `org.policies.manage`

### Others
- Based on specific capabilities

## Validation Rules

### Custom Roles
- Cannot contain blocked capabilities:
  - `billing.*` (all billing capabilities)
  - `org.roles.manage`
  - `org.policies.manage`

### Scope Rules
- **ORG scope**: `siteId` must be `null` in assignments
- **SITE scope**: `siteId` is required in assignments

### System Roles
- Cannot be edited or deleted
- Immutable

## Usage Example

```typescript
// Check if user can perform action
const canPublish = await rbacService.canUserPerform(
  orgId,
  userId,
  'builder.publish',
  siteId
);

if (canPublish) {
  // User can publish
}
```

## Database Schema

The module uses the following Prisma models:
- `Capability` - Capability definitions
- `Role` - Roles (system + custom)
- `RoleCapability` - Role-capability mapping
- `UserRole` - User-role assignments
- `OrgPolicy` - Organization policies

## Testing

Run tests:
```bash
cd apps/api
npm test -- rbac.service.spec.ts
```

## Capability Sync

To sync capabilities from registry to database:

```typescript
const syncService = new CapabilitySyncService(prisma);
await syncService.syncCapabilities();
```

This should be run:
- On application startup
- After adding new capabilities to registry
- Via migration/seeding script

