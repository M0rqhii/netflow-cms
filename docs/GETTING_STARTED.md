# Getting Started

This repo can be run in two clean ways.

## Option A: Root Workflow

Use this if you want the normal pnpm/turbo setup.

```bash
cp .env.example .env
docker compose up -d postgres redis
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

## Option B: Docker Compose Workflow

Use this if you want API and Admin inside containers.

```bash
docker compose up --build
```

This path uses `.env.docker`.

## URLs

- API: `http://localhost:4000/api/v1`
- Admin: `http://localhost:3000`
- Liveness: `http://localhost:4000/api/v1/health/liveness`

## Standalone Apps

If you run only one app:

- copy `apps/api/.env.example` to `apps/api/.env`
- copy `apps/admin/.env.example` to `apps/admin/.env.local`
