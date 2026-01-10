# Naprawa Błędu Połączenia z Backendem

## Problem
```
Cannot connect to backend API at http://localhost:4000/api/v1. 
Make sure backend is running and NEXT_PUBLIC_API_URL is set correctly.
```

## Rozwiązanie

### 1. Sprawdź czy backend jest uruchomiony

```powershell
# Sprawdź czy port 4000 jest zajęty
netstat -ano | findstr :4000

# Sprawdź procesy Node.js
Get-Process | Where-Object {$_.ProcessName -like "*node*"}
```

### 2. Utwórz plik .env.local dla frontendu

Plik `.env.local` został już utworzony w `apps/admin/.env.local` z zawartością:
```
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

**WAŻNE:** Po utworzeniu/zmianie `.env.local` musisz zrestartować serwer Next.js!

### 3. Uruchom backend

```powershell
# Opcja 1: Uruchom tylko backend
cd C:\Users\Admin\Documents\GitHub\netflow-cms
pnpm --filter api dev

# Opcja 2: Uruchom wszystko razem (backend + frontend)
pnpm dev
```

### 4. Sprawdź czy backend odpowiada

W nowym terminalu PowerShell:
```powershell
# Test połączenia z backendem
Invoke-WebRequest -Uri http://localhost:4000/api/v1/health -Method GET -UseBasicParsing

# Powinno zwrócić: {"status":"ok"}
```

### 5. Zrestartuj frontend

Jeśli backend działa, ale frontend nadal pokazuje błąd:

1. **Zatrzymaj frontend** (Ctrl+C w terminalu gdzie działa)
2. **Usuń cache Next.js:**
   ```powershell
   Remove-Item -Recurse -Force apps/admin/.next -ErrorAction SilentlyContinue
   ```
3. **Uruchom ponownie frontend:**
   ```powershell
   pnpm --filter admin dev
   ```

### 6. Sprawdź konfigurację CORS

Upewnij się, że w pliku `.env` (w root projektu) masz:
```
FRONTEND_URL=http://localhost:3000
PORT=4000
API_PREFIX=/api/v1
```

### 7. Sprawdź logi backendu

Jeśli backend nie startuje, sprawdź logi:
```powershell
# Jeśli używasz Docker:
docker-compose logs api

# Jeśli uruchamiasz lokalnie:
# Logi powinny być widoczne w terminalu gdzie uruchomiłeś backend
```

## Najczęstsze Problemy

### Problem 1: Backend nie startuje
**Rozwiązanie:**
```powershell
# Sprawdź czy PostgreSQL i Redis działają
docker-compose ps

# Jeśli nie działają, uruchom je:
docker-compose up -d postgres redis

# Sprawdź migracje:
pnpm --filter api db:migrate
```

### Problem 2: Port 4000 zajęty
**Rozwiązanie:**
```powershell
# Znajdź proces używający portu 4000
netstat -ano | findstr :4000

# Zabij proces (zamień PID na rzeczywisty numer procesu)
taskkill /PID <PID> /F
```

### Problem 3: Frontend nie widzi zmiennej NEXT_PUBLIC_API_URL
**Rozwiązanie:**
1. Upewnij się, że plik `.env.local` jest w `apps/admin/.env.local`
2. Zrestartuj serwer Next.js (zatrzymaj i uruchom ponownie)
3. Sprawdź czy zmienna jest dostępna w przeglądarce:
   ```javascript
   // W konsoli przeglądarki (F12)
   console.log(process.env.NEXT_PUBLIC_API_URL)
   ```

### Problem 4: CORS Error
**Rozwiązanie:**
Upewnij się, że w `apps/api/src/main.ts` CORS jest skonfigurowany dla `http://localhost:3000`

## Weryfikacja

Po wykonaniu powyższych kroków:

1. ✅ Backend działa na http://localhost:4000/api/v1
2. ✅ Health check zwraca: `{"status":"ok"}`
3. ✅ Frontend ma dostęp do `NEXT_PUBLIC_API_URL`
4. ✅ Brak błędów CORS w konsoli przeglądarki

## Jeśli nadal nie działa

1. Sprawdź logi backendu w terminalu
2. Sprawdź logi frontendu w terminalu
3. Sprawdź konsolę przeglądarki (F12) dla błędów JavaScript
4. Sprawdź Network tab w DevTools przeglądarki dla błędów HTTP




