# Start Here

## Fastest Local Setup

1. Create the root env file:

```bash
cp .env.example .env
```

2. Start infrastructure:

```bash
docker compose up -d postgres redis
```

3. Install dependencies and prepare Prisma:

```bash
pnpm install
pnpm db:generate
pnpm db:migrate
```

4. Start the monorepo:

```bash
pnpm dev
```

Local URLs:

- API: `http://localhost:4000/api/v1`
- Admin: `http://localhost:3000`
- Liveness: `http://localhost:4000/api/v1/health/liveness`

## Standalone App Env Files

Use these only if you run apps directly:

- `apps/api/.env.example` -> copy to `apps/api/.env`
- `apps/admin/.env.example` -> copy to `apps/admin/.env.local`

## Next Reading

- [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)
- [docs/DEPLOY.md](docs/DEPLOY.md)
- [context-instructions.md](context-instructions.md)
