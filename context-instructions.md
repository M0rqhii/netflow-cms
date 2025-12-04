# Context Instructions - Systemowe Zasady Dzia�ania AI

Wersja: 1.0.0  
Data: 2024-01-01  
Status: Active  
Projekt: Multi-Tenant Headless CMS

---

## 1. Wprowadzenie

Ten dokument definiuje systemowe zasady dzia�ania dla wszystkich sesji AI w projekcie. Jest to �r�d�o prawdy (source of truth) dla:
- G��wnego agenta-architekta (user)
- Wszystkich subagent�w AI (backend, frontend, tests, infra)
- Proces�w i workflow
- Standard�w technicznych i jako�ciowych

WA�NE: Ka�da sesja AI MUSI przestrzega� zasad zdefiniowanych w tym dokumencie.

---

## 2. Architektura Systemu - Dwa Poziomy Panel�w

### 2.1 Platform Panel (TERAZ) - Panel Zarz�dzania Platform�

**Cel:** G��wny panel administracyjny do zarz�dzania wszystkimi stronami, u�ytkownikami, p�atno�ciami i kontem.

**Funkcjonalno�ci:**
- Zarz�dzanie stronami (sites) - lista, tworzenie, szczeg��y
- Zarz�dzanie u�ytkownikami - role, zaproszenia, uprawnienia per site
- Zarz�dzanie p�atno�ciami - subskrypcje, faktury, plany
- Zarz�dzanie kontem - profil, dane fakturowe, has�o

**Status:** ✅ **IMPLEMENTOWANY** - Obecny focus projektu

**Dokumentacja:**
- `docs/admin-panel-refactoring-plan.md` - Plan refaktoryzacji Platform Panel
- `docs/admin-panel-documentation.md` - Dokumentacja techniczna Platform Panel

---

### 2.2 Site Panel / Page Builder (NA P��NIEJ) - Panel Konkretnej Strony

**Cel:** Panel do zarz�dzania tre�ci� i budowania stron dla konkretnej strony (site).

**Funkcjonalno�ci:**
- Page Builder - drag & drop edytor stron (jak Elementor/Webflow)
- Content Management - kolekcje, typy tre�ci, media
- Site Settings - domena, SEO, ustawienia strony

**Status:** ⏳ **PLANOWANY** - Do implementacji po zako�czeniu Platform Panel

**Uwaga:** Page Builder i Site Panel s� odk�adane na p��niej. Obecnie skupiamy si� wy��cznie na Platform Panel.

---

## 3. Rola G��wnego Architekta (User)

### 2.1 Definicja Roli
- Strategiczny decydent
- Product Owner
- Quality Gatekeeper
- Orchestrator
- Reviewer

### 2.2 Odpowiedzialno�ci
- Definiowanie wymaga� (docs/prd.md)
- Planowanie zada� (docs/plan.md)
- Code review i quality
- Komunikacja z subagentami

---

## 4. Przekazywanie Kontekstu

Hierarchia dokument�w:
1) docs/prd.md � wymagania (CO)
2) docs/plan.md � plan (JAK/KIEDY)
3) docs/agents.md � role i komunikacja (KTO/JAK)
4) docs/admin-panel-refactoring-plan.md � szczeg��owy plan Platform Panel

**WA�NE:** Przed rozpocz�ciem pracy nad Platform Panel, przeczytaj:
- `docs/admin-panel-refactoring-plan.md` - szczeg��owy plan implementacji
- `docs/admin-panel-documentation.md` - dokumentacja techniczna

Workflow przed zadaniem: przeczytaj PRD � Plan � Agents � Context Instructions � Admin Panel Plan.

---

## 5. Struktura Zada�

Atomic Task = Output + Tests + Release Notes + Documentation
- Output zgodny ze standardami i izolacj� tenant�w
- Testy (unit/E2E), coverage >80%
- Notatki i dokumentacja zaktualizowane

---

## 6. Standardy Techniczne
- TypeScript strict, ESLint + Prettier
- RBAC, JWT, RLS (PostgreSQL)
- Multi-tenant isolation
- API: REST, ETag, optimistic locking

---

## 7. Workflow
1) Utw�rz branch z develop
2) Implementuj zgodnie z planem
3) Pisz testy i uruchamiaj CI
4) Aktualizuj dokumentacj�
5) PR i code review