FROM node:20-bullseye-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@8.15.0

WORKDIR /app

# Workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY packages/schemas/package.json ./packages/schemas/
COPY apps/api/package.json ./apps/api/

RUN pnpm install --frozen-lockfile

# Source
COPY packages/schemas ./packages/schemas
COPY apps/api ./apps/api

RUN pnpm --filter @repo/schemas build
RUN pnpm --filter @repo/api db:generate
RUN pnpm --filter @repo/api build

WORKDIR /app/apps/api

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:4000/api/v1/health/liveness', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["sh", "-lc", "cd /app && pnpm --filter @repo/api db:migrate:deploy && node apps/api/dist/main.js"]
