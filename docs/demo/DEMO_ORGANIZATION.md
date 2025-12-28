# Demo Organizacja - Specyfikacja

## 📋 Przegląd

Demo organizacja prezentująca pełny flow: **Build → Publish → Marketing** w systemie netflow-cms.

---

## 🏢 Organizacja

### Podstawowe dane
- **Nazwa**: "TechFlow Solutions"
- **Slug**: `techflow-solutions`
- **Plan**: `professional`
- **Opis**: Firma konsultingowa specjalizująca się w transformacji cyfrowej

### Strona (Site)
- **Nazwa strony**: "TechFlow Solutions - Landing Page"
- **Slug**: `home`
- **Tytuł**: "TechFlow Solutions - Transformacja Cyfrowa"
- **Status początkowy**: `DRAFT`
- **Environment**: `DRAFT` → `PRODUCTION` (po publikacji)

### Zawartość strony (Content JSON)
```json
{
  "sections": [
    {
      "type": "hero",
      "title": "Transformacja Cyfrowa dla Twojej Firmy",
      "subtitle": "Pomagamy firmom wykorzystać pełny potencjał technologii",
      "cta": {
        "text": "Skontaktuj się z nami",
        "link": "/contact"
      },
      "backgroundImage": "/images/hero-bg.jpg"
    },
    {
      "type": "features",
      "title": "Nasze Usługi",
      "items": [
        {
          "title": "Konsultacje Strategiczne",
          "description": "Pomagamy zaplanować transformację cyfrową",
          "icon": "strategy"
        },
        {
          "title": "Wdrożenia Technologiczne",
          "description": "Implementujemy nowoczesne rozwiązania",
          "icon": "implementation"
        },
        {
          "title": "Szkolenia i Wsparcie",
          "description": "Przeszkalamy zespoły i zapewniamy wsparcie",
          "icon": "training"
        }
      ]
    },
    {
      "type": "testimonials",
      "title": "Co mówią nasi klienci",
      "items": [
        {
          "name": "Jan Kowalski",
          "company": "ABC Corp",
          "text": "TechFlow pomogło nam zmodernizować nasze procesy",
          "rating": 5
        }
      ]
    },
    {
      "type": "cta",
      "title": "Gotowy na transformację?",
      "subtitle": "Skontaktuj się z nami już dziś",
      "buttonText": "Umów bezpłatną konsultację",
      "buttonLink": "/contact"
    }
  ],
  "seo": {
    "metaTitle": "TechFlow Solutions - Transformacja Cyfrowa",
    "metaDescription": "Pomagamy firmom w transformacji cyfrowej. Konsultacje, wdrożenia, szkolenia.",
    "ogImage": "/images/og-image.jpg"
  }
}
```

---

## 👥 Użytkownicy i Role

### 1. Anna Nowak - Owner
- **Email**: `anna.nowak@techflow-solutions.com`
- **Rola ORG**: `Org Owner` (SYSTEM, ORG scope)
- **Rola SITE**: `Owner` (SYSTEM, SITE scope)
- **Uprawnienia**:
  - Wszystkie capabilities w organizacji
  - `billing.*` (zarządzanie planem, faktury)
  - `org.roles.manage` (zarządzanie rolami)
  - `org.policies.manage` (zarządzanie politykami)
  - `builder.*` (pełny dostęp do buildera)
  - `marketing.*` (pełny dostęp do marketingu)
  - `sites.*` (zarządzanie stronami)

**Zadania w demo**:
- Tworzy organizację i stronę
- Przypisuje role użytkownikom
- Publikuje stronę do production
- Zarządza marketingiem (opcjonalnie)

---

### 2. Tomasz Wiśniewski - Editor
- **Email**: `tomasz.wisniewski@techflow-solutions.com`
- **Rola ORG**: `Org Member` (SYSTEM, ORG scope)
- **Rola SITE**: `Editor` (SYSTEM, SITE scope)
- **Uprawnienia**:
  - `org.view_dashboard` (podgląd dashboardu)
  - `sites.view` (podgląd stron)
  - `builder.view` (podgląd buildera)
  - `builder.edit` (edycja w builderze)
  - `builder.draft.save` (zapisywanie draftów)
  - `content.create` (tworzenie treści)
  - `content.edit` (edycja treści)
  - `content.view` (podgląd treści)
  - **BRAK**: `builder.publish` (nie może publikować)

