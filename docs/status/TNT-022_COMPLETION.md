# TNT-022: Token wymiany (tenant switch) i lista tenantów - Completion Report

**Status:** ✅ Completed  
**Completed Date:** 2024-01-09  
**Story Points:** 5  
**Priority:** P0 (Critical)

---

## Summary

Zadanie TNT-022 zostało ukończone. Zaimplementowano endpointy do pobrania listy tenantów użytkownika oraz do wystawienia krótkotrwałego tokenu tenant-scoped (bez ponownego wpisywania hasła). Zaktualizowano TenantGuard, aby preferował tenantId z JWT.

---

## Deliverables

### 1. GET `/api/v1/auth/me/tenants` - Lista członkostw i ról
**Plik:** `apps/api/src/modules/auth/auth.controller.ts`

**Implementacja:**
- ✅ Endpoint: `GET /api/v1/auth/me/tenants` ✅
- ✅ Wymaga `AuthGuard` (global token) ✅
- ✅ Zwraca listę członkostw użytkownika:
  ```typescript
  [
    {
      tenantId: string;
      role: string; // Role w tenant (admin, editor, viewer)
      tenant: {
        id: string;
        name: string;
        slug: string;
        plan: string;
      }
    }
  ]
  ```
- ✅ Rate limiting: 30/min ✅
- ✅ Używa `AuthService.getUserTenants()` ✅

**Status:** ✅ Zgodne z wymaganiami

### 2. POST `/api/v1/auth/tenant-token` - Walidacja członkostwa → JWT z tenantId
**Plik:** `apps/api/src/modules/auth/auth.controller.ts`

**Implementacja:**
- ✅ Endpoint: `POST /api/v1/auth/tenant-token` ✅
- ✅ Wymaga `AuthGuard` (global token) ✅
- ✅ Body: `{ tenantId: string }` (UUID) ✅
- ✅ Walidacja członkostwa przez `UserTenant` model ✅
- ✅ Generuje tenant-scoped JWT:
  ```typescript
  {
    access_token: string; // Tenant-scoped JWT (z tenantId)
    expires_in: number; // 3600 (1 hour)
  }
  ```
- ✅ Token ma krótszy czas życia (1h vs 7d dla globalnego) ✅
- ✅ Rate limiting: 10/min ✅
- ✅ Fallback do legacy modelu (backward compatibility) ✅

**Status:** ✅ Zgodne z wymaganiami

### 3. Aktualizacja TenantGuard - preferuj tenantId z JWT, fallback: header
**Plik:** `apps/api/src/common/tenant/tenant.guard.ts`

**Implementacja:**
- ✅ Preferuje `tenantId` z JWT (jeśli użytkownik jest zalogowany) ✅
- ✅ Fallback: `X-Tenant-ID` header lub `tenantId` query parameter ✅
- ✅ Walidacja UUID format ✅
- ✅ Ustawia `tenantId` w request object ✅

**Przed aktualizacją:**
```typescript
// Tylko header
const tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
```

**Po aktualizacji:**
```typescript
// Preferuje JWT, fallback: header
const user = req.user;
let tenantId = user?.tenantId; // Prefer JWT
if (!tenantId) {
  tenantId = req.headers['x-tenant-id'] || req.query.tenantId; // Fallback
}
```

**Status:** ✅ Zgodne z wymaganiami

---

## Completed Tasks

### ✅ GET `/me/tenants` – lista członkostw i ról
- Endpoint już istnieje w `auth.controller.ts`
- Zwraca listę członkostw użytkownika z rolami
- Używa `AuthService.getUserTenants()` który obsługuje UserTenant model
- Rate limiting: 30/min

### ✅ POST `/auth/tenant-token` { tenantId } – walidacja członkostwa → JWT z tenantId
- Endpoint już istnieje w `auth.controller.ts`
- Waliduje członkostwo przez `UserTenant` model
- Generuje tenant-scoped JWT z `tenantId`
- Token ma krótszy czas życia (1h)
- Rate limiting: 10/min

