# UX Flow: Właściciel organizacji tworzy stronę i publikuje ją + marketing

## Historia użytkownika
**Rola:** Właściciel organizacji  
**Cel:** Utworzenie strony internetowej, jej publikacja i promocja marketingowa

---

## 1. LOGOWANIE

### 1.1. Ekran startowy
**URL:** `/`  
**Co użytkownik widzi:**
- Ekran ładowania z tekstem "Loading..." lub "Redirecting..."
- System automatycznie sprawdza token autoryzacji

**Co się dzieje:**
- Jeśli token istnieje → przekierowanie do `/dashboard`
- Jeśli token nie istnieje → przekierowanie do `/login`

**Problemy UX:**
- ❌ Brak informacji, co się dzieje podczas ładowania
- ❌ Brak możliwości anulowania procesu
- ❌ Brak komunikatu o błędzie, jeśli coś pójdzie nie tak

---

### 1.2. Ekran logowania
**URL:** `/login`  
**Co użytkownik widzi:**
- Logo Net-Flow (poziome) na górze
- Tytuł: "Zaloguj się" / "Login"
- Podtytuł: "Zaloguj się do swojego konta"
- Formularz z polami:
  - Email (pole wymagane, typ email)
  - Hasło (pole wymagane, typ password z możliwością pokazania/ukrycia)
- Przycisk "Zaloguj się" / "Login"
- Mała notatka na dole formularza
- Przełącznik języka (PL/EN) w prawym górnym rogu
- Jeśli pierwszy raz → modal wyboru języka (PL/EN)

**Co użytkownik klika:**
1. Wprowadza email
2. Wprowadza hasło
3. Kliknie "Zaloguj się"

**Gdzie trafia dalej:**
- Po udanym logowaniu → `/dashboard`
- Przy błędzie → komunikat błędu pod formularzem (czerwone tło)

**Problemy UX:**
- ✅ Dobra walidacja pól
- ✅ Możliwość pokazania hasła
- ⚠️ Modal języka może być mylący przy pierwszym logowaniu (blokuje formularz)
- ❌ Brak linku "Zapomniałem hasła"
- ❌ Brak linku "Zarejestruj się" (jeśli rejestracja jest dostępna)

---

## 2. PIERWSZY EKRAN (DASHBOARD)

### 2.1. Dashboard główny
**URL:** `/dashboard`  
**Co użytkownik widzi:**
- Nagłówek: "Dashboard" + powitanie z emailem użytkownika
- **Sekcja Quick Stats** (6 metryk):
  - 🏢 Całkowita liczba stron
  - 👥 Użytkownicy
  - ✓ Aktywne
  - 📊 Całkowite
  - 📁 Kolekcje
  - 🖼️ Media
- **Sekcja Sites Overview** (lewa kolumna):
  - Tytuł: "Przegląd stron"
  - Przyciski: "Nowa" i "Zobacz wszystkie"
  - Filtry:
    - Pole wyszukiwania
    - Dropdown: "Wszystkie plany" / "Free" / "Professional" / "Enterprise"
    - Dropdown: "Bez grupowania" / "Grupuj według planu"
  - Lista stron (maksymalnie 3):
    - Nazwa strony
    - Slug
    - Badge z planem
    - Przyciski: "Zobacz" i "Użytkownicy"
- **Sekcja Quick Actions** (prawa kolumna):
  - Przycisk: "Utwórz stronę"
  - Przycisk: "Zobacz wszystkie strony"
  - Przycisk: "Rozliczenia"
  - Przycisk: "Konto"
- **Sekcja Recent Activity** (na dole):
  - Lista ostatnich aktywności z czasem

**Co użytkownik klika:**
- Opcja A: Przycisk "Nowa" w sekcji Sites Overview
- Opcja B: Przycisk "Utwórz stronę" w Quick Actions
- Opcja C: Link "Zobacz wszystkie" → `/sites`

**Gdzie trafia dalej:**
- Kliknięcie "Nowa" / "Utwórz stronę" → `/sites/new`
- Kliknięcie "Zobacz wszystkie" → `/sites`
- Kliknięcie "Zobacz" przy stronie → `/sites/[slug]`

