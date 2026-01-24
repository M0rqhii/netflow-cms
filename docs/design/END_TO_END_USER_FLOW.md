# End-to-End User Flow: "Właściciel organizacji zakłada stronę, publikuje ją i dystrybuuje treść na social media"

**Wersja:** 1.0.0  
**Data:** 2025-01-20  
**Typ:** UX Flow Design  
**Status:** Draft

---

## Przegląd

Dokumentacja kompletnego przepływu użytkownika (end-to-end flow) dla historii: **"Właściciel organizacji zakłada stronę, publikuje ją i dystrybuuje treść na social media"**.

### Role w Flow

- **Owner** - Właściciel organizacji (pełne uprawnienia)
- **Editor** - Redaktor treści (ograniczone uprawnienia)

### Struktura Dokumentu

Każdy krok zawiera:
- **Punkt wejścia** - skąd użytkownik przychodzi
- **Akcja użytkownika** - co użytkownik robi
- **Efekt** - co się dzieje w systemie
- **Powrót** - gdzie użytkownik ląduje dalej
- **Różnice Owner vs Editor** - różnice w uprawnieniach

---

## KROK 1: Logowanie

### Punkt wejścia
- Użytkownik otwiera aplikację w przeglądarce
- URL: `/login` (lub przekierowanie z chronionych stron)

### Co widzi użytkownik
- Formularz logowania:
  - Pole: Email
  - Pole: Hasło
  - Przycisk: "Zaloguj się"
  - Link: "Nie masz konta? Zarejestruj się"
- Opcjonalnie: wybór języka (jeśli pierwsze logowanie)

### Akcja użytkownika
1. Użytkownik wpisuje email i hasło
2. Użytkownik klika "Zaloguj się"

### Efekt
- **Backend:** `POST /api/v1/auth/login`
  - Weryfikacja credentials
  - Sprawdzenie czy użytkownik należy do organizacji
  - Generowanie JWT token (globalny, bez siteId jeśli użytkownik ma wiele organizacji)
  - Zwrócenie: `{ access_token, refresh_token, user }`
- **Frontend:**
  - Zapisanie tokenu w localStorage: `authToken`
  - Zapisanie danych użytkownika w stanie aplikacji
  - Sprawdzenie preferencji użytkownika (język, etc.)

### Powrót
- **Sukces:** Przekierowanie do `/dashboard` (Platform Dashboard)
- **Błąd:** Wyświetlenie komunikatu błędu, pozostanie na `/login`

### Różnice Owner vs Editor
- **Brak różnic** - logowanie działa identycznie dla wszystkich ról
- **Owner** może mieć dostęp do wielu organizacji (org/site)
- **Editor** zwykle ma dostęp do jednej organizacji

### Potencjalne problemy UX
- ❌ Brak informacji o tym, do której organizacji użytkownik się loguje (jeśli ma wiele)
- ❌ Brak możliwości resetu hasła bezpośrednio z formularza logowania
- ❌ Brak informacji o statusie konta (zablokowane, nieaktywne)

---

## KROK 2: Dashboard Organizacji

### Punkt wejścia
- Po udanym logowaniu
- URL: `/dashboard`

### Co widzi użytkownik (Owner)
- **Nagłówek:**
  - Logo platformy
  - Menu użytkownika (profil, wyloguj)
  - Wybór organizacji (jeśli ma wiele)
- **Główny widok:**
  - **Sekcja "Moje Strony":**
    - Lista wszystkich stron (sites) w organizacji
    - Dla każdej strony: nazwa, status (draft/published), data ostatniej modyfikacji, miniaturka
    - Przycisk: "Utwórz nową stronę" (widoczny tylko dla Owner/Org Admin)
  - **Sekcja "Statystyki":**
    - Liczba stron: X
    - Liczba opublikowanych stron: Y
    - Liczba użytkowników: Z
  - **Sekcja "Ostatnia aktywność":**
    - Lista ostatnich działań (kto, kiedy, co zrobił)
- **Sidebar/Nawigacja:**
  - Dashboard (aktywny)
  - Strony
  - Użytkownicy
  - Marketing
  - Billing
  - Ustawienia

### Co widzi użytkownik (Editor)
- **Nagłówek:** (identyczny)
- **Główny widok:**
  - **Sekcja "Moje Strony":**
    - Lista stron, do których Editor ma dostęp
    - Tylko strony z przypisaną rolą SITE (Editor, Publisher, Viewer)
    - **BRAK** przycisku "Utwórz nową stronę"
  - **Sekcja "Statystyki":**
    - Tylko statystyki dla stron, do których ma dostęp
  - **Sekcja "Ostatnia aktywność":**
    - Tylko aktywność związana z dostępnymi stronami

### Akcja użytkownika (Owner)
1. Owner przegląda listę stron
2. Owner klika przycisk "Utwórz nową stronę"

### Akcja użytkownika (Editor)
1. Editor przegląda listę dostępnych stron
2. Editor klika na istniejącą stronę, aby ją edytować

### Efekt
- **Owner klika "Utwórz nową stronę":**
  - Przekierowanie do `/sites/new`
