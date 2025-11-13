# TNT-003 — Authentication System — System autentykacji z JWT

## Status: ✅ UKOŃCZONE

## Wykonane zadania

### 1. ✅ Usunięto duplikaty plików
- Usunięto `modules/auth/strategies/jwt.strategy.ts` (duplikat)
- Usunięto `modules/auth/guards/jwt-auth.guard.ts` (duplikat)
- System używa teraz tylko plików z `common/auth/`

### 2. ✅ Utworzono ZodValidationPipe
- Utworzono `common/pipes/zod-validation.pipe.ts`
- Pipe waliduje dane wejściowe używając schematów Zod
- Zwraca czytelne błędy walidacji w formacie JSON

### 3. ✅ Zaktualizowano auth.controller.ts
- Dodano walidację Zod dla endpointów `login` i `register`
- Endpointy używają `ZodValidationPipe` z odpowiednimi schematami
- Eksport schematów z `dto/index.ts` dla łatwego użycia

### 4. ✅ Sprawdzono i poprawiono obsługę błędów
- `AuthService` używa odpowiednich wyjątków:
  - `UnauthorizedException` dla nieprawidłowych danych logowania
  - `ConflictException` dla konfliktów (duplikat email, nieistniejący tenant)
- `ZodValidationPipe` zwraca `BadRequestException` z szczegółami błędów walidacji
- `JwtStrategy` rzuca `UnauthorizedException` gdy użytkownik nie istnieje

### 5. ✅ Utworzono dokumentację
- Utworzono `README.md` z pełną dokumentacją systemu autentykacji
- Dokumentacja zawiera:
  - Opis endpointów z przykładami
  - Instrukcje konfiguracji
  - Przykłady użycia w kontrolerach
  - Informacje o rolach i uprawnieniach
  - Strukturę plików

## Funkcjonalności

### Endpointy API
1. **POST `/api/v1/auth/login`** - Logowanie użytkownika
2. **POST `/api/v1/auth/register`** - Rejestracja nowego użytkownika
3. **GET `/api/v1/auth/me`** - Pobranie informacji o zalogowanym użytkowniku

### Bezpieczeństwo
- ✅ Hasła hashowane przy użyciu bcrypt (10 rund)
- ✅ JWT tokeny z informacjami o użytkowniku (id, email, role, tenantId)
- ✅ Konfigurowalny czas wygaśnięcia tokenów (domyślnie 7 dni)
- ✅ Wszystkie endpointy chronione domyślnie (opcja `@Public()` dla publicznych)

### Walidacja
- ✅ Walidacja danych wejściowych za pomocą schematów Zod
- ✅ Walidacja email, hasła (min. 6 znaków), tenantId (UUID)
- ✅ Walidacja roli (super_admin, tenant_admin, editor, viewer)

### Autoryzacja
- ✅ System RBAC z rolami i uprawnieniami
- ✅ Guards: `AuthGuard`, `RolesGuard`, `PermissionsGuard`
- ✅ Decorators: `@Public()`, `@CurrentUser()`, `@Roles()`, `@Permissions()`

## Struktura plików

```
src/modules/auth/
├── auth.controller.ts          ✅ Zaktualizowany z ZodValidationPipe
├── auth.service.ts              ✅ Kompletna implementacja
├── auth.module.ts              ✅ Poprawnie skonfigurowany
├── dto/
│   ├── login.dto.ts            ✅ Schema Zod
│   ├── register.dto.ts         ✅ Schema Zod
│   └── index.ts                ✅ Eksport schematów
├── decorators/
│   ├── current-user.decorator.ts
│   ├── public.decorator.ts
│   └── index.ts
└── README.md                    ✅ Dokumentacja

src/common/auth/
├── auth.module.ts              ✅ Moduł z JwtModule
├── guards/
│   ├── auth.guard.ts           ✅ Guard JWT z obsługą @Public()
│   ├── roles.guard.ts          ✅ Guard dla ról
│   └── permissions.guard.ts   ✅ Guard dla uprawnień
├── strategies/
│   └── jwt.strategy.ts         ✅ Strategia Passport JWT
├── decorators/
│   ├── current-user.decorator.ts
│   ├── public.decorator.ts
│   ├── roles.decorator.ts
│   └── permissions.decorator.ts
└── roles.enum.ts               ✅ Definicje ról i uprawnień

src/common/pipes/
└── zod-validation.pipe.ts      ✅ NOWY - Pipe walidacji Zod
```

## Konfiguracja

### Wymagane zmienne środowiskowe

```env
JWT_SECRET="your-secret-key-change-in-production-use-strong-random-string"
JWT_EXPIRES_IN="7d"
PORT=4000
FRONTEND_URL="http://localhost:3000"
DATABASE_URL="postgresql://user:password@localhost:5432/netflow_cms?schema=public"
```

## Testowanie

### Przykład użycia API

#### 1. Rejestracja użytkownika
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "tenantId": "tenant-uuid",
    "role": "viewer"
  }'
```

#### 2. Logowanie
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "tenantId": "tenant-uuid"
  }'
```

#### 3. Pobranie profilu (wymaga tokenu)
```bash
curl -X GET http://localhost:4000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
```

## Integracja z innymi modułami

System autentykacji jest już zintegrowany z:
- ✅ `tenants` module
- ✅ `users` module
- ✅ `collections` module
- ✅ `content-types` module
- ✅ `content-entries` module

Wszystkie te moduły używają `AuthGuard` do ochrony endpointów.

## Następne kroki (opcjonalne)

1. **Refresh tokens** - Dodanie mechanizmu odświeżania tokenów
2. **Rate limiting** - Ograniczenie liczby prób logowania
3. **2FA** - Dwuskładnikowa autentykacja
4. **Password reset** - Resetowanie hasła przez email
5. **Session management** - Zarządzanie sesjami użytkowników

## Uwagi

- System używa `common/auth` dla wspólnych komponentów (guards, strategies)
- Moduł `modules/auth` zawiera endpointy API (login, register, me)
- Walidacja odbywa się za pomocą Zod schemas przez `ZodValidationPipe`
- Wszystkie endpointy są chronione domyślnie, użyj `@Public()` dla publicznych

---

**Data ukończenia:** $(date)
**Status:** ✅ Gotowe do użycia