**Problemy UX:**
- ✅ Dobry przegląd statystyk
- ✅ Szybki dostęp do tworzenia strony
- ⚠️ Jeśli użytkownik nie ma żadnych stron, widzi EmptyState z przyciskiem "Utwórz stronę"
- ❌ Brak jasnej informacji, co to są "Kolekcje" i "Media" (tylko liczby)
- ❌ Brak wyjaśnienia różnicy między "Aktywne" a "Całkowite"

---

## 3. TWORZENIE STRONY

### 3.1. Formularz tworzenia strony
**URL:** `/sites/new`  
**Co użytkownik widzi:**
- Nagłówek: "Utwórz nową stronę" + przycisk "Anuluj" (prawy górny róg)
- Karta z formularzem:
  - Tytuł sekcji: "Informacje o stronie"
  - Pole "Nazwa strony" (wymagane, min. 3 znaki)
  - Pole "Slug" (wymagane, min. 3 znaki, tylko małe litery, cyfry i myślniki)
  - Checkbox: "Automatycznie generuj slug z nazwy"
  - Przyciski: "Utwórz" i "Anuluj"
  - Jeśli błąd → czerwony komunikat błędu

**Co użytkownik klika:**
1. Wprowadza nazwę strony (np. "Moja Firma")
2. Slug generuje się automatycznie (np. "moja-firma") lub użytkownik edytuje ręcznie
3. Kliknie "Utwórz"

**Gdzie trafia dalej:**
- Po utworzeniu → `/sites/[slug]` (strona szczegółów)
- Przy błędzie → komunikat błędu + pozostaje na stronie
- Kliknięcie "Anuluj" → `/sites`

**Problemy UX:**
- ✅ Automatyczne generowanie slug jest wygodne
- ✅ Walidacja w czasie rzeczywistym
- ⚠️ Brak podglądu finalnego URL (np. "twoja-strona.netflow.com/moja-firma")
- ❌ Brak informacji, co to jest "slug" i do czego służy
- ❌ Brak możliwości wyboru domeny/subdomeny
- ❌ Brak wyboru szablonu strony przy tworzeniu

---

### 3.2. Strona szczegółów (po utworzeniu)
**URL:** `/sites/[slug]`  
**Co użytkownik widzi:**
- Breadcrumbs: "Strony" → [nazwa strony]
- Nagłówek: Nazwa strony + opis
- Badge z rolą użytkownika + Plan + Status
- **Sekcja Szczegóły:**
  - Nazwa
  - Slug
  - Tenant ID
  - Plan
  - Status
  - Data utworzenia
  - Data aktualizacji
  - Twoja rola
- **Sekcja Quick Actions:**
  - Przycisk: "Edytuj w builderze"
  - Przycisk: "Otwórz panel strony"
  - Przycisk: "Marketing"
  - Przycisk: "Zarządzaj użytkownikami"
  - Przycisk: "Plan i funkcje"
  - Przycisk: "Zobacz rozliczenia"

**Co użytkownik klika:**
- Opcja A: "Otwórz panel strony" → `/sites/[slug]/panel` (przekierowanie do overview)
- Opcja B: "Edytuj w builderze" → `/sites/[slug]/panel/page-builder` (ale wymaga pageId!)

**Gdzie trafia dalej:**
- Kliknięcie "Otwórz panel strony" → `/sites/[slug]/panel/overview`
- Kliknięcie "Edytuj w builderze" → **PROBLEM: wymaga pageId, ale nie ma strony!**

**Problemy UX:**
- ❌ **KRYTYCZNE:** Przycisk "Edytuj w builderze" prowadzi do page-builder, ale nie ma jeszcze żadnej strony!
- ❌ Brak jasnej ścieżki: "Najpierw utwórz stronę, potem edytuj"
- ❌ Użytkownik nie wie, że musi najpierw utworzyć stronę w panelu
- ⚠️ Panel strony jest dostępny, ale nie ma tam jasnej instrukcji "Utwórz pierwszą stronę"

---

## 4. BUDOWA STRONY

### 4.1. Panel strony - Overview
**URL:** `/sites/[slug]/panel` → automatyczne przekierowanie do `/sites/[slug]/panel/overview`  
**Co użytkownik widzi:**
- **Lewa nawigacja (SitePanelLayout):**
  - Overview
  - Pages
  - Page Builder
  - Content
  - Collections
  - Media
  - Design
  - SEO
  - Marketing
  - Deployments
  - Snapshots
  - Activity
  - Settings
