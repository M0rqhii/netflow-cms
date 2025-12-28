# RBAC Database Model Documentation

## Overview

This document describes the Role-Based Access Control (RBAC) database model for netflow-cms. The RBAC system implements a three-layer permission model:

1. **Organization Roles (org roles)**: Owner / Org Admin / Org Member
2. **Operational Roles**: Manager / Editor / Publisher / Viewer / Admin (module-specific)
3. **Capabilities**: Atomic permissions (e.g., `builder.publish`, `org.users.invite`)

## Entity Relationship Diagram (ERD)

```
┌─────────────┐
│   Tenant    │
│  (orgId)    │
└──────┬──────┘
       │
       ├─────────────────────────────────────────┐
       │                                           │
       │                                           │
┌──────▼──────┐                          ┌────────▼────────┐
│    Role     │                          │  OrgPolicy      │
│             │                          │                 │
│ - orgId     │                          │ - orgId         │
│ - name      │                          │ - capabilityKey │
│ - type      │                          │ - enabled       │
│ - scope     │                          └─────────────────┘
│ - isImmutable│
└──────┬──────┘
       │
       ├──────────────────┐
       │                  │
┌──────▼──────┐   ┌───────▼────────┐
│RoleCapability│   │   UserRole     │
│              │   │                │
│ - roleId     │   │ - orgId        │
│ - capabilityId│  │ - userId       │
└──────┬───────┘   │ - roleId       │
       │           │ - siteId?      │
       │           └────────────────┘
       │
┌──────▼──────┐
│ Capability  │
│             │
│ - key       │
│ - module    │
│ - riskLevel │
└─────────────┘

┌─────────────┐
│  AuditLog   │
│             │
│ - entityType│
│ - entityId  │
│ - action    │
│ - orgId?    │
│ - siteId?   │
└─────────────┘
```

## Models

### Capability

**Purpose**: Atomic permissions - the single source of truth for all permissions in the system.

**Fields**:
- `id` (UUID, PK): Unique identifier
- `key` (String, Unique): Capability key (e.g., `builder.publish`, `org.users.invite`)
- `module` (String): Module name (e.g., `builder`, `org`, `billing`)
- `label` (String): Human-readable label
- `description` (String?): Description of the capability
- `riskLevel` (String): Risk level - `LOW`, `MED`, or `HIGH`
- `isDangerous` (Boolean): Whether the capability is dangerous
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Indexes**:
- `capabilities_key_key`: Unique index on `key`
- `capabilities_module_idx`: Index on `module`
- `capabilities_key_idx`: Index on `key`

**Relations**:
- `roleCapabilities`: Many-to-many with Role via RoleCapability

### Role

**Purpose**: System roles (preset, immutable) and custom roles (editable).

**Fields**:
- `id` (UUID, PK): Unique identifier
- `orgId` (String, FK → Tenant): Organization ID (tenantId)
- `name` (String): Role name (e.g., "Org Owner", "Site Admin")
- `description` (String?): Role description
- `type` (String): `SYSTEM` or `CUSTOM`
- `scope` (String): `ORG` or `SITE`
- `isImmutable` (Boolean): Whether the role is immutable (system roles)
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Constraints**:
- Unique constraint: `(orgId, name, scope)` - ensures unique role names per organization and scope

**Indexes**:
- `roles_orgId_name_scope_key`: Unique index on `(orgId, name, scope)`
- `roles_orgId_idx`: Index on `orgId`
- `roles_orgId_scope_idx`: Index on `(orgId, scope)`
- `roles_type_idx`: Index on `type`

**Relations**:
- `tenant`: Belongs to Tenant
- `roleCapabilities`: Many-to-many with Capability via RoleCapability
- `userRoles`: One-to-many with UserRole

### RoleCapability

**Purpose**: Join table linking roles to capabilities.

**Fields**:
- `id` (UUID, PK): Unique identifier
- `roleId` (String, FK → Role): Role ID
- `capabilityId` (String, FK → Capability): Capability ID
- `createdAt` (DateTime): Creation timestamp

**Constraints**:
- Unique constraint: `(roleId, capabilityId)` - prevents duplicate assignments

**Indexes**:
- `role_capabilities_roleId_capabilityId_key`: Unique index on `(roleId, capabilityId)`
- `role_capabilities_roleId_idx`: Index on `roleId`
- `role_capabilities_capabilityId_idx`: Index on `capabilityId`

**Relations**:
- `role`: Belongs to Role
- `capability`: Belongs to Capability

### UserRole

**Purpose**: Assignment of roles to users with ORG or SITE scope.

**Fields**:
- `id` (UUID, PK): Unique identifier
- `orgId` (String, FK → Tenant): Organization ID (tenantId)
- `userId` (String): User ID
- `roleId` (String, FK → Role): Role ID
- `siteId` (String?): Site ID (nullable) - if null, role is ORG scope; if set, role is SITE scope
- `createdAt` (DateTime): Creation timestamp

**Validation Rules** (enforced in application logic):
- SITE scope roles (`scope = 'SITE'`) must have `siteId` set
- ORG scope roles (`scope = 'ORG'`) must have `siteId = null`

