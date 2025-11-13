# Context Instructions - Systemowe Zasady Dzia³ania AI

Wersja: 1.0.0  
Data: 2024-01-01  
Status: Active  
Projekt: Multi-Tenant Headless CMS

---

## 1. Wprowadzenie

Ten dokument definiuje systemowe zasady dzia³ania dla wszystkich sesji AI w projekcie. Jest to Ÿród³o prawdy (source of truth) dla:
- G³ównego agenta-architekta (user)
- Wszystkich subagentów AI (backend, frontend, tests, infra)
- Procesów i workflow
- Standardów technicznych i jakoœciowych

WA¯NE: Ka¿da sesja AI MUSI przestrzegaæ zasad zdefiniowanych w tym dokumencie.

---

## 2. Rola G³ównego Architekta (User)

### 2.1 Definicja Roli
- Strategiczny decydent
- Product Owner
- Quality Gatekeeper
- Orchestrator
- Reviewer

### 2.2 Odpowiedzialnoœci
- Definiowanie wymagañ (docs/prd.md)
- Planowanie zadañ (docs/plan.md)
- Code review i quality
- Komunikacja z subagentami

---

## 3. Przekazywanie Kontekstu

Hierarchia dokumentów:
1) docs/prd.md — wymagania (CO)
2) docs/plan.md — plan (JAK/KIEDY)
3) docs/agents.md — role i komunikacja (KTO/JAK)

Workflow przed zadaniem: przeczytaj PRD › Plan › Agents › Context Instructions.

---

## 4. Struktura Zadañ

Atomic Task = Output + Tests + Release Notes + Documentation
- Output zgodny ze standardami i izolacj¹ tenantów
- Testy (unit/E2E), coverage >80%
- Notatki i dokumentacja zaktualizowane

---

## 5. Standardy Techniczne
- TypeScript strict, ESLint + Prettier
- RBAC, JWT, RLS (PostgreSQL)
- Multi-tenant isolation
- API: REST, ETag, optimistic locking

---

## 6. Workflow
1) Utwórz branch z develop
2) Implementuj zgodnie z planem
3) Pisz testy i uruchamiaj CI
4) Aktualizuj dokumentacjê
5) PR i code review