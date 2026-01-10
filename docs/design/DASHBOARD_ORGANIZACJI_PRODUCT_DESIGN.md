# Dashboard Organizacji - Product Design

**Data:** 2025-01-20  
**Rola:** Product Designer  
**Zakres:** Projekt struktury, sekcji, priorytetów i CTA dla Dashboardu Organizacji

---

## 1. Cel Ekranu

**Pytanie, na które odpowiada:** "Co mam teraz pod kontrolą?"

Dashboard Organizacji jest **pierwszym ekranem po logowaniu** i musi w jednym miejscu pokazać:
- **Stan wszystkich stron** - co działa, co wymaga uwagi
- **Status każdej strony** - LIVE / DRAFT / ERROR
- **Alerty** - co wymaga natychmiastowej akcji
- **Szybkie akcje** - bezpośredni dostęp do najczęstszych operacji

---

## 2. Struktura Ogólna Dashboardu

### Hierarchia Informacji (Top-Down)

```
1. ALERTY (najwyższy priorytet)
   ↓
2. KONTEKST BIZNESOWY / TECHNICZNY (per rola)
   ↓
3. LISTA STRON (główna treść)
   ↓
4. SZYBKI DOSTĘP / AKTYWNOŚĆ (opcjonalne)
```

### Zasady Projektowe

- **Alerty zawsze na górze** - użytkownik musi widzieć problemy przed wszystkim
- **Różne sekcje per rola** - Owner widzi biznes, Admin techniczne, User tylko strony
- **Szybkie akcje per capability** - akcje widoczne tylko jeśli użytkownik ma uprawnienia
- **Status strony = agregacja** - LIVE/DRAFT/ERROR na podstawie stanu rzeczywistego

---

## 3. Wariant 1: OWNER (Właściciel Organizacji)

### Kontekst Użytkownika
- Odpowiada za biznes, płatności, strategię
- Potrzebuje pełnego obrazu + alertów biznesowych
- Decyduje o planach, limitach, płatnościach

### Struktura Sekcji

#### SEKCJA 1: ALERTY (Priorytet: NAJWYŻSZY)
**Pozycja:** Top of page  
**Cel:** Pokazać co wymaga natychmiastowej uwagi

**Zawartość:**
- Błędy deploya (ostatnie 24h)
- Brak domeny (strony bez custom domain)
- Przekroczenie limitów planu
- Wyłączone polityki (ważne capabilities)
- Problemy z płatnością

**CTA:**
- Każdy alert → link do odpowiedniej strony (deployments, billing, settings)
- "Zobacz więcej" → lista wszystkich alertów

**Priorytetyzacja:**
- Sortowanie: błędy deploya > przekroczenie limitów > brak domeny > polityki > płatności
- Maksymalnie 5 alertów (reszta w "Zobacz więcej")
- Severity: high (czerwony) / medium (żółty) / low (niebieski)

---

#### SEKCJA 2: INFORMACJE BIZNESOWE (Priorytet: WYSOKI)
**Pozycja:** Po alertach, przed listą stron  
**Cel:** Dać kontekst biznesowy do podejmowania decyzji

**Layout:** 3 kolumny (grid)

**Blok 1: PLAN**
- Nazwa planu (badge: "Free" / "Pro" / "Enterprise")
- Limity: strony, użytkownicy, storage
- **CTA:** [Upgrade] → `/org/[orgId]/billing/upgrade`

**Blok 2: ZUŻYCIE**
- Storage: użyte MB / limit MB (procent + progress bar)
- API requests: ten miesiąc / limit (procent)
- Bandwidth: ten miesiąc / limit (procent)
- **CTA:** [Szczegóły] → `/org/[orgId]/usage`

**Blok 3: PŁATNOŚCI**
- Status subskrypcji (badge: active / past_due / canceled)
- Następna płatność (data)
- **CTA:** [Zarządzaj] → `/org/[orgId]/billing`

**Priorytetyzacja:**
- Jeśli przekroczone limity → czerwony progress bar
- Jeśli problemy z płatnością → czerwony badge statusu

---

#### SEKCJA 3: LISTA STRON (Priorytet: ŚREDNI-WYSOKI)
**Pozycja:** Główna treść, centrum ekranu  
**Cel:** Pokazać wszystkie strony i ich status

**Filtry:**
- [Wszystkie] [Live] [Draft] [Error] [Szukaj...]
- Filtry działają na statusie strony (agregacja)

**Karta Strony zawiera:**

