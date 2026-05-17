# Production Deployment

## Canonical Production Files

- `.env.production.example` - production env template
- `apps/api/Dockerfile` - production API image
- `apps/admin/Dockerfile` - production Admin image
- `docker-compose.prod.yml` - optional self-hosted container orchestration

## Required Production Variables

At minimum set:

- `DATABASE_URL`
- `DIRECT_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `FRONTEND_URL`
- `CORS_ORIGIN`
- `NEXT_PUBLIC_API_URL`
- `API_BASE_URL`

If you use the current local filesystem upload path, also set:

- `UPLOAD_DIR=/data/uploads`

## Docker Compose Production

```bash
cp .env.production.example .env.production
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

Notes:

- `docker-compose.prod.yml` assumes external Postgres and Redis configured via `.env.production`.
- API persists uploads in the `netflow_uploads` Docker volume when `UPLOAD_DIR=/data/uploads`.
- Container health should target `/api/v1/health/liveness`, not the full health endpoint.

## Managed Platforms

For platforms like Render:

- deploy `apps/api` with the production env values
- deploy `apps/admin` with `NEXT_PUBLIC_API_URL` pointing at the public API URL
- run Prisma migrations during the API release phase

## Supabase Database URLs

Copy `DATABASE_URL` and `DIRECT_URL` from the Supabase Dashboard `Connect` panel for the same active project. Do not hand-build the pooler hostname or project ref.

- `DATABASE_URL`: runtime connection. Use Session pooler `:5432` for long-lived containers such as Render. Use Transaction pooler `:6543` only for serverless/auto-scaling runtime traffic.
- `DIRECT_URL`: Prisma migration/admin connection. Use direct `db.<project-ref>.supabase.co:5432` when IPv6 is available, otherwise Session pooler `:5432`. Do not point `DIRECT_URL` at Transaction pooler `:6543`.

If deploy logs contain `FATAL: (ENOTFOUND) tenant/user postgres.<project-ref> not found`, the Supabase pooler did not recognize that `user.project-ref` pair. Replace both database variables with fresh strings from the dashboard and verify that the project ref in the username matches the target project and the pooler host/region shown by Supabase.

## Current Limitation

Billing, domain provisioning, and file storage still use local/dev implementations unless you replace the provider layer in `apps/api/src/common/providers/`.
