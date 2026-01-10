---
name: ""
overview: ""
todos: []
---

---

name: Elementor-like Web Builder

overview: Implementacja pełnego web buildera w stylu Elementor z drag & drop, systemem bloków, edytorem stylów, responsywnością i zaawansowanymi funkcjami edycji.

todos:

  - id: setup-dependencies

content: "Dodanie zależności: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, react-color, react-icons do apps/admin/package.json"

status: pending

  - id: create-store

content: Utworzenie Zustand store dla page buildera (apps/admin/src/stores/page-builder-store.ts) z normalized tree (rootId, nodes), wybranym blokiem, historią commit-based (max 50 kroków), responsywnością, selektorami dla performance

status: pending

dependencies:

      - setup-dependencies
  - id: block-types-schema

content: Utworzenie TypeScript typów i Zod schematów dla bloków z normalized tree structure (PageContent z rootId i nodes: Record<string, BlockNode>), BlockNode z parentId, childIds, props: {content, style: {base, responsive}, advanced}

status: pending

dependencies:

      - setup-dependencies
  - id: block-registry

content: Implementacja Block Registry systemu (apps/admin/src/lib/page-builder/block-registry.ts) do rejestracji i zarządzania blokami

status: pending

dependencies:

      - block-types-schema
  - id: base-block-components

content: "Utworzenie bazowych komponentów: BaseBlock.tsx, BlockWrapper.tsx, BlockControls.tsx w apps/admin/src/components/page-builder/blocks/"

status: pending

dependencies:

      - block-registry
      - create-store
  - id: layout-blocks

content: "Implementacja bloków layout: SectionBlock, ColumnBlock z obsługą kolumn (1-4 na MVP) i stylów. ContainerBlock odłożony na później."

status: pending

dependencies:

      - base-block-components
  - id: typography-blocks

content: "Implementacja bloków typografii: HeadingBlock, TextBlock z rich text editor"

status: pending

dependencies:

      - base-block-components
  - id: media-blocks

content: "Implementacja bloków mediów: ImageBlock (z MediaManager), VideoBlock, GalleryBlock"

status: pending

dependencies:

      - base-block-components
  - id: component-blocks

content: "Implementacja bloków komponentów: ButtonBlock, FormBlock, IconBlock"

status: pending

dependencies:

      - base-block-components
  - id: canvas-dnd

content: "Przebudowa PageBuilderCanvas z integracją @dnd-kit: jeden DndContext na canvas, drop zones jako sloty (dropzone:${blockId}:children), rozróżnienie drag types (existing-node vs new-block), collision strategy (closestCenter/rectIntersection)"

status: pending

dependencies:

      - create-store
      - base-block-components
  - id: block-browser-enhance

content: "Rozbudowa BlockBrowser: kategorie z ikonami, search, drag handles, block previews, templates section"

status: pending

dependencies:

      - block-registry
  - id: properties-panel

content: "Przebudowa PropertiesPanel: dynamiczne formularze, tabs (Content/Style/Advanced), real-time preview"

status: pending

dependencies:

      - create-store
      - base-block-components
  - id: style-editor

content: "Implementacja Style Editor: najpierw podstawowe (spacing, kolor, align), potem zaawansowane (borders, shadows, gradients). Responsive z dziedziczeniem (desktop=baza, tablet/mobile=override)"

status: pending

dependencies:

      - properties-panel
  - id: responsive-system

content: "Implementacja systemu responsywnego: device switcher w topbar, viewport resize, style overrides per breakpoint"

status: pending

dependencies:

      - create-store
      - style-editor
  - id: undo-redo

content: Implementacja systemu undo/redo COMMIT-BASED: snapshoty tylko na commitach (drop zakończony, blur inputa, Apply), debounced patch dla edycji tekstu (300-500ms), max 50 kroków, keyboard shortcuts (Ctrl+Z, Ctrl+Y)

status: pending

dependencies:

      - create-store
  - id: copy-paste

content: Implementacja copy/paste bloków z clipboard w store i keyboard shortcuts

status: pending

dependencies:

      - create-store
  - id: advanced-blocks

