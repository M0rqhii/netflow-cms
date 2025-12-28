# Dashboard Organizacji - Projekt Struktury i Logiki

**Data:** 2025-01-20  
**Status:** Projekt  
**Zakres:** Dashboard Organizacji (pierwszy widok po logowaniu)

---

## 1. Cel Dashboardu

Dashboard odpowiada na pytanie: **"Co mam dziś pod kontrolą?"**

Użytkownik po zalogowaniu widzi:
- Stan wszystkich swoich stron
- Co wymaga uwagi (alerty)
- Szybki dostęp do najczęstszych akcji
- Kontekst biznesowy (plan, zużycie)

---

## 2. Warianty Dashboardu per Rola

### 2.1. Org Owner (Właściciel Organizacji)

**Kontekst:** Właściciel odpowiada za biznes, płatności, strategię. Potrzebuje pełnego obrazu + alertów biznesowych.

**Struktura:**

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Nazwa Organizacji + Plan Badge + Quick Actions      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SEKCJA 1: ALERTY (priorytet najwyższy)                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Alerty:                                                  │ │
│ │ - Błędy deploya (ostatnie 24h)                          │ │
│ │ - Brak domeny (strony bez custom domain)                 │ │
│ │ - Przekroczenie limitów planu                            │ │
│ │ - Wyłączone polityki (ważne capabilities)                │ │
│ │ - Problemy z płatnością                                  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SEKCJA 2: INFORMACJE BIZNESOWE                              │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐ │
│ │ Plan:            │ │ Zużycie:         │ │ Płatności:    │ │
│ │ - Nazwa planu    │ │ - Storage (MB)   │ │ - Status      │ │
│ │ - Limit stron    │ │ - API requests   │ │ - Następna    │ │
│ │ - Limit users    │ │ - Bandwidth      │ │   płatność    │ │
│ │ [Upgrade]        │ │ [Szczegóły]      │ │ [Zarządzaj]   │ │
│ └──────────────────┘ └──────────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SEKCJA 3: LISTA STRON (główna treść)                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Filtry: [Wszystkie] [Live] [Draft] [Error] [Szukaj...] │ │
│ │                                                          │ │
│ │ ┌────────────────────────────────────────────────────┐ │ │
│ │ │ KARTA STRONY 1                                      │ │ │
│ │ │ ┌────────────────────────────────────────────────┐ │ │ │
│ │ │ │ Nazwa strony | Status: LIVE | Plan: Pro       │ │ │ │
│ │ │ │ Domena: example.com | Ostatni deploy: 2h temu │ │ │ │
│ │ │ │                                               │ │ │ │
│ │ │ │ Szybkie akcje:                                │ │ │ │
│ │ │ │ [Build] [Publish] [Marketing] [Settings]      │ │ │ │
│ │ │ └────────────────────────────────────────────────┘ │ │ │
│ │ └────────────────────────────────────────────────────┘ │ │ │
│ │                                                          │ │
│ │ ┌────────────────────────────────────────────────────┐ │ │
│ │ │ KARTA STRONY 2                                      │ │ │
│ │ │ ┌────────────────────────────────────────────────┐ │ │ │
│ │ │ │ Nazwa strony | Status: ERROR | Plan: Basic    │ │ │ │
│ │ │ │ ⚠️ Ostatni deploy nieudany (3h temu)           │ │ │ │
│ │ │ │ ❌ Brak domeny                                 │ │ │ │
│ │ │ │                                               │ │ │ │
│ │ │ │ Szybkie akcje:                                │ │ │ │
│ │ │ │ [Build] [Publish] [Marketing] [Settings]      │ │ │ │
│ │ │ └────────────────────────────────────────────────┘ │ │ │
│ │ └────────────────────────────────────────────────────┘ │ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SEKCJA 4: AKTYWNOŚĆ (opcjonalna, zwijana)                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Ostatnie wydarzenia:                                    │ │
│ │ - Deploy strony X (sukces) - 2h temu                   │ │
│ │ - Nowy użytkownik dodany - 5h temu                     │ │
│ │ - Zmiana planu - wczoraj                                │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Hierarchia informacji:**
1. **Alerty** (najwyższy priorytet) - co wymaga natychmiastowej uwagi
2. **Biznes** - plan, zużycie, płatności (kontekst decyzyjny)
3. **Strony** - główna treść, co użytkownik zarządza
4. **Aktywność** - historia (opcjonalna)

