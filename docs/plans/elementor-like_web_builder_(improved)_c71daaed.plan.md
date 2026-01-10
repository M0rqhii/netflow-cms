---
name: Elementor-like Web Builder (Improved)
overview: ""
todos: []
---

# Plan Implementacji Web Buildera (Elementor-like) - Wersja Poprawiona

## Kluczowe Zmiany Architektoniczne

### 1. Normalized Tree Model (zamiast sections[])

**Problem:** Płaska struktura `sections[]` nie skaluje się przy templates, copy/paste, reużywalnych komponentach, slotach.

**Rozwiązanie:** Normalized tree z rootem:

```typescript
type PageContent = {
  version: string;
  rootId: string;
  nodes: Record<string, BlockNode>;
}

type BlockNode = {
  id: string;
  type: string;
  parentId: string | null;
  childIds: string[];          // kolejność dzieci
  props: {
    content: Record<string, any>;
    style: {
      base: Record<string, any>;
      responsive?: {
        tablet?: Record<string, any>;
        mobile?: Record<string, any>;
      };
    };
    advanced?: Record<string, any>;
  };
  meta?: {
    locked?: boolean;
    hidden?: boolean;
    label?: string;
  };
}
```

**Korzyści:**

- Reorder = operacje na `childIds` (tanio i przewidywalnie)
- Copy/paste = klon subtree
- Undo/redo = snapshot albo patch (łatwiej)
- Walidacja = per-node + reguły relacji

### 2. Reguły Kompozycji Bloków

**Problem:** Bez reguł każdy może wrzucić sekcję do przycisku.

**Rozwiązanie:** Block Registry z kontraktem kompozycji:

```typescript
type BlockDefinition = {
  type: string;
  title: string;
  icon: ReactNode;
  defaultProps: Record<string, any>;
  slots?: SlotDef[]; // np. "children", "tabs", "items"
  canHaveChildren?: boolean;
  allowedChildren?: string[] | ((childType: string) => boolean);
  allowedParents?: string[] | ((parentType: string) => boolean);
  isCanvasOnly?: boolean;
}
```

**Przykłady reguł:**

- Section → Column
- Column → (Heading/Text/Image/Button/Form/Advanced)
- Tabs → TabItem → (bloki)
- Accordion → AccordionItem → (bloki)
- Carousel → Slide → (bloki)

### 3. Undo/Redo: Commit-Based (nie przy każdym ruchu)

**Problem:** Snapshotowanie całej struktury przy każdym `onDragOver` ubija performance.

**Rozwiązanie:**

- Undo zapisuj na **commit**: drop zakończony, blur inputa, "Apply", koniec transakcji
- Do edycji tekstu: debounced patch (300–500ms)
- Model: `history: { past: Patch[], future: Patch[] }` albo snapshoty tylko na commit
- Maks 50 kroków (reszta out)

### 4. Drag & Drop: Jeden DndContext z Drop Zones jako Sloty

**Problem:** Każdy blok robi swój DndContext = spaghetti.

**Rozwiązanie:**

- Jeden `DndContext` na Canvas
- Każdy blok z dziećmi renderuje **DropZone dla slotu**: `dropzone:${blockId}:children` lub `dropzone:${blockId}:tabs:${tabId}`
- Rozróżnienie drag types:
  - `dragType: "existing-node"` z `nodeId`
  - `dragType: "new-block"` z `blockType` (z rejestru)
- Collision strategy: `closestCenter` / `rectIntersection` na start

### 5. Struktura Props: content/style/advanced

**Problem:** Płaska struktura props bez organizacji.

**Rozwiązanie:**

```typescript
props: {
  content: {...}  // specyficzne dla bloku
  style: {
    base: {...}   // desktop (baza)
    responsive?: {
      tablet?: {...}  // override tylko wybrane pola
      mobile?: {...}
    }
  }
  advanced: {...} // CSS classes, custom attributes, animations
}
```

**Responsive:** Desktop = baza, Tablet/Mobile = override tylko wybrane pola (dziedziczenie).

### 6. Performance: Selektory Zustand + Memo

**Zasady:**

1. Komponent bloku subskrybuje tylko własny node (po `id`), nie całe drzewo
2. BlockWrapper nie może dostawać nowych funkcji/obiektów co render (stable props)
3. Virtualizacja: nie w tygodniu 1, wprowadź po stabilnym modelu drzewa

## 1. Architektura i Infrastruktura

### 1.1 State Management (Zustand Store)

Utworzenie w `apps/admin/src/stores/page-builder-store.ts`:

**Stan:**

