# Page Builder – checklist przed pokazaniem klientom

## Stan bloków

### Działa i można pokazywać

- **Wszystkie bloki z katalogu** mają przypisany działający komponent (Container, Text, Media, List, Form, Alert, Badge, Progress, Button).
- **Core:** Root, Section, Column, Heading, Text, Image, Button, Tabs, Tab-item, Accordion, Accordion-item – z zabezpieczeniami na brak/nieprawidłowe dane.
- **Generics:** bezpieczny dostęp do `props.content` i `props.style`, fallbacki (np. nieznany `fieldType` → pole tekstowe), walidacja URL (obraz, video, audio, embed).
- **Obrazy:** ImageBlock i GenericMediaBlock używają `unoptimized` – zewnętrzne URL-e działają bez konfiguracji domen w Next.js.
- **Stare typy bloków** (grid, columns, video-embed, gallery-grid itd.) mają fallback – istniejące strony dalej się renderują.

### Na co uważać przy demo

1. **Formularze** – pola się renderują (input, select, checkbox itd.), ale **wysyłanie** zależy od frontu/witryny. W builderze pokazujesz układ i typy pól, nie działający backend.
2. **Kolekcje (collection-list, collection-grid)** – to kontenery pod przyszłe podpięcie danych z CMS. Na razie można pokazać „tu będzie lista z API”.
3. **Bloki z moduleKey** (shop, payments, consent, analytics itd.) – widoczne tylko gdy moduł jest włączony dla strony. Przed demo włącz potrzebne moduły w ustawieniach strony/site.
4. **Preview vs edycja** – w trybie edycji linki/buttony mają `preventDefault`, żeby nie nawigować. W **podglądzie** (preview) linki i formularze zachowują się normalnie – do pokazania „jak to będzie na stronie”.

### Co sprawdzić przed spotkaniem z klientem

- [ ] Otwórz page buildera dla wybranej strony.
- [ ] Dodaj sekcję (Section), w środku Layout lub Cards, potem Heading, Text, Image, Button – upewnij się, że wszystko się rysuje i da się edytować w panelu.
- [ ] Wstaw blok Video (URL YouTube) i Embed (np. iframe) – sprawdź, że się ładują.
- [ ] Dodaj Tabs, potem „Add tab”, wypełnij tytuły w panelu – sprawdź przełączanie zakładek.
- [ ] Dodaj Accordion, dodaj itemy – sprawdź zwijanie/rozwijanie.
- [ ] Zapisz stronę i włącz **Preview** – zobacz stronę „jak na żywo” (linki działają, bez pasków edycji).

### Gdy coś nie działa

- **Nieznany blok (Unknown Block)** – typ usunięty z katalogu lub błąd w danych. Można usunąć blok (przycisk w Unknown Block) i dodać nowy.
- **Pusty/nieprawidłowy obraz lub video** – w bloku widać placeholder „Image URL” / „Video URL”. W panelu właściwości ustaw poprawny URL.
- **Błąd w konsoli** – sprawdź, czy dotyczy konkretnego bloku (np. zepsute `node.props`). Zgłoś do devów z typem bloku i treścią błędu.

---

**Podsumowanie:** Tak – bloki są odporne na błędy i da się je **pokazywać klientom** jako działający kreator układu strony. Formularze i kolekcje pokazujesz jako „szkielet” (layout + typy pól); pełna logika (wysyłanie, dane z API) to osobna warstwa (front/witryna).
