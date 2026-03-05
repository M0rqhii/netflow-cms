# Zastosowanie bloków Page Buildera (159 typów)

Krótki opis każdego bloku: do czego służy i kiedy go użyć.

---

## Bloki core (rejestr główny)

| Typ | Zastosowanie |
|-----|--------------|
| **root** | Korzeń strony (tylko na canvas). Nie dodajesz go ręcznie – przyjmuje sekcje i dowolne bloki. |
| **section** | Sekcja na pełną szerokość z wewnętrznym kontenerem (max-width). Bazy pod kolumny i treść. |
| **column** | Kolumna w sekcji (np. 50%, 33%). Na mobile automatycznie 100%. Układy 2/3 kolumnowe. |
| **heading** | Nagłówek H1–H6. Tekst + poziom + style (kolor, rozmiar, wyrównanie). |
| **text** | Akapit rich text (HTML). Edycja w edytorze WYSIWYG, wyświetlanie z sanityzacją. |
| **image** | Obraz z URL, alt, opcjonalnie podpis, link i **lightbox** (opcja „Otwórz w lightbox”). Placeholder gdy brak obrazka. |
| **button** | Przycisk / link: tekst, URL, otwarcie w tej samej oknie lub nowej karcie. Pełna stylizacja. |
| **tabs** | Zakładki (taby). Zawiera tylko **tab-item**. Nagłówki z tytułów itemów, przełączanie treści. |
| **tab-item** | Jedna zakładka: tytuł w nagłówku + treść (dowolne bloki). Tylko wewnątrz **tabs**. |
| **accordion** | Akordeon (rozwijane sekcje). Zawiera tylko **accordion-item**. Opcja „wiele otwartych”. |
| **accordion-item** | Jedna sekcja akordeonu: tytuł + treść. Tylko wewnątrz **accordion**. |

---

## Layout (11)

| Typ | Zastosowanie |
|-----|--------------|
| **container** | **Layout** – tryb Grid/Flex, Liczba kolumn (1–12), Proporcje (50/50, 30/70, 70/30 dla 2 kolumn), Gap, Direction, Justify, Align. |
| **card** | **Cards** – karta lub siatka kart. Liczba kolumn: 1 = jedna karta, 3 = grid. Style karty w panelu. |
| **sticky-container** | Kontener przyklejony (sticky). Sticky header/sidebar. |
| **absolute-layer** | Warstwa absolute (top/left). Nakładki, floating CTA. |
| **spacer-divider** | **Spacer / Divider** – odstęp, linia lub kształt (w panelu: Spacer/Divider). |
| **background-layer** | Warstwa tła (kolor). Tło pod treścią. |
| **overlay** | Półprzezroczysta warstwa. Nakładka na zdjęcie/hero. |
| **anchor** | Kotwica (link `<a>`). Skoki w obrębie strony. |
| **scroll-container** | Kontener z overflow auto. Przewijana lista/tabela. |
| **marquee-container** | Kontener do marquee (overflow hidden). Biegające logo/tekst. |

Stare typy (grid, columns, spacer, divider, shape-divider, before-after-slider itd.) mają fallback – renderują się jak złączony blok.

---

## Typografia (10)

| Typ | Zastosowanie |
|-----|--------------|
| **rich-text** | Bogaty tekst (HTML). Długie artykuły, opisy. |
| **lead-paragraph** | Lead (większy akapit). Wstęp do artykułu. |
| **caption** | Podpis (mniejszy tekst). Pod zdjęciem, tabelą. |
| **quote** | Cytat (blockquote). Opinie, cytaty. |
| **list** | Lista punktowana lub numerowana. |
| **definition-list** | Lista definicji (termin + opis). FAQ, słowniczek. |
| **code-block** | Blok kodu (pre). Snippety, dokumentacja. |
| **inline-code** | Kod w linii (code). Nazwy zmiennych, komendy. |
| **kpi-text** | Tekst KPI / statystyki (np. „92% Uptime”). |
| **markdown** | Zawartość w stylu Markdown (pre). Notatki, instrukcje. |

---

## Media (9)