- **Główna zawartość:**
  - **Karta Site Information:**
    - Nazwa strony, Slug, Plan, Status
  - **Statystyki (3 karty):**
    - Pages: [liczba]
    - Media Files: [liczba]
    - Last Published: [data] lub "Not published yet"
  - **Quick Actions:**
    - "Open Builder" (wyłączony!)
    - "Create Page" (wyłączony!)
    - "Publish All" (aktywny)
  - **Draft vs Production State:**
    - Draft State: 0 unpublished drafts, 0 draft pages
    - Production State: 0 published pages, last publish: —
  - **Recently Modified Pages:**
    - EmptyState: "No pages yet"
  - **Recent Activity:**
    - Placeholder: "Activity log will appear here"

**Co użytkownik klika:**
- Opcja A: W lewej nawigacji kliknie "Pages" → `/sites/[slug]/panel/pages`
- Opcja B: W lewej nawigacji kliknie "Page Builder" → `/sites/[slug]/panel/page-builder` (ale wymaga pageId!)

**Gdzie trafia dalej:**
- Kliknięcie "Pages" → `/sites/[slug]/panel/pages`
- Kliknięcie "Page Builder" → **PROBLEM: wymaga pageId w URL!**

**Problemy UX:**
- ❌ **KRYTYCZNE:** Przyciski "Open Builder" i "Create Page" są wyłączone - użytkownik nie wie, co zrobić!
- ❌ Brak jasnej instrukcji: "Kliknij 'Pages' w menu, aby utworzyć pierwszą stronę"
- ❌ EmptyState w "Recently Modified Pages" nie ma call-to-action
- ⚠️ "Publish All" jest aktywny, ale nie ma nic do publikacji

---

### 4.2. Lista stron
**URL:** `/sites/[slug]/panel/pages`  
**Co użytkownik widzi:**
- Nagłówek: "Pages" + opis + przycisk "New Page"
- Jeśli brak stron:
  - EmptyState: "No pages yet" + "Create a page to start building your site"
- Jeśli są strony:
  - Tabela z kolumnami:
    - Title
    - Slug
    - Status (Badge: Draft/Published/Archived)
    - Environment (Badge: Draft/Production)
    - Last Edited (data)
    - Actions (przyciski: Edit, Open in Builder, Publish, Delete)

**Co użytkownik klika:**
- Opcja A: Przycisk "New Page" w nagłówku
- Opcja B: Jeśli są strony → "Open in Builder" przy konkretnej stronie

**Gdzie trafia dalej:**
- Kliknięcie "New Page" → otwiera modal tworzenia strony
- Kliknięcie "Open in Builder" → `/sites/[slug]/panel/page-builder?pageId=[id]`

**Problemy UX:**
- ✅ EmptyState jest jasny
- ✅ Przycisk "New Page" jest widoczny
- ⚠️ Modal tworzenia strony wymaga wyboru Environment (Draft/Production) - użytkownik może nie wiedzieć, co wybrać

---

### 4.3. Modal tworzenia strony
**URL:** Modal na stronie `/sites/[slug]/panel/pages`  
**Co użytkownik widzi:**
- Tytuł: "Create New Page"
- Formularz:
  - Pole "Title" (wymagane)
  - Pole "Slug" (opcjonalne, auto-generowane z tytułu)
  - Dropdown "Environment" (wymagane):
    - Opcje: "Draft" lub "Production"
  - Przyciski: "Cancel" i "Create"

**Co użytkownik klika:**
1. Wprowadza tytuł strony (np. "Strona główna")
2. Slug generuje się automatycznie (np. "strona-glowna")
3. Wybiera Environment (domyślnie "Draft")
4. Kliknie "Create"

**Gdzie trafia dalej:**
- Po utworzeniu → modal się zamyka, lista stron się odświeża
- Strona pojawia się w tabeli ze statusem "Draft"

**Problemy UX:**
- ⚠️ Użytkownik może nie wiedzieć, co to jest "Environment" i dlaczego ma wybierać między Draft a Production
- ❌ Brak wyjaśnienia: "Draft = wersja robocza, Production = wersja publiczna"
- ❌ Brak możliwości wyboru szablonu strony
- ✅ Auto-generowanie slug jest wygodne

