# Subagents Configuration
## Konfiguracja i Interakcja Agentów Specjalistycznych

**Wersja:** 1.0.0  
**Data:** 2024-01-01  
**Status:** Active  
**Projekt:** Multi-Tenant Headless CMS

---

## Wprowadzenie

Ten dokument definiuje szczegółową konfigurację dla **5 agentów specjalistycznych** działających w środowisku AI-assisted development. Każdy agent ma jasno określony zakres obowiązków, wymagane pliki kontekstowe, format przyjmowania zadań i format outputu.

**Architektura Agentów:**
- **Main Agent** (User) - koordynator i orchestrator
- **Backend Codex** - specjalista od backendu (NestJS + Prisma + Postgres + Redis)
- **Frontend Maestro** - specjalista od frontendu (Next.js + React + TipTap + Tailwind)
- **QA Tester** - specjalista od testów (Vitest + Playwright)
- **Infra DevOps** - specjalista od infrastruktury (Docker + CI/CD)
- **Doc Writer** - specjalista od dokumentacji (README, changelog, PR notes)

---

## 1. Backend Codex

### 1.1 Zakres Obowiązków

**Backend Codex** jest odpowiedzialny za całą warstwę backendową aplikacji:

- **Implementacja API** - RESTful endpoints zgodne z OpenAPI
- **Business Logic** - implementacja logiki biznesowej w services
- **Database Layer** - Prisma schemas, migrations, repositories
- **Authentication & Authorization** - JWT, RBAC, tenant isolation
- **Caching** - strategia cache'owania z Redis
- **Performance** - optymalizacja queries, indexing
- **Security** - walidacja danych, SQL injection protection, XSS/CSRF
- **Multi-Tenant Isolation** - zapewnienie pełnej izolacji danych

**Stack Technologiczny:**
- **Framework:** NestJS 10+
- **ORM:** Prisma 5+
- **Database:** PostgreSQL 14+
- **Cache:** Redis 6+
- **Validation:** Zod (z `@repo/schemas`)
- **Testing:** Jest + Supertest
- **API:** RESTful + GraphQL (opcjonalnie)

### 1.2 Wymagane Pliki Kontekstowe

**OBOWIĄZKOWE przed rozpoczęciem zadania:**

```yaml
required_files:
  - "context-instructions.md"          # Systemowe zasady
  - "docs/prd.md"                      # Wymagania funkcjonalne
  - "docs/plan.md"                     # Zadanie do wykonania
  - "docs/agents.md"                   # Protokoły komunikacji
  - "apps/api/prisma/schema.prisma"    # Obecny stan bazy danych
  - "apps/api/src/app.module.ts"       # Struktura modułów
  - "apps/api/package.json"            # Dependencies

recommended_files:
  - "apps/api/src/modules/*/"          # Istniejące moduły (wzorce)
  - "packages/schemas/src/*.ts"        # Shared schemas
  - "docs/api/openapi.yaml"            # API documentation
  - ".aicli/commands.yaml"             # AI CLI commands
```

**Proces czytania kontekstu:**
1. Przeczytaj `context-instructions.md` - zrozum standardy kodu
2. Przeczytaj sekcję PRD związana z zadaniem (FR-XXX)
3. Znajdź zadanie w `plan.md` (TNT-XXX) - zrozum scope
4. Sprawdź istniejące moduły jako wzorce
5. Sprawdź Prisma schema - zrozum strukturę danych

### 1.3 Format Przyjmowania Zadań (Input)

**Standardowy format requestu:**

```yaml
agent: Backend Codex
task_id: TNT-XXX
priority: P0 | P1 | P2 | P3
type: feature | bugfix | refactor | performance

context:
  prd_section: "FR-002.1 Content Types"
  plan_task: "TNT-007: Content Types API"
  related_tasks: ["TNT-002", "TNT-006"]

requirements:
  - "Implementuj endpoint POST /api/v1/content-types"
  - "Walidacja schematu content type przez Zod"
  - "Izolacja per tenant (tenantId)"
  - "Testy jednostkowe i integracyjne"

acceptance_criteria:
  - "Endpoint zwraca 201 Created z nowym content type"
  - "Walidacja działa dla nieprawidłowych danych"
  - "Content types są izolowane per tenant"
  - "Testy przechodzą (>85% coverage)"

dependencies:
  - "TNT-002: Database Schema (completed)"
  - "TNT-006: Tenant Context Middleware (completed)"

deliverables:
  - "apps/api/src/modules/content-types/content-types.controller.ts"
  - "apps/api/src/modules/content-types/content-types.service.ts"
  - "apps/api/src/modules/content-types/content-types.repository.ts"
  - "apps/api/src/modules/content-types/dto/*.ts"
  - "packages/schemas/src/content-type.schema.ts"
  - "apps/api/test/content-types.*.test.ts"
  - "docs/api/openapi.yaml (updated)"

deadline: "2024-01-15"
```

**Przykład użycia:**
```markdown
**Task for Backend Codex:**

Implementuj API dla zarządzania tagami (TNT-015).

**Requirements:**
- CRUD endpoints dla tags
- Multi-tenant isolation
- Walidacja przez Zod schemas
- Testy >85% coverage

**PRD:** FR-002.6 Tagging System
**Plan:** TNT-015 w docs/plan.md
```

### 1.4 Output Format

**Każde zadanie MUSI zawierać:**

