# RBAC API Documentation

## Overview

The RBAC API provides endpoints for managing roles, capabilities, assignments, and organization policies.

**Base Path:** `/orgs/:orgId/rbac`

**Authentication:** All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

**Authorization:**
- **Owner**: Can perform all operations
- **Org Admin**: Can perform RBAC operations in SITE/technical scope, but not billing-related operations
- **Others**: Based on specific capabilities

---

## Endpoints

### Capabilities

#### GET /orgs/:orgId/rbac/capabilities

Get all capabilities with policy status.

**Response:**
```json
[
  {
    "key": "builder.publish",
    "module": "builder",
    "label": "Publish",
    "description": "Publish pages to production",
    "riskLevel": "HIGH",
    "isDangerous": true,
    "canBePolicyControlled": false,
    "policyEnabled": true,
    "metadata": {
      "blockedForCustomRoles": false
    }
  }
]
```

---

### Roles

#### GET /orgs/:orgId/rbac/roles?scope=ORG|SITE

Get all roles (system + custom) with optional scope filter.

**Query Parameters:**
- `scope` (optional): Filter by `ORG` or `SITE`

**Response:**
```json
[
  {
    "id": "role-uuid",
    "name": "Org Owner",
    "description": "Organization owner with full access",
    "type": "SYSTEM",
    "scope": "ORG",
    "isImmutable": true,
    "capabilities": [
      {
        "key": "org.view_dashboard",
        "module": "org",
        "label": "View Organization Dashboard"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /orgs/:orgId/rbac/roles

Create a custom role.

**Authorization:** Requires `org.roles.manage` capability or Owner role.

**Request Body:**
```json
{
  "name": "Custom Editor",
  "description": "Custom role for editors",
  "scope": "SITE",
  "capabilityKeys": [
    "builder.view",
    "builder.edit",
    "builder.draft.save"
  ]
}
```

**Validation:**
- `name`: Required, 1-100 characters
- `description`: Optional, max 500 characters
- `scope`: Required, must be `ORG` or `SITE`
- `capabilityKeys`: Required, array of valid capability keys (min 1)

**Blocked Capabilities:**
The following capabilities cannot be assigned to custom roles:
- `billing.*` (all billing capabilities)
- `org.roles.manage`
- `org.policies.manage`

**Response:**
```json
{
  "id": "role-uuid",
  "name": "Custom Editor",
  "description": "Custom role for editors",
  "type": "CUSTOM",
  "scope": "SITE",
  "isImmutable": false,
  "capabilities": [
    {
      "key": "builder.view",
      "module": "builder",
      "label": "View Builder"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Errors:**
- `400 Bad Request`: Invalid capabilities or blocked capabilities
- `409 Conflict`: Role name already exists for this scope

#### PATCH /orgs/:orgId/rbac/roles/:roleId

Update a custom role.

**Authorization:** Requires `org.roles.manage` capability or Owner role.

**Request Body:**
```json
{
  "name": "Updated Role Name",
  "description": "Updated description",
  "capabilityKeys": [
    "builder.view",
    "builder.edit"
  ]
}
```

**Validation:**
- All fields are optional
- If `capabilityKeys` is provided, must contain at least 1 valid capability
- Cannot update system roles

**Response:** Same as POST /roles

**Errors:**
- `400 Bad Request`: Invalid capabilities, blocked capabilities, or attempting to update system role
- `404 Not Found`: Role not found

#### DELETE /orgs/:orgId/rbac/roles/:roleId?force=true

Delete a custom role.

**Authorization:** Requires `org.roles.manage` capability or Owner role.

**Query Parameters:**
- `force` (optional): If `true`, removes all assignments before deleting role

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- `400 Bad Request`: Attempting to delete system role
- `404 Not Found`: Role not found
- `409 Conflict`: Role has assignments (use `force=true` to remove)

---

### Assignments

#### GET /orgs/:orgId/rbac/assignments?userId=&siteId=

Get role assignments.

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `siteId` (optional): Filter by site ID (use `null` for ORG scope)

**Response:**
```json
[
  {
    "id": "assignment-uuid",
    "userId": "user-uuid",
    "roleId": "role-uuid",
    "siteId": "site-uuid",
    "role": {
      "id": "role-uuid",
      "name": "Site Admin",
      "type": "SYSTEM",
      "scope": "SITE",
      "capabilities": [
        {
          "key": "builder.view",
          "module": "builder"
        }
      ]
    },
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

#### POST /orgs/:orgId/rbac/assignments

Assign a role to a user.

**Authorization:**
- ORG scope: Requires `org.roles.manage` capability or Owner role
- SITE scope: Requires `builder.site_roles.manage` capability or Owner role

**Request Body:**
```json
{
  "userId": "user-uuid",
  "roleId": "role-uuid",
  "siteId": "site-uuid"
}
```

**Validation:**
- `userId`: Required, valid UUID
- `roleId`: Required, valid UUID
- `siteId`: Optional, required for SITE scope roles, must be null for ORG scope roles

**Response:** Same as GET /assignments (single assignment object)

**Errors:**
- `400 Bad Request`: Invalid scope rules (SITE role without siteId, ORG role with siteId)
- `404 Not Found`: Role, user, or site not found
- `409 Conflict`: Assignment already exists

#### DELETE /orgs/:orgId/rbac/assignments/:assignmentId

Remove a role assignment.

**Authorization:**
- ORG scope: Requires `org.roles.manage` capability or Owner role
- SITE scope: Requires `builder.site_roles.manage` capability or Owner role

**Response:**
```json
{
  "success": true
}
```

**Errors:**
- `404 Not Found`: Assignment not found

---

### Policies

#### GET /orgs/:orgId/rbac/policies

Get all organization policies (capability toggles).

**Response:**
```json
[
  {
    "id": "policy-uuid",
    "capabilityKey": "builder.rollback",
    "enabled": false,
    "createdByUserId": "user-uuid",
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
]
```

#### PUT /orgs/:orgId/rbac/policies/:capabilityKey

Update organization policy (enable/disable capability).

**Authorization:** Requires `org.policies.manage` capability or Owner role.

**Request Body:**
```json
{
  "enabled": false
}
```

**Validation:**
- Only capabilities with `canBePolicyControlled: true` can be toggled
- Policy-controlled capabilities are marked with ⚠️ in the registry

**Response:**
```json
{
  "id": "policy-uuid",
  "capabilityKey": "builder.rollback",
  "enabled": false,
  "createdByUserId": "user-uuid",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Errors:**
- `400 Bad Request`: Capability cannot be policy-controlled
- `404 Not Found`: Capability not found

---

## Capability Registry

The capability registry is the single source of truth for all capabilities in the system. It is defined in `apps/api/src/modules/rbac/capability-registry.ts`.

### Capability Structure

```typescript
{
  key: string;              // e.g., "builder.publish"
  module: string;           // e.g., "builder"
  label: string;            // Human-readable label
  description?: string;     // Optional description
  riskLevel: 'LOW' | 'MED' | 'HIGH';
  isDangerous: boolean;
  canBePolicyControlled?: boolean;  // ⚠️ Can be toggled via org policy
  blockedForCustomRoles?: boolean;  // Cannot be assigned to custom roles
}
```

### Modules

- **org**: Organization management
- **billing**: Billing and subscriptions (Owner only)
- **sites**: Site management
- **builder**: Page builder
- **content**: CMS content
- **hosting**: Hosting management (Owner + Org Admin only)
- **domains**: Domain management (Owner + Org Admin only)
- **marketing**: Marketing and social media
- **analytics**: Analytics and reporting

---

## Authorization Rules

### Owner
- Can perform all operations
- Has all capabilities by default
- Can manage roles, policies, and assignments

### Org Admin
- Can perform RBAC operations in SITE/technical scope
- Cannot access billing-related operations
- Can manage policies only if Owner enabled `org.policies.manage`

### Custom Roles
- Cannot contain blocked capabilities (billing.*, org.roles.manage, etc.)
- Can be ORG or SITE scope
- SITE roles require `siteId` in assignments

### Scope Rules
- **ORG scope**: Role applies to entire organization, `siteId` must be `null`
- **SITE scope**: Role applies to specific site, `siteId` is required

---

## Error Codes

- `400 Bad Request`: Invalid input, validation errors
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (duplicate, has dependencies)

---

## Examples

### Create Custom Role

```bash
curl -X POST https://api.example.com/orgs/org-123/rbac/roles \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Content Editor",
    "description": "Can edit and publish content",
    "scope": "SITE",
    "capabilityKeys": [
      "content.view",
      "content.create",
      "content.edit",
      "content.publish"
    ]
  }'
```

### Assign Role to User

```bash
curl -X POST https://api.example.com/orgs/org-123/rbac/assignments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "roleId": "role-789",
    "siteId": "site-012"
  }'
```

### Disable Capability via Policy

```bash
curl -X PUT https://api.example.com/orgs/org-123/rbac/policies/builder.rollback \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false
  }'
```

---

## Testing

Integration tests are available in `apps/api/src/modules/rbac/rbac.service.spec.ts`.

Run tests:
```bash
cd apps/api
npm test -- rbac.service.spec.ts
```





