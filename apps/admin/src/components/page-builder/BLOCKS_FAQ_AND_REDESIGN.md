# Page Builder – FAQ, różnice między blokami i propozycje uproszczenia

Odpowiedzi na pytania o redundancję, różnice między wersjami i działanie wybranych bloków. Na końcu: **propozycje konsolidacji** (jeden blok z opcjami zamiast wielu podobnych).

---

## Decyzje wdrożone (pkt 10, 14, 22, 25, 31, 34, 35, 38)

| Pkt | Decyzja |
|-----|--------|
| **10** | **Lightbox** nie jest osobnym blokiem. Jest **opcją w bloku Obraz**: checkbox „Otwórz w lightbox”. Obraz z włączoną opcją renderuje się z `data-lightbox="true"`; front/motyw obsługuje klik i overlay. |
| **14** | **Map-snapshot** usunięty z katalogu. Statyczną mapę można wstawić zwykłym blokiem **Image** z URL (np. Google Static Maps). Interaktywna mapa = blok mapy (embed). |
| **22** | **Modal** usunięty z katalogu. Okno dialogowe to logika szablonu (przycisk → open/close), nie element do ręcznego montowania w kreatorze. Zawartość modala można budować w szablonie lub przez inne bloki w kontekście „treść modala”. |
| **25** | **Collection-empty-state** usunięty z katalogu. Komunikat „Brak danych” ma się **pokazywać automatycznie**, gdy kolekcja jest pusta (logika listy/kolekcji), a nie jako blok do dodawania. |
| **31** | **Analytics-pixel** i **tag-manager-slot** usunięte z katalogu. Pixel / GTM mają być **dodawane automatycznie na witrynę** przy włączeniu modułu (ustawienia strony/szablonu), nie bloki w kreatorze. |
| **34** | **OpenGraph-preview** usunięty. OpenGraph to metadane (og:image, og:title) do podglądu linku w social media; edycja w SEO strony, nie jako blok na canvas. |
| **35** | **Error-boundary-placeholder** usunięty. Przy błędzie ładowania bloku **automatycznie** ma się pokazywać powiadomienie (error boundary na poziomie renderu), nie blok do ręcznego wstawiania. |
| **38** | **Custom-class-presets** usunięty z katalogu. Presety klas to konfiguracja motywu/szablonu, nie blok w kreatorze. |

Dodatkowo usunięto z katalogu: **split-layout**, **card-grid** (wystarczy Layout + Card), **debug-outline-toggle**, **comment-annotation**.

---

## Audyt bloków – kolejna redukcja (sklejanie)

Przejrzano każdy blok z katalogu i zredukowano duplikaty:

| Było | Jest | Uwagi |
|------|------|--------|
| **gallery-grid** + **masonry-gallery** | **gallery** | Ten sam layout (grid 3 kol.). Liczba kolumn w panelu. |
| **carousel-images** + **carousel-content** | **carousel** | Ten sam kontener (flex, overflow auto). Obrazy lub treść – wybór zawartości. |
| **spacer** + **divider** + **shape-divider** | **spacer-divider** | Jeden blok z polem „Spacer / Divider”: Odstęp / Linia / Kształt. |
| **html-embed** + **iframe-embed** | **embed** | Jeden blok media; Kind w panelu (embed lub iFrame). |
| **html-anchor-link** | (usunięty) | Duplikat **Anchor** z Layout – kotwica już jest w Layout. |
| **back-to-top** | (usunięty) | Zwykły przycisk – użyj **Button**. |
| **before-after-slider** | (usunięty) | Layout z 2 kolumnami – użyj **Layout**, proporcje 50/50. |

Stare typy mają **fallback** w BlockRenderer (renderują się jak złączony blok), żeby istniejące strony działały.

---

## 1. Redundancja – „po co kilka bloków jak można jeden?”

**Masz rację.** Obecny katalog to w dużej mierze **presety** (gotowe ustawienia) zamiast **jednego bloku z konfiguracją**. To wygodne „z pudełka”, ale rzeczywiście się powiela.

### Columns / Grid / Flex-row / Flex-column / Stack

- **columns** – preset: grid 2 kolumny.
- **grid** – preset: grid 3 kolumny.
- **flex-row** – preset: flex, kierunek wiersz.
- **flex-column** – preset: flex, kierunek kolumna.
- **stack** – preset: flex kolumna + mniejszy gap.

