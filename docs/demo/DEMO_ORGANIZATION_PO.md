# Demo Organizacja - Specyfikacja Product Owner

**Wersja:** 1.0  
**Data:** 2025-01-20  
**Status:** Gotowe do użycia

---

## 📋 Przegląd Demo Organizacji

Demo organizacja prezentująca pełny flow: **Build → Publish → Marketing** w systemie netflow-cms.

### Organizacja
- **Nazwa**: "TechFlow Solutions"
- **Slug**: `techflow-solutions`
- **Plan**: `professional`
- **Opis**: Firma konsultingowa specjalizująca się w transformacji cyfrowej

### Strona
- **Nazwa**: "TechFlow Solutions - Landing Page"
- **Slug**: `home`
- **Status początkowy**: `DRAFT`
- **Environment**: `DRAFT` → `PRODUCTION` (po publikacji)

---

## 👥 Użytkownicy i Role

### 1. Anna Nowak - **Owner**

**Kim jest:**
- Właściciel organizacji TechFlow Solutions
- Ma pełny dostęp do wszystkich funkcji systemu

**Co robi:**
- Tworzy organizację i stronę
- Przypisuje role użytkownikom
- Zarządza płatnościami i planem
- Może publikować strony i zarządzać marketingiem (ale w demo deleguje to do Marketing Manager)

**Uprawnienia:**
- Wszystkie uprawnienia w organizacji
- `builder.*` (pełny dostęp do buildera)
- `marketing.*` (pełny dostęp do marketingu)
- `billing.*` (zarządzanie planem, faktury)
- `org.roles.manage` (zarządzanie rolami)

---

### 2. Tomasz Wiśniewski - **Editor**

**Kim jest:**
- Content Editor odpowiedzialny za tworzenie i edycję treści
- Nie ma uprawnień do publikacji

**Co robi:**
- Tworzy i edytuje zawartość strony w trybie DRAFT
- Dodaje sekcje, teksty, obrazy
- Zapisuje zmiany jako draft
- **NIE MOŻE** publikować (brak uprawnień `builder.publish`)

**Uprawnienia:**
- `builder.view` (podgląd buildera)
- `builder.edit` (edycja w builderze)
- `builder.draft.save` (zapisywanie draftów)
- `content.create` (tworzenie treści)
- `content.edit` (edycja treści)
- `content.view` (podgląd treści)
- `pages.write` (edycja stron)
- **BRAK**: `pages.publish` (nie może publikować)

---

### 3. Maria Kowalska - **Marketing Manager**

**Kim jest:**
- Marketing Manager odpowiedzialna za publikację i dystrybucję treści
- Łączy content z marketingiem omnichannel

**Co robi:**
- Przegląda zmiany w DRAFT environment
- Publikuje stronę do PRODUCTION (`builder.publish`)
- Tworzy `DistributionDraft` z wersjami postów dla różnych kanałów
- Publikuje treść omnichannel (strona + social media)
- Monitoruje statystyki publikacji

**Uprawnienia:**
- `builder.view` (podgląd buildera)
- `builder.publish` (publikacja stron)
- `marketing.view` (podgląd marketingu)
- `marketing.content.edit` (edycja treści marketingowych)
- `marketing.publish` (publikacja omnichannel)
- `marketing.campaign.manage` (zarządzanie kampaniami)
- `marketing.social.connect` (łączenie kont social media)
- `marketing.stats.view` (statystyki marketingu)

---

## 🎯 Idealna Ścieżka (Happy Path)

```
┌─────────────────────────────────────────────────────────────┐
│                    IDEALNA ŚCIEŻKA DEMO                     │
└─────────────────────────────────────────────────────────────┘

1. SETUP (Owner - Anna)
   └─> Tworzy organizację "TechFlow Solutions"
   └─> Tworzy stronę "home" w statusie DRAFT
   └─> Przypisuje role:
       • Tomasz → Editor
       • Maria → Marketing Manager

2. BUILD (Editor - Tomasz)
   └─> Edytuje stronę w DRAFT environment
   └─> Dodaje sekcje: Hero, Features, Testimonials, CTA
   └─> Zapisuje zmiany (builder.draft.save)
   └─> ❌ Próbuje opublikować → BŁĄD 403 (brak uprawnień)

3. PUBLISH (Marketing Manager - Maria)
   └─> Przegląda zmiany w DRAFT
   └─> Weryfikuje zawartość
   └─> Publikuje do PRODUCTION (builder.publish)
   └─> Strona dostępna publicznie

4. MARKETING (Marketing Manager - Maria)
   └─> Tworzy DistributionDraft z wersjami dla kanałów
   └─> Publikuje omnichannel (marketing.publish)
   └─> Treść na: site + facebook + twitter + linkedin + instagram
   └─> Monitoruje status publikacji
```