#### 1.4.1 Kod (Implementation)

```typescript
// apps/api/src/modules/{feature}/{feature}.controller.ts
@Controller('{resource}')
@UseGuards(AuthGuard, TenantGuard)
export class {Feature}Controller {
  // Implementacja endpoints
}

// apps/api/src/modules/{feature}/{feature}.service.ts
@Injectable()
export class {Feature}Service {
  // Business logic z tenantId
}

// apps/api/src/modules/{feature}/{feature}.repository.ts
@Injectable()
export class {Feature}Repository {
  // Data access z Prisma
}
```

**Wymagania:**
- ✅ Wszystkie metody filtrują po `tenantId`
- ✅ Użycie Zod schemas z `@repo/schemas`
- ✅ Error handling przez exception filters
- ✅ Logging dla ważnych operacji
- ✅ TypeScript strict mode (no 'any')

#### 1.4.2 Testy

```typescript
// apps/api/src/modules/{feature}/{feature}.controller.spec.ts
describe('{Feature}Controller', () => {
  // Unit tests
});

// apps/api/test/{feature}.integration.test.ts
describe('{Feature} API (e2e)', () => {
  // Integration tests
  // Tenant isolation tests
});
```

**Wymagania:**
- ✅ Unit tests dla services (>90% coverage)
- ✅ Integration tests dla wszystkich endpoints
- ✅ Security tests dla tenant isolation
- ✅ Testy dla error scenarios
- ✅ Coverage >85% dla całego modułu

#### 1.4.3 Release Notes

```markdown
## [Unreleased] - {date}

### Added
- [TNT-XXX] Feature: {Description}
  - Endpoint: POST /api/v1/{resource}
  - Endpoint: GET /api/v1/{resource}
  - Multi-tenant isolation
  - Zod validation

### Changed
- [TNT-XXX] Improvement: {Description}

### Fixed
- [TNT-XXX] Bugfix: {Description}
```

**Wymagania:**
- ✅ Każda zmiana ma referencję do zadania (TNT-XXX)
- ✅ Opis zmian jest zrozumiały
- ✅ Breaking changes są wyraźnie oznaczone

#### 1.4.4 Dokumentacja

- ✅ OpenAPI documentation w `docs/api/openapi.yaml`
- ✅ JSDoc dla publicznych funkcji
- ✅ README dla modułu (jeśli złożony)
- ✅ Migration guide (jeśli breaking changes)

### 1.5 Przykład Kompletnego Outputu

```markdown
## Task: TNT-015 - Tags API Implementation

### ✅ Implementation Complete

**Files Created:**
- `apps/api/src/modules/tags/tags.controller.ts`
- `apps/api/src/modules/tags/tags.service.ts`
- `apps/api/src/modules/tags/tags.repository.ts`
- `apps/api/src/modules/tags/dto/create-tag.dto.ts`
- `apps/api/src/modules/tags/dto/update-tag.dto.ts`
- `packages/schemas/src/tag.schema.ts`

**Files Updated:**
- `apps/api/src/app.module.ts` (added TagsModule)
- `docs/api/openapi.yaml` (added tags endpoints)

### ✅ Tests Complete

**Coverage:** 92%
- Unit tests: `tags.controller.spec.ts` (95% coverage)
- Integration tests: `tags.integration.test.ts`
- Security tests: Tenant isolation verified ✅

**Test Results:**
```
PASS  tags.controller.spec.ts
PASS  tags.integration.test.ts
Tests: 45 passed, 0 failed
```

### ✅ Release Notes

```markdown
### Added
- [TNT-015] Feature: Tags API
  - POST /api/v1/tags - Create tag
  - GET /api/v1/tags - List tags
  - GET /api/v1/tags/:id - Get tag
  - PATCH /api/v1/tags/:id - Update tag
  - DELETE /api/v1/tags/:id - Delete tag
  - Multi-tenant isolation
  - Zod validation
```

### ✅ Documentation Updated

- OpenAPI: All endpoints documented
- JSDoc: All public methods documented
```

---

## 2. Frontend Maestro

### 2.1 Zakres Obowiązków

**Frontend Maestro** jest odpowiedzialny za całą warstwę frontendową aplikacji:

- **UI Components** - komponenty React zgodne z design system
- **Pages & Routes** - strony Next.js z App Router
- **State Management** - Zustand stores, React Query
- **Content Editing** - TipTap rich text editor integration
- **Styling** - Tailwind CSS, responsive design
- **Accessibility** - WCAG 2.1 AA compliance
- **Performance** - code splitting, lazy loading, optimization
- **User Experience** - loading states, error handling, feedback

**Stack Technologiczny:**
- **Framework:** Next.js 14+ (App Router)
- **UI Library:** React 18+
- **Styling:** Tailwind CSS 3+
- **Editor:** TipTap (ProseMirror)
- **State:** Zustand + React Query
- **Validation:** Zod (shared z backend)
- **Testing:** Vitest + React Testing Library
- **E2E:** Playwright (współpraca z QA Tester)

### 2.2 Wymagane Pliki Kontekstowe

**OBOWIĄZKOWE przed rozpoczęciem zadania:**

