---
name: Elementor-like Web Builder (Ultimate)
overview: Kompletny plan implementacji web buildera w stylu Elementor z drag & drop, systemem bloków, edytorem stylów, responsywnością i zaawansowanymi funkcjami edycji. Uwzględnia wszystkie kluczowe poprawki architektoniczne i feedback od ekspertów.
todos:
  - id: setup-dependencies
    content: "Dodanie zależności: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities, react-color, react-icons, dompurify do apps/admin/package.json"
    status: pending
  - id: create-store
    content: "Utworzenie Zustand store (apps/admin/src/stores/page-builder-store.ts): normalized tree (rootId, nodes), draft vs committed state, isDirty flag, commit(reason), selektory per node dla performance"
    status: pending
    dependencies:
      - setup-dependencies
  - id: block-types-schema
    content: "Utworzenie TypeScript typów i Zod schematów: PageContent z rootId i nodes, BlockNode z parentId/childIds, props: {content, style: {base, responsive z _inherited flag}, advanced}, RootBlock i ItemNodes (TabItem, AccordionItem, Slide)"
    status: pending
    dependencies:
      - setup-dependencies
  - id: tree-ops-utils
    content: "Implementacja transaction-safe tree operations (apps/admin/src/lib/page-builder/tree-ops.ts): insertNode, moveNode, removeNode, cloneSubtree, validateTree - zapewniają spójność parentId/childIds"
    status: pending
    dependencies:
      - block-types-schema
  - id: style-merge-utils
    content: "Implementacja style utilities (apps/admin/src/lib/page-builder/style-utils.ts): mergeStyles(base, responsive[breakpoint]), clearOverride, isInherited check dla responsive stylów"
    status: pending
    dependencies:
      - block-types-schema
  - id: block-registry
    content: "Implementacja Block Registry (apps/admin/src/lib/page-builder/block-registry.ts): rejestracja bloków z regułami kompozycji (allowedChildren, allowedParents, slots), RootBlock z allowedChildren: ['section'], UnknownBlock fallback"
    status: pending
    dependencies:
      - block-types-schema
      - tree-ops-utils
  - id: migrations-pipeline
    content: "Implementacja content migrations (apps/admin/src/lib/page-builder/migrations.ts): wersjonowanie contentu, migrations: Record<version, (content)=>content>, migration runner przy load"
    status: pending
    dependencies:
      - block-types-schema
  - id: base-block-components
    content: "Utworzenie bazowych komponentów: BaseBlock.tsx, BlockWrapper.tsx (memoized, stable props), BlockControls.tsx, DropZone.tsx, UnknownBlock.tsx (fallback dla deprecated bloków)"
    status: pending
    dependencies:
      - block-registry
      - create-store
      - style-merge-utils
  - id: layout-blocks
    content: "Implementacja bloków layout: RootBlock (niewidoczny, allowedChildren: section), SectionBlock, ColumnBlock z obsługą kolumn (1-4 na MVP). ContainerBlock odłożony na później."
    status: pending
    dependencies:
      - base-block-components
  - id: typography-blocks
    content: "Implementacja bloków typografii: HeadingBlock, TextBlock z rich text editor i sanitizacją HTML (DOMPurify)"
    status: pending
    dependencies:
      - base-block-components
  - id: media-blocks
    content: "Implementacja bloków mediów: ImageBlock (z MediaManager, modal flow, loading states). VideoBlock, GalleryBlock - Faza 4"
    status: pending
    dependencies:
      - base-block-components
  - id: component-blocks
    content: "Implementacja bloków komponentów: ButtonBlock z walidacją linków (http/https/mailto/tel). FormBlock, IconBlock - Faza 4"
    status: pending
    dependencies:
      - base-block-components
  - id: canvas-dnd
    content: "Przebudowa PageBuilderCanvas z @dnd-kit: jeden DndContext, drop zones jako sloty (dropzone:blockId:slotName), collision strategy (closestCenter + threshold lub pointerWithin dla nested), insertion line z dokładnym indeksem"
    status: pending
    dependencies:
      - create-store
      - base-block-components
      - tree-ops-utils
  - id: block-browser-enhance
    content: "Rozbudowa BlockBrowser: kategorie z ikonami, search, drag handles (dragType: new-block), virtual scrolling dla długich list, onNewBlockDropped flow (select, open panel, focus first input)"
    status: pending
    dependencies:
      - block-registry
  - id: properties-panel
    content: "Przebudowa PropertiesPanel: dynamiczne formularze, tabs (Content/Style/Advanced), draft state dla instant preview, debounced commit (300-500ms), lazy loading properties per tab"
    status: pending
    dependencies:
      - create-store
      - base-block-components
  - id: style-editor
    content: "Implementacja Style Editor: MVP (spacing, kolor, align, typography), responsive z dziedziczeniem (desktop=baza, tablet/mobile=override), Clear override button, _inherited flag w UI"
    status: pending
    dependencies:
      - properties-panel
      - style-merge-utils
  - id: responsive-system
    content: "Implementacja systemu responsywnego: device switcher w topbar, viewport resize, style merge (base + responsive override), obsługa edge cases (zmiana desktop po override mobile)"
    status: pending
    dependencies:
      - create-store
      - style-editor
  - id: undo-redo
    content: "Implementacja undo/redo COMMIT-BASED: commit(reason: 'dnd'|'blur'|'apply'|'delete'|'paste'|'shortcut'), scheduleCommit(ms=400) dla tekstu, max 50 kroków, Ctrl+Z/Y"
    status: pending
    dependencies:
      - create-store
  - id: copy-paste
    content: "Implementacja copy/paste: copyBlock (klon subtree via tree-ops), pasteBlock z walidacją allowedChildren, Ctrl+C/V, error message jeśli nie pasuje"
    status: pending
    dependencies:
      - create-store
      - tree-ops-utils
  - id: autosave-system
    content: "Implementacja autosave: save co X sekund jeśli dirty, beforeunload warning, offline queue, conflict detection (last-write-wins), visual indicator (saving/saved/error)"
    status: pending
    dependencies:
      - create-store
  - id: advanced-blocks
    content: "Implementacja zaawansowanych bloków (Faza 4): TabsBlock, AccordionBlock, CarouselBlock z item nodes (TabItem, AccordionItem, Slide), activeItemId w props.content dla preview default"
    status: pending
    dependencies:
      - base-block-components
  - id: backend-validation
    content: "Rozszerzenie backend: migrations pipeline (parse → migrate to latest → sanitize → validate Zod → validate composition), HTML sanitization (allowlist tagów), link validation (http/https/mailto/tel)"
    status: pending
    dependencies:
      - block-types-schema
      - migrations-pipeline
  - id: keyboard-shortcuts
    content: "Implementacja keyboard shortcuts: Delete, Ctrl+C/V/Z/Y, Esc, Tab/Shift+Tab (navigate blocks), Enter (edit mode), Alt+Up/Down (move block w rodzeństwie), Ctrl+K (command palette - Faza 5)"
    status: pending
    dependencies:
      - canvas-dnd
  - id: performance-optimization
    content: "Optymalizacje wydajności: selektory Zustand per node, memoization z stable props, lazy loading properties, virtual scrolling (BlockBrowser, długie strony), throttle scroll events w canvas"
    status: pending
    dependencies:
      - canvas-dnd
      - properties-panel
  - id: ui-polish
    content: "UI/UX improvements (Faza 5): hover states, selection indicators, context menu (right-click), loading/error states, command palette (Ctrl+K), code splitting per block"
    status: pending
    dependencies:
      - canvas-dnd
      - properties-panel
---

# Plan Implementacji Web Buildera (Elementor-like) - Ultimate Version

## ⚠️ Kluczowe Zmiany Architektoniczne (Must-Have)

### 1. Normalized Tree Model z Root Node

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
        tablet?: Record<string, any>;  // partial override - brak klucza = dziedziczenie
        mobile?: Record<string, any>;  // partial override - brak klucza = dziedziczenie
      };
    };
    advanced?: Record<string, any>;
  };
  meta?: {
    locked?: boolean;   // locked → brak DnD i delete
    hidden?: boolean;
    label?: string;
  };
}

// ⚠️ WAŻNE: Dziedziczenie responsive styles
// - Jeśli klucz ISTNIEJE w responsive[breakpoint] → jest override
// - Jeśli klucz NIE ISTNIEJE → dziedziczony z base (desktop)
// - "Clear override" = usuń klucz z responsive[breakpoint]
// - NIE używamy _inherited flag - to logika UI, nie format danych
```

**Root Node:** Specjalny node typu `root` (niewidoczny), który ma children = sekcje:

```typescript
// Root node example:
{
  id: "root",
  type: "root",
  parentId: null,
  childIds: ["section1", "section2"],
  props: { content: {}, style: { base: {} }, advanced: {} }
}

// W registry:
root.allowedChildren = ['section']
```

**Korzyści:**
- Reorder = operacje na `childIds` (tanio i przewidywalnie)
- Copy/paste = klon subtree
- Undo/redo = snapshot albo patch (łatwiej)
- Walidacja = per-node + reguły relacji
- Jeden algorytm renderowania dla wszystkiego

### 2. Reguły Kompozycji Bloków + Item Nodes

**Problem:** Bez reguł każdy może wrzucić sekcję do przycisku. Sloty (tabs, accordion) wymagają specjalnej obsługi.

**Rozwiązanie:** Block Registry z kontraktem kompozycji + Item Nodes:

```typescript
type BlockDefinition = {
  type: string;
  title: string;
  icon: ReactNode;
  defaultProps: BlockNode['props'];
  slots?: SlotDef[];
  canHaveChildren?: boolean;
  allowedChildren?: string[] | ((childType: string) => boolean);
  allowedParents?: string[] | ((parentType: string) => boolean);
  isCanvasOnly?: boolean;
  isItemNode?: boolean;  // dla TabItem, AccordionItem, Slide
}
```

**Hierarchia bloków:**

```
root → section
section → column
column → (heading, text, image, button, tabs, accordion, carousel, ...)
tabs → tabItem → (heading, text, image, button, ...)
accordion → accordionItem → (heading, text, image, button, ...)
carousel → slide → (heading, text, image, button, ...)
```

**Item Nodes:** TabsBlock nie trzyma bloków bezpośrednio — trzyma TabItem nodes:

```typescript
// TabsBlock
{ id: "tabs1", type: "tabs", childIds: ["tab1", "tab2"], props: { content: { activeTabId: "tab1" } } }

