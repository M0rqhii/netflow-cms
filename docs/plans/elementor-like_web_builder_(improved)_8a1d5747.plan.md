---
name: Elementor-like Web Builder (Improved)
overview: ""
todos: []
---

# Plan Implementacji Web Buildera (Elementor-like) - Poprawiony

## Kluczowe Zmiany Architektoniczne

### 1. Normalized Tree Model (zamiast sections[])

**Struktura danych:**

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

### 2. Block Registry z Regułami Kompozycji

**BlockDefinition:**

```typescript
type BlockDefinition = {
  type: string;
  title: string;
  icon: ReactNode;
  defaultProps: BlockNode['props'];
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

### 3. Undo/Redo - Commit-Based (nie przy każdym ruchu)

**Model:**

```typescript
history: {
  past: PageContent[];  // snapshoty tylko na commitach
  future: PageContent[];
  maxSteps: 50;
}
```

**Commity:**

- Drop zakończony
- Blur inputa (debounced 300-500ms)
- "Apply" w properties panel
- Koniec transakcji

### 4. Drag & Drop - Jeden DndContext z Drop Zones

- Jeden `DndContext` na Canvas
- Każdy blok z dziećmi renderuje **DropZone dla slotu**: `dropzone:${blockId}:children`
- Rozróżnienie: `dragType: "existing-node"` vs `dragType: "new-block"`
- Collision strategy: `closestCenter` / `rectIntersection`

### 5. Struktura Props: content/style/advanced

Modularna struktura zamiast płaskiej:

- `content` - dane treści bloku
- `style.base` - style desktop (baza)
- `style.responsive` - override dla tablet/mobile
- `advanced` - CSS classes, custom attributes, animations

### 6. Responsive - Dziedziczenie Stylów

- Desktop = baza (`style.base`)
- Tablet/Mobile = override tylko wybrane pola (`style.responsive.tablet/mobile`)
- W renderze: merge base + override dla aktualnego breakpointu

### 7. Performance - Selektory Zustand

- Komponent bloku subskrybuje tylko własny node (po `id`), nie całe drzewo
- Memo + stable props: BlockWrapper nie dostaje nowych funkcji/obiektów co render
- Virtualizacja: później, po stabilnym modelu drzewa

---

## 1. Architektura i Infrastruktura

### 1.1 State Management (Zustand Store)

Utworzenie w `apps/admin/src/stores/page-builder-store.ts`:

**Store structure:**

```typescript
{
  // Normalized tree
  content: PageContent;
  
  // Selection
  selectedBlockId: string | null;
  
  // History (commit-based)
  history: {
    past: PageContent[];
    future: PageContent[];
    maxSteps: 50;
  };
  
  // UI state
  viewport: 'desktop' | 'tablet' | 'mobile';
  mode: 'edit' | 'preview';
  
  // Clipboard
  clipboard: BlockNode | null;
  
  // Actions
  addBlock, moveBlock, updateBlock, deleteBlock,
  commit, undo, redo, copy, paste, select
}
```

**Selektory:**

- `useBlock(id)` - subskrybuje tylko jeden node
- `useBlockChildren(id)` - subskrybuje tylko childIds
- `useSelectedBlock()` - wybrany blok

### 1.2 Block System Architecture

- **Block Registry** (`apps/admin/src/lib/page-builder/block-registry.ts`)
  - Rejestr z `BlockDefinition` (w tym reguły kompozycji)
  - `registerBlock(definition)`
  - `getBlock(type)`
  - `canAddChild(parentType, childType)`
  - `getAllowedChildren(parentType)`

- **Block Types** (`apps/admin/src/lib/page-builder/types.ts`)
  - `PageContent`, `BlockNode`, `BlockDefinition`
  - Type guards i utilities

- **Block Schema** (`packages/schemas/src/page-builder/`)
  - `PageContentSchema` - Zod schema dla normalized tree
  - `BlockNodeSchema` - bazowy schema
  - `StyleSchema` - wspólny schema dla stylów
  - Per-block content schemas

### 1.3 Dependencies

Dodanie do `apps/admin/package.json`:

- `@dnd-kit/core` - core drag & drop
- `@dnd-kit/sortable` - sortable functionality
- `@dnd-kit/utilities` - utilities
- `react-color` - color picker
- `react-icons` - ikony dla bloków

---

## 2. System Bloków

### 2.1 Block Base Classes

Utworzenie w `apps/admin/src/components/page-builder/blocks/`:

- **BaseBlock.tsx** - bazowy komponent z:
  - Renderowanie props (content/style/advanced)
  - Merge responsive styles
  - Memoization z stable props

- **BlockWrapper.tsx** - wrapper z:
  - Drag handle (dnd-kit)
  - Selection indicator
  - Hover states
  - Drop zones dla slotów
  - Block controls overlay

- **BlockControls.tsx** - przyciski:
  - Duplicate, delete, move
  - Lock/unlock
  - Show/hide

- **DropZone.tsx** - komponent drop zone:
  - Visual indicator podczas drag
  - Collision detection
  - Insertion line

### 2.2 Layout Blocks (MVP: Section + Column, ContainerBlock później)

- **SectionBlock** (`blocks/layout/SectionBlock.tsx`)
  - Container z tłem, paddingiem, marginesem
  - Slot: `children` (ColumnBlock[])
  - Style: background, gradient, overlay, spacing
  - Reguła: `allowedChildren: ['column']`

- **ColumnBlock** (`blocks/layout/ColumnBlock.tsx`)
  - Kolumny w sekcjach
  - Slot: `children` (content blocks)
  - Responsive column widths (grid system)
  - Reguła: `allowedChildren: ['heading', 'text', 'image', 'button', ...]`

- **ContainerBlock** - ODŁÓŻ na później (dodaje zamieszania w MVP)

### 2.3 Typography Blocks

- **HeadingBlock** (`blocks/typography/HeadingBlock.tsx`)
  - H1-H6
  - Props: `content.text`, `content.level`
  - Style: font size, weight, color, alignment

- **TextBlock** (`blocks/typography/TextBlock.tsx`)
  - Rich text editor (użycie istniejącego RichTextEditor)
  - Props: `content.html`
  - Style: typography, spacing

### 2.4 Media Blocks

- **ImageBlock** (`blocks/media/ImageBlock.tsx`)
  - Integracja z MediaManager
  - Props: `content.src`, `content.alt`, `content.caption`, `content.link`
  - Style: sizing, object-fit, border-radius

- **VideoBlock** - później (Faza 4)
- **GalleryBlock** - później (Faza 4)

### 2.5 Component Blocks

- **ButtonBlock** (`blocks/components/ButtonBlock.tsx`)
  - Props: `content.text`, `content.link`, `content.icon`
  - Style: variants, colors, spacing, border-radius

- **FormBlock** - później (Faza 4, to prawie osobny produkt)
- **IconBlock** - później

### 2.6 Advanced Blocks (Faza 4)

- **CarouselBlock** - wprowadza sloty i edge-case'y
- **TabsBlock** - sloty per tab
- **AccordionBlock** - sloty per item

---

## 3. Canvas i Drag & Drop

### 3.1 Canvas Implementation

Przebudowa `apps/admin/src/components/page-builder/canvas/PageBuilderCanvas.tsx`:

- **Jeden DndContext** na cały canvas
- Renderowanie drzewa z rootId
- Drop zones jako sloty: `dropzone:${blockId}:${slotName}`
- Visual indicators:
  - Overlay podczas drag
  - Insertion line w drop zone
  - Highlight aktywnego drop zone
- Selection handling
- Keyboard shortcuts (Delete, Copy, Paste, Undo, Redo, Esc)

### 3.2 Drag & Drop Features

- **Drag z BlockBrowser:**
  - `dragType: "new-block"` z `blockType`
  - Handler tworzy nowy BlockNode

- **Drag istniejącego bloku:**
  - `dragType: "existing-node"` z `nodeId`
  - Handler move node

- **Collision strategy:**
  - `closestCenter` / `rectIntersection`
  - Drop indicator jako "linia wstawiania"

- **Nested drag & drop:**
  - Drop zones w każdym bloku z dziećmi
  - Rekursywne renderowanie

---

## 4. Block Browser

### 4.1 Enhanced Block Browser

Rozbudowa `apps/admin/src/components/page-builder/sidebar-left/BlockBrowser.tsx`:

- Kategorie bloków z ikonami (react-icons)
- Search/filter bloków
- Drag handles na blokach (`dragType: "new-block"`)
- Block previews (opcjonalnie)
- Block templates section (później)

### 4.2 Block Categories (MVP)

- Layout: Section, Column
- Typography: Heading, Text
- Media: Image
- Components: Button

---

## 5. Properties Panel

### 5.1 Dynamic Properties Editor

Przebudowa `apps/admin/src/components/page-builder/sidebar-right/PropertiesPanel.tsx`:

- Dynamiczne formularze bazujące na BlockDefinition
- Tabs: Content, Style, Advanced
- Real-time preview zmian (debounced commit)

### 5.2 Style Editor (MVP: Podstawowe, Zaawansowane później)

**MVP (Faza 3):**

- **Spacing**: Padding, margin (top, right, bottom, left)
- **Colors**: Text color, background color
- **Typography**: Font size, weight, alignment
- **Layout**: Width, alignment

**Później (Faza 5 - Polish):**

- Borders, shadows, gradients
- Advanced typography (line height, letter spacing)
- Flex properties

### 5.3 Advanced Properties (Później)

- CSS classes
- Custom attributes
- Animation settings
- Visibility controls (per device)

---

## 6. Responsive Design

### 6.1 Responsive Preview

Dodanie do topbar (`apps/admin/src/components/page-builder/topbar/PageBuilderTopbar.tsx`):

- Device switcher (Desktop, Tablet, Mobile)
- Viewport resize
- Style merge: base + responsive override

### 6.2 Breakpoint System

- Desktop: default (1024px+) - `style.base`
- Tablet: 768px - 1023px - `style.responsive.tablet`
- Mobile: < 768px - `style.responsive.mobile`

### 6.3 Style Inheritance

- Desktop = baza
- Tablet/Mobile = override tylko wybrane pola
- W renderze: `mergeStyles(base, responsive[currentBreakpoint])`

---

## 7. Advanced Features

### 7.1 Undo/Redo System (Commit-Based)

- Historia: snapshoty tylko na commitach
- Commity:
  - Drop zakończony (`onDragEnd`)