1. **Nagłówek:**
   - Nazwa strony (klikalna → `/sites/[slug]`)
   - Status badge: LIVE (zielony) / DRAFT (szary) / ERROR (czerwony)
   - Plan badge (tylko jeśli różny od planu org)

2. **Informacje:**
   - Domena (jeśli ustawiona) lub "Brak domeny" (szary)
   - Ostatni deploy: czas + status (sukces/błąd)
   - Environment: Production / Draft

3. **Alerty per strona** (jeśli są):
   - ⚠️ Ostatni deploy nieudany
   - ❌ Brak domeny
   - ⚠️ Przekroczone limity

4. **Szybkie akcje** (per capability):
   - **[Build]** → `/sites/[slug]/panel/builder` (jeśli ma `builder.edit`)
   - **[Publish]** → `/sites/[slug]/panel/deployments` (jeśli ma `builder.publish`)
   - **[Marketing]** → `/sites/[slug]/panel/marketing` (jeśli ma `marketing.view`)
   - **[Settings]** → `/sites/[slug]/settings` (jeśli ma `sites.settings.view`)

**Status strony:**
- **LIVE**: Strona ma przynajmniej jedną stronę (Page) w environment PRODUCTION ze statusem PUBLISHED
- **DRAFT**: Strona ma strony w environment DRAFT, ale brak PUBLISHED w PRODUCTION
- **ERROR**: Ostatni deploy (SiteDeployment) miał status 'failed' w ciągu ostatnich 7 dni

**Sortowanie:**
- Domyślnie: ostatnia aktywność (ostatni deploy lub update)
- Opcje: nazwa A-Z, ostatnia aktywność, status

**Paginacja:**
- 10 stron na stronę
- "Zobacz więcej" → pełna lista stron

---

#### SEKCJA 4: AKTYWNOŚĆ (Priorytet: NISKI)
**Pozycja:** Na dole, opcjonalna (zwijana domyślnie)  
**Cel:** Historia ostatnich wydarzeń

**Zawartość:**
- Ostatnie wydarzenia z `SiteEvent` i `AuditLog`
- Format: "Deploy strony X (sukces) - 2h temu"
- Maksymalnie 5 ostatnich wydarzeń

**CTA:**
- "Zobacz więcej" → pełna historia aktywności
- Możliwość zwinięcia/rozwinięcia

---

### Priorytety CTA dla OWNER

1. **Najwyższy priorytet:**
   - Alerty → naprawa problemów (deployments, billing, settings)
   - Upgrade planu → jeśli przekroczone limity

2. **Wysoki priorytet:**
   - Zarządzanie płatnościami → jeśli problemy z billing
   - Szczegóły zużycia → monitoring zasobów

3. **Średni priorytet:**
   - Szybkie akcje na stronach → Build, Publish, Marketing, Settings
   - Przejście do szczegółów strony

4. **Niski priorytet:**
   - Historia aktywności → opcjonalna informacja

---

## 4. Wariant 2: ADMIN (Administrator Organizacji)

### Kontekst Użytkownika
- Zarządza technicznymi aspektami, użytkownikami, politykami
- Nie ma dostępu do billing, ale ma pełny dostęp techniczny
- Odpowiada za operacyjne działanie organizacji

### Struktura Sekcji

#### SEKCJA 1: ALERTY TECHNICZNE (Priorytet: NAJWYŻSZY)
**Pozycja:** Top of page  
**Cel:** Pokazać co wymaga naprawy technicznej

**Zawartość:**
- Błędy deploya (ostatnie 24h)
- Brak domeny (strony bez custom domain)
- Wyłączone polityki (ważne capabilities)
- Problemy z hostingiem

**CTA:**
- Każdy alert → link do odpowiedniej strony (deployments, settings)
- "Zobacz więcej" → lista wszystkich alertów

**Różnica vs Owner:**
- **BRAK** alertów o płatnościach i limitach planu (tylko Owner)

---

#### SEKCJA 2: ZUŻYCIE ZASOBÓW (Priorytet: WYSOKI)
**Pozycja:** Po alertach, przed listą stron  
**Cel:** Monitoring zasobów (bez kontekstu billing)

**Layout:** 3 kolumny (grid)

**Blok 1: STORAGE**
- Użyte MB / limit MB
- Procent wykorzystania (progress bar)
- **CTA:** [Szczegóły] → `/org/[orgId]/usage`

**Blok 2: API REQUESTS**
- Ten miesiąc / limit
- Procent wykorzystania (progress bar)
- **CTA:** [Szczegóły] → `/org/[orgId]/usage`

