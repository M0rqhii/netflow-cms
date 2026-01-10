# 🚀 Instrukcja Uruchomienia - NetFlow CMS

## ✅ Co zostało naprawione:

1. **Błędy TypeScript** - wszystkie naprawione
2. **Konfiguracja frontendu** - plik `.env.local` utworzony
3. **Backend zrestartowany** - kontener Docker został zrestartowany

## 📋 Szybkie Uruchomienie:

### Opcja 1: Użyj gotowego skryptu (NAJŁATWIEJSZE)

```powershell
.\START_EVERYTHING.ps1
```

### Opcja 2: Ręczne uruchomienie

#### Krok 1: Uruchom Docker Services (PostgreSQL, Redis)

```powershell
docker-compose up -d postgres redis
```

#### Krok 2: Sprawdź czy backend działa

```powershell
# Sprawdź status
docker-compose ps api

# Sprawdź logi
docker-compose logs api --tail 50

# Test połączenia
Invoke-WebRequest -Uri http://localhost:4000/api/v1/health -Method GET -UseBasicParsing
```

#### Krok 3: Jeśli backend nie działa w Dockerze, uruchom lokalnie

```powershell
# Zatrzymaj backend w Dockerze
docker-compose stop api

# Uruchom lokalnie
pnpm --filter api dev
```

#### Krok 4: Uruchom frontend

```powershell
# W osobnym terminalu
pnpm --filter admin dev
```

## 🔍 Weryfikacja:

1. **Backend:** http://localhost:4000/api/v1/health
   - Powinno zwrócić: `{"status":"ok"}`

2. **Frontend:** http://localhost:3000
   - Powinno otworzyć się bez błędów

3. **Sprawdź konsolę przeglądarki (F12):**
   - Nie powinno być błędów połączenia z API

## ⚠️ Jeśli backend nadal nie działa:

### Problem: Backend w Dockerze ma błędy

**Rozwiązanie:** Uruchom backend lokalnie:

```powershell
# 1. Zatrzymaj backend w Dockerze
docker-compose stop api

# 2. Upewnij się że PostgreSQL i Redis działają
docker-compose ps postgres redis

# 3. Uruchom backend lokalnie
cd C:\Users\Admin\Documents\GitHub\netflow-cms
pnpm --filter api dev
```

### Problem: Frontend nie widzi backendu

**Rozwiązanie:**

1. Sprawdź czy plik `apps/admin/.env.local` istnieje:
   ```powershell
   Get-Content apps/admin/.env.local
   ```
   Powinno zawierać: `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1`

2. Zrestartuj frontend (zatrzymaj Ctrl+C i uruchom ponownie)

3. Wyczyść cache Next.js:
   ```powershell
   Remove-Item -Recurse -Force apps/admin/.next -ErrorAction SilentlyContinue
   pnpm --filter admin dev
   ```

## 📝 Pliki konfiguracyjne:

- ✅ `.env` - konfiguracja backendu (w root projektu)
- ✅ `apps/admin/.env.local` - konfiguracja frontendu

## 🎯 Gotowe!

Po wykonaniu powyższych kroków wszystko powinno działać. Jeśli nadal masz problemy, sprawdź:

1. Logi backendu: `docker-compose logs api`
2. Logi frontendu w terminalu
3. Konsolę przeglądarki (F12)




