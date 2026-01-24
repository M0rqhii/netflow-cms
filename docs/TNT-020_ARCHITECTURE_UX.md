# TNT-020: Architektura i UX przepływów

**Status:** Completed  
**Asignee:** Architecture Agent + Frontend Maestro  
**Story Points:** 5  
**Priority:** P0 (Critical)  
**Completed:** 2024-01-09

---

## 1. Przegląd

Dokumentacja architektury i UX dla globalnego panelu administracyjnego (Platform Admin Hub) - punktu wejścia po logowaniu, który umożliwia zarządzanie wieloma siteami, metrykami i operacjami zarządczymi.

### 1.1 Cele
- Spójny UX z minimalnym tarciem (SSO między poziomami)
- Zdefiniowane ekrany i scenariusze użytkownika
- Bezpieczne przełączanie między siteami bez ponownego logowania
- Polityki bezpieczeństwa dla operacji platformowych

---

## 2. Architektura przepływów

### 2.1 Przepływ główny: Global Login → Hub → Site Switch

```
┌─────────────────┐
│  Global Login   │
│  (bez siteId) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Platform Hub   │
│  (Dashboard)    │
│  - Lista siteów│
│  - Metryki       │
│  - Operacje      │
└────────┬────────┘
         │
         │ [Wybierz site]
         ▼
┌─────────────────┐
│ Site Token    │
│ Exchange        │
│ POST /auth/     │
│ site-token    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Site CMS     │
│  /site/[slug] │
│  (scoped token) │
└─────────────────┘
```

### 2.2 Szczegółowy przepływ autentykacji

#### 2.2.1 Global Login (Poziom Platformy)
```
1. Użytkownik wchodzi na /login
2. Wypełnia formularz (email, password) - BEZ siteId
3. POST /api/v1/auth/login { email, password }
4. Backend weryfikuje użytkownika (globalny token)
5. JWT zawiera: { sub, email, role, platformRole }
   - NIE zawiera siteId (globalny token)
6. Token zapisywany w localStorage jako 'authToken'
7. Redirect do /dashboard (Platform Hub)
```

#### 2.2.2 Platform Hub (Dashboard)
```
1. Użytkownik na /dashboard
2. Aplikacja pobiera listę siteów: GET /api/v1/me/sites
   - Wymaga globalnego tokenu
   - Zwraca: [{ siteId, site: { name, slug }, role }]
3. Wyświetla listę siteów z akcjami:
   - "Enter CMS" - przejście do site CMS
   - "Manage" - zarządzanie siteem (future)
   - "Invite" - zaproszenie użytkownika (future)
```

#### 2.2.3 Site Switch (Bez ponownego logowania)
```
1. Użytkownik klika "Enter CMS" dla wybranego sitea
2. Aplikacja wywołuje: POST /api/v1/auth/site-token { siteId }
   - Wymaga globalnego tokenu w headerze
   - Backend weryfikuje członkostwo użytkownika w siteId
3. Backend generuje site-scoped JWT:
   - { sub, email, role, siteId, exp }
   - Krótszy czas życia (np. 1h vs 7d dla globalnego)
4. Token zapisywany jako `siteToken:{siteId}`
5. Redirect do /site/{slug}/*
6. Wszystkie requesty do site API używają site-scoped tokenu
```

### 2.3 Przepływ zaproszeń (Roadmap)