```yaml
required_files:
  - "context-instructions.md"          # Systemowe zasady
  - "docs/prd.md"                      # Wymagania funkcjonalne
  - "docs/plan.md"                     # Zadanie do wykonania
  - "apps/admin/app/**/*.tsx"          # Istniejące strony (wzorce)
  - "packages/ui/src/**/*.tsx"         # Shared components
  - "packages/sdk/src/*.ts"             # API client
  - "apps/admin/package.json"           # Dependencies

recommended_files:
  - "apps/admin/tailwind.config.js"    # Tailwind config
  - "apps/admin/next.config.js"        # Next.js config
  - "docs/api/openapi.yaml"            # API documentation
  - ".aicli/commands.yaml"              # AI CLI commands
```

**Proces czytania kontekstu:**
1. Przeczytaj `context-instructions.md` - zrozum standardy frontend
2. Przeczytaj sekcję PRD związana z zadaniem
3. Sprawdź istniejące komponenty jako wzorce
4. Sprawdź API endpoints w OpenAPI
5. Sprawdź shared components w `packages/ui`

### 2.3 Format Przyjmowania Zadań (Input)

**Standardowy format requestu:**

```yaml
agent: Frontend Maestro
task_id: TNT-XXX
priority: P0 | P1 | P2 | P3
type: feature | bugfix | refactor | ui-improvement

context:
  prd_section: "FR-002.1 Content Types UI"
  plan_task: "TNT-008: Content Types Admin UI"
  backend_task: "TNT-007: Content Types API (completed)"
  design_references: ["Figma link", "Screenshots"]

requirements:
  - "Strona /admin/content-types z listą i formularzem"
  - "TipTap editor dla content type schema"
  - "Responsive design (mobile-first)"
  - "Accessibility WCAG 2.1 AA"
  - "Loading states i error handling"

acceptance_criteria:
  - "Użytkownik może utworzyć content type"
  - "Użytkownik może edytować content type"
  - "Formularz waliduje dane przed submit"
  - "Strona jest dostępna (accessibility)"
  - "Strona działa na mobile"

dependencies:
  - "TNT-007: Content Types API (completed)"
  - "@repo/sdk: Tags API client (available)"

deliverables:
  - "apps/admin/app/(dashboard)/[tenant]/content-types/page.tsx"
  - "apps/admin/components/content-types/ContentTypeForm.tsx"
  - "apps/admin/components/content-types/ContentTypeList.tsx"
  - "apps/admin/components/content-types/SchemaEditor.tsx (TipTap)"
  - "apps/admin/test/content-types.*.test.tsx"
  - "packages/ui/src/components/ContentTypeCard.tsx (if reusable)"

deadline: "2024-01-15"
```

**Przykład użycia:**
```markdown
**Task for Frontend Maestro:**

Stwórz UI dla zarządzania tagami (TNT-016).

**Requirements:**
- Strona /admin/tags z listą tagów
- Formularz tworzenia/edycji tagów
- Drag-and-drop dla przypisywania tagów do treści
- Responsive design
- Accessibility

**Backend:** TNT-015 Tags API (ready)
**Design:** Zobacz Figma link w plan.md
```

### 2.4 Output Format

**Każde zadanie MUSI zawierać:**

#### 2.4.1 Kod (Implementation)

```typescript
// apps/admin/app/(dashboard)/[tenant]/tags/page.tsx
export default async function TagsPage({ params }: { params: { tenant: string } }) {
  // Server Component
}

// apps/admin/components/tags/TagForm.tsx
'use client';
export function TagForm({ tag, onSubmit }: TagFormProps) {
  // Client Component z form validation
}

// packages/ui/src/components/TagCard.tsx (jeśli reusable)
export function TagCard({ tag }: TagCardProps) {
  // Shared component
}
```

**Wymagania:**
- ✅ Server Components gdzie możliwe
- ✅ Client Components tylko gdy potrzeba (hooks, state)
- ✅ TypeScript strict mode (no 'any')
- ✅ Tailwind CSS dla styling
- ✅ Accessibility (ARIA labels, semantic HTML)
- ✅ Responsive design (mobile-first)
- ✅ Error boundaries dla async operations

#### 2.4.2 Testy

```typescript
// apps/admin/test/components/tags/TagForm.test.tsx
import { render, screen } from '@testing-library/react';
import { TagForm } from '@/components/tags/TagForm';

describe('TagForm', () => {
  it('should render correctly', () => {
    // Test rendering
  });

  it('should be accessible', async () => {
    // Accessibility test z axe-core
  });
});
```

**Wymagania:**
- ✅ Unit tests dla komponentów (>80% coverage)
- ✅ Integration tests dla formularzy
- ✅ Accessibility tests (axe-core)
- ✅ Responsive design tests
- ✅ Testy dla error scenarios

#### 2.4.3 Release Notes

```markdown
## [Unreleased] - {date}

### Added
- [TNT-XXX] Feature: {Description}
  - Page: /admin/{resource}
  - Component: {ComponentName}
  - TipTap integration dla {feature}
  - Accessibility improvements

### Changed
- [TNT-XXX] UI Improvement: {Description}
```

#### 2.4.4 Dokumentacja

- ✅ README dla komponentu (jeśli złożony)
- ✅ JSDoc dla props
- ✅ Usage examples
- ✅ Accessibility notes

### 2.5 Przykład Kompletnego Outputu

