$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

Write-Host "Starting Netflow CMS development environment..." -ForegroundColor Green

try {
    docker info | Out-Null
} catch {
    Write-Host "Docker is not running. Start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path .env)) {
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
}

if (-not (Test-Path apps/admin/.env.local) -and (Test-Path apps/admin/.env.example)) {
    Write-Host "Creating apps/admin/.env.local from apps/admin/.env.example..." -ForegroundColor Yellow
    Copy-Item apps/admin/.env.example apps/admin/.env.local
}

Write-Host "Starting PostgreSQL and Redis..." -ForegroundColor Cyan
docker compose up -d postgres redis

Write-Host "Installing dependencies if needed..." -ForegroundColor Cyan
if (-not (Test-Path node_modules)) {
    pnpm install
}

Write-Host "Generating Prisma client..." -ForegroundColor Cyan
pnpm db:generate

Write-Host "Running database migrations..." -ForegroundColor Cyan
pnpm db:migrate

Write-Host "Starting monorepo dev servers..." -ForegroundColor Green
pnpm dev
