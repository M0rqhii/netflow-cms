# Frontend UX Implementation Plan

**Data:** 2025-01-28  
**Zakres:** Implementacja Happy Path, Empty States, UX Guardrails

---

## 📋 Przegląd

Ten dokument definiuje konkretne zmiany frontendu zgodnie z:
- `HAPPY_PATH_RULES.md` - wymuszanie jedynej ścieżki
- `EMPTY_STATES_DESIGN.md` - projekt pustych stanów
- `UX_GUARDRAILS.md` - ochrona przed błędami

**Zasady:**
- **Disabled > Hidden** (chyba że dokument mówi inaczej)
- **Tooltips** z jasnym powodem blokady
- **Automatyczne redirecty** zgodnie z happy path
- **JEDNO CTA** w danym stanie

---

## 1. Dashboard Empty States

### Lokalizacja
`apps/admin/src/app/dashboard/page.tsx`

### Reguła: HAPPY_PATH_RULES.md → REGUŁA 1
**IF:** Użytkownik nie ma żadnych stron (sites)  
**THEN:** Blokuj wszystkie akcje poza utworzeniem Site

### Aktualny Stan
```typescript
// Linia 201-209
filteredSites.length === 0 ? (
  <EmptyState
    title={t('dashboard.noSitesYet')}
    description={t('dashboard.createFirstSite')}
    action={{
      label: t('dashboard.createSite'),
      onClick: () => window.location.href = '/sites/new',
    }}
  />
)
```

### Wymagane Zmiany

#### 1.1. EmptyState zgodny z dokumentem
```tsx
// Zmień na:
{filteredSites.length === 0 && sites.length === 0 ? (
  <div className="py-12">
    <EmptyState
      title="Nie masz jeszcze żadnych stron"
      description="Utwórz pierwszą stronę, aby rozpocząć"
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-12 w-12">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M9 3v18M15 3v18M3 9h18M3 15h18" strokeLinecap="round" />
        </svg>
      }
      action={{
        label: "Utwórz pierwszą stronę",
        href: "/sites/new",
        variant: "primary"
      }}
    />
  </div>
) : null}
```

#### 1.2. Blokada Quick Actions
```tsx
// Linia 266-285 - Quick Actions Card
// DODAJ warunek:
const hasSites = sites.length > 0;

<Card>
  <CardHeader>
    <CardTitle>{t('dashboard.quickActions')}</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 gap-3">
      <Link href="/sites/new">
        <Button variant="primary" className="w-full">
          {t('dashboard.createSite')}
        </Button>
      </Link>
      
      <Tooltip content={!hasSites ? "Utwórz pierwszą stronę, aby zobaczyć listę" : ""}>
        <Link href="/sites" className={!hasSites ? "pointer-events-none" : ""}>
          <Button 
            variant="outline" 
            className="w-full" 
            disabled={!hasSites}
          >
            {t('dashboard.viewAllSites')}
          </Button>
        </Link>
      </Tooltip>
      
      <Tooltip content={!hasSites ? "Utwórz pierwszą stronę, aby zarządzać płatnościami" : ""}>
        <Link href="/billing" className={!hasSites ? "pointer-events-none" : ""}>
          <Button 
            variant="outline" 
            className="w-full" 
            disabled={!hasSites}
          >
            {t('navigation.billing')}
          </Button>
        </Link>
      </Tooltip>
      
      <Link href="/account">
        <Button variant="outline" className="w-full">
          {t('navigation.account')}
        </Button>
      </Link>
    </div>
  </CardContent>
</Card>
```

#### 1.3. Tooltip Component
```tsx
// Dodaj do imports lub stwórz komponent:
interface TooltipProps {
  content?: string;
  children: React.ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  if (!content) return <>{children}</>;
  
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
        {content}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
}
```

### Rezultat
- ✅ Jedno CTA: "Utwórz pierwszą stronę"
- ✅ Zablokowane akcje z tooltips
- ✅ Użytkownik widzi tylko dozwolone akcje

---

## 2. Site Overview Empty States

### Lokalizacja
`apps/admin/src/app/sites/[slug]/panel/overview/page.tsx`

### Reguła: HAPPY_PATH_RULES.md → REGUŁA 2
**IF:** Site istnieje, ale nie ma Pages  
**THEN:** Blokuj Open Builder, Create Page, Publish All