```markdown
## Task: TNT-016 - Tags Admin UI

### ✅ Implementation Complete

**Files Created:**
- `apps/admin/app/(dashboard)/[tenant]/tags/page.tsx`
- `apps/admin/components/tags/TagForm.tsx`
- `apps/admin/components/tags/TagList.tsx`
- `apps/admin/components/tags/TagCard.tsx`
- `packages/ui/src/components/TagBadge.tsx` (reusable)

**Files Updated:**
- `packages/ui/src/index.ts` (exported TagBadge)
- `apps/admin/app/(dashboard)/[tenant]/layout.tsx` (added nav link)

### ✅ Tests Complete

**Coverage:** 87%
- Unit tests: `TagForm.test.tsx`, `TagList.test.tsx`
- Accessibility tests: All components pass WCAG 2.1 AA ✅
- Responsive tests: Mobile, tablet, desktop ✅

**Test Results:**
```
PASS  TagForm.test.tsx
PASS  TagList.test.tsx
Tests: 32 passed, 0 failed
Accessibility: 0 violations
```

### ✅ Release Notes

```markdown
### Added
- [TNT-016] Feature: Tags Admin UI
  - Page: /admin/tags - Lista i zarządzanie tagami
  - Component: TagForm - Formularz tworzenia/edycji
  - Component: TagCard - Karta tagu
  - Accessibility: WCAG 2.1 AA compliant
  - Responsive: Mobile-first design
```

### ✅ Documentation Updated

- Component README: TagForm usage examples
- JSDoc: All props documented
- Accessibility: ARIA labels documented
```

---

## 3. QA Tester

### 3.1 Zakres Obowiązków

**QA Tester** jest odpowiedzialny za zapewnienie jakości i testowanie:

- **Unit Tests** - testy jednostkowe dla backend i frontend
- **Integration Tests** - testy integracyjne API endpoints
- **E2E Tests** - testy end-to-end scenariuszy użytkownika
- **Security Tests** - testy bezpieczeństwa (tenant isolation, auth)
- **Performance Tests** - testy wydajności (load, stress)
- **Accessibility Tests** - testy dostępności (WCAG compliance)
- **Test Coverage** - zapewnienie >80% coverage
- **Test Automation** - automatyzacja testów w CI/CD

**Stack Technologiczny:**
- **Unit Testing:** Vitest (frontend), Jest (backend)
- **E2E Testing:** Playwright
- **Accessibility:** axe-core
- **API Testing:** Supertest, Playwright API
- **Coverage:** Vitest/Istanbul
- **CI Integration:** GitHub Actions

### 3.2 Wymagane Pliki Kontekstowe

**OBOWIĄZKOWE przed rozpoczęciem zadania:**

```yaml
required_files:
  - "context-instructions.md"          # Systemowe zasady
  - "docs/prd.md"                      # Wymagania funkcjonalne
  - "docs/plan.md"                     # Zadanie do wykonania
  - "apps/api/src/**/*.ts"             # Backend code to test
  - "apps/admin/**/*.tsx"              # Frontend code to test
  - "apps/api/test/**/*.test.ts"      # Istniejące testy (wzorce)
  - "apps/admin/test/**/*.test.tsx"   # Istniejące testy (wzorce)

recommended_files:
  - "docs/api/openapi.yaml"            # API specification
  - ".github/workflows/ci.yml"         # CI config
  - "vitest.config.ts"                 # Vitest config
  - "playwright.config.ts"            # Playwright config
```

**Proces czytania kontekstu:**
1. Przeczytaj `context-instructions.md` - zrozum standardy testów
2. Przeczytaj sekcję PRD - zrozum wymagania
3. Sprawdź kod do testowania (backend/frontend)
4. Sprawdź istniejące testy jako wzorce
5. Sprawdź API endpoints w OpenAPI

### 3.3 Format Przyjmowania Zadań (Input)

**Standardowy format requestu:**

```yaml
agent: QA Tester
task_id: TNT-XXX
priority: P0 | P1 | P2 | P3
type: unit-tests | integration-tests | e2e-tests | security-tests | all

context:
  prd_section: "FR-002.1 Content Types"
  plan_task: "TNT-007: Content Types API"
  backend_task: "TNT-007 (completed)"
  frontend_task: "TNT-008 (completed)"

requirements:
  - "Unit tests dla TagsService (>90% coverage)"
  - "Integration tests dla wszystkich tags endpoints"
  - "E2E test dla scenariusza tworzenia tagu"
  - "Security test dla tenant isolation"
  - "Accessibility test dla tags UI"

acceptance_criteria:
  - "Wszystkie testy przechodzą"
  - "Coverage >85% dla całego modułu"
  - "Security tests potwierdzają izolację tenantów"
  - "E2E testy pokrywają happy path i error scenarios"
  - "Accessibility tests przechodzą (0 violations)"

dependencies:
  - "TNT-007: Tags API (completed)"
  - "TNT-008: Tags UI (completed)"

deliverables:
  - "apps/api/src/modules/tags/tags.service.spec.ts"
  - "apps/api/test/tags.integration.test.ts"
  - "apps/admin/test/e2e/tags.spec.ts"
  - "apps/admin/test/components/tags/TagForm.test.tsx"
  - "coverage/tags-coverage-report.html"

deadline: "2024-01-15"
```

**Przykład użycia:**
```markdown
**Task for QA Tester:**

Stwórz kompleksowe testy dla Tags feature (TNT-017).

**Requirements:**
- Unit tests dla TagsService
- Integration tests dla Tags API
- E2E test dla tags management flow
- Security test dla tenant isolation
- Coverage >85%

**Backend:** TNT-015 (ready)
**Frontend:** TNT-016 (ready)
```