- **Editor klika na stronę:**
  - Przekierowanie do `/sites/[slug]` (szczegóły strony)

### Powrót
- **Owner:** Przekierowanie do `/sites/new` (formularz tworzenia strony)
- **Editor:** Przekierowanie do `/sites/[slug]` (szczegóły strony, jeśli ma dostęp)

### Różnice Owner vs Editor
- **Owner** widzi wszystkie strony w organizacji + może tworzyć nowe
- **Editor** widzi tylko strony z przypisaną rolą SITE + **NIE MOŻE** tworzyć nowych stron
- **Owner** widzi pełne statystyki organizacji
- **Editor** widzi tylko statystyki swoich stron

### Potencjalne problemy UX
- ❌ Brak jasnego wskaźnika, które strony są w trybie draft vs published
- ❌ Brak możliwości szybkiego filtrowania/sortowania listy stron
- ❌ Brak informacji o tym, kto ostatnio edytował stronę
- ❌ Editor może być zdezorientowany, jeśli nie widzi przycisku "Utwórz nową stronę" (brak komunikatu, dlaczego)

---

## KROK 3: Utworzenie strony

### Punkt wejścia
- Z Dashboard (`/dashboard`)
- URL: `/sites/new`
- **Dostęp:** Tylko Owner / Org Admin (wymaga capability: `org.sites.create`)

### Co widzi użytkownik (Owner)
- **Formularz tworzenia strony:**
  - Pole: "Nazwa strony" (required)
  - Pole: "Slug/URL" (auto-generowany z nazwy, edytowalny)
  - Pole: "Opis" (optional, textarea)
  - Pole: "Domena" (optional, można dodać później)
  - Sekcja "Ustawienia początkowe":
    - Checkbox: "Utwórz domyślną stronę główną"
    - Checkbox: "Włącz marketing od razu"
  - Przycisk: "Anuluj" (powrót do dashboard)
  - Przycisk: "Utwórz stronę" (primary)

### Akcja użytkownika
1. Owner wypełnia formularz:
   - Wpisuje nazwę: "Moja Firma"
   - Slug auto-generuje się: "moja-firma" (może edytować)
   - Wpisuje opis: "Strona główna naszej firmy"
2. Owner klika "Utwórz stronę"

### Efekt
- **Backend:** `POST /api/v1/orgs/{orgId}/sites`
  - Weryfikacja RBAC: `org.sites.create` (Owner/Org Admin)
  - Utworzenie nowego Site (site) w bazie
  - Utworzenie domyślnej struktury (jeśli wybrano)
  - Utworzenie domyślnej strony głównej (jeśli wybrano)
  - Przypisanie Owner jako Site Admin dla nowej strony
  - Zwrócenie: `{ id, slug, name, createdAt }`
- **Frontend:**
  - Wyświetlenie komunikatu sukcesu: "Strona została utworzona"
  - Zapisanie informacji o nowej stronie w stanie

### Powrót
- **Sukces:** Przekierowanie do `/sites/[slug]` (szczegóły strony) lub `/sites/[slug]/builder` (jeśli wybrano "Przejdź do buildera")
- **Błąd:** Wyświetlenie komunikatu błędu, pozostanie na formularzu

### Różnice Owner vs Editor
- **Editor NIE MA DOSTĘPU** do tego kroku
- Jeśli Editor spróbuje wejść na `/sites/new` → 403 Forbidden
- Komunikat: "Nie masz uprawnień do tworzenia stron"

### Potencjalne problemy UX
- ❌ Brak walidacji slug w czasie rzeczywistym (czy jest dostępny)
- ❌ Brak podglądu, jak będzie wyglądać URL strony
- ❌ Brak możliwości wyboru szablonu przy tworzeniu strony
- ❌ Brak informacji o limitach (ile stron można utworzyć w planie)

---

## KROK 4: Przejście do buildera

### Punkt wejścia
- Z Dashboard (`/dashboard`) - kliknięcie na istniejącą stronę
- Z szczegółów strony (`/sites/[slug]`) - kliknięcie "Edytuj stronę"
- Z formularza tworzenia strony (`/sites/new`) - opcja "Przejdź do buildera"

### Co widzi użytkownik (Owner)
- **Strona szczegółów (`/sites/[slug]`):**
  - Informacje o stronie: nazwa, slug, status, data utworzenia
  - Sekcja "Akcje":
    - Przycisk: "Edytuj w builderze" (primary)
    - Przycisk: "Ustawienia strony"
    - Przycisk: "Zarządzaj użytkownikami"
    - Przycisk: "Marketing"
  - Sekcja "Strony":
    - Lista stron w site (np. "Strona główna", "O nas", "Kontakt")
    - Dla każdej: status (draft/published), data modyfikacji
    - Przycisk: "Dodaj nową stronę"

