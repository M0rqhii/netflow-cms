#!/bin/bash

# Start Development Environment
# This script starts all services: database, redis, backend, and frontend

set -e

echo "🚀 Starting Netflow CMS Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from env.example..."
    cp env.example .env
    echo "✅ Created .env file. Please review and update if needed."
fi

# Start Docker services (postgres, redis)
echo "📦 Starting Docker services (PostgreSQL, Redis)..."
docker-compose up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check if postgres is ready
until docker-compose exec -T postgres pg_isready -U netflow > /dev/null 2>&1; do
    echo "⏳ Waiting for PostgreSQL..."
    sleep 2
done

# Check if redis is ready
until docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    echo "⏳ Waiting for Redis..."
    sleep 2
done

echo "✅ Docker services are ready!"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
pnpm --filter api db:generate

# Run database migrations
echo "🗄️  Running database migrations..."
pnpm --filter api db:migrate

# Start backend and frontend in parallel
echo "🚀 Starting backend and frontend..."
pnpm dev

