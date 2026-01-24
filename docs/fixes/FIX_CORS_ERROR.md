# Naprawa Błędu CORS

## Problem

**Błąd CORS:**
```
Zablokowano żądanie do zasobu innego pochodzenia: zasady „Same Origin Policy” nie pozwalają wczytywać zdalnych zasobów z „http://localhost:4000/api/v1/auth/me/sites" (nieudane żądanie CORS).
```

## Rozwiązanie

### 1. ✅ Poprawiona Konfiguracja CORS

**Zmiany w `apps/api/src/main.ts`:**
- ✅ Dodano wszystkie potrzebne metody HTTP
- ✅ Dodano wszystkie potrzebne nagłówki
- ✅ Dodano logowanie konfiguracji CORS

**Nowa konfiguracja:**
```typescript
app.enableCors({
  origin: frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Total-Count'],
});
```

### 2. ✅ Naprawione Ostrzeżenia Next.js

**Zmiany w `apps/admin/src/app/layout.tsx`:**
- ✅ Dodano `suppressHydrationWarning` do `<html>` i `<body>`
- ✅ Naprawiono ostrzeżenie o `data-theme` attribute

**Zmiany w `apps/admin/src/app/login/page.tsx`:**
- ✅ Dodano style do obrazka, aby naprawić ostrzeżenie o width/height

## Jak Naprawić

### Krok 1: Restart Backend

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

### Krok 2: Sprawdź Environment Variables

**Backend (`apps/api/.env` lub `.env`):**
```env
FRONTEND_URL=http://localhost:3000
PORT=4000
```

**Frontend (`apps/admin/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

### Krok 3: Sprawdź w Przeglądarce

1. Otwórz http://localhost:3000/sites
2. Otwórz DevTools (F12) → Network tab
3. Sprawdź request do `/api/v1/auth/me/sites`
4. Sprawdź:
   - **Status:** Powinno być 200 OK
   - **Headers:** Powinno mieć `Access-Control-Allow-Origin: http://localhost:3000`
   - **Brak błędów CORS**

## Weryfikacja

### Sprawdź CORS Headers

W DevTools → Network → Request → Headers, sprawdź czy widzisz:

```
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With
```

### Sprawdź Backend Logi

```bash
# Zobacz logi backendu
pnpm --filter api dev

# Powinieneś zobaczyć:
# [Bootstrap] CORS enabled for origin: http://localhost:3000
# [Bootstrap] API running on http://localhost:4000/api/v1
```

## Jeśli Nadal Nie Działa

### Problem 1: Backend nie ma FRONTEND_URL

**Rozwiązanie:**
```bash
# Utwórz apps/api/.env
echo "FRONTEND_URL=http://localhost:3000" > apps/api/.env
# Restart backend
```

### Problem 2: Frontend nie ma NEXT_PUBLIC_API_URL

**Rozwiązanie:**
```bash
# Utwórz apps/admin/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" > apps/admin/.env.local
# Restart frontend
```

### Problem 3: Backend nie działa

**Rozwiązanie:**
```bash
# Sprawdź czy backend działa
curl http://localhost:4000/api/v1/health

# Jeśli nie działa, uruchom:
pnpm --filter api dev
```

## Podsumowanie

**Zmiany:**
1. ✅ Poprawiona konfiguracja CORS w backendzie
2. ✅ Naprawione ostrzeżenia Next.js o `data-theme`
3. ✅ Naprawione ostrzeżenie o obrazku

**Następne kroki:**
1. Restart backend: `pnpm --filter api dev`
2. Sprawdź logi backendu - powinieneś zobaczyć "CORS enabled for origin"
3. Sprawdź w przeglądarce - błąd CORS powinien zniknąć

---

**Autor:** AI Assistant  
**Data:** 2025-01-09

