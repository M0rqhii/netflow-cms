# TNT-020: Architektura i UX przepływów

**Status:** Completed  
**Asignee:** Architecture Agent + Frontend Maestro  
**Story Points:** 5  
**Priority:** P0 (Critical)  
**Completed:** 2024-01-09

---

## 1. Przegląd

Dokumentacja architektury i UX dla globalnego panelu administracyjnego (Platform Admin Hub) - punktu wejścia po logowaniu, który umożliwia zarządzanie wieloma tenantami, metrykami i operacjami zarządczymi.

### 1.1 Cele
- Spójny UX z minimalnym tarciem (SSO między poziomami)
- Zdefiniowane ekrany i scenariusze użytkownika
- Bezpieczne przełączanie między tenantami bez ponownego logowania
- Polityki bezpieczeństwa dla operacji platformowych

---

## 2. Architektura przepływów

### 2.1 Przepływ główny: Global Login → Hub → Tenant Switch

```
┌─────────────────┐
│  Global Login   │
│  (bez tenantId) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Platform Hub   │
│  (Dashboard)    │
│  - Lista tenantów│
│  - Metryki       │
│  - Operacje      │
└────────┬────────┘
         │
         │ [Wybierz tenant]
         ▼
┌─────────────────┐
│ Tenant Token    │
│ Exchange        │
│ POST /auth/     │
│ tenant-token    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Tenant CMS     │
│  /tenant/[slug] │
│  (scoped token) │
└─────────────────┘
```

### 2.2 Szczegółowy przepływ autentykacji

#### 2.2.1 Global Login (Poziom Platformy)
```
1. Użytkownik wchodzi na /login
2. Wypełnia formularz (email, password) - BEZ tenantId
3. POST /api/v1/auth/login { email, password }
4. Backend weryfikuje użytkownika (globalny token)
5. JWT zawiera: { sub, email, role, platformRole }
   - NIE zawiera tenantId (globalny token)
6. Token zapisywany w localStorage jako 'authToken'
7. Redirect do /dashboard (Platform Hub)
```

#### 2.2.2 Platform Hub (Dashboard)
```
1. Użytkownik na /dashboard
2. Aplikacja pobiera listę tenantów: GET /api/v1/me/tenants
   - Wymaga globalnego tokenu
   - Zwraca: [{ tenantId, tenant: { name, slug }, role }]
3. Wyświetla listę tenantów z akcjami:
   - "Enter CMS" - przejście do tenant CMS
   - "Manage" - zarządzanie tenantem (future)
   - "Invite" - zaproszenie użytkownika (future)
```

#### 2.2.3 Tenant Switch (Bez ponownego logowania)
```
1. Użytkownik klika "Enter CMS" dla wybranego tenanta
2. Aplikacja wywołuje: POST /api/v1/auth/tenant-token { tenantId }
   - Wymaga globalnego tokenu w headerze
   - Backend weryfikuje członkostwo użytkownika w tenantId
3. Backend generuje tenant-scoped JWT:
   - { sub, email, role, tenantId, exp }
   - Krótszy czas życia (np. 1h vs 7d dla globalnego)
4. Token zapisywany jako `tenantToken:{tenantId}`
5. Redirect do /tenant/{slug}/*
6. Wszystkie requesty do tenant API używają tenant-scoped tokenu
```

### 2.3 Przepływ zaproszeń (Roadmap)

```
┌─────────────────┐
│  Platform Hub   │
│  - Lista tenantów│
└────────┬────────┘
         │
         │ [Kliknij "Invite User"]
         ▼
┌─────────────────┐
│  Invite Modal   │
│  - Email         │
│  - Role          │
│  - Tenant        │
└────────┬────────┘
         │
         │ POST /api/v1/invitations
         ▼
┌─────────────────┐
│  Email Sent     │
│  (z linkiem)     │
└─────────────────┘
```

---

## 3. UX Mockups / Wireframes

### 3.1 Global Login Page (`/login`)

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│                    [Netflow CMS Logo]                    │
│                                                           │
│                    Platform Login                        │
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Email:                                          │   │
│  │ [_____________________________]                  │   │
│  │                                                  │   │
│  │ Password:                                       │   │
│  │ [_____________________________]                  │   │
│  │                                                  │   │
│  │ [ ] Remember me                                 │   │
│  │                                                  │   │
│  │ [        Login        ]                         │   │
│  │                                                  │   │
│  │ Forgot password?                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
│  Note: No tenant ID required - this is global login     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Kluczowe elementy:**
- Prosty formularz (email + password)
- Brak pola tenantId (globalny login)
- Link "Forgot password?" (future)
- Checkbox "Remember me" (future)

