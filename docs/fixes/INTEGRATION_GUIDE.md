# Integration Guide - Frontend i Backend

**Data:** 2025-01-09  
**Status:** ✅ Gotowe do użycia

## Przegląd Integracji

Frontend (Next.js) i Backend (NestJS) są w pełni zintegrowane i gotowe do użycia. Ten dokument opisuje jak uruchomić i skonfigurować cały stack.

## Architektura Integracji

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │         │    Backend      │
│   (Next.js)     │────────▶│   (NestJS)      │
│   Port: 3000    │  HTTP   │   Port: 4000    │
└─────────────────┘         └─────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │   PostgreSQL    │
                            │   Port: 5432    │
                            └─────────────────┘
                                      │
                                      ▼
                            ┌─────────────────┐
                            │     Redis       │
                            │   Port: 6379    │
                            └─────────────────┘
```

## Konfiguracja

### Zmienne Środowiskowe

#### Backend (.env w root lub apps/api/.env)

```env
# Database
DATABASE_URL=postgresql://netflow:netflow_dev_password@localhost:5432/netflow_cms?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379

# API
PORT=4000
NODE_ENV=development
API_PREFIX=/api/v1

# Frontend URL (dla CORS)
FRONTEND_URL=http://localhost:3000

# Security
JWT_SECRET=dev-jwt-secret-change-in-production
JWT_EXPIRES_IN=604800
REFRESH_TOKEN_SECRET=dev-refresh-token-secret-change-in-production
REFRESH_TOKEN_EXPIRES_IN=604800
```

#### Frontend (.env.local w apps/admin/)

```env
# API URL (dostępne w przeglądarce)
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

**Uwaga:** `NEXT_PUBLIC_*` zmienne są dostępne w przeglądarce, więc nie używaj tam sekretów!

## Uruchomienie

### Opcja 1: Docker Compose (Rekomendowane)

```bash
# Uruchom wszystkie serwisy (postgres, redis, api, admin)
docker-compose up -d

# Zobacz logi
docker-compose logs -f

# Zatrzymaj wszystkie serwisy
docker-compose down
```

### Opcja 2: Lokalne Uruchomienie

#### Krok 1: Uruchom Docker Services

```bash
# Uruchom tylko postgres i redis
docker-compose up -d postgres redis

# Sprawdź czy działają
docker-compose ps
```

#### Krok 2: Skonfiguruj Backend

```bash
# Zainstaluj zależności
pnpm install

# Wygeneruj Prisma Client
pnpm --filter api db:generate

# Uruchom migracje
pnpm --filter api db:migrate

# (Opcjonalnie) Seed database
pnpm --filter api db:seed
```

#### Krok 3: Uruchom Backend i Frontend

```bash
# Uruchom oba w jednym poleceniu (Turbo)
pnpm dev

# Lub osobno:
# Terminal 1 - Backend
pnpm --filter api dev

# Terminal 2 - Frontend
pnpm --filter admin dev
```

### Opcja 3: Użyj Skryptów

#### Windows (PowerShell)

```powershell
# Uruchom cały stack
.\scripts\start-dev.ps1

# Lub użyj istniejącego skryptu
.\scripts\dev.ps1 up
```

#### Linux/Mac

```bash
# Uruchom cały stack
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

## Weryfikacja Integracji

### 1. Sprawdź Backend

```bash
# Health check
curl http://localhost:4000/api/v1/health

# Powinno zwrócić: {"status":"ok"}
```

### 2. Sprawdź Frontend

Otwórz w przeglądarce: http://localhost:3000

### 3. Sprawdź CORS

W konsoli przeglądarki (F12) sprawdź czy nie ma błędów CORS.

### 4. Test Logowania

1. Otwórz http://localhost:3000/login
2. Zaloguj się (jeśli masz konto)
3. Sprawdź czy token jest zapisany w localStorage
4. Sprawdź czy możesz przejść do dashboard

## Konfiguracja API Client

### SDK (Rekomendowane)

Frontend używa SDK z `@repo/sdk`:

```typescript
import { createApiClient } from '@repo/sdk';

