# Happy Path - Reguły Wymuszane przez System

**Wersja:** 1.0  
**Data:** 2025-01-20  
**Rola:** Product Owner + UX Architect  
**Status:** Definicja wymuszanego happy path

---

## Cel

System **WYMUSZA** jeden, jedyny happy path poprzez:
- Blokowanie wszystkich akcji poza jedyną dozwoloną
- Wyświetlanie jedynego możliwego CTA
- Automatyczne przekierowania do właściwego miejsca

---

## REGUŁA 1: Brak Stron (Sites)

**IF:** Użytkownik nie ma żadnych stron w organizacji

**THEN:**

1. **Co użytkownik MA zobaczyć:**
   - Dashboard: EmptyState z tytułem "Nie masz jeszcze żadnych stron"
   - Opis: "Utwórz pierwszą stronę, aby rozpocząć"
   - **JEDYNE CTA:** "Utwórz pierwszą stronę"

2. **Co jest ZABLOKOWANE:**
   - Wszystkie linki w menu (Pages, Page Builder, Marketing, Deployments, Settings)
   - Wszystkie przyciski Quick Actions
   - Nawigacja do `/sites/[slug]` (przekierowanie z powrotem do dashboard)
   - Wszystkie sekcje dashboardu poza EmptyState

3. **JAKIE CTA jest jedynym możliwym:**
   - Przycisk: "Utwórz pierwszą stronę"

4. **Gdzie użytkownik jest przekierowany:**
   - Kliknięcie CTA → `/sites/new`
   - Po utworzeniu strony → `/sites/[slug]/panel/overview`

---

## REGUŁA 2: Brak Pages (w obrębie Site)

**IF:** Strona (Site) istnieje, ale nie ma żadnych Pages

**THEN:**

1. **Co użytkownik MA zobaczyć:**
   - Overview (`/sites/[slug]/panel/overview`): EmptyState w sekcji "Recently Modified Pages"
   - Tytuł: "Nie masz jeszcze żadnych stron"
   - Opis: "Utwórz pierwszą stronę, aby rozpocząć budowanie"
   - **JEDYNE CTA:** "Utwórz pierwszą stronę"

2. **Co jest ZABLOKOWANE:**
   - Przycisk "Open Builder" (wyłączony, szary)
   - Przycisk "Create Page" w Quick Actions (wyłączony, szary)
   - Link "Page Builder" w lewej nawigacji (kliknięcie → przekierowanie do `/sites/[slug]/panel/pages`)
   - Przycisk "Publish All" (wyłączony, szary)
   - Wszystkie akcje w Page Builder (jeśli użytkownik próbuje wejść bez pageId → przekierowanie)

3. **JAKIE CTA jest jedynym możliwym:**
   - Przycisk: "Utwórz pierwszą stronę" (w EmptyState)

4. **Gdzie użytkownik jest przekierowany:**
   - Kliknięcie CTA → `/sites/[slug]/panel/pages` + automatyczne otwarcie modala "Create New Page"
   - Kliknięcie "Page Builder" w menu → przekierowanie do `/sites/[slug]/panel/pages`
   - Próba wejścia do Page Builder bez pageId → przekierowanie do `/sites/[slug]/panel/pages`

---

## REGUŁA 3: Brak PageId w Page Builder

**IF:** Użytkownik próbuje wejść do Page Builder bez pageId lub pageId jest nieprawidłowy

**THEN:**

1. **Co użytkownik MA zobaczyć:**
   - Przekierowanie (automatyczne, bez wyświetlania Page Builder)
   - Toast notification: "Wybierz stronę do edycji"

2. **Co jest ZABLOKOWANE:**
   - Cały Page Builder (nie renderuje się)
   - Wszystkie akcje w Page Builder

3. **JAKIE CTA jest jedynym możliwym:**
   - Brak CTA (automatyczne przekierowanie)

4. **Gdzie użytkownik jest przekierowany:**
   - Automatyczne przekierowanie → `/sites/[slug]/panel/pages`
   - Jeśli brak pages → EmptyState z CTA "Utwórz pierwszą stronę" (zgodnie z REGUŁĄ 2)

---

## REGUŁA 4: Brak Draftów Marketingowych

