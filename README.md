# Netflow CMS

Netflow CMS is a pnpm/turborepo monorepo with:

- `apps/api` - NestJS API + Prisma
- `apps/admin` - Next.js admin panel
- `packages/schemas`, `packages/sdk`, `packages/ui` - shared workspace packages

## Canonical Setup Files

Use these files as the source of truth:

- `.env.example` - root local development template
- `.env.docker` - Docker Compose local template
- `.env.production.example` - production template
- `apps/api/.env.example` - standalone API template
- `apps/admin/.env.example` - standalone admin template

## Local Development

Quick path from the repository root:

```bash
cp .env.example .env
docker compose up -d postgres redis
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Services:

- API: `http://localhost:4000/api/v1`
- Admin: `http://localhost:3000`
- Liveness: `http://localhost:4000/api/v1/health/liveness`

## Docker Compose Local

If you want the app stack inside containers, use:

```bash
docker compose up --build
```

This path uses `.env.docker`.

## Production

See [docs/DEPLOY.md](docs/DEPLOY.md).

## Documentation

- [START_HERE.md](START_HERE.md) - fastest local setup
- [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) - Docker-first local workflow
- [docs/DEPLOY.md](docs/DEPLOY.md) - production deployment
- [docs/README.md](docs/README.md) - documentation index

## Repository Notes

- Static prototype files live under `docs/demo/static-prototype/`.
- Product specs live under `docs/design/specs/`.
- `context-instructions.md` remains in the root because other repo docs reference it directly.
