# Quick Start - Frontend i Backend

## Szybkie Uruchomienie (5 minut)

### 1. Przygotowanie

```bash
# Sklonuj repozytorium (jeśli jeszcze nie)
git clone <repo-url>
cd netflow-cms

# Zainstaluj zależności
pnpm install
```

### 2. Uruchom Docker Services

```bash
# Uruchom PostgreSQL i Redis
docker-compose up -d postgres redis

# Sprawdź czy działają
docker-compose ps
```

### 3. Skonfiguruj Backend

```bash
# Wygeneruj Prisma Client
pnpm --filter api db:generate

# Uruchom migracje
pnpm --filter api db:migrate

# (Opcjonalnie) Seed database
pnpm --filter api db:seed
```

### 4. Uruchom Aplikację

```bash
# Uruchom backend i frontend razem
pnpm dev
```

### 5. Otwórz w Przeglądarce

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000/api/v1
- **Health Check:** http://localhost:4000/api/v1/health

## Alternatywnie: Docker Compose (Wszystko w jednym)

```bash
# Uruchom wszystkie serwisy
docker-compose up -d

# Zobacz logi
docker-compose logs -f

# Zatrzymaj
docker-compose down
```

## Weryfikacja

### Sprawdź Backend

```bash
curl http://localhost:4000/api/v1/health
# Powinno zwrócić: {"status":"ok"}
```

### Sprawdź Frontend

Otwórz http://localhost:3000 w przeglądarce.

## Troubleshooting

### Port zajęty?

```bash
# Sprawdź co używa portu
# Windows
netstat -ano | findstr :4000
netstat -ano | findstr :3000

# Linux/Mac
lsof -i :4000
lsof -i :3000
```

### Database Connection Error?

```bash
# Sprawdź czy PostgreSQL działa
docker-compose ps postgres

# Sprawdź logi
docker-compose logs postgres
```

### CORS Errors?

Sprawdź czy `.env` ma poprawne wartości:
- `FRONTEND_URL=http://localhost:3000` (backend)
- `NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1` (frontend)

## Gotowe! 🎉

Teraz możesz:
- Otworzyć http://localhost:3000
- Zalogować się (jeśli masz konto)
- Przetestować funkcjonalności

---

Więcej informacji: `INTEGRATION_GUIDE.md`

