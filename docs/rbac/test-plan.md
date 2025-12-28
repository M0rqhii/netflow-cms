# RBAC Integration Test Plan

## Overview

This document outlines the integration test plan for the RBAC (Role-Based Access Control) system, including custom roles, policies, assignments, and permission evaluation.

## Test Scope

### Test Categories

1. **Custom Role Management**
   - Create custom roles with capabilities
   - Update custom roles
   - Delete custom roles
   - System role protection

2. **Role Assignments**
   - Assign roles to users (ORG scope)
   - Assign roles to users (SITE scope)
   - Assignment validation (scope rules)
   - Remove assignments

3. **Policies**
   - Enable/disable capabilities via policies
   - Policy impact on permissions
   - Policy-controlled capabilities

4. **Permission Evaluation**
   - `canUserPerform()` method
   - Effective capabilities endpoint
   - Permission reasons (allowed, blocked_by_policy, missing_role_capability)

5. **Endpoint Authorization**
   - Marketing ads publish endpoint
   - Domains/Hosting endpoints
   - System role protection

## Test Scenarios

### TC-1: Custom Role Creation and Assignment (SITE scope)

**Objective:** Verify that a custom SITE role with capabilities can be created and assigned to a user, and the user can perform actions based on those capabilities.

**Steps:**
1. Create a custom role "SITE Editor" with scope SITE and capability `builder.edit`
2. Assign the role to a user with a specific siteId
3. Verify `canUserPerform()` returns `true` for `builder.edit` on that site
4. Verify the user can access builder endpoints

**Expected Results:**
- Role created successfully
- Assignment created with siteId
- `canUserPerform(orgId, userId, 'builder.edit', siteId)` returns `true`
- User can access builder.edit endpoints

---

### TC-2: Policy Blocks Capability

**Objective:** Verify that when a policy disables `marketing.ads.manage`, a user with a role containing that capability gets 403 on ads publish endpoint.

**Steps:**
1. Create a custom role with `marketing.ads.manage` capability
2. Assign the role to a user
3. Create a policy disabling `marketing.ads.manage`
4. Attempt to publish to ads channel via `/marketing/publish` endpoint
5. Verify 403 response

**Expected Results:**
- Policy created successfully
- `canUserPerform()` returns `false` for `marketing.ads.manage`
- POST `/marketing/publish` with `channels: ['ads']` returns 403
- Error message indicates policy blocking

---

### TC-3: System Role Protection

**Objective:** Verify that system roles cannot be edited or deleted.

**Steps:**
1. Get a system role (e.g., "Org Owner", "Org Admin")
2. Attempt to PATCH `/orgs/:orgId/rbac/roles/:roleId` with updates
3. Attempt to DELETE `/orgs/:orgId/rbac/roles/:roleId`
4. Verify 403 responses

**Expected Results:**
- PATCH returns 403 Forbidden
- DELETE returns 403 Forbidden
- Error messages indicate system role protection

---

### TC-4: Blocked Capabilities in Custom Roles

**Objective:** Verify that `billing.*` capabilities cannot be added to custom roles.

**Steps:**
1. Attempt to create a custom role with `billing.view_plan` capability
2. Attempt to update a custom role to include `billing.change_plan`
3. Verify 400 responses

**Expected Results:**
- POST `/orgs/:orgId/rbac/roles` with `billing.*` returns 400
- PATCH `/orgs/:orgId/rbac/roles/:roleId` with `billing.*` returns 400
- Error messages indicate blocked capabilities

---

### TC-5: Assignment Scope Validation

**Objective:** Verify that SITE assignments require siteId and ORG assignments cannot have siteId.

**Steps:**
1. Create a SITE scope role
2. Attempt to assign it without siteId
3. Verify 400 response
4. Create an ORG scope role
5. Attempt to assign it with siteId
6. Verify 400 response

**Expected Results:**
- SITE assignment without siteId → 400 Bad Request
- ORG assignment with siteId → 400 Bad Request
- Error messages indicate scope validation failure

---

### TC-6: Effective Capabilities Endpoint

**Objective:** Verify that the effective capabilities endpoint returns consistent reasons.

**Steps:**
1. Create a custom role with multiple capabilities
2. Assign role to user
3. Create policies disabling some capabilities
4. Call GET `/orgs/:orgId/rbac/effective?siteId=...`
5. Verify response structure and reasons

**Expected Results:**
- Response contains all capabilities from registry
- Each capability has:
  - `allowed`: boolean
  - `reason`: 'allowed' | 'blocked_by_policy' | 'missing_role_capability' | 'unknown_capability'
  - `policyEnabled`: boolean
  - `roleSources`: string[]
- Reasons are consistent with actual permissions

---

### TC-7: Domains/Hosting Endpoints Authorization

**Objective:** Verify that domains and hosting endpoints enforce proper authorization (Member → 403, Admin/Owner → 200).

**Steps:**
1. Create a user with Member role (no domains/hosting capabilities)
2. Create a user with Admin role (has domains/hosting capabilities)
3. Attempt to access domains endpoints with Member
4. Attempt to access domains endpoints with Admin
5. Attempt to access hosting endpoints with Member
6. Attempt to access hosting endpoints with Admin

**Expected Results:**
- Member user → 403 Forbidden on domains/hosting endpoints
- Admin/Owner user → 200 OK on domains/hosting endpoints

---

## Test Data Fixtures

### Roles
- System roles: "Org Owner", "Org Admin", "Site Admin", "Member"
- Custom roles: "SITE Editor", "Marketing Manager", "Content Editor"

### Capabilities
- `builder.edit` - for builder access
- `marketing.ads.manage` - for ads management (policy-controlled)
- `domains.view`, `domains.assign` - for domains access
- `hosting.view`, `hosting.deploy` - for hosting access
- `billing.view_plan` - blocked capability

### Policies
- `marketing.ads.manage` disabled
- `marketing.schedule` enabled
- `builder.rollback` disabled

---

## Test Execution

### Prerequisites
- Test database with migrations applied
- Capabilities synced to database
- System roles created

### Test Environment
- Isolated test database
- Test fixtures for tenants, users, roles
- Cleanup after each test suite

### Test Structure
```
test/
├── rbac-integration.e2e-spec.ts    # Main integration test suite
└── helpers/
    └── rbac-fixtures.ts              # RBAC-specific test fixtures
```

---

## Success Criteria

All test scenarios must pass with:
- ✅ Correct HTTP status codes
- ✅ Proper error messages
- ✅ Consistent permission evaluation
- ✅ Policy enforcement
- ✅ Scope validation
- ✅ System role protection

---

## Notes

- Tests should not modify feature implementation
- Only test files and fixtures should be created/modified
- Use existing test helpers where possible
- Ensure proper cleanup after tests