**Klikalne elementy:**
- **Plan Badge** → `/org/[orgId]/billing`
- **Upgrade** → `/org/[orgId]/billing/upgrade`
- **Zużycie [Szczegóły]** → `/org/[orgId]/usage`
- **Płatności [Zarządzaj]** → `/org/[orgId]/billing`
- **Karta strony** → `/sites/[slug]`
- **Status strony** → `/sites/[slug]/deployments`
- **[Build]** → `/sites/[slug]/panel/builder`
- **[Publish]** → `/sites/[slug]/panel/deployments` (z akcją publish)
- **[Marketing]** → `/sites/[slug]/panel/marketing`
- **[Settings]** → `/sites/[slug]/settings`
- **Alerty** → odpowiednie strony (deployments, billing, settings)

---

### 2.2. Org Admin (Administrator Organizacji)

**Kontekst:** Admin zarządza technicznymi aspektami, użytkownikami, politykami. Nie ma dostępu do billing, ale ma pełny dostęp techniczny.

**Struktura:**

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Nazwa Organizacji + Plan Badge (tylko widok)        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SEKCJA 1: ALERTY TECHNICZNE                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Alerty:                                                  │ │
│ │ - Błędy deploya (ostatnie 24h)                          │ │
│ │ - Brak domeny (strony bez custom domain)                 │ │
│ │ - Wyłączone polityki (ważne capabilities)               │ │
│ │ - Problemy z hostingiem                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SEKCJA 2: ZUŻYCIE ZASOBÓW                                    │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐ │
│ │ Storage:         │ │ API Requests:    │ │ Bandwidth:   │ │
│ │ - Użyte (MB)     │ │ - Ten miesiąc    │ │ - Ten miesiąc │ │
│ │ - Limit          │ │ - Limit          │ │ - Limit       │ │
│ │ - Procent        │ │ - Procent        │ │ - Procent     │ │
│ │ [Szczegóły]      │ │ [Szczegóły]      │ │ [Szczegóły]   │ │
│ └──────────────────┘ └──────────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SEKCJA 3: LISTA STRON (główna treść)                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Filtry: [Wszystkie] [Live] [Draft] [Error] [Szukaj...] │ │
│ │                                                          │ │
│ │ ┌────────────────────────────────────────────────────┐ │ │
│ │ │ KARTA STRONY 1                                      │ │ │
│ │ │ ┌────────────────────────────────────────────────┐ │ │ │
│ │ │ │ Nazwa strony | Status: LIVE                   │ │ │ │
│ │ │ │ Domena: example.com | Ostatni deploy: 2h temu │ │ │ │
│ │ │ │ Environment: Production                       │ │ │ │
│ │ │ │                                               │ │ │ │
│ │ │ │ Szybkie akcje:                                │ │ │ │
│ │ │ │ [Build] [Publish] [Marketing] [Settings]      │ │ │ │
│ │ │ └────────────────────────────────────────────────┘ │ │ │
│ │ └────────────────────────────────────────────────────┘ │ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SEKCJA 4: SZYBKI DOSTĘP (opcjonalna)                        │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────┐ │
│ │ [Użytkownicy]    │ │ [Role]           │ │ [Polityki]    │ │
│ │ Zarządzaj        │ │ Zarządzaj        │ │ Zarządzaj     │ │
│ │ użytkownikami    │ │ rolami           │ │ politykami    │ │
│ └──────────────────┘ └──────────────────┘ └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Hierarchia informacji:**
1. **Alerty techniczne** - co wymaga naprawy
2. **Zużycie** - monitoring zasobów (bez billing)
3. **Strony** - główna treść
4. **Szybki dostęp** - zarządzanie organizacją