// TabItem (item node)
{ id: "tab1", type: "tabItem", parentId: "tabs1", childIds: ["heading1", "text1"], props: { content: { title: "Tab 1" } } }
```

### 3. Undo/Redo: Commit-Based z Reason

**Problem:** Snapshotowanie całej struktury przy każdym `onDragOver` ubija performance.

**Rozwiązanie:**

```typescript
// Store
{
  isDirty: boolean;
  history: {
    past: PageContent[];  // max 50
    future: PageContent[];
  };
}

// Actions
commit(reason: 'dnd' | 'blur' | 'apply' | 'delete' | 'paste' | 'shortcut')
scheduleCommit(ms = 400)  // dla tekstu - debounced
undo()
redo()
```

**Commit triggers:**
- Drop zakończony (`onDragEnd`) → `commit('dnd')`
- Blur inputa (po 300-500ms debounce) → `commit('blur')`
- "Apply" w properties panel → `commit('apply')`
- Delete block → `commit('delete')`
- Paste block → `commit('paste')`
- Keyboard shortcut (Alt+Up/Down) → `commit('shortcut')`

### 4. Draft vs Committed State

**Problem:** Properties panel edytuje na żywo, ale undo jest commit-based. Trzeba rozdzielić.

**Rozwiązanie:**

```typescript
// W komponencie bloku / properties panel:
const [draftProps, setDraftProps] = useState(props);

// Instant preview (draft changes)
onChange={(value) => setDraftProps({...draftProps, text: value})}

// Commit debounced
useDebounce(() => {
  updateBlockProps(blockId, draftProps);
  scheduleCommit(400);
}, 300);
```

### 5. Drag & Drop: Jeden DndContext z Precyzyjnym Indeksem

**Problem:** Każdy blok robi swój DndContext = spaghetti. "Przeskakiwanie" bloków przy drop.

**Rozwiązanie:**

- Jeden `DndContext` na Canvas
- Drop zones jako sloty: `dropzone:${blockId}:${slotName}`
- Collision strategy: **hybrydowa** - `closestCenter` + threshold lub `pointerWithin` dla nested
- **Insertion line** pokazuje dokładne miejsce wstawienia
- Drop zwraca: `(sourceId, targetParentId, index)` - index względem `childIds` parenta

```typescript
// Drag types
type DragData = 
  | { dragType: "new-block"; blockType: string }
  | { dragType: "existing-node"; nodeId: string }
```

### 6. Tree Operations (Transaction-Safe)

**Problem:** Bug typu "node ma parentId A, ale A nie ma go w childIds".

**Rozwiązanie:** Moduł utilities `apps/admin/src/lib/page-builder/tree-ops.ts`:

```typescript
// Wszystkie operacje atomowe - gwarantują spójność
insertNode(content, parentId, index, node): PageContent
moveNode(content, nodeId, newParentId, newIndex): PageContent
removeNode(content, nodeId, { removeSubtree: true }): PageContent
cloneSubtree(content, nodeId): { newRootId: string; nodes: Record<string, BlockNode> }
validateTree(content): ValidationError[]  // dev-mode check
```

### 7. Style Inheritance - Proste i Czyste

**Problem:** Co jeśli użytkownik ustawi padding na desktop, override na mobile, potem zmieni desktop?

**Rozwiązanie (bez `_inherited` flag - prostsze i czystsze):**

```typescript
style: {
  base: { padding: '20px', margin: '10px' },
  responsive: {
    mobile: { 
      padding: '10px'  // override - klucz istnieje
      // margin NIE ISTNIEJE = dziedziczony z base
    }
  }
}

// Reguła: 
// - Klucz istnieje w responsive[breakpoint] → override
// - Klucz NIE istnieje → dziedziczony z desktop (base)
// - "Clear override" → usuwa klucz z responsive[breakpoint]

// W UI:
// - isOverridden = key in responsive[breakpoint]
// - "Clear override" button przy każdym overridden polu
// - Visual indicator (dot/icon) gdy pole jest overridden
// - Tooltip z wartością dziedziczoną z desktop
```

**ZALETA:** Nie mieszamy danych użytkownika z metadanymi UI. Format contentu jest prosty.

### 8. Migrations Pipeline

**Problem:** Stary content (wersja 1.0), deprecated bloki, format changes.

**Rozwiązanie:**

```typescript
// apps/admin/src/lib/page-builder/migrations.ts
const migrations: Record<string, (content: PageContent) => PageContent> = {
  '1.0': migrateFrom1_0,
  '1.1': migrateFrom1_1,
  // ...
};

function migrateContent(content: PageContent): PageContent {
  let current = content;
  const versions = Object.keys(migrations).sort(semver);
  
  for (const version of versions) {
    if (semver.gt(version, current.version)) {
      current = migrations[version](current);
      current.version = version;
    }
  }
  
  return current;
}

// Backend flow:
// 1. Parse JSON
// 2. Migrate to latest
// 3. Sanitize
// 4. Validate Zod
// 5. Validate composition rules
```

**UnknownBlock Fallback:**

```typescript
// Dla deprecated/nieznanych bloków:
function renderBlock(node: BlockNode) {
  const definition = blockRegistry.get(node.type);
  if (!definition) {
    return <UnknownBlock node={node} />;  // "Unknown Block" z info
  }
  // ...
}
```

### 9. Security: HTML Sanitization

**Problem:** TextBlock z HTML - użytkownicy wklejają wszystko.

**Rozwiązanie:**

```typescript
// apps/admin/src/lib/page-builder/sanitize.ts
import DOMPurify from 'dompurify';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'span'];
const ALLOWED_ATTRS = ['href', 'target', 'rel', 'class'];
const ALLOWED_URI_REGEXP = /^(https?|mailto|tel):/i;

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRS,
    ALLOWED_URI_REGEXP,
  });
}

// Walidacja linków:
export function isValidLink(url: string): boolean {
  return /^(https?|mailto|tel):/.test(url);
}
```

**⚠️ WAŻNE: Sanitization w DWÓCH miejscach:**

1. **Frontend (przed renderem)** - unika XSS nawet przed zapisem:
```typescript
// W TextBlock.tsx
function TextBlock({ node }: Props) {
  const safeHtml = useMemo(
    () => sanitizeHtml(node.props.content.html ?? ''),
    [node.props.content.html]
  );
  
  return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}
```

2. **Backend (przed zapisem)** - ostatnia linia obrony:
```typescript
// W site-pages.service.ts
function sanitizePageContent(content: PageContent): PageContent {
  // ... sanityzuje wszystkie text nodes
}
```

### 10. Performance: Selektory + Memo + Lazy Loading

**Zasady:**

1. **Selektory Zustand**: komponent bloku subskrybuje tylko własny node (po `id`)
2. **BlockWrapper**: memoized, stable props (nie nowe funkcje/obiekty co render)
3. **Properties Panel**: lazy loading properties (render on tab switch)
4. **BlockBrowser**: virtual scrolling (setki bloków w przyszłości)
5. **Canvas**: throttle scroll events
6. **Virtualizacja**: nie w tygodniu 1, wprowadź po stabilnym modelu drzewa

---

## 1. Architektura i Infrastruktura

### 1.1 State Management (Zustand Store)

Utworzenie w `apps/admin/src/stores/page-builder-store.ts`:

**Stan:**

```typescript
{
  // Normalized tree
  content: PageContent;
  
  // Draft state (dla instant preview)
  isDirty: boolean;
  
  // Selection
  selectedBlockId: string | null;
  
  // History (commit-based)
  history: {
    past: PageContent[];  // max 50
    future: PageContent[];
  };
  lastCommitReason: CommitReason | null;  // dla debugowania
  
  // UI state
  currentBreakpoint: 'desktop' | 'tablet' | 'mobile';
  mode: 'edit' | 'preview';
  
  // Clipboard
  clipboard: { nodes: Record<string, BlockNode>; rootId: string } | null;
  
  // Autosave
  lastSaved: Date | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  
  // Templates (Faza 5)
  templates: BlockTemplate[];
}
```

**Actions:**

```typescript
// Block operations (via tree-ops)
addBlock(parentId: string, blockType: string, index?: number): void
moveBlock(nodeId: string, newParentId: string, newIndex: number): void
updateBlockProps(nodeId: string, props: Partial<BlockNode['props']>): void
deleteBlock(nodeId: string): void

// Selection
selectBlock(nodeId: string | null): void

// History
commit(reason: 'dnd' | 'blur' | 'apply' | 'delete' | 'paste' | 'shortcut'): void
scheduleCommit(ms?: number): void  // default 400ms
undo(): void
redo(): void

// Clipboard
copyBlock(nodeId: string): void
pasteBlock(parentId: string, index?: number): void

// UI
setBreakpoint(breakpoint: 'desktop' | 'tablet' | 'mobile'): void
setMode(mode: 'edit' | 'preview'): void

// Autosave
save(): Promise<void>
markDirty(): void
```

**Selektory (dla performance):**

```typescript
// Subskrybuje tylko jeden node
export const useBlockNode = (id: string) => 
  usePageBuilderStore((state) => state.content.nodes[id]);

