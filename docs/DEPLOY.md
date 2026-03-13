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

## Current Limitation

Billing, domain provisioning, and file storage still use local/dev implementations unless you replace the provider layer in `apps/api/src/common/providers/`.
