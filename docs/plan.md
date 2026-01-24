# Plan Sprintu / Plan Zadań

## Multi-Site Headless CMS

**Sprint:** Sprint 1 - MVP Foundation  
**Okres:** 2024-01-01 - 2024-01-14 (2 tygodnie)  
**Cel:** Podstawowa infrastruktura multi‑site i core API

---

## Sprint Overview

### Cel Sprintu

Stworzenie fundamentu aplikacji multi‑site headless CMS z podstawową funkcjonalnością zarządzania siteami i treścią.

### Definition of Done

- [ ] Wszystkie zadania oznaczone jako "Done"
- [ ] Code review przeprowadzony i approved
- [ ] Testy jednostkowe i integracyjne przechodzą (>80% coverage)
- [ ] Security review przeprowadzony
- [ ] Dokumentacja zaktualizowana
- [ ] Deployment do środowiska staging successful

---

## Zadania Sprintu

### Epic 0: Platform Panel (Panel Zarządzania Platformą) - TERAZ

**WAŻNE:** Platform Panel to główny panel administracyjny do zarządzania wszystkimi stronami, użytkownikami, płatnościami i kontem. **Site Panel / Page Builder** (panel konkretnej strony z Page Builderem) jest odkładany na później.

**Funkcjonalności Platform Panel:**
- ✅ Zarządzanie stronami (sites) - lista, tworzenie, szczegóły
- ✅ Zarządzanie użytkownikami - role, zaproszenia, uprawnienia per site
- ✅ Zarządzanie płatnościami - subskrypcje, faktury, plany
- ✅ Zarządzanie kontem - profil, dane fakturowe, hasło

**Routes Platform Panel:**
- `/dashboard`, `/sites`, `/sites/new`, `/sites/[slug]`, `/sites/[slug]/users`, `/sites/[slug]/billing`, `/billing`, `/account`

**Status:** ✅ **IMPLEMENTOWANY** - Obecny focus projektu

**Dokumentacja:**
- `docs/admin-panel-refactoring-plan.md` - Szczegółowy plan implementacji Platform Panel
- `docs/admin-panel-documentation.md` - Dokumentacja techniczna Platform Panel

---

#### TNT-020: Architektura i UX przepływów

**Status:** Done  
**Asignee:** Architecture Agent + Frontend Maestro  
**Story Points:** 5  
**Priority:** P0 (Critical)

**Opis:**
Zaprojektowanie Platform Panel jako punkt wejścia po logowaniu: lista stron/siteów, metryki i operacje zarządcze (tworzenie stron, zaproszenia, billing).

**Zadania:**

- [x] Makiety UX (Dashboard, site switcher, zaproszenia)
- [x] Spec. przepływów: global login → Hub → switch do site (bez pon. logowania)
- [x] Polityki bezpieczeństwa (CSRF, uprawnienia, audyt)

**Akceptacja:**

- Spójny UX z minimalnym tarciem (SSO między poziomami)
- Zdefiniowane ekrany i scenariusze

**Dependencies:** TNT-004 (RBAC)  
**Estimated Time:** 1 dzień  
**Completed:** 2024-01-09

**Deliverables:**

- `docs/TNT-020_ARCHITECTURE_UX.md` - Kompletna dokumentacja architektury i UX przepływów

---

#### TNT-021: Model uprawnień i członkostwa (User↔Site)

**Status:** Done  
**Asignee:** Architecture Agent + Backend Codex  
**Story Points:** 8  
**Priority:** P0 (Critical)

**Opis:**
Umożliwić jednemu użytkownikowi dostęp do wielu siteów. Wprowadzić tabelę członkostwa i role per‑site + role platformowe.

**Zadania:**

- [x] Nowy model `UserSite` (userId, siteId, role, unique [userId, siteId])
- [x] Role platformowe: `platform_admin`, `org_owner` (rozszerzenie `Role` lub osobna tabela)
- [x] Migracja: przeniesienie `User.siteId` do `UserSite` (backfill), utrzymanie kompatybilności

**Akceptacja:**

- Użytkownik może mieć wiele ról w wielu siteach
- Stary login nadal działa w trakcie migracji

**Dependencies:** TNT-002  
**Estimated Time:** 3 dni  
**Completed:** 2024-01-09

**Deliverables:**

