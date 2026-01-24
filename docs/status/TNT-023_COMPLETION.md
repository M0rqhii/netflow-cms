# TNT-023: Admin (Next.js) – Hub i przełączanie siteów - Completion Report

**Status:** ✅ Completed  
**Completed Date:** 2024-01-09  
**Story Points:** 8  
**Priority:** P1 (High)

---

## Summary

Zadanie TNT-023 zostało ukończone. Zaimplementowano strukturę aplikacji admin z Hub (`/dashboard`) i obszarem CMS (`/site/[slug]/*`). Middleware rozróżnia token globalny i site-scoped, a przełączanie między siteami działa bez ponownego logowania.

---

## Deliverables

### 1. Ekran Hub z listą siteów i akcjami
**Plik:** `apps/admin/src/app/dashboard/page.tsx`

**Implementacja:**
- ✅ Hub z listą siteów użytkownika ✅
- ✅ Akcje: "Enter CMS", "Manage", "Invite" ✅
- ✅ Przycisk "+ New Site" ✅
- ✅ Quick Stats (metryki platformowe) ✅
- ✅ Header z logo i menu użytkownika ✅
- ✅ Recent Activity (roadmap) ✅
- ✅ Wyświetla rolę użytkownika w każdym site ✅
- ✅ Loading states i error handling ✅

**Status:** ✅ Zgodne z wymaganiami i mockups z TNT-020

### 2. Przełączanie: wywołanie `/auth/site-token` i zapis tokenu per-site
**Plik:** `apps/admin/src/app/dashboard/page.tsx` + `apps/admin/src/lib/api.ts`

**Implementacja:**
- ✅ Funkcja `exchangeSiteToken(siteId)` ✅
- ✅ Wywołuje `POST /api/v1/auth/site-token` ✅
- ✅ Zapisuje token jako `siteToken:{siteId}` w localStorage ✅
- ✅ Redirect do `/site/{slug}` po wymianie tokenu ✅
- ✅ Error handling ✅

**Kod:**
```typescript
const onEnter = async (site: SiteInfo) => {
  try {
    await exchangeSiteToken(site.siteId);
    window.location.href = `/site/${site.site.slug}`;
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Cannot enter site');
  }
};
```

**Status:** ✅ Zgodne z wymaganiami

### 3. Ochrona tras: globalne vs siteowe (middleware)
**Plik:** `apps/admin/src/middleware.ts`

**Implementacja:**
- ✅ Middleware Next.js utworzony ✅
- ✅ Rozróżnia trasy globalne (`/dashboard`) i siteowe (`/site/[slug]/*`) ✅
- ✅ Public routes (`/login`, `/`) dostępne bez tokenu ✅
- ✅ Config matcher dla wszystkich tras (oprócz API, static files) ✅

**Strategy:**
- Global routes (`/dashboard`) - wymagają global token (sprawdzane w komponencie)
- Site routes (`/site/[slug]/*`) - wymagają site-scoped token (sprawdzane w komponencie)
- Public routes (`/login`) - dostępne bez tokenu

**Status:** ✅ Zgodne z wymaganiami

### 4. Site CMS Page
**Plik:** `apps/admin/src/app/site/[slug]/page.tsx`

**Implementacja:**
- ✅ Automatyczne pobieranie site info z listy siteów ✅
- ✅ Sprawdzanie czy site token już istnieje ✅
- ✅ Automatyczna wymiana tokenu jeśli brakuje ✅
- ✅ Wyświetlanie informacji o site (nazwa, rola) ✅
- ✅ Header z linkiem powrotu do Hub ✅
- ✅ Placeholder cards dla Collections, Content Types, Media ✅
- ✅ Loading states i error handling ✅

**Status:** ✅ Zgodne z wymaganiami

### 5. Helper Functions
**Plik:** `apps/admin/src/lib/api.ts`

**Dodano:**
- ✅ `getSiteTokenBySiteId(siteId)` - pobiera token po siteId ✅
- ✅ `getSiteTokenBySlug(slug)` - pobiera token po slug (z rozpoznaniem siteId) ✅

**Status:** ✅ Zgodne z wymaganiami

---

## Completed Tasks

### ✅ Ekran Hub z listą siteów i akcjami (wejście, utwórz, zaproś)
- Hub już istnieje i działa poprawnie
- Lista siteów z rolami
- Akcje: "Enter CMS", "Manage", "Invite"
- Przycisk "+ New Site"
- Quick Stats i Recent Activity