**Klikalne elementy:**
- **Plan Badge** → tylko widok (brak dostępu do billing)
- **Zużycie [Szczegóły]** → `/org/[orgId]/usage`
- **Karta strony** → `/sites/[slug]`
- **Status strony** → `/sites/[slug]/deployments`
- **[Build]** → `/sites/[slug]/panel/builder`
- **[Publish]** → `/sites/[slug]/panel/deployments` (z akcją publish)
- **[Marketing]** → `/sites/[slug]/panel/marketing`
- **[Settings]** → `/sites/[slug]/settings`
- **[Użytkownicy]** → `/org/[orgId]/users`
- **[Role]** → `/org/[orgId]/settings/roles`
- **[Polityki]** → `/org/[orgId]/settings/policies`
- **Alerty** → odpowiednie strony (deployments, settings)

---

### 2.3. Org Member (Członek Organizacji)

**Kontekst:** Member ma minimalne uprawnienia - tylko widok stron i ich statusu. Nie zarządza organizacją.

**Struktura:**

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Nazwa Organizacji + Plan Badge (tylko widok)        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ SEKCJA 1: LISTA STRON (jedyna sekcja)                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Filtry: [Wszystkie] [Live] [Draft] [Szukaj...]         │ │
│ │                                                          │ │
│ │ ┌────────────────────────────────────────────────────┐ │ │
│ │ │ KARTA STRONY 1                                      │ │ │
│ │ │ ┌────────────────────────────────────────────────┐ │ │ │
│ │ │ │ Nazwa strony | Status: LIVE                   │ │ │ │
│ │ │ │ Domena: example.com | Ostatni deploy: 2h temu │ │ │ │
│ │ │ │                                               │ │ │ │
│ │ │ │ Szybkie akcje (tylko jeśli ma capabilities):  │ │ │ │
│ │ │ │ [Build] [Publish] [Marketing] [Settings]      │ │ │ │
│ │ │ │ (akcje widoczne tylko jeśli użytkownik ma     │ │ │ │
│ │ │ │  odpowiednie capabilities dla tej strony)     │ │ │ │
│ │ │ └────────────────────────────────────────────────┘ │ │ │
│ │ └────────────────────────────────────────────────────┘ │ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Hierarchia informacji:**
1. **Strony** - jedyna sekcja (bez alertów, bez biznesu, bez zarządzania)

**Klikalne elementy:**
- **Karta strony** → `/sites/[slug]` (tylko jeśli ma `sites.view`)
- **Status strony** → `/sites/[slug]/deployments` (tylko jeśli ma dostęp)
- **[Build]** → `/sites/[slug]/panel/builder` (tylko jeśli ma `builder.edit`)
- **[Publish]** → `/sites/[slug]/panel/deployments` (tylko jeśli ma `builder.publish`)
- **[Marketing]** → `/sites/[slug]/panel/marketing` (tylko jeśli ma `marketing.view`)
- **[Settings]** → `/sites/[slug]/settings` (tylko jeśli ma `sites.settings.view`)

**Uwaga:** Szybkie akcje są widoczne tylko jeśli użytkownik ma odpowiednie capabilities dla danej strony (sprawdzane per site, nie per org).

---

## 3. Szczegóły Komponentów

### 3.1. Header Dashboardu

**Elementy:**
- **Nazwa organizacji** (tylko widok)
- **Plan Badge** (np. "Free", "Pro", "Enterprise")
  - Owner: klikalny → billing
  - Admin/Member: tylko widok