### 3.2 Platform Hub Dashboard (`/dashboard`)

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Logo]  Platform Admin Hub                    [User Menu ▼]        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  Welcome back, John Doe                                              │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Quick Stats                                                 │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │  │   5      │  │   12     │  │   3      │  │   24     │   │   │
│  │  │ Tenants  │  │  Users   │  │  Active  │  │  Total   │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  My Tenants                                    [+ New Tenant]│   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                               │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │  Acme Corporation                    [Tenant Admin] │   │   │
│  │  │  acme-corp • Last active: 2 hours ago               │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │   │
│  │  │  │ Enter CMS   │  │  Manage      │  │  Invite   │ │   │   │
│  │  │  └──────────────┘  └──────────────┘  └──────────┘ │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  │                                                               │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │  TechStart Inc                       [Editor]        │   │   │
│  │  │  techstart • Last active: 1 day ago                 │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │   │
│  │  │  │ Enter CMS   │  │  Manage      │  │  Invite   │ │   │   │
│  │  │  └──────────────┘  └──────────────┘  └──────────┘ │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  │                                                               │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │  StartupXYZ                          [Viewer]       │   │   │
│  │  │  startupxyz • Last active: 3 days ago               │   │   │
│  │  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │   │   │
│  │  │  │ Enter CMS   │  │  Manage      │  │  Invite   │ │   │   │
│  │  │  └──────────────┘  └──────────────┘  └──────────┘ │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Recent Activity (Roadmap)                                  │   │
│  │  - Tenant "Acme" created 2 days ago                        │   │
│  │  - User "jane@acme.com" invited 1 day ago                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Kluczowe elementy:**
- Header z logo i menu użytkownika
- Quick stats (metryki platformowe)
- Lista tenantów z:
  - Nazwą i slugiem
  - Rolą użytkownika w tenant
  - Ostatnią aktywnością
  - Akcjami: Enter CMS, Manage, Invite
- Przycisk "New Tenant" (dla platform_admin)
- Recent Activity (roadmap)

### 3.3 Tenant Switcher (Dropdown - Future Enhancement)

```
┌─────────────────────────────────────┐
│  Current: Acme Corporation    [▼]   │
├─────────────────────────────────────┤
│  • Acme Corporation (Admin)          │
│  • TechStart Inc (Editor)           │
│  • StartupXYZ (Viewer)              │
│  ─────────────────────────────────  │
│  + Switch to another tenant          │
│  [Back to Hub]                       │
└─────────────────────────────────────┘
```

**Użycie:**
- Widoczny w headerze podczas pracy w tenant CMS
- Szybkie przełączanie między tenantami
- Powrót do Hub

### 3.4 Invite User Modal (Roadmap)

```
┌─────────────────────────────────────────────┐
│  Invite User to Tenant          [X]         │
├─────────────────────────────────────────────┤
│                                             │
│  Tenant: [Acme Corporation        ▼]       │
│                                             │
│  Email: [________________________]          │
│                                             │
│  Role:  [Editor                    ▼]      │
│         • Admin                              │
│         • Editor                             │
│         • Viewer                             │
│                                             │
│  Message (optional):                        │
│  [________________________________]         │
│  [________________________________]         │
│                                             │
│  [Cancel]              [Send Invitation]    │
│                                             │
└─────────────────────────────────────────────┘
```

**Kluczowe elementy:**
- Wybór tenanta (jeśli użytkownik ma wiele tenantów)
- Email użytkownika do zaproszenia
- Wybór roli
- Opcjonalna wiadomość
- Wysyłka emaila z linkiem aktywacyjnym

---

## 4. Specyfikacja techniczna przepływów

### 4.1 Endpointy API

#### 4.1.1 Global Login
```typescript
POST /api/v1/auth/login
Body: {
  email: string;
  password: string;
  // NO tenantId - global login
}
Response: {
  access_token: string; // Global JWT (bez tenantId)
  user: {
    id: string;
    email: string;
    role: string; // Platform role
  }
}
```