### Co widzi użytkownik (Editor)
- **Strona szczegółów (`/sites/[slug]`):**
  - **Tylko jeśli Editor ma przypisaną rolę SITE dla tej strony**
  - Informacje o stronie (identyczne)
  - Sekcja "Akcje":
    - Przycisk: "Edytuj w builderze" (primary) - **tylko jeśli ma capability `builder.edit`**
    - **BRAK** przycisków: "Ustawienia strony", "Zarządzaj użytkownikami"
    - Przycisk: "Marketing" - **tylko jeśli ma capability `marketing.view`**
  - Sekcja "Strony":
    - Lista stron, które Editor może edytować
    - Przycisk: "Dodaj nową stronę" - **tylko jeśli ma capability `builder.pages.create`**

### Akcja użytkownika (Owner)
1. Owner klika "Edytuj w builderze"

### Akcja użytkownika (Editor)
1. Editor klika "Edytuj w builderze" (jeśli ma uprawnienia)

### Efekt
- **Backend:** Weryfikacja RBAC:
  - `builder.view` - wymagane do wejścia do buildera
  - `builder.edit` - wymagane do edycji
- **Frontend:**
  - Przekierowanie do `/sites/[slug]/builder` lub `/site/[slug]/builder`
  - Załadowanie Page Buildera
  - Załadowanie struktury strony (komponenty, layout)

### Powrót
- **Sukces:** Przekierowanie do Page Buildera (`/sites/[slug]/builder` lub `/site/[slug]/builder`)
- **Brak uprawnień:** 403 Forbidden, komunikat: "Nie masz uprawnień do edycji tej strony"

### Różnice Owner vs Editor
- **Owner** ma pełny dostęp do buildera
- **Editor** może mieć ograniczony dostęp (tylko edycja treści, bez publikacji)
- **Editor** może nie widzieć niektórych opcji (np. ustawienia zaawansowane)

### Potencjalne problemy UX
- ❌ Brak informacji o tym, czy strona jest w trybie draft (może być edytowana przez wielu użytkowników jednocześnie)
- ❌ Brak wskaźnika, kto aktualnie edytuje stronę (collaborative editing)
- ❌ Brak możliwości podglądu strony przed wejściem do buildera
- ❌ Długi czas ładowania buildera (jeśli strona jest duża)

---

## KROK 5: Zapis draftu

### Punkt wejścia
- Z Page Buildera (`/sites/[slug]/builder`)
- Użytkownik edytuje stronę w builderze

### Co widzi użytkownik (Owner/Editor)
- **Page Builder:**
  - Canvas z edytowaną stroną
  - Sidebar z komponentami do dodania
  - Toolbar z opcjami:
    - Przycisk: "Zapisz" (zapisuje draft)
    - Przycisk: "Podgląd" (otwiera podgląd)
    - Przycisk: "Publikuj" (tylko jeśli ma `builder.publish`)
  - Wskaźnik statusu: "Draft" / "Zapisano" / "Zapisywanie..."

### Akcja użytkownika
1. Użytkownik edytuje stronę:
   - Dodaje komponenty (tekst, obrazy, sekcje)
   - Edytuje treść
   - Zmienia layout
2. Użytkownik klika "Zapisz" (lub automatyczny zapis po X sekundach)

### Efekt
- **Backend:** `PATCH /api/v1/builder/pages/{pageId}` lub `PUT /api/v1/builder/pages/{pageId}/draft`
  - Weryfikacja RBAC: `builder.edit` (wymagane)
  - Zapisanie struktury strony (JSON) jako draft
  - Aktualizacja `updatedAt` w bazie
  - Status strony: `draft`
  - Utworzenie wpisu w AuditLog: `{ action: 'page.draft.saved', userId, pageId, timestamp }`
  - Zwrócenie: `{ success: true, savedAt }`
- **Frontend:**
  - Wyświetlenie komunikatu: "Zapisano" (toast notification)
  - Aktualizacja wskaźnika statusu: "Zapisano o [czas]"
  - Opcjonalnie: automatyczny zapis co X sekund (auto-save)

### Powrót
- **Sukces:** Użytkownik pozostaje w builderze, widzi komunikat "Zapisano"
- **Błąd:** Wyświetlenie komunikatu błędu, możliwość ponowienia zapisu

### Różnice Owner vs Editor
- **Brak różnic** - obie role mogą zapisywać drafty (jeśli mają `builder.edit`)
- **Owner** może zapisać i od razu opublikować
- **Editor** może zapisać, ale publikacja wymaga `builder.publish` (może nie mieć)

### Potencjalne problemy UX
- ❌ Brak informacji o konfliktach edycji (jeśli dwóch użytkowników edytuje jednocześnie)
- ❌ Brak możliwości cofnięcia zmian (undo/redo)
- ❌ Brak wersjonowania (historia zmian)
- ❌ Automatyczny zapis może być zbyt częsty (obciążenie serwera) lub zbyt rzadki (ryzyko utraty danych)

---

## KROK 6: Publikacja strony

### Punkt wejścia
- Z Page Buildera (`/sites/[slug]/builder`)
- Użytkownik ma zapisany draft i chce go opublikować

### Co widzi użytkownik (Owner)
- **Page Builder:**
  - Przycisk: "Publikuj" (primary, w toolbarze)
  - Status: "Draft" (nieopublikowana) lub "Opublikowana" (jeśli już była publikacja)

