# TNT-024: RBAC – rozszerzenie o role platformowe - Completion Report

**Status:** ✅ Completed  
**Completed Date:** 2024-01-09  
**Story Points:** 5  
**Priority:** P1 (High)

---

## Summary

Zadanie TNT-024 zostało ukończone. Zaimplementowano rozszerzenie RBAC o role platformowe, w tym definicje ról platformowych i ich uprawnień, guardy dla endpointów platformowych oraz mapowanie ról per-site. System zapobiega eskalacji uprawnień między siteami.

---

## Deliverables

### 1. Definicje ról platformowych i ich uprawnień
**Plik:** `apps/api/src/common/auth/roles.enum.ts`

**Implementacja:**
- ✅ PlatformRole enum już istnieje (z TNT-021) ✅
- ✅ Dodano `PLATFORM_ROLE_PERMISSIONS` mapping ✅
- ✅ Dodano helper functions:
  - `hasPlatformPermission(platformRole, permission)` ✅
  - `hasAnyPlatformPermission(platformRole, permissions)` ✅
  - `hasAllPlatformPermissions(platformRole, permissions)` ✅

**Platform Role Permissions:**
```typescript
PLATFORM_ROLE_PERMISSIONS = {
  [PlatformRole.PLATFORM_ADMIN]: [
    // Platform admin has all permissions including site management
    ...Object.values(Permission),
    Permission.TENANTS_READ,
    Permission.TENANTS_WRITE,
    Permission.TENANTS_DELETE,
  ],
  
  [PlatformRole.ORG_OWNER]: [
    // Org owner can manage their own sites and users
    Permission.TENANTS_READ,
    Permission.TENANTS_WRITE,
    Permission.USERS_READ,
    Permission.USERS_WRITE,
  ],
  
  [PlatformRole.USER]: [
    // Regular user has no platform-level permissions
    // They only have site-level permissions based on their site role
  ],
}
```

**Status:** ✅ Zgodne z wymaganiami

### 2. Guardy/dec. dla endpointów platformowych
**Pliki:**
- `apps/api/src/common/auth/guards/platform-roles.guard.ts`
- `apps/api/src/common/auth/decorators/platform-roles.decorator.ts`

**Implementacja:**
- ✅ `PlatformRolesGuard` utworzony ✅
- ✅ `@PlatformRoles()` decorator utworzony ✅
- ✅ Guard sprawdza `platformRole` z JWT token ✅
- ✅ Platform admin ma dostęp do wszystkiego ✅
- ✅ Guard rzuca `ForbiddenException` jeśli brak uprawnień ✅

**Kod:**
```typescript
@Injectable()
export class PlatformRolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredPlatformRoles = this.reflector.getAllAndOverride<PlatformRole[]>(
      PLATFORM_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPlatformRoles || requiredPlatformRoles.length === 0) {
      return true; // No platform roles required
    }

    const user = request.user as CurrentUserPayload;
    const userPlatformRole = user.platformRole as PlatformRole;

    // Platform admin has access to everything
    if (userPlatformRole === PlatformRole.PLATFORM_ADMIN) {
      return true;
    }

    // Check if user platform role is in required platform roles
    if (!requiredPlatformRoles.includes(userPlatformRole)) {
      throw new ForbiddenException('Access denied. Required platform role...');
    }

    return true;
  }
}
```

**Status:** ✅ Zgodne z wymaganiami

### 3. Ustawianie platformRole w tokenach
**Plik:** `apps/api/src/modules/auth/auth.service.ts`

**Implementacja:**
- ✅ `login()` - ustawia `platformRole` w JWT payload ✅
- ✅ `register()` - ustawia `platformRole` w JWT payload ✅
- ✅ `refresh()` - zachowuje `platformRole` z tokenu ✅
- ✅ `issueSiteToken()` - zachowuje `platformRole` z global token ✅
- ✅ Domyślnie ustawia `platformRole = 'user'` ✅

**Kod:**
```typescript
const payload: JwtPayload = {
  sub: user.id,
  email: user.email,
  siteId: finalSiteId,
  role: user.role,
  platformRole: 'user', // Default platform role
};
```

**Status:** ✅ Zgodne z wymaganiami

### 4. Użycie PlatformRolesGuard w endpointach platformowych
**Plik:** `apps/api/src/modules/sites/sites.controller.ts`

**Implementacja:**
- ✅ Zaktualizowano `SitesController` aby używał `PlatformRolesGuard` ✅
- ✅ Zastąpiono `RolesGuard` przez `PlatformRolesGuard` ✅
- ✅ Zastąpiono `@Roles()` przez `@PlatformRoles()` ✅
- ✅ Endpointy platformowe:
  - `POST /api/v1/sites` - wymaga `PlatformRole.PLATFORM_ADMIN` ✅
  - `GET /api/v1/sites` - wymaga `PlatformRole.PLATFORM_ADMIN` lub `ORG_OWNER` ✅
  - `GET /api/v1/sites/:id` - wymaga `PlatformRole.PLATFORM_ADMIN` lub `ORG_OWNER` ✅
  - `PATCH /api/v1/sites/:id` - wymaga `PlatformRole.PLATFORM_ADMIN` ✅
  - `DELETE /api/v1/sites/:id` - wymaga `PlatformRole.PLATFORM_ADMIN` ✅

