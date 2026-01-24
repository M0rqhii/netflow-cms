# UX Guardrails - Ochrona przed błędną kolejnością akcji

**Wersja:** 1.0  
**Data:** 2025-01-20  
**Rola:** UX Architect  
**Status:** Kompletna lista guardrails

---

## 📋 Przegląd

Ten dokument identyfikuje wszystkie miejsca w systemie, gdzie użytkownik może wykonać akcje w złej kolejności lub w nieprawidłowy sposób. Dla każdego miejsca definiujemy:

1. **Co teraz może zrobić źle?** - Opis problemu
2. **Dlaczego to niszczy doświadczenie?** - Wpływ na UX
3. **Jak system powinien go ZATRZYMAĆ?** - Rozwiązanie

---

## 🔴 KRYTYCZNE GUARDRAILS

### 1. Publikacja strony bez treści

**Lokalizacja:** Page Builder → Przycisk "Publish"

**Co teraz może zrobić źle?**
- Użytkownik może opublikować stronę z pustym `content: {}` lub `content: null`
- System publikuje stronę bez żadnych sekcji/bloków
- Strona jest dostępna publicznie, ale jest pusta

**Dlaczego to niszczy doświadczenie?**
- Użytkownik publikuje pustą stronę → złe pierwsze wrażenie
- Brak informacji zwrotnej, że strona jest pusta
- Użytkownik może nie zauważyć, że strona jest pusta (jeśli nie sprawdzi publicznie)
- SEO: pusta strona = zły ranking

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// Walidacja przed publikacją
const hasContent = page.content && 
  (Object.keys(page.content).length > 0 || 
   (page.content.sections && page.content.sections.length > 0));

if (!hasContent) {
  throw new BadRequestException({
    message: 'Cannot publish page without content',
    reason: 'empty_content',
    details: 'Add at least one section or block before publishing'
  });
}
```

**Zachowanie systemu:**
- Przycisk "Publish" jest **wyłączony** (disabled), jeśli `content` jest pusty
- Tooltip na wyłączonym przycisku: "Add content before publishing"
- Jeśli użytkownik próbuje opublikować przez API → błąd 400 z komunikatem

**Komunikat dla użytkownika:**
```
❌ Cannot publish page

This page has no content. Add at least one section or block before publishing.

[Add Section] [Cancel]
```

---

### 2. Page Builder bez strony (pageId)

**Lokalizacja:** `/sites/[slug]/panel/page-builder` (bez `?pageId=...`)

**Co teraz może zrobić źle?**
- Użytkownik klika "Page Builder" w menu bez wybrania strony
- URL: `/sites/[slug]/panel/page-builder` (brak `pageId`)
- System próbuje załadować builder, ale nie ma strony do edycji
- Użytkownik widzi błąd lub pusty ekran

**Dlaczego to niszczy doświadczenie?**
- Użytkownik nie wie, co zrobić dalej
- Brak jasnej instrukcji: "Najpierw utwórz stronę"
- Użytkownik może myśleć, że system jest zepsuty
- Frustracja: "Dlaczego builder nie działa?"

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// W Page Builder component
if (!pageId) {
  // Redirect do listy stron z komunikatem
  return <EmptyStateWithAction 
    title="No page selected"
    description="Select a page to edit, or create a new one"
    actionLabel="Go to Pages"
    actionUrl="/sites/[slug]/panel/pages"
  />;
}
```

**Zachowanie systemu:**
- Jeśli `pageId` brakuje w URL → automatyczne przekierowanie do `/sites/[slug]/panel/pages`
- Toast notification: "Please select a page to edit"
- W menu "Page Builder" → tooltip: "Select a page first" (jeśli brak stron)
- Jeśli są strony → modal wyboru strony przed otwarciem buildera

**Komunikat dla użytkownika:**
```
📄 No page selected

To edit a page, you need to select one first.

[Go to Pages] [Create New Page]
```

---

### 3. Marketing publish bez treści

**Lokalizacja:** Marketing Panel → Przycisk "Publish"

**Co teraz może zrobić źle?**
- Użytkownik może opublikować marketing content bez `draftId` i bez `content`
- System tworzy `PublishJob` z pustą treścią
- Publikacja do social media z pustym postem
- Publikacja do strony bez treści