### Co widzi użytkownik (Editor)
- **Page Builder:**
  - **Jeśli Editor ma `builder.publish`:** Przycisk "Publikuj" (identyczny jak Owner)
  - **Jeśli Editor NIE MA `builder.publish`:** Przycisk "Publikuj" jest **wyłączony** lub **niewidoczny**
  - Komunikat: "Nie masz uprawnień do publikacji. Skontaktuj się z administratorem."

### Akcja użytkownika (Owner)
1. Owner klika "Publikuj"
2. **Modal potwierdzenia:**
   - Tekst: "Czy na pewno chcesz opublikować tę stronę?"
   - Informacja: "Strona będzie widoczna publicznie pod adresem: [URL]"
   - Checkbox: "Również opublikuj na social media" (opcjonalnie)
   - Przycisk: "Anuluj"
   - Przycisk: "Publikuj" (primary, czerwony jeśli dangerous)
3. Owner potwierdza publikację

### Akcja użytkownika (Editor z uprawnieniami)
1. Editor klika "Publikuj" (jeśli ma `builder.publish`)
2. Modal potwierdzenia (identyczny)
3. Editor potwierdza publikację

### Efekt
- **Backend:** `POST /api/v1/builder/pages/{pageId}/publish`
  - Weryfikacja RBAC: `builder.publish` (wymagane)
  - Sprawdzenie czy strona ma zapisany draft
  - Publikacja strony:
    - Zmiana statusu: `draft` → `published`
    - Zapisanie wersji produkcyjnej (kopiowanie draftu do production)
    - Generowanie statycznego HTML (jeśli potrzebne)
    - Aktualizacja `publishedAt` w bazie
  - Utworzenie wpisu w AuditLog: `{ action: 'page.published', userId, pageId, timestamp }`
  - **Jeśli wybrano "Również opublikuj na social media":**
    - Utworzenie `DistributionDraft` automatycznie (jeśli użytkownik ma `marketing.content.edit`)
    - Przekierowanie do marketingu (opcjonalnie)
  - Zwrócenie: `{ success: true, publishedAt, url }`
- **Frontend:**
  - Wyświetlenie komunikatu sukcesu: "Strona została opublikowana"
  - Aktualizacja statusu: "Opublikowana o [czas]"
  - Opcjonalnie: przycisk "Zobacz stronę" (otwiera publiczny URL)

### Powrót
- **Sukces:** 
  - Użytkownik pozostaje w builderze
  - Wyświetlenie komunikatu sukcesu
  - Opcjonalnie: przekierowanie do marketingu (jeśli wybrano opcję social media)
- **Brak uprawnień:** 403 Forbidden, komunikat: "Nie masz uprawnień do publikacji"
- **Błąd:** Wyświetlenie komunikatu błędu, możliwość ponowienia

### Różnice Owner vs Editor
- **Owner** zawsze ma `builder.publish` (domyślnie)
- **Editor** może mieć `builder.publish` (jeśli przypisano rolę Publisher) lub nie mieć (rola Editor bez publikacji)
- **Editor bez uprawnień** widzi wyłączony przycisk "Publikuj" lub komunikat o braku uprawnień

### Potencjalne problemy UX
- ❌ Brak możliwości publikacji częściowej (np. tylko niektóre sekcje)
- ❌ Brak możliwości zaplanowania publikacji (scheduled publish)
- ❌ Brak możliwości cofnięcia publikacji (unpublish) bezpośrednio z buildera
- ❌ Brak informacji o tym, czy strona jest już opublikowana (możliwość nadpisania)

---

## KROK 7: Publikacja posta w marketingu

### Punkt wejścia
- Z Dashboard (`/dashboard`) - sekcja "Marketing"
- Z szczegółów strony (`/sites/[slug]`) - przycisk "Marketing"
- Z buildera (`/sites/[slug]/builder`) - po publikacji strony z opcją "Również opublikuj na social media"
- URL: `/sites/[slug]/marketing` lub `/marketing`

### Co widzi użytkownik (Owner)
- **Dashboard Marketingu:**
  - **Sekcja "Drafty do publikacji":**
    - Lista `DistributionDraft` ze statusem `draft` lub `ready`
    - Dla każdego draftu:
      - Tytuł
      - Status (draft/ready)
      - Kanały (site, facebook, twitter, linkedin, instagram)
      - Data utworzenia
      - Przycisk: "Edytuj"
      - Przycisk: "Publikuj" (jeśli status: `ready`)
  - **Sekcja "Połączenia z kanałami":**
    - Lista połączeń z social media (Facebook, Twitter, LinkedIn, Instagram)
    - Status połączenia (connected/disconnected)
    - Przycisk: "Połącz konto" (jeśli disconnected)
  - **Sekcja "Ostatnie publikacje":**
    - Lista `PublishJob` z ostatnimi publikacjami
    - Status (success/failed/pending)
    - Kanały, do których opublikowano
  - **Przycisk:** "Utwórz nowy draft" (jeśli ma `marketing.content.edit`)