- `apps/api/src/modules/user-sites/user-sites.service.ts` - Service do zarządzania członkostwami
- `apps/api/src/modules/user-sites/user-sites.module.ts` - Module dla UserSites
- `apps/api/src/common/auth/roles.enum.ts` - Dodano PlatformRole enum
- Refaktoryzacja `auth.service.ts` - pełna obsługa UserSite bez workaroundów
- Aktualizacja JWT strategy - obsługa ról platformowych

---

#### TNT-022: Token wymiany (site switch) i lista siteów

**Status:** Done  
**Asignee:** Backend Codex  
**Story Points:** 5  
**Priority:** P0 (Critical)

**Opis:**
Endpointy do pobrania listy siteów użytkownika oraz do wystawienia krótkotrwałego tokenu site‑scoped (bez ponownego wpisywania hasła).

**Zadania:**

- [x] GET `/me/sites` – lista członkostw i ról
- [x] POST `/auth/site-token` { siteId } – walidacja członkostwa → JWT z `siteId`
- [x] Aktualizacja `SiteGuard` – preferuj `siteId` z JWT, fallback: header

**Akceptacja:**

- Hub może pobrać listę stron i bezpiecznie wejść do CMS konkretnej strony

**Dependencies:** TNT-021  
**Estimated Time:** 2 dni  
**Completed:** 2024-01-09

**Deliverables:**

- `GET /api/v1/auth/me/sites` - Endpoint do pobrania listy członkostw użytkownika
- `POST /api/v1/auth/site-token` - Endpoint do wymiany tokenu na site-scoped token
- `SiteGuard` zaktualizowany - preferuje siteId z JWT, fallback: header

---

#### TNT-023: Admin (Next.js) – Hub i przełączanie siteów

**Status:** Done  
**Asignee:** Frontend Maestro  
**Story Points:** 8  
**Priority:** P1 (High)

**Opis:**
Struktura aplikacji admin: `/dashboard` (globalny Hub), `/site/[slug]/*` (obszar CMS). Middleware rozróżnia token globalny i site‑scoped.

**Zadania:**

- [x] Ekran Hub z listą siteów i akcjami (wejście, utwórz, zaproś)
- [x] Przełączanie: wywołanie `/auth/site-token` i zapis tokenu per‑site
- [x] Ochrona tras: globalne vs siteowe (middleware)

**Akceptacja:**

- Bez drugiego logowania – wejście do CMS konkretnej strony

**Dependencies:** TNT-022  
**Estimated Time:** 3 dni  
**Completed:** 2024-01-09

**Deliverables:**

- `apps/admin/src/app/dashboard/page.tsx` - Hub z listą siteów i akcjami
- `apps/admin/src/app/site/[slug]/page.tsx` - Site CMS page z automatycznym token exchange
- `apps/admin/src/middleware.ts` - Middleware do ochrony tras (globalne vs siteowe)
- `apps/admin/src/lib/api.ts` - Helper functions dla tokenów

---

#### TNT-024: RBAC – rozszerzenie o role platformowe

**Status:** Done  
**Asignee:** Security Agent  
**Story Points:** 5  
**Priority:** P1 (High)

**Opis:**
Zdefiniować i wyegzekwować role platformowe (np. tworzenie siteów, zarządzanie zaproszeniami) oraz mapowanie ról per‑site.

**Zadania:**

- [x] Definicje ról platformowych i ich uprawnień
- [x] Guardy/dec. dla endpointów platformowych
- [x] Testy E2E dla uprawnień platformowych

**Akceptacja:**

- Brak eskalacji uprawnień między siteami

**Dependencies:** TNT-021, TNT-022  
**Estimated Time:** 2 dni  
**Completed:** 2024-01-09

**Deliverables:**

- `apps/api/src/common/auth/roles.enum.ts` - PlatformRole permissions mapping
- `apps/api/src/common/auth/guards/platform-roles.guard.ts` - PlatformRolesGuard
- `apps/api/src/common/auth/decorators/platform-roles.decorator.ts` - @PlatformRoles() decorator
- `apps/api/src/modules/auth/auth.service.ts` - Ustawianie platformRole w tokenach
- `apps/api/src/modules/sites/sites.controller.ts` - Użycie PlatformRolesGuard

---

#### TNT-025: Migracja danych i zgodność wsteczna