**Dlaczego to niszczy doświadczenie?**
- Puste posty na social media → złe wrażenie
- Użytkownik nie wie, że publikuje pustą treść
- Brak walidacji przed publikacją
- Utrata zaufania: "System pozwolił mi opublikować pusty post"

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// W marketing.service.ts publish()
if (!dto.draftId && !dto.content) {
  throw new BadRequestException({
    message: 'Cannot publish without content',
    reason: 'missing_content',
    details: 'Provide either draftId or content object'
  });
}

// Jeśli draftId, sprawdź czy draft ma content
if (dto.draftId && draft) {
  const hasContent = draft.content && 
    Object.keys(draft.content).length > 0;
  
  if (!hasContent) {
    throw new BadRequestException({
      message: 'Draft has no content',
      reason: 'empty_draft',
      details: 'Edit the draft and add content before publishing'
    });
  }
}

// Jeśli content bezpośrednio, sprawdź czy ma treść dla wybranych kanałów
if (dto.content && !dto.draftId) {
  const missingChannels = dto.channels.filter(channel => {
    return !dto.content[channel] || 
           (typeof dto.content[channel] === 'object' && 
            Object.keys(dto.content[channel]).length === 0);
  });
  
  if (missingChannels.length > 0) {
    throw new BadRequestException({
      message: `Missing content for channels: ${missingChannels.join(', ')}`,
      reason: 'incomplete_content',
      details: `Add content for: ${missingChannels.join(', ')}`
    });
  }
}
```

**Zachowanie systemu:**
- Przycisk "Publish" jest **wyłączony**, jeśli:
  - Nie wybrano draftu I nie ma contentu
  - Wybrano draft, ale draft jest pusty
  - Wybrano kanały, ale brak treści dla tych kanałów
- Tooltip na wyłączonym przycisku: "Add content before publishing"
- Modal publikacji pokazuje podgląd treści przed publikacją

**Komunikat dla użytkownika:**
```
❌ Cannot publish without content

You need to provide content before publishing. Either:
• Select a draft with content, or
• Add content directly in the publish form

[Edit Draft] [Add Content] [Cancel]
```

---

### 4. Publish All przy 0 draftach

**Lokalizacja:** Overview Panel → Przycisk "Publish All"

**Co teraz może zrobić źle?**
- Użytkownik klika "Publish All" gdy nie ma żadnych stron w Draft
- System wykonuje publikację, ale zwraca sukces z `pagesPublished: 0`
- Toast: "All pages published successfully" (mylące!)
- Użytkownik myśli, że coś zostało opublikowane

**Dlaczego to niszczy doświadczenie?**
- Mylący komunikat sukcesu przy braku akcji
- Użytkownik nie wie, że nie było nic do publikacji
- Brak informacji: "Nie ma stron do publikacji"
- Użytkownik może próbować ponownie, myśląc że coś poszło nie tak

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// W site-deployments.service.ts publish()
if (!dto.pageId) {
  const draftPages = await this.prisma.page.findMany({
    where: {
      siteId,
      environmentId: draftEnv.id,
    },
  });

  if (draftPages.length === 0) {
    // NIE tworzymy deploymentu z sukcesem
    // Zamiast tego rzucamy błąd
    throw new BadRequestException({
      message: 'No draft pages to publish',
      reason: 'no_draft_pages',
      details: 'Create or edit pages in draft environment first'
    });
  }
}
```

**Zachowanie systemu:**
- Przycisk "Publish All" jest **wyłączony**, jeśli `draftPages.length === 0`
- Tooltip: "No draft pages to publish"
- Jeśli użytkownik próbuje przez API → błąd 400 z komunikatem
- W UI: przycisk pokazuje liczbę draftów: "Publish All (0)" → wyłączony

**Komunikat dla użytkownika:**
```
⚠️ No pages to publish

There are no draft pages to publish. Create or edit pages first.

[Create Page] [Go to Pages]
```

---

## ⚠️ WAŻNE GUARDRAILS

### 5. Publikacja strony bez zapisania zmian

**Lokalizacja:** Page Builder → Przycisk "Publish" (gdy są niezapisane zmiany)

