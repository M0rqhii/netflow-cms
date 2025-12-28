# RBAC Admin UI

## Screen map

- `/org/[orgId]/settings/roles`
  - System roles tab: read-only presets with "view capabilities"
  - Custom roles tab: list + search + scope filter
  - Custom role editor: module-grouped capability checkboxes with policy-disabled tooltips
- `/org/[orgId]/settings/policies`
  - Capabilities grouped by module
  - Policy toggles for policy-controlled capabilities (⚠️)
  - Risk badges for dangerous capabilities
- `/org/[orgId]/settings/assignments`
  - User selector
  - Org role assignment (ORG scope)
  - Site role assignment (SITE scope + site select)
  - Assignment list with filters and remove action
- `/org/[orgId]/settings/effective?siteId=`
  - User selector + optional site filter
  - Effective capability table (allowed/blocked, reason, policy state, role sources)

## Notes

- Billing capabilities are hidden for non-Owner sessions.
- Policy-disabled capabilities are disabled in the custom role editor with tooltip copy.
- Dangerous capabilities show warnings in roles and policies.
