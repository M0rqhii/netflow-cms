# Struktura Projektu API

## Organizacja Folderów

```
apps/api/
├─ src/
│  ├─ main.ts                 # Entry point aplikacji
│  ├─ app.module.ts           # Główny moduł NestJS
│  ├─ common/                 # Wspólne komponenty
│  │  ├─ constants/           # Stałe aplikacji
│  │  ├─ decorators/          # Custom decorators
│  │  ├─ filters/             # Exception filters
│  │  ├─ interceptors/        # Interceptors (ETag, logging)
│  │  ├─ pipes/               # Custom pipes
│  │  ├─ prisma/              # PrismaService
│  │  └─ tenant/              # Tenant module (guard, service)
│  └─ modules/                # Feature modules
│     └─ collections/         # Collections module
│        ├─ controllers/      # REST controllers
│        ├─ dto/              # Data Transfer Objects (Zod)
│        ├─ services/         # Business logic
│        └─ README.md         # Dokumentacja modułu
│
├─ test/                      # E2E tests
│  ├─ setup.ts                # Test setup
│  ├─ setup-e2e.ts            # E2E test setup
│  └─ *.e2e-spec.ts           # E2E test files
│
├─ prisma/                    # Prisma configuration
│  ├─ schema.prisma           # Database schema
│  └─ migrations/             # Database migrations
│
├─ .env                       # Environment variables (ignored)
├─ .env.example               # Environment template
├─ .gitignore                 # Git ignore rules
├─ nest-cli.json              # NestJS CLI configuration
├─ jest.config.js             # Jest configuration
├─ tsconfig.json              # TypeScript configuration
└─ package.json               # Dependencies & scripts
```

## Zasady Organizacji

### Common Module
- constants — stałe aplikacji (cache TTL, pagination, etc.)
- decorators — np. `@CurrentTenant`
- filters — globalne obsługi błędów
- interceptors — np. ETag
- pipes — np. ZodValidationPipe
- prisma — PrismaService z multi-tenant support
- tenant — Tenant guard, middleware, service

### Feature Modules
Struktura standardowa modułów:
```
modules/{feature}/
├─ controllers/      # REST endpoints
├─ dto/              # Zod schemas dla walidacji
├─ services/         # Business logic
└─ {feature}.module.ts
```

## Konwencje Nazewnictwa
- Controllers: `*.controller.ts`
- Services: `*.service.ts`
- DTOs: `*.dto.ts`
- Tests: `*.spec.ts` (unit), `*.e2e-spec.ts` (E2E)
- Modules: `*.module.ts`

## Co NIE commitujemy
- `dist/`
- `.env`
- `node_modules/`
- `coverage/`

## Co commitujemy
- Pliki `.ts` z `src/`
- Pliki konfiguracyjne (`.json`, `.js`)
- Prisma migrations
- Dokumentacja (`.md`)