**Co teraz może zrobić źle?**
- Użytkownik edytuje stronę, ale nie zapisuje zmian
- Klika "Publish" bezpośrednio
- System publikuje starą wersję (bez ostatnich zmian)
- Użytkownik traci zmiany lub publikuje nieaktualną wersję

**Dlaczego to niszczy doświadczenie?**
- Użytkownik myśli, że publikuje najnowsze zmiany
- Tracenie pracy: ostatnie zmiany nie są opublikowane
- Konfuzja: "Dlaczego moje zmiany nie są widoczne?"
- Brak informacji o niezapisanych zmianach

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// W Page Builder component
const hasUnsavedChanges = useMemo(() => {
  return JSON.stringify(content) !== JSON.stringify(lastSavedContent);
}, [content, lastSavedContent]);

const handlePublishClick = () => {
  if (hasUnsavedChanges) {
    // Pokaż modal: "Zapisz przed publikacją?"
    setShowSaveBeforePublishModal(true);
  } else {
    setShowPublishModal(true);
  }
};

const handleSaveAndPublish = async () => {
  // 1. Zapisz zmiany
  await handleSave();
  // 2. Poczekaj na zapisanie
  await new Promise(resolve => setTimeout(resolve, 500));
  // 3. Opublikuj
  await handlePublishConfirm();
};
```

**Zachowanie systemu:**
- Jeśli są niezapisane zmiany → modal przed publikacją:
  - "You have unsaved changes. Save before publishing?"
  - Opcje: [Save & Publish] [Publish Without Saving] [Cancel]
- Domyślnie: "Save & Publish" (bezpieczniejsze)
- Wizualny wskaźnik: badge "Unsaved" przy przycisku Publish

**Komunikat dla użytkownika:**
```
💾 Unsaved changes

You have unsaved changes. Do you want to save before publishing?

[Save & Publish] [Publish Without Saving] [Cancel]
```

---

### 6. Marketing publish bez połączenia social media

**Lokalizacja:** Marketing Panel → Publikacja do social media (facebook, twitter, etc.)

**Co teraz może zrobić źle?**
- Użytkownik wybiera kanały: `["facebook", "twitter"]`
- Klika "Publish"
- System próbuje publikować, ale konta nie są połączone
- Publikacja kończy się błędem dla tych kanałów
- Użytkownik nie wie, że konta nie są połączone

**Dlaczego to niszczy doświadczenie?**
- Użytkownik traci czas na publikację, która się nie powiedzie
- Brak informacji przed publikacją: "Konta nie są połączone"
- Frustracja: "Dlaczego nie działa?"
- Użytkownik musi sprawdzić wyniki publikacji, aby zobaczyć błędy

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// W marketing.service.ts publish()
const socialChannels = ['facebook', 'twitter', 'linkedin', 'instagram'];
const selectedSocialChannels = dto.channels.filter(ch => 
  socialChannels.includes(ch)
);

if (selectedSocialChannels.length > 0) {
  // Sprawdź połączenia dla każdego kanału
  const connections = await this.prisma.socialConnection.findMany({
    where: {
      orgId,
      siteId: dto.siteId,
      platform: { in: selectedSocialChannels },
      status: 'connected',
    },
  });

  const connectedPlatforms = connections.map(c => c.platform);
  const missingConnections = selectedSocialChannels.filter(
    ch => !connectedPlatforms.includes(ch)
  );

  if (missingConnections.length > 0) {
    throw new BadRequestException({
      message: `Social media accounts not connected: ${missingConnections.join(', ')}`,
      reason: 'missing_connections',
      details: `Connect ${missingConnections.join(', ')} accounts before publishing`,
      missingChannels: missingConnections,
    });
  }
}
```

**Zachowanie systemu:**
- Przed publikacją: sprawdzenie połączeń dla wybranych kanałów
- Jeśli brak połączeń → modal z informacją:
  - "Connect accounts before publishing"
  - Lista brakujących połączeń
  - Linki: [Connect Facebook] [Connect Twitter] [Cancel]
- W UI: checkboxy dla social media pokazują status:
  - ✓ Facebook (Connected)
  - ✗ Twitter (Not connected) → wyłączony checkbox