// Subskrybuje tylko childIds
export const useBlockChildren = (parentId: string) => 
  usePageBuilderStore((state) => state.content.nodes[parentId]?.childIds ?? []);

// Wybrany blok
export const useSelectedBlock = () => 
  usePageBuilderStore((state) => 
    state.selectedBlockId ? state.content.nodes[state.selectedBlockId] : null
  );

// Breakpoint
export const useCurrentBreakpoint = () => 
  usePageBuilderStore((state) => state.currentBreakpoint);
```

### 1.2 Block System Architecture

**Block Registry** (`apps/admin/src/lib/page-builder/block-registry.ts`):

```typescript
class BlockRegistry {
  private blocks: Map<string, BlockDefinition> = new Map();
  
  registerBlock(definition: BlockDefinition): void
  getBlock(type: string): BlockDefinition | undefined
  getAllBlocks(): BlockDefinition[]
  getBlocksByCategory(category: string): BlockDefinition[]
  
  // Composition rules
  canAddChild(parentType: string, childType: string): boolean
  getAllowedChildren(parentType: string): string[]
  getAllowedParents(childType: string): string[]
}

// Default registry z RootBlock i UnknownBlock
const registry = new BlockRegistry();
registry.registerBlock({
  type: 'root',
  title: 'Root',
  icon: null,
  canHaveChildren: true,
  allowedChildren: ['section'],
  isCanvasOnly: true,
  defaultProps: { content: {}, style: { base: {} }, advanced: {} }
});
```

**Tree Operations** (`apps/admin/src/lib/page-builder/tree-ops.ts`):

```typescript
export function insertNode(
  content: PageContent,
  parentId: string,
  index: number,
  node: BlockNode
): PageContent {
  // Validate
  if (!content.nodes[parentId]) throw new Error(`Parent ${parentId} not found`);
  
  // Clone and update
  const newNodes = { ...content.nodes };
  const parent = { ...newNodes[parentId] };
  const newChildIds = [...parent.childIds];
  newChildIds.splice(index, 0, node.id);
  parent.childIds = newChildIds;
  
  newNodes[parentId] = parent;
  newNodes[node.id] = { ...node, parentId };
  
  return { ...content, nodes: newNodes };
}

export function moveNode(
  content: PageContent,
  nodeId: string,
  newParentId: string,
  newIndex: number
): PageContent { /* ... */ }

export function removeNode(
  content: PageContent,
  nodeId: string,
  options: { removeSubtree?: boolean } = { removeSubtree: true }
): PageContent { /* ... */ }

export function cloneSubtree(
  content: PageContent,
  nodeId: string
): { newRootId: string; nodes: Record<string, BlockNode> } { /* ... */ }

export function validateTree(content: PageContent): ValidationError[] { /* ... */ }

// ID generator - JEDNO ŹRÓDŁO PRAWDY
export function createNodeId(): string {
  return crypto.randomUUID();  // lub nanoid()
}

// ⚠️ ZASADA: ZAKAZ ręcznego generowania ID poza createNodeId()
// - Zapobiega kolizjom
// - Jednolite testy
// - Nie ma bugów w copy/paste

// Strict validation dla backend
export function validateCompositionStrict(content: PageContent): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // 1. Root must exist
  if (!content.nodes[content.rootId]) {
    errors.push({ type: 'missing_root', message: 'Root node not found' });
    return errors;  // Can't continue
  }
  
  // 2. Root must only have section children
  const root = content.nodes[content.rootId];
  for (const childId of root.childIds) {
    const child = content.nodes[childId];
    if (child?.type !== 'section') {
      errors.push({ 
        type: 'invalid_child', 
        nodeId: root.id, 
        childId, 
        message: `Root can only have section children, got ${child?.type}` 
      });
    }
  }
  
  // 3. Check all nodes
  for (const [id, node] of Object.entries(content.nodes)) {
    // 3a. Every child must point back to parent
    for (const childId of node.childIds) {
      const child = content.nodes[childId];
      if (!child) {
        errors.push({ type: 'missing_child', nodeId: id, childId, message: `Child ${childId} not found` });
        continue;
      }
      if (child.parentId !== id) {
        errors.push({ 
          type: 'parentId_mismatch', 
          nodeId: id, 
          childId, 
          message: `Child ${childId} has parentId ${child.parentId}, expected ${id}` 
        });
      }
    }
    
    // 3b. Check allowedChildren / allowedParents
    const definition = blockRegistry.get(node.type);
    if (definition && node.parentId) {
      const parentDef = blockRegistry.get(content.nodes[node.parentId]?.type);
      if (parentDef?.allowedChildren && !blockRegistry.canAddChild(content.nodes[node.parentId].type, node.type)) {
        errors.push({ 
          type: 'composition_rule', 
          nodeId: id, 
          message: `${node.type} not allowed in ${content.nodes[node.parentId].type}` 
        });
      }
    }
  }
  
  // 4. No cycles (simple DFS)
  const visited = new Set<string>();
  const stack = new Set<string>();
  
  function hasCycle(nodeId: string): boolean {
    if (stack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;
    
    visited.add(nodeId);
    stack.add(nodeId);
    
    for (const childId of content.nodes[nodeId]?.childIds ?? []) {
      if (hasCycle(childId)) return true;
    }
    
    stack.delete(nodeId);
    return false;
  }
  
  if (hasCycle(content.rootId)) {
    errors.push({ type: 'cycle', message: 'Tree contains cycle' });
  }
  
  return errors;
}
```

**Style Utilities** (`apps/admin/src/lib/page-builder/style-utils.ts`):

```typescript
// Proste dziedziczenie: brak klucza = dziedziczony
export function mergeStyles(
  base: Record<string, any>,
  responsive: Record<string, any> | undefined,
  breakpoint: 'desktop' | 'tablet' | 'mobile'
): Record<string, any> {
  if (breakpoint === 'desktop' || !responsive) return base;
  
  const override = responsive[breakpoint];
  if (!override) return base;
  
  // Merge: base + override (klucz w override nadpisuje base)
  return { ...base, ...override };
}

// Sprawdza czy pole jest overridden w danym breakpoint
export function isOverridden(
  props: BlockNode['props'],
  breakpoint: 'tablet' | 'mobile',
  key: string
): boolean {
  return key in (props.style.responsive?.[breakpoint] ?? {});
}

// Usuwa override (przywraca dziedziczenie z desktop)
export function clearOverride(
  props: BlockNode['props'],
  breakpoint: 'tablet' | 'mobile',
  key: string
): BlockNode['props'] {
  const responsive = { ...props.style.responsive };
  const breakpointStyle = { ...responsive[breakpoint] };
  delete breakpointStyle[key];
  responsive[breakpoint] = breakpointStyle;
  return { ...props, style: { ...props.style, responsive } };
}

// Ustawia override dla breakpoint
export function setOverride(
  props: BlockNode['props'],
  breakpoint: 'tablet' | 'mobile',
  key: string,
  value: any
): BlockNode['props'] {
  const responsive = { ...props.style.responsive };
  responsive[breakpoint] = { ...responsive[breakpoint], [key]: value };
  return { ...props, style: { ...props.style, responsive } };
}

// Zwraca wartość dla danego breakpoint (override lub dziedziczona)
export function getStyleValue(
  props: BlockNode['props'],
  breakpoint: 'desktop' | 'tablet' | 'mobile',
  key: string
): { value: any; isInherited: boolean } {
  if (breakpoint === 'desktop') {
    return { value: props.style.base[key], isInherited: false };
  }
  
  const override = props.style.responsive?.[breakpoint]?.[key];
  if (override !== undefined) {
    return { value: override, isInherited: false };
  }
  
  return { value: props.style.base[key], isInherited: true };
}
```

**Migrations** (`apps/admin/src/lib/page-builder/migrations.ts`):

```typescript
const migrations: Record<string, (content: PageContent) => PageContent> = {
  '1.1': (content) => {
    // Example: rename block type
    const nodes = { ...content.nodes };
    for (const [id, node] of Object.entries(nodes)) {
      if (node.type === 'old-heading') {
        nodes[id] = { ...node, type: 'heading' };
      }
    }
    return { ...content, nodes };
  },
};

