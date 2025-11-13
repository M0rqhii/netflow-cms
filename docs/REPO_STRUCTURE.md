# Struktura Repozytorium - Monorepo
## Multi-Tenant Headless CMS

Typ: Monorepo (Turborepo)  
Package Manager: pnpm  
AI-Assisted Development: Enabled

---

## Drzewo Katalogów

```
repo/
├─ docs/                          # Dokumentacja projektu
│  ├─ agents.md                   # Role i komunikacja AI agentów
│  ├─ prd.md                      # Product Requirements Document
│  ├─ plan.md                     # Plan sprintu/zadań
│  ├─ context-engineering.md      # Instrukcje dla głównego agenta
│  └─ api/
│     └─ openapi.yaml             # OpenAPI specification
│
├─ apps/                          # Aplikacje (workspaces)
│  ├─ api/                        # Backend API (NestJS + Prisma)
│  │  ├─ src/
│  │  │  ├─ modules/              # Feature modules
│  │  │  ├─ common/               # Shared utilities
│  │  │  └─ main.ts               # Entry point
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma         # Database schema
│  │  │  └─ migrations/           # Database migrations
│  │  ├─ test/                    # Test files
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  │
│  └─ admin/                      # Admin Panel (Next.js + React)
│     ├─ app/                     # Next.js App Router
│     ├─ components/              # React components
│     ├─ lib/                     # Utilities
│     ├─ public/                  # Static assets
│     ├─ package.json
│     └─ next.config.js
│
├─ packages/                      # Wspólne pakiety (workspaces)
│  ├─ sdk/                        # TypeScript SDK dla API
│  │  ├─ src/
│  │  │  ├─ client.ts             # API client
│  │  │  ├─ types.ts              # TypeScript types
│  │  │  └─ index.ts              # Public exports
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  │
│  ├─ schemas/                    # Shared Zod schemas
│  │  ├─ src/
│  │  │  ├─ tenant.schema.ts
│  │  │  ├─ content.schema.ts
│  │  │  └─ index.ts
│  │  ├─ package.json
│  │  └─ tsconfig.json
│  │
│  └─ ui/                         # Shared UI components
│     ├─ src/
│     │  ├─ components/           # React components
│     │  ├─ hooks/                # React hooks
│     │  └─ index.ts
│     ├─ package.json
│     └─ tsconfig.json
│
├─ .github/                       # GitHub Configuration
│  └─ workflows/
│     └─ ci.yml                   # CI/CD Pipeline
│
├─ .vscode/                       # VS Code settings
│  └─ settings.json               # Workspace settings
│
├─ package.json                   # Root package.json (workspace)
├─ pnpm-workspace.yaml            # pnpm workspace config
├─ turbo.json                     # Turborepo config
├─ tsconfig.json                  # Root TypeScript config
├─ .eslintrc.js                   # ESLint config
├─ .prettierrc                    # Prettier config
├─ .gitignore                     # Git ignore rules
├─ context-instructions.md        # Systemowe zasady AI
└─ README.md                      # Główny README
```

---

## Opis Katalogów

### `/docs` — Dokumentacja Projektu
- agents.md — role AI i komunikacja
- prd.md — wymagania produktowe
- plan.md — plan sprintu
- api/openapi.yaml — specyfikacja API

### `/apps/api` — Backend (NestJS + Prisma)
- src/ — moduły, warstwa common, entry point
- prisma/ — schema i migracje
- test/ — testy jednostkowe i e2e

### `/apps/admin` — Frontend (Next.js)
- app/, components/, lib/, public/

### `/packages` — Wspólne pakiety
- sdk, schemas, ui — współdzielone typy, klient, komponenty

---

Ostatnia aktualizacja: 2025-11-09  
Wersja: 1.0.0

