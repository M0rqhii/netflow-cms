# Naprawa PowerShell Execution Policy

## Problem

**Błąd:**
```
pnpm : File C:\Program Files\nodejs\pnpm.ps1 cannot be loaded because running scripts is disabled on this system.
```

## Przyczyna

PowerShell Execution Policy blokuje uruchamianie skryptów. To jest zabezpieczenie Windows, które domyślnie blokuje uruchamianie skryptów PowerShell.

## Rozwiązanie

### Opcja 1: Zmień Execution Policy (Rekomendowane)

**Uruchom PowerShell jako Administrator:**

1. Kliknij prawym przyciskiem na PowerShell
2. Wybierz "Run as Administrator"
3. Uruchom:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Wyjaśnienie:**
- `RemoteSigned` - pozwala na uruchamianie lokalnych skryptów i skryptów z internetu (podpisanych)
- `CurrentUser` - zmiana dotyczy tylko bieżącego użytkownika (bezpieczniejsze)

**Sprawdź:**
```powershell
Get-ExecutionPolicy
```

Powinno zwrócić: `RemoteSigned`

### Opcja 2: Uruchom Polecenie Bezpośrednio (Tymczasowe)

**Użyj npx zamiast pnpm:**
```powershell
npx pnpm --filter api dev
```

**Lub użyj pełnej ścieżki:**
```powershell
& "C:\Program Files\nodejs\pnpm.cmd" --filter api dev
```

### Opcja 3: Uruchom dla Jednej Sesji (Tymczasowe)

**Uruchom PowerShell z bypass:**
```powershell
powershell -ExecutionPolicy Bypass -Command "pnpm --filter api dev"
```

## Weryfikacja

### Sprawdź Execution Policy

```powershell
Get-ExecutionPolicy
```

**Oczekiwany wynik:**
- `RemoteSigned` (rekomendowane)
- `Unrestricted` (mniej bezpieczne, ale działa)
- `Bypass` (tylko dla bieżącej sesji)

### Sprawdź Czy pnpm Działa

```powershell
pnpm --version
```

Powinno zwrócić wersję pnpm (np. `8.15.0`)

## Szczegółowe Instrukcje

### Krok 1: Otwórz PowerShell jako Administrator

1. Naciśnij **Windows + X**
2. Wybierz **"Windows PowerShell (Admin)"** lub **"Terminal (Admin)"**
3. Potwierdź UAC (User Account Control)

### Krok 2: Zmień Execution Policy

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Potwierdź:** Wpisz `Y` i naciśnij Enter

### Krok 3: Sprawdź Zmianę

```powershell
Get-ExecutionPolicy
```

Powinno zwrócić: `RemoteSigned`

### Krok 4: Uruchom Backend

```powershell
cd E:\netflow-cms
pnpm --filter api dev
```

## Alternatywne Rozwiązania

### Rozwiązanie 1: Użyj CMD zamiast PowerShell

**Otwórz Command Prompt (cmd.exe):**
```cmd
cd E:\netflow-cms
pnpm --filter api dev
```

CMD nie ma Execution Policy, więc pnpm powinien działać.

### Rozwiązanie 2: Użyj npx

```powershell
npx pnpm --filter api dev
```

### Rozwiązanie 3: Użyj Pełnej Ścieżki

```powershell
& "C:\Program Files\nodejs\pnpm.cmd" --filter api dev
```

## Bezpieczeństwo

### RemoteSigned vs Unrestricted

**RemoteSigned (Rekomendowane):**
- ✅ Pozwala na lokalne skrypty
- ✅ Wymaga podpisu dla skryptów z internetu
- ✅ Bezpieczniejsze

**Unrestricted (Mniej Bezpieczne):**
- ✅ Pozwala na wszystkie skrypty
- ⚠️ Mniej bezpieczne
- ⚠️ Może uruchomić złośliwe skrypty

**Bypass (Tylko Sesja):**
- ✅ Działa tylko dla bieżącej sesji
- ✅ Nie zmienia globalnego policy
- ⚠️ Musisz uruchamiać za każdym razem

## Podsumowanie

**Najlepsze Rozwiązanie:**
1. Otwórz PowerShell jako Administrator
2. Uruchom: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Potwierdź: `Y`
4. Sprawdź: `Get-ExecutionPolicy` (powinno zwrócić `RemoteSigned`)
5. Uruchom backend: `pnpm --filter api dev`

**Alternatywa:**
- Użyj CMD zamiast PowerShell
- Użyj `npx pnpm` zamiast `pnpm`
- Użyj pełnej ścieżki: `& "C:\Program Files\nodejs\pnpm.cmd"`

---

**Autor:** AI Assistant  
**Data:** 2025-01-09