```
┌─────────────────┐
│  Platform Hub   │
│  - Lista siteów│
└────────┬────────┘
         │
         │ [Kliknij "Invite User"]
         ▼
┌─────────────────┐
│  Invite Modal   │
│  - Email         │
│  - Role          │
│  - Site        │
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
│  Note: No site ID required - this is global login     │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

**Kluczowe elementy:**
- Prosty formularz (email + password)
- Brak pola siteId (globalny login)
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
│  │  │ Sites  │  │  Users   │  │  Active  │  │  Total   │   │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  My Sites                                    [+ New Site]│   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                               │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │  Acme Corporation                    [Site Admin] │   │   │
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
│  │  - Site "Acme" created 2 days ago                        │   │
│  │  - User "jane@acme.com" invited 1 day ago                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

**Kluczowe elementy:**
- Header z logo i menu użytkownika
- Quick stats (metryki platformowe)
- Lista siteów z:
  - Nazwą i slugiem
  - Rolą użytkownika w site
  - Ostatnią aktywnością
  - Akcjami: Enter CMS, Manage, Invite
- Przycisk "New Site" (dla platform_admin)
- Recent Activity (roadmap)

### 3.3 Site Switcher (Dropdown - Future Enhancement)

```
┌─────────────────────────────────────┐
│  Current: Acme Corporation    [▼]   │
├─────────────────────────────────────┤
│  • Acme Corporation (Admin)          │
│  • TechStart Inc (Editor)           │
│  • StartupXYZ (Viewer)              │
│  ─────────────────────────────────  │
│  + Switch to another site          │
│  [Back to Hub]                       │
└─────────────────────────────────────┘
```

**Użycie:**
- Widoczny w headerze podczas pracy w site CMS
- Szybkie przełączanie między siteami
- Powrót do Hub

### 3.4 Invite User Modal (Roadmap)

```
┌─────────────────────────────────────────────┐
│  Invite User to Site          [X]         │
├─────────────────────────────────────────────┤
│                                             │
│  Site: [Acme Corporation        ▼]       │
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
- Wybór sitea (jeśli użytkownik ma wiele siteów)
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
  // NO siteId - global login
}
Response: {
  access_token: string; // Global JWT (bez siteId)
  user: {
    id: string;
    email: string;
    role: string; // Platform role
  }
}
```

#### 4.1.2 Get My Sites
```typescript
GET /api/v1/me/sites
Headers: {
  Authorization: "Bearer {global_token}"
}
Response: {
  sites: Array<{
    siteId: string;
    site: {
      id: string;
      name: string;
      slug: string;
    };
    role: string; // Role w site (admin, editor, viewer)
    joinedAt: string;
    lastActiveAt?: string;
  }>
}
```

#### 4.1.3 Site Token Exchange
```typescript
POST /api/v1/auth/site-token
Headers: {
  Authorization: "Bearer {global_token}"
}
Body: {
  siteId: string;
}
Response: {
  access_token: string; // Site-scoped JWT (z siteId)
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
  
  // Site routes
  if (path.startsWith('/site/')) {
    const siteSlug = extractSiteSlug(path);
    const siteToken = getSiteToken(siteId);
    
    if (!siteToken) {
      // Try to exchange token
      // If fails, redirect to /dashboard
    }
  }
}
```

#### 4.2.2 Site Guard (Backend)
```typescript
// Backend: SiteGuard
// Preferuje siteId z JWT, fallback: X-Site-ID header
@UseGuards(SiteGuard)
@Get('/api/v1/content')
async getContent(@CurrentSite() siteId: string) {
  // siteId z JWT lub header
}
```

### 4.3 State Management (Frontend)

```typescript
// Token storage strategy
localStorage:
  - 'authToken': Global JWT (długi czas życia)
  - 'siteToken:{siteId}': Site-scoped JWT (krótki czas życia)

// Token refresh strategy
- Global token: Refresh przed wygaśnięciem (future)
- Site token: Exchange na żądanie (gdy wygaśnie)
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

