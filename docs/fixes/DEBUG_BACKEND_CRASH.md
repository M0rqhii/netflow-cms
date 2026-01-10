# Debugowanie Crash Backendu

## Problem

Backend się uruchamia (pokazuje logi), ale potem się crashuje lub nie odpowiada na requesty.

**Logi:**
```
[Bootstrap] CORS enabled for origin: http://localhost:3000
[Bootstrap] API running on http://localhost:4000/api/v1
```

**Ale:**
- Health check nie działa: "Połączenie zostało nieoczekiwanie zakończone"
- CORS nadal nie działa
- Backend nie odpowiada na requesty

## Możliwe Przyczyny

### 1. Backend Crashuje Po Starcie

**Sprawdź logi w terminalu:**
- Czy widzisz błędy po logach startowych?
- Czy backend się restartuje w pętli?
- Czy są wyjątki?

**Możliwe przyczyny:**
- Błąd połączenia z bazą danych
- Błąd połączenia z Redis
- Błąd w kodzie (wyjątek)
- Brakujące zmienne środowiskowe

### 2. Backend Nie Może Połączyć Się Z Bazą Danych

**Sprawdź:**
- Czy PostgreSQL działa?
- Czy `DATABASE_URL` jest poprawnie skonfigurowany?
- Czy migracje zostały uruchomione?

**Rozwiązanie:**
```powershell
# Sprawdź czy PostgreSQL działa
docker-compose ps postgres

# Sprawdź DATABASE_URL
# apps/api/.env lub .env
DATABASE_URL=postgresql://netflow:netflow_dev_password@localhost:5432/netflow_cms?schema=public
```

### 3. Backend Nie Może Połączyć Się Z Redis

**Sprawdź:**
- Czy Redis działa?
- Czy `REDIS_URL` jest poprawnie skonfigurowany?

**Rozwiązanie:**
```powershell
# Sprawdź czy Redis działa
docker-compose ps redis

# Sprawdź REDIS_URL
# apps/api/.env lub .env
REDIS_URL=redis://localhost:6379
```

### 4. Brakujące Zmienne Środowiskowe

**Sprawdź:**
- Czy `.env` istnieje?
- Czy wszystkie wymagane zmienne są ustawione?

**Wymagane zmienne:**
```env
DATABASE_URL=postgresql://netflow:netflow_dev_password@localhost:5432/netflow_cms?schema=public
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000
PORT=4000
JWT_SECRET=dev-jwt-secret-change-in-production
```

## Rozwiązanie

### Krok 1: Sprawdź Logi Backendu

**W terminalu gdzie działa backend:**
- Sprawdź czy są błędy po logach startowych
- Sprawdź czy backend się restartuje
- Sprawdź czy są wyjątki

### Krok 2: Sprawdź Docker Services

```powershell
# Sprawdź czy PostgreSQL i Redis działają
docker-compose ps

# Jeśli nie działają, uruchom:
docker-compose up -d postgres redis
```

### Krok 3: Sprawdź Environment Variables

**Utwórz `.env` w root lub `apps/api/.env`:**
```env
DATABASE_URL=postgresql://netflow:netflow_dev_password@localhost:5432/netflow_cms?schema=public
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000
PORT=4000
NODE_ENV=development
API_PREFIX=/api/v1
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_EXPIRES_IN=604800
```

### Krok 4: Zrestartuj Backend

```powershell
# Zatrzymaj backend (Ctrl+C)
# Uruchom ponownie:
cd E:\netflow-cms
pnpm --filter api dev
```

**Sprawdź logi:**
- Czy widzisz błędy?
- Czy backend się uruchomił poprawnie?
- Czy widzisz "CORS enabled for origin"?

### Krok 5: Sprawdź Health Check

```powershell
# Poczekaj 5 sekund po starcie backendu
Start-Sleep -Seconds 5
Invoke-WebRequest -Uri "http://localhost:4000/api/v1/health" -UseBasicParsing
```

**Oczekiwany wynik:**
- Status: 200 OK
- Response: `{"status":"ok"}`

## Jeśli Nadal Nie Działa

### Problem 1: Backend Crashuje Z Błędem Bazy Danych

**Rozwiązanie:**
```powershell
# Uruchom migracje
cd E:\netflow-cms
pnpm --filter api db:migrate

# Sprawdź czy baza działa
docker-compose ps postgres
```

### Problem 2: Backend Crashuje Z Błędem Redis

**Rozwiązanie:**
```powershell
# Sprawdź czy Redis działa
docker-compose ps redis

# Jeśli nie działa, uruchom:
docker-compose up -d redis
```

### Problem 3: Backend Crashuje Z Innym Błędem

**Sprawdź logi:**
- Skopiuj błąd z terminala
- Sprawdź stack trace
- Sprawdź czy są wyjątki

## Podsumowanie

**Sprawdź:**
1. ✅ Logi backendu - czy są błędy?
2. ✅ Docker services - czy PostgreSQL i Redis działają?
3. ✅ Environment variables - czy są ustawione?
4. ✅ Health check - czy backend odpowiada?

**Jeśli backend crashuje:**
- Sprawdź logi w terminalu
- Sprawdź błędy połączenia z bazą/Redis
- Sprawdź czy wszystkie zmienne są ustawione

---

**Autor:** AI Assistant  
**Data:** 2025-01-09