### Aktualny Stan
```tsx
// Linia 286-296
<Card>
  <CardHeader>
    <CardTitle>Recently Modified Pages</CardTitle>
  </CardHeader>
  <CardContent>
    <EmptyState
      title="No pages yet"
      description="No pages yet. Create a page to start building your site."
    />
  </CardContent>
</Card>
```

### Wymagane Zmiany

#### 2.1. EmptyState zgodny z dokumentem
```tsx
// Zmień na:
<Card>
  <CardHeader>
    <CardTitle>Recently Modified Pages</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="py-12">
      <EmptyState
        title="Nie masz jeszcze żadnych stron"
        description="Utwórz pierwszą stronę, aby rozpocząć budowanie"
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-10 w-10">
            <rect x="5" y="4" width="12" height="15" rx="2" />
            <path d="M8 9h6M8 13h4" strokeLinecap="round" />
          </svg>
        }
        action={{
          label: "Utwórz pierwszą stronę",
          onClick: () => router.push(`/sites/${slug}/panel/pages`),
          variant: "primary"
        }}
      />
    </div>
  </CardContent>
</Card>
```

#### 2.2. Blokada Quick Actions
```tsx
// Linia 202-243 - Quick Actions
// ZMIEŃ na:
const hasPagesCheck = pagesCount > 0;

<Card>
  <CardHeader>
    <CardTitle>Quick Actions</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      
      {/* Open Builder - DISABLED jeśli brak pages */}
      <Tooltip content={!hasPagesCheck ? "Utwórz stronę, aby otworzyć builder" : ""}>
        <Button 
          variant="outline" 
          className="w-full" 
          disabled={!hasPagesCheck}
          onClick={() => {
            if (hasPagesCheck) {
              router.push(`/sites/${slug}/panel/page-builder`);
            }
          }}
        >
          <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
              <path d="M5 5h10v10H5z" />
              <path d="M5 10h10M10 5v10" strokeLinecap="round" />
            </svg>
          </span>
          Open Builder
        </Button>
      </Tooltip>

      {/* Create Page - DISABLED jeśli brak pages (przekieruj do /pages) */}
      <Tooltip content={!hasPagesCheck ? "Utwórz pierwszą stronę w sekcji Pages" : ""}>
        <Button 
          variant="outline" 
          className="w-full" 
          disabled={!hasPagesCheck}
          onClick={() => router.push(`/sites/${slug}/panel/pages`)}
        >
          <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
              <rect x="4" y="4" width="10" height="12" rx="1.5" />
              <path d="M7 8h5M7 11h4" strokeLinecap="round" />
            </svg>
          </span>
          Create Page
        </Button>
      </Tooltip>

      {/* Publish All - DISABLED jeśli brak pages */}
      <Tooltip content={!hasPagesCheck ? "Utwórz i edytuj strony, aby publikować" : ""}>
        <Button
          variant="primary"
          className="w-full"
          onClick={handlePublishAll}
          disabled={publishing || loading || !hasPagesCheck}
        >
          <span className="mr-2 inline-flex h-4 w-4 items-center justify-center">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4">
              <path d="M5 4.5h10a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z" />
              <path d="M6.5 7h7M6.5 10h7M6.5 13h4" strokeLinecap="round" />
            </svg>
          </span>
          {publishing ? 'Publishing...' : 'Publish All'}
        </Button>
      </Tooltip>
    </div>
  </CardContent>
</Card>
```

#### 2.3. Walidacja przed Publish All
```tsx
// W funkcji handlePublishAll (linia 79-107)
const handlePublishAll = async () => {
  if (!tenantId) return;

  // GUARDRAIL: Nie pozwól publikować jeśli brak pages
  if (pagesCount === 0) {
    toast.push({
      tone: 'error',
      message: 'Brak stron do publikacji. Utwórz przynajmniej jedną stronę.',
    });
    return;
  }

  try {
    setPublishing(true);

    let token = getTenantToken(tenantId);
    if (!token) {
      token = await exchangeTenantToken(tenantId);
    }

    await apiClient.publishSite(token, tenantId);

    toast.push({
      tone: 'success',
      message: 'All pages published successfully',
    });

    await loadData();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to publish pages';
    toast.push({
      tone: 'error',
      message,
    });
  } finally {
    setPublishing(false);
  }
};
```

### Rezultat
- ✅ EmptyState prowadzi do `/sites/[slug]/panel/pages`
- ✅ Zablokowane akcje: Open Builder, Create Page, Publish All
- ✅ Tooltips wyjaśniają powód blokady

