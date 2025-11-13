## Deploy (Docker Compose Production)

This repo ships with a production-oriented compose file.

### 1) Copy and edit env

```
cp .env.production.example .env.production
# Edit .env.production: set JWT_SECRET, POSTGRES_PASSWORD, FRONTEND_URL, NEXT_PUBLIC_API_URL
```

### 2) Build and start

```
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

- API: http://localhost:4000/api/v1/health
- Admin: http://localhost:3000/

### Notes
- `docker-compose.prod.yml` builds from the same Dockerfiles and runs production commands (build + start).
- `FRONTEND_URL` and `CORS_ORIGIN` must match the Admin origin.
- `NEXT_PUBLIC_API_URL` must point to the public API base URL.
- Add HTTPS and reverse proxy (nginx/traefik) for real deployments.

