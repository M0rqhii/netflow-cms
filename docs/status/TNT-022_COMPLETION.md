# TNT-022: Token wymiany (site switch) i lista siteów - Completion Report

**Status:** ✅ Completed  
**Completed Date:** 2024-01-09  
**Story Points:** 5  
**Priority:** P0 (Critical)

---

## Summary

Zadanie TNT-022 zostało ukończone. Zaimplementowano endpointy do pobrania listy siteów użytkownika oraz do wystawienia krótkotrwałego tokenu site-scoped (bez ponownego wpisywania hasła). Zaktualizowano SiteGuard, aby preferował siteId z JWT.

---

## Deliverables

### 1. GET `/api/v1/auth/me/sites` - Lista członkostw i ról
**Plik:** `apps/api/src/modules/auth/auth.controller.ts`

**Implementacja:**
- ✅ Endpoint: `GET /api/v1/auth/me/sites` ✅
- ✅ Wymaga `AuthGuard` (global token) ✅
- ✅ Zwraca listę członkostw użytkownika:
  ```typescript
  [
    {
      siteId: string;
      role: string; // Role w site (admin, editor, viewer)
      site: {
        id: string;
        name: string;
        slug: string;
        plan: string;
      }
    }
  ]
  ```
- ✅ Rate limiting: 30/min ✅
- ✅ Używa `AuthService.getUserSites()` ✅

**Status:** ✅ Zgodne z wymaganiami

### 2. POST `/api/v1/auth/site-token` - Walidacja członkostwa → JWT z siteId
**Plik:** `apps/api/src/modules/auth/auth.controller.ts`

**Implementacja:**
- ✅ Endpoint: `POST /api/v1/auth/site-token` ✅
- ✅ Wymaga `AuthGuard` (global token) ✅
- ✅ Body: `{ siteId: string }` (UUID) ✅
- ✅ Walidacja członkostwa przez `UserSite` model ✅
- ✅ Generuje site-scoped JWT:
  ```typescript
  {
    access_token: string; // Site-scoped JWT (z siteId)
    expires_in: number; // 3600 (1 hour)
  }
  ```
- ✅ Token ma krótszy czas życia (1h vs 7d dla globalnego) ✅
- ✅ Rate limiting: 10/min ✅
- ✅ Fallback do legacy modelu (backward compatibility) ✅

**Status:** ✅ Zgodne z wymaganiami

### 3. Aktualizacja SiteGuard - preferuj siteId z JWT, fallback: header
**Plik:** `apps/api/src/common/site/site.guard.ts`

**Implementacja:**
- ✅ Preferuje `siteId` z JWT (jeśli użytkownik jest zalogowany) ✅
- ✅ Fallback: `X-Site-ID` header lub `siteId` query parameter ✅
- ✅ Walidacja UUID format ✅
- ✅ Ustawia `siteId` w request object ✅

**Przed aktualizacją:**
```typescript
// Tylko header
const siteId = req.headers['x-site-id'] || req.query.siteId;
```

**Po aktualizacji:**
```typescript
// Preferuje JWT, fallback: header
const user = req.user;
let siteId = user?.siteId; // Prefer JWT
if (!siteId) {
  siteId = req.headers['x-site-id'] || req.query.siteId; // Fallback
}
```

**Status:** ✅ Zgodne z wymaganiami

---

## Completed Tasks

### ✅ GET `/me/sites` – lista członkostw i ról
- Endpoint już istnieje w `auth.controller.ts`
- Zwraca listę członkostw użytkownika z rolami
- Używa `AuthService.getUserSites()` który obsługuje UserSite model
- Rate limiting: 30/min

### ✅ POST `/auth/site-token` { siteId } – walidacja członkostwa → JWT z siteId
- Endpoint już istnieje w `auth.controller.ts`
- Waliduje członkostwo przez `UserSite` model
- Generuje site-scoped JWT z `siteId`
- Token ma krótszy czas życia (1h)
- Rate limiting: 10/min

