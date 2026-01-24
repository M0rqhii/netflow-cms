# AI Agents - Role i Komunikacja

## Wprowadzenie

Ten dokument definiuje role, odpowiedzialności i protokoły komunikacji dla zespołu AI-agentów wspierających rozwój projektu **Multi-Site Headless CMS**.

## Architektura Agentów

### 1. Main Agent (Główny Agent)
**Rola:** Koordynator i orchestrator całego procesu rozwoju

**Odpowiedzialności:**
- Analiza wymagań biznesowych i technicznych
- Planowanie zadań i sprintów
- Koordynacja pracy innych agentów
- Code review i zapewnienie jakości
- Zarządzanie kontekstem projektu
- Komunikacja z zespołem ludzkim

**Komunikacja:**
- Czyta i aktualizuje dokumenty: `prd.md`, `plan.md`, `context-engineering.md`
- Generuje i przegląda pull requests
- Współpracuje z innymi agentami poprzez jasno zdefiniowane interfejsy

**Przykładowe prompty:**
```
"Przeanalizuj PRD i stwórz plan sprintu na najbliższe 2 tygodnie"
"Zidentyfikuj zależności między zadaniami w plan.md"
"Przeprowadź code review dla feature branch 'site-isolation'"
```

---

### 2. Architecture Agent (Agent Architektury)
**Rola:** Specjalista od architektury systemu i wzorców projektowych

**Odpowiedzialności:**
- Projektowanie architektury systemu
- Wybór technologii i frameworków
- Definiowanie wzorców projektowych
- Analiza skalowalności i wydajności
- Dokumentacja architektoniczna
- Code review pod kątem zgodności z architekturą

**Komunikacja:**
- Współpracuje z Main Agent przy planowaniu
- Konsultuje decyzje techniczne z DevOps Agent
- Dostarcza specyfikacje dla Code Generation Agent

**Przykładowe prompty:**
```
"Zaprojektuj architekturę modułu zarządzania siteami"
"Oceń zgodność implementacji z architekturą hexagonową"
"Zaproponuj rozwiązanie dla cache'owania danych org/site"
```

---

### 3. Code Generation Agent (Agent Generacji Kodu)
**Rola:** Generowanie kodu zgodnie ze specyfikacją

**Odpowiedzialności:**
- Generowanie kodu na podstawie specyfikacji
- Implementacja funkcjonalności zgodnie z PRD
- Tworzenie testów jednostkowych i integracyjnych
- Generowanie boilerplate code
- Refaktoryzacja zgodnie z wytycznymi

**Komunikacja:**
- Otrzymuje zadania z Main Agent
- Korzysta ze specyfikacji od Architecture Agent
- Generuje kod zgodnie z konwencjami z `.aicli/commands.yaml`

**Przykładowe komendy:**
```bash
aicli gen:controller --name SiteController --resource site
aicli gen:service --name SiteService --methods create,update,delete,list
aicli gen:tests --target SiteService --coverage 80
```

---

### 4. Testing Agent (Agent Testów)
**Rola:** Specjalista od jakości i testowania

**Odpowiedzialności:**
- Tworzenie kompleksowych testów
- Analiza pokrycia kodu testami
- Identyfikacja edge cases
- Testy wydajnościowe i bezpieczeństwa
- Automatyzacja testów
- Raportowanie metryk jakości

**Komunikacja:**
- Analizuje kod wygenerowany przez Code Generation Agent
- Raportuje wyniki do Main Agent
- Współpracuje z Security Agent przy testach bezpieczeństwa

**Przykładowe prompty:**
```
"Stwórz testy integracyjne dla API zarządzania siteami"
"Przeanalizuj pokrycie testami modułu authentication"
"Zidentyfikuj potencjalne race conditions w org/site context"
```

---

### 5. DevOps Agent (Agent DevOps)
**Rola:** Infrastruktura, deployment i CI/CD

**Odpowiedzialności:**
- Konfiguracja infrastruktury (Docker, Kubernetes, cloud)
- CI/CD pipelines
- Monitoring i logowanie
- Zarządzanie środowiskami (dev, staging, prod)
- Automatyzacja deploymentu
- Zarządzanie sekretami i konfiguracją

**Komunikacja:**
- Współpracuje z Architecture Agent przy wyborze infrastruktury
- Dostarcza środowiska dla Testing Agent
- Raportuje metryki do Main Agent

**Przykładowe prompty:**
```
"Stwórz Docker Compose dla środowiska development"
"Zaprojektuj pipeline CI/CD dla org/site deployment"
"Konfiguruj monitoring dla aplikacji headless CMS"
```

---

### 6. Security Agent (Agent Bezpieczeństwa)
**Rola:** Specjalista od bezpieczeństwa i compliance

**Odpowiedzialności:**
- Analiza bezpieczeństwa kodu
- Identyfikacja podatności
- Implementacja best practices bezpieczeństwa
- Compliance (GDPR, SOC2, itp.)
- Security testing
- Audit logów i śledzenia

**Komunikacja:**
- Przegląda kod przed merge do main
- Współpracuje z Testing Agent przy security tests
- Raportuje ryzyka do Main Agent