**Komunikat dla użytkownika:**
```
🔗 Social media accounts not connected

To publish to these channels, you need to connect your accounts first:
• Facebook - Not connected
• Twitter - Not connected

[Connect Facebook] [Connect Twitter] [Cancel]
```

---

### 7. Publikacja strony bez SEO meta danych

**Lokalizacja:** Page Builder → Publikacja strony

**Co teraz może zrobić źle?**
- Użytkownik publikuje stronę bez meta title i description
- Strona jest dostępna, ale SEO jest słabe
- Brak informacji, że meta dane są wymagane dla SEO

**Dlaczego to niszczy doświadczenie?**
- Użytkownik nie wie, że SEO jest ważne
- Brak ostrzeżenia przed publikacją
- Słabe SEO = mniej ruchu = frustracja później
- Brak możliwości łatwego dodania meta danych

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// W site-pages.service.ts publish()
const seoMeta = sourcePage.content?.seo || {};
const hasMetaTitle = seoMeta.metaTitle && seoMeta.metaTitle.trim().length > 0;
const hasMetaDescription = seoMeta.metaDescription && 
  seoMeta.metaDescription.trim().length > 0;

if (!hasMetaTitle || !hasMetaDescription) {
  // Ostrzeżenie (nie błąd) - pozwól publikować, ale ostrzeż
  // W UI: modal z ostrzeżeniem
  return {
    warning: true,
    message: 'Page published, but SEO metadata is missing',
    missingFields: {
      metaTitle: !hasMetaTitle,
      metaDescription: !hasMetaDescription,
    },
  };
}
```

**Zachowanie systemu:**
- **Ostrzeżenie** (nie błąd) - pozwól publikować, ale pokaż modal:
  - "⚠️ SEO metadata missing"
  - "Your page will be published, but adding meta title and description will improve SEO"
  - Opcje: [Add SEO Now] [Publish Anyway] [Cancel]
- W Page Builder: sekcja SEO z wskaźnikiem:
  - ✓ Meta Title: "Strona główna"
  - ✗ Meta Description: Missing (żółty badge)

**Komunikat dla użytkownika:**
```
⚠️ SEO metadata missing

Your page will be published, but adding meta title and description will improve SEO and search rankings.

Missing:
• Meta Title
• Meta Description

[Add SEO Now] [Publish Anyway] [Cancel]
```

---

### 8. Publikacja strony z pustym tytułem

**Lokalizacja:** Page Builder → Publikacja strony

**Co teraz może zrobić źle?**
- Użytkownik publikuje stronę z `title: ""` lub `title: null`
- Strona jest dostępna, ale bez tytułu
- Brak walidacji przed publikacją

**Dlaczego to niszczy doświadczenie?**
- Strona bez tytułu wygląda nieprofesjonalnie
- SEO: brak tytułu = bardzo złe SEO
- Użytkownik może nie zauważyć, że tytuł jest pusty
- Brak informacji zwrotnej przed publikacją

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// W site-pages.service.ts publish()
if (!sourcePage.title || sourcePage.title.trim().length === 0) {
  throw new BadRequestException({
    message: 'Page title is required',
    reason: 'missing_title',
    details: 'Add a title to your page before publishing'
  });
}
```

**Zachowanie systemu:**
- Walidacja przed publikacją: tytuł jest wymagany
- W Page Builder: pole "Title" jest wymagane (required)
- Jeśli tytuł jest pusty → przycisk "Publish" wyłączony
- Tooltip: "Add a title before publishing"

**Komunikat dla użytkownika:**
```
❌ Page title is required

Add a title to your page before publishing.

[Add Title] [Cancel]
```

---

### 9. Marketing publish z draftem w statusie "draft" (nie "ready")

**Lokalizacja:** Marketing Panel → Publikacja draftu

**Co teraz może zrobić źle?**
- Użytkownik wybiera draft ze statusem `draft` (nie `ready`)
- Klika "Publish"
- System publikuje draft, który może być niegotowy
- Brak informacji, że draft powinien być oznaczony jako "ready"

