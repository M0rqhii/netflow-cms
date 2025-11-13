# TNT-021: Model uprawnień i członkostwa (User↔Tenant) - Completion Report

**Status:** ✅ Completed  
**Completed Date:** 2024-01-09  
**Story Points:** 8  
**Priority:** P0 (Critical)

---

## Summary

Zadanie TNT-021 zostało ukończone. Zaimplementowano model członkostwa User↔Tenant, który umożliwia jednemu użytkownikowi dostęp do wielu tenantów z różnymi rolami per-tenant oraz rolami platformowymi.

---

## Deliverables

### 1. Model UserTenant
**Status:** ✅ Już istnieje w schema.prisma i migracji

Model UserTenant został już utworzony w poprzednich zadaniach:
- Tabela `user_tenants` z polami: `id`, `userId`, `tenantId`, `role`
- Unique constraint na `[userId, tenantId]`
- Foreign keys do `users` i `tenants`
- Migracja backfill: `20251109000100_user_tenants/migration.sql`

### 2. Role Platformowe
**Plik:** `apps/api/src/common/auth/roles.enum.ts`

Dodano enum `PlatformRole`:
- `PLATFORM_ADMIN` - Pełny dostęp do platformy (tworzenie tenantów, zarządzanie wszystkimi użytkownikami)
- `ORG_OWNER` - Właściciel organizacji (może zarządzać swoimi tenantami)
- `USER` - Zwykły użytkownik (brak uprawnień platformowych)

### 3. Refaktoryzacja AuthService
**Plik:** `apps/api/src/modules/auth/auth.service.ts`

Usunięto workaroundy (`prismaAny`) i zaimplementowano pełną obsługę UserTenant:
- `getUserTenants()` - używa bezpośrednio `prisma.userTenant.findMany()`
- `issueTenantToken()` - weryfikuje członkostwo przez `prisma.userTenant.findUnique()`
- `resolveTenantForUser()` - sprawdza członkostwo przez UserTenant
- `validateUser()` - global login przez UserTenant memberships
- `login()` - obsługa multi-tenant memberships

Wszystkie metody mają fallback do legacy modelu (backward compatibility).

### 4. UserTenants Service
**Plik:** `apps/api/src/modules/user-tenants/user-tenants.service.ts`

Utworzono service do zarządzania członkostwami:
- `createMembership()` - tworzenie nowego członkostwa
- `getUserMemberships()` - lista członkostw użytkownika
- `getTenantMemberships()` - lista członków tenanta
- `getMembership()` - pobranie konkretnego członkostwa
- `updateMembership()` - aktualizacja roli w członkostwie
- `removeMembership()` - usunięcie członkostwa
- `isMember()` - sprawdzenie członkostwa
- `getUserRoleInTenant()` - pobranie roli użytkownika w tenant

### 5. UserTenants Module
**Plik:** `apps/api/src/modules/user-tenants/user-tenants.module.ts`

Utworzono moduł NestJS dla UserTenants:
- Eksportuje `UserTenantsService`
- Dodany do `AppModule`

### 6. Aktualizacja JWT Strategy
**Plik:** `apps/api/src/common/auth/strategies/jwt.strategy.ts`

Zaktualizowano `JwtPayload` interface:
- Dodano `platformRole?: string` - rola platformowa
- `role` - rola w tenant (admin, editor, viewer)

Zaktualizowano `CurrentUserPayload`:
- Dodano `platformRole?: string`

### 7. Migracja Backfill
**Status:** ✅ Już istnieje w migracji

Migracja `20251109000100_user_tenants/migration.sql` zawiera:
- Utworzenie tabeli `user_tenants`
- Backfill: `INSERT INTO user_tenants (user_id, tenant_id, role) SELECT id, "tenantId", role FROM users`

---

## Completed Tasks

### ✅ Nowy model `UserTenant` (userId, tenantId, role, unique [userId, tenantId])
- Model już istnieje w schema.prisma
- Migracja już wykonana
- Unique constraint na `[userId, tenantId]`
- Foreign keys do `users` i `tenants`