- `content: PageContent` - normalized tree
- `selectedBlockId: string | null`
- `history: { past: Patch[], future: Patch[] }` - commit-based
- `currentBreakpoint: 'desktop' | 'tablet' | 'mobile'`
- `mode: 'edit' | 'preview'`
- `clipboard: BlockNode | null`
- `templates: BlockTemplate[]`

**Actions:**

- `addBlock(parentId, blockType, index?)` - dodaj blok
- `moveBlock(nodeId, newParentId, newIndex)` - przenieś
- `updateBlockProps(nodeId, props)` - zaktualizuj props
- `deleteBlock(nodeId)` - usuń
- `selectBlock(nodeId | null)` - wybierz
- `commitChange()` - commit do historii (undo/redo)
- `undo()` / `redo()` - historia
- `copyBlock(nodeId)` / `pasteBlock(parentId, index?)` - clipboard

**Selektory:**

- `useBlockNode(id)` - subskrybuj tylko jeden node
- `useBlockChildren(parentId)` - dzieci rodzica
- `useSelectedBlock()` - wybrany blok

### 1.2 Block System Architecture

**Block Registry** (`apps/admin/src/lib/page-builder/block-registry.ts`):

- Rejestr wszystkich bloków z definicjami
- Reguły kompozycji (`allowedChildren`, `allowedParents`)
- Slot definitions
- Default props per block type

**Block Types** (`apps/admin/src/lib/page-builder/types.ts`):

- TypeScript typy dla normalized tree
- BlockNode, PageContent, BlockDefinition
- Patch type dla undo/redo

**Block Schema** (`packages/schemas/src/page-builder/`):

- `PageContentSchema` - główny schema
- `BlockNodeSchema` - schema node
- `BlockBaseSchema` - bazowy (id, type, props)
- `StyleSchema` - wspólny schema stylów
- Per-block schemas (HeadingSchema, ImageSchema, etc.)

### 1.3 Dependencies

Dodanie do `apps/admin/package.json`:

- `@dnd-kit/core` - core drag & drop
- `@dnd-kit/sortable` - sortable functionality
- `@dnd-kit/utilities` - utilities
- `react-color` - color picker
- `react-icons` - ikony dla bloków

## 2. System Bloków

### 2.1 Block Base Classes

Utworzenie w `apps/admin/src/components/page-builder/blocks/`:

- `BaseBlock.tsx` - bazowy komponent z logiką renderowania
- `BlockWrapper.tsx` - wrapper z drag handle, controls, hover states (memoized, stable props)
- `BlockControls.tsx` - przyciski edycji (duplicate, delete, move)
- `DropZone.tsx` - drop zone dla slotu (renderowany przez bloki z dziećmi)

### 2.2 Layout Blocks (MVP: Section + Column)

**SectionBlock** (`blocks/layout/SectionBlock.tsx`):

- Container dla sekcji
- Style: background, gradient, overlay, padding, margin
- Slots: `children` (ColumnBlock tylko)
- `allowedChildren: ['column']`

**ColumnBlock** (`blocks/layout/ColumnBlock.tsx`):

- Kolumny w sekcjach
- Responsive column widths (1-4 kolumn na MVP)
- Slots: `children` (wszystkie content blocks)
- `allowedChildren: ['heading', 'text', 'image', 'button', ...]`

**ContainerBlock** - ODŁOŻONE na później (często robi więcej zamieszania niż wartości w MVP)

### 2.3 Typography Blocks

**HeadingBlock** (`blocks/typography/HeadingBlock.tsx`):

- H1-H6
- Props: content (text, level), style (font size, weight, color, alignment)
- `canHaveChildren: false`

**TextBlock** (`blocks/typography/TextBlock.tsx`):

- Rich text editor (użycie istniejącego RichTextEditor)
- Props: content (html), style (typography, spacing, color)
- `canHaveChildren: false`

### 2.4 Media Blocks

**ImageBlock** (`blocks/media/ImageBlock.tsx`):

- Integracja z MediaManager
- Props: content (imageId, alt, caption, link), style (sizing, object-fit)
- `canHaveChildren: false`

**VideoBlock** - Faza 4

**GalleryBlock** - Faza 4

### 2.5 Component Blocks

**ButtonBlock** (`blocks/components/ButtonBlock.tsx`):

- Props: content (text, link, icon), style (variant, colors, spacing)
- `canHaveChildren: false`

**FormBlock** - Faza 4 (to prawie osobny produkt)

**IconBlock** - Faza 4

### 2.6 Advanced Blocks (Faza 4)

**CarouselBlock**, **TabsBlock**, **AccordionBlock**:

- Wprowadzają sloty i edge-case'y
- Implementacja po stabilnym MVP

## 3. Canvas i Drag & Drop