**Dlaczego to niszczy doświadczenie?**
- Użytkownik może publikować niegotową treść
- Brak workflow: draft → ready → publish
- Użytkownik nie wie, że draft powinien być gotowy przed publikacją
- Możliwość publikacji przypadkowej

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// W marketing.service.ts publish()
if (dto.draftId && draft) {
  if (draft.status !== 'ready') {
    throw new BadRequestException({
      message: 'Draft is not ready for publishing',
      reason: 'draft_not_ready',
      details: `Draft status is "${draft.status}". Mark it as "ready" before publishing.`,
      currentStatus: draft.status,
    });
  }
}
```

**Zachowanie systemu:**
- W liście draftów: tylko drafty ze statusem `ready` są dostępne do publikacji
- Drafty ze statusem `draft` → przycisk "Publish" wyłączony
- Tooltip: "Mark draft as ready before publishing"
- W modal publikacji: tylko drafty `ready` są widoczne w dropdown

**Komunikat dla użytkownika:**
```
⚠️ Draft is not ready

This draft is not marked as ready. Mark it as ready before publishing.

Current status: draft

[Mark as Ready] [Cancel]
```

---

### 10. Publikacja strony bez slug

**Lokalizacja:** Page Builder → Publikacja strony

**Co teraz może zrobić źle?**
- Użytkownik publikuje stronę z pustym `slug`
- System próbuje utworzyć URL, ale slug jest wymagany
- Błąd podczas publikacji lub nieprawidłowy URL

**Dlaczego to niszczy doświadczenie?**
- Błąd podczas publikacji → frustracja
- Użytkownik nie wie, że slug jest wymagany
- Brak walidacji przed publikacją
- Możliwość utworzenia strony bez URL

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// W site-pages.service.ts publish()
if (!sourcePage.slug || sourcePage.slug.trim().length === 0) {
  throw new BadRequestException({
    message: 'Page slug is required',
    reason: 'missing_slug',
    details: 'Add a slug to your page before publishing'
  });
}

// Walidacja formatu slug
const slugRegex = /^[a-z0-9-]+$/;
if (!slugRegex.test(sourcePage.slug)) {
  throw new BadRequestException({
    message: 'Invalid slug format',
    reason: 'invalid_slug',
    details: 'Slug can only contain lowercase letters, numbers, and hyphens'
  });
}
```

**Zachowanie systemu:**
- Walidacja przed publikacją: slug jest wymagany i musi być w poprawnym formacie
- W Page Builder: pole "Slug" jest wymagane (required)
- Auto-generowanie slug z tytułu (jeśli slug jest pusty)
- Jeśli slug jest nieprawidłowy → przycisk "Publish" wyłączony

**Komunikat dla użytkownika:**
```
❌ Page slug is required

Add a slug to your page before publishing. Slug is used in the page URL.

[Auto-generate from Title] [Add Slug] [Cancel]
```

---

### 11. Publikacja strony już opublikowanej (bez zmian)

**Lokalizacja:** Page Builder → Przycisk "Publish" (gdy strona jest już w Production)

**Co teraz może zrobić źle?**
- Użytkownik publikuje stronę, która jest już opublikowana i nie ma zmian
- System wykonuje publikację, ale nic się nie zmienia
- Użytkownik nie wie, że strona jest już opublikowana
- Możliwość przypadkowej publikacji bez zmian

**Dlaczego to niszczy doświadczenie?**
- Użytkownik myśli, że publikuje nowe zmiany
- Brak informacji: "Strona jest już opublikowana"
- Niepotrzebne deploymenty (zwiększają koszty)
- Konfuzja: "Czy moje zmiany zostały opublikowane?"

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// W site-pages.service.ts publish()
// Sprawdź czy strona jest już opublikowana w target environment
const existingProductionPage = await this.prisma.page.findUnique({
  where: {
    site_env_slug: {
      siteId,
      environmentId: targetEnvironment.id,
      slug: sourcePage.slug,
    },
  },
});