---

### 4.4. Page Builder
**URL:** `/sites/[slug]/panel/page-builder?pageId=[id]`  
**Co użytkownik widzi:**
- **Górny pasek:**
  - Nazwa strony (np. "Strona główna")
  - Badge: "Draft" (żółty) lub "Production" (zielony)
  - Ikona informacji (ℹ️) z tooltipem
  - Tekst: "Saved [czas]" (jeśli zapisano)
  - Przyciski: "Save" i "Publish" (tylko jeśli Draft)
- **Lewy sidebar (Block Browser):**
  - Lista dostępnych bloków do dodania
- **Środek (Canvas):**
  - Edytowalny obszar strony
  - Wizualny podgląd strony
- **Prawy sidebar (Properties Panel):**
  - Właściwości wybranego bloku
  - Jeśli nic nie wybrano → puste lub domyślne ustawienia

**Co użytkownik klika:**
1. Wybiera blok z lewego sidebaru
2. Dodaje blok do canvas (środek)
3. Edytuje właściwości bloku w prawym sidebarze
4. Kliknie "Save" (zapisuje zmiany)
5. Kliknie "Publish" (publikuje stronę)

**Gdzie trafia dalej:**
- Kliknięcie "Save" → zmiany zapisane, pojawia się "Saved [czas]"
- Kliknięcie "Publish" → otwiera modal potwierdzenia publikacji
- Auto-save działa co 30 sekund (cichy)

**Problemy UX:**
- ✅ Dobry layout z trzema panelami
- ✅ Auto-save jest wygodne
- ⚠️ Brak instrukcji, jak używać Page Buildera (pierwszy raz)
- ⚠️ Brak podglądu na urządzeniach mobilnych
- ❌ Brak możliwości cofnięcia zmian (Undo/Redo)
- ❌ Brak możliwości podglądu strony przed publikacją (preview)
- ⚠️ Modal publikacji wyjaśnia, co się stanie, ale użytkownik może nie zrozumieć różnicy między Draft a Production

---

### 4.5. Modal publikacji strony
**URL:** Modal na stronie Page Builder  
**Co użytkownik widzi:**
- Tytuł: "Publish Page"
- Niebieska ramka z informacją:
  - "What happens: Publishing moves your draft changes to production, making them visible to visitors immediately."
- Tekst: "Are you sure you want to publish this page? The page will be visible publicly at: [slug]"
- Przyciski: "Cancel" i "Publish"

**Co użytkownik klika:**
- Opcja A: "Cancel" → modal się zamyka
- Opcja B: "Publish" → strona jest publikowana

**Gdzie trafia dalej:**
- Po publikacji → strona odświeża się, badge zmienia się na "Production"
- Przycisk "Publish" znika (bo strona jest już w Production)
- Toast notification: "Page published successfully"

**Problemy UX:**
- ✅ Dobra informacja o konsekwencjach
- ⚠️ Brak informacji o URL publicznej strony (np. "twoja-strona.netflow.com/strona-glowna")
- ❌ Brak możliwości zaplanowania publikacji na później
- ❌ Brak możliwości publikacji tylko części zmian

---

## 5. PUBLIKACJA

### 5.1. Publikacja z Page Buildera
**Akcja:** Użytkownik kliknie "Publish" w Page Builderze  
**Co się dzieje:**
1. Strona jest zapisywana
2. Strona jest publikowana (przeniesiona z Draft do Production)
3. Deployment jest automatycznie tworzony
4. Toast notification: "Page published successfully"
5. Badge zmienia się z "Draft" na "Production"
6. Przycisk "Publish" znika

**Gdzie trafia dalej:**
- Użytkownik pozostaje w Page Builderze
- Może kontynuować edycję (ale teraz edytuje Production)

**Problemy UX:**
- ⚠️ Po publikacji użytkownik edytuje Production - nie ma już Draft do testowania!
- ❌ Brak informacji o statusie deploymentu (czy się udał?)
- ❌ Brak linku do publicznej strony
- ❌ Brak możliwości cofnięcia publikacji

---

