# Troubleshooting: NetworkError w Sites

**Problem:** NetworkError when attempting to fetch resource w `/sites`

## Możliwe Przyczyny

### 1. ⚠️ Backend nie działa

**Sprawdź:**
```bash
# Sprawdź czy backend działa
curl http://localhost:4000/api/v1/health

# Powinno zwrócić: {"status":"ok"}
```

**Rozwiązanie:**
```bash
# Uruchom backend
pnpm --filter api dev

# Lub w Dockerze
docker-compose up -d api
```

### 2. ⚠️ NEXT_PUBLIC_API_URL nie jest ustawione

**Problem:** Frontend nie wie gdzie jest backend API.

**Sprawdź:**
- Otwórz DevTools (F12) → Console
- Sprawdź czy widzisz błąd z URL API
- Sprawdź Network tab → zobacz jaki URL jest używany

**Rozwiązanie:**

#### Opcja A: Utwórz `.env.local` w `apps/admin/`

```bash
# apps/admin/.env.local
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

#### Opcja B: Ustaw w systemie (Windows PowerShell)

```powershell
$env:NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
pnpm --filter admin dev
```

#### Opcja C: Użyj Docker Compose

Docker Compose automatycznie ustawia `NEXT_PUBLIC_API_URL`:
```bash
docker-compose up -d
```

### 3. ⚠️ CORS blokuje requesty

**Problem:** Backend nie akceptuje requestów z frontendu.

**Sprawdź:**
- Otwórz DevTools (F12) → Console
- Sprawdź czy widzisz błąd CORS

**Rozwiązanie:**

Upewnij się, że backend ma ustawione:
```env
FRONTEND_URL=http://localhost:3000
```

W `apps/api/.env` lub `apps/api/src/main.ts`:
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
```

### 4. ⚠️ Błędny URL API

**Problem:** URL API jest niepoprawny.

**Sprawdź:**
- SDK używa: `process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'`
- Sprawdź czy URL jest poprawny (z `/api/v1` na końcu)

**Rozwiązanie:**

Upewnij się, że URL ma format:
```
http://localhost:4000/api/v1
```

**NIE:**
- `http://localhost:4000` ❌ (brak `/api/v1`)
- `http://localhost:4000/api/v1/` ❌ (niepotrzebny `/` na końcu)

### 5. ⚠️ Token nie jest ustawiony

**Problem:** Brak tokenu autentykacji.

**Sprawdź:**
- Otwórz DevTools (F12) → Application → Local Storage
- Sprawdź czy `authToken` istnieje

**Rozwiązanie:**
- Zaloguj się ponownie na `/login`
- Sprawdź czy token jest zapisany w localStorage

## Szybkie Rozwiązanie

### Krok 1: Sprawdź Backend

```bash
# Sprawdź czy backend działa
curl http://localhost:4000/api/v1/health

# Jeśli nie działa, uruchom:
pnpm --filter api dev
```

### Krok 2: Utwórz `.env.local` w Frontend

```bash
# Utwórz plik: apps/admin/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" > apps/admin/.env.local
```

### Krok 3: Restart Frontend

```bash
# Zatrzymaj frontend (Ctrl+C)
# Uruchom ponownie:
pnpm --filter admin dev
```

### Krok 4: Sprawdź w Przeglądarce

1. Otwórz http://localhost:3000/sites
2. Otwórz DevTools (F12) → Network tab
3. Sprawdź request do `/api/v1/auth/me/sites`
4. Sprawdź:
   - **Status:** Powinno być 200 OK
   - **URL:** Powinno być `http://localhost:4000/api/v1/auth/me/sites`
   - **Headers:** Powinno mieć `Authorization: Bearer <token>`

## Debugowanie

### 1. Sprawdź Console w Przeglądarce

Otwórz DevTools (F12) → Console i sprawdź błędy.

### 2. Sprawdź Network Tab

Otwórz DevTools (F12) → Network i sprawdź:
- Czy request jest wysyłany
- Jaki jest status odpowiedzi
- Jaki jest URL requestu
- Czy są błędy CORS

### 3. Sprawdź Backend Logi

```bash
# Zobacz logi backendu
pnpm --filter api dev

# Lub w Dockerze
docker-compose logs -f api
```

### 4. Sprawdź Environment Variables

**Frontend:**
```bash
# W przeglądarce Console:
console.log(process.env.NEXT_PUBLIC_API_URL)
```

**Backend:**
```bash
# W logach backendu sprawdź:
# FRONTEND_URL powinno być ustawione
```

## Najczęstsze Problemy

### Problem 1: Backend nie działa

**Objawy:**
- NetworkError w przeglądarce
- `curl http://localhost:4000/api/v1/health` nie działa

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
- Request jest zablokowany

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

## Sprawdzenie Konfiguracji

### Frontend

**Plik:** `apps/admin/.env.local` (lub `.env`)
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

**Sprawdź w kodzie:**
```typescript
// packages/sdk/src/index.ts
const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
```

### Backend

**Plik:** `apps/api/.env` (lub `.env`)
```env
FRONTEND_URL=http://localhost:3000
PORT=4000
API_PREFIX=/api/v1
```

**Sprawdź w kodzie:**
```typescript
// apps/api/src/main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
```

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

4. **Sprawdź w przeglądarce:**
   - Otwórz http://localhost:3000/sites
   - Sprawdź DevTools → Network tab
   - Sprawdź czy request działa

---

**Autor:** AI Assistant  
**Data:** 2025-01-09