### 3.1 Canvas Implementation

Przebudowa `apps/admin/src/components/page-builder/canvas/PageBuilderCanvas.tsx`:

**Jeden DndContext:**

- Jeden `DndContext` na cały canvas
- Collision detection: `closestCenter` / `rectIntersection`
- Drag types: `"existing-node"` vs `"new-block"`

**Renderowanie drzewa:**

- Rekurencyjne renderowanie od `rootId`
- Każdy blok renderuje `DropZone` dla swoich slotów
- Visual indicators podczas drag (overlay + placeholder)
- Drop indicator jako "linia wstawiania"

**Selection handling:**

- Click na blok = select
- Keyboard shortcuts (Delete, Copy, Paste, Undo, Redo, Esc)

### 3.2 Drop Zones jako Sloty

**Implementacja:**

- Każdy blok z `canHaveChildren: true` renderuje `DropZone`
- Drop zone ID: `dropzone:${blockId}:${slotName}`
- Przykład: `dropzone:section1:children`, `dropzone:tabs1:tabs:tab1`

**Logika drop:**

- Wynik dropa: `(sourceId, targetZoneId, index)`
- Walidacja: sprawdź `allowedChildren` / `allowedParents`
- Commit change po zakończeniu drag

## 4. Block Browser

### 4.1 Enhanced Block Browser

Rozbudowa `apps/admin/src/components/page-builder/sidebar-left/BlockBrowser.tsx`:

- Kategorie bloków z ikonami
- Search/filter bloków
- Drag handles na blokach (drag type: `"new-block"`)
- Block previews
- Block templates section (Faza 5)

### 4.2 Block Categories (MVP)

- Layout (Section, Column)
- Typography (Heading, Text)
- Media (Image)
- Components (Button)

## 5. Properties Panel

### 5.1 Dynamic Properties Editor

Przebudowa `apps/admin/src/components/page-builder/sidebar-right/PropertiesPanel.tsx`:

**Struktura:**

- Tabs: Content, Style, Advanced
- Dynamiczne formularze bazujące na schemacie bloku (Zod → UI)
- Real-time preview zmian

**MVP Style Editor (Faza 3):**

- **Spacing**: Padding, margin (top, right, bottom, left)
- **Colors**: Text color, background color
- **Typography**: Font size, weight, alignment (dla typography blocks)
- **Layout**: Width, height (dla layout blocks)

**Zaawansowane Style (Faza 5):**

- Borders, shadows, gradients
- Full typography (line height, letter spacing)
- Flex properties

### 5.2 Responsive Style Editor

**Dziedziczenie:**

- Desktop = baza (style.base)
- Tablet/Mobile = override tylko wybrane pola (style.responsive.tablet/mobile)
- Merge w renderze: `styleBase` + `override dla breakpointu`

**UI:**

- Device switcher w topbar
- Style editor pokazuje tylko override'y dla aktualnego breakpointu
- Clear override button

## 6. Undo/Redo System

### 6.1 Commit-Based History

**Implementacja:**

- Snapshot całego `PageContent` **tylko** na commitach:
  - Drop zakończony
  - Blur inputa (debounced 300-500ms)
  - "Apply" w properties panel
  - Delete block
  - Paste block

**Model:**

```typescript
history: {
  past: PageContent[];  // max 50
  future: PageContent[];
}
```

**Actions:**

- `commitChange()` - snapshot current state, clear future
- `undo()` - restore z past, push current do future
- `redo()` - restore z future, push current do past

**Keyboard shortcuts:** Ctrl+Z, Ctrl+Y

## 7. Copy/Paste

### 7.1 Clipboard System

**Implementacja:**

- `copyBlock(nodeId)` - klonuj node + całe subtree do clipboard
- `pasteBlock(parentId, index?)` - wklej z clipboard, commit change
- Clipboard w store: `clipboard: BlockNode | null`

**Keyboard shortcuts:** Ctrl+C, Ctrl+V

**Walidacja:**

- Sprawdź `allowedChildren` przed paste
- Jeśli nie pasuje, pokaż błąd

## 8. Backend Integration

### 8.1 Content Schema

Rozszerzenie `packages/schemas/src/page-builder/`:

- `PageContentSchema` - walidacja normalized tree
- `BlockNodeSchema` - walidacja node
- `StyleSchema` - wspólny schema stylów
- Per-block content schemas

### 8.2 API Updates

Rozszerzenie `apps/api/src/modules/site-panel/site-pages.service.ts`:

**Walidacja:**

- Walidacja struktury normalized tree
- Walidacja per-node (Zod schemas)
- Walidacja reguł kompozycji (allowedChildren)
- Walidacja wymaganych pól

**