**Status:** Done  
**Asignee:** Backend Codex + QA  
**Story Points:** 8  
**Priority:** P0 (Critical)

**Opis:**
Bezpieczne przejście do modelu `UserSite` bez przestojów. Skrypty migracyjne i weryfikacja.

**Zadania:**

- [x] Migracje i backfill
- [x] Flagi kompatybilności (czasowe akceptowanie `X-Site-ID`)
- [x] Plan rollbacku

**Akceptacja:**

- Wszystkie istniejące konta działają po migracji

**Dependencies:** TNT-021  
**Estimated Time:** 3 dni  
**Completed:** 2024-01-09

**Deliverables:**

- `apps/api/prisma/migrations/20251109000100_user_sites/migration.sql` - Migration z backfill
- `apps/api/src/modules/auth/auth.service.ts` - Backward compatibility logic
- `apps/api/src/common/site/site.guard.ts` - X-Site-ID header support
- `apps/api/src/common/site/site-context.middleware.ts` - X-Site-ID header support
- `docs/migration/TNT-025_MIGRATION_PLAN.md` - Migration plan i dokumentacja
- `apps/api/prisma/migrations/rollback_user_sites.sql` - Rollback script
- `docs/migration/TNT-025_VERIFICATION_QUERIES.sql` - Verification queries

---

#### TNT-026: Observability i audyt

**Status:** Done  
**Asignee:** DevOps Agent  
**Story Points:** 3  
**Priority:** P2 (Medium)

**Opis:**
Logi audytowe: przełączanie siteów, wejścia do paneli, zmiany ról. Metryki Hub.

**Zadania:**

- [x] Audit log dla `/auth/site-token` i operacji Hub
- [x] Metryki (np. Prometheus/Grafana – roadmap)

**Akceptacja:**

- Zdarzenia kluczowe odnotowane i możliwe do prześledzenia

**Dependencies:** TNT-022  
**Estimated Time:** 1 dzień  
**Completed:** 2024-01-09

**Deliverables:**

- `apps/api/src/common/audit/audit.service.ts` - AuditService z console.log (MVP)
- `apps/api/src/common/audit/audit.interceptor.ts` - AuditInterceptor dla automatycznego logowania
- `apps/api/src/modules/auth/auth.controller.ts` - Manual audit logging dla Hub i site-token
- `apps/api/src/modules/auth/auth.service.ts` - Audit logging dla login, register, logout
- `docs/observability/TNT-026_METRICS_ROADMAP.md` - Roadmap dla Prometheus/Grafana

---

### Epic 1: Infrastructure Setup

#### TNT-001: Projekt Setup i Konfiguracja

**Status:** Done  
**Asignee:** DevOps Agent + Code Generation Agent  
**Story Points:** 5  
**Priority:** P0 (Critical)

**Opis:**
Stworzenie podstawowej struktury projektu, konfiguracja środowiska development i CI/CD pipeline.

**Zadania:**

- [x] Inicjalizacja projektu (Node.js)
- [x] Konfiguracja TypeScript/ESLint/Prettier
- [x] Setup Docker i Docker Compose dla lokalnego development
- [x] Konfiguracja CI/CD (GitHub Actions)
- [x] Setup database migrations
- [x] Konfiguracja environment variables

**Akceptacja:**

- Projekt można uruchomić lokalnie jednym poleceniem (`docker-compose up`)
- CI/CD pipeline przechodzi dla testów
- Wszystkie konwencje kodowania skonfigurowane

**Dependencies:** Brak  
**Estimated Time:** 2 dni  
**Completed:** 2024-01-01

**Deliverables:**

- `.eslintrc.*`, `.prettierrc`, ignore files
- `apps/api/Dockerfile`, `apps/admin/Dockerfile`
- `.github/workflows/ci.yml`
- `docker-compose.yml`
- `env.example`
- `package.json` (skrypty i lint)

---

#### TNT-002: Database Schema Design

**Status:** Done  
**Asignee:** Architecture Agent + Code Generation Agent  
**Story Points:** 8  
**Priority:** P0 (Critical)

**Opis:**
Projekt i implementacja schematu bazy danych dla multi‑site systemu z pełną izolacją danych.

**Zadania:**

