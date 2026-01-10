# 🔧 Naprawa: Backend się zawiesza

## Problem
Backend działa na porcie 4000, ale nie odpowiada na żądania HTTP. To oznacza, że backend się zawiesza podczas startu lub ma błędy.

## Rozwiązanie

### Krok 1: Zatrzymaj backend

**Jeśli backend działa w terminalu:**
- Naciśnij `Ctrl+C` w terminalu gdzie działa backend

**Jeśli backend działa w tle:**
```powershell
# Znajdź proces Node.js na porcie 4000
$processId = (netstat -ano | findstr ":4000" | findstr "LISTENING" | Select-Object -First 1).Split()[-1]
if ($processId) {
    Stop-Process -Id $processId -Force
    Write-Host "Zatrzymano proces $processId" -ForegroundColor Green
}
```

### Krok 2: Sprawdź czy baza danych działa

```powershell
# Sprawdź status kontenerów Docker
docker-compose ps

# Jeśli PostgreSQL nie działa, uruchom:
docker-compose up -d postgres redis

# Poczekaj aż baza będzie gotowa (około 10 sekund)
Start-Sleep -Seconds 10
```

### Krok 3: Sprawdź logi błędów

```powershell
# Jeśli używasz Dockera:
docker-compose logs api --tail 50

# Jeśli uruchamiasz lokalnie, sprawdź terminal gdzie działa backend
```

### Krok 4: Uruchom backend ponownie

```powershell
cd C:\Users\Admin\Documents\GitHub\netflow-cms

# Uruchom backend
pnpm --filter api dev
```

**Sprawdź czy widzisz w logach:**
```
[Bootstrap] CORS enabled for origin: http://localhost:3000
[Bootstrap] API running on http://localhost:4000/api/v1
```

### Krok 5: Sprawdź czy backend odpowiada

W nowym terminalu:
```powershell
# Test health endpoint
Invoke-WebRequest -Uri http://localhost:4000/api/v1/health -Method GET -UseBasicParsing

# Powinno zwrócić: {"status":"ok"}
```

## Częste przyczyny zawieszenia

### 1. Baza danych nie działa
**Objawy:** Backend nie może połączyć się z PostgreSQL

**Rozwiązanie:**
```powershell
docker-compose up -d postgres redis
```

### 2. Błędy TypeScript
**Objawy:** Backend nie może się skompilować

**Rozwiązanie:**
```powershell
# Sprawdź błędy TypeScript
pnpm --filter api type-check

# Napraw błędy lub tymczasowo wyłącz strict mode w tsconfig.json
```

### 3. Port zajęty przez inny proces
**Objawy:** Backend nie może nasłuchiwać na porcie 4000

**Rozwiązanie:**
```powershell
# Znajdź proces na porcie 4000
netstat -ano | findstr ":4000"

# Zatrzymaj proces (użyj PID z poprzedniego polecenia)
Stop-Process -Id <PID> -Force
```

### 4. Błędy Prisma
**Objawy:** Prisma Client nie jest wygenerowany lub baza nie ma migracji

**Rozwiązanie:**
```powershell
# Wygeneruj Prisma Client
pnpm --filter api db:generate

# Uruchom migracje
pnpm --filter api db:migrate
```

## Szybkie rozwiązanie (wszystko razem)

```powershell
cd C:\Users\Admin\Documents\GitHub\netflow-cms

# 1. Zatrzymaj backend jeśli działa
$processId = (netstat -ano | findstr ":4000" | findstr "LISTENING" | Select-Object -First 1).Split()[-1]
if ($processId) {
    Stop-Process -Id $processId -Force
    Write-Host "Stopped process $processId" -ForegroundColor Green
}

# 2. Uruchom bazy danych
docker-compose up -d postgres redis
Start-Sleep -Seconds 10

# 3. Wygeneruj Prisma Client
pnpm --filter api db:generate

# 4. Uruchom backend
pnpm --filter api dev
```

## Weryfikacja

Po uruchomieniu backendu, sprawdź w nowym terminalu:
```powershell
# Test health endpoint
Invoke-WebRequest -Uri http://localhost:4000/api/v1/health -Method GET -UseBasicParsing

# Powinno zwrócić: Status 200 i {"status":"ok"}
```

Jeśli nadal nie działa, sprawdź logi backendu w terminalu gdzie go uruchomiłeś.