- **Quick Actions** (opcjonalnie):
  - Owner: [+ Nowa strona] [Użytkownicy] [Billing]
  - Admin: [+ Nowa strona] [Użytkownicy] [Settings]
  - Member: [+ Nowa strona] (tylko jeśli ma `sites.create`)

### 3.2. Sekcja Alertów

**Typy alertów:**

1. **Błędy deploya** (ostatnie 24h)
   - Źródło: `SiteDeployment` gdzie `status = 'failed'` i `createdAt > 24h temu`
   - Format: "Deploy strony [nazwa] nieudany: [message]"
   - Klikalne → `/sites/[slug]/deployments`

2. **Brak domeny**
   - Źródło: Strony bez custom domain (sprawdzić w settings)
   - Format: "[liczba] stron bez domeny"
   - Klikalne → `/sites/[slug]/settings` (dla każdej strony)

3. **Przekroczenie limitów planu** (tylko Owner)
   - Źródło: `UsageTracking` vs `PlanConfig.limits`
   - Format: "Przekroczono limit [typ]: [użyte]/[limit]"
   - Klikalne → `/org/[orgId]/usage` lub `/org/[orgId]/billing/upgrade`

4. **Wyłączone polityki** (ważne capabilities)
   - Źródło: `OrgPolicy` gdzie `enabled = false` i `capability.canBePolicyControlled = true`
   - Format: "Polityka [nazwa capability] wyłączona"
   - Klikalne → `/org/[orgId]/settings/policies`

5. **Problemy z płatnością** (tylko Owner)
   - Źródło: `Subscription` gdzie `status != 'active'`
   - Format: "Problemy z płatnością: [status]"
   - Klikalne → `/org/[orgId]/billing`

**Priorytetyzacja:**
- Alerty są sortowane: błędy deploya > przekroczenie limitów > brak domeny > polityki > płatności
- Maksymalnie 5 alertów na raz (reszta w "Zobacz więcej")

### 3.3. Sekcja Informacji Biznesowych (Owner)

**Blok 1: Plan**
- Nazwa planu (np. "Professional")
- Limity: strony, użytkownicy, storage
- Przycisk [Upgrade] → `/org/[orgId]/billing/upgrade`

**Blok 2: Zużycie**
- Storage: użyte MB / limit MB (procent)
- API requests: ten miesiąc / limit (procent)
- Bandwidth: ten miesiąc / limit (procent)
- Przycisk [Szczegóły] → `/org/[orgId]/usage`

**Blok 3: Płatności**
- Status subskrypcji (active, past_due, canceled)
- Następna płatność (data)
- Przycisk [Zarządzaj] → `/org/[orgId]/billing`

### 3.4. Sekcja Zużycia Zasobów (Admin)

**Blok 1: Storage**
- Użyte MB / limit MB
- Procent wykorzystania
- Przycisk [Szczegóły] → `/org/[orgId]/usage`

**Blok 2: API Requests**
- Ten miesiąc / limit
- Procent wykorzystania
- Przycisk [Szczegóły] → `/org/[orgId]/usage`

**Blok 3: Bandwidth**
- Ten miesiąc / limit
- Procent wykorzystania
- Przycisk [Szczegóły] → `/org/[orgId]/usage`

### 3.5. Sekcja Listy Stron

**Filtry:**
- [Wszystkie] [Live] [Draft] [Error] [Szukaj...]
- Filtry działają na statusie strony (agregacja statusów stron w environment PRODUCTION)

**Karta strony zawiera:**

1. **Nagłówek karty:**
   - Nazwa strony (klikalna → `/sites/[slug]`)
   - Status badge (LIVE / DRAFT / ERROR)
   - Plan badge (tylko Owner/Admin)

2. **Informacje:**
   - Domena (jeśli ustawiona) lub "Brak domeny"
   - Ostatni deploy: czas + status (sukces/błąd)
   - Environment: Production / Draft

3. **Alerty per strona** (jeśli są):
   - ⚠️ Ostatni deploy nieudany
   - ❌ Brak domeny
   - ⚠️ Przekroczone limity (tylko Owner)

