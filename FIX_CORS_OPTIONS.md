# Naprawa Błędu CORS - OPTIONS Request

## Problem

**Błąd CORS z OPTIONS request:**
```
XHROPTIONS http://localhost:4000/api/v1/auth/me/tenants
CORS Failed

Zablokowano żądanie do zasobu innego pochodzenia: zasady „Same Origin Policy” nie pozwalają wczytywać zdalnych zasobów z „http://localhost:4000/api/v1/auth/me/tenants" (nieudane żądanie CORS).
```

## Przyczyna

Backend nie obsługuje poprawnie **preflight OPTIONS requests**. Gdy przeglądarka wysyła request z nagłówkiem `Authorization`, najpierw wysyła OPTIONS request, aby sprawdzić czy CORS pozwala na taki request.

## Rozwiązanie

### ✅ Poprawiona Konfiguracja CORS

**Zmiany w `apps/api/src/main.ts`:**

1. **Funkcja origin callback** - bardziej elastyczna konfiguracja
2. **preflightContinue: false** - NestJS obsługuje preflight requests
3. **optionsSuccessStatus: 204** - OPTIONS requests zwracają 204
4. **Więcej allowed headers** - dodano `Accept` i `Origin`
5. **HEAD method** - dodano obsługę HEAD

**Nowa konfiguracja:**
```typescript
app.enableCors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    // Allow requests from frontend URL
    if (origin === frontendUrl || origin === 'http://localhost:3000') {
      return callback(null, true);
    }
    // In development, allow localhost with any port
    if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
```

## Jak Naprawić

### Krok 1: Restart Backend

**WAŻNE:** Musisz zrestartować backend, aby zmiany weszły w życie!

```bash
# Zatrzymaj backend (Ctrl+C)
# Uruchom ponownie:
pnpm --filter api dev
```

**Sprawdź logi:**
Powinieneś zobaczyć:
```
[Bootstrap] CORS enabled for origin: http://localhost:3000
[Bootstrap] API running on http://localhost:4000/api/v1
```

### Krok 2: Sprawdź OPTIONS Request

**W DevTools → Network tab:**
1. Sprawdź OPTIONS request do `/api/v1/auth/me/tenants`
2. Sprawdź Response Headers:
   - `Access-Control-Allow-Origin: http://localhost:3000`
   - `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD`
   - `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin`
   - `Access-Control-Allow-Credentials: true`
3. Status powinien być **204 No Content**

### Krok 3: Sprawdź GET Request

Po udanym OPTIONS request, powinien być GET request:
1. Status: **200 OK**
2. Response: Lista tenantów
3. Brak błędów CORS

## Weryfikacja

### Test OPTIONS Request

Możesz przetestować OPTIONS request ręcznie:

**Windows PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/v1/auth/me/tenants" -Method OPTIONS -Headers @{"Origin"="http://localhost:3000"; "Access-Control-Request-Method"="GET"; "Access-Control-Request-Headers"="authorization"} -UseBasicParsing
```

**Linux/Mac:**
```bash
curl -X OPTIONS http://localhost:4000/api/v1/auth/me/tenants \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  -v
```

**Oczekiwany wynik:**
- Status: 204 No Content
- Headers zawierają `Access-Control-Allow-*`

### Sprawdź w Przeglądarce

1. Otwórz http://localhost:3000/tenants
2. Otwórz DevTools (F12) → Network tab
3. Sprawdź requesty:
   - **OPTIONS** → Status 204, Headers CORS OK
   - **GET** → Status 200, Response OK
4. **Brak błędów CORS**

## Jeśli Nadal Nie Działa

### Problem 1: Backend nie został zrestartowany

**Rozwiązanie:**
```bash
# Zatrzymaj backend (Ctrl+C)
# Uruchom ponownie:
pnpm --filter api dev
```

### Problem 2: Backend nie działa

**Sprawdź:**
```bash
# Sprawdź czy backend działa
curl http://localhost:4000/api/v1/health

# Powinno zwrócić: {"status":"ok"}
```

**Jeśli nie działa:**
```bash
# Uruchom backend
pnpm --filter api dev
```

### Problem 3: Port 4000 jest zajęty

**Sprawdź:**
```bash
# Windows PowerShell
netstat -ano | findstr :4000

# Linux/Mac
lsof -i :4000
```

**Rozwiązanie:**
- Zatrzymaj proces używający portu 4000
- Lub zmień port w `.env`: `PORT=4001`

### Problem 4: CORS nadal blokuje

**Sprawdź logi backendu:**
```bash
pnpm --filter api dev
```

**Sprawdź czy widzisz:**
```
[Bootstrap] CORS enabled for origin: http://localhost:3000
```

**Jeśli nie widzisz:**
- Sprawdź czy `FRONTEND_URL` jest ustawione w `.env`
- Sprawdź czy backend został zrestartowany

## Podsumowanie

**Zmiany:**
1. ✅ Poprawiona konfiguracja CORS z funkcją origin callback
2. ✅ Dodano `preflightContinue: false` dla obsługi OPTIONS
3. ✅ Dodano `optionsSuccessStatus: 204` dla OPTIONS requests
4. ✅ Dodano więcej allowed headers
5. ✅ Dodano HEAD method

**Następne kroki:**
1. **RESTART BACKEND** - To jest kluczowe!
2. Sprawdź logi backendu - powinieneś zobaczyć "CORS enabled for origin"
3. Sprawdź w przeglądarce - OPTIONS request powinien mieć status 204
4. Sprawdź GET request - powinien działać bez błędów CORS

---

**WAŻNE:** Musisz zrestartować backend, aby zmiany weszły w życie!

**Autor:** AI Assistant  
**Data:** 2025-01-09

