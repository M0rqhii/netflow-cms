# Puste Stany - Projekt UX

**Data:** 2025-01-20  
**Rola:** UX Writer + Product Designer  
**Zakres:** Projekt pustych stanów prowadzących użytkownika przez system

---

## Zasady Projektowe

- **1 zdanie wyjaśnienia** - ludzkie, nietechniczne
- **1 GŁÓWNE CTA** - jednoznaczna akcja
- **0–1 drugorzędne CTA** - opcjonalna alternatywa
- **Zero technicznych terminów** - język prosty i zrozumiały
- **Zero opcji do wyboru** - jedna droga dalej
- **Prowadzenie użytkownika** - jasna ścieżka do następnego kroku

---

## 1. Dashboard – Brak Stron

**Lokalizacja:** `/dashboard` (sekcja Sites Overview)

**Kontekst:** Użytkownik właśnie się zalogował i nie ma jeszcze żadnych stron w organizacji.

**Pusty Stan:**

**Wyjaśnienie:**
> Twoja pierwsza strona czeka na utworzenie.

**GŁÓWNE CTA:**
- **Tekst przycisku:** "Utwórz pierwszą stronę"
- **Akcja:** Przekierowanie do `/sites/new`

**Drugorzędne CTA:**
- Brak (użytkownik ma tylko jedną opcję)

**Uzasadnienie:**
- Krótkie, zachęcające zdanie bez technicznych terminów
- CTA prowadzi bezpośrednio do tworzenia strony
- Brak alternatyw - użytkownik musi utworzyć stronę, żeby kontynuować

---

## 2. Site Overview – Brak Pages

**Lokalizacja:** `/sites/[slug]/panel/overview` (sekcja Recently Modified Pages)

**Kontekst:** Użytkownik ma stronę, ale nie utworzył jeszcze żadnych podstron (pages).

**Pusty Stan:**

**Wyjaśnienie:**
> Dodaj pierwszą podstronę, żeby zacząć budować swoją stronę.

**GŁÓWNE CTA:**
- **Tekst przycisku:** "Utwórz podstronę"
- **Akcja:** Przekierowanie do `/sites/[slug]/panel/pages` z otwartym modalem tworzenia

**Drugorzędne CTA:**
- Brak (użytkownik ma tylko jedną opcję)

**Uzasadnienie:**
- Wyjaśnienie używa prostego słowa "podstronę" zamiast technicznego "page"
- CTA prowadzi bezpośrednio do utworzenia pierwszej podstrony
- Brak alternatyw - użytkownik musi utworzyć podstronę, żeby kontynuować

---

## 3. Pages – Brak Pages

**Lokalizacja:** `/sites/[slug]/panel/pages`

**Kontekst:** Użytkownik jest na liście podstron, ale lista jest pusta.

**Pusty Stan:**

**Wyjaśnienie:**
> Zacznij od utworzenia pierwszej podstrony.

**GŁÓWNE CTA:**
- **Tekst przycisku:** "Utwórz podstronę"
- **Akcja:** Otwarcie modala tworzenia podstrony

**Drugorzędne CTA:**
- Brak (użytkownik ma tylko jedną opcję)

**Uzasadnienie:**
- Krótkie, bezpośrednie wyjaśnienie
- CTA otwiera modal bezpośrednio na tej stronie
- Brak alternatyw - użytkownik musi utworzyć podstronę

---

## 4. Page Builder – Brak Treści

**Lokalizacja:** `/sites/[slug]/panel/page-builder?pageId=[id]` (canvas area)

**Kontekst:** Użytkownik otworzył Page Builder, ale nie dodał jeszcze żadnych bloków treści.

**Pusty Stan:**

**Wyjaśnienie:**
> Wybierz blok z menu po lewej stronie, żeby dodać treść do strony.

**GŁÓWNE CTA:**
- **Tekst przycisku:** "Zobacz dostępne bloki"
- **Akcja:** Scroll do lewego sidebaru z blokami (lub highlight sidebaru)

**Drugorzędne CTA:**
- Brak (użytkownik ma tylko jedną opcję - wybrać blok)

**Uzasadnienie:**
- Wyjaśnienie wskazuje konkretne miejsce (menu po lewej stronie)
- CTA prowadzi uwagę użytkownika do miejsca, gdzie może wybrać blok
- Brak alternatyw - użytkownik musi wybrać blok, żeby dodać treść

---

## 5. Marketing – Brak Draftów

**Lokalizacja:** `/sites/[slug]/panel/marketing` (tab Drafts)

**Kontekst:** Użytkownik jest w sekcji Marketing, ale nie utworzył jeszcze żadnych draftów dystrybucji.

**Pusty Stan:**

**Wyjaśnienie:**
> Utwórz pierwszy draft, żeby przygotować treść do publikacji w mediach społecznościowych.

**GŁÓWNE CTA:**
- **Tekst przycisku:** "Utwórz draft"
- **Akcja:** Otwarcie modala tworzenia draftu dystrybucji

**Drugorzędne CTA:**
- Brak (użytkownik ma tylko jedną opcję)

**Uzasadnienie:**
- Wyjaśnienie używa prostego języka i wskazuje cel (publikacja w mediach społecznościowych)
- CTA prowadzi bezpośrednio do utworzenia draftu
- Brak alternatyw - użytkownik musi utworzyć draft, żeby kontynuować

---

## 6. Marketing – Brak Treści w Draftach

**Lokalizacja:** `/sites/[slug]/panel/marketing` (wewnątrz edytora draftu)

**Kontekst:** Użytkownik otworzył draft dystrybucji, ale nie dodał jeszcze treści do żadnego kanału.

**Pusty Stan:**

**Wyjaśnienie:**
> Dodaj treść dla wybranych kanałów, żeby przygotować publikację.

**GŁÓWNE CTA:**
- **Tekst przycisku:** "Dodaj treść"
- **Akcja:** Otwarcie edytora treści dla pierwszego wybranego kanału

**Drugorzędne CTA:**
- Brak (użytkownik ma tylko jedną opcję)

**Uzasadnienie:**
- Wyjaśnienie wskazuje, że trzeba dodać treść dla kanałów
- CTA prowadzi bezpośrednio do edytora treści
- Brak alternatyw - użytkownik musi dodać treść, żeby kontynuować

---

## Podsumowanie

### Wspólne Wzorce

1. **Krótkie wyjaśnienia** - maksymalnie jedno zdanie, bez technicznych terminów
2. **Jednoznaczne CTA** - każdy pusty stan ma jedną główną akcję
3. **Brak alternatyw** - użytkownik ma tylko jedną drogę dalej
4. **Prowadzenie** - każdy pusty stan wskazuje konkretny następny krok

### Hierarchia Informacji

1. **Wyjaśnienie** - co jest puste i dlaczego
2. **GŁÓWNE CTA** - co użytkownik powinien zrobić
3. **Drugorzędne CTA** - opcjonalna alternatywa (jeśli istnieje)

### Język

- **Prosty** - bez żargonu technicznego
- **Bezpośredni** - jasne instrukcje
- **Zachęcający** - pozytywny ton
- **Krótki** - maksymalnie jedno zdanie

---

**Koniec projektu.**





