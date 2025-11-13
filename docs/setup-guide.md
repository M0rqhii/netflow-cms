# Setup Guide - AI-Assisted Coding Environment
## Instrukcje Uruchomienia Środowiska

**Wersja:** 1.0.0  
**Data:** 2024-01-01  
**Status:** Active

---

## Wprowadzenie

Ten dokument zawiera **kompletne instrukcje** krok po kroku do uruchomienia środowiska AI-assisted coding dla projektu Multi-Tenant Headless CMS.

**Czas potrzebny:** ~30-60 minut  
**Wymagania:** Node.js 18+, pnpm 8+, Git, PostgreSQL 14+, Docker (opcjonalnie)

---

## Krok 1: Inicjalizacja Repozytorium

### 1.1 Utworzenie Nowego Repozytorium

```bash
# Utwórz nowy katalog projektu
mkdir netflow-cms
cd netflow-cms

# Inicjalizuj Git repository
git init
git branch -M main

# Utwórz .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Build outputs
dist/
build/
.next/
out/

# Environment variables
.env
.env*.local
.env.production

# Testing
coverage/
.nyc_output/

# Logs
logs/
*.log

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Turbo
.turbo/

# Prisma
prisma/migrations/*.sql
!prisma/migrations/.gitkeep
EOF

# Pierwszy commit
git add .gitignore
git commit -m "chore: initial commit with gitignore"
```

### 1.2 Utworzenie Struktury Katalogów

```bash
# Utwórz strukturę katalogów
mkdir -p docs
mkdir -p apps/api/src/{modules,common/{guards,decorators,filters,interceptors,pipes}}
mkdir -p apps/api/prisma/migrations
mkdir -p apps/api/test
mkdir -p apps/admin/app/{\(auth\),\(dashboard\)/\[tenant\]}
mkdir -p apps/admin/components
mkdir -p apps/admin/lib
mkdir -p apps/admin/public
mkdir -p apps/admin/test/{unit,integration,e2e,fixtures}
mkdir -p packages/{sdk,schemas,ui}/src
mkdir -p .aicli
mkdir -p .github/workflows
mkdir -p .vscode
mkdir -p scripts
mkdir -p backups
mkdir -p monitoring

# Utwórz pliki .gitkeep dla pustych katalogów
find . -type d -empty -exec touch {}/.gitkeep \;

echo "✅ Struktura katalogów utworzona"
```

---

## Krok 2: Dodanie Plików Konfiguracyjnych

### 2.1 Root Package.json

```bash
cat > package.json << 'EOF'
{
  "name": "netflow-cms",
  "version": "1.0.0",
  "private": true,
  "description": "Multi-Tenant Headless CMS - Monorepo",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "test:coverage": "turbo run test:coverage",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",
    "type-check": "turbo run type-check",
    "clean": "turbo run clean && rm -rf node_modules",
    "db:migrate": "pnpm --filter api db:migrate",
    "db:generate": "pnpm --filter api db:generate",
    "db:studio": "pnpm --filter api db:studio"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "prettier": "^3.1.0",
    "turbo": "^1.11.0",
    "typescript": "^5.3.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.15.0"
}
EOF
```

### 2.2 pnpm Workspace Config

```bash
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF
```

### 2.3 Turborepo Config

```bash
cat > turbo.json << 'EOF'
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [
    "**/.env.*local"
  ],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "test:coverage": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    },
    "type-check": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "clean": {
      "cache": false
    }
  }
}
EOF
```

### 2.4 TypeScript Config

```bash
cat > tsconfig.json << 'EOF'
{
  "$schema": "https://json.schemastore.org/tsconfig.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "commonjs",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@repo/sdk": ["./packages/sdk/src"],
      "@repo/schemas": ["./packages/schemas/src"],
      "@repo/ui": ["./packages/ui/src"]
    }
  },
  "exclude": ["node_modules", "dist", ".next", "coverage"]
}
EOF
```

### 2.5 ESLint Config

```bash
cat > .eslintrc.js << 'EOF'
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.json', './apps/*/tsconfig.json', './packages/*/tsconfig.json']
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }]
  },
  ignorePatterns: ['node_modules', 'dist', '.next', 'coverage', '*.config.js']
};
EOF
```

### 2.6 Prettier Config

```bash
cat > .prettierrc << 'EOF'
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
EOF
```

