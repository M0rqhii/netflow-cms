# Backend Connection Diagnostic Script
# Usage: .\scripts\check-backend.ps1

Write-Host "Checking backend connection..." -ForegroundColor Cyan

# Step 1: Check if port is occupied
Write-Host "`n1. Checking port 4000..." -ForegroundColor Yellow
$portCheck = netstat -ano | findstr ":4000" | findstr "LISTENING"
if ($portCheck) {
    Write-Host "[OK] Port 4000 is occupied (backend probably running)" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Port 4000 is not occupied (backend not running)" -ForegroundColor Red
    Write-Host "   Run backend: pnpm --filter api dev" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check health endpoint
Write-Host "`n2. Checking health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/health" -Method GET -UseBasicParsing -TimeoutSec 5
    Write-Host "[OK] Backend responds: Status $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Backend does not respond: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nPossible causes:" -ForegroundColor Yellow
    Write-Host "   - Backend is hanging during startup" -ForegroundColor Yellow
    Write-Host "   - Backend has errors and cannot handle requests" -ForegroundColor Yellow
    Write-Host "   - Backend was not properly restarted" -ForegroundColor Yellow
    Write-Host "`nSolution:" -ForegroundColor Yellow
    Write-Host "   1. Stop backend (Ctrl+C)" -ForegroundColor Yellow
    Write-Host "   2. Check error logs" -ForegroundColor Yellow
    Write-Host "   3. Restart: pnpm --filter api dev" -ForegroundColor Yellow
    exit 1
}

# Step 3: Check .env.local
Write-Host "`n3. Checking frontend configuration..." -ForegroundColor Yellow
if (Test-Path "apps/admin/.env.local") {
    $envContent = Get-Content "apps/admin/.env.local"
    if ($envContent -match "NEXT_PUBLIC_API_URL") {
        Write-Host "[OK] .env.local file exists" -ForegroundColor Green
        Write-Host "   $envContent" -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] .env.local exists but does not contain NEXT_PUBLIC_API_URL" -ForegroundColor Yellow
    }
} else {
    Write-Host "[WARNING] apps/admin/.env.local file does not exist" -ForegroundColor Yellow
    Write-Host "   Creating file..." -ForegroundColor Yellow
    "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" | Out-File -FilePath "apps/admin/.env.local" -Encoding utf8
    Write-Host "[OK] Created apps/admin/.env.local" -ForegroundColor Green
    Write-Host "   IMPORTANT: Restart frontend after creating file!" -ForegroundColor Red
}

# Step 4: Check CORS
Write-Host "`n4. Checking CORS..." -ForegroundColor Yellow
try {
    $corsResponse = Invoke-WebRequest -Uri "http://localhost:4000/api/v1/health" -Method OPTIONS -Headers @{
        "Origin" = "http://localhost:3000"
        "Access-Control-Request-Method" = "GET"
    } -UseBasicParsing -TimeoutSec 5
    Write-Host "[OK] CORS works correctly" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] CORS may have issues: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host "`n[OK] Diagnostics completed!" -ForegroundColor Green
Write-Host "`nIf backend does not respond:" -ForegroundColor Yellow
Write-Host "   1. Check backend logs in terminal" -ForegroundColor Yellow
Write-Host "   2. Restart backend: pnpm --filter api dev" -ForegroundColor Yellow
Write-Host "   3. Check if database is running: docker-compose ps postgres" -ForegroundColor Yellow