---

## 📝 Lista Akcji Krok po Kroku

### FAZA 1: Setup (Owner - Anna)
**Czas**: 5 minut

| # | Akcja | Szczegóły |
|---|-------|----------|
| 1 | Anna loguje się do systemu | Email: `anna.nowak@techflow-solutions.com` |
| 2 | Tworzy organizację | Nazwa: "TechFlow Solutions", Slug: `techflow-solutions`, Plan: `professional` |
| 3 | Tworzy stronę | Nazwa: "TechFlow Solutions - Landing Page", Slug: `home`, Status: `DRAFT` |
| 4 | Zaprasza Tomasza (Editor) | Email: `tomasz.wisniewski@techflow-solutions.com`, Rola: `Editor` (SITE scope) |
| 5 | Zaprasza Marię (Marketing Manager) | Email: `maria.kowalska@techflow-solutions.com`, Rola: `Marketing Manager` (SITE scope) |
| 6 | Weryfikuje przypisanie ról | Sprawdza, że role są poprawnie przypisane |

**Rezultat**: Organizacja gotowa, strona utworzona, użytkownicy przypisani

---

### FAZA 2: Build (Editor - Tomasz)
**Czas**: 10 minut

| # | Akcja | Szczegóły |
|---|-------|----------|
| 1 | Tomasz loguje się do systemu | Email: `tomasz.wisniewski@techflow-solutions.com` |
| 2 | Przechodzi do Page Builder | `/sites/techflow-solutions/panel/page-builder/home` |
| 3 | Widzi stronę w trybie DRAFT | Environment: `DRAFT`, Status: `DRAFT` |
| 4 | Dodaje sekcję Hero | Tytuł: "Transformacja Cyfrowa dla Twojej Firmy", Subtitle, CTA button |
| 5 | Dodaje sekcję Features | 3 usługi: Konsultacje, Wdrożenia, Szkolenia |
| 6 | Dodaje sekcję Testimonials | Opinie klientów |
| 7 | Dodaje sekcję CTA | Call-to-action na końcu strony |
| 8 | Ustawia meta dane SEO | Meta title, description, OG image |
| 9 | Zapisuje draft | Kliknie "Save" → `builder.draft.save`, Status: `DRAFT` |
| 10 | Próbuje opublikować (opcjonalnie) | Kliknie "Publish" → **BŁĄD 403**: "You don't have permission to publish pages" |

**Rezultat**: Strona zaktualizowana w draft, gotowa do publikacji

---

### FAZA 3: Publish (Marketing Manager - Maria)
**Czas**: 5 minut

| # | Akcja | Szczegóły |
|---|-------|----------|
| 1 | Maria loguje się do systemu | Email: `maria.kowalska@techflow-solutions.com` |
| 2 | Przechodzi do Page Builder | `/sites/techflow-solutions/panel/page-builder/home` |
| 3 | Widzi stronę w trybie DRAFT | Z najnowszymi zmianami od Tomasza |
| 4 | Przegląda zmiany | Sprawdza sekcje: Hero, Features, Testimonials, CTA |
| 5 | Weryfikuje zawartość | Sprawdza teksty, obrazy, linki |
| 6 | Publikuje stronę | Kliknie "Publish" → Wybiera target: `PRODUCTION` → Potwierdza |
| 7 | System publikuje | Kopiuje stronę z `DRAFT` do `PRODUCTION`, Status: `PUBLISHED` |
| 8 | Weryfikuje publikację | Sprawdza, że strona jest dostępna w production environment |

**Rezultat**: Strona opublikowana do production, dostępna publicznie