export function migrateContent(content: PageContent): PageContent { /* ... */ }
export const CURRENT_VERSION = '1.0';
```

### 1.3 Dependencies

Dodanie do `apps/admin/package.json`:

- `@dnd-kit/core` - core drag & drop
- `@dnd-kit/sortable` - sortable functionality
- `@dnd-kit/utilities` - utilities
- `react-color` - color picker
- `react-icons` - ikony dla bloków
- `dompurify` - HTML sanitization
- `semver` - version comparison (dla migrations)

---

## 2. System Bloków

### 2.1 Block Base Classes

Utworzenie w `apps/admin/src/components/page-builder/blocks/`:

**BaseBlock.tsx** - bazowy komponent z:
- Renderowanie props (content/style/advanced)
- Merge responsive styles via `mergeStyles()`
- Memoization z stable props

**BlockWrapper.tsx** - wrapper z:
- Drag handle (dnd-kit) - tylko w trybie edit
- Selection indicator (border/outline)
- Hover states
- Drop zones dla slotów (renderowane przez bloki z dziećmi)
- Block controls overlay (on hover/select)
- **WAŻNE:** `React.memo()` z custom comparison, stable callbacks via `useCallback`

**BlockControls.tsx** - przyciski:
- Duplicate, delete, move up/down
- **Lock/unlock (Faza 3)** - jeśli `meta.locked`:
  - ❌ Brak możliwości DnD
  - ❌ Brak możliwości delete
  - ❌ Brak możliwości paste INTO (children)
  - ✅ Można edytować props
  - Visual: lock icon, disabled drag handle
- Show/hide (Faza 5)

**DropZone.tsx** - komponent drop zone:
- Visual indicator podczas drag (overlay + placeholder)
- Collision detection
- **Insertion line** pokazująca dokładne miejsce
- ID format: `dropzone:${blockId}:${slotName}`

**UnknownBlock.tsx** - fallback dla deprecated/nieznanych bloków:
- Wyświetla info "Unknown Block: {type}"
- **Akcje użytkownika:**
  - ✅ **Usunięcie** - może usunąć blok
  - ✅ **Zamiana typu** - opcjonalnie "Convert to..." (np. deprecated heading → current heading)
  - ✅ **Raw props view** - pokazuje props w read-only JSON viewer (dla ratowania danych)
- Nie blokuje całego buildera
- Visual: czerwona/pomarańczowa ramka, warning icon

### 2.2 Layout Blocks

**RootBlock** (niewidoczny):
- `type: 'root'`
- `allowedChildren: ['section']`
- Renderuje tylko children, bez wrappera

**SectionBlock** (`blocks/layout/SectionBlock.tsx`):
- Container dla sekcji
- Style: background, gradient, overlay, padding, margin
- Slots: `children` (ColumnBlock tylko)
- Reguła: `allowedChildren: ['column']`
- `canHaveChildren: true`

**ColumnBlock** (`blocks/layout/ColumnBlock.tsx`):
- Kolumny w sekcjach
- Responsive column widths (grid system, 1-4 kolumn na MVP)
- Slots: `children` (wszystkie content blocks)
- Reguła: `allowedChildren: ['heading', 'text', 'image', 'button', 'tabs', 'accordion', 'carousel', ...]`
- `canHaveChildren: true`

**ContainerBlock** - **ODŁOŻONE** na później (Faza 5)
- Komunikacja: "Section to Twój container" lub alias w UI

### 2.3 Typography Blocks

**HeadingBlock** (`blocks/typography/HeadingBlock.tsx`):
- H1-H6
- Props: `content.text`, `content.level`
- Style: font size, weight, color, alignment
- `canHaveChildren: false`

**TextBlock** (`blocks/typography/TextBlock.tsx`):
- Rich text editor (użycie istniejącego RichTextEditor)
- Props: `content.html` (sanitized via DOMPurify)
- Style: typography, spacing, color
- `canHaveChildren: false`
- **Sanitization UX:**
  - **Edit mode:** trzymaj surowy draft w local state (dla szybkości edycji)
  - **Preview mode:** renderuj ZAWSZE zsanityzowany HTML
  - **Save:** sanityzuj przed zapisem (backend też sanityzuje)
  - Zapobiega "miganiu" treści i różnicom preview vs publish

### 2.4 Media Blocks

**ImageBlock** (`blocks/media/ImageBlock.tsx`) - MVP:
- Integracja z MediaManager
- Props: `content.imageId`, `content.alt`, `content.caption`, `content.link`
- Style: sizing, object-fit, border-radius
- `canHaveChildren: false`
- **MediaManager flow:**
  - Click "Select Image" → Modal z MediaManager
  - Upload progress indicator
  - Loading state podczas ładowania obrazu
  - Link validation (http/https/mailto/tel)

**VideoBlock** - Faza 4

**GalleryBlock** - Faza 4

### 2.5 Component Blocks

**ButtonBlock** (`blocks/components/ButtonBlock.tsx`) - MVP:
- Props: `content.text`, `content.link`, `content.icon`
- Style: variants, colors, spacing, border-radius
- `canHaveChildren: false`
- **Link validation:** `isValidLink(url)` - tylko http/https/mailto/tel

**FormBlock** - Faza 4 (to prawie osobny produkt)

**IconBlock** - Faza 4

### 2.6 Advanced Blocks (Faza 4) - Item Nodes Pattern

**TabsBlock** + **TabItem**:

```typescript
// TabsBlock
{
  type: 'tabs',
  canHaveChildren: true,
  allowedChildren: ['tabItem'],
  defaultProps: {
    content: { activeTabId: null },  // default dla preview
    style: { base: {} },
    advanced: {}
  }
}

// TabItem (item node)
{
  type: 'tabItem',
  isItemNode: true,
  canHaveChildren: true,
  allowedChildren: ['heading', 'text', 'image', 'button', ...],
  allowedParents: ['tabs'],
  defaultProps: {
    content: { title: 'New Tab' },
    style: { base: {} },
    advanced: {}
  }
}
```

**State dla interakcji (activeTabId):**
- Trzymany w `props.content.activeTabId`
- Używany jako default dla preview mode
- W edit mode: kontrolowany lokalnie (który tab edytujesz)

**AccordionBlock** + **AccordionItem** - analogicznie

**CarouselBlock** + **Slide** - analogicznie

---

## 3. Canvas i Drag & Drop

### 3.1 Canvas Implementation

Przebudowa `apps/admin/src/components/page-builder/canvas/PageBuilderCanvas.tsx`:

**Jeden DndContext:**

```typescript
<DndContext
  collisionDetection={closestCenter}  // lub pointerWithin dla nested
  onDragStart={handleDragStart}
  onDragOver={handleDragOver}
  onDragEnd={handleDragEnd}
>
  <RenderTree nodeId={content.rootId} />
  <DragOverlay>
    {activeId ? <BlockPreview nodeId={activeId} /> : null}
  </DragOverlay>