**Różnica:** tylko inne `display`, `flexDirection`, `gridTemplateColumns`, `gap` w domyślnych propsach. Jeden blok **Container** (albo **Layout**) mógłby mieć:

- Tryb: **Grid** / **Flex**
- Dla Grid: liczba kolumn (1–12), gap, wiersze.
- Dla Flex: kierunek (row/column), wrap, gap, justify, align.

Wtedy **columns**, **grid**, **flex-row**, **flex-column**, **stack** = tylko szablony/quick-add tego samego bloku z innymi ustawieniami, a nie osobne typy.

### Card vs card-grid

- **card** – jedna karta (kontener ze stylem).
- **card-grid** – siatka 3 kolumn (kontener).

Wystarczyłby **jeden blok „Cards”**: ustawienie „liczba kolumn” (1 = jedna karta, 3 = grid kart). Jedna karta to po prostu 1 kolumna. Nie potrzeba dwóch typów.

### Split-layout vs columns

**split-layout** to grid `1fr 1fr` (50/50). To dokładnie to, co **Columns** z opcją „szerokość kolumn” (np. 50%/50% albo 30%/70%). Jeden blok **Columns/Layout** z konfiguracją proporcji usuwa potrzebę osobnego split-layout.

### Podsumowanie redundancji

| Zamiast wielu bloków | Jeden blok z opcjami |
|----------------------|----------------------|
| columns, grid, flex-row, flex-column, stack | **Layout** (Grid/Flex, kolumny, kierunek, gap) |
| card, card-grid | **Cards** (liczba kolumn 1–N) |
| split-layout | **Layout** (np. 2 kolumny + proporcje 30/70, 50/50) |

---

## 2. Różnice między wersjami „containera”

Wszystkie to **ten sam komponent** (GenericContainerBlock) z innymi **domyślnymi** ustawieniami:

| Blok | Różnica (domyślne content/style) |
|------|-----------------------------------|
| **container** | `tag: div`, bez display – „pusty” kontener. |
| **grid** | `display: grid`, `gridTemplateColumns: repeat(3, 1fr)`, `gap: 24px`. |
| **columns** | `display: grid`, 2 kolumny, gap 24px. |
| **flex-row** | `display: flex`, `flexDirection: row`, gap 16px. |
| **flex-column** | `display: flex`, `flexDirection: column`, gap 16px. |
| **stack** | flex column, gap 12px. |
| **wrap** | flex, `flexWrap: wrap`, gap 12px. |
| **card** | div z ciemnym tłem, zaokrągleniami, paddingiem (wygląd karty). |
| **card-grid** | grid 3 kolumny + styl jak card (tło, padding). |
| **split-layout** | grid 2 kolumny 1fr 1fr, gap 32px. |
| **sticky-container** | `position: sticky`, `top: 0`. |
| **absolute-layer** | `position: absolute`, `top/left: 0`. |
| **spacer** | brak dzieci, `minHeight: 24px`. |
| **divider** | brak dzieci, `minHeight: 1px`, kolor linii. |
| **shape-divider** | brak dzieci, wyższy minHeight („kształt”). |
| **background-layer** | kontener jako tło (kolor). |
| **overlay** | półprzezroczysty (np. rgba), zwykle bez dzieci. |
| **scroll-container** | `overflow: auto`. |
| **marquee-container** | `overflow: hidden` + flex – pod marquee (animacja). |

**Wniosek:** to nie są różne „silniki”, tylko **presety jednego Containera**. Można to zastąpić jednym **Container** z zakładkami: Layout (grid/flex/kolumny), Position (sticky/absolute), Overflow, Wygląd (np. „card style”).

---

## 3. Grid vs Columns

- **Grid** (obecny blok) = grid 3 kolumny.
- **Columns** (obecny) = grid 2 kolumny.

Różnica tylko w **liczbie kolumn**. Jeden blok **Layout** z typem „Grid” i polem „liczba kolumn” (i opcjonalnie „liczba wierszy”) załatwia oba przypadki. Kolumny w sensie „2/3/4 kolumny” to po prostu grid z 2/3/4 kolumnami.

---

## 4. Sticky-container vs absolute-layer

| | sticky-container | absolute-layer |
|---|------------------|----------------|
| **Pozycjonowanie** | `position: sticky` | `position: absolute` |
| **Znaczenie** | Element „przykleja się” przy przewijaniu (np. header), ale zajmuje miejsce w dokumencie. | Element jest wyjęty z flow, pozycja względem rodzica (top/left/right/bottom). |
| **Użycie** | Sticky header, sticky sidebar, sticky CTA. | Nakładki, floating button, warstwa na wierzchu. |