**Indexes**:
- `user_roles_orgId_userId_idx`: Index on `(orgId, userId)`
- `user_roles_orgId_siteId_idx`: Index on `(orgId, siteId)`
- `user_roles_roleId_idx`: Index on `roleId`
- `user_roles_userId_idx`: Index on `userId`
- `user_roles_siteId_idx`: Index on `siteId`

**Relations**:
- `tenant`: Belongs to Tenant
- `role`: Belongs to Role

### OrgPolicy

**Purpose**: Global enable/disable toggle for capabilities at the organization level (⚠️ policy toggle).

**Fields**:
- `id` (UUID, PK): Unique identifier
- `orgId` (String, FK → Tenant): Organization ID (tenantId)
- `capabilityKey` (String): Capability key (e.g., `builder.rollback`)
- `enabled` (Boolean): Whether the capability is enabled in the organization
- `createdByUserId` (String?): ID of user who created the policy
- `createdAt` (DateTime): Creation timestamp
- `updatedAt` (DateTime): Last update timestamp

**Constraints**:
- Unique constraint: `(orgId, capabilityKey)` - one policy per capability per organization

**Indexes**:
- `org_policies_orgId_capabilityKey_key`: Unique index on `(orgId, capabilityKey)`
- `org_policies_orgId_idx`: Index on `orgId`
- `org_policies_capabilityKey_idx`: Index on `capabilityKey`

**Relations**:
- `tenant`: Belongs to Tenant

**Permission Check Logic**:
```
can(user, capability) = 
  user_has_role_with_capability(user, capability) 
  AND 
  org_policy_enabled(org, capability)
```

### AuditLog

**Purpose**: Minimal audit logging for RBAC changes.

**Fields**:
- `id` (UUID, PK): Unique identifier
- `entityType` (String): Type of entity changed (`role`, `capability`, `user_role`, `org_policy`)
- `entityId` (String): ID of the entity that was changed
- `action` (String): Action performed (`create`, `update`, `delete`, `assign`, `revoke`)
- `actorUserId` (String?): ID of user who performed the action
- `orgId` (String?): Organization ID (optional)
- `siteId` (String?): Site ID (optional)
- `metadata` (JSON): Additional metadata
- `createdAt` (DateTime): Creation timestamp

**Indexes**:
- `audit_logs_entityType_entityId_idx`: Index on `(entityType, entityId)`
- `audit_logs_actorUserId_idx`: Index on `actorUserId`
- `audit_logs_orgId_idx`: Index on `orgId`
- `audit_logs_siteId_idx`: Index on `siteId`
- `audit_logs_createdAt_idx`: Index on `createdAt`

## Row Level Security (RLS)

All RBAC tables have RLS enabled with tenant isolation policies:

- **roles**: `orgId = current_setting('app.current_tenant_id')`
- **role_capabilities**: Via role.orgId (nested check)
- **user_roles**: `orgId = current_setting('app.current_tenant_id')`
- **org_policies**: `orgId = current_setting('app.current_tenant_id')`
- **audit_logs**: `orgId IS NULL OR orgId = current_setting('app.current_tenant_id')`

## System Roles (Presets)

### Organization Roles (ORG scope)

#### Org Owner
- **Type**: SYSTEM, ORG scope
- **Capabilities**: ALL capabilities (including `billing.*` and `org.roles.manage`)
- **Immutable**: Yes

#### Org Admin
- **Type**: SYSTEM, ORG scope
- **Capabilities**: All except `billing.*` and `org.roles.manage`
- **Immutable**: Yes

#### Org Member
- **Type**: SYSTEM, ORG scope
- **Capabilities**: `org.view_dashboard`, `sites.view`
- **Immutable**: Yes

### Site Roles (SITE scope)

#### Site Admin
- **Type**: SYSTEM, SITE scope
- **Capabilities**: Full builder, content, site settings, custom code, site roles management
- **Immutable**: Yes

#### Editor-in-Chief
- **Type**: SYSTEM, SITE scope
- **Capabilities**: `builder.edit`, `builder.draft.save`, `builder.publish`, `builder.rollback` (⚠️), `content.*` (except delete)
- **Immutable**: Yes

#### Editor
- **Type**: SYSTEM, SITE scope
- **Capabilities**: `builder.edit`, `builder.draft.save`, `content.create`, `content.edit` (no publish)
- **Immutable**: Yes

#### Publisher
- **Type**: SYSTEM, SITE scope
- **Capabilities**: `builder.publish`, `builder.rollback` (⚠️), `content.publish` (no edit)
- **Immutable**: Yes

#### Viewer
- **Type**: SYSTEM, SITE scope
- **Capabilities**: `builder.view`, `content.view`, `analytics.view`
- **Immutable**: Yes

### Marketing Roles (SITE scope)

#### Marketing Manager
- **Type**: SYSTEM, SITE scope
- **Capabilities**: Full marketing access including campaigns, ads (⚠️), schedule (⚠️)
- **Immutable**: Yes