</DndContext>
```

**Renderowanie drzewa:**

```typescript
function RenderTree({ nodeId }: { nodeId: string }) {
  const node = useBlockNode(nodeId);
  const childIds = useBlockChildren(nodeId);
  
  if (!node) return <UnknownBlock nodeId={nodeId} />;
  
  const BlockComponent = blockRegistry.get(node.type)?.component;
  if (!BlockComponent) return <UnknownBlock node={node} />;
  
  return (
    <BlockWrapper nodeId={nodeId}>
      <BlockComponent node={node}>
        {node.canHaveChildren && (
          <DropZone parentId={nodeId} slotName="children">
            {childIds.map((childId, index) => (
              <RenderTree key={childId} nodeId={childId} />
            ))}
          </DropZone>
        )}
      </BlockComponent>
    </BlockWrapper>
  );
}
```

**Selection handling:**

- Click na blok = `selectBlock(nodeId)`
- Click poza blokami = `selectBlock(null)`
- Keyboard shortcuts (Delete, Copy, Paste, Undo, Redo, Esc, Tab, Arrow keys)

### 3.2 Drop Zones z Precyzyjnym Indeksem

**Implementacja:**

```typescript
function DropZone({ parentId, slotName, children }: Props) {
  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone:${parentId}:${slotName}`,
    data: { parentId, slotName }
  });
  
  return (
    <div ref={setNodeRef} className={cn("drop-zone", isOver && "is-over")}>
      {children}
      {isOver && <InsertionLine />}
    </div>
  );
}
```

**Precyzyjny algorytm insertion index:**

```typescript
function calculateInsertIndex(
  over: Over, 
  event: DragEndEvent,
  parentId: string
): number {
  const parentNode = document.querySelector(`[data-dropzone="${parentId}"]`);
  if (!parentNode) return 0;
  
  const children = Array.from(parentNode.querySelectorAll(':scope > [data-block-id]'));
  if (children.length === 0) return 0;
  
  const dragY = event.activatorEvent instanceof MouseEvent 
    ? event.activatorEvent.clientY 
    : 0;
  
  for (let i = 0; i < children.length; i++) {
    const rect = children[i].getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    
    if (dragY < midpoint) {
      return i;  // Insert before this child
    }
  }
  
  return children.length;  // Insert at end
}
```

**Logika drop:**

```typescript
function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over) return;
  
  const [, parentId, slotName] = over.id.split(':');
  const targetIndex = calculateInsertIndex(over, event, parentId);
  
  if (active.data.current?.dragType === 'new-block') {
    const { blockType } = active.data.current;
    
    // Validate composition
    if (!blockRegistry.canAddChild(parentId, blockType)) {
      toast.error(`Cannot add ${blockType} here`);
      return;
    }
    
    addBlock(parentId, blockType, targetIndex);
    commit('dnd');
    
    // UX: select new block, open properties, focus first input
    const newBlockId = getLastAddedBlockId();
    selectBlock(newBlockId);
    openPropertiesPanel();
    focusFirstInput();
    
  } else if (active.data.current?.dragType === 'existing-node') {
    const { nodeId } = active.data.current;
    
    // Validate composition
    const node = content.nodes[nodeId];
    if (!blockRegistry.canAddChild(parentId, node.type)) {
      toast.error(`Cannot move ${node.type} here`);
      return;
    }
    
    moveBlock(nodeId, parentId, targetIndex);
    commit('dnd');
  }
}
```

---

## 4. Block Browser

### 4.1 Enhanced Block Browser

Rozbudowa `apps/admin/src/components/page-builder/sidebar-left/BlockBrowser.tsx`:

- Kategorie bloków z ikonami (react-icons)
- Search/filter bloków
- Drag handles na blokach (`dragType: "new-block"`)
- Block previews (opcjonalnie)
- **Virtual scrolling** dla długich list (react-virtual)
- Block templates section (Faza 5)

**onNewBlockDropped Flow:**

```typescript
// Po drop nowego bloku:
1. selectBlock(newBlockId)
2. openPropertiesPanel()
3. focusFirstInput()  // jeśli blok ma critical field (np. heading text)
```

### 4.2 Block Categories (MVP)

- Layout: Section, Column
- Typography: Heading, Text
- Media: Image
- Components: Button

---

## 5. Properties Panel

### 5.1 Dynamic Properties Editor

Przebudowa `apps/admin/src/components/page-builder/sidebar-right/PropertiesPanel.tsx`:

**Struktura:**

- Tabs: Content, Style, Advanced
- **Lazy loading** properties per tab (render on tab switch)
- Dynamiczne formularze bazujące na schemacie bloku
- **Draft state** dla instant preview
- Debounced commit (300-500ms)

**Draft State Pattern:**

```typescript
function PropertyInput({ blockId, propPath, value }: Props) {
  const [draft, setDraft] = useState(value);
  const updateBlockProps = usePageBuilderStore(s => s.updateBlockProps);
  const scheduleCommit = usePageBuilderStore(s => s.scheduleCommit);
  
  // Sync draft when external value changes
  useEffect(() => {
    setDraft(value);
  }, [value]);
  
  const handleChange = (newValue: any) => {
    setDraft(newValue);  // Instant preview
    updateBlockProps(blockId, { [propPath]: newValue });
    scheduleCommit(400);  // Debounced commit
  };
  
  return <Input value={draft} onChange={handleChange} />;
}
```

### 5.2 Style Editor

**MVP (Faza 3):**

- **Spacing**: Padding, margin (4-sided control)
- **Colors**: Text color, background color (color picker)
- **Typography**: Font size, weight, alignment
- **Layout**: Width, alignment

**Responsive UI:**

- Device indicator przy każdym polu
- **Clear override** button gdy pole jest overridden
- Visual indicator (dot/icon) dla overridden fields
- "Inherit from desktop" toggle

**Zaawansowane Style (Faza 5):**

- Borders, shadows, gradients
- Full typography (line height, letter spacing, font family)
- Flex properties

### 5.3 Advanced Properties (Faza 5)

- CSS classes
- Custom attributes (data-*)
- Animation settings
- Visibility controls (per device)

---

## 6. Responsive Design

### 6.1 Responsive Preview

Topbar (`apps/admin/src/components/page-builder/topbar/PageBuilderTopbar.tsx`):

- Device switcher (Desktop, Tablet, Mobile)
- Viewport resize (drag to resize)
- Current breakpoint indicator

### 6.2 Breakpoint System

- Desktop: default (1024px+) - `style.base`
- Tablet: 768px - 1023px - `style.responsive.tablet`
- Mobile: < 768px - `style.responsive.mobile`

### 6.3 Style Inheritance - UI/UX

**Edge case:** Użytkownik ustawia padding na desktop, override na mobile, potem zmienia desktop.

**Rozwiązanie (prostsze, bez _inherited flag):**

```typescript
// Model danych:
style: {
  base: { padding: '20px', margin: '10px', color: '#333' },
  responsive: {
    mobile: { padding: '10px' }  // tylko padding jest override
    // margin i color NIE ISTNIEJĄ = dziedziczone z base
  }
}

// W UI:
// - isOverridden(props, 'mobile', 'padding') → true (klucz istnieje)
// - isOverridden(props, 'mobile', 'margin') → false (klucz nie istnieje)
// - "Overridden" indicator (dot) przy polu padding
// - "Clear override" button przy polu padding
// - Tooltip z wartością z desktop gdy jest inherited

// Style Editor UI:
<StyleInput
  label="Padding"
  value={getStyleValue(props, breakpoint, 'padding')}
  isOverridden={isOverridden(props, breakpoint, 'padding')}
  onClearOverride={() => updateProps(clearOverride(props, breakpoint, 'padding'))}
  desktopValue={props.style.base.padding}  // dla tooltip
/>
```

**ZALETA:** Format danych jest czysty. Logika inheritance jest w UI, nie w danych.

---

## 7. Undo/Redo System

### 7.1 Commit-Based History

**Implementacja:**

```typescript
function commit(reason: CommitReason) {
  const state = get();
  
  // Skip if nothing changed
  if (!state.isDirty) return;
  
  // Add to history
  const past = [...state.history.past, state.content].slice(-50);
  
  set({
    history: { past, future: [] },
    isDirty: false,
  });
}

function scheduleCommit(ms = 400) {
  clearTimeout(commitTimeout);
  commitTimeout = setTimeout(() => commit('blur'), ms);
}

function undo() {
  const { past, future } = get().history;
  if (past.length === 0) return;
  
  const previous = past[past.length - 1];
  const newPast = past.slice(0, -1);
  
  set({
    content: previous,
    history: {
      past: newPast,
      future: [get().content, ...future],
    },
  });
}

function redo() {
  const { past, future } = get().history;
  if (future.length === 0) return;
  
  const next = future[0];
  const newFuture = future.slice(1);
  
  set({
    content: next,
    history: {
      past: [...past, get().content],
      future: newFuture,
    },
  });
}
```

**Keyboard shortcuts:** Ctrl+Z, Ctrl+Y (Ctrl+Shift+Z)

---

## 8. Copy/Paste

### 8.1 Clipboard System

**Implementacja:**

```typescript
function copyBlock(nodeId: string) {
  const { nodes, rootId } = cloneSubtree(get().content, nodeId);
  set({ clipboard: { nodes, rootId } });
}

function pasteBlock(parentId: string, index?: number) {
  const { clipboard, content } = get();
  if (!clipboard) return;
  
  // Validate composition
  const rootNode = clipboard.nodes[clipboard.rootId];
  if (!blockRegistry.canAddChild(parentId, rootNode.type)) {
    toast.error(`Cannot paste ${rootNode.type} here`);
    return;
  }
  
  // Generate new IDs for all nodes
  const { nodes: newNodes, rootId: newRootId } = regenerateIds(clipboard);
  
  // Insert into tree
  let newContent = content;
  for (const node of Object.values(newNodes)) {
    newContent = { ...newContent, nodes: { ...newContent.nodes, [node.id]: node } };
  }
  
  // Add to parent's children
  const parent = newContent.nodes[parentId];
  const newChildIds = [...parent.childIds];
  newChildIds.splice(index ?? newChildIds.length, 0, newRootId);
  newContent.nodes[parentId] = { ...parent, childIds: newChildIds };
  
  set({ content: newContent });
  commit('paste');
  selectBlock(newRootId);
}
```

**Keyboard shortcuts:** Ctrl+C, Ctrl+V

---

## 9. Autosave System

### 9.1 Autosave MVP (Faza 4)

**Scope MVP (scope control - bez feature creep):**
- ✅ Autosave co X sekund jeśli `isDirty`
- ✅ Status: saving/saved/error
- ✅ Beforeunload warning
- ✅ Retry on error

**⚠️ ODŁOŻONE na Faza 5/6:**
- ❌ Offline queue
- ❌ Conflict detection (last-write-wins)
- ❌ Optimistic concurrency

**Implementacja MVP:**

```typescript
// W store:
{
  lastSaved: Date | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  retryCount: number;
}

// Autosave hook
function useAutosave() {
  const isDirty = usePageBuilderStore(s => s.isDirty);
  const save = usePageBuilderStore(s => s.save);
  
  // Save co 30 sekund jeśli dirty
  useEffect(() => {
    if (!isDirty) return;
    
    const timer = setInterval(() => {
      save();
    }, 30000);
    
    return () => clearInterval(timer);
  }, [isDirty, save]);
  
  // Beforeunload warning
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);
}

// Save function z retry (max 3)
async function save() {
  const { retryCount } = get();
  if (retryCount >= 3) return;  // Stop after 3 failures
  
  set({ saveStatus: 'saving' });
  
  try {
    await api.savePage(get().content);
    set({ saveStatus: 'saved', lastSaved: new Date(), isDirty: false, retryCount: 0 });
  } catch (error) {
    set({ saveStatus: 'error', retryCount: retryCount + 1 });
    
    // Retry after 5s
    setTimeout(() => {
      if (get().saveStatus === 'error') {
        save();
      }
    }, 5000);
  }
}
```

**Visual indicator (w topbar):**

- **Saving:** Subtle spinner + "Saving..."
- **Saved:** Checkmark + "Saved at {time}" (fade po 3s)
- **Error:** Warning icon + "Save failed - Click to retry" + retry button

### 9.2 Autosave Advanced (Faza 5/6)

**Offline queue:**
```typescript
// Dodane do store:
offlineQueue: PageContent[];

// Na error dodaj do queue
set(s => ({ offlineQueue: [...s.offlineQueue, s.content] }));

// Process queue gdy online
window.addEventListener('online', processOfflineQueue);
```

**Conflict detection:**
```typescript
// Opcja 1: last-write-wins (prostsze)
// Opcja 2: Optimistic concurrency z version number
// Opcja 3: Merge conflicts (jak Git) - OVERKILL dla MVP
```

---

## 10. Backend Integration

### 10.1 Content Schema

Rozszerzenie `packages/schemas/src/page-builder/`:

```typescript
// PageContentSchema
export const PageContentSchema = z.object({
  version: z.string(),
  rootId: z.string().uuid(),
  nodes: z.record(z.string().uuid(), BlockNodeSchema),
});

// BlockNodeSchema
export const BlockNodeSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  parentId: z.string().uuid().nullable(),
  childIds: z.array(z.string().uuid()),
  props: z.object({
    content: z.record(z.any()),
    style: StyleSchema,
    advanced: z.record(z.any()).optional(),
  }),
  meta: z.object({
    locked: z.boolean().optional(),
    hidden: z.boolean().optional(),
    label: z.string().optional(),
  }).optional(),
});

// StyleSchema
export const StyleSchema = z.object({
  base: z.record(z.any()),
  responsive: z.object({
    tablet: z.record(z.any()).optional(),
    mobile: z.record(z.any()).optional(),
  }).optional(),
});
```

### 10.2 API Updates - Migrations Pipeline

Rozszerzenie `apps/api/src/modules/site-panel/site-pages.service.ts`:

```typescript
async updatePageContent(pageId: string, content: unknown) {
  // 1. Parse JSON
  const parsed = JSON.parse(content);
  
  // 2. Migrate to latest version
  const migrated = migrateContent(parsed);
  
  // 3. Sanitize HTML in text blocks
  const sanitized = sanitizePageContent(migrated);
  
  // 4. Validate with Zod
  const validated = PageContentSchema.parse(sanitized);
  
  // 5. Validate composition rules
  const compositionErrors = validateComposition(validated);
  if (compositionErrors.length > 0) {
    throw new BadRequestException(compositionErrors);
  }
  
  // 6. Save
  return this.prisma.page.update({
    where: { id: pageId },
    data: { content: validated },
  });
}

function sanitizePageContent(content: PageContent): PageContent {
  const nodes = { ...content.nodes };
  
  for (const [id, node] of Object.entries(nodes)) {
    if (node.type === 'text' && node.props.content.html) {
      nodes[id] = {
        ...node,
        props: {
          ...node.props,
          content: {
            ...node.props.content,
            html: sanitizeHtml(node.props.content.html),
          },
        },
      };
    }
    
    // Validate links
    if (node.props.content.link && !isValidLink(node.props.content.link)) {
      nodes[id] = {
        ...node,
        props: {
          ...node.props,
          content: {
            ...node.props.content,
            link: '',  // Clear invalid link
          },
        },
      };
    }
  }
  
  return { ...content, nodes };
}
```

---

## 11. Keyboard Shortcuts

### 11.1 Full Keyboard Support

```typescript
// Canvas keyboard handler
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    const { selectedBlockId } = get();
    
    // Delete
    if (e.key === 'Delete' && selectedBlockId) {
      deleteBlock(selectedBlockId);
      commit('shortcut');
    }
    
    // Copy
    if (e.ctrlKey && e.key === 'c' && selectedBlockId) {
      copyBlock(selectedBlockId);
    }
    
    // Paste
    if (e.ctrlKey && e.key === 'v') {
      pasteBlock(selectedBlockId || content.rootId);
    }
    
    // Undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      undo();
    }
    
    // Redo
    if (e.ctrlKey && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      redo();
    }
    
    // Escape - deselect
    if (e.key === 'Escape') {
      selectBlock(null);
    }
    
    // Tab - next sibling
    if (e.key === 'Tab' && !e.shiftKey && selectedBlockId) {
      e.preventDefault();
      selectNextSibling(selectedBlockId);
    }
    
    // Shift+Tab - previous sibling
    if (e.key === 'Tab' && e.shiftKey && selectedBlockId) {
      e.preventDefault();
      selectPreviousSibling(selectedBlockId);
    }
    
    // Enter - edit mode (focus content input)
    if (e.key === 'Enter' && selectedBlockId) {
      focusBlockContent(selectedBlockId);
    }
    
    // Alt+Up - move block up
    if (e.altKey && e.key === 'ArrowUp' && selectedBlockId) {
      moveBlockUp(selectedBlockId);
      commit('shortcut');
    }
    
    // Alt+Down - move block down
    if (e.altKey && e.key === 'ArrowDown' && selectedBlockId) {
      moveBlockDown(selectedBlockId);
      commit('shortcut');
    }
    
    // Ctrl+K - command palette (Faza 5)
    if (e.ctrlKey && e.key === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
  };
  
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, []);
```

---

## 12. UI/UX Enhancements

### 12.1 Visual Feedback

- Hover states na blokach (subtle border)
- Selection indicators (blue border + controls)
- Drop zone highlights (dashed border + background)

**Loading States (Progressive Enhancement):**
- **Page load:** Skeleton dla całego canvas
- **Image upload:** Progress bar + percentage
- **Autosave:** Subtle spinner w topbar (nie blokuje UI)
- **Properties load:** Shimmer per tab (lazy loading)

**Error States z Konkretnymi Komunikatami:**
- **Invalid drop:** Toast "Cannot add {blockType} here. Allowed: {allowedTypes}"
- **Save failed:** Toast "Save failed - Click to retry" + retry button w topbar
- **Validation failed:** Red border na bloku + tooltip z błędem
- **Deprecated block:** UnknownBlock z "This block is no longer supported. You can delete it or convert to..."
- **Network error:** Banner "Connection lost. Changes will be saved when you're back online."

### 12.2 Command Palette (Faza 5)

```typescript
// Ctrl+K opens command palette
// Scope:
commands: [
  // Quick add block (type to search)
  { type: 'add-block', label: 'Add Heading', action: () => addBlock('heading') },
  { type: 'add-block', label: 'Add Text', action: () => addBlock('text') },
  // ...
  
  // Jump to block (tree path)
  { type: 'jump', label: 'Jump to Section 1', action: () => selectAndScrollTo('section1') },
  
  // Actions
  { type: 'action', label: 'Save', shortcut: 'Ctrl+S', action: save },
  { type: 'action', label: 'Undo', shortcut: 'Ctrl+Z', action: undo },
  { type: 'action', label: 'Redo', shortcut: 'Ctrl+Y', action: redo },
  { type: 'action', label: 'Preview', action: () => setMode('preview') },
  { type: 'action', label: 'Publish', action: publish },
  
  // Settings
  { type: 'settings', label: 'Settings...', action: openSettings },
  
  // Help
  { type: 'help', label: 'Keyboard shortcuts', action: showShortcuts },
  { type: 'help', label: 'Documentation', action: openDocs },
]
```

### 12.3 Context Menu (Faza 5)

```typescript
// Right-click menu na blokach
contextMenuItems: {
  // Primary (zawsze widoczne)
  primary: [
    { label: 'Duplicate', shortcut: 'Ctrl+D', action: duplicateBlock },
    { label: 'Delete', shortcut: 'Delete', action: deleteBlock },
    { label: 'Copy', shortcut: 'Ctrl+C', action: copyBlock },
    { label: 'Cut', shortcut: 'Ctrl+X', action: cutBlock },
    { label: 'Paste', shortcut: 'Ctrl+V', action: pasteBlock, disabled: !clipboard },
  ],
  
  // Secondary (w submenu lub po separatorze)
  secondary: [
    { label: 'Move Up', shortcut: 'Alt+↑', action: moveBlockUp },
    { label: 'Move Down', shortcut: 'Alt+↓', action: moveBlockDown },
    { label: 'separator' },
    { label: node.meta?.locked ? 'Unlock' : 'Lock', action: toggleLock },
    { label: node.meta?.hidden ? 'Show' : 'Hide', action: toggleHidden },
    { label: 'separator' },
    { label: 'Convert to...', submenu: getConvertOptions(node.type) },  // np. H2 → H3
  ],
}
```

---

## 13. Performance Optimizations

### 13.1 Rendering Optimizations

- **Selektory Zustand**: `useBlockNode(id)` - tylko własny node
- **Memoization**: `React.memo()` z custom comparison dla BlockWrapper
- **Stable callbacks**: `useCallback` dla event handlers
- **Lazy loading**: properties panel tabs render on switch
- **Virtual scrolling**: 
  - ✅ **BlockBrowser**: od 50+ bloków (react-virtual)
  - ⚠️ **Canvas**: NIE wirtualizuj w MVP - drop zones znikają z DOM, konflikty z dnd-kit
  - Wirtualizacja canvas dopiero po stabilnym modelu i custom collision strategy
- **Throttle**: scroll events w canvas
- **Code splitting**: dynamic import per block type (Faza 5)

**Performance Monitoring (dev mode):**
```typescript
// Measure render times
<Profiler id="BlockWrapper" onRender={logRenderTime}>
  <BlockWrapper nodeId={id} />
</Profiler>

// Alert jeśli > 16ms (60fps)
function logRenderTime(id, phase, actualDuration) {
  if (actualDuration > 16) {
    console.warn(`Slow render: ${id} took ${actualDuration.toFixed(2)}ms`);
  }
}
```

### 13.2 State Optimizations

- Selective re-renders via selektory
- Debounced commit (300-500ms)
- Optimistic updates
- Batched updates

---

## 14. Development Tools

### 14.1 Debug Panel (Development Mode)

```typescript
// Dodaj do Canvas w dev mode
{process.env.NODE_ENV === 'development' && (
  <DebugPanel>
    <JsonViewer data={content} title="Tree Structure" />
    <div>Selected: {selectedBlockId ?? 'none'}</div>
    <div>History: {history.past.length} past, {history.future.length} future</div>
    <div>isDirty: {isDirty ? 'Yes' : 'No'}</div>
    <div>Last commit: {lastCommitReason ?? 'none'}</div>  {/* KLUCZOWE dla debugowania DnD/autosave/undo */}
    <div>Save status: {saveStatus}</div>
    <div>Clipboard: {clipboard ? 'Yes' : 'No'}</div>
  </DebugPanel>
)}

// ⚠️ lastCommitReason oszczędza GODZINY przy debugowaniu:
// - "Dlaczego undo nie działa?" → sprawdź reason
// - "Autosave triggeruje się za często?" → sprawdź reasons
// - "DnD nie commituje?" → sprawdź czy reason = 'dnd'

// Dev-mode tree validation (po każdej zmianie)
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    const errors = validateTree(content);
    if (errors.length > 0) {
      console.error('Tree validation failed:', errors);
    }
  }
}, [content]);
```

### 14.2 Storybook dla Bloków

```typescript
// stories/HeadingBlock.stories.tsx
export default {
  title: 'PageBuilder/Blocks/HeadingBlock',
  component: HeadingBlock,
};

const mockNode: BlockNode = {
  id: 'heading-1',
  type: 'heading',
  parentId: 'column-1',
  childIds: [],
  props: {
    content: { text: 'Sample Heading', level: 2 },
    style: { base: { color: '#333', fontSize: '24px' } },
  },
};

export const Default = () => (
  <BlockWrapper nodeId={mockNode.id}>
    <HeadingBlock node={mockNode} />
  </BlockWrapper>
);

export const WithResponsive = () => (
  // Test różne breakpoints
);

export const ErrorState = () => (
  // Test error rendering
);
```

### 14.3 Unit Tests (Od Razu!)

```typescript
// apps/admin/src/lib/page-builder/__tests__/tree-ops.test.ts
describe('tree-ops', () => {
  describe('insertNode', () => {
    it('updates parentId and childIds atomically', () => {
      const node = createTestNode('text');
      const result = insertNode(content, 'column-1', 0, node);
      
      expect(result.nodes[node.id].parentId).toBe('column-1');
      expect(result.nodes['column-1'].childIds).toContain(node.id);
    });
    
    it('inserts at correct index', () => {
      // ...
    });
    
    it('throws if parent not found', () => {
      expect(() => insertNode(content, 'invalid', 0, node)).toThrow();
    });
  });
  
  describe('moveNode', () => {
    it('removes from old parent and adds to new parent', () => {
      // ...
    });
  });
  
  describe('validateTree', () => {
    it('detects orphaned nodes', () => {
      // ...
    });
    
    it('detects cycles', () => {
      // ...
    });
    
    it('validates composition rules', () => {
      // ...
    });
  });
});
```

---

## 15. Testing

### 14.2 Integration Tests

- Drag & drop flows (new block, move block)
- Composition rules (valid/invalid drops)
- Undo/redo
- Copy/paste
- Save/load content

### 14.3 E2E Tests

- Complete page creation flow
- Responsive editing
- Autosave
- Error states

---

## 15. Documentation

### 15.1 Developer Documentation

- Block development guide (jak dodać nowy blok)
- Architecture overview (normalized tree, store, registry)
- API documentation (tree-ops, style-utils, migrations)
- Testing guide

### 15.2 User Documentation

- How to use page builder
- Block reference guide
- Keyboard shortcuts cheatsheet
- Troubleshooting

---

## Architectural Decisions - LOCKED ✅

| Decision | Rationale | Status |
|----------|-----------|--------|
| **Normalized tree with RootBlock** | Single render algorithm, no special cases | ✅ FINAL |
| **Item Nodes pattern** | Clean slots without mixing childIds | ✅ FINAL |
| **Transaction-safe tree ops** | Guaranteed parentId/childIds consistency | ✅ FINAL |
| **Draft vs committed state** | Instant preview + debounced commit | ✅ FINAL |
| **Style inheritance WITHOUT _inherited** | Clean data model, logic in UI | ✅ FINAL |
| **One DndContext** | No collision detection chaos | ✅ FINAL |
| **Commit-based history with reason** | Performance + predictable undo + debugging | ✅ FINAL |
| **HTML sanitization (frontend + backend)** | Defense in depth | ✅ FINAL |
| **UnknownBlock fallback** | Builder never crashes | ✅ FINAL |
| **BlockRegistry with composition rules** | Enforced constraints | ✅ FINAL |
| **One ID generator (createNodeId)** | No collisions, consistent tests | ✅ FINAL |
| **Virtual scrolling only BlockBrowser** | Canvas breaks with dnd-kit | ✅ FINAL |
| **Autosave MVP without offline queue** | Scope control | ✅ FINAL |

> ⚠️ Te decyzje są ZAMKNIĘTE. Nie zmieniaj ich w trakcie implementacji bez bardzo dobrego powodu.

---

## Critical Path Dependencies

```
Week 1 (Faza 1):
  setup-dependencies
    → block-types-schema
    → tree-ops-utils (+ createNodeId, validateCompositionStrict)
    → style-utils
    → block-registry
    → create-store (+ lastCommitReason)
    → base-block-components

Week 2 (Faza 2):
  base-block-components
    → layout-blocks (Root, Section, Column)
    → typography-blocks (Heading, Text + sanitization)
    → media-blocks (Image)
    → component-blocks (Button)

Week 2.5 (Faza 2.5 - OPCJONALNE ale ZALECANE):
  base-block-components
    → advanced-blocks (TabsBlock + TabItem prototype)
  
  ⚠️ 2-3 dni teraz = tydzień zaoszczędzony później!

Week 3 (Faza 3):
  tree-ops-utils + base-block-components
    → canvas-dnd (+ calculateInsertIndex)
    → properties-panel
    → style-editor
    → responsive-system
    → node-locking

Week 4 (Faza 4):
  canvas-dnd + properties-panel
    → undo-redo
    → copy-paste (+ locked parent check)
    → keyboard-shortcuts
    → autosave-mvp
    → advanced-blocks (full)

Week 5+ (Faza 5):
  Everything above
    → performance-optimization
    → ui-polish (context menu, command palette)
    → backend-validation (validateCompositionStrict)
```

---

## Implementacja - Kolejność Faz

### Faza 1: Fundamenty (Week 1)

**Cel:** Stabilna architektura i podstawowe komponenty

- ✅ Dependencies setup
- ✅ Zustand store z normalized tree, draft state, isDirty
- ✅ Block types i schemas (z RootBlock, item nodes types)
- ✅ Tree operations (insert, move, remove, clone, validate)
- ✅ Style utilities (merge, override)
- ✅ Block registry z regułami kompozycji
- ✅ Migrations pipeline (podstawowa struktura)
- ✅ Base block components (BaseBlock, BlockWrapper, BlockControls, DropZone, UnknownBlock)
- ✅ Podstawowy drag & drop (jeden DndContext, drop zones jako sloty)
- ✅ Commit-based history (podstawowa implementacja)

**Definition of Done:**
- Store działa z normalized tree i draft state
- Tree operations są transaction-safe
- Można zarejestrować blok z regułami
- Drop zone działa z precyzyjnym indeksem
- UnknownBlock renderuje się dla nieznanych typów

### Faza 2: Podstawowe Bloki (Week 2)

**Cel:** MVP bloków do budowania stron

- ✅ RootBlock (niewidoczny)
- ✅ SectionBlock + ColumnBlock (1-4 kolumny)
- ✅ HeadingBlock, TextBlock (z sanitizacją HTML)
- ✅ ImageBlock (z MediaManager, modal flow)
- ✅ ButtonBlock (z walidacją linków)
- ✅ **ContainerBlock odłożony** (dodaje zamieszania w MVP)

**Definition of Done:**
- Wszystkie bloki MVP działają
- Reguły kompozycji działają (root → section → column → content)
- Sanitizacja HTML działa
- MediaManager integration działa
- Można zbudować prostą stronę

### Faza 2.5: Prototyp Advanced Block (opcjonalnie)

**Cel:** Walidacja modelu item nodes

- ✅ Prototyp TabsBlock + TabItem
- ✅ Testowanie slots i state

**Definition of Done:**
- TabsBlock działa z TabItem nodes
- activeTabId w props.content
- Można dodawać/usuwać tabs

### Faza 3: Canvas i Properties (Week 3)

**Cel:** Pełny edytor z properties panel

- ✅ Pełny canvas z drag & drop (collision strategy, insertion line)
- ✅ Properties panel z dynamicznymi formularzami
- ✅ Draft state dla instant preview
- ✅ Lazy loading properties per tab
- ✅ Style editor - **podstawowe** (spacing, kolor, align, typography)
- ✅ onNewBlockDropped flow (select, open panel, focus)
- ✅ **Zaawansowane style odłożone** (borders, shadows, gradients - Faza 5)

**Definition of Done:**
- Można edytować content i podstawowe style
- Draft state daje instant preview
- Zmiany są widoczne w real-time
- Debounced commit działa

### Faza 4: Zaawansowane Funkcje (Week 4)

**Cel:** Responsive, undo/redo, copy/paste, autosave

- ✅ Responsive design (device switcher, style inheritance z edge cases)
- ✅ Clear override UI
- ✅ Undo/redo (commit-based z reason, max 50 kroków)
- ✅ Copy/paste (z walidacją, regenerate IDs)
- ✅ Autosave (z conflict resolution, offline queue)
- ✅ Keyboard shortcuts (Delete, Ctrl+C/V/Z/Y, Tab, Alt+Up/Down)
- ✅ Więcej bloków: VideoBlock, GalleryBlock (opcjonalnie)
- ✅ **Advanced blocks** (TabsBlock, AccordionBlock, CarouselBlock z item nodes)

**Definition of Done:**
- Responsive działa z clear override
- Undo/redo działa na commitach z różnymi reasons
- Copy/paste działa z walidacją
- Autosave działa z visual indicator
- Advanced blocks działają z item nodes pattern
- Można zbudować responsywną stronę

### Faza 5: Polish i Optymalizacja (Week 5)

**Cel:** Performance, UI/UX, zaawansowane features

- ✅ Performance optimizations (virtual scrolling, lazy loading, throttle)
- ✅ UI/UX improvements (context menu, command palette Ctrl+K)
- ✅ Zaawansowane style (borders, shadows, gradients)
- ✅ ContainerBlock (jeśli potrzebny)
- ✅ Block templates
- ✅ Code splitting per block
- ✅ Full keyboard navigation
- ✅ Testing (unit, integration, E2E)
- ✅ Documentation

**Definition of Done:**
- Wszystko działa płynnie (performance OK)
- Virtual scrolling dla długich list
- Command palette działa
- UI/UX jest przyjazne
- Dokumentacja jest kompletna

---

## MVP Definition of Done

**Minimalny "Definition of Done" dla MVP buildera:**

- ✅ Normalized tree z RootBlock
- ✅ Tree operations transaction-safe
- ✅ Dodawanie bloków z BlockBrowser na Canvas
- ✅ Przestawianie bloków w kolumnie (precyzyjny indeks)
- ✅ Sekcja → kolumny (min 1, max 4 na MVP)
- ✅ Properties: heading/text/image/button (content + spacing + kolor + align)
- ✅ Draft state dla instant preview
- ✅ Undo/redo na commitach
- ✅ Save/load content przez backend + walidacja Zod + sanitizacja
- ✅ Preview mode (bez kontrolek)
- ✅ UnknownBlock fallback dla deprecated bloków

**Reszta to roadmapa, nie MVP.**

---

## Go/No-Go Checklist (Przed Startem Implementacji)

### Architecture ✅
- [x] Normalized tree design reviewed
- [x] Transaction-safe tree ops defined
- [x] Block Registry contract clear
- [x] Item Nodes pattern validated
- [x] Style inheritance logic simple (no _inherited)
- [x] Security strategy (sanitization frontend + backend)

### Scope Control ✅
- [x] MVP vs Faza 5 clearly separated
- [x] Autosave scope limited (no offline queue in MVP)
- [x] Virtual scrolling only BlockBrowser (not Canvas)
- [x] Advanced styles deferred to Faza 5
- [x] Success metrics per phase defined

### Dev Experience ✅
- [x] Debug Panel planned for dev mode
- [x] validateTree() runs after every change
- [x] Performance monitoring (Profiler)
- [x] Unit tests strategy clear (tree-ops from day 1)
- [x] One ID generator (createNodeId)

### User Experience ✅
- [x] Error messages specific and actionable
- [x] Loading states progressive (skeleton, spinner, shimmer)
- [x] onNewBlockDropped flow (select, open panel, focus)
- [x] Clear override UI for responsive styles
- [x] UnknownBlock with delete/convert/raw props

---

## Success Metrics (Per Phase)

### Po Fazie 1-2 (Week 2):
- [ ] Można zbudować prostą stronę (section → columns → content)
- [ ] Drag & drop działa przewidywalnie (precyzyjny index)
- [ ] Undo/redo działa
- [ ] Tree validation passes (validateTree bez errorów)
- [ ] No console errors w dev mode
- [ ] UnknownBlock renderuje się dla nieznanych typów

### Po Fazie 3 (Week 3):
- [ ] Properties panel działa dla wszystkich MVP bloków
- [ ] Instant preview działa (draft state)
- [ ] Style editor działa (spacing, color, align, typography)
- [ ] Draft state nie crashuje undo/redo
- [ ] Locked blocks nie można przenosić ani usuwać

### Po Fazie 4 (Week 4):
- [ ] Responsive działa (desktop/tablet/mobile)
- [ ] Clear override UI działa
- [ ] Advanced blocks działają (tabs/accordion z item nodes)
- [ ] Copy/paste działa z walidacją
- [ ] Autosave działa z visual indicator
- [ ] Keyboard shortcuts działają
- [ ] Można zbudować production-ready page

### Po Fazie 5 (Week 5+):
- [ ] Performance OK (render < 16ms, virtual scrolling gdzie potrzeba)
- [ ] Command palette działa
- [ ] Context menu działa
- [ ] Full keyboard navigation
- [ ] Dokumentacja complete
- [ ] Testy (unit, integration, E2E) pokrywają krytyczne ścieżki

---

## Definition of Success

### MVP is Done When:
- [ ] Can build 3-column landing page with heading/text/image/button
- [ ] Drag & drop insertion is predictable (no jumps)
- [ ] Responsive works (desktop/tablet/mobile with inheritance)
- [ ] Undo/redo works on commits (with visible lastCommitReason in debug)
- [ ] Properties panel instant preview works
- [ ] Autosave works with status indicator
- [ ] Copy/paste validates composition rules (including locked parent)
- [ ] Backend rejects invalid trees (validateCompositionStrict)
- [ ] Deprecated blocks show as UnknownBlock (don't crash)
- [ ] Tree validation passes in dev mode (no console errors)
- [ ] Performance < 16ms per block render
- [ ] No memory leaks in long sessions (1h+ editing)

### You Can Ship When:
- [ ] All MVP checkboxes above ✅
- [ ] Basic unit tests pass (tree-ops, style-utils)
- [ ] Integration test: drag new block → edit → save → reload
- [ ] E2E test: create landing page → preview → publish
- [ ] Documentation exists (keyboard shortcuts, block reference)
- [ ] Dev team can add new block without asking questions
- [ ] No critical bugs in 3-day dog-fooding period

---

## Checklist Przed Startem

```
✅ Masz UI mockup dla:
   - Canvas w 3 breakpointach
   - Properties panel dla każdego block type
   - BlockBrowser z kategoriami
   - Drop indicators (insertion line)
   
✅ Masz user flows dla:
   - "Add first block" (empty state)
   - "Complex layout" (3 kolumny, różne bloki)
   - "Responsive edit" (zmiana padding na mobile)
   - "Undo mistake" (usunąłem złą rzecz)
   - "New block drop" (select, open panel, focus)
   
✅ Masz odpowiedzi na:
   - Jak wygląda error state? (failed validation, invalid drop)
   - Jak wygląda loading state? (saving..., image upload)
   - Co z unsaved changes? (leave page warning)
   - Jak obsłużyć deprecated bloki? (UnknownBlock)
   
✅ Masz plan testowy:
   - Unit: block rendering, store actions, tree-ops
   - Integration: drag & drop flows, composition rules
   - E2E: complete page creation
```

---

## Podsumowanie Kluczowych Poprawek

1. **Normalized tree z RootBlock** - fundament stabilności, jeden algorytm renderowania
2. **Item Nodes** (TabItem, AccordionItem, Slide) - czyste sloty bez mieszania childIds
3. **Tree operations transaction-safe** - spójność parentId/childIds gwarantowana
4. **Draft vs committed state** - instant preview + debounced commit
5. **Commit z reason** - lepsze debugowanie i UX
6. **Style inheritance BEZ _inherited flag** - prostsze: brak klucza = dziedziczony
7. **Migrations pipeline** - bezpieczne rozwijanie formatu
8. **HTML sanitization + link validation** - security (frontend + backend)
9. **Autosave MVP** - interval + status + beforeunload + retry (offline queue Faza 5/6)
10. **UnknownBlock fallback** - delete/replace/raw props view
11. **Precyzyjny insertion index** - calculateInsertIndex z midpoint calculation
12. **onNewBlockDropped flow** - lepszy UX (select, open panel, focus)
13. **Performance od razu** - selektory Zustand, memo, stable props, lazy loading
14. **Node locking wcześniej (Faza 3)** - locked → brak DnD i delete
15. **Jeden helper createNodeId()** - koniec dyskusji o ID generation
16. **validateCompositionStrict** - na backendzie pełna walidacja (cycles, parentId mismatch, etc.)
17. **Virtual scrolling tylko BlockBrowser** - canvas NIE, bo drop zones znikają z DOM
18. **Dev tools** - Debug Panel, Storybook, unit tests od razu, performance monitoring
19. **Success Metrics per phase** - jasne Definition of Done

**Builder to nie jest miejsce na heroiczne "własne rozwiązania". Ma być stabilnie, przewidywalnie, szybko.**

---

## Pro Tips Przed Startem

### 1. **Jedna Zasada: Nie Mieszaj Danych z Metadanymi UI**
- `_inherited` flag - wyrzucone z modelu danych → logika UI
- Dziedziczenie = brak klucza w override → proste

### 2. **Scope Control (Przeciw Feature Creep)**
- Autosave MVP: tylko interval + status + retry
- Virtual scrolling: tylko BlockBrowser (canvas NIE)
- Advanced styles: Faza 5 (nie wcześniej)

### 3. **Prototyp Wcześniej (Faza 2.5)**
- TabsBlock prototyp ZANIM Faza 4
- 2-3 dni może zaoszczędzić tydzień refaktoru

### 4. **Dev Tools Od Początku**
- Debug Panel w dev mode
- validateTree() po każdej zmianie
- Performance monitoring (Profiler)
- Testy tree-ops od razu

**Now go ship it.** 🎉

---

## 🏆 Final Verdict

**Status:** ✅ **APPROVED – production-grade plan**
**Poziom:** Elementor / Webflow-class (technicznie)
**Ryzyko architektoniczne:** 🔽 bardzo niskie
**Feature creep:** 🔒 dobrze zablokowany
**Szansa na refaktor „po drodze":** minimalna

### What Makes It Solid:
1. **Architecture** - Normalized tree, transaction-safe ops, composition rules
2. **Simplicity** - No _inherited flags, clean data model
3. **Scope Control** - MVP clearly separated from polish
4. **Safety Nets** - UnknownBlock, backend validation, sanitization
5. **Performance** - Selectors, memo, lazy loading from start
6. **Dev Experience** - Debug panel, tests, metrics
7. **User Experience** - Precise insertion, instant preview, clear errors

### Known Risks (Mitigated):
| Risk | Mitigation |
|------|------------|
| Item Nodes might not work | Faza 2.5 prototype validates |
| DnD collision issues | One DndContext + precise insertion algorithm |
| Performance degradation | Selectors + memo + monitoring from day 1 |
| Deprecated blocks crash | UnknownBlock fallback |
| Tree corruption | validateTree() in dev + backend strict validation |

### Timeline:
- **4-5 weeks to MVP**
- **1-2 weeks polish**
- **= 6-7 weeks total**

### Next Step:
Create Faza 1 branch and knock out dependencies + store + tree-ops.

---

**To już NIE jest koncepcja.**
**To jest SPECYFIKACJA PRODUKTU.**

Możesz go:
- 🔹 dać **innemu AI** → wygeneruje UI / komponenty
- 🔹 dać **frontend devowi** → wie dokładnie co robić
- 🔹 dać **backend devowi** → zna walidację i format
- 🔹 trzymać jako **internal RFC / spec**

**Green light, jedź z tym dalej.** 🚀

---

## Biggest Risk: Advanced Blocks

**TabsBlock/AccordionBlock/CarouselBlock** w Fazie 4 to nie są "just blocks" - to mini state machines z item nodes.

**Rekomendacja:** Zrób prototyp jednego z nich wcześniej (Faza 2.5) żeby zwalidować, że model props/slots/item nodes faktycznie działa. Lepiej odkryć problem wcześniej niż refaktorować całą architekturę.