### ✅ Aktualizacja `SiteGuard` – preferuj `siteId` z JWT, fallback: header
- SiteGuard zaktualizowany
- Preferuje `siteId` z JWT (jeśli użytkownik jest zalogowany)
- Fallback: `X-Site-ID` header lub query parameter
- Walidacja UUID format zachowana

---

## Acceptance Criteria

### ✅ Hub może pobrać listę stron i bezpiecznie wejść do CMS konkretnej strony
- ✅ Hub może pobrać listę siteów przez `GET /api/v1/auth/me/sites`
- ✅ Hub może wymienić global token na site-scoped token przez `POST /api/v1/auth/site-token`
- ✅ Site-scoped token umożliwia bezpieczne wejście do CMS konkretnej strony
- ✅ SiteGuard preferuje siteId z JWT, więc nie trzeba wysyłać header dla site-scoped tokenów

**Status:** ✅ Zgodne z wymaganiami

---

## Technical Implementation

### Endpointy API

#### GET /api/v1/auth/me/sites
```typescript
@UseGuards(AuthGuard)
@Throttle({ default: { limit: 30, ttl: 60000 } })
@Get('me/sites')
async getMySites(@CurrentUser() user: CurrentUserPayload) {
  return this.authService.getUserSites(user.id);
}
```

**Response:**
```typescript
[
  {
    siteId: string;
    role: string;
    site: {
      id: string;
      name: string;
      slug: string;
      plan: string;
    }
  }
]
```

#### POST /api/v1/auth/site-token
```typescript
@UseGuards(AuthGuard)
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Post('site-token')
async issueSiteToken(
  @CurrentUser() user: CurrentUserPayload,
  @Body(new ZodValidationPipe(z.object({ siteId: z.string().uuid() })))
  body: { siteId: string }
) {
  return this.authService.issueSiteToken(user.id, body.siteId);
}
```

**Request:**
```typescript
{
  siteId: string; // UUID
}
```

**Response:**
```typescript
{
  access_token: string; // Site-scoped JWT (z siteId)
  expires_in: number; // 3600 (1 hour)
}
```

### SiteGuard Strategy

```typescript
@Injectable()
export class SiteGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    
    // Prefer siteId from JWT (if user is authenticated)
    const user = req.user;
    let siteId = user?.siteId; // Prefer JWT
    
    // Fallback: X-Site-ID header or query parameter
    if (!siteId) {
      siteId = req.headers['x-site-id'] || req.query.siteId;
    }
    
    // Validate and set siteId
    if (!siteId || typeof siteId !== 'string') {
      throw new BadRequestException('Missing site ID...');
    }
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(siteId)) {
      throw new BadRequestException('Invalid site ID (must be UUID)');
    }
    
    req.siteId = siteId;
    return true;
  }
}
```

---

## Files Created/Modified

### Modified
- `apps/api/src/common/site/site.guard.ts` - Zaktualizowano, aby preferował siteId z JWT
- `docs/plan.md` - Zaktualizowano status TNT-022 na Done

### Already Exists (from TNT-020/TNT-021)
- `apps/api/src/modules/auth/auth.controller.ts` - Endpointy już istnieją
- `apps/api/src/modules/auth/auth.service.ts` - Metody już istnieją

---

## Dependencies Status

- ✅ **TNT-021 (User↔Site Model):** Done - Wymagane dla członkostwa
- ✅ **TNT-020 (Architektura i UX):** Done - Wymagane dla przepływów

---

## Next Steps

1. **TNT-023:** Implementacja frontend Hub i przełączania siteów (już częściowo zrobione)
2. **TNT-024:** Rozszerzenie RBAC o role platformowe (guards dla platform_admin)

---

## Notes

- Endpointy były już częściowo zaimplementowane w TNT-020
- SiteGuard został zaktualizowany, aby preferował siteId z JWT
- Wszystkie metody mają backward compatibility z legacy modelem
- Rate limiting jest skonfigurowany dla obu endpointów

---

**Completed by:** Backend Codex  
**Review Status:** Ready for Review  
**Next Review:** After TNT-023 implementation

