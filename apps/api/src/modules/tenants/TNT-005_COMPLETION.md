# TNT-005 — Tenant CRUD API — API do zarządzania tenantami

**Status:** ✅ Completed  
**Data ukończenia:** 2024-12-19  
**Story Points:** 8  
**Priority:** P0 (Critical)

## Podsumowanie

Zaimplementowano kompletne RESTful API do zarządzania tenantami (organizacjami korzystającymi z platformy). API zapewnia pełne operacje CRUD z odpowiednimi zabezpieczeniami, walidacją danych i obsługą błędów. Wszystkie endpointy są dostępne wyłącznie dla użytkowników z rolą SUPER_ADMIN, co zapewnia bezpieczne zarządzanie tenantami na poziomie platformy.

## Zaimplementowane komponenty

### 1. TenantsController (`tenants.controller.ts`)

**Endpointy:**

#### `POST /api/v1/tenants`
- Tworzenie nowego tenant'a
- Wymaga: SUPER_ADMIN + TENANTS_WRITE
- Walidacja: slug, name, plan, settings
- Zwraca: utworzony tenant z metadanymi

#### `GET /api/v1/tenants`
- Lista wszystkich tenantów z paginacją
- Wymaga: SUPER_ADMIN + TENANTS_READ
- Parametry: `page` (domyślnie 1), `pageSize` (domyślnie 20, max 100)
- Zwraca: `{ data: Tenant[], pagination: {...} }`

#### `GET /api/v1/tenants/:id`
- Pobranie tenant'a po ID
- Wymaga: SUPER_ADMIN + TENANTS_READ
- Zwraca: tenant z liczbami powiązanych zasobów (`_count`)

#### `GET /api/v1/tenants/slug/:slug`
- Pobranie tenant'a po slug
- Wymaga: SUPER_ADMIN + TENANTS_READ
- Zwraca: tenant z podstawowymi danymi

#### `PATCH /api/v1/tenants/:id`
- Aktualizacja tenant'a
- Wymaga: SUPER_ADMIN + TENANTS_WRITE
- Wszystkie pola opcjonalne (partial update)
- Merge settings (łączy z istniejącymi)
- Walidacja unikalności slug przy zmianie

#### `DELETE /api/v1/tenants/:id`
- Usunięcie tenant'a
- Wymaga: SUPER_ADMIN + TENANTS_DELETE
- Cascade delete wszystkich powiązanych danych
- Zwraca: komunikat potwierdzenia

**Zabezpieczenia:**
- Wszystkie endpointy chronione przez `AuthGuard`, `RolesGuard`, `PermissionsGuard`
- Tylko SUPER_ADMIN ma dostęp
- Wymagane uprawnienia: TENANTS_READ, TENANTS_WRITE, TENANTS_DELETE

### 2. TenantsService (`tenants.service.ts`)

**Metody:**

#### `create(createTenantDto: CreateTenantDto)`
- Tworzy nowego tenant'a
- Sprawdza unikalność slug
- Zwraca 409 Conflict jeśli slug już istnieje
- Ustawia domyślne wartości (plan: 'free', settings: {})

#### `findAll(page: number, pageSize: number)`
- Zwraca listę tenantów z paginacją
- Maksymalna liczba na stronę: 100
- Sortowanie: `createdAt DESC`
- Zwraca statystyki: `_count` dla users, collections

#### `findOne(id: string)`
- Zwraca tenant po ID
- Zwraca 404 NotFound jeśli nie istnieje
- Zwraca rozszerzone statystyki: users, collections, contentTypes, contentEntries, mediaFiles

#### `findBySlug(slug: string)`
- Zwraca tenant po slug
- Zwraca 404 NotFound jeśli nie istnieje
- Zwraca podstawowe dane tenant'a

#### `update(id: string, updateTenantDto: UpdateTenantDto)`
- Aktualizuje tenant'a (partial update)
- Sprawdza czy tenant istnieje (404)
- Sprawdza unikalność slug przy zmianie (409)
- Merge settings z istniejącymi
- Zwraca zaktualizowany tenant

#### `remove(id: string)`
- Usuwa tenant'a
- Sprawdza czy tenant istnieje (404)
- Cascade delete wszystkich powiązanych danych (users, collections, contentTypes, etc.)
- Zwraca komunikat potwierdzenia

**Obsługa błędów:**
- `NotFoundException` - tenant nie istnieje
- `ConflictException` - slug już istnieje
- `BadRequestException` - nieprawidłowe dane wejściowe

### 3. Data Transfer Objects (DTOs)

#### `CreateTenantDto` (`create-tenant.dto.ts`)
```typescript
{
  name: string (min 1, max 255)
  slug: string (min 1, max 100, regex: /^[a-z0-9-]+$/)
  plan: 'free' | 'professional' | 'enterprise' (default: 'free')
  settings?: Record<string, any> (default: {})
}
```

