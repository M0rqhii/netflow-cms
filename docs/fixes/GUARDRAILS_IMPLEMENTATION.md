# Implementacja Guardrails - Backend

## 📋 Podsumowanie

Zaimplementowano wszystkie guardrails po stronie backendu zgodnie z dokumentacją:
- `HAPPY_PATH_RULES.md`
- `UX_GUARDRAILS.md`

## 📁 Zmienione pliki

### 1. Nowe pliki

#### `apps/api/src/common/constants/guardrail-reason-codes.ts`
- Enum `GuardrailReasonCode` z wszystkimi reason codes
- Obiekt `GuardrailMessages` z human-readable messages

#### `apps/api/src/common/constants/index.ts`
- Eksport guardrail reason codes

### 2. Zmodyfikowane pliki

#### `apps/api/src/modules/site-panel/site-pages.service.ts`
**Guardrails w metodzie `create()`:**
- ✅ Walidacja tytułu (MISSING_TITLE)
- ✅ Walidacja slug (MISSING_SLUG)
- ✅ Walidacja formatu slug (INVALID_SLUG)

**Guardrails w metodzie `publish()`:**
- ✅ Walidacja tytułu (MISSING_TITLE)
- ✅ Walidacja slug (MISSING_SLUG)
- ✅ Walidacja formatu slug (INVALID_SLUG)
- ✅ Walidacja treści (EMPTY_CONTENT)
- ⚠️ Ostrzeżenie SEO (MISSING_SEO_META) - warning, nie error
- ⚠️ Ostrzeżenie o już opublikowanej stronie (ALREADY_PUBLISHED) - warning, nie error

**Helper metody:**
- `hasContent()` - sprawdza czy content ma sekcje/bloki
- `isValidSlug()` - waliduje format slug
- `checkSeoMetadata()` - sprawdza SEO metadata

#### `apps/api/src/modules/site-panel/site-deployments.service.ts`
**Guardrails w metodzie `publish()` (Publish All):**
- ✅ Walidacja braku draft pages (NO_DRAFT_PAGES)

#### `apps/api/src/modules/marketing/marketing.service.ts`
**Guardrails w metodzie `createDraft()`:**
- ✅ Walidacja wybranych kanałów (NO_CHANNELS_SELECTED)
- ✅ Walidacja treści dla kanałów (INCOMPLETE_CONTENT)

**Guardrails w metodzie `publish()`:**
- ✅ Walidacja wybranych kanałów (NO_CHANNELS_SELECTED)
- ✅ Walidacja treści (MISSING_CONTENT)
- ✅ Walidacja pustego draftu (EMPTY_DRAFT)
- ✅ Walidacja statusu draftu (DRAFT_NOT_READY)
- ✅ Walidacja treści dla kanałów (INCOMPLETE_CONTENT)
- ✅ Walidacja połączeń social media (MISSING_CONNECTIONS)

## 🔴 Krytyczne Guardrails (Błędy 400/403)

### Page Publish
1. **EMPTY_CONTENT** - Nie można opublikować strony bez treści
2. **MISSING_TITLE** - Tytuł jest wymagany
3. **MISSING_SLUG** - Slug jest wymagany
4. **INVALID_SLUG** - Nieprawidłowy format slug

### Publish All
5. **NO_DRAFT_PAGES** - Brak stron do publikacji

### Marketing Publish
6. **NO_CHANNELS_SELECTED** - Brak wybranych kanałów
7. **MISSING_CONTENT** - Brak treści (draftId lub content)
8. **EMPTY_DRAFT** - Draft jest pusty
9. **DRAFT_NOT_READY** - Draft nie jest gotowy (status != 'ready')
10. **INCOMPLETE_CONTENT** - Brak treści dla wybranych kanałów
11. **MISSING_CONNECTIONS** - Brak połączeń social media

## ⚠️ Ważne Guardrails (Ostrzeżenia)

### SEO Warnings
- **MISSING_SEO_META** - Brak meta title/description (warning, nie error)
- **ALREADY_PUBLISHED** - Strona już opublikowana z tym samym contentem (warning, nie error)

## 📝 Format odpowiedzi błędów

Wszystkie guardrails zwracają błędy w formacie:

```typescript
{
  message: string,        // Human-readable message
  reason: string,        // Machine-readable reason code (GuardrailReasonCode)
  details: string,       // Szczegóły błędu
  // Opcjonalne dodatkowe pola:
  missingChannels?: string[],
  currentStatus?: string,
  // etc.
}
```

### Przykład błędu:

```json
{
  "statusCode": 400,
  "message": "Cannot publish page without content. Add at least one section or block before publishing.",
  "reason": "empty_content",
  "details": "Add at least one section or block before publishing"
}
```

### Przykład odpowiedzi z warningami:

```json
{
  "draft": { ... },
  "production": { ... },
  "warnings": {
    "seo": {
      "reason": "missing_seo_meta",
      "message": "SEO metadata is missing. Adding meta title and description will improve SEO.",
      "details": ["Meta title is missing", "Meta description is missing"]
    },
    "alreadyPublished": {
      "reason": "already_published",
      "message": "Page is already published with the same content. No changes detected.",
      "details": "This page is already live with the same content. No changes detected."
    }
  }
}
```

## ✅ Zasady implementacji

1. **Backend jest źródłem prawdy** - Wszystkie walidacje są po stronie backendu
2. **Frontend NIE jest źródłem prawdy** - Frontend może wyłączać przyciski, ale backend zawsze waliduje
3. **Każdy guardrail ma:**
   - Jednoznaczny błąd (400 Bad Request lub 403 Forbidden)
   - Reason code (machine-readable) z enum `GuardrailReasonCode`
   - Human message z `GuardrailMessages`
4. **SEO warnings** - To są ostrzeżenia, nie błędy. Publikacja jest dozwolona, ale zwracamy warning w odpowiedzi.

## 🧪 Testowanie

Aby przetestować guardrails:

1. **Page Publish bez treści:**
```bash
POST /api/v1/site-panel/{siteId}/pages/{pageId}/publish
# Powinno zwrócić 400 z reason: "empty_content"
```

2. **Publish All bez draft pages:**
```bash
POST /api/v1/site-panel/{siteId}/deployments/publish
# Body: {} (bez pageId)
# Powinno zwrócić 400 z reason: "no_draft_pages"
```

3. **Marketing Publish bez treści:**
```bash
POST /api/v1/marketing/publish
# Body: { siteId, channels: ["site"], ... } (bez draftId i content)
# Powinno zwrócić 400 z reason: "missing_content"
```

## 📌 Uwagi

- Błędy TypeScript związane z Prisma Client są spowodowane brakiem wygenerowanego klienta. Aby to naprawić, uruchom:
  ```bash
  cd apps/api
  npx prisma generate
  ```

- Wszystkie guardrails są zaimplementowane zgodnie z dokumentacją UX_GUARDRAILS.md
- SEO warnings nie blokują publikacji, ale zwracają informację w odpowiedzi
- Frontend powinien obsługiwać reason codes do wyświetlania odpowiednich komunikatów

## 🎯 Następne kroki

1. Wygenerować Prisma Client (`npx prisma generate`)
2. Przetestować wszystkie guardrails
3. Zaktualizować frontend, aby obsługiwał reason codes
4. Dodać testy jednostkowe dla guardrails