---

## 3. Pages Empty States

### Lokalizacja
`apps/admin/src/app/sites/[slug]/panel/pages/page.tsx`

### Reguła: EMPTY_STATES_DESIGN.md → #3
**Empty State:** "Zacznij od utworzenia pierwszej podstrony"

### Aktualny Stan
```tsx
// Linia 262-274
{pages.length === 0 ? (
  <div className="py-12">
    <EmptyState
      title={t('pages.noPagesYet')}
      description={t('pages.createPageToStart')}
      icon={...}
    />
  </div>
) : (...)}
```

### Wymagane Zmiany

#### 3.1. EmptyState z akcją
```tsx
// Zmień na:
{pages.length === 0 ? (
  <div className="py-12">
    <EmptyState
      title="Zacznij od utworzenia pierwszej podstrony"
      description="Podstrony to elementy Twojej witryny. Dodaj pierwszą, aby zacząć budować."
      icon={
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-10 w-10">
          <rect x="5" y="4" width="12" height="15" rx="2" />
          <path d="M8 9h6M8 13h4" strokeLinecap="round" />
        </svg>
      }
      action={{
        label: "Utwórz podstronę",
        onClick: () => setShowCreateModal(true),
        variant: "primary"
      }}
    />
  </div>
) : (
  // ... istniejąca tabela
)}
```

#### 3.2. Walidacja Create Modal
```tsx
// W handleCreate (linia 107-141)
// DODAJ walidację przed tworzeniem:
const handleCreate = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!tenantId || !createEnvironmentId) return;

  // GUARDRAIL: Walidacja tytułu
  if (!createTitle || createTitle.trim().length === 0) {
    toast.push({
      tone: 'error',
      message: 'Tytuł strony jest wymagany',
    });
    return;
  }

  // GUARDRAIL: Walidacja slug
  const finalSlug = createSlug || createTitle.toLowerCase().replace(/\s+/g, '-');
  const slugRegex = /^[a-z0-9-]+$/;
  if (!slugRegex.test(finalSlug)) {
    toast.push({
      tone: 'error',
      message: 'Slug może zawierać tylko małe litery, cyfry i myślniki',
    });
    return;
  }

  try {
    let token = getTenantToken(tenantId);
    if (!token) {
      token = await exchangeTenantToken(tenantId);
    }

    await apiClient.createPage(token, tenantId, {
      environmentId: createEnvironmentId,
      slug: finalSlug,
      title: createTitle,
      status: 'draft',
      content: {},
    });

    toast.push({
      tone: 'success',
      message: 'Strona utworzona pomyślnie',
    });

    setShowCreateModal(false);
    setCreateTitle('');
    setCreateSlug('');
    await loadData();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Błąd podczas tworzenia strony';
    toast.push({
      tone: 'error',
      message,
    });
  }
};
```

### Rezultat
- ✅ EmptyState z CTA "Utwórz podstronę"
- ✅ Walidacja tytułu i slug przed utworzeniem
- ✅ Jasne komunikaty błędów

---

## 4. Page Builder Guards

### Lokalizacja
`apps/admin/src/app/sites/[slug]/panel/page-builder/page.tsx`

### Reguła: HAPPY_PATH_RULES.md → REGUŁA 3
**IF:** Brak `pageId` w URL  
**THEN:** Automatyczne przekierowanie do `/sites/[slug]/panel/pages`

### Aktualny Stan
```tsx
// Linia 34-79 - loadPage()
// Linia 146-160 - Page not found
```

### Wymagane Zmiany

#### 4.1. Redirect przy braku pageId
```tsx
// DODAJ na początku komponentu (przed loadPage):
export default function PageBuilderPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const pageId = searchParams?.get('pageId') || null;
  const toast = useToast();

  // GUARDRAIL: Redirect jeśli brak pageId
  useEffect(() => {
    if (!pageId) {
      toast.push({
        tone: 'info',
        message: 'Wybierz stronę do edycji',
      });
      router.push(`/sites/${slug}/panel/pages`);
    }
  }, [pageId, slug, router, toast]);

  // ... reszta kodu
```