content: "Implementacja zaawansowanych bloków: CarouselBlock, TabsBlock, AccordionBlock"

status: pending

dependencies:

      - base-block-components
  - id: backend-validation

content: "Rozszerzenie backend: walidacja contentu w site-pages.service.ts, content transformation, sanitization"

status: pending

dependencies:

      - block-types-schema
  - id: keyboard-shortcuts

content: "Implementacja keyboard shortcuts: Delete, Ctrl+C/V/Z/Y, Esc, Arrow keys z visual feedback"

status: pending

dependencies:

      - canvas-dnd
  - id: performance-optimization

content: "Optymalizacje wydajności: selektory Zustand (komponent subskrybuje tylko własny node), memoization z stable props, debounced auto-save. Virtual scrolling wprowadzić po stabilnym modelu drzewa."

status: pending

dependencies:

      - canvas-dnd
      - properties-panel
  - id: ui-polish

content: "UI/UX improvements: hover states, selection indicators, context menu, loading/error states"

status: pending

dependencies:

      - canvas-dnd
      - properties-panel

---

# Plan Implementacji Web Buildera (Elementor-like)

## 1. Architektura i Infrastruktura

### 1.1 State Management (Zustand Store)

Utworzenie centralnego store dla page buildera w `apps/admin/src/stores/page-builder-store.ts`:

- Stan bloków (blocks tree)
- Wybrany blok (selectedBlockId)
- Historia zmian (undo/redo stack)
- Tryb responsywny (desktop/tablet/mobile)
- Tryb edycji (edit/preview)
- Clipboard (kopiowanie bloków)
- Block templates

### 1.2 Block System Architecture

- **Block Registry** (`apps/admin/src/lib/page-builder/block-registry.ts`) - centralny rejestr wszystkich bloków z regułami kompozycji (allowedChildren, allowedParents)
- **Block Types** (`apps/admin/src/lib/page-builder/types.ts`) - TypeScript typy dla bloków
- **Block Schema** (`packages/schemas/src/page-builder/`) - Zod schematy dla walidacji bloków
- **Content Structure**: Normalized tree z rootem (zobacz sekcję "Kluczowe Poprawki"):
  ```typescript
  {
    version: string;
    rootId: string;
    nodes: Record<string, BlockNode>;
  }
  ```


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

- `BaseBlock.tsx` - bazowy komponent bloku z wspólną funkcjonalnością
- `BlockWrapper.tsx` - wrapper z drag handle, controls, hover states
- `BlockControls.tsx` - przyciski edycji (duplicate, delete, move)

### 2.2 Layout Blocks

- **SectionBlock** (`blocks/layout/SectionBlock.tsx`)
  - Container dla sekcji z tłem, paddingiem, marginesem
  - Obsługa kolumn (1-6 kolumn)
  - Style: background, gradient, overlay

- **ContainerBlock** (`blocks/layout/ContainerBlock.tsx`)
  - Ograniczenie szerokości contentu
  - Max width, alignment

- **ColumnBlock** (`blocks/layout/ColumnBlock.tsx`)
  - Kolumny w sekcjach
  - Responsive column widths

### 2.3 Typography Blocks

- **HeadingBlock** (`blocks/typography/HeadingBlock.tsx`)
  - H1-H6
  - Style: font size, weight, color, alignment

- **TextBlock** (`blocks/typography/TextBlock.tsx`)
  - Rich text editor (użycie istniejącego RichTextEditor)
  - Formatting options

### 2.4 Media Blocks

- **ImageBlock** (`blocks/media/ImageBlock.tsx`)
  - Integracja z MediaManager
  - Alt text, caption, link
  - Image sizing, object-fit

- **VideoBlock** (`blocks/media/VideoBlock.tsx`)
  - YouTube, Vimeo, self-hosted
  - Embed options

- **GalleryBlock** (`blocks/media/GalleryBlock.tsx`)
  - Grid gallery z MediaManager

### 2.5 Component Blocks

- **ButtonBlock** (`blocks/components/ButtonBlock.tsx`)
  - Text, link, style variants
  - Icon support

- **FormBlock** (`blocks/components/FormBlock.tsx`)
  - Form fields builder
  - Submit handler

