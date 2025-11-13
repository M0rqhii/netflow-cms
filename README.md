# Netflow CMS - Multi-Tenant Headless CMS

Professional-grade multi-tenant headless CMS built with modern technologies and AI-assisted development.

## Quick Start

See docs/GETTING_STARTED.md for the Docker-based local setup and handy PowerShell scripts.

## Project Structure

```
netflow-cms/
├─ apps/
│  ├─ api/          # NestJS Backend API
│  └─ admin/        # Next.js Admin Panel
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

- START_HERE.md — Quick setup guide (5 minutes)
- docs/guides/QUICK_START.md — Collections module quick start
- docs/guides/SETUP_COMPLETE.md — Full setup instructions
- docs/status/PROJECT_STATUS.md — Current project status
- docs/prd.md — Product Requirements Document
- docs/plan.md — Development plan
- docs/api/ — API documentation
- context-instructions.md — AI agent guidelines
- docs/REPO_STRUCTURE.md — Detailed structure overview

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
