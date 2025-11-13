# Multi-stage build for Next.js Admin
FROM node:18-alpine AS base

# Install pnpm
RUN npm install -g pnpm@8.15.0 next@14.2.7

# Set working directory
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY turbo.json tsconfig.json ./

# Copy package files
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/ui/package.json ./packages/ui/
COPY apps/admin/package.json ./apps/admin/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/schemas ./packages/schemas
COPY packages/sdk ./packages/sdk
COPY packages/ui ./packages/ui
COPY apps/admin ./apps/admin

WORKDIR /app/apps/admin

# Expose port
EXPOSE 3000

# In docker-compose we override CMD with pnpm --filter admin dev
CMD ["node", "server.js"]