- **IconBlock** (`blocks/components/IconBlock.tsx`)
  - Icon picker z react-icons

### 2.6 Advanced Blocks

- **CarouselBlock** (`blocks/advanced/CarouselBlock.tsx`)
  - Slider/carousel z blokami

- **TabsBlock** (`blocks/advanced/TabsBlock.tsx`)
  - Tab navigation

- **AccordionBlock** (`blocks/advanced/AccordionBlock.tsx`)
  - Collapsible sections

## 3. Canvas i Drag & Drop

### 3.1 Canvas Implementation

Przebudowa `apps/admin/src/components/page-builder/canvas/PageBuilderCanvas.tsx`:

- Integracja z `@dnd-kit`
- Renderowanie drzewa bloków
- Drop zones dla bloków
- Visual indicators podczas drag
- Selection handling
- Keyboard shortcuts (Delete, Copy, Paste, Undo, Redo)

### 3.2 Drag & Drop Features

- Drag z BlockBrowser do Canvas
- Reorderowanie bloków
- Nested drag & drop (bloki w blokach)
- Drop zones z wizualną wskazówką
- Drag preview customization

## 4. Block Browser

### 4.1 Enhanced Block Browser

Rozbudowa `apps/admin/src/components/page-builder/sidebar-left/BlockBrowser.tsx`:

- Kategorie bloków z ikonami
- Search/filter bloków
- Drag handles na blokach
- Block previews
- Favorites/recent blocks
- Block templates section

### 4.2 Block Categories

- Layout (Section, Container, Column)
- Typography (Heading, Text)
- Media (Image, Video, Gallery)
- Components (Button, Form, Icon)
- Advanced (Carousel, Tabs, Accordion)

## 5. Properties Panel

### 5.1 Dynamic Properties Editor

Przebudowa `apps/admin/src/components/page-builder/sidebar-right/PropertiesPanel.tsx`:

- Dynamiczne formularze bazujące na schemacie bloku
- Tabs: Content, Style, Advanced
- Real-time preview zmian

### 5.2 Style Editor

- **Typography**: Font family, size, weight, line height, letter spacing
- **Colors**: Text color, background color, gradient picker
- **Spacing**: Padding, margin (top, right, bottom, left)
- **Borders**: Width, style, color, radius
- **Shadows**: Box shadow editor
- **Layout**: Width, height, display, flex properties
- **Responsive**: Style overrides per breakpoint

### 5.3 Advanced Properties

- CSS classes
- Custom attributes
- Animation settings
- Visibility controls (per device)

## 6. Responsive Design

### 6.1 Responsive Preview

Dodanie do topbar (`apps/admin/src/components/page-builder/topbar/PageBuilderTopbar.tsx`):

- Device switcher (Desktop, Tablet, Mobile)
- Viewport resize
- Style overrides per breakpoint

### 6.2 Breakpoint System

- Desktop: default (1024px+)
- Tablet: 768px - 1023px
- Mobile: < 768px

## 7. Advanced Features

### 7.1 Undo/Redo System

- Historia zmian w Zustand store
- Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
- Visual indicators

### 7.2 Copy/Paste

- Copy block (Ctrl+C)
- Paste block (Ctrl+V)
- Multi-select support (future)

### 7.3 Block Templates

- Save block as template
- Template library
- Import/export templates

### 7.4 History/Versioning

- Integracja z istniejącym systemem wersjonowania
- Snapshot przed większymi zmianami

## 8. Backend Integration

### 8.1 Content Schema

Rozszerzenie `packages/schemas/src/page-builder/`:

- `PageContentSchema` - główny schema dla contentu strony
- `BlockSchema` - bazowy schema bloku
- `SectionSchema` - schema sekcji
- Per-block schemas

### 8.2 API Updates

Rozszerzenie `apps/api/src/modules/site-panel/site-pages.service.ts`:

- Walidacja contentu przed zapisem
- Content transformation (migration między wersjami)
- Content sanitization

### 8.3 Content Validation

- Walidacja struktury bloków
- Walidacja wymaganych pól
- Walidacja linków i referencji

## 9. UI/UX Enhancements

### 9.1 Visual Feedback

