# Netflow CMS - Platform Hosting + Site Management System

Professional-grade platform combining hosting management with WordPress-style site management. Built with modern technologies and AI-assisted development.

## 🎯 System Architecture - Two Levels

### 1. Platform Panel (TERAZ) - Main Admin Panel

**Purpose:** Central management hub for all sites, users, billing, and account management.

**Features:**
- **Site Management** - List all sites, create new sites, view site details
- **User Management** - Manage users per site, roles, invitations
- **Billing & Subscriptions** - View subscriptions, invoices, payment history
- **Account Management** - User profile, billing info, password change

**Routes:**
- `/dashboard` - Platform overview
- `/sites` - List all sites
- `/sites/new` - Create new site
- `/sites/[slug]` - Site overview
- `/sites/[slug]/users` - Manage site users
- `/sites/[slug]/billing` - Site billing
- `/billing` - Global billing overview
- `/account` - User account settings

**Status:** ✅ **IMPLEMENTED** - Currently being refined

---

### 2. Site Panel / Page Builder (NA PÓŹNIEJ) - Site-Specific CMS

**Purpose:** Content management and page building for individual sites.

**Features:**
- **Page Builder** - Drag & drop page editor (like Elementor/Webflow)
- **Content Management** - Collections, content types, media
- **Site Settings** - Domain, SEO, etc.

**Routes:**
- `/tenant/[slug]` - Site dashboard
- `/tenant/[slug]/collections` - Content collections
- `/tenant/[slug]/media` - Media library
- `/tenant/[slug]/pages` - Page builder (future)

**Status:** ⏳ **PLANNED** - To be implemented after Platform Panel is complete

---

## Current Focus

**We are currently working on the Platform Panel** - the main admin interface for managing sites, users, billing, and accounts. The Site Panel with Page Builder will be implemented in the next phase.

## Quick Start

See docs/GETTING_STARTED.md for the Docker-based local setup and handy PowerShell scripts.

## Project Structure

```
netflow-cms/
├─ apps/
│  ├─ api/          # NestJS Backend API
│  └─ admin/        # Next.js Platform Panel (Admin Panel)
│                    # Routes: /dashboard, /sites, /billing, /account
│                    # Future: /tenant/[slug]/* (Site Panel / Page Builder)
├─ packages/
│  ├─ schemas/      # Shared Zod schemas
│  ├─ sdk/          # TypeScript SDK
│  └─ ui/           # Shared UI components
├─ docs/            # Documentation
└─ scripts/         # Helper scripts
```

## Tech Stack

### Backend
- NestJS (Node.js framework)
- Prisma (ORM)
- PostgreSQL (Database)
- Redis (Caching)
- Zod (Validation)

### Frontend
- Next.js 14 (React framework)
- TypeScript (Type safety)
- Tailwind CSS (Styling)
- Zustand (State management)

### DevOps
- Turborepo (Monorepo build system)
- pnpm (Package manager)
- Docker (Containerization)
- GitHub Actions (CI/CD)

## Documentation

### Platform Panel (Current Focus)
- `docs/admin-panel-refactoring-plan.md` — Platform Panel refactoring plan
- `docs/admin-panel-documentation.md` — Platform Panel technical documentation
- `docs/status/PROJECT_STATUS.md` — Current project status

### General Documentation
- `START_HERE.md` — Quick setup guide (5 minutes)
- `docs/guides/QUICK_START.md` — Collections module quick start
- `docs/guides/SETUP_COMPLETE.md` — Full setup instructions
- `docs/prd.md` — Product Requirements Document
- `docs/plan.md` — Development plan
- `docs/api/` — API documentation
- `context-instructions.md` — AI agent guidelines
- `docs/REPO_STRUCTURE.md` — Detailed structure overview

### Site Panel / Page Builder (Future)
- Page Builder documentation will be added when implementation begins

## Testing

```bash
# Run all tests
pnpm test

# Run API tests
pnpm --filter api test

# Run E2E tests
pnpm --filter api test:e2e

# Coverage
pnpm --filter api test:coverage
```

## Available Commands

```bash
# Development
pnpm dev              # Start all dev servers
pnpm build            # Build all apps
pnpm lint             # Lint code
pnpm type-check       # Type check
pnpm format           # Format code

# Database
pnpm db:migrate       # Run migrations
pnpm db:generate      # Generate Prisma Client
pnpm db:studio        # Open Prisma Studio
```

## Architecture

### Multi-Tenancy
- Row-level security (PostgreSQL)
- Tenant context middleware
- Automatic tenant filtering

### API Design
- RESTful endpoints
- ETag support for caching
- Optimistic locking
- Versioning

### Code Standards
- TypeScript strict mode
- ESLint + Prettier
- Test coverage >80%
- Atomic commits

## Development Workflow

1. Create branch from `develop`
2. Implement feature following `docs/plan.md`
3. Write tests (unit + E2E)
4. Update documentation
5. Create PR with description
6. Code review and merge

## AI-Assisted Development

Roles: Main Architect, Backend Codex, Frontend Maestro, QA Tester, Infra DevOps. See `docs/agents.md` for details.

## License

Private — All rights reserved

## Contributing

See `docs/plan.md` for development guidelines and task assignments.

---

Status: Ready for Development  
Version: 1.0.0
