# Ostateczna Naprawa CORS

## Problem

CORS nadal blokuje OPTIONS requests, mimo że backend się uruchomił i pokazuje logi:
```
[Bootstrap] CORS enabled for origin: http://localhost:3000
[Bootstrap] API running on http://localhost:4000/api/v1
```

## Przyczyna

Backend się uruchomił, ale może:
1. Nie odpowiadać na requesty (crashuje po starcie)
2. Mieć problem z konfiguracją CORS
3. Nie obsługiwać OPTIONS requests poprawnie

## Rozwiązanie

### Krok 1: Sprawdź Czy Backend Działa

```powershell
# Sprawdź health check
Invoke-WebRequest -Uri "http://localhost:4000/api/v1/health" -UseBasicParsing
```

**Jeśli nie działa:**
- Backend się crashuje po starcie
- Sprawdź logi backendu w terminalu
- Sprawdź czy są błędy w konsoli

### Krok 2: Sprawdź Logi Backendu

**W terminalu gdzie działa backend, sprawdź:**
- Czy widzisz błędy?
- Czy backend się restartuje?
- Czy są jakieś wyjątki?

### Krok 3: Sprawdź CORS w DevTools

**W przeglądarce:**
1. Otwórz DevTools (F12) → Network tab
2. Sprawdź OPTIONS request do `/api/v1/auth/me/tenants`
3. Sprawdź Response Headers:
   - `Access-Control-Allow-Origin: http://localhost:3000`
   - `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD`
   - `Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin`
   - `Access-Control-Allow-Credentials: true`

**Jeśli nie widzisz tych headers:**
- Backend nie odpowiada na OPTIONS request
- CORS nie jest poprawnie skonfigurowany
- Backend może się crashować

## Jeśli Backend Nie Działa

### Problem 1: Backend Crashuje Po Starcie

**Sprawdź logi:**
- Czy są błędy w konsoli?
- Czy backend się restartuje w pętli?

**Rozwiązanie:**
- Sprawdź `apps/api/src/main.ts` - czy nie ma błędów składniowych
- Sprawdź czy wszystkie zależności są zainstalowane
- Sprawdź czy `.env` jest poprawnie skonfigurowany

### Problem 2: Backend Nie Odpowiada Na Requesty

**Sprawdź:**
```powershell
# Sprawdź czy port 4000 jest zajęty
netstat -ano | findstr :4000
```

**Jeśli port jest zajęty, ale backend nie odpowiada:**
- Backend może być w stanie crash loop
- Zatrzymaj wszystkie procesy node i uruchom ponownie

### Problem 3: CORS Nie Działa Mimo Że Backend Działa

**Sprawdź konfigurację CORS w `apps/api/src/main.ts`:**
- Czy `preflightContinue: false` jest ustawione?
- Czy `optionsSuccessStatus: 204` jest ustawione?
- Czy wszystkie metody są dozwolone?

## Weryfikacja

### Test OPTIONS Request

**Windows PowerShell:**
```powershell
$headers = @{
    "Origin" = "http://localhost:3000"
    "Access-Control-Request-Method" = "GET"
    "Access-Control-Request-Headers" = "authorization"
}
Invoke-WebRequest -Uri "http://localhost:4000/api/v1/auth/me/tenants" -Method OPTIONS -Headers $headers -UseBasicParsing
```

**Oczekiwany wynik:**
- Status: 204 No Content
- Headers zawierają `Access-Control-Allow-Origin: http://localhost:3000`

### Test GET Request

```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/v1/health" -UseBasicParsing
```

**Oczekiwany wynik:**
- Status: 200 OK
- Response: `{"status":"ok"}`

## Podsumowanie

**Sprawdź:**
1. ✅ Czy backend działa: `Invoke-WebRequest -Uri "http://localhost:4000/api/v1/health" -UseBasicParsing`
2. ✅ Czy logi pokazują "CORS enabled for origin"
3. ✅ Czy OPTIONS request ma status 204
4. ✅ Czy Response Headers zawierają CORS headers

**Jeśli backend nie działa:**
- Sprawdź logi w terminalu
- Sprawdź czy są błędy
- Zrestartuj backend

**Jeśli backend działa, ale CORS nie:**
- Sprawdź konfigurację CORS w `main.ts`
- Sprawdź Response Headers w DevTools
- Zrestartuj backend

---

**Autor:** AI Assistant  
**Data:** 2025-01-09

