# Naprawa Błędu Zależności - has-flag

## Problem

**Błąd przy uruchamianiu backendu:**
```
Error: Cannot find module 'has-flag'
Require stack:
- E:\netflow-cms\node_modules\.pnpm\supports-color@7.2.0\node_modules\supports-color\index.js
- E:\netflow-cms\node_modules\.pnpm\chalk@4.1.2\node_modules\chalk\source\index.js
- E:\netflow-cms\node_modules\.pnpm\@nestjs+cli@10.4.9\node_modules\@nestjs\cli\commands\command.loader.js
```

## Przyczyna

Problem z zależnościami w `node_modules` - brakuje modułu `has-flag`, który jest zależnością `supports-color`, który jest zależnością `chalk`, który jest używany przez `@nestjs/cli`.

## Rozwiązanie

### ✅ Zreinstalowano Zależności

**Wykonano:**
```powershell
cd E:\netflow-cms
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
pnpm install
```

**Wynik:**
- ✅ Usunięto `node_modules`
- ✅ Zreinstalowano wszystkie zależności (941 pakietów)
- ✅ Wszystkie zależności są teraz poprawne

## Jak Naprawić (Jeśli Problem Wystąpi Ponownie)

### Krok 1: Usuń node_modules

**Windows PowerShell:**
```powershell
cd E:\netflow-cms
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
```

**Linux/Mac:**
```bash
cd netflow-cms
rm -rf node_modules
```

### Krok 2: Zreinstaluj Zależności

```bash
pnpm install
```

### Krok 3: Uruchom Backend

```bash
pnpm --filter api dev
```

## Alternatywne Rozwiązania

### Opcja 1: Czyszczenie Cache pnpm

```bash
pnpm store prune
pnpm install
```

### Opcja 2: Usunięcie lockfile i reinstalacja

```bash
# UWAGA: To usunie lockfile - użyj tylko jeśli problemy są poważne
rm pnpm-lock.yaml
pnpm install
```

### Opcja 3: Sprawdzenie Wersji Node.js

Problem może być związany z wersją Node.js. Sprawdź:

```bash
node --version
```

**Wymagana wersja:** Node.js >= 18.0.0

## Weryfikacja

### Sprawdź czy Backend Działa

```bash
# Uruchom backend
pnpm --filter api dev

# Powinieneś zobaczyć:
# [Bootstrap] CORS enabled for origin: http://localhost:3000
# [Bootstrap] API running on http://localhost:4000/api/v1
```

### Sprawdź Health Check

```bash
# W innym terminalu
curl http://localhost:4000/api/v1/health

# Powinno zwrócić: {"status":"ok"}
```

## Jeśli Nadal Nie Działa

### Problem 1: Node.js Version

**Sprawdź:**
```bash
node --version
```

**Rozwiązanie:**
- Użyj Node.js >= 18.0.0
- Zainstaluj przez nvm lub bezpośrednio z nodejs.org

### Problem 2: pnpm Version

**Sprawdź:**
```bash
pnpm --version
```

**Rozwiązanie:**
- Użyj pnpm >= 8.0.0
- Zainstaluj: `npm install -g pnpm@latest`

### Problem 3: Cache pnpm

**Rozwiązanie:**
```bash
pnpm store prune
pnpm install
```

## Podsumowanie

**Rozwiązanie:**
1. ✅ Usunięto `node_modules`
2. ✅ Zreinstalowano wszystkie zależności
3. ✅ Backend powinien teraz działać

**Następne kroki:**
1. Uruchom backend: `pnpm --filter api dev`
2. Sprawdź logi - powinieneś zobaczyć "CORS enabled for origin"
3. Sprawdź health check: `curl http://localhost:4000/api/v1/health`

---

**Autor:** AI Assistant  
**Data:** 2025-01-09