Oba mogą być **opcjami pozycji** w jednym bloku Container (Position: static / relative / sticky / absolute), z polami top/left/right/bottom.

---

## 5. Scroll-container vs marquee-container

| | scroll-container | marquee-container |
|---|-------------------|--------------------|
| **Działanie** | `overflow: auto` – użytkownik **przewija** zawartość (pion/poziom) paskiem lub gestem. | `overflow: hidden` – zawartość **nie jest przewijana przez użytkownika**; typowo JS/CSS robi animację „biegnącego” tekstu/logo (marquee). |
| **Użycie** | Długie listy, tabele, bloki kodu w ograniczonym pudełku. | Biegające logo, ticker, „marquee” na żywo. |

Różnica: **scroll** = użytkownik scrolluje, **marquee** = automatyczna animacja w jednym „oknie”.

---

## 6. Code-block / inline-code / Markdown – typografia vs zaawansowane

- **Typografia** = treść czytana jako tekst (akapit, nagłówek, lista).
- **Zaawansowane** = bardziej „techniczne” (kod, markdown, warunkowe bloki).

Obecnie code/markdown są w typografii, bo **wizualnie** to tekst. Sensownie można je przenieść do **„Zaawansowane”** albo **„Kod / Dane”**, żeby oddzielić od zwykłej prozy. To kwestia kategoryzacji w UI (zakładki w bibliotece bloków), nie zmiany działania.

---

## 7. Image vs image-with-caption

**Zgoda.** Powinien być **jeden blok Obraz** z opcjami:

- Źródło (URL / plik)
- Alt
- **Opcja: pokazać podpis (caption)** – pole tekstowe; jeśli puste, bez figcaption.

Osobny blok „image-with-caption” nie jest potrzebny – to ten sam blok z włączonym caption.

---

## 8. Gallery-grid vs masonry-gallery

W **obecnej** implementacji oba używają tego samego komponentu (container) i **tego samego layoutu** – grid 3 kolumny z gap. Różnica jest tylko w **nazwie** i ewentualnie w zamierzeniu:

- **Gallery grid** – równa siatka (wszystkie karty tej samej wysokości lub aspect-ratio).
- **Masonry** – „cegiełki” (Pinterest-style): różne wysokości, elementy dopasowane bez dużych przerw; wymaga innego CSS (np. column-count lub JS masonry).

Obecnie **masonry-gallery** w kodzie nie ma innej logiki niż zwykły grid – to do dopracowania, jeśli ma być prawdziwy masonry. Na razie różnica jest głównie semantyczna / nazewnictwo.

---

## 9. Carousel-content – media vs „treść”

**Carousel (Content)** to przewijany **dowolny content** (bloki), nie tylko zdjęcia. Sensownie może być w kategorii **„Treść”** lub **„Layout”** („Slider treści”), a **Carousel (Images)** zostaje w **Media**. Albo jedna kategoria **„Slider / Karuzela”** z opcją „typ: obrazy / treść”.

---

## 10. Lightbox-viewer

**Lightbox** = podgląd obrazu (lub galerii) w pełnym ekranie / w overlay po kliknięciu w miniaturę. **Wdrożone:** blok „Lightbox Viewer” usunięty z katalogu; lightbox jest **opcją w bloku Image** („Otwórz w lightbox”). Obraz z tą opcją ma `data-lightbox="true"`; front/motyw obsługuje overlay.

---

## 11. Jeden blok Video (embed vs plik)

**Tak.** Sensowne jest **jeden blok „Video”** z wyborem:

- **Źródło:** link (YouTube/Vimeo/embed) **lub** plik wideo (upload).
- W zależności od wyboru: pole URL **albo** media picker.

Dwa osobne bloki (video-embed, video-file) można złączyć w jeden z opcją w ustawieniach.

---

## 12. Background-video

**Background video** = wideo odtwarzane **w tle** (np. za tekstem na hero), zwykle bez kontrolek, zapętlone, często z ciemnym overlay dla czytelności tekstu. Blok ma `kind: video` – docelowo ten komponent mógłby mieć opcje: autoplay, loop, muted, overlay, object-fit (cover). Obecnie to ten sam GenericMediaBlock co zwykłe wideo, z możliwością dopięcia stylów (position, object-fit) w panelu.

---