#### 4.1.2 Get My Tenants
```typescript
GET /api/v1/me/tenants
Headers: {
  Authorization: "Bearer {global_token}"
}
Response: {
  tenants: Array<{
    tenantId: string;
    tenant: {
      id: string;
      name: string;
      slug: string;
    };
    role: string; // Role w tenant (admin, editor, viewer)
    joinedAt: string;
    lastActiveAt?: string;
  }>
}
```

#### 4.1.3 Tenant Token Exchange
```typescript
POST /api/v1/auth/tenant-token
Headers: {
  Authorization: "Bearer {global_token}"
}
Body: {
  tenantId: string;
}
Response: {
  access_token: string; // Tenant-scoped JWT (z tenantId)
  expires_in: number; // Krótszy czas życia (np. 3600s)
}
```

### 4.2 Middleware i Guardy

#### 4.2.1 Token Middleware (Frontend)
```typescript
// apps/admin/src/middleware.ts
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Global routes (Hub)
  if (path.startsWith('/dashboard')) {
    const globalToken = getAuthToken();
    if (!globalToken) {
      return NextResponse.redirect('/login');
    }
  }
  
  // Tenant routes
  if (path.startsWith('/tenant/')) {
    const tenantSlug = extractTenantSlug(path);
    const tenantToken = getTenantToken(tenantId);
    
    if (!tenantToken) {
      // Try to exchange token
      // If fails, redirect to /dashboard
    }
  }
}
```

#### 4.2.2 Tenant Guard (Backend)
```typescript
// Backend: TenantGuard
// Preferuje tenantId z JWT, fallback: X-Tenant-ID header
@UseGuards(TenantGuard)
@Get('/api/v1/content')
async getContent(@CurrentTenant() tenantId: string) {
  // tenantId z JWT lub header
}
```

### 4.3 State Management (Frontend)

```typescript
// Token storage strategy
localStorage:
  - 'authToken': Global JWT (długi czas życia)
  - 'tenantToken:{tenantId}': Tenant-scoped JWT (krótki czas życia)

// Token refresh strategy
- Global token: Refresh przed wygaśnięciem (future)
- Tenant token: Exchange na żądanie (gdy wygaśnie)
```

---

## 5. Polityki bezpieczeństwa

### 5.1 CSRF Protection

#### 5.1.1 Strategia
- **SameSite Cookies** (gdy użyjemy cookies w przyszłości)
- **CSRF Tokens** dla state-changing operations
- **Origin/Referer validation** dla POST/PUT/DELETE

#### 5.1.2 Implementacja (Backend)
```typescript
// CSRF Guard
@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Skip dla GET/HEAD/OPTIONS
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      return true;
    }
    
    // Validate Origin/Referer
    const origin = request.headers.origin;
    const referer = request.headers.referer;
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
    
    if (origin && !allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Invalid origin');
    }
    
    return true;
  }
}
```

#### 5.1.3 Implementacja (Frontend)
```typescript
// CSRF Token w headerze dla state-changing requests
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

fetch('/api/v1/tenants', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data),
});
```

### 5.2 Uprawnienia (Permissions)

#### 5.2.1 Role Platformowe
```typescript
enum PlatformRole {
  PLATFORM_ADMIN = 'platform_admin', // Pełny dostęp do platformy
  ORG_OWNER = 'org_owner',            // Właściciel organizacji
  USER = 'user',                      // Zwykły użytkownik
}
```

#### 5.2.2 Role Per-Tenant
```typescript
enum TenantRole {
  ADMIN = 'admin',    // Pełny dostęp w tenant
  EDITOR = 'editor',  // Tworzenie/edycja treści
  VIEWER = 'viewer',  // Tylko odczyt
}
```

#### 5.2.3 Permission Matrix

| Operation | platform_admin | org_owner | user (admin) | user (editor) | user (viewer) |
|-----------|----------------|-----------|--------------|---------------|---------------|
| Create tenant | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all tenants | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite to tenant | ✅ | ✅ | ✅ (w swoim tenant) | ❌ | ❌ |
| Switch to tenant | ✅ | ✅ | ✅ (jeśli członek) | ✅ (jeśli członek) | ✅ (jeśli członek) |
| View tenant CMS | ✅ | ✅ | ✅ (jeśli członek) | ✅ (jeśli członek) | ✅ (jeśli członek) |