fetch('/api/v1/sites', {
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

#### 5.2.2 Role Per-Site
```typescript
enum SiteRole {
  ADMIN = 'admin',    // Pełny dostęp w site
  EDITOR = 'editor',  // Tworzenie/edycja treści
  VIEWER = 'viewer',  // Tylko odczyt
}
```

#### 5.2.3 Permission Matrix

| Operation | platform_admin | org_owner | user (admin) | user (editor) | user (viewer) |
|-----------|----------------|-----------|--------------|---------------|---------------|
| Create site | ✅ | ❌ | ❌ | ❌ | ❌ |
| View all sites | ✅ | ❌ | ❌ | ❌ | ❌ |
| Invite to site | ✅ | ✅ | ✅ (w swoim site) | ❌ | ❌ |
| Switch to site | ✅ | ✅ | ✅ (jeśli członek) | ✅ (jeśli członek) | ✅ (jeśli członek) |
| View site CMS | ✅ | ✅ | ✅ (jeśli członek) | ✅ (jeśli członek) | ✅ (jeśli członek) |

#### 5.2.4 Guards Implementation
```typescript
// Platform Admin Guard
@UseGuards(PlatformAdminGuard)
@Post('/api/v1/sites')
async createSite() {
  // Tylko platform_admin
}

// Site Member Guard
@UseGuards(SiteMemberGuard)
@Get('/api/v1/content')
async getContent(@CurrentSite() siteId: string) {
  // Sprawdza członkostwo w siteId
}

// Role-based Guard
@UseGuards(SiteRoleGuard('admin'))
@Delete('/api/v1/content/:id')
async deleteContent() {
  // Tylko admin w site
}
```

### 5.3 Audit Logging

#### 5.3.1 Zdarzenia do logowania
```typescript
enum AuditEvent {
  // Authentication
  GLOBAL_LOGIN = 'global.login',
  GLOBAL_LOGOUT = 'global.logout',
  TENANT_TOKEN_EXCHANGE = 'site.token.exchange',
  
  // Site Operations
  TENANT_SWITCH = 'site.switch',
  TENANT_CREATE = 'site.create',
  TENANT_UPDATE = 'site.update',
  TENANT_DELETE = 'site.delete',
  
  // User Management
  USER_INVITE = 'user.invite',
  USER_ROLE_CHANGE = 'user.role.change',
  USER_REMOVE = 'user.remove',
  
  // Access
  HUB_ACCESS = 'hub.access',
  TENANT_CMS_ACCESS = 'site.cms.access',
}
```

#### 5.3.2 Audit Log Schema
```typescript
interface AuditLog {
  id: string;
  event: AuditEvent;
  userId: string;
  siteId?: string; // null dla operacji platformowych
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
          siteId: request.user.siteId,
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
  '/auth/site-token': '10/min per user',
  '/me/sites': '30/min per user',
  '/sites': '10/min per user (create)',
  '/invitations': '5/min per user',
}
```

#### 5.4.2 Implementation
```typescript
@Throttle(10, 60) // 10 requests per minute
@Post('/api/v1/auth/site-token')
async exchangeSiteToken() {
  // ...
}
```

### 5.5 Token Security

#### 5.5.1 Global Token
- **Czas życia:** 7 dni (domyślnie)
- **Claims:** `sub`, `email`, `role` (platform role), `iat`, `exp`
- **NIE zawiera:** `siteId`
- **Użycie:** Dostęp do Hub, lista siteów, exchange token

#### 5.5.2 Site Token
- **Czas życia:** 1 godzina (krótszy)
- **Claims:** `sub`, `email`, `role` (site role), `siteId`, `iat`, `exp`
- **Zawiera:** `siteId` (wymagane)
- **Użycie:** Wszystkie operacje w site CMS
- **Refresh:** Exchange z global token (bez ponownego logowania)

#### 5.5.3 Token Validation
```typescript
// Backend: JWT Strategy
async validate(payload: JwtPayload) {
  // Global token validation
  if (!payload.siteId) {
    // Global token - check platform role
    return { ...payload, isGlobal: true };
  }
  
  // Site token - verify membership
  const membership = await this.userSiteService.findMembership(
    payload.sub,
    payload.siteId,
  );
  
  if (!membership) {
    throw new UnauthorizedException('Invalid site membership');
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
5. System pobiera listę siteów użytkownika
6. Wyświetla Hub z listą siteów
```

### 6.2 Scenariusz 2: Przełączanie między siteami
```
1. Użytkownik jest w Hub (/dashboard)
2. Klika "Enter CMS" dla site "Acme"
3. System wywołuje POST /auth/site-token { siteId: "acme-id" }
4. System otrzymuje site-scoped token
5. Redirect do /site/acme/*
6. Wszystkie requesty używają site tokenu
7. Użytkownik może wrócić do Hub (global token nadal ważny)
```

### 6.3 Scenariusz 3: Wygaśnięcie site tokenu
```
1. Użytkownik pracuje w site CMS
2. Site token wygasa (po 1h)
3. Następny request zwraca 401
4. Frontend automatycznie wywołuje exchange (używając global token)
5. Nowy site token zapisany
6. Request powtórzony z nowym tokenem
7. Użytkownik nie zauważa przerwy (seamless refresh)
```

### 6.4 Scenariusz 4: Platform Admin tworzy site
```
1. Platform admin w Hub
2. Klika "New Site"
3. Wypełnia formularz (name, slug)
4. POST /api/v1/sites
5. System tworzy site i automatycznie dodaje admina jako członka
6. Site pojawia się na liście
7. Admin może od razu wejść do CMS
```

---

## 7. Metryki i monitoring

### 7.1 Metryki Hub
- Liczba aktywnych użytkowników w Hub
- Liczba przełączeń siteów (per user, per site)
- Czas spędzony w Hub vs Site CMS
- Liczba zaproszeń wysłanych
- Liczba nowych siteów utworzonych

### 7.2 Metryki bezpieczeństwa
- Liczba nieudanych prób logowania
- Liczba prób dostępu do nieautoryzowanych siteów
- Liczba wygasłych tokenów (refresh rate)
- Liczba CSRF rejections

---

## 8. Roadmap / Future Enhancements

### 8.1 Phase 2 (Sprint 2)
- [ ] Refresh token dla global tokenu
- [ ] Site switcher dropdown w headerze
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
- [x] Specyfikacja przepływów: global login → Hub → switch do site
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
- **TNT-021 (User↔Site Model):** ⏳ Pending - Wymagane dla członkostwa
- **TNT-022 (Site Token Exchange):** ⏳ Pending - Wymagane dla switch flow

---

**Ostatnia aktualizacja:** 2024-01-09  
**Następne kroki:** Implementacja TNT-021 i TNT-022 zgodnie z tą specyfikacją