#### 4.2. Walidacja przed publikacją
```tsx
// W handlePublishConfirm (linia 166-199)
// DODAJ guardrails:
const handlePublishConfirm = async () => {
  if (!tenantId || !pageId || !page) return;

  // GUARDRAIL 1: Sprawdź czy strona ma treść
  const hasContent = content && 
    (typeof content === 'object' && Object.keys(content).length > 0);

  if (!hasContent) {
    toast.push({
      tone: 'error',
      message: 'Nie można opublikować pustej strony. Dodaj treść przed publikacją.',
    });
    setShowPublishModal(false);
    return;
  }

  // GUARDRAIL 2: Sprawdź czy strona ma tytuł
  if (!page.title || page.title.trim().length === 0) {
    toast.push({
      tone: 'error',
      message: 'Tytuł strony jest wymagany. Dodaj tytuł przed publikacją.',
    });
    setShowPublishModal(false);
    return;
  }

  // GUARDRAIL 3: Sprawdź czy strona ma slug
  if (!page.slug || page.slug.trim().length === 0) {
    toast.push({
      tone: 'error',
      message: 'Slug strony jest wymagany. Dodaj slug przed publikacją.',
    });
    setShowPublishModal(false);
    return;
  }

  setShowPublishModal(false);

  try {
    setSaving(true);

    // Zapisz przed publikacją
    let token = getTenantToken(tenantId);
    if (!token) {
      token = await exchangeTenantToken(tenantId);
    }

    await apiClient.updatePageContent(token, tenantId, pageId, content);
    await apiClient.publishPage(token, tenantId, pageId);

    toast.push({
      tone: 'success',
      message: 'Strona opublikowana pomyślnie',
    });

    await loadPage();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Błąd podczas publikacji';
    toast.push({
      tone: 'error',
      message,
    });
  } finally {
    setSaving(false);
  }
};
```

#### 4.3. Walidacja przed zapisaniem (unsaved changes)
```tsx
// W PageBuilderWithSave - dodaj check:
function PageBuilderWithSave({
  pageName,
  environment,
  content,
  onContentChange,
  onSave,
  onPublish,
  saving,
  lastSaved,
}: PageBuilderWithSaveProps) {
  const [initialContent] = useState(content);
  const hasUnsavedChanges = JSON.stringify(content) !== JSON.stringify(initialContent);

  const handlePublishWithCheck = () => {
    if (hasUnsavedChanges && onPublish) {
      // Pokaż modal: "Zapisz przed publikacją?"
      const confirmed = confirm(
        'Masz niezapisane zmiany. Czy chcesz zapisać przed publikacją?'
      );
      if (confirmed) {
        onSave();
        // Zaczekaj chwilę na zapisanie
        setTimeout(() => {
          onPublish();
        }, 500);
      } else {
        onPublish();
      }
    } else if (onPublish) {
      onPublish();
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Topbar */}
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold">{pageName}</h1>
              <Badge tone={environment === 'production' ? 'success' : 'warning'}>
                {environment === 'production' ? 'Production' : 'Draft'}
              </Badge>
              {hasUnsavedChanges && (
                <Badge tone="error">Niezapisane zmiany</Badge>
              )}
              {lastSaved && !hasUnsavedChanges && (
                <span className="text-xs text-muted">
                  Zapisano {lastSaved.toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onSave}
              disabled={saving || !hasUnsavedChanges}
            >
              {saving ? 'Zapisywanie...' : 'Zapisz'}
            </Button>
            {onPublish && environment === 'draft' && (
              <Tooltip content={hasUnsavedChanges ? "Zapisz zmiany przed publikacją" : ""}>
                <Button
                  variant="primary"
                  onClick={handlePublishWithCheck}
                  disabled={saving}
                >
                  Publikuj
                </Button>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-64 border-r border-gray-200 bg-white flex-shrink-0">
          <BlockBrowser />
        </div>
        <div className="flex-1 overflow-hidden">
          <PageBuilderCanvas content={content} onContentChange={onContentChange} />
        </div>
        <div className="w-80 border-l border-gray-200 bg-white flex-shrink-0">
          <PropertiesPanel selectedBlockId={undefined} />
        </div>
      </div>
    </div>
  );
}
```

### Rezultat
- ✅ Automatyczne przekierowanie przy braku pageId
- ✅ Blokada publikacji pustej strony
- ✅ Walidacja tytułu i slug przed publikacją
- ✅ Ostrzeżenie o niezapisanych zmianach

---

## 5. Marketing Empty States

### Lokalizacja
`apps/admin/src/app/sites/[slug]/panel/marketing/page.tsx`