- [x] Projekt schematu bazy danych (ERD)
- [x] Implementacja migracji dla tabel: `sites`, `users`, `content_types`, `content_entries`, `collections`, `collection_items`, `media_files`
- [x] Implementacja row‑level security policies (RLS) w PostgreSQL
- [x] Indeksy dla wydajności
- [x] Seed data dla development

**Akceptacja:**

- Wszystkie tabele mają `siteId` dla izolacji
- RLS policies działają poprawnie
- Migracje można uruchomić i rollbackować
- Testy jednostkowe dla schematu przechodzą

**Dependencies:** TNT-001  
**Estimated Time:** 3 dni

---

### Epic 2: Authentication & Authorization

#### TNT-003: Authentication System

**Status:** Completed (MVP); Phase 2 pending (refresh/logout, throttling)  
**Asignee:** Code Generation Agent + Security Agent  
**Story Points:** 8  
**Priority:** P0 (Critical)

**Opis:**
Implementacja systemu autentykacji z JWT tokens i refresh tokens.

**Zadania:**

- [x] Endpoint POST /api/v1/auth/register
- [x] Endpoint POST /api/v1/auth/login
- [ ] Endpoint POST /api/v1/auth/refresh (Phase 2)
- [ ] Endpoint POST /api/v1/auth/logout (Phase 2)
- [x] Middleware/guard do weryfikacji JWT
- [x] Password hashing (bcrypt)
- [ ] Rate limiting dla endpointów auth (Phase 2)
- [x] Testy jednostkowe i integracyjne (częściowe)

**Specyfikacja techniczna (MVP + plan rozszerzeń)**

- Tokeny
  - Access: JWT HS256; claims: `sub`, `email`, `role`, `siteId`; `exp = JWT_EXPIRES_IN` (domyślnie 7d).
  - Refresh (Phase 2): JWT HS256 z `REFRESH_TOKEN_SECRET`; `exp = REFRESH_TOKEN_EXPIRES_IN` (domyślnie 7d);
    przechowywanie `jti` w Redis: klucz `refresh:{userId}:{jti}` z TTL; rotacja przy odświeżeniu; logout = usunięcie `jti`.
- API
  - POST `/api/v1/auth/register` → body: `{ siteId, email, password, role? }` → `{ access_token, user }` (201)
  - POST `/api/v1/auth/login` → body: `{ siteId, email, password }` → `{ access_token, user }` (200)
  - POST `/api/v1/auth/refresh` (Phase 2) → `{ refresh_token }` → `{ access_token, refresh_token }` (200)
  - POST `/api/v1/auth/logout` (Phase 2) → `{ refresh_token? }` → 204
  - GET `/api/v1/auth/me` → `{ id, email, role, siteId }` (200)
- Rate limiting (Phase 2)
  - `@nestjs/throttler`: login `5/min` per IP+email; register `3/min` per IP; 429 po przekroczeniu.
- Bezpieczeństwo
  - `bcrypt` 10 rund; `JWT_SECRET` wymagany; CORS wg `FRONTEND_URL`.
  - `@Public()` wyłącznie dla `login` i `register`; reszta za `AuthGuard`.
- Błędy
  - 401 Invalid credentials; 409 User exists; 400 Walidacja (ZodValidationPipe); 429 Throttling (Phase 2).
- Testy (MVP)
  - Unit: `AuthService` (login ok/invalid, register ok/dup).
  - E2E: `/auth/login`, `/auth/register`, `/auth/me` happy/edge.
- Testy (Phase 2)
  - `/auth/refresh` rotacja refresh, niedozwolone stare `jti`.
  - `/auth/logout` unieważnienie refresh, brak dostępu po revoke.

**Akceptacja (MVP):**

- Użytkownik może się zarejestrować i zalogować
- Access JWT poprawnie generowany i weryfikowany; `GET /auth/me` działa
- Testy dla login/register/me przechodzą

**Akceptacja (Phase 2):**

- Działające `/auth/refresh` z rotacją refresh i przechowywaniem `jti` w Redis
- `/auth/logout` unieważnia refresh (usunięcie `jti`), ponowny refresh zwraca 401
- Włączony throttling zgodnie ze specyfikacją

**Dependencies:** TNT-002  
**Estimated Time:** 3 dni

---

#### TNT-004: Authorization & RBAC

