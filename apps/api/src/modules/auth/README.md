# Authentication System (TNT-003)

System autentykacji z JWT dla NetFlow CMS.

## Przegląd

System autentykacji wykorzystuje:
- **JWT (JSON Web Tokens)** dla tokenów dostępu
- **bcrypt** do hashowania haseł
- **Passport.js** z strategią JWT
- **Zod** do walidacji danych wejściowych
- **RBAC (Role-Based Access Control)** z rolami i uprawnieniami

## Endpointy

### POST `/api/v1/auth/login`
Logowanie użytkownika.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "tenantId": "uuid-tenant-id"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "viewer",
    "tenantId": "tenant-id"
  }
}
```

### POST `/api/v1/auth/register`
Rejestracja nowego użytkownika.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "tenantId": "uuid-tenant-id",
  "role": "viewer" // opcjonalne: super_admin, tenant_admin, editor, viewer (domyślnie: viewer)
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "viewer",
    "tenantId": "tenant-id"
  }
}
```

### GET `/api/v1/auth/me`
Pobranie informacji o zalogowanym użytkowniku (wymaga autentykacji).

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "role": "viewer",
  "tenantId": "tenant-id"
}
```

## Konfiguracja

### Zmienne środowiskowe

Utwórz plik `.env` w `apps/api/` z następującymi zmiennymi:

```env
# JWT Configuration
JWT_SECRET="your-secret-key-change-in-production-use-strong-random-string"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=4000
FRONTEND_URL="http://localhost:3000"

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/netflow_cms?schema=public"
```

## Użycie w kontrolerach

### Ochrona endpointów

```typescript
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/auth/guards/auth.guard';
import { RolesGuard } from '../../common/auth/guards/roles.guard';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { Roles } from '../../common/auth/decorators/roles.decorator';
import { Permissions } from '../../common/auth/decorators/permissions.decorator';
import { Role, Permission } from '../../common/auth/roles.enum';

@UseGuards(AuthGuard, RolesGuard, PermissionsGuard)
@Controller('example')
export class ExampleController {
  @Get()
  @Roles(Role.EDITOR)
  @Permissions(Permission.CONTENT_READ)
  async getContent(@CurrentUser() user: CurrentUserPayload) {
    // user.id, user.email, user.role, user.tenantId
  }
}
```

### Publiczne endpointy

```typescript
import { Public } from '../../common/auth/decorators/public.decorator';

@Public()
@Get('public')
async publicEndpoint() {
  // Endpoint dostępny bez autentykacji
}
```

### Pobieranie zalogowanego użytkownika

```typescript
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';

@Get('profile')
async getProfile(@CurrentUser() user: CurrentUserPayload) {
  return user;
}
```

## Role i uprawnienia

### Role
- `super_admin` - pełny dostęp do wszystkich zasobów
- `tenant_admin` - zarządzanie użytkownikami i zasobami w ramach tenant
- `editor` - tworzenie i edycja treści
- `viewer` - tylko odczyt treści

### Uprawnienia
Uprawnienia są przypisane do ról. Szczegóły w `src/common/auth/roles.enum.ts`.

## Walidacja

Walidacja danych wejściowych odbywa się za pomocą schematów Zod:

```typescript
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { loginSchema } from './dto/login.dto';

@Post('login')
async login(@Body(new ZodValidationPipe(loginSchema)) loginDto: LoginDto) {
  // loginDto jest zwalidowany
}
```

## Bezpieczeństwo

- Hasła są hashowane przy użyciu bcrypt (10 rund)
- JWT tokeny zawierają informacje o użytkowniku (id, email, role, tenantId)
- Tokeny mają domyślnie czas wygaśnięcia 7 dni (konfigurowalne przez `JWT_EXPIRES_IN`)
- Wszystkie endpointy są chronione domyślnie (użyj `@Public()` dla publicznych)

## Struktura plików

```
src/modules/auth/
├── auth.controller.ts      # Endpointy API
├── auth.service.ts         # Logika biznesowa
├── auth.module.ts          # Moduł NestJS
├── dto/
│   ├── login.dto.ts        # Schema i typ dla logowania
│   ├── register.dto.ts     # Schema i typ dla rejestracji
│   └── index.ts
└── decorators/
    ├── current-user.decorator.ts
    └── public.decorator.ts

src/common/auth/
├── auth.module.ts          # Wspólny moduł auth (guards, strategies)
├── guards/
│   ├── auth.guard.ts       # Guard JWT
│   ├── roles.guard.ts      # Guard dla ról
│   └── permissions.guard.ts # Guard dla uprawnień
├── strategies/
│   └── jwt.strategy.ts     # Strategia Passport JWT
├── decorators/
│   ├── current-user.decorator.ts
│   ├── public.decorator.ts
│   ├── roles.decorator.ts
│   └── permissions.decorator.ts
└── roles.enum.ts           # Definicje ról i uprawnień
```