### Co widzi użytkownik (Editor)
- **Dashboard Marketingu:**
  - **Tylko jeśli Editor ma `marketing.view`:**
    - **Sekcja "Drafty do publikacji":**
      - Lista draftów, które Editor może edytować (jeśli ma `marketing.content.edit`)
      - **BRAK** przycisku "Publikuj" (jeśli NIE MA `marketing.publish`)
      - Komunikat: "Skontaktuj się z administratorem, aby opublikować"
    - **Sekcja "Połączenia z kanałami":**
      - Tylko podgląd (nie może łączyć kont - wymaga `marketing.social.connect`)
    - **Sekcja "Ostatnie publikacje":**
      - Tylko podgląd
  - **Jeśli Editor NIE MA `marketing.view`:** 403 Forbidden

### Akcja użytkownika (Owner)
1. **Opcja A: Tworzenie nowego draftu**
   - Owner klika "Utwórz nowy draft"
   - Formularz tworzenia draftu:
     - Pole: "Tytuł posta"
     - Pole: "Treść dla strony" (rich text editor)
     - Sekcja "Wersje dla social media":
       - Pole: "Facebook" (textarea)
       - Pole: "Twitter" (textarea, limit znaków)
       - Pole: "LinkedIn" (textarea)
       - Pole: "Instagram" (textarea)
     - Sekcja "Kanały":
       - Checkboxy: site, facebook, twitter, linkedin, instagram, ads
     - Przycisk: "Zapisz jako draft"
     - Przycisk: "Zapisz i oznacz jako gotowe"
   - Owner wypełnia formularz i klika "Zapisz i oznacz jako gotowe"
   - Status draftu: `draft` → `ready`

2. **Opcja B: Publikacja istniejącego draftu**
   - Owner widzi draft ze statusem `ready`
   - Owner klika "Publikuj"
   - **Modal publikacji:**
     - Lista kanałów do publikacji (checkboxy)
     - Informacja o połączeniach: "Facebook: ✓ Połączone", "Twitter: ✗ Nie połączone"
     - Checkbox: "Opublikuj również na stronie" (jeśli nie było publikacji strony)
     - Przycisk: "Anuluj"
     - Przycisk: "Publikuj" (primary)
   - Owner wybiera kanały i klika "Publikuj"

### Akcja użytkownika (Editor)
1. **Jeśli Editor ma `marketing.content.edit`:**
   - Editor może tworzyć i edytować drafty (identycznie jak Owner)
   - Editor **NIE MOŻE** publikować (brak `marketing.publish`)
   - Editor widzi przycisk "Publikuj" jako wyłączony lub niewidoczny

2. **Jeśli Editor NIE MA `marketing.content.edit`:**
   - Editor widzi tylko podgląd (jeśli ma `marketing.view`)
   - Editor nie może tworzyć ani edytować draftów

### Efekt
- **Backend:** `POST /api/v1/marketing/publish`
  - Weryfikacja RBAC:
    - `marketing.publish` - wymagane dla wszystkich kanałów
    - `marketing.ads.manage` - wymagane dla kanału `ads` (jeśli wybrano)
  - Sprawdzenie połączeń z kanałami (ChannelConnection)
  - Utworzenie `PublishJob` ze statusem `pending`
  - Asynchroniczne przetwarzanie publikacji:
    - Dla każdego kanału:
      - Publikacja do API social media (stub w MVP, prawdziwe API w produkcji)
      - Utworzenie `PublishResult` z statusem `success`/`failed`
      - Zapisanie `externalId` (ID posta w social media) i `url`
    - Aktualizacja statusu `PublishJob`: `pending` → `processing` → `success`/`failed`
  - Utworzenie wpisu w AuditLog: `{ action: 'marketing.published', userId, draftId, jobId, channels, timestamp }`
  - Zwrócenie: `{ success: true, jobId }`
- **Frontend:**
  - Wyświetlenie komunikatu: "Publikacja rozpoczęta"
  - Przekierowanie do szczegółów joba: `/marketing/jobs/{jobId}`
  - Opcjonalnie: polling statusu joba (odświeżanie co X sekund)

### Powrót
- **Sukces:** Przekierowanie do `/marketing/jobs/{jobId}` (szczegóły publikacji)
- **Brak uprawnień:** 403 Forbidden, komunikat: "Nie masz uprawnień do publikacji"
- **Brak połączenia:** Komunikat: "Niektóre kanały nie są połączone. Połącz konta w ustawieniach."
- **Błąd:** Wyświetlenie komunikatu błędu, możliwość ponowienia

### Różnice Owner vs Editor
- **Owner** ma pełny dostęp: tworzenie draftów, publikacja, łączenie kont
- **Editor z `marketing.content.edit`** może tworzyć drafty, ale **NIE MOŻE** publikować (wymaga `marketing.publish`)
- **Editor bez `marketing.content.edit`** widzi tylko podgląd (jeśli ma `marketing.view`)
- **Owner** może łączyć konta social media (wymaga `marketing.social.connect`)
- **Editor** nie może łączyć kont (brak `marketing.social.connect`)