**Walidacja:**
- Slug: tylko małe litery, cyfry i myślniki
- Name: wymagane, max 255 znaków
- Plan: enum z dozwolonymi wartościami
- Settings: opcjonalny obiekt JSON

#### `UpdateTenantDto` (`update-tenant.dto.ts`)
- Wszystkie pola z `CreateTenantDto` są opcjonalne
- Partial update - tylko podane pola są aktualizowane
- Settings są mergowane z istniejącymi

### 4. TenantsModule (`tenants.module.ts`)

**Konfiguracja:**
- Importuje `AuthModule` dla guards
- Eksportuje `TenantsService` dla innych modułów
- Dostarcza `PrismaService` dla dostępu do bazy danych

**Integracja:**
- Zarejestrowany w `AppModule`
- Dostępny pod `/api/v1/tenants`

### 5. Testy E2E (`tenants.e2e-spec.ts`)

**Pokrycie testami:**

#### Testy tworzenia (POST)
- ✅ Tworzenie tenant'a przez SUPER_ADMIN
- ✅ Odmowa dostępu dla innych ról (403)
- ✅ Odmowa dostępu bez autoryzacji (401)
- ✅ Walidacja duplikatu slug (409)
- ✅ Walidacja formatu slug (400)

#### Testy listowania (GET)
- ✅ Lista tenantów z paginacją
- ✅ Parametry paginacji działają poprawnie
- ✅ Odmowa dostępu dla innych ról (403)
- ✅ Odmowa dostępu bez autoryzacji (401)

#### Testy pobierania (GET :id, GET slug/:slug)
- ✅ Pobranie tenant'a po ID
- ✅ Pobranie tenant'a po slug
- ✅ 404 dla nieistniejącego tenant'a
- ✅ Odmowa dostępu dla innych ról (403)

#### Testy aktualizacji (PATCH)
- ✅ Aktualizacja wszystkich pól
- ✅ Partial update (tylko wybrane pola)
- ✅ Merge settings
- ✅ 404 dla nieistniejącego tenant'a
- ✅ 409 dla duplikatu slug
- ✅ Odmowa dostępu dla innych ról (403)

#### Testy usuwania (DELETE)
- ✅ Usunięcie tenant'a
- ✅ 404 dla nieistniejącego tenant'a
- ✅ Odmowa dostępu dla innych ról (403)
- ✅ Odmowa dostępu bez autoryzacji (401)

**Statystyki testów:**
- Całkowita liczba testów: 25+
- Pokrycie: wszystkie endpointy i scenariusze błędów
- Używa prawdziwych JWT tokenów
- Testuje wszystkie role (SUPER_ADMIN, TENANT_ADMIN, EDITOR, VIEWER)

## Bezpieczeństwo

### Implementowane zabezpieczenia:

1. **Autentykacja JWT** — wszystkie endpointy wymagają ważnego tokenu JWT
2. **Kontrola dostępu na poziomie ról** — tylko SUPER_ADMIN ma dostęp
3. **Kontrola uprawnień** — wymagane uprawnienia: TENANTS_READ, TENANTS_WRITE, TENANTS_DELETE
4. **Walidacja danych wejściowych** — Zod schemas dla wszystkich DTOs
5. **Walidacja unikalności** — sprawdzanie duplikatów slug przed utworzeniem/aktualizacją
6. **Obsługa błędów** — odpowiednie kody HTTP (400, 401, 403, 404, 409)

### Błędy HTTP:
- **400 Bad Request** — nieprawidłowe dane wejściowe (walidacja)
- **401 Unauthorized** — brak lub nieprawidłowy token JWT
- **403 Forbidden** — użytkownik nie ma wymaganej roli/uprawnień
- **404 Not Found** — tenant nie istnieje
- **409 Conflict** — slug już istnieje

## Przykłady użycia

### Utworzenie tenant'a:
```bash
curl -X POST http://localhost:4000/api/v1/tenants \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <super_admin_token>' \
  -H 'X-Tenant-ID: <super_admin_tenant_id>' \
  -d '{
    "name": "Acme Corporation",
    "slug": "acme-corp",
    "plan": "professional",
    "settings": {
      "theme": "dark",
      "features": ["analytics", "custom-domain"]
    }
  }'
```

### Lista tenantów:
```bash
curl http://localhost:4000/api/v1/tenants?page=1&pageSize=20 \
  -H 'Authorization: Bearer <super_admin_token>' \
  -H 'X-Tenant-ID: <super_admin_tenant_id>'
```