4. **Szybkie akcje:**
   - **[Build]** → `/sites/[slug]/panel/builder` (jeśli ma `builder.edit`)
   - **[Publish]** → `/sites/[slug]/panel/deployments` z akcją publish (jeśli ma `builder.publish`)
   - **[Marketing]** → `/sites/[slug]/panel/marketing` (jeśli ma `marketing.view`)
   - **[Settings]** → `/sites/[slug]/settings` (jeśli ma `sites.settings.view`)

**Status strony:**
- **LIVE**: Strona ma przynajmniej jedną stronę (Page) w environment PRODUCTION ze statusem PUBLISHED
- **DRAFT**: Strona ma strony w environment DRAFT, ale brak PUBLISHED w PRODUCTION
- **ERROR**: Ostatni deploy (SiteDeployment) dla tej strony miał status 'failed' w ciągu ostatnich 7 dni

**Sortowanie:**
- Domyślnie: ostatnia aktywność (ostatni deploy lub update)
- Możliwość sortowania: nazwa A-Z, ostatnia aktywność, status

### 3.6. Sekcja Szybkiego Dostępu (Admin)

**Bloki:**
- **[Użytkownicy]** → `/org/[orgId]/users`
- **[Role]** → `/org/[orgId]/settings/roles`
- **[Polityki]** → `/org/[orgId]/settings/policies`

### 3.7. Sekcja Aktywności (Owner, opcjonalna)

**Zawartość:**
- Ostatnie wydarzenia z `SiteEvent` i `AuditLog`
- Format: "Deploy strony X (sukces) - 2h temu"
- Maksymalnie 5 ostatnich wydarzeń
- Możliwość zwinięcia/rozwinięcia

---

## 4. Logika Wyświetlania

### 4.1. Sprawdzanie Uprawnień

**Per rola organizacyjna:**
- Owner: wszystkie sekcje
- Admin: bez sekcji biznesowej (billing), ale z zużyciem
- Member: tylko lista stron

**Per capability:**
- Szybkie akcje są widoczne tylko jeśli użytkownik ma odpowiednie capabilities dla danej strony
- Sprawdzanie: `UserRole` + `RoleCapability` dla scope SITE (nie ORG)

### 4.2. Agregacja Danych

**Status strony:**
```typescript
// Pseudokod
function getSiteStatus(site: Tenant): 'LIVE' | 'DRAFT' | 'ERROR' {
  // 1. Sprawdź czy jest ERROR (ostatni deploy failed w 7 dni)
  const lastFailedDeploy = await getLastFailedDeploy(site.id, 7 days);
  if (lastFailedDeploy) return 'ERROR';
  
  // 2. Sprawdź czy jest LIVE (przynajmniej jedna strona PUBLISHED w PRODUCTION)
  const productionEnv = await getEnvironment(site.id, 'PRODUCTION');
  const publishedPages = await getPages(site.id, productionEnv.id, 'PUBLISHED');
  if (publishedPages.length > 0) return 'LIVE';
  
  // 3. W przeciwnym razie DRAFT
  return 'DRAFT';
}
```

**Alerty:**
- Agregacja z wielu źródeł (deployments, usage, policies, billing)
- Priorytetyzacja i limitowanie (max 5)

### 4.3. Performance

**Lazy loading:**
- Sekcja aktywności: ładowana na żądanie (zwijana domyślnie)
- Lista stron: paginacja (np. 10 na stronę)

**Caching:**
- Status strony: cache 5 minut
- Alerty: cache 1 minuta
- Zużycie: cache 5 minut

---

## 5. Uzasadnienie "Dlaczego to domyka system?"

### 5.1. Odpowiada na Pytanie "Co mam dziś pod kontrolą?"