### Reguła: HAPPY_PATH_RULES.md → REGUŁA 4, 5, 7
**Drafts Tab:** Brak draftów → CTA "Utwórz nowy draft"  
**Publish:** Walidacja kanałów, treści, połączeń

### Aktualny Stan
```tsx
// Linia 315-329 - Drafts Empty State
// Linia 163-192 - handlePublish
```

### Wymagane Zmiany

#### 5.1. Drafts Empty State
```tsx
// Zmień (linia 315-329):
{drafts.length === 0 ? (
  <Card>
    <CardContent>
      <div className="py-12">
        <EmptyState
          title="Nie masz jeszcze żadnych draftów"
          description="Utwórz draft, aby przygotować treść do publikacji omnichannel"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-10 w-10">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
            </svg>
          }
          action={{
            label: "Utwórz nowy draft",
            onClick: () => setShowCreateDraft(true),
            variant: "primary"
          }}
        />
      </div>
    </CardContent>
  </Card>
) : (
  // ... istniejąca lista
)}
```

#### 5.2. Blokada Publish bez kanałów
```tsx
// W handlePublish (linia 163-192)
// DODAJ walidacje:
const handlePublish = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!tenantId) return;

  // GUARDRAIL 1: Sprawdź czy wybrano kanały
  if (!selectedChannels || selectedChannels.length === 0) {
    toast.push({
      tone: 'error',
      message: 'Wybierz przynajmniej jeden kanał do publikacji',
    });
    return;
  }

  // GUARDRAIL 2: Sprawdź czy jest treść (jeśli nie wybrano draftu)
  if (!selectedDraftId) {
    const hasContent = draftTitle && draftTitle.trim().length > 0;
    if (!hasContent) {
      toast.push({
        tone: 'error',
        message: 'Podaj tytuł lub wybierz istniejący draft',
      });
      return;
    }
  }

  try {
    await publishMarketingContent(tenantId, {
      siteId: tenantId,
      draftId: selectedDraftId || undefined,
      channels: selectedChannels,
      content: selectedDraftId ? undefined : draftContent,
      title: selectedDraftId ? undefined : draftTitle,
    });

    toast.push({
      tone: 'success',
      message: 'Zadanie publikacji utworzone pomyślnie',
    });

    setShowPublish(false);
    setSelectedDraftId(null);
    setSelectedChannels(['site']);
    await loadData();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Błąd podczas publikacji';
    toast.push({
      tone: 'error',
      message,
    });
  }
};
```

#### 5.3. Blokada Publish button w header
```tsx
// W SectionHeader (linia 225-232)
// ZMIEŃ action na:
const hasAnyDrafts = drafts.length > 0;

<SectionHeader
  title="Marketing & Distribution"
  description="Publikuj treść wszędzie: strona, media społecznościowe, reklamy"
  action={hasAnyDrafts ? {
    label: 'Publikuj',
    onClick: () => setShowPublish(true),
  } : undefined}
/>

{/* Jeśli brak draftów, pokaż tooltip */}
{!hasAnyDrafts && (
  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <p className="text-sm text-blue-900">
      <strong>Utwórz draft</strong>, aby przygotować treść do publikacji.
    </p>
  </div>
)}
```

#### 5.4. Walidacja Create Draft
```tsx
// W handleCreateDraft (linia 132-161)
// DODAJ walidacje:
const handleCreateDraft = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!tenantId) return;

  // GUARDRAIL 1: Walidacja tytułu
  if (!draftTitle || draftTitle.trim().length === 0) {
    toast.push({
      tone: 'error',
      message: 'Tytuł draftu jest wymagany',
    });
    return;
  }

  // GUARDRAIL 2: Walidacja kanałów
  if (!selectedChannels || selectedChannels.length === 0) {
    toast.push({
      tone: 'error',
      message: 'Wybierz przynajmniej jeden kanał',
    });
    return;
  }

  try {
    await createDistributionDraft(tenantId, {
      siteId: tenantId,
      title: draftTitle,
      content: draftContent,
      channels: selectedChannels,
    });

    toast.push({
      tone: 'success',
      message: 'Draft utworzony pomyślnie',
    });

    setShowCreateDraft(false);
    setDraftTitle('');
    setDraftContent({});
    setSelectedChannels(['site']);
    await loadData();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Błąd podczas tworzenia draftu';
    toast.push({
      tone: 'error',
      message,
    });
  }
};
```