const api = createApiClient();
// Automatycznie używa NEXT_PUBLIC_API_URL z env
```

### Bezpośrednie Fetch

Możesz też używać bezpośrednio fetch:

```typescript
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const response = await fetch(`${baseUrl}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
```

## Autentykacja

### Flow Logowania

1. **Global Login** (`/login`)
   - Użytkownik loguje się bez `siteId`
   - Backend zwraca `access_token` (global token)
   - Token zapisywany w `localStorage` jako `authToken`

2. **Hub Access** (`/dashboard`)
   - Używa global token do pobrania listy siteów
   - Endpoint: `GET /api/v1/auth/me/sites`

3. **Site Switch** (`/site/[slug]`)
   - Wymiana global token na site-scoped token
   - Endpoint: `POST /api/v1/auth/site-token`
   - Token zapisywany jako `siteToken:{siteId}`

### Przechowywanie Tokenów

```typescript
// Global token
localStorage.setItem('authToken', token);

// Site token
localStorage.setItem(`siteToken:${siteId}`, token);
```

## CORS Configuration

Backend jest skonfigurowany do akceptowania requestów z frontendu:

```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
```

**Uwaga:** W produkcji ustaw `FRONTEND_URL` na właściwy URL.

## Troubleshooting

### Problem: CORS Errors

**Rozwiązanie:**
- Sprawdź czy `FRONTEND_URL` w backendzie odpowiada URL frontendu
- Sprawdź czy frontend używa `NEXT_PUBLIC_API_URL`
- Sprawdź czy `credentials: true` jest ustawione w CORS

### Problem: 401 Unauthorized

**Rozwiązanie:**
- Sprawdź czy token jest w localStorage
- Sprawdź czy token nie wygasł
- Sprawdź czy token jest wysyłany w headerze: `Authorization: Bearer <token>`

### Problem: Backend nie odpowiada

**Rozwiązanie:**
- Sprawdź czy backend działa: `curl http://localhost:4000/api/v1/health`
- Sprawdź logi: `docker-compose logs api` lub `pnpm --filter api dev`
- Sprawdź czy port 4000 nie jest zajęty

### Problem: Frontend nie łączy się z backendem

**Rozwiązanie:**
- Sprawdź czy `NEXT_PUBLIC_API_URL` jest ustawione
- Sprawdź czy backend działa
- Sprawdź czy nie ma błędów w konsoli przeglądarki

### Problem: Database Connection Error

**Rozwiązanie:**
- Sprawdź czy PostgreSQL działa: `docker-compose ps postgres`
- Sprawdź `DATABASE_URL` w .env
- Sprawdź czy migracje zostały uruchomione: `pnpm --filter api db:migrate`

## Development Workflow

### 1. Rozpocznij Development

```bash
# Terminal 1: Docker services
docker-compose up -d postgres redis

# Terminal 2: Backend + Frontend
pnpm dev
```

### 2. Hot Reload

- **Backend:** Automatyczny restart przy zmianach (NestJS watch mode)
- **Frontend:** Automatyczny reload przy zmianach (Next.js dev mode)

### 3. Debugging

#### Backend

```bash
# Logi w czasie rzeczywistym
docker-compose logs -f api

# Lub lokalnie
pnpm --filter api dev
```

#### Frontend

- Otwórz DevTools (F12)
- Sprawdź Network tab dla requestów do API
- Sprawdź Console dla błędów

## Production Deployment

### Environment Variables

Ustaw następujące zmienne w produkcji:

**Backend:**
- `DATABASE_URL` - Production database URL
- `REDIS_URL` - Production Redis URL
- `JWT_SECRET` - Strong secret key
- `FRONTEND_URL` - Production frontend URL
- `NODE_ENV=production`

**Frontend:**
- `NEXT_PUBLIC_API_URL` - Production API URL

### Build

```bash
# Build wszystkich aplikacji
pnpm build

# Build backend
pnpm --filter api build

# Build frontend
pnpm --filter admin build
```

## Podsumowanie

✅ **Frontend i Backend są w pełni zintegrowane**

- ✅ CORS skonfigurowany
- ✅ API Client (SDK) skonfigurowany
- ✅ Autentykacja działa
- ✅ Token management działa
- ✅ Docker Compose gotowy
- ✅ Skrypty pomocnicze gotowe

## Następne Kroki

1. Uruchom stack: `pnpm dev` lub `docker-compose up`
2. Otwórz http://localhost:3000
3. Zaloguj się i przetestuj funkcjonalności
4. Sprawdź logi jeśli coś nie działa

---

**Autor:** AI Assistant  
**Data:** 2025-01-09