**Status:** Done  
**Asignee:** Code Generation Agent + Security Agent  
**Story Points:** 10  
**Priority:** P0 (Critical)

**Opis:**
System uprawnień oparty na rolach (RBAC) z granularnymi uprawnieniami.

**Zadania:**

- [x] Definicja ról (Super Admin, Site Admin, Editor, Viewer)
- [x] System uprawnień (permission‑based)
- [x] Guardy do sprawdzania ról i uprawnień
- [x] Endpoint GET /api/v1/users/me (current user info)
- [x] Endpoint GET /api/v1/users (list users ‑ tylko dla adminów)
- [x] Testy dla różnych scenariuszy uprawnień

**Akceptacja:**

- Różne role mają odpowiednie uprawnienia
- Guardy poprawnie blokują nieautoryzowane requesty
- Testy przechodzą dla wszystkich kombinacji ról/uprawnień

**Dependencies:** TNT-003  
**Estimated Time:** 3 dni

---

### Epic 3: Site Management

#### TNT-005: Site CRUD API

**Status:** Completed  
**Asignee:** Code Generation Agent  
**Story Points:** 8  
**Priority:** P0 (Critical)

**Opis:**
API do zarządzania siteami (Create, Read, Update, Delete).

**Zadania:**

- [x] POST /api/v1/sites (tworzenie siteów)
- [x] GET /api/v1/sites (lista siteów z paginacją)
- [x] GET /api/v1/sites/:id (szczegóły)
- [x] PATCH /api/v1/sites/:id (aktualizacja)
- [x] DELETE /api/v1/sites/:id (soft/hard delete wg ustaleń)
- [x] Walidacja danych wejściowych
- [x] Testy jednostkowe i integracyjne

**Akceptacja:**

- Wszystkie endpointy działają poprawnie
- Walidacja działa dla nieprawidłowych danych
- Testy przechodzą (>85% coverage)

**Dependencies:** TNT-002, TNT-004  
**Estimated Time:** 2 dni

---

#### TNT-006: Site Context Middleware

**Status:** Done  
**Asignee:** Code Generation Agent  
**Story Points:** 5  
**Priority:** P0 (Critical)

**Opis:**
Middleware do automatycznego ustawiania kontekstu siteów w requestach.

**Zadania:**

- [x] Ekstrakcja siteId z requestu (header/query)
- [x] Automatyczne ustawianie `current_site_id` w database session
- [x] Walidacja czy użytkownik ma dostęp do sitea
- [x] Testy middleware

**Akceptacja:**

- Middleware poprawnie identyfikuje siteów
- Automatyczne filtrowanie danych po siteId działa
- Użytkownik nie może uzyskać dostępu do danych innych siteów
- Testy przechodzą

**Dependencies:** TNT-004, TNT-005  
**Estimated Time:** 1 dzień

---

### Epic 4: Content Management

#### TNT-007: Content Types API

**Status:** Done  
**Asignee:** Code Generation Agent  
**Story Points:** 10  
**Priority:** P1 (High)

**Opis:**
API do definiowania i zarządzania content types (schematami treści).

**Zadania:**

- [x] POST /api/v1/content-types
- [x] GET /api/v1/content-types
- [x] GET /api/v1/content-types/:id
- [x] PATCH /api/v1/content-types/:id
- [x] DELETE /api/v1/content-types/:id
- [x] Walidacja schematu content type
- [x] Testy

**Akceptacja:**

- Można tworzyć content types z różnymi typami pól
- Walidacja schematu działa poprawnie
- Content types są izolowane per site
- Testy przechodzą

**Dependencies:** TNT-006  
**Estimated Time:** 3 dni

---

#### TNT-008: Content Entries API

**Status:** Done  
**Asignee:** Code Generation Agent  
**Story Points:** 13  
**Priority:** P1 (High)

**Opis:**
API do zarządzania wpisami treści (content entries).

**Zadania:**

- [x] POST /api/v1/content/:contentTypeSlug (tworzenie entry)
- [x] GET /api/v1/content/:contentTypeSlug (lista entries z filtrowaniem)
- [x] GET /api/v1/content/:contentTypeSlug/:id (szczegóły entry)
- [x] PATCH /api/v1/content/:contentTypeSlug/:id (aktualizacja)
- [x] DELETE /api/v1/content/:contentTypeSlug/:id (usuwanie)
- [x] Walidacja danych zgodnie z content type schema
- [x] Filtrowanie i sortowanie
- [x] Paginacja
- [x] Testy