- Hover states na blokach
- Selection indicators
- Drop zone highlights
- Loading states
- Error states

### 9.2 Keyboard Shortcuts

- Delete: usuń wybrany blok
- Ctrl+C: kopiuj
- Ctrl+V: wklej
- Ctrl+Z: undo
- Ctrl+Y: redo
- Esc: deselect
- Arrow keys: navigate blocks

### 9.3 Context Menu

- Right-click menu na blokach
- Quick actions (duplicate, delete, copy)

## 10. Performance Optimizations

### 10.1 Rendering Optimizations

- Virtual scrolling dla długich stron
- Lazy loading bloków
- Memoization komponentów
- Code splitting per block type

### 10.2 State Optimizations

- Selective re-renders
- Debounced auto-save
- Optimistic updates

## 11. Testing

### 11.1 Unit Tests

- Block components
- Store logic
- Utility functions

### 11.2 Integration Tests

- Drag & drop flows
- Save/load content
- Undo/redo

## 12. Documentation

### 12.1 Developer Documentation

- Block development guide
- Architecture overview
- API documentation

### 12.2 User Documentation

- How to use page builder
- Block reference guide

## Implementacja - Kolejność

1. **Faza 1: Fundamenty** (Week 1)

   - Zustand store
   - Block registry i typy
   - Base block components
   - Podstawowy drag & drop

2. **Faza 2: Podstawowe Bloki** (Week 2)

   - Section, Container, Column
   - Heading, Text
   - Image, Button

3. **Faza 3: Canvas i Properties** (Week 3)

   - Pełny canvas z drag & drop
   - Properties panel z dynamicznymi formularzami
   - Style editor

4. **Faza 4: Zaawansowane Funkcje** (Week 4)

   - Responsive design
   - Undo/redo
   - Copy/paste
   - Więcej bloków (Video, Gallery, Form)

5. **Faza 5: Polish i Optymalizacja** (Week 5)

   - Performance optimizations
   - UI/UX improvements
   - Testing
   - Documentation

---

## ⚠️ KLUCZOWE POPRAWKI ARCHITEKTURY (na podstawie feedbacku)

### 1. Model Danych: Normalized Tree z Rootem

**ZMIANA:** Zamiast `{ version, sections: Section[] }` użyj normalized tree:

```typescript
type PageContent = {
  version: string
  rootId: string
  nodes: Record<string, BlockNode>
}

type BlockNode = {
  id: string
  type: string
  parentId: string | null
  childIds: string[]          // kolejność dzieci
  props: {
    content: Record<string, any>
    style: {
      base: Record<string, any>
      responsive?: {
        tablet?: Record<string, any>
        mobile?: Record<string, any>
      }
    }
    advanced?: Record<string, any>
  }
  meta?: { 
    locked?: boolean
    hidden?: boolean
    label?: string
  }
}
```

**Dlaczego:**

- Reorder = operacje na `childIds` (tanio i przewidywalnie)
- Copy/paste = klon subtree
- Undo/redo = snapshot albo patch (łatwiej)
- Walidacja = per-node + reguły relacji

### 2. Reguły Kompozycji Bloków w Block Registry

**DODAJ do BlockDefinition:**

```typescript
type BlockDefinition = {
  type: string
  title: string
  icon: ReactNode
  defaultProps: Record<string, any>
  slots?: SlotDef[] // np. "children", "tabs", "items"
  canHaveChildren?: boolean
  allowedChildren?: string[] | ((childType: string) => boolean)
  allowedParents?: string[] | ((parentType: string) => boolean)
  isCanvasOnly?: boolean
}
```

**Reguły na start:**

- Section → Column (tylko)
- Column → (Heading/Text/Image/Button/Form/Advanced)
- Tabs → TabItem → (bloki)
- Accordion → AccordionItem → (bloki)
- Carousel → Slide → (bloki)

### 3. Undo/Redo: Tylko na Commitach

**ZMIANA:** Nie snapshotuj przy każdym `onDragOver`, tylko:

- **Na commitach**: drop zakończony, blur inputa, "Apply", koniec transakcji
- **Do edycji tekstu**: debounced patch (300–500ms)
- **Model**: `history: { past: Patch[], future: Patch[] }` albo snapshoty tylko na commit
- **Maks 50 kroków** (reszta out)