**Zadania w demo**:
- Tworzy/edytuje zawartość strony w draft environment
- Dodaje sekcje, teksty, obrazy
- Zapisuje zmiany jako draft
- **NIE MOŻE** publikować (brak uprawnień)

---

### 3. Maria Kowalska - Marketing Manager
- **Email**: `maria.kowalska@techflow-solutions.com`
- **Rola ORG**: `Org Member` (SYSTEM, ORG scope)
- **Rola SITE**: `Marketing Manager` (SYSTEM, SITE scope)
- **Uprawnienia**:
  - `org.view_dashboard` (podgląd dashboardu)
  - `sites.view` (podgląd stron)
  - `builder.view` (podgląd buildera)
  - `marketing.view` (podgląd marketingu)
  - `marketing.content.edit` (edycja treści marketingowych)
  - `marketing.publish` (publikacja omnichannel)
  - `marketing.campaign.manage` (zarządzanie kampaniami)
  - `marketing.social.connect` (łączenie kont social media)
  - `marketing.stats.view` (statystyki marketingu)
  - `builder.publish` (może publikować strony)

**Zadania w demo**:
- Publikuje stronę do production (po edycji przez Editora)
- Tworzy `DistributionDraft` z wersjami postów dla różnych kanałów
- Publikuje treść omnichannel (strona + social media)
- Monitoruje statystyki publikacji

---

## 🔄 Happy Path - Flow Krok po Kroku

### FAZA 1: Setup (Owner)
**Czas**: 5 minut

1. **Anna (Owner)** loguje się do systemu
2. Tworzy organizację "TechFlow Solutions" (slug: `techflow-solutions`)
3. Tworzy stronę "TechFlow Solutions - Landing Page" (slug: `home`)
4. Przypisuje role:
   - **Tomasz (Editor)**: rola `Editor` (SITE scope)
   - **Maria (Marketing Manager)**: rola `Marketing Manager` (SITE scope)
5. Strona jest w statusie `DRAFT` w environment `DRAFT`

**Rezultat**: Organizacja gotowa, strona utworzona, użytkownicy przypisani

---

### FAZA 2: Build (Editor)
**Czas**: 10 minut

1. **Tomasz (Editor)** loguje się do systemu
2. Przechodzi do strony `/sites/techflow-solutions/panel/page-builder/home`
3. Widzi stronę w trybie `DRAFT` (environment: `DRAFT`)
4. **Edycja zawartości**:
   - Dodaje sekcję Hero z tytułem i CTA
   - Dodaje sekcję Features z 3 usługami
   - Dodaje sekcję Testimonials z opiniami klientów
   - Dodaje sekcję CTA na końcu
   - Ustawia meta dane SEO
5. **Zapisuje draft** (`builder.draft.save`):
   - Kliknie "Save" → strona zapisana w `DRAFT` environment
   - Status: `DRAFT`
   - Zmiany widoczne tylko w draft environment
6. **Próbuje opublikować** (opcjonalnie - pokazuje brak uprawnień):
   - Kliknie "Publish" → **BŁĄD 403**: Brak uprawnień `builder.publish`
   - Komunikat: "You don't have permission to publish pages"

**Rezultat**: Strona zaktualizowana w draft, gotowa do publikacji

---

### FAZA 3: Publish (Marketing Manager)
**Czas**: 5 minut

1. **Maria (Marketing Manager)** loguje się do systemu
2. Przechodzi do strony `/sites/techflow-solutions/panel/page-builder/home`
3. Widzi stronę w trybie `DRAFT` z najnowszymi zmianami od Tomasza
4. **Przegląda zmiany**:
   - Sprawdza sekcje dodane przez Editora
   - Weryfikuje zawartość
5. **Publikuje stronę** (`builder.publish`):
   - Kliknie "Publish"
   - Wybiera target environment: `PRODUCTION`
   - Potwierdza publikację
   - System:
     - Kopiuje stronę z `DRAFT` do `PRODUCTION` environment
     - Ustawia status: `PUBLISHED`
     - Ustawia `publishedAt`: aktualna data
     - Tworzy `SiteDeployment` record
     - Loguje event: `page_published`