### 5.2. Publikacja z listy stron
**URL:** `/sites/[slug]/panel/pages`  
**Akcja:** Użytkownik kliknie "Publish" przy stronie w tabeli  
**Co się dzieje:**
1. Strona jest publikowana
2. Toast notification: "Page published successfully"
3. Lista stron się odświeża
4. Status strony zmienia się na "Published"
5. Environment zmienia się na "Production"

**Gdzie trafia dalej:**
- Użytkownik pozostaje na liście stron

**Problemy UX:**
- ✅ Szybka publikacja bez otwierania Page Buildera
- ❌ Brak potwierdzenia przed publikacją (może być przypadkowe kliknięcie)
- ❌ Brak informacji o deploymentzie

---

### 5.3. Publikacja wszystkich stron
**URL:** `/sites/[slug]/panel/overview`  
**Akcja:** Użytkownik kliknie "Publish All"  
**Co się dzieje:**
1. Wszystkie strony Draft są publikowane
2. Toast notification: "All pages published successfully"
3. Statystyki się odświeżają

**Gdzie trafia dalej:**
- Użytkownik pozostaje na Overview

**Problemy UX:**
- ⚠️ Brak potwierdzenia przed publikacją wszystkich stron
- ❌ Brak informacji, które strony będą opublikowane
- ❌ Brak możliwości wyboru, które strony opublikować

---

### 5.4. Historia deploymentów
**URL:** `/sites/[slug]/panel/deployments`  
**Co użytkownik widzi:**
- Nagłówek: "Deployments" + ikona informacji (ℹ️)
- Opis: "History of publish and deployment operations."
- Niebieska ramka z wyjaśnieniem:
  - "How it works: When you publish a page, a deployment is automatically created. Successful deployments make your changes live, failed ones need attention. Check the status and message columns for details."
- Tabela z kolumnami:
  - Timestamp
  - Type
  - Environment
  - Status (Badge: Success/Failed)
  - Message
- Jeśli brak deploymentów:
  - EmptyState: "No deployments yet" + "Deployments will appear here after you publish pages."

**Co użytkownik klika:**
- Może przeglądać historię deploymentów
- Może zobaczyć szczegóły każdego deploymentu

**Gdzie trafia dalej:**
- Użytkownik pozostaje na stronie deployments

**Problemy UX:**
- ✅ Dobra dokumentacja, jak działa deployment
- ✅ Status deploymentu jest widoczny
- ❌ Brak możliwości ponowienia nieudanego deploymentu
- ❌ Brak linku do publicznej strony po udanym deploymentzie
- ❌ Brak szczegółów błędu, jeśli deployment się nie powiódł

---

## 6. MARKETING

### 6.1. Panel marketingowy
**URL:** `/sites/[slug]/panel/marketing`  
**Co użytkownik widzi:**
- Nagłówek: "Marketing & Distribution" + opis: "Publish content everywhere: website, social media, and ads"
- Przycisk "Publish" w prawym górnym rogu
- **Tabs:**
  - Campaigns ([liczba])
  - Drafts ([liczba])
  - Publish Jobs ([liczba])
- **Zawartość zależy od wybranego taba**

**Co użytkownik klika:**
- Opcja A: Tab "Campaigns" → widzi kampanie marketingowe
- Opcja B: Tab "Drafts" → widzi szkice dystrybucji
- Opcja C: Tab "Publish Jobs" → widzi zadania publikacji
- Opcja D: Przycisk "Publish" → otwiera modal publikacji

**Gdzie trafia dalej:**
- Zależy od wybranego taba

**Problemy UX:**
- ✅ Dobra organizacja z tabami
- ⚠️ Użytkownik może nie wiedzieć, co to są "Campaigns", "Drafts" i "Publish Jobs"
- ❌ Brak wyjaśnienia różnicy między publikacją strony a publikacją marketingową

---

### 6.2. Tab Campaigns
**URL:** `/sites/[slug]/panel/marketing` (tab Campaigns)  
**Co użytkownik widzi:**
- Nagłówek: "Campaigns" + przycisk "New Campaign"
- Jeśli brak kampanii:
  - EmptyState: "No campaigns yet" + "Create a campaign to organize your marketing content"