#### Marketing Editor
- **Type**: SYSTEM, SITE scope
- **Capabilities**: `marketing.view`, `marketing.content.edit`
- **Immutable**: Yes

#### Marketing Publisher
- **Type**: SYSTEM, SITE scope
- **Capabilities**: `marketing.view`, `marketing.publish`
- **Immutable**: Yes

#### Marketing Viewer
- **Type**: SYSTEM, SITE scope
- **Capabilities**: `marketing.view`, `marketing.stats.view`
- **Immutable**: Yes

## Capabilities List

### Organization Module
- `org.view_dashboard`
- `org.users.view`
- `org.users.invite`
- `org.users.remove`
- `org.roles.view`
- `org.roles.manage` (Owner only, never in custom roles)
- `org.policies.view`
- `org.policies.manage` (Owner; Org Admin if Owner allows)

### Billing Module (Owner only, not in custom roles)
- `billing.view_plan`
- `billing.change_plan`
- `billing.view_invoices`
- `billing.manage_payment_methods`

### Sites Module
- `sites.view`
- `sites.create`
- `sites.delete`
- `sites.settings.view`
- `sites.settings.manage`

### Builder Module
- `builder.view`
- `builder.edit`
- `builder.draft.save`
- `builder.publish`
- `builder.rollback` (⚠️ policy-controlled)
- `builder.history.view`
- `builder.assets.upload`
- `builder.assets.delete`
- `builder.custom_code` (Site Admin only)
- `builder.site_roles.manage` (Site Admin only)

### Content/CMS Module
- `content.view`
- `content.create`
- `content.edit`
- `content.delete`
- `content.publish`
- `content.media.manage`

### Hosting Module (Owner + Org Admin only)
- `hosting.usage.view`
- `hosting.deploy`
- `hosting.files.view`
- `hosting.files.edit`
- `hosting.logs.view`
- `hosting.backups.manage`
- `hosting.restart.manage`

### Domains Module (Owner + Org Admin only)
- `domains.view`
- `domains.assign`
- `domains.dns.manage`
- `domains.ssl.manage`
- `domains.add_remove`

### Marketing Module
- `marketing.view`
- `marketing.content.edit`
- `marketing.schedule` (⚠️ policy-controlled)
- `marketing.publish`
- `marketing.campaign.manage`
- `marketing.social.connect` (Admin/Owner)
- `marketing.ads.manage` (⚠️ policy-controlled)
- `marketing.stats.view`

### Analytics Module
- `analytics.view`

## Default OrgPolicy Settings

By default, most capabilities are **enabled** (`enabled = true`). The following capabilities are **disabled by default** (`enabled = false`) due to their risky nature:

- `builder.rollback` - Can revert published changes
- `marketing.ads.manage` - Can manage advertising campaigns
- `marketing.schedule` - Can schedule marketing posts

These can be enabled per organization by Owner or Org Admin (if Owner allows).

## Custom Roles

- Owner (and optionally Org Admin if Owner allows) can create custom roles
- Custom roles are created by selecting capabilities via checkboxes
- System roles are presets and are immutable
- Capabilities from `billing.*` and `org.roles.manage` **cannot** be assigned to custom roles

## Scope Rules

- **ORG scope roles**: Assigned via `UserRole` with `siteId = null`
- **SITE scope roles**: Assigned via `UserRole` with `siteId` set to specific site ID
- A user can have multiple roles (both ORG and SITE scope)
- Permission check: User must have role with capability AND org policy must enable the capability

## Indexes Summary

### Capability
- `capabilities_key_key` (unique)
- `capabilities_module_idx`
- `capabilities_key_idx`

### Role
- `roles_orgId_name_scope_key` (unique)
- `roles_orgId_idx`
- `roles_orgId_scope_idx`
- `roles_type_idx`

### RoleCapability
- `role_capabilities_roleId_capabilityId_key` (unique)
- `role_capabilities_roleId_idx`
- `role_capabilities_capabilityId_idx`

### UserRole
- `user_roles_orgId_userId_idx`
- `user_roles_orgId_siteId_idx`
- `user_roles_roleId_idx`
- `user_roles_userId_idx`
- `user_roles_siteId_idx`

### OrgPolicy
- `org_policies_orgId_capabilityKey_key` (unique)
- `org_policies_orgId_idx`
- `org_policies_capabilityKey_idx`

### AuditLog
- `audit_logs_entityType_entityId_idx`
- `audit_logs_actorUserId_idx`
- `audit_logs_orgId_idx`
- `audit_logs_siteId_idx`
- `audit_logs_createdAt_idx`

## Migration

The RBAC models are added via migration: `20250120000000_add_rbac_models`

To apply:
```bash
cd apps/api
npx prisma migrate deploy
```

## Seed Data

The seed script (`prisma/seed.ts`) creates:
- All capabilities from the list above
- System roles for tenant1 (Acme Corp)
- Default org policies (most enabled, risky ones disabled)
- Sample role assignment (adminUser → Org Owner)

To seed:
```bash
cd apps/api
npx prisma db seed
```