## 13. Lottie-animation

**Lottie** = format animacji wektorowych (JSON z After Effects). **Lottie animation** to blok do odtwarzania takiej animacji na stronie (biblioteka typu lottie-web). Użycie: ikony animowane, ilustracje, proste animacje bez gifa/wideo. Obecnie w kodzie to „media” z `kind: embed` – docelowo embedem byłby URL do .json Lottie lub wgrany plik.

---

## 14. Map-snapshot

**Map snapshot** = statyczny obraz mapy. **Wdrożone:** blok usunięty z katalogu. Statyczną mapę wstawia się zwykłym blokiem **Image** z URL (np. Google Static Maps). Interaktywna mapa = blok mapy (embed).

---

## 15. Header / Footer jako pełne sekcje

**Słuszna uwaga.** Header i footer semantycznie powinny być **jedna sekcja na całą szerokość** (np. jeden blok „Header” i jeden „Footer”), a nie małe bloczki wstawiane obok innych. Można to zrobić tak:

- **Header** = specjalny typ sekcji (np. „Sekcja: Header”) – zawsze full-width, może mieć wewnątrz logo + nav; albo jeden blok „Header” który sam renderuje się jako `<header>` na pełną szerokość i przyjmuje wewnątrz tylko wybrane bloki (logo, menu).
- **Footer** = analogicznie „Sekcja: Footer” lub jeden blok „Footer” full-width.

Wtedy nie da się „wrzucić kilku headerów obok siebie” – header/footer są traktowane jako pojedyncze sekcje strony.

---

## 16. Mobile-menu-drawer

**Mobile menu drawer** = menu na mobile w formie **szuflady** (wjeżdża z boku lub z góry po kliknięciu hamburgera). W page builderze to na razie **kontener** – miejsce na to, co ma być wewnątrz szuflady (linki, przyciski). Samo otwieranie/zamykanie (hamburger → drawer open/close) to zwykle logika w szablonie/komponencie strony, a nie w pojedynczym bloku; blok definiuje **treść** drawera.

---

## 17. Pagination

**Pagination** = numeracja stron (1, 2, 3 … Następna) przy listach/tabelach. Blok to na razie **lista** z domyślnymi elementami [1, 2, 3] – reprezentacja linków/ przycisków paginacji. Docelowo mógłby być podpięty pod kolekcję (np. „strona 2 z 10”) i generować linki na podstawie liczby stron.

---

## 18. Step-navigator

**Step navigator** = nawigacja **krok po kroku** (np. w formularzu wielokrokowym lub w procesie: Krok 1 → Krok 2 → Krok 3). Wizualnie to często poziomy rząd „kroków” z łącznikami. W builderze to kontener flex z gap – wewnątrz umieszczasz bloki reprezentujące każdy krok (np. tekst + przycisk Dalej).

---

## 19. TOC (Table of Contents)

**TOC** = **Spis treści** – lista linków do nagłówków na tej samej stronie (np. „Wprowadzenie”, „Funkcje”, „FAQ”). Użytkownik klika i strona przewija do sekcji. W builderze to na razie lista z przykładowymi pozycjami; docelowo mógłby być generowany automatycznie z nagłówków H2/H3 na stronie.

---

## 20. Hero, Feature-grid, Feature-list, Callout, Stats-strip

| Blok | Działanie |
|------|-----------|
| **Hero** | Główna sekcja nad foldem: często grid (tekst + obraz), duży nagłówek, CTA. Preset layoutu 1.2fr 1fr. |
| **Feature-grid** | Siatka 3 kolumny – „funkcje / zalety” (ikona + tytuł + opis). |
| **Feature-list** | Lista punktowana – te same „funkcje” w formie listy zamiast siatki. |
| **Callout** | Wyróżniona wiadomość (alert): tytuł + tekst, inne tło/ramka. Do ważnych ogłoszeń, ostrzeżeń, tipów. |
| **Stats-strip** | Pasek **liczb** w jednej linii (np. „10k użytkowników”, „99% uptime”). Flex, space-between. |

Wszystkie to presety layoutu + ewentualnie styl; dałyby się zastąpić jednym „Sekcja treści” z szablonem (Hero / Features / Callout / Stats).

---

## 21. Pricing-table / pricing-card – marketing vs e‑commerce

**Pricing** bywa używany i na landingach (marketing: „Nasze plany”), i w sklepach (e‑commerce: ceny produktów). Różnica:

