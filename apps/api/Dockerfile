FROM node:18-bullseye-slim

# Install pnpm and dependencies required by Prisma (OpenSSL)
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@8.15.0 @nestjs/cli@10.4.9

WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.json ./
COPY packages/schemas/package.json ./packages/schemas/
COPY apps/api/package.json ./apps/api/

# Install all workspace dependencies (dev)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/schemas ./packages/schemas
COPY apps/api ./apps/api

# Default working directory for API
WORKDIR /app/apps/api

# Expose port
EXPOSE 4000

# Health check (dev server)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# In docker-compose we override CMD with pnpm --filter api dev
CMD ["node", "dist/main"]