| Typ | Zastosowanie |
|-----|--------------|
| **gallery** | **Gallery** – siatka zdjęć/treści. Liczba kolumn w panelu. |
| **carousel** | **Carousel** – poziomy slider (obrazy lub treść). |
| **video** | **Video** – link (YouTube, Vimeo…) lub plik. Źródło w panelu. |
| **background-video** | Wideo w tle. Hero z filmem. |
| **audio-player** | Odtwarzacz audio. Podcasty, pliki dźwiękowe. |
| **icon** | Pojedyncza ikona (tekst/span). Ikony UI. |
| **icon-list** | Lista z ikonami (np. „✓ Feature”). Lista benefitów. |
| **lottie-animation** | Animacja Lottie (embed). |
| **svg** | Obraz SVG. Ikony, grafiki wektorowe. |
---


## Nawigacja i struktura strony (10)

| Typ | Zastosowanie |
|-----|--------------|
| **header** | Nagłówek strony (tag header). Logo + menu. |
| **navbar** | Pasek nawigacji (nav). Linki menu. |
| **mobile-menu-drawer** | Szuflada menu na mobile. |
| **mega-menu** | Menu rozwijane (siatka). Duże menu z kategoriami. |
| **footer** | Stopka (tag footer). |
| **sidebar-nav** | Nawigacja boczna. |
| **breadcrumbs** | Ścieżka okruszkowa (lista). Home > Kategoria > Strona. |
| **pagination** | Paginacja (lista numerów). |
| **step-navigator** | Nawigacja kroków (kroki w formularzu / procesie). |
| **toc** | Spis treści (lista). Spis sekcji. |

---

## Marketing i treść (22)

| Typ | Zastosowanie |
|-----|--------------|
| **hero** | Sekcja hero (grid 1.2fr 1fr). Baner główny. |
| **feature-grid** | Siatka 3 kolumny – features. |
| **feature-list** | Lista benefitów / funkcji. |
| **callout** | Wyróżnienie / callout (alert). Ważna informacja. |
| **stats-strip** | Pasek statystyk w jednej linii. |
| **testimonial-card** | Karta opinii klienta. |
| **testimonials-slider** | Slider opinii (overflow auto). |
| **logo-cloud** | Siatka logo (np. 5 kolumn). Partnerzy, klienci. |
| **pricing-table** | Siatka planów cenowych (3 kolumny). |
| **pricing-card** | Pojedyncza karta ceny (moduł payments). |
| **faq-section** | Sekcja FAQ. |
| **timeline** | Oś czasu (kontener). |
| **team-grid** | Siatka 4 kolumny – zespół. |
| **comparison-table** | Tabela porównawcza. |
| **badge** | Badge / tag (np. „Nowość”). |
| **alert** | Alert / komunikat (tytuł + treść). |
| **banner-top** | Baner na górze (np. promocja). |
| **cookie-notice** | Informacja o cookies (moduł consent). |
| **popover** | Popover / tooltip (kontener). |
| **progress-bar** | Pasek postępu (wartość %). |
| **skeleton-placeholder** | Placeholder ładowania (szary blok). |

---

## Formularze (20)

| Typ | Zastosowanie |
|-----|--------------|
| **form** | Kontener formularza. Grupowanie pól. |
| **input** | Pole tekstowe. |
| **textarea** | Wieloliniowe pole tekstowe. |
| **select** | Lista rozwijana. |
| **radio-group** | Grupa radio. Jeden wybór z wielu. |
| **checkbox** | Checkbox. |
| **switch** | Przełącznik (checkbox wizualnie). |
| **date-picker** | Wybór daty. |
| **phone-input** | Pole telefonu. |
| **file-upload** | Upload pliku (moduł forms-pro). |
| **slider-input** | Suwak (range). |
| **rating** | Ocena (np. gwiazdki). |
| **consent** | Zgoda RODO (checkbox). |
| **captcha** | Pole Captcha (moduł consent-security). |
| **submit-button** | Przycisk wysyłki. |
| **form-success-message** | Komunikat po udanym wysłaniu. |
| **form-error-message** | Komunikat błędu formularza. |
| **newsletter-signup** | Blok zapisu do newslettera (kontener). |
| **multi-step-form** | Formularz wielokrokowy (moduł forms-pro). |
| **form-summary** | Podsumowanie / przegląd przed wysłaniem. |

---

## Dane i kolekcje (15)