### 2.7 VS Code Settings

```bash
cat > .vscode/settings.json << 'EOF'
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  "files.exclude": {
    "**/.git": true,
    "**/.DS_Store": true,
    "**/node_modules": true,
    "**/.next": true,
    "**/dist": true,
    "**/.turbo": true
  }
}
EOF
```

```bash
echo "✅ Pliki konfiguracyjne utworzone"
```

---

## Krok 3: Instalacja Dependencies

### 3.1 Instalacja pnpm (jeśli nie jest zainstalowany)

```bash
# Sprawdź czy pnpm jest zainstalowany
if ! command -v pnpm &> /dev/null; then
  echo "Instalowanie pnpm..."
  npm install -g pnpm@8.15.0
else
  echo "pnpm już zainstalowany: $(pnpm --version)"
fi
```

### 3.2 Instalacja Dependencies

```bash
# Zainstaluj wszystkie dependencies
pnpm install

# Sprawdź instalację
pnpm list --depth=0

echo "✅ Dependencies zainstalowane"
```

---

## Krok 4: Konfiguracja Backend API

### 4.1 Utworzenie Package.json dla API

```bash
cat > apps/api/package.json << 'EOF'
{
  "name": "@repo/api",
  "version": "1.0.0",
  "private": true,
  "description": "Backend API - NestJS + Prisma",
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "lint": "eslint \"{src,test}/**/*.ts\"",
    "type-check": "tsc --noEmit",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@prisma/client": "^5.7.0",
    "@repo/schemas": "workspace:*",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.2.1",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "@types/node": "^20.10.0",
    "jest": "^29.7.0",
    "prisma": "^5.7.0",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.1",
    "typescript": "^5.3.0"
  }
}
EOF
```

### 4.2 Konfiguracja Prisma

```bash
# Utwórz Prisma schema (podstawowy)
cat > apps/api/prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id        String   @id @default(uuid())
  name      String
  slug      String   @unique
  plan      String   @default("free")
  settings  Json     @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("tenants")
}
EOF

# Utwórz .env.example
cat > apps/api/.env.example << 'EOF'
DATABASE_URL="postgresql://user:password@localhost:5432/netflow_cms?schema=public"
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=1h
REDIS_URL=redis://localhost:6379
EOF

# Skopiuj .env.example do .env (użytkownik musi edytować)
cp apps/api/.env.example apps/api/.env

echo "⚠️  Edytuj apps/api/.env i ustaw DATABASE_URL"
```

### 4.3 Setup Database

```bash
# Generuj Prisma Client
pnpm --filter api db:generate

# Utwórz migrację
pnpm --filter api db:migrate --name init

echo "✅ Backend API skonfigurowany"
```

---

## Krok 5: Konfiguracja Frontend Admin

### 5.1 Utworzenie Package.json dla Admin

```bash
cat > apps/admin/package.json << 'EOF'
{
  "name": "@repo/admin",
  "version": "1.0.0",
  "private": true,
  "description": "Admin Panel - Next.js + React",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:coverage": "vitest --coverage"
  },
  "dependencies": {
    "@repo/sdk": "workspace:*",
    "@repo/schemas": "workspace:*",
    "@repo/ui": "workspace:*",
    "next": "^14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zod": "^3.22.4",
    "zustand": "^4.4.7"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.0",
    "vitest": "^1.0.0"
  }
}
EOF
```

### 5.2 Next.js Config

```bash
cat > apps/admin/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@repo/ui', '@repo/sdk', '@repo/schemas'],
  env: {
    API_URL: process.env.API_URL || 'http://localhost:4000',
  },
};

module.exports = nextConfig;
EOF
```

### 5.3 Environment Variables

```bash
cat > apps/admin/.env.example << 'EOF'
API_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
EOF

cp apps/admin/.env.example apps/admin/.env.local

echo "✅ Frontend Admin skonfigurowany"
```

---

## Krok 6: Konfiguracja Shared Packages

### 6.1 Packages Schemas

```bash
cat > packages/schemas/package.json << 'EOF'
{
  "name": "@repo/schemas",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "zod": "^3.22.4"
  }
}
EOF

cat > packages/schemas/src/index.ts << 'EOF'
// Shared Zod Schemas
export {};
EOF
```

### 6.2 Packages SDK

