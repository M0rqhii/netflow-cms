# Getting Started (Local Docker)

This repo runs as a Docker Compose stack with Postgres, Redis, API (NestJS), and Admin (Next.js).

## Prerequisites

- Docker Desktop installed and running
- PowerShell (Windows) or a POSIX shell

## 1) Build and start

PowerShell:

```powershell
cd E:\\\\netflow-cms
powershell -File .\\\\scripts\\\\dev.ps1 build
powershell -File .\\\\scripts\\\\dev.ps1 up
```

## 2) Migrate and seed

```powershell
powershell -File .\\\\scripts\\\\dev.ps1 migrate
powershell -File .\\\\scripts\\\\dev.ps1 seed
```

## 3) Verify health

Open <http://localhost:4000/api/v1/health> — should return `{ "status": "ok" }`.

Or run:

```powershell
powershell -File .\\\\scripts\\\\dev.ps1 health
```

## 4) Login to Admin

- URL: <http://localhost:3000/login>
- Email: `admin@acme-corp.com`
- Password: `password123`

After login, use the Dashboard (Hub) to enter the tenant CMS.

## Useful commands

```powershell
# Tail API logs
powershell -File .\\scripts\\dev.ps1 logs-api

# Tail Admin logs
powershell -File .\\scripts\\dev.ps1 logs-admin

# Restart services
powershell -File .\\scripts\\dev.ps1 restart-api
powershell -File .\\scripts\\dev.ps1 restart-admin

# Run API E2E tests (inside container)
powershell -File .\\scripts\\dev.ps1 test-e2e
```

## Notes

- Compose loads `.env.docker` for container env. Host dev can use `env.example` as a template.
- Redis is required; if Redis is unavailable, the API will fail to start (no silent in-memory fallback).
- Prisma Client is generated in the API container at boot.
- For production deployment, see docs/DEPLOY.md and .env.production.example.
