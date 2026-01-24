# Restart Backend - Instrukcja

## Problem

Backend działa (port 4000 jest zajęty), ale CORS nadal nie działa. To oznacza, że backend nie został zrestartowany po zmianach w konfiguracji CORS.

## Rozwiązanie

### Krok 1: Zatrzymaj Backend

**Znajdź terminal gdzie działa backend:**
- Sprawdź wszystkie terminale
- Znajdź terminal z `pnpm --filter api dev`
- Naciśnij **Ctrl+C** aby zatrzymać

**Lub zatrzymaj proces:**
```powershell
# Znajdź PID procesu (z netstat)
# Zatrzymaj proces
Stop-Process -Id 9160 -Force
```

### Krok 2: Uruchom Backend Ponownie

```powershell
cd E:\netflow-cms
pnpm --filter api dev
```

**Sprawdź logi:**
Powinieneś zobaczyć:
```
[Bootstrap] CORS enabled for origin: http://localhost:3000
[Bootstrap] API running on http://localhost:4000/api/v1
```

### Krok 3: Sprawdź Czy Działa

```powershell
# Sprawdź health check
Invoke-WebRequest -Uri "http://localhost:4000/api/v1/health" -UseBasicParsing

# Powinno zwrócić: {"status":"ok"}
```

## Jeśli Nie Możesz Znaleźć Terminala

### Zatrzymaj Wszystkie Procesy Node.js

```powershell
# Zatrzymaj wszystkie procesy node
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
```

**Uwaga:** To zatrzyma wszystkie procesy Node.js, nie tylko backend!

### Uruchom Backend Ponownie

```powershell
cd E:\netflow-cms
pnpm --filter api dev
```

## Weryfikacja

### Sprawdź Logi Backendu

**Powinieneś zobaczyć:**
```
[Bootstrap] CORS enabled for origin: http://localhost:3000
[Bootstrap] API running on http://localhost:4000/api/v1
```

**Jeśli nie widzisz "CORS enabled for origin":**
- Backend nie został zrestartowany
- Zrestartuj backend ponownie

### Sprawdź w Przeglądarce

1. Otwórz http://localhost:3000/sites
2. Otwórz DevTools (F12) → Network tab
3. Sprawdź OPTIONS request:
   - Status: **204 No Content**
   - Headers: `Access-Control-Allow-Origin: http://localhost:3000`
4. Sprawdź GET request:
   - Status: **200 OK**
   - Response: Lista siteów
   - **Brak błędów CORS**

## Podsumowanie

**Kroki:**
1. ✅ Zatrzymaj backend (Ctrl+C w terminalu)
2. ✅ Uruchom ponownie: `pnpm --filter api dev`
3. ✅ Sprawdź logi - powinieneś zobaczyć "CORS enabled for origin"
4. ✅ Sprawdź w przeglądarce - błąd CORS powinien zniknąć

**WAŻNE:** Backend MUSI być zrestartowany, aby zmiany w `main.ts` weszły w życie!

---

**Autor:** AI Assistant  
**Data:** 2025-01-09