- Jeśli są kampanie:
  - Grid kart (2-3 kolumny):
    - Nazwa kampanii
    - Status (Badge)
    - Opis (jeśli jest)
    - Statystyki: "[liczba] drafts · [liczba] jobs"

**Co użytkownik klika:**
- Przycisk "New Campaign" → otwiera modal tworzenia kampanii

**Gdzie trafia dalej:**
- Po utworzeniu kampanii → modal się zamyka, lista się odświeża

**Problemy UX:**
- ✅ EmptyState jest jasny
- ⚠️ Użytkownik może nie wiedzieć, do czego służy kampania
- ❌ Brak możliwości edycji/usunięcia kampanii (tylko tworzenie)

---

### 6.3. Modal tworzenia kampanii
**URL:** Modal na stronie marketing  
**Co użytkownik widzi:**
- Tytuł: "Create Campaign"
- Formularz:
  - Pole "Name" (wymagane)
  - Pole "Description" (opcjonalne, textarea)
  - Przyciski: "Cancel" i "Create"

**Co użytkownik klika:**
1. Wprowadza nazwę kampanii
2. (Opcjonalnie) wprowadza opis
3. Kliknie "Create"

**Gdzie trafia dalej:**
- Po utworzeniu → modal się zamyka, kampania pojawia się w liście

**Problemy UX:**
- ✅ Prosty formularz
- ❌ Brak wyjaśnienia, co to jest kampania i do czego służy

---

### 6.4. Tab Drafts
**URL:** `/sites/[slug]/panel/marketing` (tab Drafts)  
**Co użytkownik widzi:**
- Nagłówek: "Distribution Drafts" + przycisk "New Draft"
- Jeśli brak draftów:
  - EmptyState: "No drafts yet" + "Create a draft to prepare content for omnichannel publishing"
- Jeśli są drafty:
  - Lista kart:
    - Tytuł draftu
    - Status (Badge)
    - Kanały (Badge dla każdego kanału: site, facebook, twitter, linkedin, instagram, ads)
    - Kampania (jeśli przypisana)

**Co użytkownik klika:**
- Przycisk "New Draft" → otwiera modal tworzenia draftu

**Gdzie trafia dalej:**
- Po utworzeniu draftu → modal się zamyka, lista się odświeża

**Problemy UX:**
- ✅ EmptyState wyjaśnia cel draftów
- ⚠️ Użytkownik może nie wiedzieć, co to są "Distribution Drafts"
- ❌ Brak możliwości edycji/usunięcia draftu
- ❌ Brak możliwości podglądu draftu

---

### 6.5. Modal tworzenia draftu
**URL:** Modal na stronie marketing  
**Co użytkownik widzi:**
- Tytuł: "Create Distribution Draft"
- Formularz:
  - Pole "Title" (wymagane)
  - Pole "Channels" (checkboxy):
    - site
    - facebook
    - twitter
    - linkedin
    - instagram
    - ads
  - Przyciski: "Cancel" i "Create"

**Co użytkownik klika:**
1. Wprowadza tytuł
2. Zaznacza kanały (co najmniej jeden)
3. Kliknie "Create"

**Gdzie trafia dalej:**
- Po utworzeniu → modal się zamyka, draft pojawia się w liście

**Problemy UX:**
- ⚠️ Brak pola na treść draftu (tylko tytuł!)
- ❌ Brak możliwości dodania treści, obrazów, linków
- ❌ Brak wyjaśnienia, co to są "channels" i do czego służą

---

### 6.6. Tab Publish Jobs
**URL:** `/sites/[slug]/panel/marketing` (tab Publish Jobs)  
**Co użytkownik widzi:**
- Nagłówek: "Publish Jobs"
- Jeśli brak zadań:
  - EmptyState: "No publish jobs yet" + "Publish content to see job status and results"
- Jeśli są zadania:
  - Lista kart (klikalnych):
    - Tytuł (z draftu lub "Job [id]")
    - Status (Badge)
    - Kampania (jeśli przypisana)
    - Data publikacji
    - Kanały (Badge dla każdego kanału)
    - Wyniki publikacji (dla każdego kanału):
      - ✓ Published lub ✗ Failed: [błąd]
      - Link "View" (jeśli dostępny)
    - Tekst: "Click to view details"

