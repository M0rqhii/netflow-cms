# Szybka Naprawa PowerShell Execution Policy

## Problem

PowerShell blokuje uruchamianie skryptów pnpm.

## Szybkie Rozwiązanie

### Opcja 1: Użyj Pełnej Ścieżki (Najszybsze)

```powershell
cd E:\netflow-cms
& "C:\Program Files\nodejs\pnpm.cmd" --filter api dev
```

### Opcja 2: Zmień Execution Policy (Trwałe)

**Otwórz PowerShell jako Administrator:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Potwierdź:** Wpisz `Y` i naciśnij Enter

**Sprawdź:**
```powershell
Get-ExecutionPolicy
```

Powinno zwrócić: `RemoteSigned`

**Teraz pnpm powinien działać:**
```powershell
pnpm --filter api dev
```

### Opcja 3: Użyj CMD zamiast PowerShell

**Otwórz Command Prompt (cmd.exe):**
```cmd
cd E:\netflow-cms
pnpm --filter api dev
```

CMD nie ma Execution Policy, więc pnpm powinien działać.

## Podsumowanie

**Najszybsze:**
```powershell
& "C:\Program Files\nodejs\pnpm.cmd" --filter api dev
```

**Trwałe:**
1. Otwórz PowerShell jako Administrator
2. Uruchom: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Potwierdź: `Y`
4. Uruchom: `pnpm --filter api dev`

---

**Więcej informacji:** `FIX_POWERSHELL_EXECUTION_POLICY.md`

