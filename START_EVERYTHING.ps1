# Skrypt do uruchomienia całego środowiska NetFlow CMS
# Użycie: .\START_EVERYTHING.ps1

Write-Host "🚀 Uruchamianie NetFlow CMS..." -ForegroundColor Green

# Sprawdź czy Docker działa
Write-Host "`n📦 Sprawdzanie Docker..." -ForegroundColor Yellow
if (-not (docker info 2>$null)) {
    Write-Host "❌ Docker nie działa! Uruchom Docker Desktop i spróbuj ponownie." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker działa" -ForegroundColor Green

# Sprawdź/utwórz plik .env
Write-Host "`n📝 Sprawdzanie konfiguracji..." -ForegroundColor Yellow
if (-not (Test-Path .env)) {
    Write-Host "⚠️  Plik .env nie istnieje. Tworzenie z env.example..." -ForegroundColor Yellow
    Copy-Item env.example .env
    Write-Host "✅ Utworzono plik .env" -ForegroundColor Green
} else {
    Write-Host "✅ Plik .env istnieje" -ForegroundColor Green
}

# Sprawdź/utwórz plik .env.local dla frontendu
if (-not (Test-Path apps/admin/.env.local)) {
    Write-Host "⚠️  Plik apps/admin/.env.local nie istnieje. Tworzenie..." -ForegroundColor Yellow
    "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" | Out-File -FilePath apps/admin/.env.local -Encoding utf8
    Write-Host "✅ Utworzono apps/admin/.env.local" -ForegroundColor Green
} else {
    Write-Host "✅ Plik apps/admin/.env.local istnieje" -ForegroundColor Green
}

# Uruchom Docker services (PostgreSQL, Redis)
Write-Host "`n🐳 Uruchamianie Docker services (PostgreSQL, Redis)..." -ForegroundColor Yellow
docker-compose up -d postgres redis

# Czekaj na gotowość serwisów
Write-Host "⏳ Oczekiwanie na gotowość serwisów..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$maxRetries = 30
$retryCount = 0
$postgresReady = $false
$redisReady = $false

while ($retryCount -lt $maxRetries -and (-not $postgresReady -or -not $redisReady)) {
    if (-not $postgresReady) {
        $pgCheck = docker-compose exec -T postgres pg_isready -U netflow 2>$null
        if ($LASTEXITCODE -eq 0) {
            $postgresReady = $true
            Write-Host "✅ PostgreSQL gotowy" -ForegroundColor Green
        }
    }
    
    if (-not $redisReady) {
        $redisCheck = docker-compose exec -T redis redis-cli ping 2>$null
        if ($redisCheck -eq "PONG") {
            $redisReady = $true
            Write-Host "✅ Redis gotowy" -ForegroundColor Green
        }
    }
    
    if (-not $postgresReady -or -not $redisReady) {
        Start-Sleep -Seconds 2
        $retryCount++
    }
}

if (-not $postgresReady -or -not $redisReady) {
    Write-Host "❌ Timeout oczekiwania na serwisy Docker" -ForegroundColor Red
    exit 1
}

# Sprawdź czy zależności są zainstalowane
Write-Host "`n📦 Sprawdzanie zależności..." -ForegroundColor Yellow
if (-not (Test-Path node_modules)) {
    Write-Host "⚠️  Zależności nie są zainstalowane. Instalowanie..." -ForegroundColor Yellow
    pnpm install
    Write-Host "✅ Zależności zainstalowane" -ForegroundColor Green
} else {
    Write-Host "✅ Zależności zainstalowane" -ForegroundColor Green
}

# Wygeneruj Prisma Client
Write-Host "`n🔧 Generowanie Prisma Client..." -ForegroundColor Yellow
pnpm --filter api db:generate
Write-Host "✅ Prisma Client wygenerowany" -ForegroundColor Green

# Uruchom migracje
Write-Host "`n🗄️  Uruchamianie migracji bazy danych..." -ForegroundColor Yellow
pnpm --filter api db:migrate
Write-Host "✅ Migracje wykonane" -ForegroundColor Green

# Sprawdź czy backend i frontend już działają
Write-Host "`n🔍 Sprawdzanie czy serwisy już działają..." -ForegroundColor Yellow
$backendRunning = $false
$frontendRunning = $false

try {
    $response = Invoke-WebRequest -Uri http://localhost:4000/api/v1/health -Method GET -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $backendRunning = $true
        Write-Host "✅ Backend już działa na porcie 4000" -ForegroundColor Green
    }
} catch {
    Write-Host "ℹ️  Backend nie działa (to normalne jeśli nie był uruchomiony)" -ForegroundColor Gray
}

try {
    $response = Invoke-WebRequest -Uri http://localhost:3000 -Method GET -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        $frontendRunning = $true
        Write-Host "✅ Frontend już działa na porcie 3000" -ForegroundColor Green
    }
} catch {
    Write-Host "ℹ️  Frontend nie działa (to normalne jeśli nie był uruchomiony)" -ForegroundColor Gray
}

# Uruchom backend i frontend
Write-Host "`n🚀 Uruchamianie aplikacji..." -ForegroundColor Yellow
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Backend:  http://localhost:4000/api/v1" -ForegroundColor Cyan
Write-Host "  Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Health:   http://localhost:4000/api/v1/health" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Aby zatrzymać, naciśnij Ctrl+C" -ForegroundColor Yellow
Write-Host ""

# Uruchom wszystko przez turbo
pnpm dev