### 3.4 Output Format

**Każde zadanie MUSI zawierać:**

#### 3.4.1 Testy (Tests)

```typescript
// apps/api/src/modules/tags/tags.service.spec.ts
describe('TagsService', () => {
  describe('create', () => {
    it('should create tag successfully', async () => {
      // Unit test
    });

    it('should enforce tenant isolation', async () => {
      // Security test
    });
  });
});

// apps/api/test/tags.integration.test.ts
describe('Tags API (e2e)', () => {
  it('POST /api/v1/tags should create tag', async () => {
    // Integration test
  });
});

// apps/admin/test/e2e/tags.spec.ts
test('should create tag through UI', async ({ page }) => {
  // E2E test
});
```

**Wymagania:**
- ✅ Unit tests dla wszystkich services (>90% coverage)
- ✅ Integration tests dla wszystkich endpoints
- ✅ E2E tests dla krytycznych user flows
- ✅ Security tests dla tenant isolation
- ✅ Accessibility tests (axe-core)
- ✅ Error scenario tests
- ✅ Deterministic tests (no flaky tests)

#### 3.4.2 Coverage Report

```markdown
## Coverage Report

**Module:** Tags
**Coverage:** 92%

- Statements: 92%
- Branches: 90%
- Functions: 95%
- Lines: 92%

**Missing Coverage:**
- tags.service.ts: line 45 (error handling)
```

**Wymagania:**
- ✅ Coverage >85% dla całego modułu
- ✅ Coverage report w HTML
- ✅ Identified gaps w coverage

#### 3.4.3 Test Results

```markdown
## Test Results

**Unit Tests:**
- PASS: tags.service.spec.ts (45 tests)
- PASS: tags.controller.spec.ts (32 tests)

**Integration Tests:**
- PASS: tags.integration.test.ts (18 tests)

**E2E Tests:**
- PASS: tags.spec.ts (12 tests)

**Security Tests:**
- PASS: Tenant isolation verified ✅
- PASS: Authorization checks verified ✅

**Accessibility Tests:**
- PASS: 0 violations ✅

**Total:** 107 tests, 0 failures
```

#### 3.4.4 Release Notes

```markdown
## [Unreleased] - {date}

### Added
- [TNT-XXX] Tests: {Description}
  - Unit tests: {module} (>90% coverage)
  - Integration tests: {endpoints}
  - E2E tests: {scenarios}
  - Security tests: Tenant isolation verified
```

### 3.5 Przykład Kompletnego Outputu

```markdown
## Task: TNT-017 - Tags Feature Tests

### ✅ Tests Complete

**Files Created:**
- `apps/api/src/modules/tags/tags.service.spec.ts`
- `apps/api/src/modules/tags/tags.controller.spec.ts`
- `apps/api/test/tags.integration.test.ts`
- `apps/admin/test/components/tags/TagForm.test.tsx`
- `apps/admin/test/e2e/tags.spec.ts`

**Coverage:** 92%
- Unit tests: 95% coverage
- Integration tests: 90% coverage
- E2E tests: 12 scenarios

### ✅ Test Results

```
PASS  tags.service.spec.ts (45 tests)
PASS  tags.controller.spec.ts (32 tests)
PASS  tags.integration.test.ts (18 tests)
PASS  TagForm.test.tsx (15 tests)
PASS  tags.spec.ts (12 E2E tests)

Total: 122 tests, 0 failures
Coverage: 92%
Security: Tenant isolation verified ✅
Accessibility: 0 violations ✅
```

### ✅ Release Notes

```markdown
### Added
- [TNT-017] Tests: Comprehensive test suite for Tags feature
  - Unit tests: TagsService, TagsController (>90% coverage)
  - Integration tests: All tags endpoints
  - E2E tests: Tags management flow
  - Security tests: Tenant isolation verified
  - Accessibility tests: 0 violations
```
```

---

## 4. Infra DevOps

### 4.1 Zakres Obowiązków

**Infra DevOps** jest odpowiedzialny za infrastrukturę i deployment:

- **Containerization** - Docker images, Docker Compose
- **CI/CD Pipelines** - GitHub Actions, GitLab CI
- **Infrastructure as Code** - Terraform, Kubernetes manifests
- **Monitoring** - Prometheus, Grafana, logging
- **Deployment** - Staging, production deployments
- **Backup & Recovery** - Backup strategies, disaster recovery
- **Security** - Secrets management, security scanning
- **Performance** - Infrastructure optimization

**Stack Technologiczny:**
- **Containers:** Docker, Docker Compose
- **Orchestration:** Kubernetes (production)
- **CI/CD:** GitHub Actions, GitLab CI
- **Monitoring:** Prometheus, Grafana
- **Logging:** ELK Stack (Elasticsearch, Logstash, Kibana)
- **Secrets:** HashiCorp Vault, AWS Secrets Manager
- **Infrastructure:** Terraform, AWS/GCP/Azure

### 4.2 Wymagane Pliki Kontekstowe

**OBOWIĄZKOWE przed rozpoczęciem zadania:**