**Co użytkownik klika:**
- Kliknięcie karty zadania → otwiera modal ze szczegółami

**Gdzie trafia dalej:**
- Modal ze szczegółami zadania

**Problemy UX:**
- ✅ Dobra wizualizacja statusu publikacji
- ✅ Linki do opublikowanych treści są wygodne
- ⚠️ Użytkownik może nie wiedzieć, co to są "Publish Jobs"
- ❌ Brak możliwości anulowania zadania w toku

---

### 6.7. Modal publikacji marketingowej
**URL:** Modal na stronie marketing (przycisk "Publish")  
**Co użytkownik widzi:**
- Tytuł: "Publish Content"
- Formularz:
  - Dropdown "Draft (optional)": "Create new" lub lista istniejących draftów
  - Jeśli "Create new":
    - Pole "Title"
  - Pole "Channels" (checkboxy):
    - site, facebook, twitter, linkedin, instagram, ads
  - Przyciski: "Cancel" i "Publish"

**Co użytkownik klika:**
1. (Opcjonalnie) wybiera istniejący draft
2. Jeśli "Create new" → wprowadza tytuł
3. Zaznacza kanały
4. Kliknie "Publish"

**Gdzie trafia dalej:**
- Po publikacji → modal się zamyka, zadanie publikacji pojawia się w tab "Publish Jobs"
- Toast notification: "Publish job created successfully"

**Problemy UX:**
- ❌ **KRYTYCZNE:** Brak pola na treść! Użytkownik może tylko wybrać tytuł i kanały
- ❌ Brak możliwości dodania obrazów, linków, hashtagów
- ❌ Brak możliwości zaplanowania publikacji na później
- ❌ Brak możliwości edycji treści dla każdego kanału osobno

---

### 6.8. Modal szczegółów zadania publikacji
**URL:** Modal na stronie marketing (po kliknięciu zadania)  
**Co użytkownik widzi:**
- Nagłówek: Tytuł zadania + przycisk "Close"
- Kampania (jeśli przypisana)
- Status (Badge)
- Kanały (Badge dla każdego kanału)
- Data rozpoczęcia
- Data zakończenia (jeśli zakończone)
- **Wyniki publikacji:**
  - Dla każdego kanału:
    - Status (Success/Failed)
    - Link "View Post →" (jeśli dostępny)
    - Data publikacji
    - Błąd (jeśli failed)

**Co użytkownik klika:**
- Przycisk "Close" → zamyka modal
- Link "View Post →" → otwiera opublikowaną treść w nowej karcie

**Gdzie trafia dalej:**
- Zamyka modal i pozostaje na stronie marketing

**Problemy UX:**
- ✅ Dobra wizualizacja wyników
- ✅ Linki do opublikowanych treści są wygodne
- ❌ Brak możliwości ponowienia nieudanej publikacji
- ❌ Brak możliwości edycji zadania

---

## 7. POWRÓT DO KONTROLI

### 7.1. Powrót do Dashboard
**URL:** `/dashboard`  
**Co użytkownik widzi:**
- Te same sekcje co wcześniej, ale z zaktualizowanymi danymi:
  - Quick Stats pokazują nową stronę
  - Sites Overview pokazuje nową stronę
  - Recent Activity pokazuje nowe aktywności

**Co użytkownik klika:**
- Może kliknąć "Zobacz" przy stronie → `/sites/[slug]`
- Może kliknąć "Utwórz stronę" → `/sites/new`

**Gdzie trafia dalej:**
- Zależy od akcji

**Problemy UX:**
- ✅ Dashboard odzwierciedla aktualny stan
- ⚠️ Brak powiadomień o nowych deploymentach, publikacjach marketingowych

---

### 7.2. Powrót do panelu strony
**URL:** `/sites/[slug]/panel/overview`  
**Co użytkownik widzi:**
- Zaktualizowane statystyki:
  - Pages: [liczba] (zwiększona)
  - Last Published: [data] (zaktualizowana)
  - Draft vs Production State pokazuje opublikowane strony

**Co użytkownik klika:**
- Może przejść do innych sekcji panelu (Pages, Marketing, Deployments, itp.)

**Gdzie trafia dalej:**
- Zależy od wybranej sekcji