**Blok 3: BANDWIDTH**
- Ten miesiąc / limit
- Procent wykorzystania (progress bar)
- **CTA:** [Szczegóły] → `/org/[orgId]/usage`

**Różnica vs Owner:**
- **BRAK** informacji o planie i płatnościach
- Tylko monitoring zużycia (bez kontekstu biznesowego)

---

#### SEKCJA 3: LISTA STRON (Priorytet: ŚREDNI-WYSOKI)
**Pozycja:** Główna treść, centrum ekranu  
**Cel:** Pokazać wszystkie strony i ich status

**Struktura:** Identyczna jak w wariancie Owner

**Różnica vs Owner:**
- **BRAK** plan badge na kartach stron (tylko Owner widzi plany)

---

#### SEKCJA 4: SZYBKI DOSTĘP (Priorytet: ŚREDNI)
**Pozycja:** Po liście stron  
**Cel:** Szybki dostęp do zarządzania organizacją

**Layout:** 3 kolumny (grid)

**Blok 1: UŻYTKOWNICY**
- **CTA:** [Użytkownicy] → `/org/[orgId]/users`
- Opis: "Zarządzaj użytkownikami"

**Blok 2: ROLE**
- **CTA:** [Role] → `/org/[orgId]/settings/roles`
- Opis: "Zarządzaj rolami"

**Blok 3: POLITYKI**
- **CTA:** [Polityki] → `/org/[orgId]/settings/policies`
- Opis: "Zarządzaj politykami"

**Różnica vs Owner:**
- Owner nie ma tej sekcji (ma dostęp do wszystkiego przez menu)
- Admin potrzebuje szybkiego dostępu do zarządzania organizacją

---

### Priorytety CTA dla ADMIN

1. **Najwyższy priorytet:**
   - Alerty techniczne → naprawa problemów (deployments, settings)
   - Zarządzanie użytkownikami → najczęstsza akcja Admina

2. **Wysoki priorytet:**
   - Szczegóły zużycia → monitoring zasobów
   - Szybkie akcje na stronach → Build, Publish, Marketing, Settings

3. **Średni priorytet:**
   - Zarządzanie rolami i politykami → konfiguracja organizacji
   - Przejście do szczegółów strony

---

## 5. Wariant 3: USER (Członek Organizacji)

### Kontekst Użytkownika
- Ma minimalne uprawnienia - tylko widok stron i ich statusu
- Nie zarządza organizacją
- Pracuje z konkretnymi stronami (jeśli ma capabilities)

### Struktura Sekcji

#### SEKCJA 1: LISTA STRON (Priorytet: NAJWYŻSZY - JEDYNA)
**Pozycja:** Główna treść, centrum ekranu  
**Cel:** Pokazać strony do których użytkownik ma dostęp

**Filtry:**
- [Wszystkie] [Live] [Draft] [Szukaj...]
- **BRAK** filtra "Error" (tylko Owner/Admin widzą błędy)

**Karta Strony zawiera:**

1. **Nagłówek:**
   - Nazwa strony (klikalna → `/sites/[slug]` tylko jeśli ma `sites.view`)
   - Status badge: LIVE (zielony) / DRAFT (szary)
   - **BRAK** plan badge

2. **Informacje:**
   - Domena (jeśli ustawiona)
   - Ostatni deploy: czas + status (sukces/błąd)
   - **BRAK** alertów per strona (tylko Owner/Admin)

3. **Szybkie akcje** (tylko jeśli ma capabilities):
   - **[Build]** → `/sites/[slug]/panel/builder` (jeśli ma `builder.edit`)
   - **[Publish]** → `/sites/[slug]/panel/deployments` (jeśli ma `builder.publish`)
   - **[Marketing]** → `/sites/[slug]/panel/marketing` (jeśli ma `marketing.view`)
   - **[Settings]** → `/sites/[slug]/settings` (jeśli ma `sites.settings.view`)

**Różnica vs Owner/Admin:**
- **BRAK** sekcji alertów
- **BRAK** sekcji biznesowej/zużycia
- **BRAK** sekcji szybkiego dostępu
- **BRAK** sekcji aktywności
- Tylko lista stron (jedyna sekcja)

**Sprawdzanie uprawnień:**
- Szybkie akcje widoczne tylko jeśli użytkownik ma odpowiednie capabilities dla danej strony
- Sprawdzanie per strona (scope SITE), nie per organizacja (scope ORG)

---

### Priorytety CTA dla USER

1. **Najwyższy priorytet:**
   - Przejście do strony → `/sites/[slug]` (jeśli ma `sites.view`)
   - Szybkie akcje na stronach → tylko jeśli ma capabilities

