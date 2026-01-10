# Database Connection Pooling - Configuration Guide

Przewodnik konfiguracji connection pooling dla PostgreSQL w Netflow CMS.

## Overview

Connection pooling jest skonfigurowany przez Prisma i zarządzany przez `PrismaService`. Pooling jest konfigurowany przez parametry w `DATABASE_URL`.

## Configuration

### DATABASE_URL Parameters

Connection pooling jest konfigurowany przez query parameters w `DATABASE_URL`:

```env
DATABASE_URL=postgresql://user:password@host:5432/database?connection_limit=20&pool_timeout=20
```

### Parameters

- **connection_limit**: Maximum number of connections in the pool (default: 10)
- **pool_timeout**: Maximum time to wait for a connection in seconds (default: 10)

### Recommended Settings

#### Development
```env
DATABASE_URL=postgresql://netflow:password@localhost:5432/netflow_cms?connection_limit=10&pool_timeout=10
```

#### Production
```env
DATABASE_URL=postgresql://netflow:password@localhost:5432/netflow_cms?connection_limit=20&pool_timeout=20
```

#### High Traffic
```env
DATABASE_URL=postgresql://netflow:password@localhost:5432/netflow_cms?connection_limit=50&pool_timeout=30
```

## PostgreSQL Configuration

### max_connections

Upewnij się, że PostgreSQL `max_connections` jest wystarczająco wysoki:

```sql
-- Check current max_connections
SHOW max_connections;

-- Set max_connections (requires restart)
-- In postgresql.conf:
max_connections = 100
```

### Formula

```
max_connections = (connection_limit * number_of_app_instances) + overhead
```

Przykład:
- 3 instances aplikacji
- connection_limit = 20
- overhead = 10
- max_connections = (20 * 3) + 10 = 70

## Monitoring

### Check Active Connections

```sql
SELECT count(*) FROM pg_stat_activity WHERE datname = 'netflow_cms';
```

### Check Connection Pool Usage

Monitoruj metryki Prometheus:
- `db_queries_total`
- `db_query_duration_seconds`

## Best Practices

1. **Set appropriate limits**: Nie ustawiaj zbyt wysokich limitów
2. **Monitor usage**: Monitoruj użycie connection pool
3. **Scale horizontally**: Zamiast zwiększać limit, dodaj więcej instancji
4. **Use read replicas**: Dla read-heavy workloads użyj read replicas
5. **Connection timeout**: Ustaw odpowiedni timeout

## Troubleshooting

### Problem: "Too many connections"

**Solution**:
- Zwiększ `max_connections` w PostgreSQL
- Zmniejsz `connection_limit` w aplikacji
- Dodaj więcej instancji aplikacji

### Problem: Slow queries

**Solution**:
- Sprawdź connection pool usage
- Zwiększ `connection_limit` jeśli potrzebne
- Zoptymalizuj zapytania

---

**Ostatnia aktualizacja**: 2025-01-20
