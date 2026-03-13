#!/bin/bash

set -euo pipefail

cd "$(dirname "$0")/.."

echo "Starting Netflow CMS development environment..."

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop and try again."
  exit 1
fi

if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

if [ ! -f apps/admin/.env.local ] && [ -f apps/admin/.env.example ]; then
  echo "Creating apps/admin/.env.local from apps/admin/.env.example..."
  cp apps/admin/.env.example apps/admin/.env.local
fi

echo "Starting PostgreSQL and Redis..."
docker compose up -d postgres redis

echo "Installing dependencies if needed..."
if [ ! -d node_modules ]; then
  pnpm install
fi

echo "Generating Prisma client..."
pnpm db:generate

echo "Running database migrations..."
pnpm db:migrate

echo "Starting monorepo dev servers..."
pnpm dev