**Problemy UX:**
- ✅ Statystyki są aktualne
- ⚠️ Brak powiadomień o statusie deploymentu
- ❌ Brak linku do publicznej strony

---

## PODSUMOWANIE PROBLEMÓW UX

### 🔴 KRYTYCZNE PROBLEMY

1. **Brak jasnej ścieżki tworzenia pierwszej strony:**
   - Po utworzeniu strony użytkownik widzi przycisk "Edytuj w builderze", ale nie ma jeszcze strony do edycji
   - Brak instrukcji: "Najpierw utwórz stronę w panelu"

2. **Page Builder wymaga pageId:**
   - Kliknięcie "Page Builder" w menu bez pageId prowadzi donikąd
   - Brak możliwości utworzenia strony bezpośrednio z Page Buildera

3. **Marketing - brak treści:**
   - Modal publikacji marketingowej nie ma pola na treść
   - Użytkownik może tylko wybrać tytuł i kanały

4. **Brak linku do publicznej strony:**
   - Po publikacji użytkownik nie widzi linku do opublikowanej strony
   - Nie wie, gdzie jego strona jest dostępna

### ⚠️ WAŻNE PROBLEMY

5. **Brak wyjaśnień pojęć:**
   - Environment (Draft vs Production) - użytkownik może nie wiedzieć, co wybrać
   - Campaigns, Drafts, Publish Jobs - brak wyjaśnień
   - Slug - brak wyjaśnienia, co to jest

6. **Brak podglądu przed publikacją:**
   - Użytkownik nie może zobaczyć, jak strona będzie wyglądać przed publikacją
   - Brak podglądu na urządzeniach mobilnych

7. **Brak możliwości cofnięcia:**
   - Po publikacji nie ma możliwości cofnięcia zmian
   - Brak historii wersji

8. **Brak informacji o deploymentzie:**
   - Po publikacji użytkownik nie widzi statusu deploymentu
   - Brak powiadomień o nieudanych deploymentach

### 💡 SUGESTIE POPRAWEK

1. **Dodaj onboarding:**
   - Po utworzeniu strony pokaż krok po kroku: "1. Utwórz stronę w panelu, 2. Edytuj w builderze, 3. Opublikuj"

2. **Dodaj link do publicznej strony:**
   - Po publikacji pokaż link: "Zobacz opublikowaną stronę → [URL]"

3. **Ulepsz marketing:**
   - Dodaj edytor treści w modalach tworzenia draftów i publikacji
   - Dodaj możliwość edycji treści dla każdego kanału osobno

4. **Dodaj wyjaśnienia:**
   - Tooltips przy kluczowych pojęciach
   - Krótkie instrukcje w każdym kroku

5. **Dodaj podgląd:**
   - Przycisk "Preview" w Page Builderze
   - Podgląd na różnych urządzeniach

6. **Dodaj historię:**
   - Historia zmian strony
   - Możliwość przywrócenia poprzedniej wersji

---

## MAPA PRZEPŁYWU

```
1. LOGOWANIE
   / → /login → /dashboard

2. DASHBOARD
   /dashboard → /sites/new

3. TWORZENIE STRONY
   /sites/new → /sites/[slug]

4. PANEL STRONY
   /sites/[slug] → /sites/[slug]/panel/overview
   → /sites/[slug]/panel/pages

5. TWORZENIE STRONY W PANELU
   Modal na /sites/[slug]/panel/pages → Strona w liście

6. PAGE BUILDER
   /sites/[slug]/panel/pages → "Open in Builder" → /sites/[slug]/panel/page-builder?pageId=[id]

7. PUBLIKACJA
   Page Builder → "Publish" → Modal → Strona opublikowana
   Lub: /sites/[slug]/panel/pages → "Publish" → Strona opublikowana

8. DEPLOYMENT
   Automatyczny po publikacji → /sites/[slug]/panel/deployments

9. MARKETING
   /sites/[slug]/panel/marketing → Tabs (Campaigns/Drafts/Jobs) → Publikacja

10. POWRÓT
    /dashboard → Zaktualizowane statystyki
    /sites/[slug]/panel/overview → Zaktualizowane statystyki
```

---

**Data utworzenia:** 2025-01-20  
**Wersja:** 1.0  
**Status:** Kompletny flow UX zidentyfikowany

