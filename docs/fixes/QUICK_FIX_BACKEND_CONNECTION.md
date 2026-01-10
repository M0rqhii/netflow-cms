# 🔧 Szybka Naprawa: Błąd Połączenia z Backendem

## Problem
```
Cannot connect to backend API at http://localhost:4000/api/v1. 
Make sure backend is running and NEXT_PUBLIC_API_URL is set correctly.
```

## 🔍 Diagnostyka (Krok po kroku)

### Krok 1: Sprawdź czy backend działa

```powershell
# Sprawdź czy port 4000 jest zajęty
netstat -ano | findstr :4000

# Jeśli widzisz LISTENING, backend działa
# Jeśli nie ma wyniku, backend nie działa
```

**Jeśli backend nie odpowiada (port zajęty, ale nie odpowiada):**
```powershell
# Backend może się zawieszać - sprawdź logi
# Zatrzymaj backend (Ctrl+C) i uruchom ponownie:
cd C:\Users\Admin\Documents\GitHub\netflow-cms
pnpm --filter api dev

# Sprawdź czy widzisz w logach:
# [Bootstrap] CORS enabled for origin: http://localhost:3000
# [Bootstrap] API running on http://localhost:4000/api/v1
```

**Jeśli backend nie działa:**
```powershell
# Uruchom backend
cd C:\Users\Admin\Documents\GitHub\netflow-cms
pnpm --filter api dev
```

### Krok 2: Sprawdź konfigurację .env.local

```powershell
# Sprawdź czy plik istnieje
Test-Path apps/admin/.env.local

# Jeśli nie istnieje, utwórz go:
"NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" | Out-File -FilePath apps/admin/.env.local -Encoding utf8
```

**WAŻNE:** Po utworzeniu/zmianie `.env.local` musisz zrestartować serwer Next.js!

### Krok 3: Test połączenia z backendem

```powershell
# Test health check endpoint
Invoke-WebRequest -Uri http://localhost:4000/api/v1/health -Method GET -UseBasicParsing

# Powinno zwrócić: {"status":"ok"}
```

### Krok 4: Zrestartuj frontend

```powershell
# Zatrzymaj frontend (Ctrl+C w terminalu gdzie działa)

# Usuń cache Next.js
Remove-Item -Recurse -Force apps/admin/.next -ErrorAction SilentlyContinue

# Uruchom ponownie frontend
pnpm --filter admin dev
```

## ✅ Rozwiązanie Kompletne

### Opcja A: Uruchom wszystko razem (Rekomendowane)

```powershell
cd C:\Users\Admin\Documents\GitHub\netflow-cms

# 1. Utwórz .env.local jeśli nie istnieje
if (-not (Test-Path apps/admin/.env.local)) {
    "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" | Out-File -FilePath apps/admin/.env.local -Encoding utf8
    Write-Host "✅ Utworzono apps/admin/.env.local" -ForegroundColor Green
}

# 2. Uruchom backend i frontend
pnpm dev
```

### Opcja B: Uruchom osobno

**Terminal 1 - Backend:**
```powershell
cd C:\Users\Admin\Documents\GitHub\netflow-cms
pnpm --filter api dev
```

**Terminal 2 - Frontend:**
```powershell
cd C:\Users\Admin\Documents\GitHub\netflow-cms

# Utwórz .env.local jeśli nie istnieje
if (-not (Test-Path apps/admin/.env.local)) {
    "NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1" | Out-File -FilePath apps/admin/.env.local -Encoding utf8
}

# Uruchom frontend
pnpm --filter admin dev
```

## 🔍 Sprawdzenie w DevTools

1. Otwórz http://localhost:3000
2. Otwórz DevTools (F12)
3. **Console tab:**
   - Sprawdź czy widzisz logi `[SDK] Request: http://localhost:4000/api/v1/...`
   - Jeśli widzisz błąd, sprawdź dokładny komunikat
4. **Network tab:**
   - Sprawdź request do `/api/v1/...`
   - Sprawdź URL (powinno być `http://localhost:4000/api/v1/...`)
   - Sprawdź status (powinno być 200 OK)
   - Sprawdź czy są błędy CORS

## ⚠️ Częste Problemy

### Problem 1: Backend nie startuje

**Sprawdź logi:**
```powershell
pnpm --filter api dev
```

**Możliwe przyczyny:**
- Baza danych nie działa
- Port 4000 zajęty przez inny proces
- Błędy TypeScript

**Rozwiązanie:**
```powershell
# Sprawdź czy PostgreSQL działa
docker-compose ps postgres

# Sprawdź czy port jest wolny
netstat -ano | findstr :4000

# Jeśli port zajęty, znajdź proces:
Get-Process -Id (netstat -ano | findstr :4000 | Select-Object -First 1 | ForEach-Object { $_.Split()[-1] })
```

### Problem 2: .env.local nie jest ładowany

**Sprawdź:**
- Czy plik istnieje w `apps/admin/.env.local` (nie w root!)
- Czy zawiera: `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`
- Czy zrestartowałeś serwer Next.js po utworzeniu pliku

**Rozwiązanie:**
```powershell
# Usuń cache i zrestartuj
Remove-Item -Recurse -Force apps/admin/.next -ErrorAction SilentlyContinue
pnpm --filter admin dev
```

### Problem 3: CORS Error

**Sprawdź:**
- Czy backend ma ustawione `FRONTEND_URL=http://localhost:3000` w `.env`
- Czy backend loguje: `CORS enabled for origin: http://localhost:3000`

**Rozwiązanie:**
```powershell
# Sprawdź .env w root projektu
Get-Content .env | Select-String "FRONTEND_URL"

# Jeśli brakuje, dodaj:
Add-Content .env "`nFRONTEND_URL=http://localhost:3000"

# Zrestartuj backend
```

## 📝 Checklist

- [ ] Backend działa na porcie 4000
- [ ] Plik `apps/admin/.env.local` istnieje
- [ ] Plik zawiera `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`
- [ ] Frontend został zrestartowany po utworzeniu .env.local
- [ ] Health check zwraca `{"status":"ok"}`
- [ ] W DevTools widzę logi `[SDK] Request:`
- [ ] W Network tab requesty mają status 200 OK

## 🎯 Jeśli nadal nie działa

1. **Sprawdź logi backendu** - mogą zawierać szczegóły błędu
2. **Sprawdź logi frontendu** - w terminalu gdzie działa `pnpm --filter admin dev`
3. **Sprawdź Docker** - jeśli używasz Dockera, sprawdź czy kontenery działają:
   ```powershell
   docker-compose ps
   docker-compose logs api
   ```

---

**Więcej informacji:**
- `FIX_BACKEND_CONNECTION.md` - Szczegółowy przewodnik
- `TROUBLESHOOTING_NETWORK_ERROR.md` - Rozwiązywanie problemów sieciowych