if (existingProductionPage) {
  // Porównaj content
  const contentChanged = JSON.stringify(sourcePage.content) !== 
    JSON.stringify(existingProductionPage.content);
  const titleChanged = sourcePage.title !== existingProductionPage.title;
  
  if (!contentChanged && !titleChanged) {
    // Ostrzeżenie (nie błąd) - pozwól publikować, ale pokaż informację
    return {
      warning: true,
      message: 'Page is already published with the same content',
      details: 'No changes detected. The page is already live with this content.',
      alreadyPublished: true,
    };
  }
}
```

**Zachowanie systemu:**
- Przed publikacją: sprawdzenie czy strona jest już opublikowana
- Jeśli nie ma zmian → modal z informacją:
  - "⚠️ Page already published"
  - "This page is already live with the same content. No changes detected."
  - Opcje: [Publish Anyway] [Cancel]
- W Page Builder: wskaźnik "Already Published" jeśli strona jest w Production

**Komunikat dla użytkownika:**
```
ℹ️ Page already published

This page is already live with the same content. No changes detected.

[Publish Anyway] [Cancel]
```

---

### 12. Tworzenie strony bez wymaganych pól

**Lokalizacja:** Pages Panel → Modal tworzenia strony

**Co teraz może zrobić źle?**
- Użytkownik próbuje utworzyć stronę bez tytułu lub slug
- System może pozwolić na utworzenie strony z pustymi polami
- Strona jest utworzona, ale nie można jej użyć

**Dlaczego to niszczy doświadczenie?**
- Użytkownik tworzy niepełną stronę
- Brak walidacji przed utworzeniem
- Strona jest bezużyteczna bez tytułu/slug
- Użytkownik musi później edytować stronę, aby dodać wymagane pola

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// W site-pages.service.ts create()
if (!dto.title || dto.title.trim().length === 0) {
  throw new BadRequestException({
    message: 'Page title is required',
    reason: 'missing_title',
  });
}

if (!dto.slug || dto.slug.trim().length === 0) {
  // Auto-generuj slug z tytułu, jeśli slug jest pusty
  if (dto.title) {
    dto.slug = slugify(dto.title);
  } else {
    throw new BadRequestException({
      message: 'Page slug is required',
      reason: 'missing_slug',
    });
  }
}

// Walidacja formatu slug
const slugRegex = /^[a-z0-9-]+$/;
if (!slugRegex.test(dto.slug)) {
  throw new BadRequestException({
    message: 'Invalid slug format',
    reason: 'invalid_slug',
    details: 'Slug can only contain lowercase letters, numbers, and hyphens',
  });
}
```

**Zachowanie systemu:**
- W formularzu: pola "Title" i "Slug" są wymagane (required)
- Auto-generowanie slug z tytułu (jeśli slug jest pusty)
- Walidacja w czasie rzeczywistym (real-time validation)
- Przycisk "Create" wyłączony, jeśli pola są nieprawidłowe

**Komunikat dla użytkownika:**
```
❌ Page title is required

Add a title to create a page.

[Cancel]
```

---

### 13. Publikacja content entry bez wymaganych pól

**Lokalizacja:** Content Entries → Publikacja wpisu

**Co teraz może zrobić źle?**
- Użytkownik publikuje content entry bez wypełnienia wymaganych pól
- System publikuje wpis z pustymi polami
- Wpis jest dostępny, ale niekompletny

**Dlaczego to niszczy doświadczenie?**
- Użytkownik publikuje niepełną treść
- Brak walidacji przed publikacją
- Treść jest bezużyteczna bez wymaganych pól
- Użytkownik musi później edytować wpis

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// W content-entries.service.ts publish()
// Sprawdź wymagane pola dla content type
const contentType = await this.getContentType(siteId, contentTypeSlug);
const requiredFields = contentType.fields.filter(f => f.required);

for (const field of requiredFields) {
  const fieldValue = entry.data[field.name];
  
  if (!fieldValue || 
      (typeof fieldValue === 'string' && fieldValue.trim().length === 0) ||
      (Array.isArray(fieldValue) && fieldValue.length === 0)) {
    throw new BadRequestException({
      message: `Required field "${field.label}" is missing`,
      reason: 'missing_required_field',
      fieldName: field.name,
      fieldLabel: field.label,
    });
  }
}
```

**Zachowanie systemu:**
- Przed publikacją: walidacja wszystkich wymaganych pól
- W formularzu: wymagane pola oznaczone gwiazdką (*)
- Przycisk "Publish" wyłączony, jeśli wymagane pola są puste
- Lista brakujących pól w komunikacie błędu

**Komunikat dla użytkownika:**
```
❌ Required fields missing