- **Marketing:** cennik **planów / subskrypcji** (np. Basic / Pro / Enterprise).
- **E‑commerce:** ceny **produktów** (koszyk, checkout).

Obecnie **pricing-card** ma `moduleKey: 'payments'` – więc jest już przy płatnościach. Sensownie **pricing-table** i **pricing-card** przenieść do kategorii **E‑commerce / Płatności** (albo „Cennik”), a w marketingu zostawić tylko „preview” cennika (np. hero z ceną) albo link do strony cennika. Jedno źródło prawdy: cennik = jeden zestaw bloków w E‑commerce/Płatności.

---

## 22. Modal

**Modal** = okno dialogowe (overlay + ramka). **Wdrożone:** blok usunięty z katalogu. Otwieranie/zamykanie to logika szablonu (przycisk + komponent Modal), nie element do ręcznego wstawiania w kreatorze.

---

## 23. Badge

**Badge** = mała **etykieta** (np. „Nowość”, „Promocja”, „Beta”) – krótki tekst w kolorowym pudełku. Użycie: przy produktach, nagłówkach, kartach. Obecny blok to po prostu tekst + style (kolor, padding, border-radius).

---

## 24. Cookie-notice – marketing vs narzędzia/moduły

**Cookie notice** to nie „marketing”, tylko **zgodność z prawem / moduł zgód**. Powinien być w **Narzędzia** albo **Moduły** (np. consent-security). Obecna kategoryzacja w „components” przy marketingu jest myląca – do poprawy.

---

## 25. Collection-empty-state

**Collection empty state** = treść przy pustej kolekcji. **Wdrożone:** blok usunięty z katalogu. Komunikat „Brak danych” ma się **pokazywać automatycznie**, gdy kolekcja jest pusta (logika listy/kolekcji), nie jako blok do ręcznego dodawania.

---

## 26. Load-more

**Load more** = przycisk **„Załaduj więcej”** (lub infinite scroll) przy listach/kolekcjach. Zamiast paginacji użytkownik klika i dokładają się kolejne elementy. W builderze to przycisk z tekstem „Load more” i URL (docelowo podpięty pod kolekcję, żeby ładował następną „stronę” wyników).

---

## 27. Calendly-embed

**Calendly** = serwis do **rezerwacji spotkań** (kalendarz + wybór terminu). **Calendly embed** = wstawka iframe z widżetem Calendly (np. „Umów rozmowę”). Użycie: landing, kontakt – użytkownik wybiera termin bez wychodzenia ze strony.

---

## 28. Chat-widget-embed

**Chat widget** = okienko **czatu na żywo** (np. Intercom, Drift, Tawk, Messenger). **Chat-widget-embed** = iframe/skrypt tego widżetu. Po wstawieniu na stronę pojawia się ikona czatu w rogu i okno rozmowy.

---

## 29. YouTube-playlist

**YouTube Playlist** = embed **playlisty YouTube** (lista filmów w jednym odtwarzaczu). Różnica względem pojedynczego „video embed”: pokazujesz całą playlistę, użytkownik wybiera kolejny film z listy.

---

## 30. Spotify-embed

**Spotify embed** = wstawka **odtwarzacza Spotify** (playlisty, albumu, podcastu). Użycie: strona artysty, podcastu – odtwarzanie muzyki/audycji bez wychodzenia na Spotify.

---

## 31. Analytics-pixel

**Analytics pixel** = kod śledzący (konwersje, remarketing). **Wdrożone:** bloki analytics-pixel i tag-manager-slot usunięte z katalogu. Pixel/GTM mają być **dodawane automatycznie na witrynę** przy włączeniu modułu (ustawienia strony/szablonu), nie jako bloki w kreatorze.

---

## 32. Tag-manager-slot

**Tag Manager** (np. GTM) zarządza skryptami (analityka, reklamy, czat) przez kontener. **Tag Manager Slot** = **miejsce** (slot) na stronie, gdzie GTM może wstrzyknąć kod (np. w konkretną sekcję). Blok rezerwuje „pozycję” dla tagu bez hardkodowania samego skryptu w builderze.

---

## 33. SEO-block – po co blok, skoro SEO w ustawieniach strony

**Zgoda.** Meta title, description, OG zwykle powinny być **w ustawieniach strony** (jeden zestaw na stronę), a nie blokiem w treści. **SEO-block** w builderze ma sens tylko jeśli: (1) strona ma wiele „sekcji” z osobnym meta (np. FAQ schema per sekcja), albo (2) to placeholder pod rozszerzenia (np. JSON-LD). Dla typowej strony **wystarczy SEO w ustawieniach strony**; blok można usunąć lub zostawić jako zaawansowany.