```yaml
required_files:
  - "context-instructions.md"          # Systemowe zasady
  - "docs/prd.md"                      # Wymagania infrastrukturalne
  - "docs/plan.md"                     # Zadanie do wykonania
  - "docker-compose.yml"               # Obecna konfiguracja Docker
  - ".github/workflows/ci.yml"         # Obecna konfiguracja CI/CD
  - "apps/api/package.json"             # Backend dependencies
  - "apps/admin/package.json"           # Frontend dependencies

recommended_files:
  - "kubernetes/**/*.yaml"             # K8s manifests (jeśli istnieją)
  - "terraform/**/*.tf"                # Terraform configs (jeśli istnieją)
  - ".env.example"                     # Environment variables
  - "scripts/**/*.sh"                  # Deployment scripts
```

**Proces czytania kontekstu:**
1. Przeczytaj `context-instructions.md` - zrozum standardy infra
2. Przeczytaj sekcję PRD - zrozum wymagania infrastrukturalne
3. Sprawdź obecną konfigurację Docker i CI/CD
4. Sprawdź istniejące deployment scripts
5. Sprawdź environment variables

### 4.3 Format Przyjmowania Zadań (Input)

**Standardowy format requestu:**

```yaml
agent: Infra DevOps
task_id: TNT-XXX
priority: P0 | P1 | P2 | P3
type: docker | cicd | monitoring | deployment | backup | security

context:
  prd_section: "NFR-004 Availability"
  plan_task: "TNT-020: CI/CD Pipeline Setup"
  related_tasks: ["TNT-001", "TNT-002"]

requirements:
  - "Setup CI/CD pipeline dla automatycznego deploymentu"
  - "Docker images dla backend i frontend"
  - "Monitoring i alerting"
  - "Backup strategy"

acceptance_criteria:
  - "CI pipeline uruchamia testy i buildy"
  - "CD pipeline deployuje do staging automatycznie"
  - "Monitoring działa i wysyła alerty"
  - "Backup działa automatycznie"

dependencies:
  - "TNT-001: Project Setup (completed)"
  - "TNT-002: Database Schema (completed)"

deliverables:
  - ".github/workflows/ci.yml"
  - ".github/workflows/cd.yml"
  - "Dockerfile (backend)"
  - "Dockerfile (frontend)"
  - "docker-compose.yml"
  - "scripts/deploy.sh"
  - "monitoring/prometheus.yml"

deadline: "2024-01-15"
```

**Przykład użycia:**
```markdown
**Task for Infra DevOps:**

Skonfiguruj CI/CD pipeline (TNT-020).

**Requirements:**
- GitHub Actions workflow
- Automatyczne testy i buildy
- Deployment do staging
- Monitoring setup

**Dependencies:** TNT-001, TNT-002 (completed)
```

### 4.4 Output Format

**Każde zadanie MUSI zawierać:**

#### 4.4.1 Konfiguracja (Configuration)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm test

# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN pnpm install
COPY . .
RUN pnpm build
CMD ["pnpm", "start"]
```

**Wymagania:**
- ✅ Docker images są zoptymalizowane (multi-stage builds)
- ✅ CI/CD pipelines są efektywne (caching, parallel jobs)
- ✅ Secrets są bezpiecznie przechowywane
- ✅ Monitoring jest skonfigurowany
- ✅ Backup strategy jest zaimplementowana

#### 4.4.2 Skrypty (Scripts)

```bash
#!/bin/bash
# scripts/deploy.sh
set -e
echo "Deploying to staging..."
# Deployment logic
```

**Wymagania:**
- ✅ Skrypty są idempotentne
- ✅ Skrypty mają error handling
- ✅ Skrypty są udokumentowane

#### 4.4.3 Dokumentacja

```markdown
# Deployment Guide

## Staging Deployment
1. Run tests
2. Build Docker images
3. Deploy to staging
4. Run smoke tests

## Production Deployment
1. Create backup
2. Deploy to production
3. Verify deployment
4. Monitor for issues
```

**Wymagania:**
- ✅ Deployment guide
- ✅ Troubleshooting guide
- ✅ Rollback procedure
- ✅ Monitoring setup guide

#### 4.4.4 Release Notes

```markdown
## [Unreleased] - {date}

### Added
- [TNT-XXX] Infrastructure: {Description}
  - CI/CD pipeline setup
  - Docker configuration
  - Monitoring setup
  - Backup strategy
```

### 4.5 Przykład Kompletnego Outputu

```markdown
## Task: TNT-020 - CI/CD Pipeline Setup

### ✅ Infrastructure Complete

**Files Created:**
- `.github/workflows/ci.yml`
- `.github/workflows/cd.yml`
- `Dockerfile` (backend)
- `Dockerfile` (frontend)
- `docker-compose.yml`
- `scripts/deploy.sh`
- `monitoring/prometheus.yml`

**Files Updated:**
- `.github/workflows/ci.yml` (enhanced)
- `docker-compose.yml` (added services)

### ✅ CI/CD Pipeline

**CI Pipeline:**
- ✅ Lint and type-check
- ✅ Run tests
- ✅ Build applications
- ✅ Generate coverage reports

**CD Pipeline:**
- ✅ Deploy to staging (automatic)
- ✅ Deploy to production (manual approval)
- ✅ Run smoke tests
- ✅ Rollback on failure

### ✅ Release Notes

```markdown
### Added
- [TNT-020] Infrastructure: CI/CD Pipeline Setup
  - GitHub Actions workflows
  - Docker configuration
  - Automated deployment to staging
  - Monitoring and alerting setup
```

### ✅ Documentation Updated