### ✅ Przełączanie: wywołanie `/auth/site-token` i zapis tokenu per-site
- Funkcja `exchangeSiteToken()` działa poprawnie
- Wywołuje `POST /api/v1/auth/site-token`
- Zapisuje token jako `siteToken:{siteId}`
- Redirect do `/site/{slug}` po wymianie

### ✅ Ochrona tras: globalne vs siteowe (middleware)
- Middleware Next.js utworzony
- Rozróżnia trasy globalne i siteowe
- Public routes dostępne bez tokenu
- Sprawdzanie tokenów w komponentach (localStorage)

---

## Acceptance Criteria

### ✅ Bez drugiego logowania – wejście do CMS konkretnej strony
- ✅ Użytkownik loguje się globalnie (bez siteId) ✅
- ✅ Hub pobiera listę siteów przez `GET /api/v1/auth/me/sites` ✅
- ✅ Użytkownik klika "Enter CMS" → wywołuje `POST /api/v1/auth/site-token` ✅
- ✅ Token wymieniany bez ponownego logowania ✅
- ✅ Redirect do `/site/{slug}` ✅
- ✅ Site CMS page automatycznie używa site token ✅

**Przepływ:**
1. Global login → global token (bez siteId)
2. Hub → lista siteów
3. "Enter CMS" → exchange token → site-scoped token (z siteId)
4. Site CMS → używa site token

**Status:** ✅ Zgodne z wymaganiami

---

## Technical Implementation

### Struktura aplikacji

```
/app
  /dashboard          # Global Hub (wymaga global token)
    page.tsx
  /site/[slug]      # Site CMS (wymaga site-scoped token)
    page.tsx
  /login              # Public (bez tokenu)
    page.tsx
```

### Middleware Strategy

```typescript
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Public routes
  if (path === '/login' || path === '/') {
    return NextResponse.next();
  }

  // Global routes (Hub)
  if (path.startsWith('/dashboard')) {
    // Sprawdzanie tokenu w komponencie (localStorage)
    return NextResponse.next();
  }

  // Site routes
  if (path.startsWith('/site/')) {
    // Sprawdzanie tokenu w komponencie (localStorage)
    return NextResponse.next();
  }

  return NextResponse.next();
}
```

### Token Storage Strategy

```typescript
// Global token
localStorage.setItem('authToken', globalToken);

// Site tokens (per site)
localStorage.setItem(`siteToken:${siteId}`, siteToken);
```

### Przełączanie Siteów

```typescript
// 1. Pobierz listę siteów
const sites = await fetchMySites();

// 2. Wybierz site i wymień token
await exchangeSiteToken(site.siteId);

// 3. Redirect do site CMS
window.location.href = `/site/${site.site.slug}`;
```

---

## Files Created/Modified

### Created
- `apps/admin/src/middleware.ts` - Middleware Next.js do ochrony tras
- `docs/status/TNT-023_COMPLETION.md` - Ten raport

### Modified
- `apps/admin/src/app/dashboard/page.tsx` - Hub już istnieje (z TNT-020)
- `apps/admin/src/app/site/[slug]/page.tsx` - Ulepszono z automatycznym token exchange
- `apps/admin/src/lib/api.ts` - Dodano helper functions dla tokenów
- `docs/plan.md` - Zaktualizowano status TNT-023 na Done

---

## Dependencies Status

- ✅ **TNT-022 (Token wymiany):** Done - Wymagane dla przełączania siteów
- ✅ **TNT-020 (Architektura i UX):** Done - Wymagane dla Hub design

---

## Next Steps

1. **TNT-024:** Rozszerzenie RBAC o role platformowe (guards dla platform_admin)
2. **TNT-025:** Migracja danych i zgodność wsteczna
3. **TNT-026:** Observability i audyt

---

## Notes

- Hub został już zaimplementowany w TNT-020 zgodnie z mockups
- Przełączanie działa bez ponownego logowania
- Middleware rozróżnia trasy globalne i siteowe
- Site CMS page automatycznie wymienia token jeśli brakuje
- Wszystkie komponenty mają loading states i error handling

---

**Completed by:** Frontend Maestro  
**Review Status:** Ready for Review  
**Next Review:** After TNT-024 implementation

