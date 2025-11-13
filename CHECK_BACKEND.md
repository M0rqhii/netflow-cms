# Sprawdzenie Czy Backend Działa

## Problem

CORS nadal blokuje OPTIONS requests, co oznacza że:
1. Backend nie działa
2. Backend nie został zrestartowany po zmianach
3. Backend działa, ale CORS nie jest poprawnie skonfigurowany

## Sprawdzenie

### Krok 1: Sprawdź Czy Backend Działa

```bash
# Sprawdź health check
curl http://localhost:4000/api/v1/health

# Powinno zwrócić: {"status":"ok"}
```

**Jeśli nie działa:**
- Backend nie jest uruchomiony
- Musisz uruchomić backend: `pnpm --filter api dev`

### Krok 2: Sprawdź Czy Port 4000 Jest Zajęty

**Windows PowerShell:**
```powershell
netstat -ano | findstr :4000
```

**Linux/Mac:**
```bash
lsof -i :4000
```

**Jeśli port jest zajęty:**
- Backend prawdopodobnie działa
- Sprawdź logi backendu

**Jeśli port nie jest zajęty:**
- Backend nie działa
- Uruchom backend: `pnpm --filter api dev`

### Krok 3: Sprawdź Logi Backendu

**Jeśli backend działa, powinieneś zobaczyć:**
```
[Bootstrap] CORS enabled for origin: http://localhost:3000
[Bootstrap] API running on http://localhost:4000/api/v1
```

**Jeśli nie widzisz tych logów:**
- Backend nie został zrestartowany po zmianach
- Zrestartuj backend: Zatrzymaj (Ctrl+C) i uruchom ponownie

## Rozwiązanie

### Jeśli Backend Nie Działa

```bash
# Uruchom backend
cd E:\netflow-cms
pnpm --filter api dev
```

**Sprawdź logi:**
- Powinieneś zobaczyć "CORS enabled for origin"
- Powinieneś zobaczyć "API running on http://localhost:4000/api/v1"

### Jeśli Backend Działa, Ale CORS Nie Działa

**Problem:** Backend nie został zrestartowany po zmianach w `main.ts`

**Rozwiązanie:**
1. Zatrzymaj backend (Ctrl+C w terminalu gdzie działa)
2. Uruchom ponownie: `pnpm --filter api dev`
3. Sprawdź logi - powinieneś zobaczyć "CORS enabled for origin"

### Jeśli Backend Działa, Ale OPTIONS Nadal Nie Działa

**Problem:** CORS może być skonfigurowany po innych middleware

**Sprawdź `apps/api/src/main.ts`:**
- CORS powinien być skonfigurowany PRZED `app.setGlobalPrefix()`
- CORS powinien mieć `preflightContinue: false`
- CORS powinien mieć `optionsSuccessStatus: 204`

## Weryfikacja

### Test OPTIONS Request

**Windows PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/v1/auth/me/tenants" -Method OPTIONS -Headers @{"Origin"="http://localhost:3000"; "Access-Control-Request-Method"="GET"; "Access-Control-Request-Headers"="authorization"} -UseBasicParsing
```

**Oczekiwany wynik:**
- Status: 204 No Content
- Headers zawierają `Access-Control-Allow-Origin: http://localhost:3000`

### Test GET Request

```bash
curl http://localhost:4000/api/v1/health

# Powinno zwrócić: {"status":"ok"}
```

## Najczęstsze Problemy

### Problem 1: Backend Nie Jest Uruchomiony

**Objawy:**
- `curl http://localhost:4000/api/v1/health` nie działa
- Port 4000 nie jest zajęty

**Rozwiązanie:**
```bash
pnpm --filter api dev
```

### Problem 2: Backend Nie Został Zrestartowany

**Objawy:**
- Backend działa, ale CORS nie działa
- Logi nie pokazują "CORS enabled for origin"

**Rozwiązanie:**
1. Zatrzymaj backend (Ctrl+C)
2. Uruchom ponownie: `pnpm --filter api dev`
3. Sprawdź logi

### Problem 3: CORS Jest Skonfigurowany Po Innych Middleware

**Objawy:**
- Backend działa, logi pokazują CORS, ale OPTIONS nie działa

**Rozwiązanie:**
- Sprawdź kolejność w `main.ts` - CORS powinien być PRZED `setGlobalPrefix()`

## Podsumowanie

**Sprawdź:**
1. ✅ Czy backend działa: `curl http://localhost:4000/api/v1/health`
2. ✅ Czy port 4000 jest zajęty: `netstat -ano | findstr :4000`
3. ✅ Czy logi pokazują "CORS enabled for origin"

**Jeśli backend nie działa:**
- Uruchom: `pnpm --filter api dev`

**Jeśli backend działa, ale CORS nie:**
- Zrestartuj backend
- Sprawdź logi

---

**Autor:** AI Assistant  
**Data:** 2025-01-09

