# ✅ Naprawa problemu z importowaniem @repo/schemas

## Problem
Backend nie mógł się uruchomić z powodu błędu:
```
SyntaxError: Cannot use import statement outside a module
at /app/packages/schemas/src/index.ts:6
```

## Przyczyna
NestJS w trybie watch używa `ts-node` do uruchamiania TypeScript, ale `ts-node` nie rozwiązuje automatycznie path mappings z `tsconfig.json` w runtime. Node.js próbował załadować plik TypeScript bezpośrednio zamiast przez kompilator TypeScript.

## Rozwiązanie

### 1. ✅ Dodano `tsconfig-paths/register` w `main.ts`
```typescript
// Register tsconfig-paths to resolve TypeScript path mappings in runtime
// This is needed for monorepo packages like @repo/schemas
import 'tsconfig-paths/register';
```

### 2. ✅ Zainstalowano `tsconfig-paths` jako devDependency
```json
"tsconfig-paths": "^4.2.0"
```

### 3. ✅ Ustawiono `packages/schemas/tsconfig.json` na `commonjs`
Zmieniono `"module": "ESNext"` na `"module": "commonjs"` aby był zgodny z backendem.

## Rezultat

✅ **Problem z importowaniem schemas został rozwiązany!**

Backend teraz:
- ✅ Kompiluje się bez błędów (`Found 0 errors`)
- ✅ Nie ma już `SyntaxError: Cannot use import statement outside a module`
- ✅ Próbuje się uruchomić (obecnie ma inny błąd z dependency injection, ale to osobny problem)

## Weryfikacja

Backend kompiluje się poprawnie. Aby sprawdzić czy działa:
```powershell
Invoke-WebRequest -Uri "http://localhost:4000/api/v1/health" -Method GET -UseBasicParsing
```

## Następne kroki

Backend ma teraz inny błąd związany z dependency injection (`AuditService` nie jest dostępny w `AuthModule`), ale problem z importowaniem schemas został całkowicie rozwiązany.