| Typ | Zastosowanie |
|-----|--------------|
| **collection-list** | Lista z kolekcji CMS (kontener). |
| **collection-grid** | Siatka elementów z kolekcji. |
| **collection-table** | Tabela z kolekcji. |
| **collection-item-template** | Szablon pojedynczego elementu (item node). |
| **dynamic-field** | Pole dynamiczne – wartość z danych (np. `{field}`). |
| **rich-field** | Pole rich text z danych. |
| **image-field** | Obraz z danych (media). |
| **repeater** | Powtarzalna grupa bloków (kontener). |
| **condition** | Warunek if/else (kontener). |
| **visibility-rules** | Reguły widoczności (kontener). |
| **search-bar** | Pasek wyszukiwania (pole tekstowe). |
| **filter-bar** | Pasek filtrów (kontener). |
| **sort-dropdown** | Rozwijana sortowanie. |
| **load-more** | Przycisk „Załaduj więcej” / infinite scroll. |

---

## E‑commerce (11)

| Typ | Zastosowanie |
|-----|--------------|
| **product-grid** | Siatka produktów (moduł shop). |
| **product-card** | Karta produktu (shop). |
| **product-gallery** | Galeria zdjęć produktu (shop). |
| **price** | Cena (tekst, np. „$99”) (shop). |
| **add-to-cart-button** | Przycisk „Dodaj do koszyka” (shop). |
| **cart-icon** | Ikona koszyka z badge (shop). |
| **mini-cart-drawer** | Szuflada mini-koszyka (shop). |
| **checkout-embed** | Embed Stripe / checkout (moduł payments). |
| **order-summary** | Podsumowanie zamówienia (shop). |
| **coupon-field** | Pole kodu rabatowego (shop). |
| **stock-badge** | Badge stanu magazynowego (shop). |

---

## Integracje (9)

| Typ | Zastosowanie |
|-----|--------------|
| **embed** | **Embed** – HTML lub iframe. Kind w panelu (embed / iFrame). Moduł embeds-media. |
| **script-embed** | Wstawka skryptu (moduł tag-manager). |
| **google-map** | Mapa Google/OSM (moduł maps). |
| **calendly-embed** | Embed Calendly (embeds-media). |
| **chat-widget-embed** | Widget czatu (embeds-media). |
| **youtube-playlist** | Playlista YouTube (embeds-media). |
| **spotify-embed** | Embed Spotify (embeds-media). |
| **social-post-embed** | Post z social media (embeds-media). |
---


## Narzędzia i utility (3)

| Typ | Zastosowanie |
|-----|--------------|
| **custom-css** | Własny CSS (moduł forms-pro). |
| **aria-wrapper** | Opakowanie ARIA (dostępność). |
| **seo-block** | Blok SEO (meta strony). Kotwica = blok **Anchor** w Layout. |
---

## Moduły (12)

| Typ | Zastosowanie |
|-----|--------------|
| **payment-button** | Przycisk płatności (moduł payments). |
| **consent-preferences** | Ustawienia zgód (consent-security). |
| **captcha-field** | Pole Captcha (consent-security). |
| **accessibility-widget** | Widget dostępności (accessibility-widget). |
| **skip-to-content** | Link „Przejdź do treści” (accessibility-widget). |
| **event-tracker** | Śledzenie zdarzeń (analytics). |
| **meta-pixel** | Meta (Facebook) Pixel (meta-pixel). |
| **location-card** | Karta lokalizacji (maps). |
| **directions-button** | Przycisk „Jak dojechać” (maps). |
| **blog-list** | Lista wpisów bloga (blog-content). |
| **blog-post** | Pojedynczy wpis (blog-content). |
| **category-chips** | Chipsy kategorii (blog-content). |

---

## Podsumowanie

- **Core:** 12 typów (root, section, column, heading, text, image, button, tabs, tab-item, accordion, accordion-item).
- **Katalog:** po redukcji ~130 typów (layout 11, typography 10, media 9, nav 10, marketing, form, data, commerce, integration 9, utility 3, module).
- Stare typy (gallery-grid, masonry-gallery, carousel-images, carousel-content, spacer, divider, shape-divider, html-embed, iframe-embed, before-after-slider, back-to-top, html-anchor-link) mają fallback – renderują się jak złączone bloki.

Bloki z **moduleKey** są dostępne tylko gdy moduł jest włączony dla strony.