### ✅ Aktualizacja `TenantGuard` – preferuj `tenantId` z JWT, fallback: header
- TenantGuard zaktualizowany
- Preferuje `tenantId` z JWT (jeśli użytkownik jest zalogowany)
- Fallback: `X-Tenant-ID` header lub query parameter
- Walidacja UUID format zachowana

---

## Acceptance Criteria

### ✅ Hub może pobrać listę stron i bezpiecznie wejść do CMS konkretnej strony
- ✅ Hub może pobrać listę tenantów przez `GET /api/v1/auth/me/tenants`
- ✅ Hub może wymienić global token na tenant-scoped token przez `POST /api/v1/auth/tenant-token`
- ✅ Tenant-scoped token umożliwia bezpieczne wejście do CMS konkretnej strony
- ✅ TenantGuard preferuje tenantId z JWT, więc nie trzeba wysyłać header dla tenant-scoped tokenów

**Status:** ✅ Zgodne z wymaganiami

---

## Technical Implementation

### Endpointy API

#### GET /api/v1/auth/me/tenants
```typescript
@UseGuards(AuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Get('me/tenants')
async getMyTenants(@CurrentUser() user: CurrentUserPayload) {
  return this.authService.getUserTenants(user.id);
}
```

**Response:**
```typescript
[
  {
    tenantId: string;
    role: string;
    tenant: {
      id: string;
      name: string;
      slug: string;
      plan: string;
    }
  }
]
```

#### POST /api/v1/auth/tenant-token
```typescript
@UseGuards(AuthGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Post('tenant-token')
async issueTenantToken(
  @CurrentUser() user: CurrentUserPayload,
  @Body(new ZodValidationPipe(z.object({ tenantId: z.string().uuid() })))
  body: { tenantId: string }
) {
  return this.authService.issueTenantToken(user.id, body.tenantId);
}
```

**Request:**
```typescript
{
  tenantId: string; // UUID
}
```

**Response:**
```typescript
{
  access_token: string; // Tenant-scoped JWT (z tenantId)
  expires_in: number; // 3600 (1 hour)
}
```

### TenantGuard Strategy

```typescript
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    
    // Prefer tenantId from JWT (if user is authenticated)
    const user = req.user;
    let tenantId = user?.tenantId; // Prefer JWT
    
    // Fallback: X-Tenant-ID header or query parameter
    if (!tenantId) {
      tenantId = req.headers['x-tenant-id'] || req.query.tenantId;
    }
    
    // Validate and set tenantId
    if (!tenantId || typeof tenantId !== 'string') {
      throw new BadRequestException('Missing tenant ID...');
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new BadRequestException('Invalid tenant ID (must be UUID)');
    }
    
    req.tenantId = tenantId;
    return true;
  }
}
```

---

## Files Created/Modified

### Modified
- `apps/api/src/common/tenant/tenant.guard.ts` - Zaktualizowano, aby preferował tenantId z JWT
- `docs/plan.md` - Zaktualizowano status TNT-022 na Done

### Already Exists (from TNT-020/TNT-021)
- `apps/api/src/modules/auth/auth.controller.ts` - Endpointy już istnieją
- `apps/api/src/modules/auth/auth.service.ts` - Metody już istnieją

---

## Dependencies Status

- ✅ **TNT-021 (User↔Tenant Model):** Done - Wymagane dla członkostwa
- ✅ **TNT-020 (Architektura i UX):** Done - Wymagane dla przepływów

---

## Next Steps

1. **TNT-023:** Implementacja frontend Hub i przełączania tenantów (już częściowo zrobione)
2. **TNT-024:** Rozszerzenie RBAC o role platformowe (guards dla platform_admin)

---

## Notes

- Endpointy były już częściowo zaimplementowane w TNT-020
- TenantGuard został zaktualizowany, aby preferował tenantId z JWT
- Wszystkie metody mają backward compatibility z legacy modelem
- Rate limiting jest skonfigurowany dla obu endpointów

---

**Completed by:** Backend Codex  
**Review Status:** Ready for Review  
**Next Review:** After TNT-023 implementation