#### 5.2.4 Guards Implementation
```typescript
// Platform Admin Guard
@UseGuards(PlatformAdminGuard)
@Post('/api/v1/tenants')
async createTenant() {
  // Tylko platform_admin
}

// Tenant Member Guard
@UseGuards(TenantMemberGuard)
@Get('/api/v1/content')
async getContent(@CurrentTenant() tenantId: string) {
  // Sprawdza członkostwo w tenantId
}

// Role-based Guard
@UseGuards(TenantRoleGuard('admin'))
@Delete('/api/v1/content/:id')
async deleteContent() {
  // Tylko admin w tenant
}
```

### 5.3 Audit Logging

#### 5.3.1 Zdarzenia do logowania
```typescript
enum AuditEvent {
  // Authentication
  GLOBAL_LOGIN = 'global.login',
  GLOBAL_LOGOUT = 'global.logout',
  TENANT_TOKEN_EXCHANGE = 'tenant.token.exchange',
  
  // Tenant Operations
  TENANT_SWITCH = 'tenant.switch',
  TENANT_CREATE = 'tenant.create',
  TENANT_UPDATE = 'tenant.update',
  TENANT_DELETE = 'tenant.delete',
  
  // User Management
  USER_INVITE = 'user.invite',
  USER_ROLE_CHANGE = 'user.role.change',
  USER_REMOVE = 'user.remove',
  
  // Access
  HUB_ACCESS = 'hub.access',
  TENANT_CMS_ACCESS = 'tenant.cms.access',
}
```

#### 5.3.2 Audit Log Schema
```typescript
interface AuditLog {
  id: string;
  event: AuditEvent;
  userId: string;
  tenantId?: string; // null dla operacji platformowych
  metadata: {
    ip?: string;
    userAgent?: string;
    resourceId?: string;
    changes?: Record<string, any>;
  };
  timestamp: Date;
}
```

#### 5.3.3 Implementation
```typescript
// Audit Interceptor
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const event = this.getEventFromRoute(request);
    
    return next.handle().pipe(
      tap(() => {
        this.auditService.log({
          event,
          userId: request.user.id,
          tenantId: request.user.tenantId,
          metadata: {
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            method: request.method,
            path: request.path,
          },
        });
      }),
    );
  }
}
```

### 5.4 Rate Limiting

#### 5.4.1 Limity dla endpointów
```typescript
// Rate limiting configuration
{
  '/auth/login': '5/min per IP+email',
  '/auth/tenant-token': '10/min per user',
  '/me/tenants': '30/min per user',
  '/tenants': '10/min per user (create)',
  '/invitations': '5/min per user',
}
```

#### 5.4.2 Implementation
```typescript
@Throttle(10, 60) // 10 requests per minute
@Post('/api/v1/auth/tenant-token')
async exchangeTenantToken() {
  // ...
}
```

### 5.5 Token Security

#### 5.5.1 Global Token
- **Czas życia:** 7 dni (domyślnie)
- **Claims:** `sub`, `email`, `role` (platform role), `iat`, `exp`
- **NIE zawiera:** `tenantId`
- **Użycie:** Dostęp do Hub, lista tenantów, exchange token

#### 5.5.2 Tenant Token
- **Czas życia:** 1 godzina (krótszy)
- **Claims:** `sub`, `email`, `role` (tenant role), `tenantId`, `iat`, `exp`
- **Zawiera:** `tenantId` (wymagane)
- **Użycie:** Wszystkie operacje w tenant CMS
- **Refresh:** Exchange z global token (bez ponownego logowania)

#### 5.5.3 Token Validation
```typescript
// Backend: JWT Strategy
async validate(payload: JwtPayload) {
  // Global token validation
  if (!payload.tenantId) {
    // Global token - check platform role
    return { ...payload, isGlobal: true };
  }
  
  // Tenant token - verify membership
  const membership = await this.userTenantService.findMembership(
    payload.sub,
    payload.tenantId,
  );
  
  if (!membership) {
    throw new UnauthorizedException('Invalid tenant membership');
  }
  
  return { ...payload, isGlobal: false };
}
```

---

## 6. Scenariusze użytkownika