### Potencjalne problemy UX
- ❌ Brak informacji o limitach API social media (np. Twitter ma limit postów)
- ❌ Brak możliwości edycji draftu po oznaczeniu jako `ready`
- ❌ Brak możliwości anulowania publikacji w trakcie (jeśli job jest `processing`)
- ❌ Brak informacji o czasie przetwarzania (użytkownik nie wie, ile czekać)
- ❌ Brak możliwości publikacji częściowej (np. tylko Facebook, jeśli Twitter się nie powiódł)

---

## KROK 8: Podgląd efektu + statystyki

### Punkt wejścia
- Z Dashboard Marketingu (`/marketing`)
- Z listy jobów publikacji (`/marketing/jobs`)
- Z szczegółów strony (`/sites/[slug]`)
- URL: `/marketing/jobs/{jobId}` (szczegóły publikacji)
- URL: `/sites/[slug]` (szczegóły strony)

### Co widzi użytkownik (Owner)
- **Szczegóły publikacji (`/marketing/jobs/{jobId}`):**
  - **Nagłówek:**
    - Tytuł draftu
    - Status joba: `pending` / `processing` / `success` / `failed`
    - Data publikacji
  - **Sekcja "Wyniki publikacji":**
    - Dla każdego kanału:
      - Ikona kanału (Facebook, Twitter, etc.)
      - Status: ✓ Sukces / ✗ Błąd / ⏳ W trakcie
      - Link: "Zobacz post" (jeśli sukces, otwiera URL posta)
      - Informacja o błędzie (jeśli failed)
  - **Sekcja "Statystyki"** (jeśli ma `marketing.stats.view`):
    - Liczba wyświetleń (jeśli dostępne z API)
    - Liczba polubień (jeśli dostępne)
    - Liczba udostępnień (jeśli dostępne)
    - Wykresy (jeśli dostępne)
  - **Sekcja "Akcje":**
    - Przycisk: "Zobacz stronę" (otwiera publiczny URL strony)
    - Przycisk: "Ponów publikację" (jeśli failed)
    - Przycisk: "Utwórz nowy draft"

- **Szczegóły strony (`/sites/[slug]`):**
  - **Sekcja "Podgląd":**
    - Miniaturka strony
    - Przycisk: "Zobacz stronę" (otwiera publiczny URL)
    - Przycisk: "Podgląd w nowej karcie"
  - **Sekcja "Statystyki strony":**
    - Liczba wyświetleń (jeśli tracking włączony)
    - Data ostatniej publikacji
    - Liczba wersji (jeśli wersjonowanie włączone)

### Co widzi użytkownik (Editor)
- **Szczegóły publikacji (`/marketing/jobs/{jobId}`):**
  - **Tylko jeśli Editor ma `marketing.view`:**
    - **Nagłówek:** (identyczny)
    - **Sekcja "Wyniki publikacji":** (identyczna, tylko podgląd)
    - **Sekcja "Statystyki":**
      - **Tylko jeśli Editor ma `marketing.stats.view`:** (identyczna)
      - **Jeśli NIE MA:** Komunikat: "Nie masz uprawnień do statystyk"
    - **Sekcja "Akcje":**
      - **BRAK** przycisku "Ponów publikację" (wymaga `marketing.publish`)
      - Przycisk: "Zobacz stronę" (dostępny)

- **Szczegóły strony (`/sites/[slug]`):**
  - **Tylko jeśli Editor ma dostęp do strony:**
    - **Sekcja "Podgląd":** (identyczna)
    - **Sekcja "Statystyki strony":**
      - **Tylko jeśli Editor ma `marketing.stats.view`:** (identyczna)
      - **Jeśli NIE MA:** Komunikat: "Nie masz uprawnień do statystyk"

### Akcja użytkownika
1. Użytkownik przegląda wyniki publikacji
2. Użytkownik klika "Zobacz post" (dla każdego kanału)
3. Użytkownik klika "Zobacz stronę" (dla strony)
4. Użytkownik przegląda statystyki (jeśli ma uprawnienia)

### Efekt
- **Backend:** `GET /api/v1/marketing/jobs/{jobId}`
  - Weryfikacja RBAC: `marketing.view` (wymagane)
  - Pobranie `PublishJob` z `PublishResult[]`
  - Pobranie statystyk z API social media (jeśli dostępne)
  - Zwrócenie: `{ job, results[], stats }`
- **Frontend:**
  - Wyświetlenie szczegółów publikacji
  - Otwarcie linków w nowych kartach (social media, strona)

### Powrót
- Użytkownik pozostaje na stronie szczegółów
- Linki otwierają się w nowych kartach (social media, strona)

### Różnice Owner vs Editor
- **Owner** widzi pełne statystyki (jeśli ma `marketing.stats.view`)
- **Editor** może nie widzieć statystyk (jeśli nie ma `marketing.stats.view`)
- **Owner** może ponowić publikację (jeśli failed)
- **Editor** nie może ponowić publikacji (brak `marketing.publish`)