```bash
cat > packages/sdk/package.json << 'EOF'
{
  "name": "@repo/sdk",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "zod": "^3.22.4"
  }
}
EOF

cat > packages/sdk/src/index.ts << 'EOF'
// TypeScript SDK for API
export {};
EOF
```

### 6.3 Packages UI

```bash
cat > packages/ui/package.json << 'EOF'
{
  "name": "@repo/ui",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "peerDependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
EOF

cat > packages/ui/src/index.ts << 'EOF'
// Shared UI Components
export {};
EOF
```

```bash
echo "✅ Shared packages skonfigurowane"
```

---

## Krok 7: Dodanie Dokumentacji AI

### 7.1 Skopiuj Pliki Dokumentacji

```bash
# Utwórz podstawowe pliki dokumentacji (jeśli nie istnieją)
# Te pliki powinny być już utworzone wcześniej, ale sprawdźmy:

if [ ! -f "context-instructions.md" ]; then
  echo "⚠️  Brakuje context-instructions.md - utwórz go ręcznie"
fi

if [ ! -f "docs/prd.md" ]; then
  echo "⚠️  Brakuje docs/prd.md - utwórz go ręcznie"
fi

if [ ! -f "docs/plan.md" ]; then
  echo "⚠️  Brakuje docs/plan.md - utwórz go ręcznie"
fi

if [ ! -f "docs/agents.md" ]; then
  echo "⚠️  Brakuje docs/agents.md - utwórz go ręcznie"
fi

if [ ! -f ".aicli/commands.yaml" ]; then
  echo "⚠️  Brakuje .aicli/commands.yaml - utwórz go ręcznie"
fi

echo "✅ Dokumentacja sprawdzona"
```

---

## Krok 8: Konfiguracja Git i Pierwszy Commit

### 8.1 Git Setup

```bash
# Dodaj wszystkie pliki
git add .

# Pierwszy commit
git commit -m "chore: initial project setup with AI-assisted coding structure"

# Utwórz branch develop
git checkout -b develop

echo "✅ Git repository skonfigurowany"
```

### 8.2 GitHub Setup (opcjonalnie)

```bash
# Jeśli chcesz dodać remote (zamień na swoje repo)
# git remote add origin https://github.com/your-username/netflow-cms.git
# git push -u origin main

echo "ℹ️  Dodaj remote repository jeśli chcesz"
```

---

## Krok 9: Weryfikacja Instalacji

### 9.1 Sprawdzenie Instalacji

```bash
# Sprawdź czy wszystko działa
echo "🔍 Sprawdzanie instalacji..."

# Sprawdź Node.js
node --version
echo "✅ Node.js: $(node --version)"

# Sprawdź pnpm
pnpm --version
echo "✅ pnpm: $(pnpm --version)"

# Sprawdź TypeScript
pnpm exec tsc --version
echo "✅ TypeScript zainstalowany"

# Sprawdź czy dependencies są zainstalowane
if [ -d "node_modules" ]; then
  echo "✅ Dependencies zainstalowane"
else
  echo "❌ Dependencies nie zainstalowane - uruchom: pnpm install"
fi

# Sprawdź strukturę
echo "📁 Struktura projektu:"
tree -L 2 -I 'node_modules' || find . -maxdepth 2 -type d | grep -v node_modules | head -20

echo "✅ Weryfikacja zakończona"
```

### 9.2 Test Build

```bash
# Spróbuj zbudować projekt
echo "🔨 Testowanie builda..."

# Build wszystkich workspace'ów
pnpm build || echo "⚠️  Build nie powiódł się - to normalne na początku projektu"

echo "✅ Test build zakończony"
```

---

## Krok 10: Konfiguracja AI Models

### 10.1 Przygotowanie Promptów dla AI

Utwórz plik z promptami systemowymi dla różnych modeli:

