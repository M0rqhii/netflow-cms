# RBAC Evaluator

## Purpose

The evaluator answers one question consistently across the system: can a user perform a capability in a given org/site context, considering role assignments and org policy toggles.

## Capability Registry

Capabilities are defined in a single source of truth: `packages/schemas/src/capabilities.ts`.
Each entry includes:
- `key`, `module`, `label`, `description`
- `isDangerous`
- `defaultPolicyEnabled` (used when no org policy exists)
- optional `canBePolicyControlled` (policy toggle)
- optional `blockedForCustomRoles`

## Evaluation Rules

`allowed = role_has_capability AND policy_enabled`

Policy resolution:
- If an org policy exists for the capability, use it.
- Otherwise, fall back to `defaultPolicyEnabled` from the registry.

Reasons:
- `allowed`
- `missing_role_capability`
- `blocked_by_policy`
- `unknown_capability`

## Service API

`RbacEvaluatorService.can({ userId, orgId, siteId?, capabilityKey })`
returns:
```
{
  allowed: boolean,
  reason: 'allowed' | 'missing_role_capability' | 'blocked_by_policy' | 'unknown_capability',
  policyEnabled: boolean,
  roleSources: string[]
}
```

`roleSources` contains role names that granted the capability (even if blocked by policy).

## Endpoint

`GET /orgs/:orgId/rbac/effective?siteId=`

Returns all capabilities from the registry with effective permission data for the current user.
Example response item:
```
{
  "key": "builder.publish",
  "allowed": true,
  "reason": "allowed",
  "policyEnabled": true,
  "roleSources": ["Site Admin"]
}
```