#### 5.5. Publish Modal z walidacją kanałów
```tsx
// W Publish Modal (linia 552-620)
// DODAJ walidację przy wyborze social media:
<div>
  <label className="block text-sm font-medium mb-1">Kanały</label>
  <div className="space-y-2">
    {[
      { id: 'site', label: 'Strona', available: true },
      { id: 'facebook', label: 'Facebook', available: false },
      { id: 'twitter', label: 'Twitter', available: false },
      { id: 'linkedin', label: 'LinkedIn', available: false },
      { id: 'instagram', label: 'Instagram', available: false },
      { id: 'ads', label: 'Reklamy', available: true },
    ].map((channel) => (
      <label 
        key={channel.id} 
        className={`flex items-center gap-2 ${!channel.available ? 'opacity-50' : ''}`}
      >
        <input
          type="checkbox"
          checked={selectedChannels.includes(channel.id)}
          disabled={!channel.available}
          onChange={(e) => {
            if (!channel.available) {
              toast.push({
                tone: 'warning',
                message: `Kanał ${channel.label} nie jest połączony. Połącz konto w ustawieniach.`,
              });
              return;
            }
            if (e.target.checked) {
              setSelectedChannels([...selectedChannels, channel.id]);
            } else {
              setSelectedChannels(selectedChannels.filter((c) => c !== channel.id));
            }
          }}
        />
        <span className="text-sm capitalize">{channel.label}</span>
        {!channel.available && (
          <span className="text-xs text-red-600">(Nie połączono)</span>
        )}
      </label>
    ))}
  </div>
  {selectedChannels.length === 0 && (
    <p className="text-xs text-red-600 mt-2">
      Wybierz przynajmniej jeden kanał
    </p>
  )}
</div>
```

### Rezultat
- ✅ EmptyState w Drafts z CTA "Utwórz nowy draft"
- ✅ Walidacja kanałów przed publikacją
- ✅ Walidacja treści przed publikacją
- ✅ Disabled channels z informacją o braku połączenia
- ✅ Przycisk "Publikuj" w header tylko gdy są drafts

---

## 📊 Podsumowanie Zmian

### Komponenty do Zmiany
| Komponent | Plik | Zmiany |
|-----------|------|--------|
| Dashboard | `dashboard/page.tsx` | EmptyState, blokady Quick Actions, tooltips |
| Site Overview | `[slug]/panel/overview/page.tsx` | EmptyState, blokady akcji, walidacja publish |
| Pages | `[slug]/panel/pages/page.tsx` | EmptyState, walidacja create/edit |
| Page Builder | `[slug]/panel/page-builder/page.tsx` | Redirect guard, walidacje publish, unsaved changes |
| Marketing | `[slug]/panel/marketing/page.tsx` | EmptyState drafts, walidacje kanałów/treści |

### Wspólne Wzorce

#### 1. EmptyState Component
```tsx
interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'outline';
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: EmptyStateAction;
}
```

#### 2. Tooltip Component
```tsx
interface TooltipProps {
  content?: string;
  children: React.ReactNode;
}

function Tooltip({ content, children }: TooltipProps) {
  // Implementacja z hover
}
```

#### 3. Guardrail Pattern
```tsx
// 1. Walidacja przed akcją
if (!condition) {
  toast.push({
    tone: 'error',
    message: 'Jasny komunikat dla użytkownika',
  });
  return;
}

// 2. Disabled button z tooltip
<Tooltip content={!condition ? "Powód blokady" : ""}>
  <Button disabled={!condition}>
    Akcja
  </Button>
</Tooltip>

// 3. Redirect guard
useEffect(() => {
  if (!requiredParam) {
    toast.push({ tone: 'info', message: 'Redirect reason' });
    router.push('/target-path');
  }
}, [requiredParam]);
```

---

## 🎯 Kolejne Kroki

1. ✅ Stworzenie tego dokumentu
2. ⏳ Implementacja Dashboard (TODO: ux-1)
3. ⏳ Implementacja Site Overview (TODO: ux-2)
4. ⏳ Implementacja Pages (TODO: ux-3)
5. ⏳ Implementacja Page Builder (TODO: ux-4)
6. ⏳ Implementacja Marketing (TODO: ux-5)
7. ⏳ Testy manualne wszystkich ścieżek
8. ⏳ Aktualizacja tłumaczeń (en.json, pl.json)

---

**Koniec dokumentu.**





