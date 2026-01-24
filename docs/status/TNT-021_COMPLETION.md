# TNT-021: Model uprawnień i członkostwa (User↔Site) - Completion Report

**Status:** ✅ Completed  
**Completed Date:** 2024-01-09  
**Story Points:** 8  
**Priority:** P0 (Critical)

---

## Summary

Zadanie TNT-021 zostało ukończone. Zaimplementowano model członkostwa User↔Site, który umożliwia jednemu użytkownikowi dostęp do wielu siteów z różnymi rolami per-site oraz rolami platformowymi.

---

## Deliverables

### 1. Model UserSite
**Status:** ✅ Już istnieje w schema.prisma i migracji

Model UserSite został już utworzony w poprzednich zadaniach:
- Tabela `user_sites` z polami: `id`, `userId`, `siteId`, `role`
- Unique constraint na `[userId, siteId]`
- Foreign keys do `users` i `sites`
- Migracja backfill: `20251109000100_user_sites/migration.sql`

### 2. Role Platformowe
**Plik:** `apps/api/src/common/auth/roles.enum.ts`

Dodano enum `PlatformRole`:
- `PLATFORM_ADMIN` - Pełny dostęp do platformy (tworzenie siteów, zarządzanie wszystkimi użytkownikami)
- `ORG_OWNER` - Właściciel organizacji (może zarządzać swoimi siteami)
- `USER` - Zwykły użytkownik (brak uprawnień platformowych)

### 3. Refaktoryzacja AuthService
**Plik:** `apps/api/src/modules/auth/auth.service.ts`

Usunięto workaroundy (`prismaAny`) i zaimplementowano pełną obsługę UserSite:
- `getUserSites()` - używa bezpośrednio `prisma.userSite.findMany()`
- `issueSiteToken()` - weryfikuje członkostwo przez `prisma.userSite.findUnique()`
- `resolveSiteForUser()` - sprawdza członkostwo przez UserSite
- `validateUser()` - global login przez UserSite memberships
- `login()` - obsługa org/site memberships

Wszystkie metody mają fallback do legacy modelu (backward compatibility).

### 4. UserSites Service
**Plik:** `apps/api/src/modules/user-sites/user-sites.service.ts`

Utworzono service do zarządzania członkostwami:
- `createMembership()` - tworzenie nowego członkostwa
- `getUserMemberships()` - lista członkostw użytkownika
- `getSiteMemberships()` - lista członków sitea
- `getMembership()` - pobranie konkretnego członkostwa
- `updateMembership()` - aktualizacja roli w członkostwie
- `removeMembership()` - usunięcie członkostwa
- `isMember()` - sprawdzenie członkostwa
- `getUserRoleInSite()` - pobranie roli użytkownika w site

### 5. UserSites Module
**Plik:** `apps/api/src/modules/user-sites/user-sites.module.ts`

Utworzono moduł NestJS dla UserSites:
- Eksportuje `UserSitesService`
- Dodany do `AppModule`

### 6. Aktualizacja JWT Strategy
**Plik:** `apps/api/src/common/auth/strategies/jwt.strategy.ts`

Zaktualizowano `JwtPayload` interface:
- Dodano `platformRole?: string` - rola platformowa
- `role` - rola w site (admin, editor, viewer)

Zaktualizowano `CurrentUserPayload`:
- Dodano `platformRole?: string`

### 7. Migracja Backfill
**Status:** ✅ Już istnieje w migracji

Migracja `20251109000100_user_sites/migration.sql` zawiera:
- Utworzenie tabeli `user_sites`
- Backfill: `INSERT INTO user_sites (user_id, site_id, role) SELECT id, "siteId", role FROM users`

---

## Completed Tasks

### ✅ Nowy model `UserSite` (userId, siteId, role, unique [userId, siteId])
- Model już istnieje w schema.prisma
- Migracja już wykonana
- Unique constraint na `[userId, siteId]`
- Foreign keys do `users` i `sites`

### ✅ Role platformowe: `platform_admin`, `org_owner` (rozszerzenie `Role` lub osobna tabela)
- Dodano enum `PlatformRole` w `roles.enum.ts`
- Role: `PLATFORM_ADMIN`, `ORG_OWNER`, `USER`
- Zintegrowane z JWT payload i CurrentUserPayload

### ✅ Migracja: przeniesienie `User.siteId` do `UserSite` (backfill), utrzymanie kompatybilności
- Migracja backfill już istnieje
- Wszystkie metody mają fallback do legacy modelu
- Backward compatibility zachowana

---

## Acceptance Criteria

### ✅ Użytkownik może mieć wiele ról w wielu siteach
- `getUserSites()` zwraca wszystkie członkostwa użytkownika
- Każde członkostwo ma własną rolę (admin, editor, viewer)
- UserSitesService umożliwia zarządzanie wieloma członkostwami

### ✅ Stary login nadal działa w trakcie migracji
- Wszystkie metody mają try-catch z fallback do legacy modelu
- `validateUser()` sprawdza najpierw UserSite, potem legacy User.siteId
- `getUserSites()` fallback do legacy jeśli UserSite nie istnieje
- `issueSiteToken()` fallback do legacy jeśli UserSite nie istnieje

---

## Technical Implementation

### UserSite Model
```prisma
model UserSite {
  id       String @id @default(uuid())
  userId   String
  siteId String
  role     String @default("viewer")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  site Site @relation(fields: [siteId], references: [id], onDelete: Cascade)

  @@unique([userId, siteId])
  @@index([siteId])
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
  siteId?: string; // optional for global token
  role: string; // site role
  platformRole?: string; // platform role
}
```

---

## Files Created/Modified

### Created
- `apps/api/src/modules/user-sites/user-sites.service.ts` - Service do zarządzania członkostwami
- `apps/api/src/modules/user-sites/user-sites.module.ts` - Module dla UserSites
- `docs/status/TNT-021_COMPLETION.md` - Ten raport

### Modified
- `apps/api/src/common/auth/roles.enum.ts` - Dodano PlatformRole enum
- `apps/api/src/modules/auth/auth.service.ts` - Refaktoryzacja, pełna obsługa UserSite
- `apps/api/src/common/auth/strategies/jwt.strategy.ts` - Dodano platformRole do JwtPayload
- `apps/api/src/common/auth/decorators/current-user.decorator.ts` - Dodano platformRole do CurrentUserPayload
- `apps/api/src/app.module.ts` - Dodano UserSitesModule
- `docs/plan.md` - Zaktualizowano status TNT-021 na Done

---

## Dependencies Status

- ✅ **TNT-002 (Database Schema):** Done - Model UserSite już istnieje
- ✅ **TNT-004 (RBAC):** Done - Wymagane dla ról per-site

---

## Next Steps

1. **TNT-022:** Implementacja endpointów site token exchange (już częściowo zrobione)
2. **TNT-023:** Implementacja frontend Hub i przełączania siteów
3. **TNT-024:** Rozszerzenie RBAC o role platformowe (guards dla platform_admin)

---

## Notes

- Wszystkie metody mają backward compatibility z legacy modelem (User.siteId)
- UserSite table może nie istnieć w niektórych środowiskach - kod obsługuje to gracefully
- Platform roles są zdefiniowane, ale jeszcze nie używane w guards (TNT-024)
- Migracja backfill już została wykonana w poprzednich zadaniach

---

**Completed by:** Architecture Agent + Backend Codex  
**Review Status:** Ready for Review  
**Next Review:** After TNT-022 and TNT-024 implementation