```bash
cat > .ai-prompts/system-prompt.txt << 'EOF'
# System Prompt dla AI-Assisted Coding

Jesteś częścią zespołu AI-agentów pracujących nad projektem Multi-Tenant Headless CMS.

## Twoja Rola
- Backend Codex: Specjalista od NestJS + Prisma + PostgreSQL
- Frontend Maestro: Specjalista od Next.js + React + Tailwind
- QA Tester: Specjalista od testów (Vitest + Playwright)
- Infra DevOps: Specjalista od Docker + CI/CD
- Doc Writer: Specjalista od dokumentacji

## Zasady
1. Zawsze czytaj context-instructions.md przed rozpoczęciem
2. Sprawdzaj docs/prd.md dla wymagań
3. Sprawdzaj docs/plan.md dla zadań
4. Używaj .aicli/commands.yaml do generowania kodu
5. Zawsze dodawaj tenantId dla multi-tenant isolation
6. Testy są obowiązkowe (>80% coverage)
7. Dokumentacja musi być aktualna

## Format Outputu
- Kod zgodny ze standardami projektu
- Testy jednostkowe i integracyjne
- Release notes
- Aktualizacja dokumentacji
EOF

echo "✅ System prompt utworzony"
```

---

## Konfiguracja Różnych Modeli AI

### 10.2 ChatGPT (OpenAI)

**Jak dodać prompt:**

1. **Otwórz ChatGPT** (chat.openai.com)
2. **Utwórz nowy chat**
3. **Wklej system prompt:**

```
Jesteś Backend Codex - specjalistą od NestJS + Prisma + PostgreSQL.

Przeczytaj te dokumenty przed rozpoczęciem:
- context-instructions.md
- docs/prd.md (sekcja FR-XXX)
- docs/plan.md (zadanie TNT-XXX)
- .aicli/commands.yaml

Zadanie: [OPISZ ZADANIE]

Wymagania:
- [LISTA WYMAGAŃ]

Output:
- Kod zgodny ze standardami
- Testy (>80% coverage)
- Release notes
```

**Rekomendacje dla ChatGPT:**
- ✅ **Planning** - GPT-4: Doskonały do analizy wymagań i planowania
- ✅ **Code Generation** - GPT-4: Bardzo dobry do generowania kodu
- ✅ **Code Review** - GPT-4: Dobry do przeglądania kodu
- ⚠️ **Tests** - GPT-4: Dobry, ale wymaga weryfikacji
- ⚠️ **Infra** - GPT-4: Średni, lepiej użyć specjalistycznych narzędzi

**Przykład użycia:**
```bash
# Utwórz skrypt do szybkiego uruchomienia
cat > scripts/chatgpt-prompt.sh << 'EOF'
#!/bin/bash
TASK_ID=$1
PRD_SECTION=$2

cat << PROMPT
Jesteś Backend Codex pracujący nad zadaniem $TASK_ID.

Przeczytaj:
- context-instructions.md
- docs/prd.md (sekcja $PRD_SECTION)
- docs/plan.md (zadanie $TASK_ID)

Zadanie: [OPISZ ZADANIE TUTAJ]

Wymagania:
- [LISTA WYMAGAŃ]

Output:
- Kod + Testy + Release Notes
PROMPT
EOF

chmod +x scripts/chatgpt-prompt.sh
```

### 10.3 Claude (Anthropic)

**Jak dodać prompt:**

1. **Otwórz Claude** (claude.ai)
2. **Utwórz nowy conversation**
3. **Wklej system prompt:**

```
Jesteś Frontend Maestro - specjalistą od Next.js + React + Tailwind.

Przeczytaj te dokumenty:
- context-instructions.md
- docs/prd.md
- docs/plan.md
- docs/subagents-config.md (sekcja Frontend Maestro)

Zadanie: [OPISZ ZADANIE]

Wymagania:
- [LISTA WYMAGAŃ]
- Accessibility WCAG 2.1 AA
- Responsive design

Output:
- Komponenty React + Testy + Release Notes
```

**Rekomendacje dla Claude:**
- ✅ **Planning** - Claude 3 Opus: Doskonały do strategicznego planowania
- ✅ **Code Generation** - Claude 3 Sonnet: Bardzo dobry do generowania kodu
- ✅ **Code Review** - Claude 3 Opus: Doskonały do szczegółowego review
- ✅ **Documentation** - Claude 3 Sonnet: Doskonały do pisania dokumentacji
- ⚠️ **Tests** - Claude 3 Sonnet: Dobry, ale wymaga weryfikacji
- ⚠️ **Infra** - Claude 3 Sonnet: Średni