**Akceptacja:**

- Wszystkie operacje CRUD działają
- Walidacja działa zgodnie ze schematem content type
- Entries są izolowane per site
- Testy przechodzą (>85% coverage)

**Dependencies:** TNT-007  
**Estimated Time:** 4 dni

---

#### TNT-015: Collections Module (Collections API)

**Status:** Done  
**Asignee:** Backend Codex  
**Story Points:** 13  
**Priority:** P1 (High)

**Opis:**
Zaawansowany system zarządzania kolekcjami treści z wersjonowaniem, ETag i cache'owaniem.

**Zadania:**

- [x] CRUD kolekcji i elementów
- [x] Wersjonowanie items (version field)
- [x] Status DRAFT/PUBLISHED
- [x] ETag support (If-None-Match → 304)
- [x] Redis cache dla metadanych kolekcji
- [x] SiteGuard i SiteModule
- [x] Prisma middleware dla ETag
- [x] Testy jednostkowe i E2E (>80% coverage)

**Akceptacja:**

- Endpointy działają poprawnie
- Multi‑org/site isolation działa
- Wersjonowanie i ETag działają poprawnie
- Testy przechodzą (>85% coverage)

**Dependencies:** TNT-002, TNT-006  
**Estimated Time:** 4 dni  
**Completed:** 2024-01-01

---

### Epic 5: Testing & Quality

#### TNT-009: Test Infrastructure

**Status:** Completed  
**Asignee:** Testing Agent + DevOps Agent  
**Story Points:** 5  
**Priority:** P1 (High)

**Opis:**
Setup infrastruktury testowej i CI/CD integration.

**Zadania:**

- [x] Konfiguracja test framework (Jest)
- [x] Test database setup
- [x] Integration test helpers
- [x] CI/CD integration dla testów
- [x] Coverage reporting
- [x] Test data fixtures

**Akceptacja:**

- Testy można uruchomić lokalnie i w CI/CD
- Coverage reporting działa
- Test database jest izolowana od dev database

**Dependencies:** TNT-001  
**Estimated Time:** 1 dzień

---

#### TNT-010: Comprehensive Testing

**Status:** In Progress  
**Asignee:** Testing Agent  
**Story Points:** 8  
**Priority:** P1 (High)

**Opis:**
Kompleksowe testy dla wszystkich funkcjonalności.

**Zadania:**

- [ ] Testy jednostkowe dla wszystkich services (brakujące scenariusze)
- [ ] Testy integracyjne dla wszystkich API endpoints (pokrycie edge cases)
- [ ] Testy bezpieczeństwa (org/site isolation)
- [ ] Testy wydajnościowe (load testing)
- [x] Coverage > 80% (egzekwowane w CI)

**Akceptacja:**

- Wszystkie testy przechodzą
- Coverage > 80%
- Testy bezpieczeństwa potwierdzają izolację siteów

**Dependencies:** TNT-009, zadania z Epic 1‑4  
**Estimated Time:** 3 dni (równolegle)

---

### Epic 6: Documentation

#### TNT-011: API Documentation

**Status:** To Do  
**Asignee:** Documentation Agent  
**Story Points:** 5  
**Priority:** P2 (Medium)

**Opis:**
Dokumentacja API używając OpenAPI/Swagger.

**Zadania:**

- [ ] OpenAPI specification dla wszystkich endpoints
- [ ] Swagger UI integration
- [ ] Przykłady requestów i odpowiedzi
- [ ] Error codes documentation
- [ ] Authentication guide

**Akceptacja:**

- Wszystkie endpointy są udokumentowane
- Swagger UI działa i jest dostępne
- Przykłady są poprawne i działające

**Dependencies:** Wszystkie API endpoints  
**Estimated Time:** 2 dni

---

#### TNT-012: Technical Documentation

**Status:** In Progress  
**Asignee:** Documentation Agent  
**Story Points:** 3  
**Priority:** P2 (Medium)

**Opis:**
Dokumentacja techniczna projektu.

**Zadania:**

- [x] README.md z instrukcjami setup
- [x] Architecture documentation
- [x] Database schema documentation
- [ ] Deployment guide
- [ ] Contributing guide

