# 🔐 Naprawa obsługi błędów 401 Unauthorized

## Problem
Frontend otrzymywał błąd 401 przy próbie pobrania content types:
```
Failed to fetch content types: 401 Unauthorized - {"statusCode":401,"timestamp":"2025-11-15T20:54:46.536Z","path":"/api/v1/content-types","message":"Unauthorized"}
```

## Przyczyna
Funkcja `fetchSiteTypes` nie obsługiwała poprawnie błędów 401 - nie czyściła tokenów i nie przekierowywała do logowania.

## Rozwiązanie

### 1. ✅ Dodano obsługę 401 w `fetchSiteTypes`
- Funkcja teraz wywołuje `handleApiError` przy błędzie 401
- Automatycznie czyści tokeny i przekierowuje do `/login`

### 2. ✅ Poprawiono obsługę błędów w komponencie
- Komponent nie wyświetla błędu jeśli nastąpi przekierowanie do logowania

## Co zrobić jeśli nadal widzisz błąd 401:

1. **Sprawdź czy jesteś zalogowany:**
   - Otwórz DevTools (F12)
   - Przejdź do zakładki Application → Local Storage
   - Sprawdź czy istnieje klucz `authToken` lub `siteToken:{siteId}`

2. **Zaloguj się ponownie:**
   - Przejdź do `/login`
   - Zaloguj się ponownie

3. **Sprawdź token:**
   - Po zalogowaniu sprawdź czy token jest zapisany w localStorage
   - Token powinien być w formacie JWT

## Weryfikacja

Po zalogowaniu, frontend powinien automatycznie:
- Pobrać token z localStorage
- Wymienić token na site token (jeśli potrzebny)
- Dodać header `Authorization: Bearer {token}` i `X-Site-ID: {siteId}` do żądań

Jeśli nadal masz problemy, sprawdź:
- Czy backend działa: `http://localhost:4000/api/v1/health`
- Czy frontend ma poprawny `NEXT_PUBLIC_API_URL` w `.env.local`
- Czy token nie wygasł (sprawdź w DevTools)