---

## 34. OpenGraph-preview

**OpenGraph** = metadane (og:image, og:title, og:description) do **podglądu linku** w social media. **Wdrożone:** blok usunięty z katalogu. Edycja OG należy do SEO strony, nie do bloku na canvas.

---

## 35. Error-boundary-placeholder

**Error boundary** = fallback przy błędzie w komponencie. **Wdrożone:** blok usunięty z katalogu. Przy błędzie ładowania bloku **automatycznie** ma się pokazywać powiadomienie (error boundary na poziomie renderu), nie blok do ręcznego wstawiania.

---

## 36. Debug-outline-toggle

**Debug outline** = obramowanie wokół bloków (np. kolorowe ramki), żeby **wizualnie** zobaczyć granice każdego bloku przy debugowaniu layoutu. **Debug-outline-toggle** = przycisk włączający/wyłączający te obramowania. Przydatne tylko w trybie dev/debug; w produkcji zwykle ukryty.

---

## 37. Comment-annotation – blok vs ustawienie bloku

**Słusznie.** Komentarz do bloku (niewidoczny w produkcji) powinien być **polem w ustawieniach każdego bloku** (np. „Notatka dla redaktora”), a nie osobnym blokiem. Osobny blok „comment-annotation” niepotrzebnie zaśmieca listę; lepiej: w panelu właściwości każdego bloku pole „Komentarz / Notatka” (tylko w panelu, nie renderowane na froncie).

---

## 38. Custom-class-presets

**Custom class presets** = własne klasy CSS z motywu/szablonu. **Wdrożone:** blok usunięty z katalogu. Presety klas to konfiguracja motywu/szablonu, nie blok w kreatorze stron.

---

## 39. Tabs i Accordion – zaawansowane vs nawigacja

**Tabs** = przełączanie treści (zakładki). **Accordion** = rozwijane sekcje. Oba mogą służyć **nawigacji po treści** (np. FAQ = accordion, sekcje strony = tabs), ale nie są „nawigacją” w sensie menu (header/footer/breadcrumbs).

- **Nawigacja** = menu, linki, breadcrumbs, pagination – „gdzie idę”.
- **Tabs/Accordion** = organizacja treści na stronie – „co pokazuję w tym miejscu”.

Obecna kategoria **Zaawansowane** ma sens, bo to bardziej złożone interakcje (stan, ARIA). Można je przenieść do **„Treść”** lub **„Interakcja”** jeśli chcesz mieć „Nawigacja” tylko dla menu. To kwestia nazewnictwa kategorii: „Nawigacja” = tylko menu, albo „Nawigacja i struktura” = menu + tabs + accordion. Propozycja: **Tabs i Accordion** w **„Treść”** lub **„Interakcja”**, a **Nawigacja** tylko dla menu, breadcrumbs, pagination.

---

## Podsumowanie rekomendacji

1. **Jedna rodzina layoutu:** jeden blok **Layout/Container** z trybem Grid/Flex, liczbą kolumn, proporcjami (np. 30/70), zamiast osobnych columns/grid/flex-row/flex-column/stack/split-layout.
2. **Jedna karta:** blok **Cards** z opcją „liczba kolumn” zamiast card + card-grid.
3. **Jeden obraz:** blok **Image** z opcją „Podpis (caption)” zamiast image + image-with-caption.
4. **Jedno wideo:** blok **Video** z opcją „Link (embed) lub plik” zamiast video-embed + video-file.
5. **Header/Footer** jako pełne sekcje (specjalny typ lub jeden blok full-width), nie małe bloczki.
6. **Komentarz** = pole w ustawieniach każdego bloku, nie osobny blok.
7. **SEO** głównie w ustawieniach strony; SEO-block tylko jeśli potrzebne per-sekcja.
8. **Cookie-notice** i **pricing** przenieść do Moduły/Narzędzia i E‑commerce.
9. **Kategorie:** code/markdown → Zaawansowane; carousel treści → Treść/Layout; tabs/accordion → Treść/Interakcja; cookie-notice → Moduły/Narzędzia.

Mogę w następnym kroku zaproponować konkretną listę typów bloków po konsolidacji (np. z 159 do ~80–100) i zmiany w `catalogBlocks` / `registerBlocks`.