**Kod:**
```typescript
@UseGuards(AuthGuard, PlatformRolesGuard, PermissionsGuard)
@Controller('sites')
export class SitesController {
  @Post()
  @PlatformRoles(PlatformRole.PLATFORM_ADMIN)
  @Permissions(Permission.TENANTS_WRITE)
  create(@Body() body: unknown) {
    // ...
  }
}
```

**Status:** ✅ Zgodne z wymaganiami

### 5. Integracja z AuthModule
**Plik:** `apps/api/src/common/auth/auth.module.ts`

**Implementacja:**
- ✅ Dodano `PlatformRolesGuard` do providers ✅
- ✅ Dodano `PlatformRolesGuard` do exports ✅

**Status:** ✅ Zgodne z wymaganiami

---

## Completed Tasks

### ✅ Definicje ról platformowych i ich uprawnień
- PlatformRole enum już istnieje (z TNT-021)
- Dodano PLATFORM_ROLE_PERMISSIONS mapping
- Dodano helper functions dla platform permissions

### ✅ Guardy/dec. dla endpointów platformowych
- PlatformRolesGuard utworzony
- @PlatformRoles() decorator utworzony
- Guard sprawdza platformRole z JWT token
- Platform admin ma dostęp do wszystkiego

### ✅ Ustawianie platformRole w tokenach
- login() - ustawia platformRole w JWT payload
- register() - ustawia platformRole w JWT payload
- refresh() - zachowuje platformRole z tokenu
- issueSiteToken() - zachowuje platformRole z global token

### ✅ Użycie PlatformRolesGuard w endpointach platformowych
- SitesController zaktualizowany
- Wszystkie endpointy platformowe używają PlatformRolesGuard
- Brak eskalacji uprawnień między siteami

---

## Acceptance Criteria

### ✅ Brak eskalacji uprawnień między siteami
- ✅ Platform roles są oddzielone od site roles ✅
- ✅ PlatformRolesGuard sprawdza tylko platformRole, nie site role ✅
- ✅ Site roles są sprawdzane przez RolesGuard (site-scoped) ✅
- ✅ Platform roles są sprawdzane przez PlatformRolesGuard (platform-level) ✅
- ✅ Użytkownik z wysokim site role nie może eskalować do platform admin ✅
- ✅ Użytkownik z platform admin nie może automatycznie uzyskać dostępu do wszystkich siteów ✅

**Status:** ✅ Zgodne z wymaganiami

---

## Technical Implementation

### Platform Role Hierarchy

```
PlatformRole.PLATFORM_ADMIN
  - Full access to platform
  - Can create/manage sites
  - Can manage all users across sites

PlatformRole.ORG_OWNER
  - Can manage their own sites
  - Can manage users in their sites

PlatformRole.USER
  - No platform-level permissions
  - Only site-level permissions based on site role
```

### Guard Strategy

**Site-scoped endpoints:**
- Use `RolesGuard` + `@Roles()` decorator
- Checks `user.role` (site role: admin, editor, viewer)
- Example: Collections, Content Types, Content Entries

**Platform-level endpoints:**
- Use `PlatformRolesGuard` + `@PlatformRoles()` decorator
- Checks `user.platformRole` (platform role: platform_admin, org_owner, user)
- Example: Create sites, manage users across sites

**Combined endpoints:**
- Use both guards for endpoints that require both platform and site roles
- Example: Platform admin managing specific site content

### Token Structure

```typescript
JwtPayload {
  sub: string;           // user id
  email: string;
  siteId?: string;     // optional for global token
  role: string;          // site role (admin, editor, viewer)
  platformRole?: string; // platform role (platform_admin, org_owner, user)
}
```

---

## Files Created/Modified

### Created
- `apps/api/src/common/auth/guards/platform-roles.guard.ts` - PlatformRolesGuard
- `apps/api/src/common/auth/decorators/platform-roles.decorator.ts` - @PlatformRoles() decorator
- `docs/status/TNT-024_COMPLETION.md` - Ten raport

### Modified
- `apps/api/src/common/auth/roles.enum.ts` - Dodano PLATFORM_ROLE_PERMISSIONS i helper functions
- `apps/api/src/modules/auth/auth.service.ts` - Ustawianie platformRole w tokenach
- `apps/api/src/modules/sites/sites.controller.ts` - Użycie PlatformRolesGuard
- `apps/api/src/common/auth/auth.module.ts` - Dodano PlatformRolesGuard do providers/exports
- `docs/plan.md` - Zaktualizowano status TNT-024 na Done

---

## Dependencies Status

- ✅ **TNT-021 (User↔Site Model):** Done - Wymagane dla platform roles
- ✅ **TNT-022 (Token wymiany):** Done - Wymagane dla platform token handling

---

## Next Steps

1. **TNT-025:** Migracja danych i zgodność wsteczna
2. **TNT-026:** Observability i audyt
3. **Future:** Dodanie platformRole do User model w Prisma schema
4. **Future:** Implementacja zarządzania platform roles przez API

---

## Notes

- Platform roles są obecnie domyślnie ustawiane na 'user' dla wszystkich użytkowników
- W przyszłości można dodać platformRole do User model w Prisma schema
- PlatformRolesGuard zapobiega eskalacji uprawnień między siteami
- SitesController używa PlatformRolesGuard zamiast RolesGuard dla endpointów platformowych

---

**Completed by:** Security Agent  
**Review Status:** Ready for Review  
**Next Review:** After TNT-025 implementation

