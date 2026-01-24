# Platform Panel - Dokumentacja Techniczna

**Wersja:** 2.0.0  
**Data:** 2025-01-16  
**Status:** Active  
**Projekt:** Netflow CMS - Platform Hosting + Site Management System

---

## 🎯 Platform Panel vs Site Panel

### Platform Panel (TERAZ) - Panel Zarządzania Platformą

**Cel:** Główny panel administracyjny do zarządzania wszystkimi stronami, użytkownikami, płatnościami i kontem.

**Funkcjonalności:**
- ✅ Zarządzanie stronami (sites) - lista, tworzenie, szczegóły
- ✅ Zarządzanie użytkownikami - role, zaproszenia, uprawnienia per site
- ✅ Zarządzanie płatnościami - subskrypcje, faktury, plany
- ✅ Zarządzanie kontem - profil, dane fakturowe, hasło

**Status:** ✅ **IMPLEMENTOWANY** - Obecny focus projektu

---

### Site Panel / Page Builder (NA PÓŹNIEJ) - Panel Konkretnej Strony

**Cel:** Panel do zarządzania treścią i budowania stron dla konkretnej strony (site).

**Status:** ⏳ **PLANOWANY** - Do implementacji po zakończeniu Platform Panel

**Uwaga:** Page Builder i Site Panel są odkładane na później. Obecnie skupiamy się wyłącznie na Platform Panel.

---

## Spis Treści