Dashboard jest pierwszym widokiem po logowaniu, więc musi:
- **Pokazać stan** - wszystkie strony i ich statusy
- **Zasygnalizować problemy** - alerty na górze
- **Umożliwić działanie** - szybkie akcje bezpośrednio z dashboardu
- **Dać kontekst** - plan, zużycie, płatności (dla Owner)

### 5.2. Respektuje System RBAC

- **Różne widoki per rola** - Owner widzi biznes, Admin techniczne, Member tylko strony
- **Capabilities per akcja** - szybkie akcje widoczne tylko jeśli użytkownik ma uprawnienia
- **Scope SITE vs ORG** - sprawdzanie uprawnień per strona, nie per organizacja

### 5.3. Integruje Wszystkie Moduły

- **Sites** - lista stron (główna treść)
- **Deployments** - statusy, błędy deploya
- **Billing** - plan, płatności, limity (Owner)
- **Usage** - zużycie zasobów (Owner/Admin)
- **Policies** - alerty o wyłączonych politykach
- **RBAC** - sprawdzanie uprawnień per akcja

### 5.4. Skalowalny i Rozszerzalny

- **Modularna struktura** - sekcje można dodawać/usuwać
- **Lazy loading** - sekcja aktywności opcjonalna
- **Paginacja** - lista stron skalowalna
- **Cache** - wydajność przy dużej liczbie stron

### 5.5. UX Best Practices

- **Hierarchia informacji** - alerty na górze, strony w centrum
- **Szybkie akcje** - bezpośredni dostęp do najczęstszych operacji
- **Kontekst** - plan, zużycie, płatności w jednym miejscu
- **Filtrowanie** - łatwe znajdowanie stron po statusie

---

## 6. Implementacja - Endpointy API

### 6.1. GET /orgs/:orgId/dashboard

**Response dla Owner:**
```typescript
{
  alerts: Alert[];
  business: {
    plan: PlanInfo;
    usage: UsageInfo;
    billing: BillingInfo;
  };
  sites: SiteCard[];
  activity?: ActivityItem[]; // opcjonalne
}
```

**Response dla Admin:**
```typescript
{
  alerts: Alert[];
  usage: UsageInfo;
  sites: SiteCard[];
  quickAccess: QuickAccessItem[];
}
```

**Response dla Member:**
```typescript
{
  sites: SiteCard[];
}
```

### 6.2. Typy Danych

```typescript
type Alert = {
  id: string;
  type: 'deployment_error' | 'missing_domain' | 'limit_exceeded' | 'policy_disabled' | 'billing_issue';
  severity: 'high' | 'medium' | 'low';
  message: string;
  siteId?: string;
  actionUrl: string;
};

type SiteCard = {
  id: string;
  slug: string;
  name: string;
  status: 'LIVE' | 'DRAFT' | 'ERROR';
  domain?: string;
  lastDeploy?: {
    time: string;
    status: 'success' | 'failed';
    message?: string;
  };
  plan?: string; // tylko Owner/Admin
  alerts?: Alert[]; // alerty per strona
  quickActions: QuickAction[]; // filtrowane per capabilities
};

type QuickAction = {
  label: string;
  url: string;
  capability?: string; // wymagane capability
};
```

---

## 7. Podsumowanie

Dashboard Organizacji to:
- **Centralny punkt kontroli** - wszystkie strony w jednym miejscu
- **System alertów** - co wymaga uwagi
- **Szybkie akcje** - bezpośredni dostęp do operacji
- **Kontekst biznesowy** - plan, zużycie, płatności (per rola)
- **Respektuje RBAC** - różne widoki i akcje per rola i capability

**Kluczowe decyzje:**
1. Alerty na górze (najwyższy priorytet)
2. Różne sekcje per rola (Owner: biznes, Admin: techniczne, Member: tylko strony)
3. Szybkie akcje per capability (sprawdzane per strona)
4. Status strony = agregacja (LIVE/DRAFT/ERROR)
5. Lazy loading i cache dla wydajności

---

**Koniec projektu.**