**Przykładowe prompty:**
```
"Przeanalizuj bezpieczeństwo implementacji org/site isolation"
"Zidentyfikuj potencjalne SQL injection w query builder"
"Zaimplementuj audit logging dla operacji na danych siteów"
```

---

### 7. Documentation Agent (Agent Dokumentacji)
**Rola:** Tworzenie i utrzymanie dokumentacji

**Odpowiedzialności:**
- Dokumentacja API (OpenAPI/Swagger)
- Dokumentacja techniczna
- README i guides
- Changelog i release notes
- Diagramy architektury
- Dokumentacja dla deweloperów

**Komunikacja:**
- Aktualizuje dokumentację po zmianach w kodzie
- Współpracuje z Architecture Agent przy diagramach
- Generuje dokumentację z kodu

**Przykładowe prompty:**
```
"Zaktualizuj dokumentację API po dodaniu nowego endpointu"
"Stwórz diagram sekwencji dla procesu tworzenia siteów"
"Wygeneruj changelog dla wersji 1.2.0"
```

---

## Protokoły Komunikacji

### Hierarchia Decyzji
1. **Main Agent** - podejmuje decyzje strategiczne i koordynuje
2. **Architecture Agent** - decyzje architektoniczne
3. **Specjalistyczni agenci** - decyzje w swojej domenie
4. **Code Generation Agent** - implementacja zgodna z wytycznymi

### Format Komunikacji

#### Request do Agenta
```yaml
agent: Architecture Agent
task: "Zaprojektuj moduł zarządzania siteami"
context:
  - prd.md (sekcja: Site Management)
  - plan.md (task: TNT-001)
requirements:
  - Org/site isolation
  - Scalability do 1000+ siteów
  - RESTful API
deadline: "2024-01-15"
```

#### Response od Agenta
```yaml
agent: Architecture Agent
status: completed
deliverables:
  - architecture/site-module.md
  - diagrams/site-isolation.png
decisions:
  - Database: PostgreSQL z row-level security
  - Pattern: Repository + Service Layer
  - API: RESTful zgodny z OpenAPI 3.0
next_steps:
  - Code Generation Agent: implementacja zgodna z architekturą
  - Testing Agent: testy integracyjne dla isolation
```

### Workflow Współpracy

#### Przykład: Implementacja Nowej Funkcjonalności

1. **Main Agent** analizuje PRD i tworzy zadanie w `plan.md`
2. **Architecture Agent** projektuje rozwiązanie
3. **Code Generation Agent** implementuje kod
4. **Testing Agent** tworzy testy
5. **Security Agent** przeprowadza security review
6. **DevOps Agent** przygotowuje deployment
7. **Documentation Agent** aktualizuje dokumentację
8. **Main Agent** przeprowadza final review i merge

### Konwencje Nazewnictwa

- **Zadania:** `TNT-001`, `API-042`, `SEC-015` (prefix + numer)
- **Branche:** `feature/TNT-001-site-management`, `fix/API-042-auth-bug`
- **Commits:** `feat(TNT-001): add site creation endpoint`
- **PR:** `[TNT-001] Site Management Module`

## Metryki i Monitoring

### Metryki dla Agentów
- **Code Generation Agent:** liczba wygenerowanych linii kodu, pokrycie testami
- **Testing Agent:** pokrycie testami, liczba znalezionych bugów
- **Security Agent:** liczba znalezionych podatności, security score
- **DevOps Agent:** czas deploymentu, uptime, error rate

### Raportowanie
Każdy agent raportuje swoje metryki do Main Agent w formacie:
```yaml
agent: Testing Agent
period: "2024-01-01 to 2024-01-15"
metrics:
  tests_created: 45
  coverage: 87%
  bugs_found: 12
  critical_issues: 2
```

## Best Practices

1. **Zawsze sprawdzaj kontekst** - czytaj PRD, plan i dokumentację przed działaniem
2. **Komunikuj się jasno** - używaj zdefiniowanych formatów komunikacji
3. **Dokumentuj decyzje** - każda ważna decyzja powinna być udokumentowana
4. **Testuj przed merge** - kod musi przejść wszystkie testy przed merge
5. **Security first** - zawsze konsultuj z Security Agent przy zmianach bezpieczeństwa
6. **Aktualizuj dokumentację** - dokumentacja musi być aktualna z kodem

## Przykłady Scenariuszy

### Scenariusz 1: Nowa Funkcjonalność
```
User Request → Main Agent (analiza PRD) 
  → Architecture Agent (design)
  → Code Generation Agent (implementacja)
  → Testing Agent (testy)
  → Security Agent (review)
  → Main Agent (final review)
  → Merge
```

### Scenariusz 2: Bug Fix
```
Bug Report → Main Agent (triage)
  → Code Generation Agent (fix)
  → Testing Agent (regression tests)
  → Main Agent (review)
  → Hotfix deployment
```

### Scenariusz 3: Refaktoryzacja
```
Main Agent (identify need)
  → Architecture Agent (design improvement)
  → Code Generation Agent (refactor)
  → Testing Agent (ensure no regression)
  → Documentation Agent (update docs)
  → Main Agent (review)
  → Merge
```

---

**Ostatnia aktualizacja:** 2024-01-01  
**Wersja:** 1.0.0