### Potencjalne problemy UX
- ❌ Statystyki mogą być niedostępne (API social media nie zwraca danych w czasie rzeczywistym)
- ❌ Brak możliwości eksportu statystyk
- ❌ Brak możliwości porównania statystyk między kanałami
- ❌ Brak informacji o czasie aktualizacji statystyk (czy są aktualne)

---

## KROK 9: Informacja: kto, kiedy, co zrobił

### Punkt wejścia
- Z Dashboard (`/dashboard`) - sekcja "Ostatnia aktywność"
- Z szczegółów strony (`/sites/[slug]`) - sekcja "Historia zmian"
- Z marketingu (`/marketing`) - sekcja "Ostatnie publikacje"
- URL: `/audit` lub `/activity` (dedykowana strona aktywności)

### Co widzi użytkownik (Owner)
- **Dashboard - Sekcja "Ostatnia aktywność":**
  - Lista ostatnich działań (AuditLog):
    - Format: "[Czas] [Użytkownik] [Akcja] [Obiekt]"
    - Przykłady:
      - "2 min temu | Jan Kowalski | Utworzył stronę | Moja Firma"
      - "5 min temu | Anna Nowak | Opublikował stronę | Strona główna"
      - "10 min temu | Jan Kowalski | Opublikował post | Facebook, Twitter"
      - "1 godz. temu | Anna Nowak | Zapisał draft | O nas"
    - Link: "Zobacz szczegóły" (dla każdego wpisu)
    - Link: "Zobacz pełną historię" (przekierowanie do `/audit`)

- **Dedykowana strona aktywności (`/audit`):**
  - **Filtry:**
    - Dropdown: "Typ akcji" (wszystkie / tworzenie / edycja / publikacja)
    - Dropdown: "Użytkownik" (wszystkie / konkretny użytkownik)
    - Dropdown: "Strona" (wszystkie / konkretna strona)
    - Date picker: "Od" / "Do"
    - Przycisk: "Filtruj"
  - **Tabela aktywności:**
    - Kolumny: Czas | Użytkownik | Akcja | Obiekt | Szczegóły
    - Sortowanie: domyślnie po czasie (najnowsze pierwsze)
    - Paginacja: 20 wpisów na stronę
  - **Eksport:**
    - Przycisk: "Eksportuj do CSV" (jeśli ma uprawnienia)

### Co widzi użytkownik (Editor)
- **Dashboard - Sekcja "Ostatnia aktywność":**
  - **Tylko aktywność związana z dostępnymi stronami:**
    - Lista działań (identyczny format)
    - **Tylko działania na stronach, do których Editor ma dostęp**
    - **Tylko działania użytkowników z tej samej organizacji**
  - Link: "Zobacz pełną historię" (przekierowanie do `/audit`)

- **Dedykowana strona aktywności (`/audit`):**
  - **Tylko jeśli Editor ma `org.audit.view` (jeśli istnieje):**
    - Filtry (identyczne)
    - Tabela aktywności (identyczna)
    - **Tylko wpisy związane z dostępnymi stronami**
  - **Jeśli Editor NIE MA uprawnień:** 403 Forbidden lub komunikat: "Nie masz uprawnień do przeglądania historii"

### Akcja użytkownika
1. Użytkownik przegląda listę aktywności na dashboardzie
2. Użytkownik klika "Zobacz pełną historię"
3. Użytkownik filtruje aktywność (opcjonalnie)
4. Użytkownik klika "Zobacz szczegóły" dla konkretnego wpisu

### Efekt
- **Backend:** `GET /api/v1/audit` lub `GET /api/v1/audit/logs`
  - Weryfikacja RBAC: `org.audit.view` (jeśli dedykowana strona) lub domyślnie dostępne dla Owner
  - Pobranie wpisów z AuditLog:
    - Filtrowanie po organizacji (orgId)
    - Filtrowanie po dostępnych stronach (dla Editor)
    - Filtrowanie po parametrach (akcja, użytkownik, data)
  - Sortowanie: `createdAt DESC`
  - Paginacja
  - Zwrócenie: `{ logs[], total, page, limit }`
- **Frontend:**
  - Wyświetlenie listy aktywności
  - Opcjonalnie: eksport do CSV (jeśli ma uprawnienia)

### Powrót
- Użytkownik pozostaje na stronie aktywności
- Kliknięcie "Zobacz szczegóły" otwiera modal z pełnymi informacjami o akcji

### Różnice Owner vs Editor
- **Owner** widzi **wszystką** aktywność w organizacji
- **Editor** widzi tylko aktywność związaną z dostępnymi stronami
- **Owner** może eksportować pełną historię
- **Editor** może eksportować tylko swoją aktywność (jeśli ma uprawnienia)

### Potencjalne problemy UX
- ❌ Brak możliwości filtrowania po typie obiektu (strona vs marketing vs użytkownicy)
- ❌ Brak możliwości wyszukiwania w historii (full-text search)
- ❌ Brak możliwości cofnięcia akcji (undo) z poziomu historii
- ❌ Brak informacji o kontekście akcji (np. "Opublikował stronę" - ale jaka była poprzednia wersja?)

---

## Podsumowanie Flow

### Kompletna ścieżka (Owner)