**IF:** Użytkownik jest w sekcji Marketing, tab "Drafts", i nie ma żadnych draftów

**THEN:**

1. **Co użytkownik MA zobaczyć:**
   - Tab "Drafts": EmptyState
   - Tytuł: "Nie masz jeszcze żadnych draftów"
   - Opis: "Utwórz draft, aby przygotować treść do publikacji omnichannel"
   - **JEDYNE CTA:** "Utwórz nowy draft"

2. **Co jest ZABLOKOWANE:**
   - Przycisk "Publish" w prawym górnym rogu (wyłączony, szary)
   - Wszystkie akcje na draftach (brak draftów do akcji)
   - Tab "Publish Jobs" (jeśli brak draftów → EmptyState bez CTA, tylko informacja)

3. **JAKIE CTA jest jedynym możliwym:**
   - Przycisk: "Utwórz nowy draft" (w nagłówku taba "Drafts")

4. **Gdzie użytkownik jest przekierowany:**
   - Kliknięcie CTA → otwarcie modala "Create Distribution Draft"
   - Po utworzeniu draftu → modal się zamyka, draft pojawia się w liście

---

## REGUŁA 5: Brak Treści Marketingowej (Content) w Draft

**IF:** Użytkownik tworzy DistributionDraft, ale nie wypełnił treści dla żadnego kanału

**THEN:**

1. **Co użytkownik MA zobaczyć:**
   - Modal "Create Distribution Draft" z formularzem
   - Pole "Title" (wymagane)
   - Sekcja "Channels" z checkboxami (co najmniej jeden wymagany)
   - Sekcja "Content" z edytorem treści dla każdego wybranego kanału (wymagane)
   - Walidacja: jeśli brak treści dla wybranego kanału → komunikat błędu pod edytorem

2. **Co jest ZABLOKOWANE:**
   - Przycisk "Create" w modalu (wyłączony, szary) dopóki:
     - Tytuł nie jest wypełniony
     - Co najmniej jeden kanał nie jest wybrany
     - Treść nie jest wypełniona dla każdego wybranego kanału
   - Publikacja draftu bez treści (jeśli draft istnieje, ale bez treści → przycisk "Publish" wyłączony)

3. **JAKIE CTA jest jedynym możliwym:**
   - Przycisk "Create" (aktywny tylko gdy wszystkie wymagane pola są wypełnione)

4. **Gdzie użytkownik jest przekierowany:**
   - Po utworzeniu draftu z treścią → modal się zamyka, draft pojawia się w liście z statusem "draft"
   - Użytkownik pozostaje w tab "Drafts"

---

## REGUŁA 6: Brak Opublikowanych Stron (Production)

**IF:** Strona (Site) ma Pages w DRAFT, ale brak Pages w PRODUCTION

**THEN:**

1. **Co użytkownik MA zobaczyć:**
   - Overview: Status "DRAFT" (szary badge)
   - Sekcja "Production State": "0 published pages"
   - Sekcja "Recently Modified Pages": lista stron ze statusem "Draft"
   - Każda strona w liście: przycisk "Publish" (jeśli użytkownik ma uprawnienia `builder.publish`)

2. **Co jest ZABLOKOWANE:**
   - Link do publicznej strony (jeśli brak published pages → link nieaktywny lub ukryty)
   - Sekcja "Deployments" (jeśli brak published pages → EmptyState: "Brak deploymentów. Opublikuj stronę, aby zobaczyć deploymenty")

3. **JAKIE CTA jest jedynym możliwym:**
   - Przycisk "Publish" przy każdej stronie Draft (jeśli ma uprawnienia)
   - Lub przycisk "Publish All" w Quick Actions (jeśli ma uprawnienia)

4. **Gdzie użytkownik jest przekierowany:**
   - Kliknięcie "Publish" → modal potwierdzenia → publikacja → strona pozostaje w liście, status zmienia się na "Published"
   - Kliknięcie "Publish All" → publikacja wszystkich Draft pages → wszystkie zmieniają status na "Published"

---

## REGUŁA 7: Marketing - Brak Opublikowanych Stron do Marketingu

