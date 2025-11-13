# Quick Start - Collections Module (TNT-015)

## ✅ Implementacja Zakończona

Moduł Collections został zaimplementowany zgodnie z zadaniem TNT-015.

---

## 🚀 Szybki Start

### 1. Instalacja Dependencies

```bash
cd netflow-cms
pnpm install
```

### 2. Konfiguracja Environment

Edytuj `apps/api/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/netflow_cms?schema=public"
REDIS_URL="redis://localhost:6379"
PORT=4000
```

### 3. Generowanie Prisma Client

```bash
pnpm --filter api db:generate
```

### 4. Migracja Database

```bash
pnpm --filter api db:migrate
```

Nazwa migracji zostanie wygenerowana automatycznie (np. `20240101000000_add_collections`).

### 5. Uruchomienie Development Server

```bash
pnpm dev
```

API będzie dostępne na: `http://localhost:4000/api/v1`

---

## 🧪 Testowanie

### Unit Tests

```bash
pnpm --filter api test collections.service.spec.ts
```

### E2E Tests

```bash
pnpm --filter api test:e2e collections.e2e-spec.ts
pnpm --filter api test:e2e items.e2e-spec.ts
```

### Wszystkie Testy

```bash
pnpm --filter api test
```

---

## 📝 Przykłady API

### Utworzenie Kolekcji

```bash
curl -X POST http://localhost:4000/api/v1/collections \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-ID: tenant-123' \
  -d '{
    "slug": "articles",
    "name": "Articles",
    "schemaJson": {"title": "string", "content": "string"}
  }'
```

### Utworzenie Itemu

```bash
curl -X POST http://localhost:4000/api/v1/collections/articles/items \
  -H 'Content-Type: application/json' \
  -H 'X-Tenant-ID: tenant-123' \
  -d '{
    "data": {"title": "Hello World", "content": "Article content"},
    "status": "DRAFT"
  }'
```

### Lista Items

```bash
curl http://localhost:4000/api/v1/collections/articles/items?page=1&pageSize=20 \
  -H 'X-Tenant-ID: tenant-123'
```

---

## 🔍 Weryfikacja

### Sprawdź czy wszystko działa:

1. **Database:**
   ```bash
   pnpm --filter api db:studio
   ```
   Sprawdź czy tabele `collections` i `collection_items` istnieją.

2. **API:**
   ```bash
   # Test health check (jeśli istnieje)
   curl http://localhost:4000/api/v1/health
   ```

3. **Testy:**
   ```bash
   pnpm --filter api test:coverage
   ```
   Sprawdź coverage - powinno być >85%.

---

## ⚠️ Troubleshooting

### Problem: Prisma Client nie generuje się

```bash
# Sprawdź czy schema.prisma jest poprawny
pnpm --filter api db:generate

# Jeśli błąd - sprawdź DATABASE_URL w .env
```

### Problem: Redis connection error

```bash
# Sprawdź czy Redis działa
redis-cli ping

# Lub uruchom Redis (jeśli Docker):
docker run -d -p 6379:6379 redis:alpine
```

### Problem: Testy nie przechodzą

```bash
# Sprawdź czy test database jest skonfigurowana
# W apps/api/.env ustaw TEST_DATABASE_URL jeśli potrzeba
```

---

## 📚 Dokumentacja

- **API Docs:** `docs/api/collections-api.md`
- **Module README:** `apps/api/src/modules/collections/README.md`
- **Implementation Summary:** `docs/status/IMPLEMENTATION_SUMMARY.md`

---

**Gotowe!** Moduł Collections jest zaimplementowany i gotowy do użycia. 🎉