```
1. Logowanie (/login)
   ↓
2. Dashboard Organizacji (/dashboard)
   ↓
3. Utworzenie strony (/sites/new)
   ↓
4. Przejście do buildera (/sites/[slug]/builder)
   ↓
5. Zapis draftu (w builderze)
   ↓
6. Publikacja strony (w builderze)
   ↓
7. Publikacja posta w marketingu (/marketing)
   ↓
8. Podgląd efektu + statystyki (/marketing/jobs/{jobId})
   ↓
9. Informacja: kto, kiedy, co zrobił (/audit)
```

### Kompletna ścieżka (Editor)

```
1. Logowanie (/login)
   ↓
2. Dashboard Organizacji (/dashboard) - tylko dostępne strony
   ↓
3. [POMINIĘTE] - Editor nie może tworzyć stron
   ↓
4. Przejście do buildera (/sites/[slug]/builder) - tylko jeśli ma dostęp
   ↓
5. Zapis draftu (w builderze) - tylko jeśli ma builder.edit
   ↓
6. Publikacja strony (w builderze) - tylko jeśli ma builder.publish
   ↓
7. Publikacja posta w marketingu (/marketing) - tylko jeśli ma marketing.publish
   ↓
8. Podgląd efektu + statystyki (/marketing/jobs/{jobId}) - tylko jeśli ma marketing.view
   ↓
9. Informacja: kto, kiedy, co zrobił (/audit) - tylko dostępna aktywność
```

---

## Mapa punktów bólu UX

### 🔴 Krytyczne (wymagają natychmiastowej uwagi)

1. **KROK 2 (Dashboard):** Brak jasnego wskaźnika statusu stron (draft vs published)
2. **KROK 4 (Builder):** Brak informacji o współbieżnej edycji (collaborative editing)
3. **KROK 5 (Zapis draftu):** Brak wersjonowania (historia zmian)
4. **KROK 7 (Marketing):** Brak możliwości anulowania publikacji w trakcie
5. **KROK 8 (Statystyki):** Statystyki mogą być niedostępne (API limitations)

### 🟡 Ważne (wymagają poprawy)

1. **KROK 1 (Logowanie):** Brak możliwości resetu hasła bezpośrednio z formularza
2. **KROK 2 (Dashboard):** Brak możliwości szybkiego filtrowania/sortowania listy stron
3. **KROK 3 (Utworzenie strony):** Brak walidacji slug w czasie rzeczywistym
4. **KROK 6 (Publikacja strony):** Brak możliwości zaplanowania publikacji (scheduled publish)
5. **KROK 7 (Marketing):** Brak możliwości publikacji częściowej (retry failed channels)
6. **KROK 9 (Historia):** Brak możliwości wyszukiwania w historii

### 🟢 Mniejsze (nice to have)

1. **KROK 2 (Dashboard):** Brak informacji o tym, kto ostatnio edytował stronę
2. **KROK 4 (Builder):** Brak możliwości podglądu strony przed wejściem do buildera
3. **KROK 5 (Zapis draftu):** Brak możliwości cofnięcia zmian (undo/redo)
4. **KROK 8 (Statystyki):** Brak możliwości eksportu statystyk
5. **KROK 9 (Historia):** Brak możliwości cofnięcia akcji (undo) z poziomu historii

---

## Rekomendacje

### Priorytet 1: Krytyczne poprawki UX

1. **Dodać wskaźniki statusu** na każdym poziomie (draft/published, pending/success/failed)
2. **Zaimplementować collaborative editing** (lock/unlock, live cursors)
3. **Dodać wersjonowanie** dla stron i draftów
4. **Zaimplementować anulowanie publikacji** (cancel job)
5. **Dodać fallback dla statystyk** (komunikat, jeśli API nie zwraca danych)

### Priorytet 2: Ważne ulepszenia

1. **Dodać reset hasła** z formularza logowania
2. **Dodać filtrowanie i sortowanie** na dashboardzie
3. **Dodać walidację slug** w czasie rzeczywistym
4. **Zaimplementować scheduled publish** (planowanie publikacji)
5. **Dodać retry dla failed channels** w marketingu
6. **Dodać wyszukiwanie** w historii aktywności

### Priorytet 3: Nice to have

1. **Dodać informacje o ostatnim edytorze** na dashboardzie
2. **Dodać podgląd strony** przed wejściem do buildera
3. **Zaimplementować undo/redo** w builderze
4. **Dodać eksport statystyk** (CSV, PDF)
5. **Dodać możliwość cofnięcia akcji** z historii (jeśli możliwe)

---

## Uwagi końcowe

- **Ten dokument opisuje PRZEBIEG, nie UI** - skupia się na akcjach użytkownika, efektach i powrotach
- **Różnice między Owner a Editor** są kluczowe - system RBAC musi być jasno komunikowany
- **Punkty bólu UX** wymagają priorytetyzacji - niektóre mogą blokować użytkowników
- **AuditLog** jest kluczowy dla kroku 9 - musi być zaimplementowany dla wszystkich akcji

---

**Koniec dokumentu**