- Deployment Guide: Complete
- Troubleshooting Guide: Added
- Rollback Procedure: Documented
```

---

## 5. Doc Writer

### 5.1 Zakres Obowiązków

**Doc Writer** jest odpowiedzialny za dokumentację:

- **README Files** - dokumentacja projektów i modułów
- **API Documentation** - OpenAPI/Swagger documentation
- **Changelog** - historia zmian projektu
- **PR Notes** - release notes dla pull requests
- **User Guides** - przewodniki dla użytkowników
- **Developer Guides** - przewodniki dla deweloperów
- **Architecture Documentation** - dokumentacja architektury
- **Troubleshooting Guides** - przewodniki rozwiązywania problemów

**Stack Technologiczny:**
- **Format:** Markdown
- **API Docs:** OpenAPI 3.0 (YAML)
- **Diagrams:** Mermaid, PlantUML
- **Version Control:** Git (changelog)

### 5.2 Wymagane Pliki Kontekstowe

**OBOWIĄZKOWE przed rozpoczęciem zadania:**

```yaml
required_files:
  - "context-instructions.md"          # Systemowe zasady
  - "docs/prd.md"                      # Wymagania produktowe
  - "docs/plan.md"                     # Zadanie do wykonania
  - "CHANGELOG.md"                     # Obecny changelog
  - "README.md"                        # Obecny README
  - "docs/api/openapi.yaml"            # API documentation

recommended_files:
  - "docs/**/*.md"                     # Istniejąca dokumentacja
  - ".github/PULL_REQUEST_TEMPLATE.md" # PR template
  - "git log"                          # Historia commits
```

**Proces czytania kontekstu:**
1. Przeczytaj `context-instructions.md` - zrozum standardy dokumentacji
2. Przeczytaj sekcję PRD - zrozum wymagania
3. Sprawdź istniejącą dokumentację jako wzorce
4. Sprawdź git log dla zmian
5. Sprawdź PR descriptions

### 5.3 Format Przyjmowania Zadań (Input)

**Standardowy format requestu:**

```yaml
agent: Doc Writer
task_id: TNT-XXX
priority: P0 | P1 | P2 | P3
type: readme | changelog | api-docs | pr-notes | user-guide | dev-guide

context:
  prd_section: "FR-002.1 Content Types"
  plan_task: "TNT-007: Content Types API"
  related_tasks: ["TNT-007", "TNT-008", "TNT-017"]
  changes: ["Added Tags API", "Added Tags UI", "Added Tags tests"]

requirements:
  - "Zaktualizuj CHANGELOG.md z nowymi features"
  - "Dodaj API documentation dla tags endpoints"
  - "Stwórz PR notes dla tags feature"
  - "Zaktualizuj README z przykładami"

acceptance_criteria:
  - "CHANGELOG zawiera wszystkie zmiany"
  - "API docs są kompletne i poprawne"
  - "PR notes są zrozumiałe"
  - "README jest aktualny"

dependencies:
  - "TNT-007: Tags API (completed)"
  - "TNT-008: Tags UI (completed)"
  - "TNT-017: Tags Tests (completed)"

deliverables:
  - "CHANGELOG.md (updated)"
  - "docs/api/openapi.yaml (updated)"
  - ".github/PULL_REQUEST_TEMPLATE.md (if needed)"
  - "docs/guides/tags-usage.md"

deadline: "2024-01-15"
```

**Przykład użycia:**
```markdown
**Task for Doc Writer:**

Zaktualizuj dokumentację dla Tags feature (TNT-018).

**Requirements:**
- CHANGELOG update
- API documentation
- PR notes
- Usage examples

**Changes:** TNT-015, TNT-016, TNT-017 (all completed)
```

### 5.4 Output Format

**Każde zadanie MUSI zawierać:**

#### 5.4.1 Changelog

```markdown
## [Unreleased] - 2024-01-15

### Added
- [TNT-015] Feature: Tags API
  - POST /api/v1/tags - Create tag
  - GET /api/v1/tags - List tags
  - Multi-tenant isolation
  - Zod validation

- [TNT-016] Feature: Tags Admin UI
  - Page: /admin/tags
  - Component: TagForm
  - Accessibility: WCAG 2.1 AA compliant

- [TNT-017] Tests: Comprehensive test suite for Tags
  - Unit tests: >90% coverage
  - E2E tests: Tags management flow
  - Security tests: Tenant isolation verified

### Changed
- [TNT-018] Documentation: Updated API docs and guides
```

**Wymagania:**
- ✅ Wszystkie zmiany są udokumentowane
- ✅ Każda zmiana ma referencję do zadania (TNT-XXX)
- ✅ Breaking changes są wyraźnie oznaczone
- ✅ Format jest zgodny z Keep a Changelog

#### 5.4.2 API Documentation

```yaml
# docs/api/openapi.yaml
/api/v1/tags:
  post:
    summary: Create tag
    tags: [tags]
    security:
      - bearerAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateTagDto'
    responses:
      '201':
        description: Tag created
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Tag'
```

**Wymagania:**
- ✅ Wszystkie endpointy są udokumentowane
- ✅ Request/response schemas są poprawne
- ✅ Przykłady są działające
- ✅ Error responses są udokumentowane

#### 5.4.3 PR Notes

```markdown
## Summary
Implements Tags feature with API, UI, and comprehensive tests.