2. **Brak innych priorytetów:**
   - User nie zarządza organizacją
   - User nie widzi alertów ani kontekstu biznesowego

---

## 6. Porównanie Wariantów

| Sekcja | Owner | Admin | User |
|--------|-------|-------|------|
| **Alerty** | ✅ (biznesowe + techniczne) | ✅ (tylko techniczne) | ❌ |
| **Informacje biznesowe** | ✅ (plan + zużycie + płatności) | ❌ | ❌ |
| **Zużycie zasobów** | ✅ (w sekcji biznesowej) | ✅ (osobna sekcja) | ❌ |
| **Lista stron** | ✅ (pełna) | ✅ (pełna) | ✅ (tylko dostępne) |
| **Szybki dostęp** | ❌ | ✅ (użytkownicy, role, polityki) | ❌ |
| **Aktywność** | ✅ (opcjonalna) | ❌ | ❌ |

---

## 7. Priorytetyzacja Globalna

### Zasada: "Alerty → Kontekst → Treść → Opcjonalne"

1. **Alerty** (najwyższy priorytet)
   - Zawsze na górze
   - Wymagają natychmiastowej uwagi
   - Różne typy per rola

2. **Kontekst biznesowy/techniczny** (wysoki priorytet)
   - Owner: plan, zużycie, płatności
   - Admin: zużycie zasobów
   - User: brak

3. **Lista stron** (średni-wysoki priorytet)
   - Główna treść dashboardu
   - Wszystkie role widzą strony
   - Różne poziomy szczegółowości per rola

4. **Szybki dostęp / Aktywność** (niski priorytet)
   - Admin: szybki dostęp do zarządzania
   - Owner: historia aktywności (opcjonalna)
   - User: brak

---

## 8. CTA (Call-to-Action) Strategy

### Hierarchia CTA

**Poziom 1: Alerty (najwyższy priorytet)**
- Każdy alert → link do naprawy problemu
- Kolor: czerwony (high), żółty (medium), niebieski (low)
- Format: przycisk lub link w alertcie

**Poziom 2: Kontekst biznesowy (wysoki priorytet)**
- Owner: [Upgrade], [Szczegóły], [Zarządzaj]
- Admin: [Szczegóły] (zużycie)
- Format: przyciski w blokach informacyjnych

**Poziom 3: Szybkie akcje na stronach (średni priorytet)**
- [Build], [Publish], [Marketing], [Settings]
- Format: małe przyciski pod kartą strony
- Widoczne tylko jeśli użytkownik ma capabilities

**Poziom 4: Przejście do szczegółów (średni priorytet)**
- Kliknięcie w nazwę strony → `/sites/[slug]`
- Kliknięcie w status → `/sites/[slug]/deployments`
- Format: linki w tekście

**Poziom 5: Opcjonalne (niski priorytet)**
- [Zobacz więcej] w alertach, aktywności
- Format: linki tekstowe

---

## 9. Dlaczego Ten Ekran Domyka System?

**Dashboard Organizacji domyka system, ponieważ jest jedynym miejscem, które w jednym widoku łączy wszystkie kluczowe moduły platformy (sites, deployments, billing, usage, RBAC, policies) i odpowiada na fundamentalne pytanie użytkownika "Co mam teraz pod kontrolą?" - pokazując stan stron, alerty wymagające akcji, kontekst biznesowy/techniczny per rola oraz szybkie akcje oparte na capabilities, co eliminuje potrzebę nawigacji między wieloma ekranami i daje użytkownikowi pełny obraz sytuacji organizacji od razu po logowaniu.**

---

## 10. Podsumowanie Projektu

### Kluczowe Decyzje Projektowe

1. **Alerty zawsze na górze** - użytkownik musi widzieć problemy przed wszystkim
2. **Różne sekcje per rola** - Owner widzi biznes, Admin techniczne, User tylko strony
3. **Szybkie akcje per capability** - akcje widoczne tylko jeśli użytkownik ma uprawnienia
4. **Status strony = agregacja** - LIVE/DRAFT/ERROR na podstawie stanu rzeczywistego
5. **Hierarchia informacji** - Alerty → Kontekst → Treść → Opcjonalne

### Metryki Sukcesu (Future)

- Czas do pierwszej akcji po logowaniu
- Liczba kliknięć do naprawy problemu (alert → akcja)
- Wykorzystanie szybkich akcji vs nawigacja przez menu
- Satysfakcja użytkownika per rola

---

**Koniec projektu.**