6. **Weryfikacja**:
   - Strona dostępna w production environment
   - Status: `PUBLISHED`
   - Zmiany widoczne publicznie

**Rezultat**: Strona opublikowana do production, dostępna publicznie

---

### FAZA 4: Marketing (Marketing Manager)
**Czas**: 10 minut

1. **Maria (Marketing Manager)** przechodzi do `/sites/techflow-solutions/panel/marketing`
2. **Tworzy DistributionDraft** (`marketing.content.edit`):
   - Kliknie "Utwórz nowy draft"
   - Wypełnia formularz:
     - **Title**: "TechFlow Solutions - Nowa Strona Główna"
     - **Content** (JSON z wersjami dla kanałów):
       ```json
       {
         "site": {
           "title": "TechFlow Solutions - Transformacja Cyfrowa",
           "description": "Pomagamy firmom w transformacji cyfrowej"
         },
         "facebook": {
           "message": "🚀 Nowa strona główna TechFlow Solutions! Odkryj nasze usługi transformacji cyfrowej. #DigitalTransformation #TechFlow",
           "image": "/images/og-image.jpg"
         },
         "twitter": {
           "message": "🚀 Nowa strona główna TechFlow Solutions! Odkryj nasze usługi transformacji cyfrowej. #DigitalTransformation",
           "image": "/images/og-image.jpg"
         },
         "linkedin": {
           "message": "Poznaj TechFlow Solutions - ekspertów w transformacji cyfrowej. Konsultacje, wdrożenia, szkolenia. Sprawdź naszą nową stronę główną!",
           "image": "/images/og-image.jpg"
         },
         "instagram": {
           "caption": "🚀 Nowa strona główna TechFlow Solutions! Odkryj nasze usługi transformacji cyfrowej. #DigitalTransformation #TechFlow #Business",
           "image": "/images/og-image.jpg"
         }
       }
       ```
     - **Channels**: `["site", "facebook", "twitter", "linkedin", "instagram"]`
     - **ContentId**: ID opublikowanej strony (opcjonalne)
     - **CampaignId**: null (może być powiązane z kampanią)
   - Status: `draft` → zmienia na `ready`
3. **Łączy konta social media** (opcjonalnie, jeśli nie połączone):
   - Kliknie "Połącz konto" dla Facebook, Twitter, LinkedIn, Instagram
   - Autoryzuje połączenia (stub w demo)
4. **Publikuje omnichannel** (`marketing.publish`):
   - Wybiera draft ze statusem `ready`
   - Kliknie "Publikuj"
   - Wybiera kanały: `["site", "facebook", "twitter", "linkedin", "instagram"]`
   - Potwierdza publikację
   - System:
     - Tworzy `PublishJob` ze statusem `pending`
     - Dla każdego kanału:
       - Publikuje treść (stub - w produkcji użyj integracji z API)
       - Tworzy `PublishResult` z statusem `success`/`failed`
     - Aktualizuje `PublishJob` status: `completed`
5. **Monitoruje wyniki**:
   - Przechodzi do sekcji "Ostatnie publikacje"
   - Widzi `PublishJob` z statusem `completed`
   - Sprawdza `PublishResult` dla każdego kanału:
     - `site`: ✅ `success`
     - `facebook`: ✅ `success`
     - `twitter`: ✅ `success`
     - `linkedin`: ✅ `success`
     - `instagram`: ✅ `success`

**Rezultat**: Treść opublikowana omnichannel na wszystkich wybranych kanałach

---

## 📊 Podsumowanie Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DEMO ORGANIZATION FLOW                   │
└─────────────────────────────────────────────────────────────┘

1. SETUP (Owner - Anna)
   └─> Tworzy organizację + stronę
   └─> Przypisuje role użytkownikom

2. BUILD (Editor - Tomasz)
   └─> Edytuje stronę w DRAFT environment
   └─> Zapisuje zmiany (builder.draft.save)
   └─> ❌ NIE MOŻE publikować (brak builder.publish)

3. PUBLISH (Marketing Manager - Maria)
   └─> Przegląda zmiany w DRAFT
   └─> Publikuje do PRODUCTION (builder.publish)
   └─> Strona dostępna publicznie