### ✅ Role platformowe: `platform_admin`, `org_owner` (rozszerzenie `Role` lub osobna tabela)
- Dodano enum `PlatformRole` w `roles.enum.ts`
- Role: `PLATFORM_ADMIN`, `ORG_OWNER`, `USER`
- Zintegrowane z JWT payload i CurrentUserPayload

### ✅ Migracja: przeniesienie `User.tenantId` do `UserTenant` (backfill), utrzymanie kompatybilności
- Migracja backfill już istnieje
- Wszystkie metody mają fallback do legacy modelu
- Backward compatibility zachowana

---

## Acceptance Criteria

### ✅ Użytkownik może mieć wiele ról w wielu tenantach
- `getUserTenants()` zwraca wszystkie członkostwa użytkownika
- Każde członkostwo ma własną rolę (admin, editor, viewer)
- UserTenantsService umożliwia zarządzanie wieloma członkostwami

### ✅ Stary login nadal działa w trakcie migracji
- Wszystkie metody mają try-catch z fallback do legacy modelu
- `validateUser()` sprawdza najpierw UserTenant, potem legacy User.tenantId
- `getUserTenants()` fallback do legacy jeśli UserTenant nie istnieje
- `issueTenantToken()` fallback do legacy jeśli UserTenant nie istnieje

---

## Technical Implementation

### UserTenant Model
```prisma
model UserTenant {
  id       String @id @default(uuid())
  userId   String
  tenantId String
  role     String @default("viewer")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([userId, tenantId])
  @@index([tenantId])
  @@index([userId])
}
```

### Platform Roles
```typescript
export enum PlatformRole {
  PLATFORM_ADMIN = 'platform_admin',
  ORG_OWNER = 'org_owner',
  USER = 'user',
}
```

### JWT Payload
```typescript
export interface JwtPayload {
  sub: string; // user id
  email: string;
  tenantId?: string; // optional for global token
  role: string; // tenant role
  platformRole?: string; // platform role
}
```

---

## Files Created/Modified

### Created
- `apps/api/src/modules/user-tenants/user-tenants.service.ts` - Service do zarządzania członkostwami
- `apps/api/src/modules/user-tenants/user-tenants.module.ts` - Module dla UserTenants
- `docs/status/TNT-021_COMPLETION.md` - Ten raport

### Modified
- `apps/api/src/common/auth/roles.enum.ts` - Dodano PlatformRole enum
- `apps/api/src/modules/auth/auth.service.ts` - Refaktoryzacja, pełna obsługa UserTenant
- `apps/api/src/common/auth/strategies/jwt.strategy.ts` - Dodano platformRole do JwtPayload
- `apps/api/src/common/auth/decorators/current-user.decorator.ts` - Dodano platformRole do CurrentUserPayload
- `apps/api/src/app.module.ts` - Dodano UserTenantsModule
- `docs/plan.md` - Zaktualizowano status TNT-021 na Done

---

## Dependencies Status

- ✅ **TNT-002 (Database Schema):** Done - Model UserTenant już istnieje
- ✅ **TNT-004 (RBAC):** Done - Wymagane dla ról per-tenant

---

## Next Steps

1. **TNT-022:** Implementacja endpointów tenant token exchange (już częściowo zrobione)
2. **TNT-023:** Implementacja frontend Hub i przełączania tenantów
3. **TNT-024:** Rozszerzenie RBAC o role platformowe (guards dla platform_admin)

---

## Notes

- Wszystkie metody mają backward compatibility z legacy modelem (User.tenantId)
- UserTenant table może nie istnieć w niektórych środowiskach - kod obsługuje to gracefully
- Platform roles są zdefiniowane, ale jeszcze nie używane w guards (TNT-024)
- Migracja backfill już została wykonana w poprzednich zadaniach

---

**Completed by:** Architecture Agent + Backend Codex  
**Review Status:** Ready for Review  
**Next Review:** After TNT-022 and TNT-024 implementation