### 6.1 Scenariusz 1: Pierwsze logowanie
```
1. Użytkownik wchodzi na /login
2. Wypełnia email i password
3. System weryfikuje i zwraca global token
4. Redirect do /dashboard
5. System pobiera listę tenantów użytkownika
6. Wyświetla Hub z listą tenantów
```

### 6.2 Scenariusz 2: Przełączanie między tenantami
```
1. Użytkownik jest w Hub (/dashboard)
2. Klika "Enter CMS" dla tenant "Acme"
3. System wywołuje POST /auth/tenant-token { tenantId: "acme-id" }
4. System otrzymuje tenant-scoped token
5. Redirect do /tenant/acme/*
6. Wszystkie requesty używają tenant tokenu
7. Użytkownik może wrócić do Hub (global token nadal ważny)
```

### 6.3 Scenariusz 3: Wygaśnięcie tenant tokenu
```
1. Użytkownik pracuje w tenant CMS
2. Tenant token wygasa (po 1h)
3. Następny request zwraca 401
4. Frontend automatycznie wywołuje exchange (używając global token)
5. Nowy tenant token zapisany
6. Request powtórzony z nowym tokenem
7. Użytkownik nie zauważa przerwy (seamless refresh)
```

### 6.4 Scenariusz 4: Platform Admin tworzy tenant
```
1. Platform admin w Hub
2. Klika "New Tenant"
3. Wypełnia formularz (name, slug)
4. POST /api/v1/tenants
5. System tworzy tenant i automatycznie dodaje admina jako członka
6. Tenant pojawia się na liście
7. Admin może od razu wejść do CMS
```

---

## 7. Metryki i monitoring

### 7.1 Metryki Hub
- Liczba aktywnych użytkowników w Hub
- Liczba przełączeń tenantów (per user, per tenant)
- Czas spędzony w Hub vs Tenant CMS
- Liczba zaproszeń wysłanych
- Liczba nowych tenantów utworzonych

### 7.2 Metryki bezpieczeństwa
- Liczba nieudanych prób logowania
- Liczba prób dostępu do nieautoryzowanych tenantów
- Liczba wygasłych tokenów (refresh rate)
- Liczba CSRF rejections

---

## 8. Roadmap / Future Enhancements

### 8.1 Phase 2 (Sprint 2)
- [ ] Refresh token dla global tokenu
- [ ] Tenant switcher dropdown w headerze
- [ ] Invite user modal i email system
- [ ] Remember me functionality
- [ ] Forgot password flow

### 8.2 Phase 3 (Sprint 3)
- [ ] Billing dashboard (metodyki użycia)
- [ ] Advanced metrics i analytics
- [ ] Activity feed w Hub
- [ ] Bulk operations (bulk invite, bulk role change)

### 8.3 Phase 4 (Sprint 4)
- [ ] SSO integration (SAML, OAuth)
- [ ] Multi-factor authentication
- [ ] Session management (aktywne sesje, revoke)
- [ ] Advanced audit logs (search, filters, export)

---

## 9. Akceptacja

### 9.1 Checklist
- [x] Spójny UX z minimalnym tarciem (SSO między poziomami)
- [x] Zdefiniowane ekrany i scenariusze
- [x] Specyfikacja przepływów: global login → Hub → switch do tenant
- [x] Polityki bezpieczeństwa (CSRF, uprawnienia, audyt)
- [x] Dokumentacja techniczna endpointów
- [x] Dokumentacja UX mockups/wireframes

### 9.2 Definition of Done
- [x] Dokumentacja architektury i UX przepływów ukończona
- [x] Wszystkie scenariusze użytkownika zdefiniowane
- [x] Polityki bezpieczeństwa udokumentowane
- [x] Mockups/wireframes przygotowane
- [x] Specyfikacja techniczna gotowa do implementacji

---

## 10. Dependencies

- **TNT-004 (RBAC):** ✅ Done - Wymagane dla uprawnień platformowych
- **TNT-021 (User↔Tenant Model):** ⏳ Pending - Wymagane dla członkostwa
- **TNT-022 (Tenant Token Exchange):** ⏳ Pending - Wymagane dla switch flow

---

**Ostatnia aktualizacja:** 2024-01-09  
**Następne kroki:** Implementacja TNT-021 i TNT-022 zgodnie z tą specyfikacją