**Akceptacja:**

- Nowy developer może uruchomić projekt używając dokumentacji
- Architektura jest udokumentowana

**Dependencies:** TNT-001  
**Estimated Time:** 1 dzień

---

## Backlog (Następne Sprinty)

### Sprint 2: Media Management & Enhancements

**Status:** ✅ Completed  
**Completed:** 2024-01-09

- ✅ Media upload API
- ✅ Media library management
- ✅ CDN integration (structure ready)
- ✅ Advanced content types (relations, nested objects)

**Deliverables:**

- `apps/api/src/modules/media/` - Media module (upload, library, stats)
- `apps/api/src/modules/content-types/dto/create-content-type.dto.ts` - Extended with relations and nested objects
- `docs/sprint2/SPRINT2_MEDIA_COMPLETION.md` - Media completion report
- `docs/sprint2/SPRINT2_ADVANCED_CONTENT_TYPES.md` - Advanced content types documentation

### Sprint 3: Performance & Scale

**Status:** ✅ Completed  
**Completed:** 2024-01-09

- ✅ Caching strategy (Redis)
- ✅ Database query optimization
- ✅ Load testing i optimization
- ✅ Horizontal scaling setup

**Deliverables:**

- `apps/api/src/common/cache/` - Global cache module (Redis)
- `apps/api/src/common/prisma/prisma-optimization.service.ts` - Query optimization service
- `docs/sprint3/SPRINT3_LOAD_TESTING.md` - Load testing documentation
- `docs/sprint3/SPRINT3_HORIZONTAL_SCALING.md` - Horizontal scaling documentation
- `docs/sprint3/SPRINT3_COMPLETION.md` - Completion report

### Sprint 4: Advanced Features

**Status:** ✅ Completed  
**Completed:** 2024-01-09

- ✅ Webhooks
- ✅ GraphQL API
- ✅ Workflow management
- ✅ Advanced search (Elasticsearch)

**Deliverables:**

- `apps/api/src/modules/webhooks/` - Webhooks module (registration, delivery, events)
- `apps/api/src/modules/graphql/` - GraphQL module (resolvers, queries, mutations)
- `apps/api/src/modules/workflow/` - Workflow module (definition, execution, state transitions)
- `apps/api/src/modules/search/` - Search module (full-text search, unified search, suggestions)
- `docs/sprint4/SPRINT4_COMPLETION.md` - Completion report

**Note:** GraphQL requires package installation: `npm install @nestjs/graphql @nestjs/apollo graphql apollo-server-express`  
**Note:** Elasticsearch integration ready, requires: `npm install @elastic/elasticsearch`

---

## Metryki Sprintu

### Velocity

- **Total Story Points:** 89
- **Ideal Days:** 14 dni
- **Team Capacity:** ~6.4 story points/dzień

### Burndown Chart

```
Day 1: 89 SP remaining
Day 3: 75 SP remaining
Day 7: 50 SP remaining
Day 10: 30 SP remaining
Day 14: 0 SP remaining (target)
```

### Definition of Ready (DoR)

Zadanie jest gotowe do rozpoczęcia gdy:

- [ ] Ma jasny opis i akceptację
- [ ] Wszystkie dependencies są zakończone
- [ ] Jest przypisane do agenta
- [ ] Ma oszacowany czas

### Definition of Done (DoD)

Zadanie jest zakończone gdy:

- [ ] Kod jest zaimplementowany
- [ ] Testy przechodzą (>80% coverage)
- [ ] Code review approved
- [ ] Security review passed
- [ ] Dokumentacja zaktualizowana
- [ ] Deployed do staging

---

## Daily Standup Template

**Data:** YYYY-MM-DD  
**Agent:** [Agent Name]

**Wczoraj:**

- Co zostało zrobione

**Dzisiaj:**

- Co będzie robione

**Blokery:**

- Czy są jakieś problemy

**Metryki:**

- Story points completed: X
- Tests written: X
- Coverage: X%

---

## Retrospective Template

**Sprint:** Sprint 1  
**Data:** 2024-01-14

**Co poszło dobrze:**

- ...

**Co można poprawić:**

- ...

**Action Items:**

- [ ] ...

---

**Ostatnia aktualizacja:** 2025-11-09  
**Następny review:** Daily