### 4. Drag & Drop: Jeden DndContext z Drop Zones jako Sloty

**ZMIANA:**

- Jeden `DndContext` na Canvas (nie każdy blok osobny)
- Każdy blok z dziećmi renderuje **DropZone dla slotu**: `dropzone:${blockId}:children`
- Rozróżnij drag types:
  - `dragType: "existing-node"` z `nodeId`
  - `dragType: "new-block"` z `blockType` (z rejestru)
- Collision strategy: `closestCenter` / `rectIntersection` na start

### 5. Struktura Props: content/style/advanced

**ZMIANA:** Zamiast płaskiej struktury props, użyj:

```typescript
props: {
  content: {...}  // zawartość bloku
  style: {
    base: {...}   // style desktop (baza)
    responsive?: {
      tablet?: {...}  // override dla tablet
      mobile?: {...}   // override dla mobile
    }
  }
  advanced: {...} // CSS classes, custom attributes, etc.
}
```

### 6. Responsive: Dziedziczenie Stylów

**ZMIANA:** Desktop = baza, Tablet/Mobile = override tylko wybrane pola

W renderze:

1. `styleBase` (desktop)
2. Merge override dla aktualnego breakpointu

### 7. Performance: Selektory Zustand + Memo

**DODAJ:**

- Komponent bloku subskrybuje tylko własny node (po `id`), nie całe drzewo
- `BlockWrapper` nie może dostawać nowych funkcji/obiektów co render (stable props)
- Memoization komponentów bloków
- Virtualizacja: nie rób jej w tygodniu 1, wprowadź po stabilnym modelu drzewa

### 8. Zmiany w Fazach Implementacji

**Faza 1 (Fundamenty):**

- ✅ zostaje, ale dodaj:
  - **normalized tree** + reguły `allowedChildren`
  - drop zones jako sloty
  - commit-based history

**Faza 2 (Podstawowe bloki):**

- ✅ świetnie, tylko:
  - zrób **Section + Column** jako jedyny "layout container" na start
  - **ContainerBlock odłóż na później** (często robi więcej zamieszania niż wartości w MVP)

**Faza 3 (Canvas + Properties):**

- ✅ tak, ale:
  - PropertiesPanel niech najpierw ogarnie **Content + podstawowy Style (spacing, kolor, align)**
  - border/shadow/gradienty zostaw na polish — to są "feature-y jak lukier"

**Faza 4 (Zaawansowane):**

- Tu dopiero:
  - Tabs/Accordion/Carousel (bo to wprowadza sloty i edge-case'y)
  - Form builder (to prawie osobny produkt)

**Faza 5 (Polish):**

- ✅ tak — i tu dopiero wchodzi:
  - Context menu
  - Keyboard navigation strzałkami
  - Code splitting per block
  - ContainerBlock (jeśli potrzebny)

### 9. MVP Definition of Done

**Minimalny "Definition of Done" dla MVP buildera:**

- ✅ Dodawanie bloków z BlockBrowser na Canvas
- ✅ Przestawianie bloków w kolumnie
- ✅ Sekcja → kolumny (min 1, max np. 4 na MVP)
- ✅ Properties: heading/text/image/button (content + spacing + kolor + align)
- ✅ Undo/redo na commitach
- ✅ Save/load content przez backend + walidacja Zod
- ✅ Preview mode (bez kontrolek)

**Reszta to roadmapa, nie MVP.**

---

## Podsumowanie Poprawek

1. **Normalized tree** zamiast sections[] - fundament stabilności
2. **Reguły dropu w rejestrze** zanim napiszesz 10 bloków
3. **Undo/redo tylko na commitach** – inaczej performance i UX polecą
4. **ContainerBlock odłóż**, a w zamian dopracuj Section/Column
5. **Style editor** - najpierw podstawowe, potem zaawansowane
6. **Performance od razu** - selektory Zustand, memo, stable props

Builder to nie jest miejsce na heroiczne "własne rozwiązania". Ma być stabilnie, przewidywalnie, szybko.