**Przykład użycia:**
```bash
cat > scripts/claude-prompt.sh << 'EOF'
#!/bin/bash
AGENT=$1  # backend|frontend|qa|infra|docs
TASK_ID=$2

cat << PROMPT
Jesteś $AGENT agent pracujący nad zadaniem $TASK_ID.

Przeczytaj:
- context-instructions.md
- docs/subagents-config.md (sekcja $AGENT)
- docs/plan.md (zadanie $TASK_ID)

Zadanie: [OPISZ ZADANIE]

Output zgodny z formatem z subagents-config.md
PROMPT
EOF

chmod +x scripts/claude-prompt.sh
```

### 10.4 Gemini (Google)

**Jak dodać prompt:**

1. **Otwórz Gemini** (gemini.google.com)
2. **Utwórz nowy chat**
3. **Wklej system prompt:**

```
Jesteś QA Tester - specjalistą od testów (Vitest + Playwright).

Przeczytaj:
- context-instructions.md
- docs/subagents-config.md (sekcja QA Tester)
- docs/plan.md

Zadanie: [OPISZ ZADANIE]

Wymagania:
- Unit tests (>90% coverage)
- Integration tests
- E2E tests
- Security tests

Output:
- Testy + Coverage Report + Release Notes
```

**Rekomendacje dla Gemini:**
- ✅ **Code Generation** - Gemini Pro: Dobry do generowania kodu
- ✅ **Tests** - Gemini Pro: Dobry do generowania testów
- ⚠️ **Planning** - Gemini Pro: Średni, lepiej użyć GPT-4/Claude
- ⚠️ **Code Review** - Gemini Pro: Średni
- ⚠️ **Infra** - Gemini Pro: Średni

**Przykład użycia:**
```bash
cat > scripts/gemini-prompt.sh << 'EOF'
#!/bin/bash
TASK_ID=$1

cat << PROMPT
Jesteś QA Tester pracujący nad zadaniem $TASK_ID.

Przeczytaj:
- context-instructions.md
- docs/subagents-config.md (sekcja QA Tester)
- docs/plan.md

Zadanie: Stwórz testy dla [FEATURE]

Output:
- Testy + Coverage Report
PROMPT
EOF

chmod +x scripts/gemini-prompt.sh
```

### 10.5 Cursor AI (Lokalny)

**Jak skonfigurować:**

1. **Zainstaluj Cursor** (cursor.sh)
2. **Otwórz projekt w Cursor**
3. **Utwórz plik `.cursorrules`:**

```bash
cat > .cursorrules << 'EOF'
# Cursor AI Rules for Multi-Tenant Headless CMS

## Context Files
Always read these files before starting:
- context-instructions.md
- docs/prd.md
- docs/plan.md
- docs/subagents-config.md
- .aicli/commands.yaml

## Code Standards
- TypeScript strict mode
- Always use tenantId for multi-tenant isolation
- Tests required (>80% coverage)
- No 'any' types
- Accessibility WCAG 2.1 AA

## File Structure
- Backend: apps/api/src/modules/{feature}/
- Frontend: apps/admin/app/ lub apps/admin/components/
- Tests: apps/*/test/ lub apps/*/src/__tests__/
- Shared: packages/{sdk,schemas,ui}/

## Commands
Use .aicli/commands.yaml for code generation:
- gen:prisma - Prisma models
- gen:controller - NestJS controllers
- gen:component - React components
- gen:test:e2e - Playwright tests
EOF

echo "✅ .cursorrules utworzony"
```

**Rekomendacje dla Cursor:**
- ✅ **Code Generation** - Doskonały do generowania kodu w kontekście projektu
- ✅ **Code Review** - Doskonały do przeglądania kodu
- ✅ **Refactoring** - Doskonały do refaktoryzacji
- ✅ **Tests** - Dobry do generowania testów
- ⚠️ **Planning** - Średni, lepiej użyć GPT-4/Claude
- ⚠️ **Infra** - Średni

---

## Rekomendacje: Który Model do Czego

### Planning & Architecture

**Rekomendowane:**
1. **Claude 3 Opus** - Najlepszy do strategicznego planowania i architektury
2. **GPT-4** - Bardzo dobry do analizy wymagań i planowania sprintów
3. **Claude 3 Sonnet** - Dobry do planowania zadań

**Użycie:**
- Analiza PRD i wymagań
- Planowanie sprintów
- Architektura systemu
- Decyzje techniczne

### Code Generation

**Rekomendowane:**
1. **Cursor AI** - Najlepszy do generowania kodu w kontekście projektu
2. **GPT-4** - Bardzo dobry do generowania kodu
3. **Claude 3 Sonnet** - Bardzo dobry do generowania kodu
4. **Gemini Pro** - Dobry do generowania kodu