1. [Przegląd](#przegląd)
2. [Architektura](#architektura)
3. [Struktura Projektu](#struktura-projektu)
4. [Komponenty](#komponenty)
5. [Routing i Nawigacja](#routing-i-nawigacja)
6. [Autentykacja i Autoryzacja](#autentykacja-i-autoryzacja)
7. [Integracja z API](#integracja-z-api)
8. [Zarządzanie Stanem](#zarządzanie-stanem)
9. [Internacjonalizacja](#internacjonalizacja)
10. [UI Components](#ui-components)
11. [Development Guide](#development-guide)
12. [Best Practices](#best-practices)
13. [Troubleshooting](#troubleshooting)

---

## Przegląd

Platform Panel to aplikacja Next.js 14 służąca do zarządzania platformą hostingową i stronami (sites). Aplikacja umożliwia:

- **Site Management** - zarządzanie wszystkimi stronami z jednego miejsca
- **User Management** - zarządzanie użytkownikami i uprawnieniami per site
- **Billing & Subscriptions** - zarządzanie płatnościami, subskrypcjami i planami
- **Account Management** - zarządzanie kontem użytkownika, danymi fakturowymi
- **RBAC** - kontrola dostępu oparta na rolach

### Stack Technologiczny

- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18
- **Styling:** Tailwind CSS
- **State Management:** Zustand (dla UI state)
- **Internationalization:** next-intl
- **API Client:** Custom wrapper nad `@repo/sdk`
- **Type Safety:** TypeScript 5.3 (strict mode)

---

## Architektura

### Wzorzec Architektoniczny

Aplikacja używa **App Router** z Next.js 14, który wprowadza:

- **Server Components** - domyślnie wszystkie komponenty są server components
- **Client Components** - oznaczone `"use client"` dla interaktywności
- **Server Actions** - dla mutacji danych (opcjonalnie)
- **Route Handlers** - dla API routes (jeśli potrzebne)

### Struktura Routing - Platform Panel

```
# Platform Panel Routes (TERAZ)
/dashboard                    # Platform overview (wymaga global token)
/sites                        # Lista wszystkich stron (wymaga global token)
/sites/new                    # Tworzenie nowej strony
/sites/[slug]                 # Szczegóły strony
/sites/[slug]/users           # Zarządzanie użytkownikami strony
/sites/[slug]/billing         # Billing dla konkretnej strony
/billing                      # Globalny billing overview
/account                      # Ustawienia konta użytkownika
/login                        # Publiczna strona logowania

# Site Panel Routes (NA PÓŹNIEJ - nie implementujemy teraz)
/site/[slug]                # Site dashboard (Page Builder)
/site/[slug]/collections    # Zarządzanie kolekcjami
/site/[slug]/collections/[collectionSlug]/items  # Elementy kolekcji
/site/[slug]/content/[contentTypeSlug]  # Wpisy treści
/site/[slug]/media          # Media library
/site/[slug]/pages          # Page Builder (drag & drop)
/site/[slug]/settings       # Ustawienia strony
```

### Token Management

Aplikacja używa dwóch typów tokenów:

1. **Global Token** (`authToken`) - dla operacji platformowych
   - Przechowywany w `localStorage` jako `authToken`
   - Używany do: `/dashboard`, `/sites`, tworzenia siteów

2. **Site-Scoped Token** (`siteToken:{siteId}`) - dla operacji per-site
   - Przechowywany w `localStorage` jako `siteToken:{siteId}`
   - Automatycznie wymieniany z global token przez `/auth/site-token`
   - Używany do wszystkich operacji w kontekście site

---

## Struktura Projektu

```
apps/admin/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Global Hub
│   │   ├── site/             # Site routes
│   │   │   └── [slug]/         # Dynamic site routes
│   │   ├── login/              # Login page
│   │   ├── layout.tsx          # Root layout
│   │   └── globals.css          # Global styles
│   │
│   ├── components/             # React components
│   │   ├── auth/               # Authentication components
│   │   ├── content/            # Content management components
│   │   ├── i18n/               # Internationalization
│   │   ├── layout/             # Layout components (Sidebar, Topbar)
│   │   └── ui/                 # Reusable UI components
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── useLanguage.ts      # Language management
│   │   └── useTranslations.ts  # Translation hook
│   │
│   ├── lib/                    # Utility libraries
│   │   ├── api.ts              # API client functions
│   │   ├── prefs.ts            # User preferences (localStorage)
│   │   ├── rbac.ts             # Role-based access control
│   │   ├── schema-converter.ts # Schema conversion utilities
│   │   ├── schema-utils.ts    # Schema utilities
│   │   ├── slug.ts             # Slug generation
│   │   └── ui.ts               # UI state management (Zustand)
│   │
│   ├── messages/               # Translation files
│   │   ├── en.json             # English translations
│   │   └── pl.json             # Polish translations
│   │
│   ├── i18n/                   # i18n configuration
│   │   ├── config.ts           # i18n config
│   │   └── routing.ts          # Routing config
│   │
│   └── middleware.ts           # Next.js middleware
│
├── public/                     # Static assets
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

---

## Komponenty

### Layout Components

#### `LayoutWrapper`
Główny wrapper aplikacji, który renderuje:
- `Topbar` - górny pasek z nawigacją
- `Sidebar` - boczna nawigacja
- `ToastProvider` - provider dla powiadomień

**Lokalizacja:** `src/app/LayoutWrapper.tsx`

**Użycie:**
```tsx
<LayoutWrapper>
  {children}
</LayoutWrapper>
```

#### `Sidebar`
Boczna nawigacja z menu głównym. Automatycznie pokazuje liczbę siteów.

**Funkcje:**
- Collapsible (zapisywane w localStorage)
- Aktywne linki podświetlone
- Tooltips gdy zwinięte

**Lokalizacja:** `src/components/layout/Sidebar.tsx`

#### `Topbar`
Górny pasek z:
- Site switcher
- Language toggle
- Theme toggle
- Collapse toggle
- User bar

**Lokalizacja:** `src/components/layout/Topbar.tsx`

### Content Components

#### `DynamicForm`
Dynamiczny formularz generowany na podstawie schema JSON.

**Props:**
```tsx
interface DynamicFormProps {
  schema: Record<string, unknown>;
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel?: () => void;
}
```

**Lokalizacja:** `src/components/content/DynamicForm.tsx`

#### `FieldsEditor`
Edytor pól dla schema kolekcji/typu treści.

**Lokalizacja:** `src/components/content/FieldsEditor.tsx`

#### `ContentWorkflow`
Komponent do zarządzania workflow treści (review, comments).

**Lokalizacja:** `src/components/content/ContentWorkflow.tsx`

### Auth Components

#### `AuthGuard`
Komponent ochrony tras wymagających autentykacji.

**Lokalizacja:** `src/components/auth/AuthGuard.tsx`

---

## Routing i Nawigacja

### Global Routes

#### `/dashboard`
Strona główna Hub - lista siteów użytkownika.

**Funkcje:**
- Lista wszystkich siteów użytkownika
- Quick stats (liczba siteów, kolekcji, media, użytkowników)
- Recent activity
- Site overview z statystykami
- Filtrowanie i grupowanie siteów
- Pin/unpin siteów
- Tworzenie nowego site

**Wymagania:**
- Global token (`authToken`)

#### `/sites`
Strona zarządzania siteami (platform-level).

**Wymagania:**
- Global token
- Platform role: `PLATFORM_ADMIN` lub `PLATFORM_USER`

### Site Routes

Wszystkie trasy pod `/site/[slug]/*` wymagają:
- Site-scoped token
- Poprawnego `siteId` w URL

#### `/site/[slug]`
Dashboard konkretnego site.

#### `/site/[slug]/collections`
Lista kolekcji site.

#### `/site/[slug]/collections/[collectionSlug]/items`
Elementy kolekcji.

#### `/site/[slug]/content/[contentTypeSlug]`
Wpisy treści dla typu treści.

#### `/site/[slug]/media`
Media library site.

#### `/site/[slug]/users`
Zarządzanie użytkownikami site.

#### `/site/[slug]/settings`
Ustawienia site.

### Middleware

Middleware (`src/middleware.ts`) obsługuje:
- Public routes (`/login`, `/`)
- Global routes (`/dashboard`, `/sites`)
- Site routes (`/site/*`)

**Uwaga:** Middleware nie sprawdza tokenów w localStorage (to robią komponenty), ale może być rozszerzony o sprawdzanie cookies/headers.

---

## Autentykacja i Autoryzacja

### Token Flow

1. **Login** → otrzymanie global token
2. **Dashboard** → użycie global token do pobrania listy siteów
3. **Enter Site** → wymiana global token na site-scoped token
4. **Site Operations** → użycie site-scoped token

### Funkcje Token Management

**Lokalizacja:** `src/lib/api.ts`

```typescript
// Global token
getAuthToken(): string | null
setAuthToken(token: string): void

// Site-scoped token
getSiteToken(siteId: string): string | null
setSiteToken(siteId: string, token: string): void

// Clear all tokens
clearAuthTokens(): void

// Exchange global token for site token
exchangeSiteToken(siteId: string): Promise<string>
```

### RBAC (Role-Based Access Control)

**Lokalizacja:** `src/lib/rbac.ts`

Funkcje pomocnicze do sprawdzania uprawnień:

```typescript
canInvite(role: SiteRole): boolean
canManageUsers(role: SiteRole): boolean
canEditContent(role: SiteRole): boolean
canReviewContent(role: SiteRole): boolean
```

**Role:**
- `owner` - pełne uprawnienia
- `admin` - zarządzanie użytkownikami i treścią
- `editor` - edycja treści
- `viewer` - tylko odczyt

### Error Handling

Wszystkie funkcje API automatycznie:
- Sprawdzają 401 Unauthorized
- Czyszczą tokeny przy 401
- Przekierowują do `/login` przy braku autoryzacji

---

## Integracja z API

### API Client

**Lokalizacja:** `src/lib/api.ts`

Wszystkie funkcje API:
- Używają `ensureSiteToken()` dla operacji site
- Używają `getAuthToken()` dla operacji globalnych
- Automatycznie dodają header `Authorization: Bearer {token}`
- Automatycznie dodają header `X-Site-ID: {siteId}` dla operacji site
- Obsługują błędy i przekierowania

### Główne Kategorie API

#### Sites
```typescript
fetchMySites(): Promise<SiteInfo[]>
createSite(payload): Promise<Site>
exchangeSiteToken(siteId): Promise<string>
```

#### Collections
```typescript
fetchSiteCollections(siteId): Promise<CollectionSummary[]>
getCollection(siteId, slug): Promise<Collection>
createCollection(siteId, payload): Promise<CollectionSummary>
updateCollection(siteId, slug, payload): Promise<CollectionSummary>
deleteCollection(siteId, slug): Promise<void>
```

#### Collection Items
```typescript
fetchCollectionItems(siteId, collectionSlug, query?): Promise<{items, total, page, pageSize}>
getCollectionItem(siteId, collectionSlug, itemId): Promise<CollectionItem>
createCollectionItem(siteId, collectionSlug, payload): Promise<CollectionItem>
updateCollectionItem(siteId, collectionSlug, itemId, payload): Promise<CollectionItem>
deleteCollectionItem(siteId, collectionSlug, itemId): Promise<void>
```

#### Content Types & Entries
```typescript
fetchSiteTypes(siteId): Promise<TypeSummary[]>
getContentType(siteId, id): Promise<ContentType>
createType(siteId, payload): Promise<TypeSummary>
updateType(siteId, id, payload): Promise<TypeSummary>
deleteType(siteId, id): Promise<void>

fetchContentEntries(siteId, contentTypeSlug, query?): Promise<{entries, total, page, pageSize}>
getContentEntry(siteId, contentTypeSlug, entryId): Promise<ContentEntry>
createContentEntry(siteId, contentTypeSlug, payload): Promise<ContentEntry>
updateContentEntry(siteId, contentTypeSlug, entryId, payload): Promise<ContentEntry>
deleteContentEntry(siteId, contentTypeSlug, entryId): Promise<void>
```

#### Content Workflow
```typescript
submitContentForReview(siteId, contentTypeSlug, entryId): Promise<Review>
reviewContent(siteId, contentTypeSlug, entryId, status, comment?): Promise<Review>
getContentReviewHistory(siteId, contentTypeSlug, entryId): Promise<Review[]>
createContentComment(siteId, contentTypeSlug, entryId, content): Promise<Comment>
getContentComments(siteId, contentTypeSlug, entryId, includeResolved?): Promise<Comment[]>
updateContentComment(siteId, contentTypeSlug, entryId, commentId, updates): Promise<Comment>
deleteContentComment(siteId, contentTypeSlug, entryId, commentId): Promise<void>
```

#### Media
```typescript
fetchSiteMedia(siteId): Promise<MediaItem[]>
uploadSiteMedia(siteId, file): Promise<MediaItem>
updateMediaItem(siteId, id, payload): Promise<MediaItem>
deleteMediaItem(siteId, id): Promise<void>
```

#### Users & Invites
```typescript
fetchSiteUsers(siteId): Promise<UserSummary[]>
fetchSiteInvites(siteId): Promise<InviteSummary[]>
inviteUser(siteId, payload): Promise<InviteSummary>
revokeInvite(siteId, inviteId): Promise<void>
```

#### Tasks
```typescript
fetchSiteTasks(siteId, filters?): Promise<Task[]>
createTask(siteId, payload): Promise<Task>
updateTask(siteId, id, payload): Promise<Task>
deleteTask(siteId, id): Promise<void>
```

#### Collection Roles
```typescript
fetchCollectionRoles(siteId, collectionId): Promise<CollectionRole[]>
assignCollectionRole(siteId, collectionId, payload): Promise<CollectionRole>
updateCollectionRole(siteId, collectionId, userId, payload): Promise<CollectionRole>
removeCollectionRole(siteId, collectionId, userId): Promise<void>
```

#### Stats & Activity
```typescript
fetchQuickStats(): Promise<QuickStats>
fetchActivity(limit?): Promise<ActivityItem[]>
fetchSiteStats(siteId): Promise<{collections: number, media: number}>
```

### Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

---

## Zarządzanie Stanem

### UI State (Zustand)

**Lokalizacja:** `src/lib/ui.ts`

Zarządzanie stanem UI (sidebar collapsed, theme, etc.) przez Zustand.

### User Preferences (LocalStorage)

**Lokalizacja:** `src/lib/prefs.ts`

Funkcje do zarządzania preferencjami użytkownika:

```typescript
// Last site
setLastSiteSlug(slug: string): void
getLastSiteSlug(): string | null

// Recently used sites
getRecentlyUsedSites(): string[]
clearRecentlyUsedSites(): void

// Pinned sites
getPinnedSites(): string[]
togglePinSite(slug: string): void
isSitePinned(slug: string): boolean
```

### React State

Komponenty używają React hooks (`useState`, `useEffect`) dla:
- Loading states
- Error states
- Form data
- List data (pagination, filters)

---

## Internacjonalizacja

### Konfiguracja

**Lokalizacja:** `src/i18n/config.ts`, `src/i18n/routing.ts`

Aplikacja używa `next-intl` do i18n.

### Supported Languages

- English (`en`)
- Polish (`pl`)

### Translation Files

**Lokalizacja:** `src/messages/en.json`, `src/messages/pl.json`

### Użycie

```tsx
import { useTranslations } from '@/hooks/useTranslations';

function MyComponent() {
  const t = useTranslations();
  return <div>{t('dashboard.title')}</div>;
}
```

### Language Toggle

Komponent `LanguageToggle` (`src/components/ui/LanguageToggle.tsx`) pozwala przełączać język.

---

## UI Components

### Reusable Components

Wszystkie komponenty UI znajdują się w `src/components/ui/`:

- `Badge` - badge/etykieta
- `Breadcrumbs` - breadcrumbs navigation
- `Button` - przycisk
- `Card` - karta
- `CollapseToggle` - toggle sidebar collapse
- `ConfirmDialog` - dialog potwierdzenia
- `EmptyState` - pusty stan
- `Input` - pole input
- `LanguageToggle` - przełącznik języka
- `Modal` - modal dialog
- `SearchAndFilters` - wyszukiwarka i filtry
- `SiteSwitcher` - przełącznik site
- `ThemeToggle` - przełącznik motywu
- `Toast` - powiadomienia toast

### Shared UI Package

Niektóre komponenty pochodzą z `@repo/ui`:
- `LoadingSpinner`
- `EmptyState`
- `Skeleton`

---

## Development Guide

### Setup

1. **Install dependencies:**
```bash
pnpm install
```

2. **Set environment variables:**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

3. **Run development server:**
```bash
pnpm --filter admin dev
```

### Code Structure

#### Creating a New Page

1. Utwórz plik w `src/app/`:
```tsx
// src/app/my-page/page.tsx
export default function MyPage() {
  return <div>My Page</div>;
}
```

2. Dla client-side interactivity:
```tsx
"use client";

export default function MyPage() {
  // Client component code
}
```

#### Creating a New Component

1. Utwórz plik w odpowiednim katalogu:
```tsx
// src/components/my-feature/MyComponent.tsx
"use client";

interface MyComponentProps {
  // props
}

export function MyComponent({}: MyComponentProps) {
  return <div>My Component</div>;
}
```

#### Adding API Function

1. Dodaj funkcję w `src/lib/api.ts`:
```typescript
export async function myApiFunction(siteId: string, payload: any): Promise<MyType> {
  const token = await ensureSiteToken(siteId).catch(() => getAuthToken());
  if (!token) throw new Error('Missing auth token');
  
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const res = await fetch(`${baseUrl}/my-endpoint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Site-ID': siteId,
    },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) {
      handleApiError(res, text);
    }
    throw new Error(`Failed: ${res.status} ${res.statusText}`);
  }
  
  return res.json();
}
```

### Testing

```bash
# Run tests
pnpm --filter admin test

# Watch mode
pnpm --filter admin test:watch

# Coverage
pnpm --filter admin test:coverage
```

### Type Checking

```bash
pnpm --filter admin type-check
```

### Linting

```bash
pnpm --filter admin lint
```

---

## Best Practices

### 1. Client vs Server Components

- **Server Components** (domyślnie) - dla statycznych/seo content
- **Client Components** (`"use client"`) - dla:
  - Interaktywności (onClick, useState, useEffect)
  - Browser APIs (localStorage, window)
  - Hooks (useTranslations, custom hooks)

### 2. Error Handling

Zawsze obsługuj błędy API:

```tsx
try {
  const data = await fetchMySites();
  setSites(data);
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  setError(errorMessage);
  if (error instanceof Error && /Missing auth token/i.test(error.message)) {
    window.location.href = '/login';
  }
}
```

### 3. Loading States

Zawsze pokazuj loading states:

```tsx
const [loading, setLoading] = useState(true);

useEffect(() => {
  (async () => {
    setLoading(true);
    try {
      const data = await fetchData();
      setData(data);
    } finally {
      setLoading(false);
    }
  })();
}, []);

if (loading) return <LoadingSpinner />;
```

### 4. Token Management

- Zawsze używaj `ensureSiteToken()` dla operacji site
- Zawsze sprawdzaj token przed API call
- Obsługuj 401 errors i przekierowania

### 5. Type Safety

- Używaj TypeScript types dla wszystkich API responses
- Nie używaj `any` - zawsze definiuj typy
- Używaj type guards dla runtime checks

### 6. Internationalization

- Zawsze używaj `useTranslations()` zamiast hardcoded strings
- Dodawaj tłumaczenia do `en.json` i `pl.json`

### 7. Component Organization

- Grupuj komponenty według funkcjonalności
- Używaj `ui/` dla reusable components
- Używaj `layout/` dla layout components
- Używaj `content/` dla content management components

### 8. Performance

- Używaj `React.memo()` dla expensive components
- Używaj `useMemo()` i `useCallback()` gdy potrzebne
- Lazy load heavy components z `dynamic()` import

---

## Troubleshooting

### Problem: "Missing auth token" error

**Rozwiązanie:**
1. Sprawdź czy użytkownik jest zalogowany
2. Sprawdź czy token istnieje w localStorage
3. Sprawdź czy backend API działa
4. Sprawdź `NEXT_PUBLIC_API_URL` environment variable

### Problem: 401 Unauthorized

**Rozwiązanie:**
1. Token wygasł - zaloguj się ponownie
2. Token nie jest poprawny - wyczyść localStorage i zaloguj się
3. Backend nie akceptuje token - sprawdź backend logs

### Problem: Cannot connect to backend API

**Rozwiązanie:**
1. Sprawdź czy backend działa (`http://localhost:4000`)
2. Sprawdź `NEXT_PUBLIC_API_URL` environment variable
3. Sprawdź CORS settings w backend
4. Sprawdź network tab w DevTools

### Problem: Site token exchange fails

**Rozwiązanie:**
1. Sprawdź czy global token jest poprawny
2. Sprawdź czy `siteId` jest poprawny
3. Sprawdź backend logs dla `/auth/site-token` endpoint
4. Sprawdź czy użytkownik ma dostęp do site

### Problem: Translations not working

**Rozwiązanie:**
1. Sprawdź czy `IntlProvider` jest w layout
2. Sprawdź czy translation keys istnieją w `messages/*.json`
3. Sprawdź czy `useTranslations()` jest używany poprawnie
4. Sprawdź console dla błędów i18n

### Problem: Sidebar not collapsing

**Rozwiązanie:**
1. Sprawdź czy `useUi()` hook jest używany
2. Sprawdź czy Zustand store jest poprawnie skonfigurowany
3. Sprawdź localStorage dla `nf-sidebar-collapsed`

---

## API Reference Summary

### Authentication
- `getAuthToken()` - pobierz global token
- `setAuthToken(token)` - ustaw global token
- `getSiteToken(siteId)` - pobierz site token
- `setSiteToken(siteId, token)` - ustaw site token
- `exchangeSiteToken(siteId)` - wymień global token na site token
- `clearAuthTokens()` - wyczyść wszystkie tokeny

### Sites
- `fetchMySites()` - pobierz listę siteów użytkownika
- `createSite(payload)` - utwórz nowy site

### Collections
- `fetchSiteCollections(siteId)` - pobierz kolekcje site
- `getCollection(siteId, slug)` - pobierz kolekcję
- `createCollection(siteId, payload)` - utwórz kolekcję
- `updateCollection(siteId, slug, payload)` - zaktualizuj kolekcję
- `deleteCollection(siteId, slug)` - usuń kolekcję

### Collection Items
- `fetchCollectionItems(siteId, collectionSlug, query?)` - pobierz elementy
- `getCollectionItem(siteId, collectionSlug, itemId)` - pobierz element
- `createCollectionItem(siteId, collectionSlug, payload)` - utwórz element
- `updateCollectionItem(siteId, collectionSlug, itemId, payload)` - zaktualizuj element
- `deleteCollectionItem(siteId, collectionSlug, itemId)` - usuń element

### Content Types & Entries
- `fetchSiteTypes(siteId)` - pobierz typy treści
- `getContentType(siteId, id)` - pobierz typ treści
- `createType(siteId, payload)` - utwórz typ treści
- `updateType(siteId, id, payload)` - zaktualizuj typ treści
- `deleteType(siteId, id)` - usuń typ treści
- `fetchContentEntries(siteId, contentTypeSlug, query?)` - pobierz wpisy
- `getContentEntry(siteId, contentTypeSlug, entryId)` - pobierz wpis
- `createContentEntry(siteId, contentTypeSlug, payload)` - utwórz wpis
- `updateContentEntry(siteId, contentTypeSlug, entryId, payload)` - zaktualizuj wpis
- `deleteContentEntry(siteId, contentTypeSlug, entryId)` - usuń wpis

### Content Workflow
- `submitContentForReview(siteId, contentTypeSlug, entryId)` - wyślij do review
- `reviewContent(siteId, contentTypeSlug, entryId, status, comment?)` - zrecenzuj
- `getContentReviewHistory(siteId, contentTypeSlug, entryId)` - pobierz historię review
- `createContentComment(siteId, contentTypeSlug, entryId, content)` - utwórz komentarz
- `getContentComments(siteId, contentTypeSlug, entryId, includeResolved?)` - pobierz komentarze
- `updateContentComment(siteId, contentTypeSlug, entryId, commentId, updates)` - zaktualizuj komentarz
- `deleteContentComment(siteId, contentTypeSlug, entryId, commentId)` - usuń komentarz

### Media
- `fetchSiteMedia(siteId)` - pobierz media
- `uploadSiteMedia(siteId, file)` - prześlij plik
- `updateMediaItem(siteId, id, payload)` - zaktualizuj media
- `deleteMediaItem(siteId, id)` - usuń media

### Users & Invites
- `fetchSiteUsers(siteId)` - pobierz użytkowników
- `fetchSiteInvites(siteId)` - pobierz zaproszenia
- `inviteUser(siteId, payload)` - zaproś użytkownika
- `revokeInvite(siteId, inviteId)` - anuluj zaproszenie

### Tasks
- `fetchSiteTasks(siteId, filters?)` - pobierz zadania
- `createTask(siteId, payload)` - utwórz zadanie
- `updateTask(siteId, id, payload)` - zaktualizuj zadanie
- `deleteTask(siteId, id)` - usuń zadanie

### Collection Roles
- `fetchCollectionRoles(siteId, collectionId)` - pobierz role kolekcji
- `assignCollectionRole(siteId, collectionId, payload)` - przypisz rolę
- `updateCollectionRole(siteId, collectionId, userId, payload)` - zaktualizuj rolę
- `removeCollectionRole(siteId, collectionId, userId)` - usuń rolę

### Stats & Activity
- `fetchQuickStats()` - pobierz quick stats
- `fetchActivity(limit?)` - pobierz aktywność
- `fetchSiteStats(siteId)` - pobierz statystyki site

---

## Changelog

### Version 1.0.0 (2025-01-16)
- Initial documentation
- Complete API reference
- Architecture overview
- Development guide
- Best practices

---

**Ostatnia aktualizacja:** 2025-01-16  
**Wersja dokumentacji:** 1.0.0  
**Autor:** Documentation Agent (AGENT 10)

