# Start Development Environment (PowerShell)
# This script starts all services: database, redis, backend, and frontend

Write-Host "🚀 Starting Netflow CMS Development Environment..." -ForegroundColor Green

# Check if Docker is running
try {
    docker info | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker and try again." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  .env file not found. Creating from env.example..." -ForegroundColor Yellow
    Copy-Item env.example .env
    Write-Host "✅ Created .env file. Please review and update if needed." -ForegroundColor Green
}

# Start Docker services (postgres, redis)
Write-Host "📦 Starting Docker services (PostgreSQL, Redis)..." -ForegroundColor Cyan
docker-compose up -d postgres redis

# Wait for services to be ready
Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if postgres is ready
$postgresReady = $false
$maxRetries = 30
$retryCount = 0

while (-not $postgresReady -and $retryCount -lt $maxRetries) {
    try {
        docker-compose exec -T postgres pg_isready -U netflow | Out-Null
        $postgresReady = $true
    } catch {
        $retryCount++
        Write-Host "⏳ Waiting for PostgreSQL... ($retryCount/$maxRetries)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

# Check if redis is ready
$redisReady = $false
$retryCount = 0

while (-not $redisReady -and $retryCount -lt $maxRetries) {
    try {
        docker-compose exec -T redis redis-cli ping | Out-Null
        $redisReady = $true
    } catch {
        $retryCount++
        Write-Host "⏳ Waiting for Redis... ($retryCount/$maxRetries)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

Write-Host "✅ Docker services are ready!" -ForegroundColor Green

# Install dependencies if needed
if (-not (Test-Path node_modules)) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Cyan
    pnpm install
}

# Generate Prisma client
Write-Host "🔧 Generating Prisma client..." -ForegroundColor Cyan
pnpm --filter api db:generate

# Run database migrations
Write-Host "🗄️  Running database migrations..." -ForegroundColor Cyan
pnpm --filter api db:migrate

# Start backend and frontend
Write-Host "🚀 Starting backend and frontend..." -ForegroundColor Green
pnpm dev