**Użycie:**
- Backend: NestJS controllers, services, repositories
- Frontend: React components, pages
- Shared: Schemas, SDK, UI components

### Tests

**Rekomendowane:**
1. **GPT-4** - Najlepszy do kompleksowych testów
2. **Claude 3 Sonnet** - Bardzo dobry do testów
3. **Gemini Pro** - Dobry do testów
4. **Cursor AI** - Dobry do testów w kontekście

**Użycie:**
- Unit tests
- Integration tests
- E2E tests (Playwright)
- Security tests

### Code Review

**Rekomendowane:**
1. **Claude 3 Opus** - Najlepszy do szczegółowego review
2. **Cursor AI** - Doskonały do review w kontekście projektu
3. **GPT-4** - Bardzo dobry do review

**Użycie:**
- Code quality check
- Security review
- Performance review
- Architecture compliance

### Documentation

**Rekomendowane:**
1. **Claude 3 Sonnet** - Najlepszy do pisania dokumentacji
2. **GPT-4** - Bardzo dobry do dokumentacji
3. **Gemini Pro** - Dobry do dokumentacji

**Użycie:**
- README files
- API documentation
- Changelog
- User guides

### Infrastructure & DevOps

**Rekomendowane:**
1. **GPT-4** - Najlepszy do Docker i CI/CD
2. **Claude 3 Sonnet** - Dobry do infrastruktury
3. **Specjalistyczne narzędzia** - Terraform, Kubernetes docs

**Użycie:**
- Docker configuration
- CI/CD pipelines
- Kubernetes manifests
- Monitoring setup

---

## Szybki Start - Podsumowanie

### Komendy do Uruchomienia Całego Środowiska

```bash
# 1. Inicjalizacja
mkdir netflow-cms && cd netflow-cms
git init

# 2. Utworzenie struktury (użyj skryptu z Kroku 1.2)

# 3. Dodanie plików konfiguracyjnych (użyj komend z Kroku 2)

# 4. Instalacja
pnpm install

# 5. Konfiguracja backendu
# Edytuj apps/api/.env
pnpm --filter api db:generate
pnpm --filter api db:migrate

# 6. Uruchomienie development
pnpm dev

# 7. Weryfikacja
pnpm test
pnpm build
```

### Checklist Przed Rozpoczęciem Pracy z AI

- [ ] Wszystkie pliki dokumentacji są na miejscu
- [ ] `.cursorrules` jest skonfigurowany (jeśli używasz Cursor)
- [ ] System prompts są przygotowane dla wybranych modeli
- [ ] Projekt jest zainstalowany i działa (`pnpm dev`)
- [ ] Baza danych jest skonfigurowana
- [ ] Przeczytałeś `context-instructions.md`

---

## Troubleshooting

### Problem: pnpm nie jest zainstalowany

```bash
npm install -g pnpm@8.15.0
```

### Problem: Błąd przy `pnpm install`

```bash
# Wyczyść cache
pnpm store prune

# Usuń node_modules i lock file
rm -rf node_modules pnpm-lock.yaml

# Zainstaluj ponownie
pnpm install
```

### Problem: Błąd Prisma migration

```bash
# Sprawdź DATABASE_URL w apps/api/.env
# Upewnij się że PostgreSQL działa
psql -U postgres -c "SELECT version();"

# Reset migrations (UWAGA: usuwa dane!)
pnpm --filter api db:migrate reset
```

### Problem: TypeScript errors

```bash
# Sprawdź czy wszystkie workspace'y mają tsconfig.json
# Uruchom type-check
pnpm type-check
```

---

## Następne Kroki

1. **Przeczytaj dokumentację:**
   - `context-instructions.md` - Systemowe zasady
   - `docs/subagents-config.md` - Konfiguracja agentów
   - `docs/agents.md` - Role i komunikacja

2. **Skonfiguruj AI models:**
   - Dodaj system prompts do wybranych modeli
   - Przetestuj z prostym zadaniem

3. **Rozpocznij pracę:**
   - Utwórz pierwsze zadanie w `docs/plan.md`
   - Użyj AI do implementacji
   - Przeprowadź code review

---

**Ostatnia aktualizacja:** 2024-01-01  
**Wersja:** 1.0.0