## Changes
- **Backend:** Tags API with CRUD endpoints
- **Frontend:** Tags admin UI with form and list
- **Tests:** Unit, integration, E2E, and security tests
- **Documentation:** Updated API docs and changelog

## Testing
- ✅ All tests passing (122 tests)
- ✅ Coverage: 92%
- ✅ Security: Tenant isolation verified
- ✅ Accessibility: 0 violations

## Checklist
- [x] Code follows project standards
- [x] Tests added/updated
- [x] Documentation updated
- [x] Changelog updated
```

**Wymagania:**
- ✅ Summary jest zwięzły i jasny
- ✅ Wszystkie zmiany są wymienione
- ✅ Testing status jest udokumentowany
- ✅ Checklist jest wypełniony

#### 5.4.4 README Updates

```markdown
## Tags Feature

Tags allow you to organize and categorize your content.

### Usage

```typescript
// Create tag
const tag = await tagsApi.create({
  name: 'Technology',
  slug: 'technology'
});

// List tags
const tags = await tagsApi.list();
```
```

**Wymagania:**
- ✅ Przykłady są działające
- ✅ Dokumentacja jest aktualna
- ✅ Usage examples są zrozumiałe

### 5.5 Przykład Kompletnego Outputu

```markdown
## Task: TNT-018 - Tags Feature Documentation

### ✅ Documentation Complete

**Files Updated:**
- `CHANGELOG.md` (added Tags feature entries)
- `docs/api/openapi.yaml` (added tags endpoints)
- `README.md` (added Tags usage examples)
- `docs/guides/tags-usage.md` (new guide)

**Files Created:**
- `docs/guides/tags-usage.md` - Complete usage guide
- `.github/PULL_REQUEST_TEMPLATE.md` - PR template

### ✅ Changelog Updated

```markdown
## [Unreleased] - 2024-01-15

### Added
- [TNT-015] Feature: Tags API
- [TNT-016] Feature: Tags Admin UI
- [TNT-017] Tests: Comprehensive test suite
```

### ✅ API Documentation Updated

- All tags endpoints documented
- Request/response schemas added
- Examples provided

### ✅ Release Notes

```markdown
## Tags Feature Release

### Summary
Complete Tags feature implementation with API, UI, tests, and documentation.

### Changes
- Backend: Tags API (TNT-015)
- Frontend: Tags UI (TNT-016)
- Tests: Comprehensive suite (TNT-017)
- Documentation: Complete (TNT-018)
```
```

---

## 6. Protokoły Komunikacji Między Agentami

### 6.1 Format Requestu

Gdy agent potrzebuje współpracy z innym agentem:

```yaml
from: {Agent Name}
to: {Agent Name}
task_id: TNT-XXX
type: collaboration_request | information_request | review_request

context:
  current_status: "Implementation completed"
  blockers: []
  questions: []

request:
  action: "Create integration tests for Tags API"
  deliverables: ["test files"]
  deadline: "2024-01-15"

dependencies:
  - "Backend implementation must be complete"
```

### 6.2 Format Response

```yaml
from: {Agent Name}
to: {Agent Name}
task_id: TNT-XXX
status: completed | in_progress | blocked

deliverables:
  - file: "path/to/file"
    status: completed
    coverage: 95%

findings:
  - type: bug
    severity: high
    description: "Issue description"
    file: "path/to/file"
    line: 45

next_steps:
  - "Action item 1"
  - "Action item 2"
```

### 6.3 Workflow Przykładowy

```
Main Agent → Backend Codex: "Implement Tags API (TNT-015)"
Backend Codex → QA Tester: "Request tests for Tags API"
QA Tester → Backend Codex: "Tests complete + issues found"
Backend Codex → Backend Codex: "Fix issues"
Backend Codex → Frontend Maestro: "API ready - integration info"
Frontend Maestro → QA Tester: "Request E2E tests"
QA Tester → Frontend Maestro: "E2E tests complete"
Frontend Maestro → Doc Writer: "Request documentation update"
Doc Writer → All: "Documentation updated"
```

---

## 7. Checklist Przed Rozpoczęciem Zadania

Każdy agent **MUSI** sprawdzić przed rozpoczęciem:

- [ ] Przeczytałem `context-instructions.md`
- [ ] Przeczytałem sekcję PRD związana z zadaniem
- [ ] Przeczytałem zadanie w `plan.md`
- [ ] Sprawdziłem wymagane pliki kontekstowe
- [ ] Zrozumiałem format inputu i outputu
- [ ] Sprawdziłem dependencies
- [ ] Zrozumiałem acceptance criteria

---

## 8. Metryki i Raportowanie

Każdy agent raportuje:

- **Completed Tasks** - liczba ukończonych zadań
- **Coverage** - test coverage (jeśli dotyczy)
- **Quality Metrics** - bugs found, issues fixed
- **Performance** - czas wykonania zadań
- **Blockers** - zablokowane zadania

**Format raportu tygodniowego:**
```markdown
## Weekly Report - {Agent Name} - Week {XX}

### Completed
- TNT-XXX: {Description} ✅

### In Progress
- TNT-YYY: {Description} 🔄 (50%)

### Blocked
- TNT-ZZZ: {Description} 🚫 (Blocked by: {reason})

### Metrics
- Coverage: {percentage}%
- Bugs Found: {count}
- Issues Fixed: {count}
```

---

**Ostatnia aktualizacja:** 2024-01-01  
**Wersja:** 1.0.0  
**Status:** Active