Fill in all required fields before publishing:
• Title (required)
• Description (required)

[Edit Entry] [Cancel]
```

---

### 14. Marketing publish z pustymi kanałami

**Lokalizacja:** Marketing Panel → Publikacja bez wybranych kanałów

**Co teraz może zrobić źle?**
- Użytkownik klika "Publish" bez wybrania żadnych kanałów
- System próbuje publikować, ale nie ma kanałów
- Błąd lub pusta publikacja

**Dlaczego to niszczy doświadczenie?**
- Użytkownik traci czas na publikację, która się nie powiedzie
- Brak informacji przed publikacją: "Wybierz kanały"
- Frustracja: "Dlaczego nie działa?"

**Jak system powinien go ZATRZYMAĆ?**

**Guardrail:**
```typescript
// W marketing.service.ts publish()
if (!dto.channels || dto.channels.length === 0) {
  throw new BadRequestException({
    message: 'At least one channel must be selected',
    reason: 'no_channels_selected',
    details: 'Select at least one channel to publish to',
  });
}
```

**Zachowanie systemu:**
- Przycisk "Publish" wyłączony, jeśli nie wybrano żadnych kanałów
- Tooltip: "Select at least one channel"
- W modal publikacji: checkboxy kanałów są wymagane (co najmniej jeden)

**Komunikat dla użytkownika:**
```
❌ No channels selected

Select at least one channel to publish to.

[Select Channels] [Cancel]
```

---

## 📊 PODSUMOWANIE GUARDRAILS

### Priorytety

| # | Guardrail | Priorytet | Status |
|---|-----------|-----------|--------|
| 1 | Publish bez treści | 🔴 KRYTYCZNE | ⏳ Do implementacji |
| 2 | Builder bez pageId | 🔴 KRYTYCZNE | ⏳ Do implementacji |
| 3 | Marketing publish bez contentu | 🔴 KRYTYCZNE | ⏳ Do implementacji |
| 4 | Publish All przy 0 draftach | 🔴 KRYTYCZNE | ⏳ Do implementacji |
| 5 | Publish bez zapisania zmian | ⚠️ WAŻNE | ⏳ Do implementacji |
| 6 | Marketing publish bez połączeń | ⚠️ WAŻNE | ⏳ Do implementacji |
| 7 | Publish bez SEO meta | ⚠️ WAŻNE | ⏳ Do implementacji |
| 8 | Publish bez tytułu | ⚠️ WAŻNE | ⏳ Do implementacji |
| 9 | Marketing publish draft nie ready | ⚠️ WAŻNE | ⏳ Do implementacji |
| 10 | Publish bez slug | ⚠️ WAŻNE | ⏳ Do implementacji |
| 11 | Publish strony już opublikowanej | ⚠️ WAŻNE | ⏳ Do implementacji |
| 12 | Tworzenie strony bez wymaganych pól | ⚠️ WAŻNE | ⏳ Do implementacji |
| 13 | Publish content entry bez wymaganych pól | ⚠️ WAŻNE | ⏳ Do implementacji |
| 14 | Marketing publish z pustymi kanałami | ⚠️ WAŻNE | ⏳ Do implementacji |

### Zasady implementacji

1. **Walidacja po stronie backendu** - zawsze sprawdzaj przed wykonaniem akcji
2. **Walidacja po stronie frontendu** - wyłącz przyciski, pokaż tooltips
3. **Komunikaty błędów** - jasne, pomocne, z akcjami naprawczymi
4. **Modal potwierdzenia** - dla akcji destrukcyjnych lub nieodwracalnych
5. **Wskaźniki wizualne** - pokazuj status (unsaved, missing fields, etc.)

---

## 🎯 Następne kroki

1. **Implementacja guardrails** - backend + frontend
2. **Testy E2E** - sprawdzenie wszystkich guardrails
3. **Dokumentacja użytkownika** - jak używać systemu poprawnie
4. **Monitoring** - śledzenie błędów walidacji (które guardrails są najczęściej wyzwalane)

---

**Data utworzenia:** 2025-01-20  
**Wersja:** 1.0  
**Status:** Kompletna lista guardrails gotowa do implementacji