---

### FAZA 4: Marketing (Marketing Manager - Maria)
**Czas**: 10 minut

| # | Akcja | Szczegóły |
|---|-------|----------|
| 1 | Maria przechodzi do Marketing | `/sites/techflow-solutions/panel/marketing` |
| 2 | Tworzy DistributionDraft | Kliknie "Utwórz nowy draft" |
| 3 | Wypełnia formularz draftu | Title: "TechFlow Solutions - Nowa Strona Główna" |
| 4 | Dodaje wersje dla kanałów | JSON z wersjami dla: site, facebook, twitter, linkedin, instagram |
| 5 | Wybiera kanały | `["site", "facebook", "twitter", "linkedin", "instagram"]` |
| 6 | Ustawia status na `ready` | Zmienia status draftu z `draft` na `ready` |
| 7 | Łączy konta social media (opcjonalnie) | Jeśli nie połączone: autoryzuje Facebook, Twitter, LinkedIn, Instagram |
| 8 | Publikuje omnichannel | Wybiera draft → Kliknie "Publikuj" → Wybiera kanały → Potwierdza |
| 9 | System tworzy PublishJob | Status: `pending` → przetwarzanie asynchroniczne |
| 10 | System publikuje do kanałów | Dla każdego kanału: publikuje treść → tworzy `PublishResult` |
| 11 | System aktualizuje status | `PublishJob` status: `completed` |
| 12 | Maria monitoruje wyniki | Przechodzi do "Ostatnie publikacje" → Sprawdza status per kanał |
| 13 | Weryfikuje sukces | Wszystkie kanały pokazują status: `success` ✅ |

**Rezultat**: Treść opublikowana omnichannel na wszystkich wybranych kanałach

---

## 🎯 Kluczowe Punkty Demo

### 1. Separacja ról i uprawnień
- **Editor** może edytować, ale **NIE MOŻE** publikować
- **Marketing Manager** może publikować i zarządzać marketingiem
- **Owner** ma pełny dostęp do wszystkiego

### 2. Environment workflow
- **DRAFT** environment: miejsce do pracy nad zmianami
- **PRODUCTION** environment: publicznie dostępna wersja
- Publikacja kopiuje stronę z DRAFT do PRODUCTION

### 3. Marketing omnichannel
- Jeden `DistributionDraft` z wersjami dla różnych kanałów
- Publikacja równoległa do wielu kanałów jednocześnie
- Monitoring statusu publikacji per kanał

### 4. RBAC w akcji
- Każda akcja weryfikuje capabilities użytkownika
- Editor dostaje 403 przy próbie publikacji
- Marketing Manager może publikować dzięki `marketing.publish`

---

## ✅ Success Criteria

Demo jest udane, jeśli:

1. ✅ **Editor może edytować, ale nie może publikować**
   - Editor zapisuje draft → sukces
   - Editor próbuje opublikować → błąd 403

2. ✅ **Marketing Manager może publikować stronę**
   - Marketing Manager publikuje do PRODUCTION → sukces
   - Strona dostępna w production environment

3. ✅ **Marketing Manager może tworzyć DistributionDraft**
   - Tworzy draft z wersjami dla kanałów → sukces
   - Status zmienia się na `ready`

4. ✅ **Marketing Manager może publikować omnichannel**
   - Publikuje do wybranych kanałów → sukces
   - Wszystkie kanały pokazują status `success`

5. ✅ **Monitoring działa poprawnie**
   - PublishJob pokazuje status `completed`
   - PublishResult dla każdego kanału pokazuje status `success`

---

## 📊 Podsumowanie Czasowe

| Faza | Rola | Czas | Akcje |
|------|------|------|-------|
| **Setup** | Owner | 5 min | 6 akcji |
| **Build** | Editor | 10 min | 10 akcji |
| **Publish** | Marketing Manager | 5 min | 8 akcji |
| **Marketing** | Marketing Manager | 10 min | 13 akcji |
| **RAZEM** | | **30 min** | **37 akcji** |

---

**Data utworzenia**: 2025-01-20  
**Wersja**: 1.0  
**Status**: Gotowe do użycia  
**Autor**: Product Owner