4. MARKETING (Marketing Manager - Maria)
   └─> Tworzy DistributionDraft (marketing.content.edit)
   └─> Publikuje omnichannel (marketing.publish)
   └─> Treść na: site + facebook + twitter + linkedin + instagram
```

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

## 📝 Checklist Demo

### Przed demo
- [ ] Utworzyć organizację "TechFlow Solutions"
- [ ] Utworzyć stronę "home" w DRAFT environment
- [ ] Utworzyć 3 użytkowników z odpowiednimi rolami
- [ ] Sprawdzić, że role mają właściwe capabilities
- [ ] Przygotować przykładową zawartość strony (JSON)

### Podczas demo
- [ ] **Setup**: Owner tworzy organizację i przypisuje role
- [ ] **Build**: Editor edytuje stronę i zapisuje draft
- [ ] **Build**: Editor próbuje opublikować → pokazuje błąd 403
- [ ] **Publish**: Marketing Manager publikuje do production
- [ ] **Marketing**: Marketing Manager tworzy DistributionDraft
- [ ] **Marketing**: Marketing Manager publikuje omnichannel
- [ ] **Marketing**: Marketing Manager sprawdza status publikacji

### Po demo
- [ ] Weryfikacja: strona dostępna w production
- [ ] Weryfikacja: PublishJob zakończony sukcesem
- [ ] Weryfikacja: PublishResult dla wszystkich kanałów = success

---

## 🔧 Dane Techniczne

### Modele danych używane w demo

1. **Tenant** (organizacja)
   - `id`: UUID
   - `name`: "TechFlow Solutions"
   - `slug`: "techflow-solutions"
   - `plan`: "professional"

2. **User** (użytkownicy)
   - 3 użytkowników z odpowiednimi `tenantId`

3. **Role** (role systemowe)
   - `Org Owner` (ORG scope)
   - `Org Member` (ORG scope)
   - `Owner` (SITE scope)
   - `Editor` (SITE scope)
   - `Marketing Manager` (SITE scope)

4. **UserRole** (przypisania ról)
   - Anna: `Org Owner` (ORG) + `Owner` (SITE)
   - Tomasz: `Org Member` (ORG) + `Editor` (SITE)
   - Maria: `Org Member` (ORG) + `Marketing Manager` (SITE)

5. **Page** (strona)
   - 2 wersje: DRAFT i PRODUCTION (po publikacji)
   - `slug`: "home"
   - `content`: JSON z sekcjami

6. **DistributionDraft** (draft marketingu)
   - `title`: "TechFlow Solutions - Nowa Strona Główna"
   - `content`: JSON z wersjami dla kanałów
   - `channels`: ["site", "facebook", "twitter", "linkedin", "instagram"]
   - `status`: "ready"

7. **PublishJob** (job publikacji)
   - `status`: "completed"
   - `channels`: ["site", "facebook", "twitter", "linkedin", "instagram"]

8. **PublishResult** (wyniki publikacji per kanał)
   - 5 wyników (jeden per kanał)
   - `status`: "success" dla wszystkich

---

## 🎬 Scenariusz Demo (30 minut)

### Część 1: Setup (5 min)
- Owner loguje się
- Tworzy organizację i stronę
- Przypisuje role

### Część 2: Build (10 min)
- Editor loguje się
- Edytuje stronę
- Zapisuje draft
- Próbuje opublikować → błąd 403

### Część 3: Publish (5 min)
- Marketing Manager loguje się
- Przegląda zmiany
- Publikuje do production

### Część 4: Marketing (10 min)
- Marketing Manager tworzy DistributionDraft
- Publikuje omnichannel
- Sprawdza status publikacji

---

## ✅ Success Criteria

Demo jest udane, jeśli:
1. ✅ Editor może edytować, ale nie może publikować
2. ✅ Marketing Manager może publikować stronę
3. ✅ Strona jest dostępna w production po publikacji
4. ✅ Marketing Manager może tworzyć DistributionDraft
5. ✅ Marketing Manager może publikować omnichannel
6. ✅ Wszystkie kanały pokazują status `success` po publikacji

---

**Data utworzenia**: 2025-01-20  
**Wersja**: 1.0  
**Status**: Gotowe do użycia