### Pobranie tenant'a po ID:
```bash
curl http://localhost:4000/api/v1/tenants/<tenant_id> \
  -H 'Authorization: Bearer <super_admin_token>' \
  -H 'X-Tenant-ID: <super_admin_tenant_id>'
```

### Pobranie tenant'a po slug:
```bash
curl http://localhost:4000/api/v1/tenants/slug/acme-corp \
  -H 'Authorization: Bearer <super_admin_token>' \
  -H 'X-Tenant-ID: <super_admin_tenant_id>'
```

### Aktualizacja tenant'a:
```bash
curl -X PATCH http://localhost:4000/api/v1/tenants/<tenant_id> \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <super_admin_token>' \
  -H 'X-Tenant-ID: <super_admin_tenant_id>' \
  -d '{
    "plan": "enterprise",
    "settings": {
      "newFeature": true
    }
  }'
```

### Usunięcie tenant'a:
```bash
curl -X DELETE http://localhost:4000/api/v1/tenants/<tenant_id> \
  -H 'Authorization: Bearer <super_admin_token>' \
  -H 'X-Tenant-ID: <super_admin_tenant_id>'
```

## Akceptacja kryteriów

- ✅ Wszystkie operacje CRUD działają poprawnie
- ✅ Tylko SUPER_ADMIN ma dostęp do endpointów
- ✅ Walidacja danych wejściowych działa (Zod schemas)
- ✅ Obsługa błędów jest poprawna (400, 401, 403, 404, 409)
- ✅ Paginacja działa poprawnie
- ✅ Unikalność slug jest wymuszana
- ✅ Settings są mergowane przy aktualizacji
- ✅ Cascade delete działa poprawnie
- ✅ Testy E2E przechodzą (25+ testów)
- ✅ Dokumentacja jest kompletna

## Deliverables

- ✅ `apps/api/src/modules/tenants/tenants.controller.ts` — kontroler API
- ✅ `apps/api/src/modules/tenants/tenants.service.ts` — logika biznesowa
- ✅ `apps/api/src/modules/tenants/tenants.module.ts` — moduł NestJS
- ✅ `apps/api/src/modules/tenants/dto/create-tenant.dto.ts` — DTO tworzenia
- ✅ `apps/api/src/modules/tenants/dto/update-tenant.dto.ts` — DTO aktualizacji
- ✅ `apps/api/src/modules/tenants/dto/index.ts` — eksporty DTO
- ✅ `apps/api/test/tenants.e2e-spec.ts` — testy E2E (25+ testów)
- ✅ `apps/api/src/modules/tenants/TNT-005_COMPLETION.md` — dokumentacja ukończenia

## Integracja

### Zależności:
- ✅ **TNT-002**: Database Schema Design (model Tenant)
- ✅ **TNT-004**: Authorization & RBAC (guards, permissions)
- ✅ **TNT-006**: Tenant Context Middleware (kontekst tenant'a)

### Integracja z innymi modułami:
- Używa `PrismaService` do dostępu do bazy danych
- Używa `AuthModule` dla guards i autoryzacji
- Zarejestrowany w `AppModule`
- Eksportuje `TenantsService` dla innych modułów (jeśli potrzebne)

## Uwagi techniczne

1. **Slug format**: Slug może zawierać tylko małe litery, cyfry i myślniki (`/^[a-z0-9-]+$/`)
2. **Paginacja**: Maksymalna liczba elementów na stronę to 100
3. **Settings merge**: Przy aktualizacji settings są mergowane z istniejącymi (nie nadpisują całkowicie)
4. **Cascade delete**: Usunięcie tenant'a usuwa wszystkie powiązane dane (users, collections, contentTypes, etc.)
5. **Statystyki**: Endpointy GET zwracają `_count` z liczbami powiązanych zasobów
6. **Partial update**: PATCH akceptuje tylko podane pola (nie wymaga wszystkich pól)

## Następne kroki (opcjonalne)

- [ ] Dodanie endpointu do zarządzania użytkownikami tenant'a
- [ ] Dodanie endpointu do zarządzania planami i billingiem
- [ ] Implementacja soft delete (archiwizacja zamiast usuwania)
- [ ] Dodanie endpointu do eksportu/importu danych tenant'a
- [ ] Implementacja audit logu dla działań na tenantach
- [ ] Dodanie endpointu do zarządzania ustawieniami tenant'a (settings)
- [ ] Implementacja webhooków dla zdarzeń tenant'a (created, updated, deleted)

## Status: ✅ COMPLETED

API do zarządzania tenantami jest w pełni zaimplementowane i gotowe do użycia. Wszystkie endpointy działają poprawnie, testy przechodzą, a dokumentacja jest kompletna. System zapewnia bezpieczne zarządzanie tenantami na poziomie platformy z odpowiednimi zabezpieczeniami i walidacją.





