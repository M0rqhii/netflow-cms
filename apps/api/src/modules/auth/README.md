# Authentication System (Org/Site)

System autentykacji z JWT dla NetFlow CMS.

## Przegl?d

System autentykacji wykorzystuje:
- **JWT (JSON Web Tokens)** dla token?w dost?pu
- **bcrypt** do hashowania hase?
- **Passport.js** z strategi? JWT
- **Zod** do walidacji danych wej?ciowych
- **RBAC (Role-Based Access Control)** z rolami i uprawnieniami

## Endpointy

### POST `/api/v1/auth/login`
Logowanie u?ytkownika (globalne lub org-scoped).

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "orgId": "uuid-org-id"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "viewer",
    "orgId": "org-id"
  }
}
```

**Uwaga:** `orgId` jest opcjonalne. Je?li u?ytkownik ma jedn? organizacj?, zwracany token b?dzie org-scoped. Przy wielu organizacjach token mo?e by? globalny (bez `orgId`).

### POST `/api/v1/auth/register`
Rejestracja nowego u?ytkownika w organizacji.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "orgId": "uuid-org-id",
  "role": "viewer",
  "preferredLanguage": "pl"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "role": "viewer",
    "orgId": "org-id"
  }
}
```

### GET `/api/v1/auth/me`
Pobranie informacji o zalogowanym u?ytkowniku (wymaga autentykacji).

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
  "orgId": "org-id",
  "siteId": null
}
```

### POST `/api/v1/auth/site-token`
Wydanie tokenu site-scoped.

**Request Body:**
```json
{
  "siteId": "uuid-site-id"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "siteId": "uuid-site-id"
}
```

### Invites

- `GET /api/v1/auth/invite/:token` ? zwraca szczeg??y zaproszenia
- `POST /api/v1/auth/invite/accept` ? akceptacja zaproszenia

**Request Body (accept):**
```json
{
  "token": "invite-token",
  "password": "password123",
  "preferredLanguage": "pl"
}
```

## Konfiguracja

### Zmienne ?rodowiskowe

Utw?rz plik `.env` w `apps/api/` z nast?puj?cymi zmiennymi:

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

## U?ycie w kontrolerach

### Ochrona endpoint?w

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
    // user.id, user.email, user.role, user.orgId, user.siteId
  }
}
```

### Publiczne endpointy

```typescript
import { Public } from '../../common/auth/decorators/public.decorator';

@Public()
@Get('public')
async publicEndpoint() {
  // Endpoint dost?pny bez autentykacji
}
```

### Pobieranie zalogowanego u?ytkownika

```typescript
import { CurrentUser, CurrentUserPayload } from '../../common/auth/decorators/current-user.decorator';

@Get('profile')
async getProfile(@CurrentUser() user: CurrentUserPayload) {
  return user;
}
```

## Role i uprawnienia

### Role
- `super_admin` - pe?ny dost?p do wszystkich zasob?w
- `org_admin` - zarz?dzanie u?ytkownikami i zasobami w ramach organizacji
- `editor` - tworzenie i edycja tre?ci
- `viewer` - tylko odczyt tre?ci

### Uprawnienia
Uprawnienia s? przypisane do r?l. Szczeg??y w `src/common/auth/roles.enum.ts`.

## Bezpiecze?stwo

- Has?a s? hashowane przy u?yciu bcrypt (10 rund)
- JWT tokeny zawieraj? informacje o u?ytkowniku (id, email, role, orgId, siteId)
- Tokeny maj? domy?lnie czas wyga?ni?cia 7 dni (konfigurowalne przez `JWT_EXPIRES_IN`)
- Wszystkie endpointy s? chronione domy?lnie (u?yj `@Public()` dla publicznych)

## Struktura plik?w

```
src/modules/auth/
??? auth.controller.ts      # Endpointy API
??? auth.service.ts         # Logika biznesowa
??? auth.module.ts          # Modu? NestJS
??? dto/
?   ??? login.dto.ts        # Schema i typ dla logowania
?   ??? register.dto.ts     # Schema i typ dla rejestracji
?   ??? index.ts
??? decorators/
    ??? current-user.decorator.ts
    ??? public.decorator.ts

src/common/auth/
??? auth.module.ts          # Wsp?lny modu? auth (guards, strategies)
??? guards/
?   ??? auth.guard.ts       # Guard JWT
?   ??? roles.guard.ts      # Guard dla r?l
?   ??? permissions.guard.ts # Guard dla uprawnie?
??? strategies/
?   ??? jwt.strategy.ts     # Strategia Passport JWT
??? decorators/
?   ??? current-user.decorator.ts
?   ??? public.decorator.ts
?   ??? roles.decorator.ts
?   ??? permissions.decorator.ts
??? roles.enum.ts           # Definicje r?l i uprawnie?
```
