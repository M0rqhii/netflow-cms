# Szybka Naprawa: NetworkError w Sites

## Problem

NetworkError when attempting to fetch resource w `/sites`

## Szybkie Rozwiązanie (3 kroki)

### Krok 1: Sprawdź czy Backend działa

```bash
# Sprawdź health check
curl http://localhost:4000/api/v1/health

# Powinno zwrócić: {"status":"ok"}
```

**Jeśli nie działa:**
```bash
# Uruchom backend
pnpm --filter api dev
```

### Krok 2: Utwórz `.env.local` w Frontend

```bash
# Utwórz plik: apps/admin/.env.local
# Windows PowerShell:
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" | Out-File -FilePath apps/admin/.env.local -Encoding utf8

# Linux/Mac:
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" > apps/admin/.env.local
```

### Krok 3: Restart Frontend

```bash
# Zatrzymaj frontend (Ctrl+C)
# Uruchom ponownie:
pnpm --filter admin dev
```

## Sprawdzenie

1. Otwórz http://localhost:3000/sites
2. Otwórz DevTools (F12) → Console
3. Sprawdź czy widzisz logi `[SDK] Request: http://localhost:4000/api/v1/auth/me/sites`
4. Sprawdź Network tab → czy request ma status 200 OK

## Jeśli nadal nie działa

### Sprawdź w DevTools

1. **Console tab:**
   - Sprawdź czy widzisz błąd z URL API
   - Sprawdź czy widzisz logi `[SDK] Request:`

2. **Network tab:**
   - Sprawdź request do `/api/v1/auth/me/sites`
   - Sprawdź URL requestu (powinno być `http://localhost:4000/api/v1/auth/me/sites`)
   - Sprawdź status (powinno być 200 OK)
   - Sprawdź czy są błędy CORS

3. **Application tab → Local Storage:**
   - Sprawdź czy `authToken` istnieje
   - Jeśli nie, zaloguj się ponownie na `/login`

### Sprawdź Backend Logi

```bash
# Zobacz logi backendu
pnpm --filter api dev

# Lub w Dockerze
docker-compose logs -f api
```

### Sprawdź Environment Variables

**Frontend:**
- Sprawdź czy `apps/admin/.env.local` istnieje
- Sprawdź czy zawiera: `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`

**Backend:**
- Sprawdź czy `apps/api/.env` istnieje
- Sprawdź czy zawiera: `FRONTEND_URL=http://localhost:3000`

## Najczęstsze Problemy

### Problem 1: Backend nie działa

**Objawy:**
- `curl http://localhost:4000/api/v1/health` nie działa
- NetworkError w przeglądarce

**Rozwiązanie:**
```bash
pnpm --filter api dev
```

### Problem 2: NEXT_PUBLIC_API_URL nie jest ustawione

**Objawy:**
- Request idzie do `undefined/api/v1/auth/me/sites`
- NetworkError

**Rozwiązanie:**
```bash
# Utwórz apps/admin/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" > apps/admin/.env.local
# Restart frontend
```

### Problem 3: CORS Error

**Objawy:**
- Błąd w Console: "CORS policy: No 'Access-Control-Allow-Origin' header"

**Rozwiązanie:**
```bash
# Ustaw FRONTEND_URL w backendzie
# apps/api/.env
FRONTEND_URL=http://localhost:3000
# Restart backend
```

### Problem 4: Token nie jest ustawiony

**Objawy:**
- 401 Unauthorized
- "Missing auth token" w Console

**Rozwiązanie:**
- Zaloguj się ponownie na `/login`

## Podsumowanie

**Najczęstsze rozwiązanie:**

1. **Utwórz `.env.local` w frontend:**
   ```bash
   echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" > apps/admin/.env.local
   ```

2. **Upewnij się, że backend działa:**
   ```bash
   curl http://localhost:4000/api/v1/health
   ```

3. **Restart frontend:**
   ```bash
   pnpm --filter admin dev
   ```

---

**Więcej informacji:** `TROUBLESHOOTING_NETWORK_ERROR.md`