**IF:** Użytkownik próbuje utworzyć DistributionDraft, ale nie ma żadnych opublikowanych stron (PRODUCTION)

**THEN:**

1. **Co użytkownik MA zobaczyć:**
   - Modal "Create Distribution Draft": formularz z informacją
   - Niebieska ramka z ostrzeżeniem: "Aby publikować treść marketingową, najpierw opublikuj przynajmniej jedną stronę w Production"
   - Pole "ContentId" (opcjonalne) → dropdown z listą stron (pusta, jeśli brak published pages)
   - Komunikat: "Brak opublikowanych stron. Opublikuj stronę, aby móc tworzyć treści marketingowe"

2. **Co jest ZABLOKOWANE:**
   - Pole "ContentId" (wyłączone, szare) jeśli brak published pages
   - Przycisk "Create" (wyłączony, szary) jeśli:
     - Brak published pages I pole "ContentId" jest wymagane dla wybranych kanałów
   - Publikacja draftu bez powiązania z published page (jeśli wymagane)

3. **JAKIE CTA jest jedynym możliwym:**
   - Link w komunikacie: "Opublikuj stronę" → `/sites/[slug]/panel/pages`
   - Lub przycisk "Create" (jeśli ContentId nie jest wymagane dla wybranych kanałów)

4. **Gdzie użytkownik jest przekierowany:**
   - Kliknięcie "Opublikuj stronę" → `/sites/[slug]/panel/pages` (lista stron z przyciskami "Publish")
   - Po publikacji strony → powrót do marketingu → możliwość utworzenia draftu

---

## REGUŁA 8: Marketing - Publikacja bez Draft

**IF:** Użytkownik próbuje opublikować treść marketingową (przycisk "Publish"), ale nie ma żadnych draftów

**THEN:**

1. **Co użytkownik MA zobaczyć:**
   - Modal "Publish Content": formularz
   - Dropdown "Draft (optional)": opcja "Create new" (domyślnie wybrana)
   - Jeśli wybrano "Create new": formularz tworzenia draftu (zgodnie z REGUŁĄ 5)
   - Jeśli wybrano istniejący draft: formularz publikacji

2. **Co jest ZABLOKOWANE:**
   - Dropdown "Draft" (jeśli brak draftów → tylko opcja "Create new")
   - Przycisk "Publish" (wyłączony, szary) dopóki:
     - Nie wybrano draftu LUB nie wypełniono formularza "Create new"
     - Nie wybrano co najmniej jednego kanału
     - Nie wypełniono treści dla wybranych kanałów

3. **JAKIE CTA jest jedynym możliwym:**
   - Przycisk "Publish" (aktywny tylko gdy wszystkie wymagania spełnione)

4. **Gdzie użytkownik jest przekierowany:**
   - Po publikacji → modal się zamyka, zadanie publikacji pojawia się w tab "Publish Jobs"
   - Użytkownik pozostaje w tab "Publish Jobs" (automatyczne przełączenie)

---

## Podsumowanie Hierarchii Blokad

```
1. Brak Sites → TYLKO utworzenie Site
2. Brak Pages → TYLKO utworzenie Page
3. Brak PageId w Builder → TYLKO wybór Page
4. Brak Drafts → TYLKO utworzenie Draft
5. Brak Content w Draft → TYLKO wypełnienie Content
6. Brak Published Pages → TYLKO publikacja Page
7. Brak Published Pages dla Marketingu → TYLKO publikacja Page
8. Brak Draft do Publikacji → TYLKO utworzenie Draft
```

---

## Zasady Ogólne

1. **JEDNO CTA na raz:** W każdej sytuacji tylko jeden przycisk/link jest aktywny
2. **AUTOMATYCZNE PRZEKIEROWANIA:** System przekierowuje użytkownika do właściwego miejsca
3. **BLOKOWANIE WSZYSTKIEGO POZA HAPPY PATH:** Wszystkie inne akcje są wyłączone/szare
4. **JASNE KOMUNIKATY:** Każdy EmptyState ma jasny tytuł, opis i jedno CTA
5. **WALIDACJA PRZED AKCJĄ:** Przyciski są wyłączone dopóki wszystkie wymagania nie są spełnione

---

**Koniec definicji.**

